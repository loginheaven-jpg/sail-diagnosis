/** Beta policy B against actual SAIL historical migrations in isolated PGlite. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.SAIL_PGLITE_MODULE || '/workspace/.cloud-tools/sql-validation/node_modules/@electric-sql/pglite/dist/index.js');
const db = new PGlite();
const execute = async sql => db.exec(sql);
const query = async sql => (await db.query(sql)).rows;
const user = '10000000-0000-4000-8000-000000000001';
const session = 'a'.repeat(64);
const anonymous = 'b'.repeat(64);
const answer = Object.fromEntries(Array.from({length:30},(_,i)=>['Q'+(i+1),i<10?'a':i<20?'cardA':50]));
const payload = {answers:answer,nickname:'합성 로그인 회원',device:'fixture',assertiveness_raw:50,responsiveness_raw:50,assertiveness_norm:0,responsiveness_norm:0,type_s_pct:25,type_a_pct:25,type_i_pct:25,type_l_pct:25,dominant_type:'S',secondary_type:'A',intensity:0,consistency_score:100};
const literal=v=>v===null?'NULL':"'"+String(typeof v==='object'?JSON.stringify(v):v).replaceAll("'","''")+"'";
const call=(name,args)=>'SELECT public.'+name+'('+args.map(literal).join(',')+') AS value';
const rpc=async(name,args)=>(await query(call(name,args)))[0].value;
const denied=async run=>assert.rejects(run,error=>['23502','23514','28000','42501','22023'].includes(error.code));
await execute("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS; CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY,email text,phone text,raw_user_meta_data jsonb NOT NULL DEFAULT '{}'); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;");
for(const file of ['20260528000000_initial_schema.sql','20260528120000_groups.sql','20260528150000_fix_rls_recursion.sql','20260528170000_phone_profile.sql']){
 const sql=(await readFile('supabase/migrations/'+file,'utf8')).replaceAll('loginheaven@gmail.com','operator@fixture.invalid');
 await execute(sql);
}
await execute("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name text;");
await execute("GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,authenticated,service_role; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon,authenticated,service_role;");
await execute("INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES("+literal(user)+",'member@fixture.invalid','{\"full_name\":\"회원\"}');");
const policyA=await readFile('supabase/migrations/20261021150000_results_security.sql','utf8');
const policyB=await readFile('supabase/migrations/20261022110000_login_required_results.sql','utf8');
await execute(policyA);
await execute(policyB);
assert.equal((await query("SELECT is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='sail_result_sessions' AND column_name='user_id'"))[0].is_nullable,'NO');
await denied(()=>rpc('sail_create_session',[anonymous,null]));
assert.equal((await query('SELECT count(*) AS n FROM public.sail_result_sessions'))[0].n,0);
const created=await rpc('sail_create_session',[session,user]);
assert(created.expires_at);
const id=await rpc('sail_create_result',[session,'beta-login-only',user,null,payload,false]);
assert.match(id,/^[0-9a-f-]{36}$/);
await denied(()=>rpc('sail_create_result',[anonymous,'blocked',null,null,payload,false]));
assert.equal(await rpc('sail_read_result',[id,null,null,null]),null);
assert.equal((await rpc('sail_read_result',[id,user,null,null])).access_kind,'owner');
assert.equal(await rpc('sail_read_result',[id,null,null,'c'.repeat(64)]),null);
assert.equal((await query('SELECT count(*) AS n FROM public.results'))[0].n,1);
await execute(policyB); // idempotent with member sessions, no duplicate data
assert.equal((await query('SELECT count(*) AS n FROM public.results'))[0].n,1);
console.log('PASS: login-only DB overlay, member-owned storage/read, anon/session/share refusal, no loss, idempotent');
await db.close();
