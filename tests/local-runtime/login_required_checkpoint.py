"""Policy B actual PostgreSQL transition; synthetic owned local container only."""
import hashlib
import json
from pathlib import Path
from runtime import STATE, SAIL, CATALYST, sql

def snapshot():
    return {table: sql("SELECT md5(string_agg(to_jsonb(t)::text,',' ORDER BY id)) FROM "+table+" t") for table in ('auth.users','public.users','public.results','public.kcf_posts')}

before=snapshot()
counts=json.loads(sql("SELECT json_build_object('auth',(select count(*) from auth.users),'sail',(select count(*) from public.users),'kcf',(select count(*) from public.kcf_profiles),'results',(select count(*) from public.results),'posts',(select count(*) from public.kcf_posts));"))
assert counts == dict(auth=28,sail=28,kcf=1,results=6,posts=11), 'Unexpected synthetic baseline'
paths=[SAIL/'supabase/migrations/20261021150000_results_security.sql',SAIL/'supabase/migrations/20261022110000_login_required_results.sql',CATALYST/'supabase/migrations/20261020100000_kcf_member_bridge.sql']
hashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
assert hashes[paths[0].name]=='affc354cdb821ee521adf5d06de101586b835104bde9ed7a2cd3e2dbd8e81896'
assert hashes[paths[2].name]=='47dda1f0ede3c99a6b96208a5f875600aaa4afd86a7d3890fd280ebf14125879'
for p in paths:
    sql(p.read_text())
    assert snapshot()==before, 'Migration changed existing synthetic data'
    sql(p.read_text())
    assert snapshot()==before, 'Migration replay changed existing synthetic data'
assert sql("SELECT is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='sail_result_sessions' AND column_name='user_id'")=='NO'
assert sql("SELECT count(*) FROM public.kcf_profiles WHERE onboarding_state='pending' AND consented_at IS NULL")=='28'
assert sql("SELECT count(*) FROM public.results WHERE user_id IS NULL")=='6'
roles=json.loads(sql("SELECT json_object_agg(role,n) FROM (SELECT role,count(*) n FROM public.kcf_profiles GROUP BY role) t"))
assert roles==dict(member=25,coach=2,super_admin=1)
sql("NOTIFY pgrst,'reload schema'")
evidence=dict(status='PASS',scope='synthetic actual PostgreSQL17, never operating data',order=[p.name for p in paths],sql_sha256=hashes,before_counts=counts,preserved_hashes=before,bridge_added=27,bridge_replay_added=0,role_counts=roles,ownerless_preserved=6)
(STATE/'login-required-checkpoint.json').write_text(json.dumps(evidence,indent=2))
print(json.dumps(evidence))
