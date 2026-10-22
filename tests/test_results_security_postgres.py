"""Real PostgreSQL 17 security/concurrency regression in a disposable offline DB.

No ports, no operating credentials, no database URL. Uses actual SAIL historical
migrations and candidate security SQL exported from the synthetic WASM fixture.
"""
import concurrent.futures
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import uuid

ROOT=Path(__file__).resolve().parents[1]
IMAGE='postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24'
NAME='sail-security-test-'+uuid.uuid4().hex[:12]
A='10000000-0000-4000-8000-000000000001'
B='10000000-0000-4000-8000-000000000002'
COACH='10000000-0000-4000-8000-000000000003'
ADMIN='10000000-0000-4000-8000-000000000005'
GROUP='20000000-0000-4000-8000-000000000001'
SESSION='a'*64
ANON='b'*64
SHARE='d'*64
ANSWERS={f'Q{i}':('a' if i<=10 else 'cardA' if i<=20 else 50) for i in range(1,31)}
PAYLOAD=dict(answers=ANSWERS,nickname='합성 참여자',device='fixture',assertiveness_raw=50,responsiveness_raw=50,assertiveness_norm=0,responsiveness_norm=0,type_s_pct=25,type_a_pct=25,type_i_pct=25,type_l_pct=25,dominant_type='S',secondary_type='A',intensity=0,consistency_score=100)
RESULTS=[]

def command(args,body=None,check=True,timeout=120):
 p=subprocess.run(args,input=body,text=True,capture_output=True,timeout=timeout)
 if check and p.returncode:raise AssertionError('Isolated command failed: '+args[0]+' '+p.stderr[-1000:])
 return p

def sql(s,check=True):
 return command(['docker','exec','-i',NAME,'psql','-X','-q','-t','-A','-v','ON_ERROR_STOP=1','-U','postgres'],s,check=check)

def literal(value):
 if value is None:return 'NULL'
 if isinstance(value,bool):return 'true' if value else 'false'
 return "'"+(json.dumps(value,ensure_ascii=False) if isinstance(value,dict) else str(value)).replace("'","''")+"'"

def rpc(name,args,role='service_role',uid=None,check=True):
 return actor(role,uid,'SELECT public.'+name+'('+','.join(literal(v) for v in args)+');',check)

def actor(role,uid,statement,check=True):
 return sql("BEGIN;SET LOCAL ROLE "+role+";SET LOCAL request.jwt.claim.sub="+literal(uid or '')+';'+statement+'COMMIT;',check)

def deny(result):
 assert result.returncode!=0,'Forbidden database action unexpectedly succeeded'

def passed(label):
 RESULTS.append(label);print('PASS '+label,flush=True)

def wait_for_backend(marker):
 # Synchronize on a real PostgreSQL backend holding its transaction open.
 for _ in range(100):
  if sql("SELECT count(*) FROM pg_stat_activity WHERE application_name="+literal(marker)+" AND wait_event='PgSleep';").stdout.strip()=='1':return
  time.sleep(.03)
 raise AssertionError('Race fixture backend did not reach its held transaction')

with tempfile.TemporaryDirectory(prefix='sail-security-fixture-') as tmp:
 fixture=Path(tmp)/'fixture.sql'
 # Run exporter with no token/production environment arguments in the command.
 generated=subprocess.run(['node','tests/test_results_security_db.mjs'],cwd=ROOT,env={**os.environ,'SAIL_SECURITY_FIXTURE_SQL':str(fixture)},capture_output=True,text=True,timeout=120)
 assert generated.returncode==0,'Run the isolated WASM suite to inspect fixture-generation error'
 command(['docker','image','inspect',IMAGE])
 created=False
 try:
  command(['docker','run','--pull=never','--rm','-d','--name',NAME,'--network','none','--label','sail.security.test=1','--tmpfs','/var/lib/postgresql/data:rw,nosuid','-e','POSTGRES_HOST_AUTH_METHOD=trust',IMAGE,'postgres','-c','listen_addresses='])
  created=True
  for attempt in range(100):
   pid=command(['docker','exec',NAME,'cat','/proc/1/comm'],check=False)
   ready=command(['docker','exec',NAME,'pg_isready','-U','postgres'],check=False)
   if pid.returncode==0 and pid.stdout.strip()=='postgres' and ready.returncode==0:break
   time.sleep(.25)
  else:raise AssertionError('Disposable PostgreSQL final process not ready')
  sql(fixture.read_text())
  checksum="SELECT md5(string_agg(to_jsonb(r)::text,',' ORDER BY id)) FROM public.results r WHERE id::text LIKE '30000000%';"
  before=sql(checksum).stdout.strip()
  for role in ('anon','authenticated'):
   for privilege in ('INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'):
    assert sql("SELECT has_table_privilege('"+role+"','public.results','"+privilege+"');").stdout.strip()=='f'
   deny(actor(role,A,'TRUNCATE public.results;',False))
   deny(actor(role,A,'SELECT * FROM public.sail_result_sessions;',False))
   deny(rpc('sail_create_session',[SESSION,A],role,A,False))
  deny(actor('anon',None,'SELECT id FROM public.results;',False))
  deny(actor('authenticated',A,'SELECT answers FROM public.results;',False))
  deny(actor('anon',None,'SELECT * FROM public.fixture_result_view;',False))
  passed('PG01 client grants/TRUNCATE/private tables/definer RPC/view bypass deny')
  deny(actor('authenticated',A,"UPDATE public.users SET role='admin' WHERE id="+literal(A)+';',False))
  deny(actor('authenticated',A,"INSERT INTO public.users(id,role) VALUES('10000000-0000-4000-8000-000000000099','admin');",False))
  actor('authenticated',A,"UPDATE public.users SET name='합성 검증' WHERE id="+literal(A)+';')
  assert sql('SELECT role FROM public.users WHERE id='+literal(A)).stdout.strip()=='user'
  passed('PG02 self role escalation/forged profile INSERT denied, own display update preserved')
  rpc('sail_create_session',[SESSION,A]);rpc('sail_create_session',[ANON,None])
  def create(_):return rpc('sail_create_result',[SESSION,'parallel-1',A,GROUP,PAYLOAD,False]).stdout.strip()
  with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:ids=list(pool.map(create,range(8)))
  assert len(set(ids))==1
  result=ids[0]
  assert sql('SELECT count(*) FROM public.sail_result_submissions;').stdout.strip()=='1'
  assert sql('SELECT count(*) FROM public.group_members WHERE user_id='+literal(A)+' AND group_id='+literal(GROUP)).stdout.strip()=='1'
  deny(rpc('sail_create_result',[SESSION,'parallel-1',A,GROUP,{**PAYLOAD,'nickname':'변경'},False],check=False))
  passed('PG03 8 concurrent same-key saves create exactly one immutable result/submission/membership')
  owner=json.loads(rpc('sail_read_result',[result,A,None,None]).stdout)
  assert owner['can_manage'] and owner['access_kind']=='owner'
  assert not any(k in owner for k in ('answers','device','user_id','group_id','token_hash'))
  assert rpc('sail_read_result',[result,B,None,None]).stdout.strip()==''
  assert rpc('sail_read_result',[result,ADMIN,None,None]).stdout.strip()==''
  assert rpc('sail_read_result',[result,COACH,None,None]).stdout.strip()==''
  rpc('sail_set_group_consent',[result,A,SESSION,True])
  assert json.loads(rpc('sail_read_result',[result,COACH,None,None]).stdout)['access_kind']=='coach'
  assert len(json.loads(rpc('sail_list_group_results',[GROUP,COACH]).stdout))==1
  rpc('sail_set_group_consent',[result,A,SESSION,False])
  assert rpc('sail_read_result',[result,COACH,None,None]).stdout.strip()==''
  passed('PG04 owner minimum DTO; other user/admin denied; coach explicit consent and revocation enforced')
  anon_id=rpc('sail_create_result',[ANON,'anonymous-1',None,GROUP,PAYLOAD,False]).stdout.strip()
  assert rpc('sail_read_result',[anon_id,None,None,None]).stdout.strip()==''
  assert json.loads(rpc('sail_read_result',[anon_id,None,ANON,None]).stdout)['access_kind']=='session'
  rpc('sail_create_share',[anon_id,None,ANON,SHARE,3600])
  shared=json.loads(rpc('sail_read_result',[anon_id,None,None,SHARE]).stdout)
  assert shared['access_kind']=='share' and not shared['can_manage']
  assert rpc('sail_read_result',[result,None,None,SHARE]).stdout.strip()==''
  rpc('sail_revoke_share',[anon_id,None,ANON,SHARE])
  assert rpc('sail_read_result',[anon_id,None,None,SHARE]).stdout.strip()==''
  rpc('sail_revoke_session',[ANON,None])
  assert rpc('sail_read_result',[anon_id,None,ANON,None]).stdout.strip()==''
  passed('PG05 anonymous binding, separate share scope/revocation and session revocation enforced')
  def rate(_):return rpc('sail_rate_limit',['9'*64,'read',3,600]).stdout.strip()
  with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:allowed=list(pool.map(rate,range(8)))
  assert allowed.count('t')==3 and allowed.count('f')==5,allowed
  passed('PG06 persistent atomic throttle: exactly 3 of 8 concurrent attempts allowed')
  assert sql(checksum).stdout.strip()==before
  assert sql("SELECT count(*) FROM public.results WHERE user_id IS NULL AND id::text LIKE '30000000%';").stdout.strip()=='6'
  passed('PG07 six original ownerless rows and every original value preserved')
  deny(actor('service_role',None,'SELECT id FROM public.results;',False))
  deny(actor('service_role',None,'TRUNCATE public.results;',False))
  deny(actor('service_role',None,"INSERT INTO public.results(nickname,answers) VALUES('old unsafe','{}');",False))
  deny(actor('service_role',None,'SELECT token_hash FROM public.sail_result_sessions;',False))
  assert json.loads(rpc('sail_read_result',[result,A,None,None]).stdout)['access_kind']=='owner'
  for role in ('anon','authenticated'):
   deny(rpc('phone_exists',['00000000000'],role,A,False))
   deny(rpc('email_by_phone',['00000000000'],role,A,False))
  assert rpc('phone_exists',['00000000000']).stdout.strip()=='f'
  for role in ('anon','authenticated'):
   deny(rpc('resolve_group_by_code',['ABCDE'],role,A,False))
  assert rpc('resolve_group_by_code',['ABCDE']).stdout.strip()==GROUP
  passed('PG08 SQL-first old unsafe service API fails closed while new scoped RPC and server phone lookup remain usable')
  sql('GRANT SELECT(token_hash) ON public.sail_result_sessions TO anon;GRANT SELECT(answers) ON public.fixture_result_view TO authenticated;')
  sql((ROOT/'supabase/migrations/20261021150000_results_security.sql').read_text())
  deny(actor('anon',None,'SELECT token_hash FROM public.sail_result_sessions;',False))
  deny(actor('authenticated',A,'SELECT answers FROM public.fixture_result_view;',False))
  assert sql(checksum).stdout.strip()==before
  passed('PG09 replay removes residual column grants and preserves all original result bytes')
  sql('CREATE ROLE fixture_excess NOLOGIN;GRANT TRUNCATE ON public.results TO fixture_excess;GRANT fixture_excess TO authenticated;')
  unexpected=sql((ROOT/'supabase/migrations/20261021150000_results_security.sql').read_text(),False)
  assert unexpected.returncode and 'Unexpected inherited TRUNCATE' in unexpected.stderr
  sql('REVOKE fixture_excess FROM authenticated;REVOKE ALL ON public.results FROM fixture_excess;DROP ROLE fixture_excess;')
  passed('PG10 unexpected inherited privilege causes atomic refusal rather than silent exposure')

  # A request that began while its session was live must recheck after waiting
  # for revocation's row lock. All fixtures run against distinct real backends.
  locked_session='c'*64
  rpc('sail_create_session',[locked_session,None])
  with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
   revoke=pool.submit(sql,"BEGIN;SET application_name='fixture_revoke_race';UPDATE public.sail_result_sessions SET revoked_at=clock_timestamp() WHERE token_hash="+literal(locked_session)+";SELECT pg_sleep(1);COMMIT;")
   wait_for_backend('fixture_revoke_race')
   denied=pool.submit(rpc,'sail_create_result',[locked_session,'after-revoke',None,None,PAYLOAD,False],'service_role',None,False)
   revoke.result();deny(denied.result())
  assert sql("SELECT count(*) FROM public.sail_result_submissions WHERE session_hash="+literal(locked_session)).stdout.strip()=='0'
  passed('PG11 real two-backend revoke/save race denies the blocked save after revocation commits')

  expiry_session='e'*64
  rpc('sail_create_session',[expiry_session,None])
  with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
   blocker=pool.submit(sql,"BEGIN;SET application_name='fixture_expiry_race';UPDATE public.sail_result_sessions SET expires_at=clock_timestamp()+interval '400 milliseconds' WHERE token_hash="+literal(expiry_session)+";SELECT pg_sleep(1);COMMIT;")
   wait_for_backend('fixture_expiry_race')
   denied=pool.submit(rpc,'sail_create_result',[expiry_session,'after-expiry',None,None,PAYLOAD,False],'service_role',None,False)
   blocker.result();deny(denied.result())
  assert sql("SELECT count(*) FROM public.sail_result_submissions WHERE session_hash="+literal(expiry_session)).stdout.strip()=='0'
  passed('PG12 real two-backend expiry/save race checks wall-clock expiry after its lock wait')

  race_share='f'*64
  with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
   issue=pool.submit(sql,"BEGIN;SET application_name='fixture_share_race';SET LOCAL ROLE service_role;SELECT public.sail_create_share("+','.join(literal(v) for v in [result,A,SESSION,race_share,3600])+");SELECT pg_sleep(1);COMMIT;")
   wait_for_backend('fixture_share_race')
   revoke=pool.submit(rpc,'sail_revoke_share',[result,A,SESSION,None])
   issue.result();assert int(revoke.result().stdout.strip())>=1
  assert rpc('sail_read_result',[result,None,None,race_share]).stdout.strip()==''
  passed('PG13 revoke-all waits for earlier uncommitted issuance and revokes that share too')

  capacity_group='20000000-0000-4000-8000-000000000003'
  sql("INSERT INTO public.groups(id,coach_id,name,code,max_members) VALUES("+','.join(literal(v) for v in [capacity_group,COACH,'capacity fixture','MNPQR',1])+');')
  def join(uid):return rpc('sail_join_group',['MNPQR',uid],check=False)
  with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:joined=list(pool.map(join,[A,B,COACH,ADMIN]))
  assert sum(p.returncode==0 for p in joined)==1
  assert sql('SELECT count(*) FROM public.group_members WHERE group_id='+literal(capacity_group)).stdout.strip()=='1'
  for role in ('anon','authenticated','service_role'):
   deny(actor(role,A,'INSERT INTO public.group_members(group_id,user_id) VALUES('+literal(capacity_group)+','+literal(A)+');',False))
  passed('PG14 concurrent atomic joins enforce one-member capacity; all direct membership writers denied')

  consent_session='8'*64
  rpc('sail_create_session',[consent_session,None])
  consent_result=rpc('sail_create_result',[consent_session,'anonymous-consent',None,GROUP,PAYLOAD,True]).stdout.strip()
  assert json.loads(rpc('sail_read_result',[consent_result,COACH,None,None]).stdout)['access_kind']=='coach'
  assert sql('SELECT a.consent_expires_at<=s.expires_at FROM public.sail_result_access a JOIN public.sail_result_sessions s ON s.token_hash=a.session_hash WHERE a.result_id='+literal(consent_result)).stdout.strip()=='t'
  rpc('sail_revoke_session',[consent_session,None])
  assert rpc('sail_read_result',[consent_result,COACH,None,None]).stdout.strip()==''
  assert sql('SELECT NOT group_consent AND consent_revoked_at IS NOT NULL FROM public.sail_result_access WHERE result_id='+literal(consent_result)).stdout.strip()=='t'
  passed('PG15 anonymous coach access cannot outlive or survive revocation of its participation session')

 finally:
  if created:command(['docker','rm','-f',NAME],check=False)
print(json.dumps({'database':'PostgreSQL17 real multi-backend; actual SAIL SQL+candidate, synthetic isolated data','status':'PASS','checks':len(RESULTS),'results':RESULTS,'productionConnections':0,'network':'none','portsPublished':0},ensure_ascii=False))
