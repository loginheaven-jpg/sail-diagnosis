"""Restore synthetic local data to a separate PG container, then test real Auth/REST.

Run only after callers pause other test writers. This rehearses a logical local
backup, not hosted Supabase PITR availability, service guarantees or operations.
Private dump/env files remain mode0600 under the local test directory.
"""
import hashlib
import http.client
import json
import re
import secrets
import subprocess
import time
from pathlib import Path
from runtime import DB, NETWORK, IMAGES, STATE, AUTH, REST, sql, command, private, run_container

RESTORE_DB = 'phase1-closeout-restore-db'
RESTORE_AUTH = 'phase1-closeout-restore-auth'
RESTORE_REST = 'phase1-closeout-restore-rest'


def local_sql(container, statement):
    assert container in (DB, RESTORE_DB)
    return command(['docker', 'exec', '-i', container, 'psql', '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'], statement).stdout.strip()


def snapshot(container):
    names = local_sql(container, "SELECT table_schema||'.'||table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1;").splitlines()
    names += ['auth.users']
    data = {}
    for table in names:
        assert re.fullmatch(r'(public|auth)\.[a-z_0-9]+', table)
        value = local_sql(container, f"SELECT count(*)||':'||encode(digest(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY to_jsonb(t)::text),''),'sha256'),'hex') FROM {table} t;")
        data[table] = value
    data['result_role_privileges'] = local_sql(container, "SELECT json_agg(json_build_object('role',r,'privilege',p,'allowed',has_table_privilege(r,'public.results',p)) ORDER BY r,p) FROM unnest(ARRAY['anon','authenticated','service_role']) r CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p;")
    data['result_column_privileges'] = local_sql(container, "SELECT json_agg(json_build_object('role',r,'column',attname,'select',has_column_privilege(r,'public.results',attname,'SELECT')) ORDER BY r,attname) FROM unnest(ARRAY['anon','authenticated','service_role']) r CROSS JOIN pg_attribute WHERE attrelid='public.results'::regclass AND attnum>0 AND NOT attisdropped;")
    data['public_rls'] = local_sql(container, "SELECT json_agg(json_build_object('table',relname,'rls',relrowsecurity,'force',relforcerowsecurity) ORDER BY relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND relkind='r';")
    return data


def address(name):
    ip = command(['docker', 'inspect', name, '--format', '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}']).stdout.strip()
    assert re.fullmatch(r'172\.\d+\.\d+\.\d+', ip)
    return ip


def request(host, port, path, method='GET', data=None, key=None):
    headers = {'Content-Type': 'application/json'}
    if key:
        headers['Authorization'] = 'Bearer ' + key
        headers['apikey'] = key
    conn = http.client.HTTPConnection(host, port, timeout=20)
    try:
        conn.request(method, path, None if data is None else json.dumps(data).encode(), headers)
        response = conn.getresponse()
        payload = response.read()
        return response.status, json.loads(payload or b'{}')
    finally:
        conn.close()


def remove_owned(name):
    existing = command(['docker', 'inspect', name], check=False)
    if existing.returncode == 0:
        assert json.loads(existing.stdout)[0]['Config'].get('Labels', {}).get('phase1.closeout') == '1'
        command(['docker', 'rm', '-f', name])


start = time.monotonic()
c = json.loads((STATE / 'config.json').read_text())
account = json.loads((STATE / 'accounts.json').read_text())[0]
assert c['supabase_url'] == 'http://127.0.0.1:54321'
before = snapshot(DB)
privileges = json.loads(before['result_role_privileges'])
assert len(privileges) == 21 and all(not x['allowed'] for x in privileges), 'Apply the final results security migration before this rehearsal'
dump = STATE / 'synthetic-post-security.dump'
dump_started = time.monotonic()
with dump.open('wb') as output:
    dump.chmod(0o600)
    result = subprocess.run(['docker', 'exec', DB, 'pg_dump', '-U', 'postgres', '-d', 'postgres', '--format=custom'], stdout=output, stderr=subprocess.PIPE, timeout=120)
    assert result.returncode == 0, 'Local synthetic backup failed; private diagnostic withheld'
backup_seconds = time.monotonic() - dump_started
assert snapshot(DB) == before, 'Concurrent test writers must be paused before this rehearsal'
try:
    for name in (RESTORE_AUTH, RESTORE_REST, RESTORE_DB):
        remove_owned(name)
    run_container(RESTORE_DB, IMAGES['postgres'], ['--tmpfs', '/var/lib/postgresql/data:rw,nosuid', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust'])
    for _ in range(100):
        proc = command(['docker', 'exec', RESTORE_DB, 'cat', '/proc/1/comm'], check=False)
        ready = command(['docker', 'exec', RESTORE_DB, 'pg_isready', '-U', 'postgres'], check=False)
        if proc.stdout.strip() == 'postgres' and ready.returncode == 0:
            break
        time.sleep(0.2)
    else:
        raise AssertionError('Independent local restore PostgreSQL did not become ready')
    local_sql(RESTORE_DB, f"""CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD '{c['rest_db_password']}';
GRANT anon,authenticated,service_role TO authenticator;
CREATE ROLE supabase_auth_admin LOGIN NOINHERIT PASSWORD '{c['auth_db_password']}';
ALTER ROLE supabase_auth_admin SET search_path=auth,public;""")
    restore_started = time.monotonic()
    with dump.open('rb') as source:
        restored = subprocess.run(['docker', 'exec', '-i', RESTORE_DB, 'pg_restore', '-U', 'postgres', '-d', 'postgres', '--clean', '--if-exists', '--exit-on-error'], stdin=source, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
    assert restored.returncode == 0, 'Independent local restore failed; private diagnostic withheld'
    restore_seconds = time.monotonic() - restore_started
    after = snapshot(RESTORE_DB)
    assert before == after, 'Restored rows/checksums/RLS/privilege matrix differ'
    assert snapshot(DB) == before, 'Original local database changed during restore'

    original_auth_env = (STATE / 'auth.env').read_text()
    original_rest_env = (STATE / 'rest.env').read_text()
    auth_env = original_auth_env.replace('@' + DB + ':5432/', '@' + RESTORE_DB + ':5432/')
    rest_env = original_rest_env.replace('@' + DB + ':5432/', '@' + RESTORE_DB + ':5432/')
    assert auth_env != original_auth_env and rest_env != original_rest_env
    assert '@' + RESTORE_DB + ':5432/' in auth_env and '@' + RESTORE_DB + ':5432/' in rest_env
    private(STATE / 'restore-auth.env', auth_env)
    private(STATE / 'restore-rest.env', rest_env)
    run_container(RESTORE_AUTH, IMAGES['auth'], env=STATE / 'restore-auth.env')
    run_container(RESTORE_REST, IMAGES['rest'], env=STATE / 'restore-rest.env')
    auth_ip, rest_ip = address(RESTORE_AUTH), address(RESTORE_REST)
    for _ in range(100):
        try:
            status, _ = request(auth_ip, 9999, '/health')
            if status == 200:
                break
        except OSError:
            pass
        time.sleep(0.2)
    else:
        raise AssertionError('Restored actual GoTrue did not become ready')
    status, session = request(auth_ip, 9999, '/token?grant_type=password', 'POST', {'email': account['email'], 'password': account['password']}, c['anon_key'])
    assert status == 200 and session['user']['id'] == account['user_id']
    for _ in range(100):
        status, profile = request(rest_ip, 3000, '/kcf_profiles?select=user_id&user_id=eq.' + account['user_id'], key=session['access_token'])
        if status == 200:
            break
        time.sleep(0.1)
    assert status == 200 and profile == [{'user_id': account['user_id']}]
    # Authenticated clients retain the reviewed minimum-score projection under
    # owner/consented-coach RLS. A bare id projection is not a raw-data probe.
    status, minimum = request(rest_ip, 3000, '/results?select=id&limit=10', key=session['access_token'])
    assert status == 200 and minimum == [], 'Ownerless legacy rows must remain invisible to this unrelated identity'
    denial = []
    for role, key in [('anon', c['anon_key']), ('authenticated', session['access_token']), ('service_role', c['service_role_key'])]:
        status, _ = request(rest_ip, 3000, '/results?select=*&limit=1', key=key)
        assert status in (401, 403), (role, status)
        denial.append({'role': role, 'raw_results_http': status})
    # The restored Auth trigger and bridge must also work for a new identity.
    status, created = request(auth_ip, 9999, '/signup', 'POST', {
        'email': 'restore-' + secrets.token_hex(6) + '@example.invalid',
        'password': c['test_password'],
        'data': {'name': '복원 검증회원', 'nickname': '복원 검증회원', 'role': 'admin'},
    }, c['anon_key'])
    assert status == 200 and created.get('access_token')
    created_id = created['user']['id']
    status, own_user = request(rest_ip, 3000, '/users?select=role,name&id=eq.' + created_id, key=created['access_token'])
    assert status == 200 and own_user == [{'role': 'user', 'name': '복원 검증회원'}]
    status, prepared = request(rest_ip, 3000, '/rpc/kcf_ensure_member', 'POST', {}, created['access_token'])
    assert status == 200 and isinstance(prepared, dict)
    assert prepared['user_id'] == created_id and prepared['role'] == 'member' and prepared['onboarding_state'] == 'pending'
    assert snapshot(DB) == before, 'Restore Auth/REST probes changed the original local database'
    report = {
        'status': 'PASS', 'scope': 'Synthetic local logical backup/restore into independent internal-network PostgreSQL, then actual restored GoTrue/Auth JWT/PostgREST checks',
        'backup_format': 'pg_dump custom', 'backup_sha256': hashlib.sha256(dump.read_bytes()).hexdigest(),
        'backup_seconds_local_observed': round(backup_seconds, 3), 'restore_seconds_local_observed': round(restore_seconds, 3),
        'total_seconds_local_observed': round(time.monotonic() - start, 3),
        'restored_table_count': len(before) - 3, 'table_counts_hashes': before,
        'original_local_database_unchanged': True, 'restored_actual_auth_password_login': 'PASS',
        'restored_actual_auth_signup_name_trigger_no_metadata_admin_escalation': 'PASS',
        'restored_actual_auth_new_uuid_member_prepare_pending_no_automatic_accept': 'PASS',
        'restored_actual_jwt_own_kcf_profile': 'PASS', 'restored_raw_results_denial': denial,
        'authenticated_minimum_projection_ownerless_rows_hidden': 'PASS',
        'restore_network': 'phase1-closeout-internal (internal=true)', 'restore_host_ports': 0,
        'hosted_supabase_backup_PITR_RPO_RTO': 'NOT VERIFIED: requires project/account access and owner decision',
        'production_requests': 0, 'customer_data_copied': 0,
    }
    private(STATE / 'backup-restore.json', json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'status': 'PASS', 'restored_table_count': report['restored_table_count'], 'actual_auth_and_jwt': 'PASS', 'raw_results_denial_roles': [x['role'] for x in denial], 'private_evidence': str(STATE / 'backup-restore.json')}))
finally:
    for name in (RESTORE_AUTH, RESTORE_REST, RESTORE_DB):
        remove_owned(name)
