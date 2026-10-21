"""Disposable actual GoTrue/PostgREST/Postgres harness, NEVER operating data.

All containers use an internal network; the HTTP gateway binds only loopback.
Private local JWT/password files are created mode0600 under /tmp, never logged.
Historical SQL files remain unchanged; reviewed name-contract normalization and
missing KCF mirror DDL are explicit local fixtures, not production bootstrapping.
"""
import base64
import argparse
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
import sys
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent
STATE = Path('/tmp/phase1-closeout-private')
NETWORK = 'phase1-closeout-internal'
DB = 'phase1-closeout-db'
AUTH = 'phase1-closeout-auth'
REST = 'phase1-closeout-rest'
MAIL = 'phase1-closeout-mail'
BRIDGE_SHA256 = '47dda1f0ede3c99a6b96208a5f875600aaa4afd86a7d3890fd280ebf14125879'
CATALYST = Path(os.environ.get('PHASE1_CATALYST_REPO', '/workspace/catalyst-phase1-validation')).resolve()
SAIL = Path(os.environ.get('PHASE1_SAIL_REPO', '/workspace/sail-phase1-closeout')).resolve()
IMAGES = {
    'postgres': 'postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24',
    'auth': 'supabase/gotrue:v2.185.0@sha256:de22ff0811f3e4f7e6d3ba226f75ed8d82310df577bbd61e16fbfd7a50a8c9ce',
    'rest': 'postgrest/postgrest:v13.0.7@sha256:0a46780309a604cdc8b56c776c6e5e15788ce58174d709e40459ab5a2d44d228',
    'mail': 'axllent/mailpit@sha256:23fe39e81bde596a918000b3135c0f85dc8bb4c9ea6be274b051143f3e300387',
}
_docker_checked = False
_database_checked = False


def command(args, stdin=None, check=True):
    global _docker_checked
    if args[0] == 'docker' and not _docker_checked:
        if os.environ.get('DOCKER_HOST') and not os.environ['DOCKER_HOST'].startswith('unix://'):
            raise RuntimeError('Local harness refuses remote DOCKER_HOST')
        endpoint = subprocess.run(['docker', 'context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'], text=True, capture_output=True, timeout=10)
        if endpoint.returncode or not endpoint.stdout.strip().startswith('unix://'):
            raise RuntimeError('Local harness refuses remote/non-Unix Docker contexts')
        _docker_checked = True
    p = subprocess.run(args, input=stdin, text=True, capture_output=True, timeout=120)
    if check and p.returncode:
        # Docker command/environment diagnostics can contain credentials: redact.
        raise RuntimeError(f'Local command failed: {args[0]} ({p.returncode}); private diagnostic withheld')
    return p


def sql(statement):
    global _database_checked
    assert DB.startswith('phase1-closeout-')
    if not _database_checked:
        metadata = json.loads(command(['docker', 'inspect', DB]).stdout)[0]
        if metadata['Config'].get('Labels', {}).get('phase1.closeout') != '1' or NETWORK not in metadata['NetworkSettings']['Networks']:
            raise RuntimeError('Local SQL refuses an unrelated database container')
        _database_checked = True
    return command(['docker', 'exec', '-i', DB, 'psql', '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'], statement).stdout.strip()


def bridge_text():
    path = CATALYST / 'supabase/migrations/20261020100000_kcf_member_bridge.sql'
    if hashlib.sha256(path.read_bytes()).hexdigest() != BRIDGE_SHA256:
        raise RuntimeError('Reviewed Catalyst member-bridge migration hash mismatch')
    return path.read_text()


def private(path, text):
    path.write_text(text)
    path.chmod(0o600)


def jwt(secret, role):
    enc = lambda x: base64.urlsafe_b64encode(json.dumps(x, separators=(',', ':')).encode()).decode().rstrip('=')
    header = enc({'alg': 'HS256', 'typ': 'JWT'})
    payload = enc({'iss': 'local-phase1-closeout', 'role': role, 'aud': 'authenticated', 'iat': int(time.time()), 'exp': int(time.time()) + 86400 * 30})
    signing = header + '.' + payload
    return signing + '.' + base64.urlsafe_b64encode(hmac.new(secret.encode(), signing.encode(), hashlib.sha256).digest()).decode().rstrip('=')


def local_request(path, payload=None, key=None):
    assert path.startswith('/auth/v1/') or path.startswith('/rest/v1/')
    headers = {'Content-Type': 'application/json'}
    if key:
        headers.update(apikey=key, Authorization='Bearer ' + key)
    request = urllib.request.Request('http://127.0.0.1:54321' + path, data=None if payload is None else json.dumps(payload).encode(), headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, json.loads(response.read() or b'{}')
    except urllib.error.HTTPError as error:
        return error.code, {}


def run_container(name, image, extra=(), env=None):
    network = json.loads(command(['docker', 'network', 'inspect', NETWORK]).stdout)[0]
    if not network['Internal'] or network.get('Labels', {}).get('phase1.closeout') != '1':
        raise RuntimeError('Local service requires the owned internal Docker network')
    args = ['docker', 'run', '--pull=never', '-d', '--name', name, '--network', NETWORK, '--label', 'phase1.closeout=1']
    if env:
        args += ['--env-file', str(env)]
    args += list(extra) + [image]
    command(args)


def make_state():
    STATE.mkdir(exist_ok=True, mode=0o700)
    STATE.chmod(0o700)
    config_path = STATE / 'config.json'
    if config_path.exists():
        c = json.loads(config_path.read_text())
    else:
        secret = secrets.token_urlsafe(48)
        c = {'jwt_secret': secret, 'anon_key': jwt(secret, 'anon'), 'service_role_key': jwt(secret, 'service_role'), 'auth_db_password': secrets.token_urlsafe(24), 'rest_db_password': secrets.token_urlsafe(24), 'test_password': secrets.token_urlsafe(18), 'supabase_url': 'http://127.0.0.1:54321', 'database_container': DB}
        private(config_path, json.dumps(c))
    secret = c['jwt_secret']
    if c['supabase_url'] != 'http://127.0.0.1:54321' or 'zdoytzmvcafcebytttrm' in json.dumps(c):
        raise RuntimeError('Local harness refuses non-loopback/operating configuration')
    public = {
        'NEXT_PUBLIC_SUPABASE_URL': c['supabase_url'],
        'NEXT_PUBLIC_SUPABASE_ANON_KEY': c['anon_key'],
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': c['anon_key'],
        'SUPABASE_SERVICE_ROLE_KEY': c['service_role_key'],
        'VITE_SUPABASE_URL': c['supabase_url'],
        'VITE_SUPABASE_ANON_KEY': c['anon_key'],
        'VITE_SUPABASE_PUBLISHABLE_KEY': c['anon_key'],
        'SAIL_TEST_SUPABASE_URL': c['supabase_url'],
        'SAIL_TEST_ANON_KEY': c['anon_key'],
        'SAIL_TEST_SERVICE_ROLE_KEY': c['service_role_key'],
        'SAIL_TEST_ACCOUNTS_FILE': str(STATE / 'accounts.json'),
        'SAIL_TEST_DB_CONTAINER': DB,
        'SAIL_GENERAL_ADMIN_EMAIL': 'baseline-admin@example.invalid',
    }
    private(STATE / 'apps.env', ''.join(f'{k}={v}\n' for k, v in public.items()))
    private(STATE / 'apps-env.json', json.dumps(public))
    auth = {
        'API_EXTERNAL_URL': c['supabase_url'] + '/auth/v1',
        'GOTRUE_API_HOST': '0.0.0.0', 'GOTRUE_API_PORT': '9999',
        'GOTRUE_DB_DRIVER': 'postgres', 'GOTRUE_DB_NAMESPACE': 'auth',
        'GOTRUE_DB_DATABASE_URL': 'postgresql://supabase_auth_admin:' + c['auth_db_password'] + '@' + DB + ':5432/postgres?sslmode=disable',
        'GOTRUE_SITE_URL': 'http://127.0.0.1:3040',
        'GOTRUE_URI_ALLOW_LIST': 'http://127.0.0.1:3040/**,http://127.0.0.1:3041/**,http://localhost:3040/**,http://localhost:3041/**',
        'GOTRUE_DISABLE_SIGNUP': 'false', 'GOTRUE_EXTERNAL_EMAIL_ENABLED': 'true',
        'GOTRUE_MAILER_AUTOCONFIRM': 'true', 'GOTRUE_JWT_SECRET': secret,
        'GOTRUE_JWT_EXP': '3600', 'GOTRUE_JWT_ADMIN_ROLES': 'service_role',
        'GOTRUE_JWT_DEFAULT_GROUP_NAME': 'authenticated', 'GOTRUE_PASSWORD_MIN_LENGTH': '8',
        'GOTRUE_RATE_LIMIT_EMAIL_SENT': '10000', 'GOTRUE_RATE_LIMIT_TOKEN_REFRESH': '10000',
        'GOTRUE_SMTP_HOST': MAIL, 'GOTRUE_SMTP_PORT': '1025',
        'GOTRUE_SMTP_ADMIN_EMAIL': 'noreply@example.invalid', 'GOTRUE_SMTP_SENDER_NAME': 'Local Phase1',
        'GOTRUE_MAILER_URLPATHS_CONFIRMATION': '/auth/v1/verify',
        'GOTRUE_MAILER_URLPATHS_RECOVERY': '/auth/v1/verify',
        'GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE': '/auth/v1/verify',
        'GOTRUE_MAILER_URLPATHS_INVITE': '/auth/v1/verify',
    }
    private(STATE / 'auth.env', ''.join(f'{k}={v}\n' for k, v in auth.items()))
    rest = {'PGRST_DB_URI': 'postgres://authenticator:' + c['rest_db_password'] + '@' + DB + ':5432/postgres', 'PGRST_DB_SCHEMAS': 'public', 'PGRST_DB_ANON_ROLE': 'anon', 'PGRST_JWT_SECRET': secret, 'PGRST_SERVER_PORT': '3000', 'PGRST_DB_EXTRA_SEARCH_PATH': 'public,extensions', 'PGRST_LOG_LEVEL': 'crit'}
    private(STATE / 'rest.env', ''.join(f'{k}={v}\n' for k, v in rest.items()))
    return c


def start():
    global _database_checked
    _database_checked = False
    c = make_state()
    command(['docker', 'network', 'create', '--internal', '--label', 'phase1.closeout=1', NETWORK], check=False)
    network = json.loads(command(['docker', 'network', 'inspect', NETWORK]).stdout)[0]
    if not network['Internal'] or network.get('Labels', {}).get('phase1.closeout') != '1':
        raise RuntimeError('Refusing to reuse a non-owned/non-internal Docker network')
    for name in (AUTH, REST, MAIL, DB):
        existing = command(['docker', 'inspect', name], check=False)
        if existing.returncode == 0 and json.loads(existing.stdout)[0]['Config'].get('Labels', {}).get('phase1.closeout') != '1':
            raise RuntimeError('Refusing to remove an unrelated Docker container')
    command(['docker', 'rm', '-f', AUTH, REST, MAIL, DB], check=False)
    run_container(DB, IMAGES['postgres'], ['--tmpfs', '/var/lib/postgresql/data:rw,nosuid', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-p', '127.0.0.1:54322:5432'])
    for _ in range(100):
        process = command(['docker', 'exec', DB, 'cat', '/proc/1/comm'], check=False)
        ready = command(['docker', 'exec', DB, 'pg_isready', '-U', 'postgres'], check=False)
        if process.stdout.strip() == 'postgres' and ready.returncode == 0:
            break
        time.sleep(0.2)
    else:
        raise RuntimeError('Disposable final PostgreSQL did not become ready')
    sql(f"""CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD '{c['rest_db_password']}';
GRANT anon,authenticated,service_role TO authenticator;
CREATE ROLE supabase_auth_admin LOGIN NOINHERIT PASSWORD '{c['auth_db_password']}';
ALTER ROLE supabase_auth_admin SET search_path=auth,public;
CREATE SCHEMA auth AUTHORIZATION supabase_auth_admin;
CREATE SCHEMA extensions;
GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
GRANT USAGE ON SCHEMA extensions TO anon,authenticated,service_role;
CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";
GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon,authenticated,service_role;
""")
    run_container(MAIL, IMAGES['mail'], ['-p', '127.0.0.1:54325:8025'])
    run_container(AUTH, IMAGES['auth'], ['-p', '127.0.0.1:54323:9999'], STATE / 'auth.env')
    run_container(REST, IMAGES['rest'], ['-p', '127.0.0.1:54324:3000'], STATE / 'rest.env')
    targets = {}
    for key, name in [('auth', AUTH), ('rest', REST), ('mail', MAIL)]:
        targets[key] = command(['docker', 'inspect', name, '--format', '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}']).stdout.strip()
        assert re.fullmatch(r'172\.\d+\.\d+\.\d+', targets[key])
    private(STATE / 'targets.json', json.dumps(targets))
    gateway_pid = STATE / 'gateway.pid'
    if gateway_pid.exists():
        try:
            old_pid = int(gateway_pid.read_text())
            cmdline = Path(f'/proc/{old_pid}/cmdline').read_bytes()
            if b'gateway.py' in cmdline and (b'phase1-closeout-runtime' in cmdline or str(SAIL / 'tests/local-runtime').encode() in cmdline):
                os.kill(old_pid, 15)
        except ProcessLookupError:
            pass
        except FileNotFoundError:
            pass
    log = (STATE / 'gateway.log').open('a')
    p = subprocess.Popen([sys.executable, str(ROOT / 'gateway.py')], stdout=log, stderr=log, start_new_session=True)
    private(gateway_pid, str(p.pid))
    for _ in range(100):
        try:
            status, _ = local_request('/auth/v1/health')
            if status == 200:
                break
        except (OSError, ValueError):
            pass
        time.sleep(0.2)
    else:
        raise RuntimeError('Actual local GoTrue did not become ready; private container diagnostics withheld')
    baseline(c)
    seed(c)
    print(json.dumps({'status': 'READY', 'supabase_url': c['supabase_url'], 'private_apps_env': str(STATE / 'apps.env'), 'private_apps_env_json': str(STATE / 'apps-env.json'), 'private_accounts': str(STATE / 'accounts.json'), 'database_container': DB, 'mailpit_url': 'http://127.0.0.1:54325', 'images': IMAGES, 'bridge_applied': False}))


def baseline(c):
    # GoTrue installs its real Auth schema first. PostgREST13 publishes combined
    # claims, so expose the normal Supabase helpers with legacy setting fallback.
    sql("""CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub'))::uuid $$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.role',true),''),(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role')) $$;""")
    source = SAIL / 'supabase/migrations'
    for name in ['20260528000000_initial_schema.sql', '20260528120000_groups.sql', '20260528150000_fix_rls_recursion.sql', '20260528170000_phone_profile.sql']:
        text = (source / name).read_text()
        # Historical source stays exact on disk. Avoid real identity literals in
        # local fixture behavior; the sole bootstrap address is synthetic.
        text = re.sub(r"[A-Za-z0-9_.+-]+@gmail\.com", 'baseline-admin@example.invalid', text)
        sql(text)
    sql("""-- EXPLICIT LOCAL FIXTURE: reviewed operating name contract, not a production migration.
ALTER TABLE public.users RENAME COLUMN full_name TO name;
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.users(id,email,nickname,name,phone,role) VALUES(NEW.id,NEW.email,
 coalesce(NEW.raw_user_meta_data->>'nickname',NEW.raw_user_meta_data->>'name',NEW.raw_user_meta_data->>'full_name'),
 coalesce(NEW.raw_user_meta_data->>'name',NEW.raw_user_meta_data->>'full_name'),NEW.raw_user_meta_data->>'phone','user')
 ON CONFLICT(id) DO NOTHING; RETURN NEW;
END $$;
REVOKE ALL ON public.users FROM anon,authenticated;
GRANT SELECT ON public.users TO authenticated;
GRANT UPDATE(nickname,name,phone) ON public.users TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
NOTIFY pgrst,'reload schema';
""")


def seed(c):
    accounts = []
    for i in range(1, 29):
        email = 'baseline-admin@example.invalid' if i == 28 else f'local-user-{i:02d}@example.invalid'
        role = 'user' if i <= 23 else 'coach' if i <= 25 else 'admin'
        status, data = local_request('/auth/v1/signup', {'email': email, 'password': c['test_password'], 'data': {'nickname': f'격리회원 {i}', 'name': f'격리회원 {i}', 'full_name': f'격리회원 {i}', 'phone': '0100000' + str(i).zfill(4)}}, c['anon_key'])
        if status != 200 or not data.get('user', {}).get('id'):
            raise RuntimeError('Actual GoTrue synthetic signup failed at account index ' + str(i) + ', status ' + str(status))
        user_id = data['user']['id']
        assert re.fullmatch(r'[0-9a-f-]{36}', user_id)
        sql(f"UPDATE public.users SET role='{role}' WHERE id='{user_id}';")
        accounts.append({'index': i, 'user_id': user_id, 'email': email, 'password': c['test_password'], 'sail_role': role})
    private(STATE / 'accounts.json', json.dumps(accounts, ensure_ascii=False))
    migrations = CATALYST / 'supabase/migrations'
    for p in sorted(migrations.glob('*.sql')):
        if p.name >= '20261020100000_kcf_member_bridge.sql':
            continue
        text = p.read_text()
        if p.name == '20261019130000_kcf_members_forum.sql':
            text = re.sub(r"lower\(email\)='[^']+'", "lower(email)='baseline-admin@example.invalid'", text)
        if p.name == '20261020040202_kcf_forum_9plus1_crossdisciplinary.sql':
            sql('CREATE TABLE public.kcf_v2_fields(key text PRIMARY KEY,label text,definition text,sort_order integer,active boolean NOT NULL DEFAULT true); CREATE TABLE public.kcf_v2_post_classification(post_id uuid PRIMARY KEY REFERENCES public.kcf_posts(id),field_key text,type_key text,related_fields text[],tag_keys text[]);')
            text = 'BEGIN;\n' + text + '\nCOMMIT;'
        sql(text)
    admin = accounts[-1]['user_id']
    for i in range(1, 12):
        post_id = f'40000000-0000-4000-8000-{i:012d}'
        sql(f"INSERT INTO public.kcf_posts(id,author_id,topic_id,article_type,title,body,status) VALUES('{post_id}','{admin}','coaching','knowledge','격리 공개 글 {i}','이 글은 운영 데이터를 사용하지 않는 격리 회귀 원고입니다.','published');")
    for i in range(1, 7):
        result_id = f'50000000-0000-4000-8000-{i:012d}'
        sql(f"INSERT INTO public.results(id,user_id,group_id,nickname,answers,assertiveness_raw,responsiveness_raw,assertiveness_norm,responsiveness_norm,type_s_pct,type_a_pct,type_i_pct,type_l_pct,dominant_type,intensity) VALUES('{result_id}',NULL,NULL,'보전 검증 합성 결과 {i}','{{}}',0,0,0,0,25,25,25,25,'S',0);")
    sql('NOTIFY pgrst,\'reload schema\';')
    summary = {'auth_users': int(sql('SELECT count(*) FROM auth.users')), 'sail_users': int(sql('SELECT count(*) FROM public.users')), 'kcf_profiles_before_bridge': int(sql('SELECT count(*) FROM public.kcf_profiles')), 'published_posts': int(sql("SELECT count(*) FROM public.kcf_posts WHERE status='published'")), 'ownerless_synthetic_results': int(sql('SELECT count(*) FROM public.results WHERE user_id IS NULL AND group_id IS NULL')), 'users_columns': sql("SELECT string_agg(column_name,',' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema='public' AND table_name='users'")}
    private(STATE / 'baseline-summary.json', json.dumps(summary))


def stop():
    for name in (AUTH, REST, MAIL, DB):
        existing = command(['docker', 'inspect', name], check=False)
        if existing.returncode == 0 and json.loads(existing.stdout)[0]['Config'].get('Labels', {}).get('phase1.closeout') != '1':
            raise RuntimeError('Refusing to stop an unrelated Docker container')
    command(['docker', 'rm', '-f', AUTH, REST, MAIL, DB], check=False)
    network = command(['docker', 'network', 'inspect', NETWORK], check=False)
    if network.returncode == 0:
        metadata = json.loads(network.stdout)[0]
        if metadata.get('Labels', {}).get('phase1.closeout') != '1':
            raise RuntimeError('Refusing to remove an unrelated Docker network')
        command(['docker', 'network', 'rm', NETWORK], check=False)
    pid = STATE / 'gateway.pid'
    if pid.exists():
        try:
            old_pid = int(pid.read_text())
            cmdline = Path(f'/proc/{old_pid}/cmdline').read_bytes()
            if b'gateway.py' in cmdline and (b'phase1-closeout-runtime' in cmdline or str(SAIL / 'tests/local-runtime').encode() in cmdline):
                os.kill(old_pid, 15)
        except ProcessLookupError:
            pass
        except FileNotFoundError:
            pass
    print('Stopped only phase1-closeout local containers/gateway; private test files retained for evidence tooling')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['start', 'stop', 'status', 'apply-catalyst-bridge'], default='status', nargs='?')
    parser.add_argument('--catalyst-repo', type=Path, default=CATALYST)
    parser.add_argument('--sail-repo', type=Path, default=SAIL)
    options = parser.parse_args()
    CATALYST, SAIL = options.catalyst_repo.resolve(), options.sail_repo.resolve()
    action = options.action
    if action == 'start':
        start()
    elif action == 'stop':
        stop()
    elif action == 'apply-catalyst-bridge':
        sql(bridge_text())
        sql("NOTIFY pgrst,'reload schema';")
        print('Applied the unchanged Catalyst bridge to the disposable local DB only')
    elif action == 'status':
        print(command(['docker', 'ps', '--filter', 'label=phase1.closeout=1', '--format', '{{.Names}} {{.Status}} {{.Ports}}']).stdout)
    else:
        raise SystemExit('Allowed actions: start, stop, status, apply-catalyst-bridge')
