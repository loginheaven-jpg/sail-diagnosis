/** Actual SAIL migrations + security candidate, isolated PostgreSQL/WASM only.
 * No operating connection or credentials. Exported SQL is synthetic and can be
 * replayed against a disposable PostgreSQL for the companion multi-session suite.
 */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.SAIL_PGLITE_MODULE || '/workspace/.cloud-tools/sql-validation/node_modules/@electric-sql/pglite/dist/index.js');
const db = new PGlite();
const captured = [];
const results = [];
const exec = async (s) => { await db.exec(s); captured.push(s); };
const query = async (s) => (await db.query(s)).rows;
const lit = (v) => v===null?'NULL':`'${String(typeof v==='object'?JSON.stringify(v):v).replaceAll("'","''")}'`;
const ids = Object.fromEntries(['a','b','coach','othercoach','admin','kcf'].map((k,i)=>[k,`10000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`]));
const group = '20000000-0000-4000-8000-000000000001';
const othergroup = '20000000-0000-4000-8000-000000000002';
const session = 'a'.repeat(64), anonymous = 'b'.repeat(64), sessionB='c'.repeat(64), share='d'.repeat(64);
const answers = Object.fromEntries(Array.from({length:30},(_,i)=>[`Q${i+1}`,i<10?'a':i<20?'cardA':50]));
const payload = {answers,nickname:'합성 참여자',device:'fixture',assertiveness_raw:50,responsiveness_raw:50,assertiveness_norm:0,responsiveness_norm:0,type_s_pct:25,type_a_pct:25,type_i_pct:25,type_l_pct:25,dominant_type:'S',secondary_type:'A',intensity:0,consistency_score:100};
const call = (name,args) => `SELECT public.${name}(${args.map(lit).join(',')}) AS value`;
const actor = async(role,id,statement) => {
 await db.exec(`BEGIN; SET LOCAL ROLE ${role}; SELECT set_config('request.jwt.claim.sub',${lit(id||'')},true);`);
 try { const out=await query(statement);await db.exec('COMMIT');return out; } catch(e){await db.exec('ROLLBACK');throw e;}
};
const value = async(name,args) => (await actor('service_role',null,call(name,args)))[0].value;
const test = async (id,name,fn) => {await fn();results.push({id,name,status:'PASS'});console.log('PASS '+id+': '+name);};
const denied = async(fn) => {await assert.rejects(fn,(e)=>['42501','28000','22023','23505','54000','22P02','23502'].includes(e.code));};
await exec(`CREATE ROLE anon NOLOGIN;CREATE ROLE authenticated NOLOGIN;CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,phone text,raw_user_meta_data jsonb NOT NULL DEFAULT '{}');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;`);
for(const file of ['20260528000000_initial_schema.sql','20260528120000_groups.sql','20260528150000_fix_rls_recursion.sql','20260528170000_phone_profile.sql']){
 // Historical bootstrap identity is substituted in memory, never in repository.
 await exec((await readFile('supabase/migrations/'+file,'utf8')).replaceAll('loginheaven@gmail.com','operator@fixture.invalid'));
}
await exec('GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,authenticated,service_role;GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon,authenticated,service_role;');
for(const [name,id] of Object.entries(ids))await exec(`INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(${lit(id)},${lit(name+'@fixture.invalid')},'{"full_name":"합성 이름"}');`);
await exec(`UPDATE public.users SET role='coach' WHERE id IN (${lit(ids.coach)},${lit(ids.othercoach)});UPDATE public.users SET role='admin' WHERE id=${lit(ids.admin)};
INSERT INTO public.groups(id,coach_id,name,code) VALUES(${lit(group)},${lit(ids.coach)},'합성 그룹','ABCDE'),(${lit(othergroup)},${lit(ids.othercoach)},'다른 합성 그룹','FGHJK');`);
const columns = 'nickname,answers,assertiveness_raw,responsiveness_raw,assertiveness_norm,responsiveness_norm,type_s_pct,type_a_pct,type_i_pct,type_l_pct,dominant_type,secondary_type,intensity,consistency_score,device';
const values = [payload.nickname,payload.answers,50,50,0,0,25,25,25,25,'S','A',0,100,'fixture'].map(lit).join(',');
for(let i=1;i<=6;i++)await exec(`INSERT INTO public.results(id,${columns}) VALUES('30000000-0000-4000-8000-${String(i).padStart(12,'0')}',${values});`);
await exec(`INSERT INTO public.results(id,user_id,group_id,${columns}) VALUES('30000000-0000-4000-8000-000000000007',${lit(ids.a)},${lit(group)},${values});
CREATE VIEW public.fixture_result_view AS SELECT * FROM public.results;GRANT SELECT ON public.fixture_result_view TO anon,authenticated;
GRANT SELECT(answers) ON public.results TO anon;GRANT UPDATE(role) ON public.users TO authenticated;`);
await exec(await readFile('tests/fixtures/reviewed_users_contract.sql','utf8'));
const before=await query('SELECT jsonb_agg(to_jsonb(r) ORDER BY id) AS data FROM public.results r');
const migration=await readFile('supabase/migrations/20261021150000_results_security.sql','utf8');
await test('DB01','migration applies and six ownerless results plus every original field remain identical',async()=>{await exec(migration);assert.deepEqual(await query('SELECT jsonb_agg(to_jsonb(r) ORDER BY id) AS data FROM public.results r'),before);});
await test('DB02','repeat migration is idempotent and does not alter result rows',async()=>{await db.exec(migration);assert.deepEqual(await query('SELECT jsonb_agg(to_jsonb(r) ORDER BY id) AS data FROM public.results r'),before);});
await test('DB03','anon/auth raw writes, TRUNCATE, REFERENCES and TRIGGER privileges removed',async()=>{
 for(const role of ['anon','authenticated'])for(const privilege of ['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'])assert.equal((await query(`SELECT has_table_privilege('${role}','public.results','${privilege}') AS ok`))[0].ok,false);
 for(const role of ['anon','authenticated'])await denied(()=>actor(role,ids.a,'TRUNCATE public.results'));
 await denied(()=>actor('anon',null,'SELECT id FROM public.results'));
 await denied(()=>actor('authenticated',ids.a,'SELECT answers FROM public.results'));
});
await test('DB04','owner sees minimum score columns; other user/KCF-only/admin/coach see no legacy data',async()=>{
 assert.equal((await actor('authenticated',ids.a,'SELECT id FROM public.results')).length,1);
 for(const id of [ids.b,ids.kcf,ids.admin,ids.coach])assert.equal((await actor('authenticated',id,'SELECT id FROM public.results')).length,0);
});
await test('DB05','view bypass, token tables, audit and server RPCs unavailable to clients',async()=>{
 await denied(()=>actor('anon',null,'SELECT * FROM public.fixture_result_view'));
 for(const role of ['anon','authenticated']){
  for(const table of ['sail_result_sessions','sail_result_access','sail_result_shares','sail_result_submissions','sail_result_access_audit'])await denied(()=>actor(role,ids.a,`SELECT * FROM public.${table}`));
  await denied(()=>actor(role,ids.a,call('sail_create_session',[session,ids.a])));
  await denied(()=>actor(role,ids.a,call('sail_read_result',['30000000-0000-4000-8000-000000000007',ids.a,null,null])));
 }
});
await test('DB06','role/email/id direct changes forbidden; existing own display name updates survive',async()=>{
 await denied(()=>actor('authenticated',ids.a,"UPDATE public.users SET role='admin' WHERE id="+lit(ids.a)));
 await denied(()=>actor('authenticated',ids.a,"UPDATE public.users SET email='other@fixture.invalid' WHERE id="+lit(ids.a)));
 await denied(()=>actor('authenticated',ids.a,"INSERT INTO public.users(id,role) VALUES('10000000-0000-4000-8000-000000000099','admin')"));
 await actor('authenticated',ids.a,"UPDATE public.users SET name='변경된 합성 이름' WHERE id="+lit(ids.a));
 assert.equal((await query('SELECT role FROM public.users WHERE id='+lit(ids.a)))[0].role,'user');
});
await test('DB07','session hash binding validates actor and rejects expired or revoked capabilities',async()=>{
 await value('sail_create_session',[session,ids.a]);await value('sail_create_session',[anonymous,null]);await value('sail_create_session',[sessionB,ids.b]);
 assert.equal(await value('sail_session_valid',[session,ids.a]),true);assert.equal(await value('sail_session_valid',[session,ids.b]),false);assert.equal(await value('sail_session_valid',[anonymous,null]),true);assert.equal(await value('sail_session_valid',[anonymous,ids.a]),false);
});
let ownerId,anonId;
await test('DB08','atomic complete diagnosis creates one result; duplicate payload returns same UUID, changed payload conflicts',async()=>{
 ownerId=await value('sail_create_result',[session,'owner-1',ids.a,group,payload,false]);
 assert.equal(await value('sail_create_result',[session,'owner-1',ids.a,group,payload,false]),ownerId);
 await denied(()=>value('sail_create_result',[session,'owner-1',ids.a,group,{...payload,nickname:'변경'},false]));
 anonId=await value('sail_create_result',[anonymous,'anonymous-1',null,group,payload,false]);
});
await test('DB09','incomplete/extra/forged inputs and cross-user session rejected before save',async()=>{
 await denied(()=>value('sail_create_result',[session,'bad',ids.a,group,{...payload,answers:{Q1:'a'}},false]));
 await denied(()=>value('sail_create_result',[session,'bad',ids.a,group,{...payload,user_id:ids.b},false]));
 await denied(()=>value('sail_create_result',[session,'bad',ids.b,group,payload,false]));
});
await test('DB10','owner and correct anon session read minimal DTO; cross-user/UUID-only/legacy NULL reads denied',async()=>{
 const owner=await value('sail_read_result',[ownerId,ids.a,null,null]);assert.equal(owner.access_kind,'owner');assert.equal(owner.can_manage,true);
 for(const field of ['answers','device','user_id','group_id','token_hash'])assert.equal(field in owner,false);
 assert.equal(await value('sail_read_result',[ownerId,ids.b,sessionB,null]),null);
 assert.equal(await value('sail_read_result',[anonId,null,null,null]),null);
 assert.equal((await value('sail_read_result',[anonId,null,anonymous,null])).access_kind,'session');
 assert.equal(await value('sail_read_result',['30000000-0000-4000-8000-000000000001',ids.admin,null,null]),null);
});
await test('DB11','coach requires explicit current consent; another coach/admin cannot bypass; revoke/expiry/group archive apply',async()=>{
 assert.equal(await value('sail_read_result',[ownerId,ids.coach,null,null]),null);
 await value('sail_set_group_consent',[ownerId,ids.a,session,true]);
 assert.equal((await value('sail_read_result',[ownerId,ids.coach,null,null])).access_kind,'coach');
 assert.equal((await actor('authenticated',ids.coach,'SELECT id FROM public.results')).length,1);
 assert.equal(await value('sail_read_result',[ownerId,ids.othercoach,null,null]),null);assert.equal(await value('sail_read_result',[ownerId,ids.admin,null,null]),null);
 await db.exec('UPDATE public.groups SET status=\'archived\' WHERE id='+lit(group));assert.equal(await value('sail_read_result',[ownerId,ids.coach,null,null]),null);await db.exec('UPDATE public.groups SET status=\'active\' WHERE id='+lit(group));
 await value('sail_set_group_consent',[ownerId,ids.a,session,false]);assert.equal(await value('sail_read_result',[ownerId,ids.coach,null,null]),null);
});
await test('DB12','separate expiring share permits minimal view, cannot manage, cannot target another result, revoked share fails',async()=>{
 await value('sail_create_share',[anonId,null,anonymous,share,3600]);
 const dto=await value('sail_read_result',[anonId,null,null,share]);assert.equal(dto.access_kind,'share');assert.equal(dto.can_manage,false);
 assert.equal(await value('sail_read_result',[ownerId,null,null,share]),null);
 await denied(()=>value('sail_create_share',[anonId,ids.b,sessionB,'e'.repeat(64),3600]));
 await value('sail_revoke_share',[anonId,null,anonymous,share]);assert.equal(await value('sail_read_result',[anonId,null,null,share]),null);
});
await test('DB13','session revocation denies anonymous result and its shares without deleting result',async()=>{
 await value('sail_create_share',[anonId,null,anonymous,'f'.repeat(64),3600]);
 await value('sail_revoke_session',[anonymous,null]);assert.equal(await value('sail_read_result',[anonId,null,anonymous,null]),null);assert.equal(await value('sail_read_result',[anonId,null,null,'f'.repeat(64)]),null);
 assert.equal((await query('SELECT count(*) AS n FROM public.results WHERE id='+lit(anonId)))[0].n,1);
});
await test('DB14','persistent rate limit allows exact budget and denies the next request',async()=>{
 assert.equal(await value('sail_rate_limit',['9'.repeat(64),'read',2,600]),true);assert.equal(await value('sail_rate_limit',['9'.repeat(64),'read',2,600]),true);assert.equal(await value('sail_rate_limit',['9'.repeat(64),'read',2,600]),false);
});
await test('DB15','expired session/share and expired group consent are denied',async()=>{
 await db.exec('UPDATE public.sail_result_sessions SET expires_at=created_at+interval \'1 microsecond\' WHERE token_hash='+lit(sessionB));assert.equal(await value('sail_session_valid',[sessionB,ids.b]),false);
 await value('sail_set_group_consent',[ownerId,ids.a,session,true]);await db.exec('UPDATE public.sail_result_access SET consent_expires_at=clock_timestamp()-interval \'1 second\' WHERE result_id='+lit(ownerId));assert.equal(await value('sail_read_result',[ownerId,ids.coach,null,null]),null);
});
await test('DB16','new unknown client-executable result definer triggers preflight refusal',async()=>{
 await db.exec('CREATE FUNCTION public.fixture_result_bypass() RETURNS bigint LANGUAGE sql SECURITY DEFINER AS $$ SELECT count(*) FROM public.results $$;');
 await assert.rejects(()=>db.exec(migration),/Review 1 existing/);await db.exec('ROLLBACK;DROP FUNCTION public.fixture_result_bypass();');
});
await test('DB17','Auth creation trigger still prepares a normal SAIL profile after direct trigger EXECUTE is revoked',async()=>{
 assert.equal((await query("SELECT has_function_privilege('authenticated','public.handle_new_user()','EXECUTE') AS ok"))[0].ok,false);
 await db.exec("INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES('10000000-0000-4000-8000-000000000099','new@fixture.invalid','{\"full_name\":\"신규 합성 회원\"}')");
 assert.equal((await query("SELECT role FROM public.users WHERE id='10000000-0000-4000-8000-000000000099'"))[0].role,'user');
});
await test('DB18','service raw old API writes/reads and private-table access denied; safe RPC remains usable',async()=>{
 await denied(()=>actor('service_role',null,'SELECT id FROM public.results'));
 await denied(()=>actor('service_role',null,'TRUNCATE public.results'));
 await denied(()=>actor('service_role',null,'SELECT token_hash FROM public.sail_result_sessions'));
 await denied(()=>actor('service_role',null,"INSERT INTO public.results(nickname,answers) VALUES('old unsafe','{}')"));
 assert.equal((await value('sail_read_result',[ownerId,ids.a,null,null])).access_kind,'owner');
});
await test('DB19','replay also removes residual column-level grants on private tables and dependent views',async()=>{
 await db.exec('GRANT SELECT(token_hash) ON public.sail_result_sessions TO anon;GRANT SELECT(answers) ON public.fixture_result_view TO authenticated;');
 await db.exec(migration);
 await denied(()=>actor('anon',null,'SELECT token_hash FROM public.sail_result_sessions'));
 await denied(()=>actor('authenticated',ids.a,'SELECT answers FROM public.fixture_result_view'));
});
await test('DB20','raw phone/email lookup RPCs denied to anon/authenticated and callable only by the server role',async()=>{
 for(const role of ['anon','authenticated'])for(const fn of ['phone_exists','email_by_phone'])await denied(()=>actor(role,ids.a,call(fn,['00000000000'])));
 assert.equal((await actor('service_role',null,call('phone_exists',['00000000000'])))[0].value,false);
});
await test('DB21','reviewed canonical name contract is required rather than silently creating or renaming operating columns',async()=>{
 await db.exec('ALTER TABLE public.users RENAME COLUMN name TO fixture_missing_name;');
 await assert.rejects(()=>db.exec(migration),/Reviewed SAIL id\/role\/nickname\/name contract/);
 await db.exec('ROLLBACK;ALTER TABLE public.users RENAME COLUMN fixture_missing_name TO name;');
});
await test('DB22','direct membership writes denied; service join is active/code/capacity checked and idempotent',async()=>{
 for(const role of ['anon','authenticated','service_role'])await denied(()=>actor(role,ids.b,"INSERT INTO public.group_members(group_id,user_id) VALUES("+lit(group)+','+lit(ids.b)+')'));
 await db.exec("INSERT INTO public.groups(id,coach_id,name,code,max_members) VALUES('20000000-0000-4000-8000-000000000003',"+lit(ids.coach)+",'정원1','MNPQR',1)");
 assert.equal((await value('sail_join_group',['MNPQR',ids.b])).name,'정원1');
 assert.equal((await value('sail_join_group',['MNPQR',ids.b])).name,'정원1');
 await denied(()=>value('sail_join_group',['MNPQR',ids.kcf]));
 await denied(()=>value('sail_join_group',['XXXXX',ids.kcf]));
 await db.exec("UPDATE public.groups SET status='archived' WHERE code='MNPQR'");
 await denied(()=>value('sail_join_group',['MNPQR',ids.b]));
});
await test('DB23','anonymous coach consent is capped by participation expiry and revoked with that session',async()=>{
 const h='1'.repeat(64),h2='2'.repeat(64);
 await value('sail_create_session',[h,null]);await value('sail_create_session',[h2,null]);
 const id=await value('sail_create_result',[h,'anonymous-consent',null,group,payload,true]);
 const expiry=(await query("SELECT a.consent_expires_at=s.expires_at AS capped FROM public.sail_result_access a JOIN public.sail_result_sessions s ON s.token_hash=a.session_hash WHERE a.result_id="+lit(id)))[0];assert.equal(expiry.capped,true);
 assert.equal((await value('sail_read_result',[id,ids.coach,null,null])).access_kind,'coach');
 await db.exec("UPDATE public.sail_result_sessions SET expires_at=created_at+interval '1 microsecond' WHERE token_hash="+lit(h));assert.equal(await value('sail_read_result',[id,ids.coach,null,null]),null);
 const id2=await value('sail_create_result',[h2,'anonymous-consent',null,group,payload,true]);await value('sail_revoke_session',[h2,null]);
 assert.equal(await value('sail_read_result',[id2,ids.coach,null,null]),null);
 assert.equal((await query('SELECT group_consent FROM public.sail_result_access WHERE result_id='+lit(id2)))[0].group_consent,false);
});
await test('DB24','share reported expiry never exceeds creator participation lifetime',async()=>{
 const h='3'.repeat(64);await value('sail_create_session',[h,null]);
 await db.exec("UPDATE public.sail_result_sessions SET expires_at=clock_timestamp()+interval '2 minutes' WHERE token_hash="+lit(h));
 const id=await value('sail_create_result',[h,'share-expiry',null,null,payload,false]);
 const sh=await value('sail_create_share',[id,null,h,'4'.repeat(64),3600]);
 assert.equal((await query('SELECT '+lit(sh.expires_at)+'::timestamptz<=expires_at AS capped FROM public.sail_result_sessions WHERE token_hash='+lit(h)))[0].capped,true);
});
await test('DB25','authorized read budget bounds persistent audit growth',async()=>{
 const key=(await query("SELECT encode(sha256(convert_to('sail-read:'||"+lit(ids.a)+",'UTF8')),'hex') AS k"))[0].k;
 await db.exec('DELETE FROM public.sail_security_rate_events WHERE key_hash='+lit(key)+" AND action='read'");
 const before=Number((await query("SELECT count(*) AS n FROM public.sail_result_access_audit WHERE actor_id="+lit(ids.a)+" AND action='read'"))[0].n);
 for(let i=0;i<120;i++)await value('sail_read_result',[ownerId,ids.a,null,null]);
 await denied(()=>value('sail_read_result',[ownerId,ids.a,null,null]));
 assert.equal(Number((await query("SELECT count(*) AS n FROM public.sail_result_access_audit WHERE actor_id="+lit(ids.a)+" AND action='read'"))[0].n)-before,120);
});
// Optional fixture export includes only initial baseline + candidate, never tests.
if(process.env.SAIL_SECURITY_FIXTURE_SQL)await writeFile(process.env.SAIL_SECURITY_FIXTURE_SQL,captured.join('\n'));
console.log(JSON.stringify({database:'PGlite actual SAIL historical SQL + security candidate; isolated synthetic Auth/rows',productionConnections:0,checks:results.length,results},null,2));
await db.close();
