"""Fix the actual local Auth28/SAIL28/KCF1 -> 28 bridge checkpoint before E2E.

No operating URLs, customer data or private credentials are written to evidence.
"""
import hashlib
import argparse
import json
import os
from pathlib import Path
import time
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--catalyst-repo', type=Path)
options = parser.parse_args()
if options.catalyst_repo:
    os.environ['PHASE1_CATALYST_REPO'] = str(options.catalyst_repo.resolve())
from runtime import CATALYST, STATE, sql, local_request, bridge_text, BRIDGE_SHA256


def count(table, condition='true'):
    return int(sql(f'SELECT count(*) FROM {table} WHERE {condition};'))


def digest(table):
    return sql(f"SELECT encode(digest(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY t.id),''),'sha256'),'hex') FROM {table} t;")


def snapshot():
    return {table: digest(table) for table in ('auth.users', 'public.users', 'public.results', 'public.kcf_posts')}


c = json.loads((STATE / 'config.json').read_text())
accounts = json.loads((STATE / 'accounts.json').read_text())
assert len(accounts) == 28
baseline = {'auth': count('auth.users'), 'sail': count('public.users'), 'kcf': count('public.kcf_profiles'), 'published': count('public.kcf_posts', "status='published'"), 'ownerless_results': count('public.results', 'user_id IS NULL AND group_id IS NULL')}
assert baseline == dict(auth=28, sail=28, kcf=1, published=11, ownerless_results=6), baseline
columns = json.loads(sql("SELECT json_agg(json_build_object('name',column_name,'type',data_type) ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema='public' AND table_name='users';"))
assert any(p['name'] == 'name' and p['type'] == 'text' for p in columns)
assert all(p['name'] != 'full_name' for p in columns)
sql((CATALYST / 'docs/member-bridge/preflight-readonly.sql').read_text())
before = snapshot()
admin = accounts[-1]['user_id']
original_admin = sql(f"SELECT json_build_object('user_id',user_id,'display_name',display_name,'role',role,'tier',tier,'status',status,'created_at',created_at) FROM public.kcf_profiles WHERE user_id='{admin}';")
path = CATALYST / 'supabase/migrations/20261020100000_kcf_member_bridge.sql'
bridge = bridge_text()
sha = hashlib.sha256(path.read_bytes()).hexdigest()
assert sha == BRIDGE_SHA256
sql(bridge)
sql("NOTIFY pgrst,'reload schema';")
assert snapshot() == before, 'Bridge changed SAIL/Auth/results/post snapshot'
assert count('public.kcf_profiles') == 28
assert count('public.kcf_profiles', "role='member'") == 25
assert count('public.kcf_profiles', "role='coach'") == 2
assert count('public.kcf_profiles', "role='super_admin'") == 1
assert count('public.kcf_profiles', "onboarding_state='pending' AND consent_version IS NULL AND consented_at IS NULL") == 28
current_admin = sql(f"SELECT json_build_object('user_id',user_id,'display_name',display_name,'role',role,'tier',tier,'status',status,'created_at',created_at) FROM public.kcf_profiles WHERE user_id='{admin}';")
assert current_admin == original_admin
profiles_before_replay = sql("SELECT md5(string_agg(to_jsonb(k)::text,'' ORDER BY k.user_id)) FROM public.kcf_profiles k;")
audit_before_replay = count('public.kcf_consent_events')
sql(bridge)
sql("NOTIFY pgrst,'reload schema';")
assert count('public.kcf_profiles') == 28
assert profiles_before_replay == sql("SELECT md5(string_agg(to_jsonb(k)::text,'' ORDER BY k.user_id)) FROM public.kcf_profiles k;")
assert count('public.kcf_consent_events') == audit_before_replay
assert snapshot() == before
sql((CATALYST / 'docs/member-bridge/verify-readonly.sql').read_text())

# Real Auth password grant, real JWT and real PostgREST own profile / anon denial.
# Raw tokens remain in process memory/private files only.
member = accounts[0]
status, session = local_request('/auth/v1/token?grant_type=password', {'email': member['email'], 'password': member['password']}, c['anon_key'])
assert status == 200 and session.get('access_token') and session['user']['id'] == member['user_id']
for _ in range(50):
    status, own = local_request('/rest/v1/kcf_profiles?select=user_id,onboarding_state&user_id=eq.' + member['user_id'], key=session['access_token'])
    if status == 200:
        break
    time.sleep(0.1)
assert status == 200 and own == [{'user_id': member['user_id'], 'onboarding_state': 'pending'}], (status, own)
status, anonymous = local_request('/rest/v1/kcf_profiles?select=user_id', key=c['anon_key'])
assert (status == 200 and anonymous == []) or status in (401, 403)
anonymous_denial = status
status, old_results = local_request('/rest/v1/results?select=id&limit=10', key=c['anon_key'])
assert status == 200 and len(old_results) == 6

evidence = {
    'status': 'PASS',
    'environment': 'actual local GoTrue v2.185.0 + PostgREST13 + PostgreSQL17, internal Docker network, loopback-only gateway',
    'baseline_counts': baseline,
    'reviewed_users_columns': columns,
    'fixture_disclosure': 'Public historical SAIL SQL4 unchanged on disk; explicit local-only full_name->name and name-trigger adaptation. Missing KCF mirror DDL supplied only as local fixture. Not a claim of full operating migration history reproduction.',
    'bridge_sha256': sha,
    'bridge_added': 27,
    'role_counts_after_bridge': {'member': 25, 'coach': 2, 'super_admin': 1},
    'pending_count_after_bridge': 28,
    'replay_added': 0,
    'bootstrap_identity_role_tier_status_created_at_preserved': True,
    'bootstrap_consent_archived_before_pending': audit_before_replay == 1,
    'same_auth_sail_results_posts_hashes_before_after_bridge_and_replay': before,
    'actual_auth_password_login': 'PASS',
    'actual_jwt_own_pending_profile_rest': 'PASS',
    'actual_anonymous_kcf_profile_read_denied': {'status': 'PASS', 'http': anonymous_denial},
    'actual_anonymous_results_read_before_security': 'local synthetic baseline permitted 6 rows, no customer data',
    'production_requests': 0,
}
out = STATE / 'bridge-checkpoint.json'
out.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + '\n')
out.chmod(0o600)
print(json.dumps({'status': 'PASS', 'bridge_added': 27, 'replay_added': 0, 'role_counts': evidence['role_counts_after_bridge'], 'preserved_tables': list(before), 'private_evidence': str(out)}, ensure_ascii=False))
