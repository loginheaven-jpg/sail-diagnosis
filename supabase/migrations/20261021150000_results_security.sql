-- Phase 1 result security candidate. REVIEW / LOCAL TEST ONLY until final approval.
-- Does not rewrite, claim or delete existing results, users or Auth data.
BEGIN;

DO $preflight$
DECLARE v_count integer;
BEGIN
 IF to_regclass('public.results') IS NULL OR to_regclass('public.users') IS NULL OR to_regclass('public.groups') IS NULL THEN
  RAISE EXCEPTION 'SAIL result/user/group baseline is missing';
 END IF;
 IF (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name IN ('id','nickname','role','name'))<>4
 OR NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='id' AND data_type='uuid')
 OR EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name IN ('nickname','role','name') AND data_type NOT IN ('text','character varying'))
 THEN RAISE EXCEPTION 'Reviewed SAIL id/role/nickname/name contract is missing or incompatible'; END IF;
 -- Unknown executable definer APIs could retain a RLS bypass. Stop for review,
 -- rather than silently keeping an unseen route or breaking an unrelated API.
 SELECT count(*) INTO v_count FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE p.prosecdef AND n.nspname='public'
 AND p.proname NOT LIKE 'sail\_%' ESCAPE '\'
 AND p.prosrc ~* '(^|[^a-z_])results([^a-z_]|$)'
 AND (has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE'));
 IF v_count>0 THEN RAISE EXCEPTION 'Review % existing client-executable result definer functions before applying',v_count; END IF;
END;
$preflight$;

CREATE TABLE IF NOT EXISTS public.sail_result_sessions (
 token_hash text PRIMARY KEY CHECK(token_hash ~ '^[0-9a-f]{64}$'),
 user_id uuid REFERENCES public.users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz,
 CHECK(expires_at>created_at)
);
CREATE TABLE IF NOT EXISTS public.sail_result_access (
 result_id uuid PRIMARY KEY REFERENCES public.results(id) ON DELETE RESTRICT,
 session_hash text NOT NULL REFERENCES public.sail_result_sessions(token_hash) ON DELETE RESTRICT,
 -- Historical consent subject survives group deletion; authorization still
 -- requires the current result group and a live group. Never reassign it.
 group_id uuid,
 group_consent boolean NOT NULL DEFAULT false,
 consented_at timestamptz,
 consent_expires_at timestamptz,
 consent_revoked_at timestamptz,
 CHECK(NOT group_consent OR (group_id IS NOT NULL AND consented_at IS NOT NULL AND consent_expires_at IS NOT NULL))
);
ALTER TABLE public.sail_result_access DROP CONSTRAINT IF EXISTS sail_result_access_group_id_fkey;
CREATE TABLE IF NOT EXISTS public.sail_result_shares (
 token_hash text PRIMARY KEY CHECK(token_hash ~ '^[0-9a-f]{64}$'),
 result_id uuid NOT NULL REFERENCES public.results(id) ON DELETE RESTRICT,
 creator_session_hash text NOT NULL REFERENCES public.sail_result_sessions(token_hash) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz,
 CHECK(expires_at>created_at)
);
CREATE TABLE IF NOT EXISTS public.sail_result_submissions (
 session_hash text NOT NULL REFERENCES public.sail_result_sessions(token_hash) ON DELETE RESTRICT,
 request_key text NOT NULL CHECK(length(request_key) BETWEEN 1 AND 128),
 request_fingerprint text NOT NULL CHECK(request_fingerprint ~ '^[0-9a-f]{64}$'),
 result_id uuid NOT NULL REFERENCES public.results(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(session_hash,request_key)
);
CREATE TABLE IF NOT EXISTS public.sail_security_rate_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 key_hash text NOT NULL CHECK(key_hash ~ '^[0-9a-f]{64}$'),
 action text NOT NULL CHECK(action IN ('session','submit','share','read','revoke','consent','auth','profile')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.sail_security_rate_events DROP CONSTRAINT IF EXISTS sail_security_rate_events_action_check;
ALTER TABLE public.sail_security_rate_events ADD CONSTRAINT sail_security_rate_events_action_check CHECK(action IN ('session','submit','share','read','revoke','consent','auth','profile'));
CREATE INDEX IF NOT EXISTS sail_rate_lookup ON public.sail_security_rate_events(key_hash,action,created_at);
CREATE TABLE IF NOT EXISTS public.sail_result_access_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 result_id uuid REFERENCES public.results(id) ON DELETE RESTRICT,
 actor_id uuid REFERENCES public.users(id) ON DELETE RESTRICT,
 action text NOT NULL,
 access_kind text,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
-- Audit contains no token/hash, IP, nickname, answers or scores.

DO $private$
DECLARE v_table text; v_sequence text; v_column record;
BEGIN
 FOREACH v_table IN ARRAY ARRAY['sail_result_sessions','sail_result_access','sail_result_shares','sail_result_submissions','sail_security_rate_events','sail_result_access_audit'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',v_table);
  EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC,anon,authenticated,service_role',v_table);
  FOR v_column IN SELECT attname FROM pg_attribute WHERE attrelid=('public.'||v_table)::regclass AND attnum>0 AND NOT attisdropped LOOP
   EXECUTE format('REVOKE ALL PRIVILEGES(%I) ON TABLE public.%I FROM PUBLIC,anon,authenticated,service_role',v_column.attname,v_table);
  END LOOP;
 END LOOP;
 FOREACH v_sequence IN ARRAY ARRAY['sail_security_rate_events_id_seq','sail_result_access_audit_id_seq'] LOOP
  EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE public.%I FROM PUBLIC,anon,authenticated,service_role',v_sequence);
 END LOOP;
END;
$private$;

CREATE OR REPLACE FUNCTION public.sail_session_valid(p_session_hash text,p_user_id uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path='' AS $fn$
 SELECT EXISTS(SELECT 1 FROM public.sail_result_sessions s
 WHERE s.token_hash=p_session_hash AND s.user_id IS NOT DISTINCT FROM p_user_id
 AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp());
$fn$;

-- Result/share mutations lock the participation row before authorization.
-- Revocation updates the same row; a blocked save rechecks wall-clock expiry and
-- revocation after the lock, never the old statement_timestamp snapshot.
CREATE OR REPLACE FUNCTION public.sail_lock_session(p_session_hash text,p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_session public.sail_result_sessions;
BEGIN
 SELECT * INTO v_session FROM public.sail_result_sessions WHERE token_hash=p_session_hash FOR UPDATE;
 RETURN FOUND AND v_session.user_id IS NOT DISTINCT FROM p_user_id AND v_session.revoked_at IS NULL AND v_session.expires_at>clock_timestamp();
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sail_rate_limit(p_key_hash text,p_action text,p_limit integer DEFAULT 20,p_window_seconds integer DEFAULT 600)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_now timestamptz:=clock_timestamp(); v_count bigint;
BEGIN
 IF p_key_hash !~ '^[0-9a-f]{64}$' OR p_action NOT IN ('session','submit','share','read','revoke','consent','auth','profile')
 OR p_limit NOT BETWEEN 1 AND 1000 OR p_window_seconds NOT BETWEEN 1 AND 86400 THEN RAISE EXCEPTION 'invalid rate parameters' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('sail-rate:'||p_key_hash||':'||p_action,0));
 v_now:=clock_timestamp();
 SELECT count(*) INTO v_count FROM public.sail_security_rate_events
 WHERE key_hash=p_key_hash AND action=p_action AND created_at>v_now-make_interval(secs=>p_window_seconds);
 IF v_count>=p_limit THEN RETURN false; END IF;
 INSERT INTO public.sail_security_rate_events(key_hash,action,created_at) VALUES(p_key_hash,p_action,v_now);
 -- Remove only expired non-content throttle events, never result or consent evidence.
 DELETE FROM public.sail_security_rate_events WHERE created_at<v_now-interval '2 days';
 RETURN true;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sail_create_session(p_token_hash text,p_user_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_row public.sail_result_sessions;
BEGIN
 IF p_user_id IS NULL THEN RAISE EXCEPTION 'login required for diagnosis' USING ERRCODE='28000'; END IF;
 IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}
 INSERT INTO public.sail_result_sessions(token_hash,user_id,expires_at)
 VALUES(p_token_hash,p_user_id,clock_timestamp()+interval '24 hours') ON CONFLICT DO NOTHING;
 SELECT * INTO v_row FROM public.sail_result_sessions WHERE token_hash=p_token_hash;
 IF NOT public.sail_session_valid(p_token_hash,p_user_id) THEN RAISE EXCEPTION 'invalid session' USING ERRCODE='28000'; END IF;
 RETURN jsonb_build_object('expires_at',v_row.expires_at);
END;
$fn$;

-- Internal authorization; every actor argument is accepted only from service-role
-- server RPCs. Public RLS uses auth.uid() via a separate no-actor helper below.
CREATE OR REPLACE FUNCTION public.sail_result_access_kind(p_result_id uuid,p_user_id uuid,p_session_hash text,p_share_hash text)
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_result public.results; v_access public.sail_result_access;
BEGIN
 IF p_user_id IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO v_result FROM public.results WHERE id=p_result_id;
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF p_user_id IS NOT NULL AND v_result.user_id=p_user_id THEN RETURN 'owner'; END IF;
 SELECT * INTO v_access FROM public.sail_result_access WHERE result_id=p_result_id;
 IF v_result.user_id IS NULL AND v_access.session_hash=p_session_hash
 AND public.sail_session_valid(p_session_hash,p_user_id) THEN RETURN 'session'; END IF;
 IF p_share_hash IS NOT NULL AND EXISTS(
  SELECT 1 FROM public.sail_result_shares sh JOIN public.sail_result_sessions ss ON ss.token_hash=sh.creator_session_hash
  WHERE sh.token_hash=p_share_hash AND sh.result_id=p_result_id AND sh.revoked_at IS NULL
  AND sh.expires_at>statement_timestamp() AND ss.revoked_at IS NULL AND ss.expires_at>statement_timestamp()
 ) THEN RETURN 'share'; END IF;
 IF p_user_id IS NOT NULL AND v_access.group_consent AND v_access.group_id=v_result.group_id
 AND v_access.consent_revoked_at IS NULL AND v_access.consent_expires_at>clock_timestamp()
 AND (v_result.user_id IS NOT NULL OR public.sail_session_valid(v_access.session_hash,NULL))
 AND EXISTS(SELECT 1 FROM public.groups g JOIN public.users u ON u.id=p_user_id
 WHERE g.id=v_result.group_id AND g.coach_id=p_user_id AND u.role IN ('coach','admin')
 AND g.status='active' AND (g.expires_at IS NULL OR g.expires_at>statement_timestamp())) THEN RETURN 'coach'; END IF;
 RETURN NULL;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sail_result_dto(p_result_id uuid,p_kind text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
 SELECT jsonb_build_object('id',r.id,'nickname',r.nickname,'assertiveness_norm',r.assertiveness_norm,
 'responsiveness_norm',r.responsiveness_norm,'type_s_pct',r.type_s_pct,'type_a_pct',r.type_a_pct,
 'type_i_pct',r.type_i_pct,'type_l_pct',r.type_l_pct,'dominant_type',r.dominant_type,
 'secondary_type',r.secondary_type,'intensity',r.intensity,'consistency_score',r.consistency_score,
 'created_at',r.created_at,'access_kind',p_kind,'can_manage',p_kind IN ('owner','session'),
 'coach_consent',coalesce((SELECT a.group_consent AND a.consent_revoked_at IS NULL AND a.consent_expires_at>clock_timestamp() AND (r.user_id IS NOT NULL OR public.sail_session_valid(a.session_hash,NULL)) FROM public.sail_result_access a WHERE a.result_id=r.id),false),
 'coach_consent_expires_at',CASE WHEN p_kind IN ('owner','session') THEN (SELECT a.consent_expires_at FROM public.sail_result_access a WHERE a.result_id=r.id) END,
 'can_share_with_coach',p_kind IN ('owner','session') AND EXISTS(SELECT 1 FROM public.sail_result_access a WHERE a.result_id=r.id) AND EXISTS(SELECT 1 FROM public.groups g WHERE g.id=r.group_id AND g.status='active' AND (g.expires_at IS NULL OR g.expires_at>statement_timestamp())))
 FROM public.results r WHERE r.id=p_result_id;
$fn$;

CREATE OR REPLACE FUNCTION public.sail_read_result(p_result_id uuid,p_user_id uuid DEFAULT NULL,p_session_hash text DEFAULT NULL,p_share_hash text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_kind text;
BEGIN
 v_kind:=public.sail_result_access_kind(p_result_id,p_user_id,p_session_hash,p_share_hash);
 IF v_kind IS NULL THEN RETURN NULL; END IF;
 IF NOT public.sail_rate_limit(encode(sha256(convert_to('sail-read:'||coalesce(p_user_id::text,p_session_hash,p_share_hash),'UTF8')),'hex'),'read',120,60) THEN RAISE EXCEPTION 'read rate exceeded' USING ERRCODE='54000'; END IF;
 INSERT INTO public.sail_result_access_audit(result_id,actor_id,action,access_kind) VALUES(p_result_id,p_user_id,'read',v_kind);
 RETURN public.sail_result_dto(p_result_id,v_kind);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sail_list_group_results(p_group_id uuid,p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_results jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.groups g JOIN public.users u ON u.id=p_user_id
 WHERE g.id=p_group_id AND g.coach_id=p_user_id AND u.role IN ('coach','admin')
 AND g.status='active' AND (g.expires_at IS NULL OR g.expires_at>clock_timestamp())) THEN RETURN '[]'::jsonb; END IF;
 IF NOT public.sail_rate_limit(encode(sha256(convert_to('sail-read:'||p_user_id::text,'UTF8')),'hex'),'read',120,60) THEN RAISE EXCEPTION 'read rate exceeded' USING ERRCODE='54000'; END IF;
 SELECT coalesce(jsonb_agg(public.sail_result_dto(r.id,'coach') ORDER BY r.created_at DESC),'[]'::jsonb)
 INTO v_results FROM (SELECT rr.id,rr.created_at FROM public.results rr WHERE rr.group_id=p_group_id
 AND EXISTS(SELECT 1 FROM public.sail_result_access a WHERE a.result_id=rr.id AND a.group_id=rr.group_id AND a.group_consent AND a.consent_revoked_at IS NULL AND a.consent_expires_at>clock_timestamp() AND (rr.user_id IS NOT NULL OR public.sail_session_valid(a.session_hash,NULL))) ORDER BY rr.created_at DESC LIMIT 500) r;
 INSERT INTO public.sail_result_access_audit(actor_id,action,access_kind) VALUES(p_user_id,'group_list','coach');
 RETURN v_results;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sail_join_group_id(p_group_id uuid,p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_group public.groups;
BEGIN
 IF p_user_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.users WHERE id=p_user_id) THEN RAISE EXCEPTION 'verified user required' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_group FROM public.groups WHERE id=p_group_id FOR UPDATE;
 IF NOT FOUND OR v_group.status<>'active' OR (v_group.expires_at IS NOT NULL AND v_group.expires_at<=clock_timestamp()) THEN RAISE EXCEPTION 'inactive group' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.group_members WHERE group_id=p_group_id AND user_id=p_user_id) THEN
  IF (SELECT count(*) FROM public.group_members WHERE group_id=p_group_id)>=v_group.max_members THEN RAISE EXCEPTION 'group capacity reached' USING ERRCODE='22023'; END IF;
  INSERT INTO public.group_members(group_id,user_id) VALUES(p_group_id,p_user_id) ON CONFLICT DO NOTHING;
 END IF;
 RETURN jsonb_build_object('id',v_group.id,'name',v_group.name);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sail_join_group(p_code text,p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_id uuid;
BEGIN
 IF p_code IS NULL OR p_code !~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$' THEN RAISE EXCEPTION 'invalid group code' USING ERRCODE='22023'; END IF;
 SELECT id INTO v_id FROM public.groups WHERE code=p_code;
 IF v_id IS NULL THEN RAISE EXCEPTION 'group not found' USING ERRCODE='22023'; END IF;
 RETURN public.sail_join_group_id(v_id,p_user_id);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sail_create_result(p_session_hash text,p_request_key text,p_user_id uuid,p_group_id uuid,p_result jsonb,p_share_with_coach boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_id uuid; v_existing uuid; v_prior_fingerprint text; v_fingerprint text; v_key text; v_value jsonb;
BEGIN
 IF p_user_id IS NULL THEN RAISE EXCEPTION 'login required for diagnosis' USING ERRCODE='28000'; END IF;
 IF NOT public.sail_lock_session(p_session_hash,p_user_id) THEN RAISE EXCEPTION 'invalid session' USING ERRCODE='28000'; END IF;
 IF p_request_key IS NULL OR length(p_request_key) NOT BETWEEN 1 AND 128 OR p_result IS NULL OR jsonb_typeof(p_result)<>'object' THEN RAISE EXCEPTION 'invalid result request' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('sail-result:'||p_session_hash,0));
 v_fingerprint:=encode(sha256(convert_to(jsonb_build_object('result',p_result,'user_id',p_user_id,'group_id',p_group_id,'share',p_share_with_coach)::text,'UTF8')),'hex');
 SELECT result_id,request_fingerprint INTO v_existing,v_prior_fingerprint FROM public.sail_result_submissions WHERE session_hash=p_session_hash AND request_key=p_request_key;
 IF FOUND THEN
  IF v_prior_fingerprint IS DISTINCT FROM v_fingerprint THEN RAISE EXCEPTION 'idempotency key already used with different input' USING ERRCODE='23505'; END IF;
  RETURN v_existing;
 END IF;
 IF NOT public.sail_rate_limit(p_session_hash,'submit',6,3600) THEN RAISE EXCEPTION 'submission rate exceeded' USING ERRCODE='54000'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_result) k WHERE k NOT IN ('answers','nickname','device','assertiveness_raw','responsiveness_raw','assertiveness_norm','responsiveness_norm','type_s_pct','type_a_pct','type_i_pct','type_l_pct','dominant_type','secondary_type','intensity','consistency_score'))
 THEN RAISE EXCEPTION 'unexpected result property' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(p_result->'answers')<>'object' OR (SELECT count(*) FROM jsonb_object_keys(p_result->'answers'))<>30 THEN RAISE EXCEPTION 'exactly 30 answers required' USING ERRCODE='22023'; END IF;
 FOR v_key,v_value IN SELECT * FROM jsonb_each(p_result->'answers') LOOP
  IF v_key !~ '^Q([1-9]|[12][0-9]|30)$' THEN RAISE EXCEPTION 'invalid question' USING ERRCODE='22023'; END IF;
  IF substring(v_key FROM 2)::integer<=10 AND (jsonb_typeof(v_value)<>'string' OR v_value#>>'{}' NOT IN ('a','b','c','d'))
  OR substring(v_key FROM 2)::integer BETWEEN 11 AND 20 AND (jsonb_typeof(v_value)<>'string' OR v_value#>>'{}' NOT IN ('cardA','cardB'))
  OR substring(v_key FROM 2)::integer>=21 AND (jsonb_typeof(v_value)<>'number' OR (v_value#>>'{}')::numeric NOT BETWEEN 0 AND 100)
  THEN RAISE EXCEPTION 'invalid answer value' USING ERRCODE='22023'; END IF;
 END LOOP;
 IF length(coalesce(p_result->>'nickname',''))>20 OR length(coalesce(p_result->>'device',''))>200 OR pg_column_size(p_result)>32768 THEN RAISE EXCEPTION 'result payload too large' USING ERRCODE='22023'; END IF;
 IF p_group_id IS NOT NULL THEN
  PERFORM 1 FROM public.groups WHERE id=p_group_id AND status='active' AND (expires_at IS NULL OR expires_at>clock_timestamp()) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'inactive group' USING ERRCODE='22023'; END IF;
 END IF;
 IF p_share_with_coach AND p_group_id IS NULL THEN RAISE EXCEPTION 'group consent requires group' USING ERRCODE='22023'; END IF;
 IF NOT public.sail_session_valid(p_session_hash,p_user_id) THEN RAISE EXCEPTION 'invalid session' USING ERRCODE='28000'; END IF;
 INSERT INTO public.results(user_id,group_id,nickname,answers,assertiveness_raw,responsiveness_raw,assertiveness_norm,responsiveness_norm,type_s_pct,type_a_pct,type_i_pct,type_l_pct,dominant_type,secondary_type,intensity,consistency_score,device)
 VALUES(p_user_id,p_group_id,p_result->>'nickname',p_result->'answers',(p_result->>'assertiveness_raw')::numeric,(p_result->>'responsiveness_raw')::numeric,(p_result->>'assertiveness_norm')::numeric,(p_result->>'responsiveness_norm')::numeric,(p_result->>'type_s_pct')::numeric,(p_result->>'type_a_pct')::numeric,(p_result->>'type_i_pct')::numeric,(p_result->>'type_l_pct')::numeric,p_result->>'dominant_type',p_result->>'secondary_type',(p_result->>'intensity')::numeric,(p_result->>'consistency_score')::numeric,p_result->>'device') RETURNING id INTO v_id;
 INSERT INTO public.sail_result_access(result_id,session_hash,group_id,group_consent,consented_at,consent_expires_at)
 VALUES(v_id,p_session_hash,p_group_id,p_share_with_coach,CASE WHEN p_share_with_coach THEN clock_timestamp() END,CASE WHEN p_share_with_coach THEN CASE WHEN p_user_id IS NULL THEN (SELECT expires_at FROM public.sail_result_sessions WHERE token_hash=p_session_hash) ELSE clock_timestamp()+interval '30 days' END END);
 INSERT INTO public.sail_result_submissions(session_hash,request_key,request_fingerprint,result_id) VALUES(p_session_hash,p_request_key,v_fingerprint,v_id);
 IF p_user_id IS NOT NULL AND p_group_id IS NOT NULL THEN
  PERFORM public.sail_join_group_id(p_group_id,p_user_id);
 END IF;
 INSERT INTO public.sail_result_access_audit(result_id,actor_id,action,access_kind) VALUES(v_id,p_user_id,'create',CASE WHEN p_user_id IS NULL THEN 'session' ELSE 'owner' END);
 RETURN v_id;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sail_create_share(p_result_id uuid,p_user_id uuid,p_session_hash text,p_token_hash text,p_ttl_seconds integer DEFAULT 3600)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_kind text; v_expires timestamptz;
BEGIN
 IF p_user_id IS NULL THEN RAISE EXCEPTION 'login required for sharing' USING ERRCODE='28000'; END IF;
 IF NOT public.sail_lock_session(p_session_hash,p_user_id) THEN RAISE EXCEPTION 'invalid session' USING ERRCODE='28000'; END IF;
 IF p_user_id IS NULL THEN RAISE EXCEPTION 'login required for sharing' USING ERRCODE='28000'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('sail-share:'||p_result_id::text,0));
 v_kind:=public.sail_result_access_kind(p_result_id,p_user_id,p_session_hash,NULL);
 IF v_kind IS NULL OR v_kind NOT IN ('owner','session') OR NOT public.sail_session_valid(p_session_hash,p_user_id) THEN RAISE EXCEPTION 'share denied' USING ERRCODE='42501'; END IF;
 IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' OR p_ttl_seconds NOT BETWEEN 60 AND 86400 THEN RAISE EXCEPTION 'invalid share' USING ERRCODE='22023'; END IF;
 IF NOT public.sail_rate_limit(p_session_hash,'share',10,600) THEN RAISE EXCEPTION 'share rate exceeded' USING ERRCODE='54000'; END IF;
 IF NOT public.sail_session_valid(p_session_hash,p_user_id) THEN RAISE EXCEPTION 'invalid session' USING ERRCODE='28000'; END IF;
 SELECT least(clock_timestamp()+make_interval(secs=>p_ttl_seconds),expires_at) INTO v_expires FROM public.sail_result_sessions WHERE token_hash=p_session_hash;
 INSERT INTO public.sail_result_shares(token_hash,result_id,creator_session_hash,expires_at) VALUES(p_token_hash,p_result_id,p_session_hash,v_expires);
 INSERT INTO public.sail_result_access_audit(result_id,actor_id,action,access_kind) VALUES(p_result_id,p_user_id,'share_create',v_kind);
 RETURN jsonb_build_object('expires_at',v_expires);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sail_revoke_share(p_result_id uuid,p_user_id uuid,p_session_hash text,p_token_hash text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_kind text; v_count integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('sail-share:'||p_result_id::text,0));
 v_kind:=public.sail_result_access_kind(p_result_id,p_user_id,p_session_hash,NULL);
 IF v_kind IS NULL OR v_kind NOT IN ('owner','session') THEN RAISE EXCEPTION 'share revoke denied' USING ERRCODE='42501'; END IF;
 UPDATE public.sail_result_shares SET revoked_at=clock_timestamp() WHERE result_id=p_result_id AND revoked_at IS NULL AND (p_token_hash IS NULL OR token_hash=p_token_hash);
 GET DIAGNOSTICS v_count=ROW_COUNT;
 INSERT INTO public.sail_result_access_audit(result_id,actor_id,action,access_kind) VALUES(p_result_id,p_user_id,'share_revoke',v_kind);
 RETURN v_count;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sail_revoke_session(p_session_hash text,p_user_id uuid DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF NOT public.sail_session_valid(p_session_hash,p_user_id) THEN RETURN false; END IF;
 UPDATE public.sail_result_sessions SET revoked_at=clock_timestamp() WHERE token_hash=p_session_hash;
 UPDATE public.sail_result_shares SET revoked_at=clock_timestamp() WHERE creator_session_hash=p_session_hash AND revoked_at IS NULL;
 WITH revoked AS (UPDATE public.sail_result_access a SET group_consent=false,consent_revoked_at=clock_timestamp()
 WHERE a.session_hash=p_session_hash AND a.group_consent AND EXISTS(SELECT 1 FROM public.results r WHERE r.id=a.result_id AND r.user_id IS NULL) RETURNING a.result_id)
 INSERT INTO public.sail_result_access_audit(result_id,actor_id,action,access_kind) SELECT result_id,p_user_id,'group_consent_session_revoke','session' FROM revoked;
 INSERT INTO public.sail_result_access_audit(actor_id,action,access_kind) VALUES(p_user_id,'session_revoke','session');
 RETURN true;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sail_set_group_consent(p_result_id uuid,p_user_id uuid,p_session_hash text,p_consent boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_kind text; v_group uuid;
BEGIN
 IF p_user_id IS NULL THEN RAISE EXCEPTION 'login required for consent' USING ERRCODE='28000'; END IF;
 v_kind:=public.sail_result_access_kind(p_result_id,p_user_id,p_session_hash,NULL);
 IF v_kind IS NULL OR v_kind NOT IN ('owner','session') THEN RAISE EXCEPTION 'consent denied' USING ERRCODE='42501'; END IF;
 SELECT group_id INTO v_group FROM public.results WHERE id=p_result_id;
 IF p_consent AND NOT EXISTS(SELECT 1 FROM public.groups WHERE id=v_group AND status='active' AND (expires_at IS NULL OR expires_at>clock_timestamp())) THEN RAISE EXCEPTION 'active group required' USING ERRCODE='22023'; END IF;
 UPDATE public.sail_result_access SET group_consent=p_consent,
 consented_at=CASE WHEN p_consent THEN clock_timestamp() ELSE consented_at END,
 consent_expires_at=CASE WHEN p_consent THEN CASE WHEN p_user_id IS NULL THEN (SELECT expires_at FROM public.sail_result_sessions WHERE token_hash=p_session_hash) ELSE clock_timestamp()+interval '30 days' END ELSE consent_expires_at END,
 consent_revoked_at=CASE WHEN p_consent THEN NULL ELSE clock_timestamp() END WHERE result_id=p_result_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'legacy result has no verified participation binding' USING ERRCODE='42501'; END IF;
 INSERT INTO public.sail_result_access_audit(result_id,actor_id,action,access_kind) VALUES(p_result_id,p_user_id,'group_consent',v_kind);
 RETURN true;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sail_authenticated_can_read_result(p_result_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
 SELECT public.sail_result_access_kind(p_result_id,auth.uid(),NULL,NULL) IN ('owner','coach');
$fn$;

-- Remove every old permissive/restrictive result policy; stale policy names must
-- not keep an OR path open. No result rows are rewritten.
DO $policies$
DECLARE v_policy record; v_column record; v_view record; v_sequence text;
BEGIN
 FOR v_policy IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='results' LOOP
  EXECUTE format('DROP POLICY %I ON public.results',v_policy.policyname);
 END LOOP;
 REVOKE ALL PRIVILEGES ON TABLE public.results FROM PUBLIC,anon,authenticated,service_role;
 FOR v_column IN SELECT attname FROM pg_attribute WHERE attrelid='public.results'::regclass AND attnum>0 AND NOT attisdropped LOOP
  EXECUTE format('REVOKE ALL PRIVILEGES(%I) ON TABLE public.results FROM PUBLIC,anon,authenticated,service_role',v_column.attname);
 END LOOP;
 -- Views/materialized views may execute as their owner, bypassing the base RLS.
 FOR v_view IN WITH RECURSIVE deps(oid) AS (
  SELECT 'public.results'::regclass::oid UNION
  SELECT rw.ev_class FROM deps d JOIN pg_depend dep ON dep.refobjid=d.oid
  JOIN pg_rewrite rw ON rw.oid=dep.objid JOIN pg_class c ON c.oid=rw.ev_class
  WHERE c.relkind IN ('v','m')
 ) SELECT DISTINCT n.nspname,c.relname FROM deps d JOIN pg_class c ON c.oid=d.oid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('v','m') LOOP
  EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM PUBLIC,anon,authenticated,service_role',v_view.nspname,v_view.relname);
  FOR v_column IN SELECT attname FROM pg_attribute WHERE attrelid=format('%I.%I',v_view.nspname,v_view.relname)::regclass AND attnum>0 AND NOT attisdropped LOOP
   EXECUTE format('REVOKE ALL PRIVILEGES(%I) ON TABLE %I.%I FROM PUBLIC,anon,authenticated,service_role',v_column.attname,v_view.nspname,v_view.relname);
  END LOOP;
 END LOOP;
 FOR v_sequence IN SELECT pg_get_serial_sequence('public.results',attname) FROM pg_attribute WHERE attrelid='public.results'::regclass AND attnum>0 AND NOT attisdropped LOOP
  IF v_sequence IS NOT NULL THEN EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE %s FROM PUBLIC,anon,authenticated,service_role',v_sequence); END IF;
 END LOOP;
END;
$policies$;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
CREATE POLICY sail_results_minimum_read ON public.results FOR SELECT TO authenticated
USING(public.sail_authenticated_can_read_result(id));
GRANT SELECT(id,nickname,assertiveness_norm,responsiveness_norm,type_s_pct,type_a_pct,type_i_pct,type_l_pct,dominant_type,secondary_type,intensity,consistency_score,created_at) ON public.results TO authenticated;
-- service_role has BYPASSRLS but no raw result privileges: old unsafe API
-- INSERT/SELECT paths fail closed after SQL-first deployment. New APIs use only
-- the narrowly scoped SECURITY DEFINER RPCs below, owned by the migration owner.

DO $membership_acl$
DECLARE v_column record;
BEGIN
 REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.group_members FROM PUBLIC,anon,authenticated,service_role;
 FOR v_column IN SELECT attname FROM pg_attribute WHERE attrelid='public.group_members'::regclass AND attnum>0 AND NOT attisdropped LOOP
  EXECUTE format('REVOKE INSERT(%I),UPDATE(%I),REFERENCES(%I) ON public.group_members FROM PUBLIC,anon,authenticated,service_role',v_column.attname,v_column.attname,v_column.attname);
 END LOOP;
END;
$membership_acl$;

-- Preserve existing profile policy behavior but forbid raw role/email/id writes.
-- Actual reviewed production did not grant authenticated UPDATE(role); this is
-- explicit least privilege, not a claim that self-escalation was reproduced.
DO $profiles$
DECLARE v_column record;
BEGIN
 REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.users FROM PUBLIC,anon,authenticated;
 FOR v_column IN SELECT attname FROM pg_attribute WHERE attrelid='public.users'::regclass AND attnum>0 AND NOT attisdropped LOOP
  EXECUTE format('REVOKE INSERT(%I),UPDATE(%I),REFERENCES(%I) ON public.users FROM PUBLIC,anon,authenticated',v_column.attname,v_column.attname,v_column.attname);
  IF v_column.attname IN ('nickname','name','full_name','phone') THEN EXECUTE format('GRANT UPDATE(%I) ON public.users TO authenticated',v_column.attname); END IF;
 END LOOP;
END;
$profiles$;

DO $functions$
DECLARE v_function record;
BEGIN
 FOR v_function IN SELECT p.oid::regprocedure AS identity FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'sail\_%' ESCAPE '\' LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',v_function.identity);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',v_function.identity);
 END LOOP;
END;
$functions$;
GRANT EXECUTE ON FUNCTION public.sail_authenticated_can_read_result(uuid) TO authenticated;
-- Existing Auth trigger still fires; clients cannot attach its definer function
-- to a caller-controlled relation or invoke it as an exposed RPC.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC,anon,authenticated;
-- Public phone lookup leaks account identifiers independently of result RLS.
-- Existing phone/password UI now uses its authenticated server flow; no raw
-- email lookup or registration enumeration RPC remains client-executable.
DO $phone_rpc$
DECLARE v_function regprocedure;
BEGIN
 FOREACH v_function IN ARRAY ARRAY[to_regprocedure('public.phone_exists(text)'),to_regprocedure('public.email_by_phone(text)')] LOOP
  IF v_function IS NOT NULL THEN
   EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',v_function);
   EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',v_function);
  END IF;
 END LOOP;
END;
$phone_rpc$;

-- Group-code lookup is now server-mediated and persistently throttled.
-- An exposed legacy RPC would bypass those checks and does not need a browser grant.
DO $group_lookup_rpc$
BEGIN
 IF to_regprocedure('public.resolve_group_by_code(text)') IS NOT NULL THEN
  REVOKE ALL ON FUNCTION public.resolve_group_by_code(text) FROM PUBLIC,anon,authenticated;
  GRANT EXECUTE ON FUNCTION public.resolve_group_by_code(text) TO service_role;
 END IF;
END;
$group_lookup_rpc$;

-- Fail closed if unexpected inherited roles retain privileges that a direct
-- REVOKE cannot remove. Do not modify unrelated role memberships automatically.
DO $postflight$
DECLARE v_role text; v_priv text; v_table text;
BEGIN
 FOREACH v_role IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  FOREACH v_priv IN ARRAY ARRAY['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] LOOP
   IF has_table_privilege(v_role,'public.results',v_priv) THEN RAISE EXCEPTION 'Unexpected inherited % privilege on results for %',v_priv,v_role; END IF;
  END LOOP;
  IF v_role IN ('anon','service_role') AND has_any_column_privilege(v_role,'public.results','SELECT') THEN RAISE EXCEPTION 'Unexpected raw result read privilege for %',v_role; END IF;
  IF has_table_privilege(v_role,'public.group_members','INSERT') OR has_table_privilege(v_role,'public.group_members','UPDATE') OR has_table_privilege(v_role,'public.group_members','DELETE') OR has_table_privilege(v_role,'public.group_members','TRUNCATE') OR has_any_column_privilege(v_role,'public.group_members','INSERT') OR has_any_column_privilege(v_role,'public.group_members','UPDATE') THEN RAISE EXCEPTION 'Unexpected inherited group membership write for %',v_role; END IF;
  IF has_any_column_privilege(v_role,'public.results','INSERT') OR has_any_column_privilege(v_role,'public.results','UPDATE') OR has_any_column_privilege(v_role,'public.results','REFERENCES') THEN RAISE EXCEPTION 'Unexpected inherited result column write privilege for %',v_role; END IF;
  FOREACH v_table IN ARRAY ARRAY['sail_result_sessions','sail_result_access','sail_result_shares','sail_result_submissions','sail_security_rate_events','sail_result_access_audit'] LOOP
   FOREACH v_priv IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] LOOP
    IF has_table_privilege(v_role,'public.'||v_table,v_priv) THEN RAISE EXCEPTION 'Unexpected private capability privilege for %',v_role; END IF;
   END LOOP;
   IF has_any_column_privilege(v_role,'public.'||v_table,'SELECT') OR has_any_column_privilege(v_role,'public.'||v_table,'INSERT') OR has_any_column_privilege(v_role,'public.'||v_table,'UPDATE') OR has_any_column_privilege(v_role,'public.'||v_table,'REFERENCES') THEN RAISE EXCEPTION 'Unexpected private column privilege for %',v_role; END IF;
  END LOOP;
 END LOOP;
 IF has_any_column_privilege('authenticated','public.users','INSERT') THEN RAISE EXCEPTION 'Unexpected inherited profile insert privilege'; END IF;
 IF has_column_privilege('authenticated','public.users','id','UPDATE') OR has_column_privilege('authenticated','public.users','email','UPDATE') THEN RAISE EXCEPTION 'Unexpected inherited protected profile column update'; END IF;
 IF has_column_privilege('authenticated','public.users','role','UPDATE') OR has_column_privilege('authenticated','public.users','role','INSERT') THEN RAISE EXCEPTION 'Unexpected inherited profile role mutation privilege'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('anon','authenticated') AND (rolsuper OR rolbypassrls)) THEN RAISE EXCEPTION 'Browser role unexpectedly bypasses row security'; END IF;
END;
$postflight$;
NOTIFY pgrst,'reload schema';
COMMIT;
 THEN RAISE EXCEPTION 'invalid session hash' USING ERRCODE='22023'; END IF;
 INSERT INTO public.sail_result_sessions(token_hash,user_id,expires_at)
 VALUES(p_token_hash,p_user_id,clock_timestamp()+interval '24 hours') ON CONFLICT DO NOTHING;
 SELECT * INTO v_row FROM public.sail_result_sessions WHERE token_hash=p_token_hash;
 IF NOT public.sail_session_valid(p_token_hash,p_user_id) THEN RAISE EXCEPTION 'invalid session' USING ERRCODE='28000'; END IF;
 RETURN jsonb_build_object('expires_at',v_row.expires_at);
END;
$fn$;

-- Internal authorization; every actor argument is accepted only from service-role
-- server RPCs. Public RLS uses auth.uid() via a separate no-actor helper below.
CREATE OR REPLACE FUNCTION public.sail_result_access_kind(p_result_id uuid,p_user_id uuid,p_session_hash text,p_share_hash text)
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_result public.results; v_access public.sail_result_access;
BEGIN
 SELECT * INTO v_result FROM public.results WHERE id=p_result_id;
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF p_user_id IS NOT NULL AND v_result.user_id=p_user_id THEN RETURN 'owner'; END IF;
 SELECT * INTO v_access FROM public.sail_result_access WHERE result_id=p_result_id;
 IF v_result.user_id IS NULL AND v_access.session_hash=p_session_hash
 AND public.sail_session_valid(p_session_hash,p_user_id) THEN RETURN 'session'; END IF;
 IF p_share_hash IS NOT NULL AND EXISTS(
  SELECT 1 FROM public.sail_result_shares sh JOIN public.sail_result_sessions ss ON ss.token_hash=sh.creator_session_hash
  WHERE sh.token_hash=p_share_hash AND sh.result_id=p_result_id AND sh.revoked_at IS NULL
  AND sh.expires_at>statement_timestamp() AND ss.revoked_at IS NULL AND ss.expires_at>statement_timestamp()
 ) THEN RETURN 'share'; END IF;
 IF p_user_id IS NOT NULL AND v_access.group_consent AND v_access.group_id=v_result.group_id
 AND v_access.consent_revoked_at IS NULL AND v_access.consent_expires_at>clock_timestamp()
 AND (v_result.user_id IS NOT NULL OR public.sail_session_valid(v_access.session_hash,NULL))
 AND EXISTS(SELECT 1 FROM public.groups g JOIN public.users u ON u.id=p_user_id
 WHERE g.id=v_result.group_id AND g.coach_id=p_user_id AND u.role IN ('coach','admin')
 AND g.status='active' AND (g.expires_at IS NULL OR g.expires_at>statement_timestamp())) THEN RETURN 'coach'; END IF;
 RETURN NULL;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sail_result_dto(p_result_id uuid,p_kind text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
 SELECT jsonb_build_object('id',r.id,'nickname',r.nickname,'assertiveness_norm',r.assertiveness_norm,
 'responsiveness_norm',r.responsiveness_norm,'type_s_pct',r.type_s_pct,'type_a_pct',r.type_a_pct,
 'type_i_pct',r.type_i_pct,'type_l_pct',r.type_l_pct,'dominant_type',r.dominant_type,
 'secondary_type',r.secondary_type,'intensity',r.intensity,'consistency_score',r.consistency_score,
 'created_at',r.created_at,'access_kind',p_kind,'can_manage',p_kind IN ('owner','session'),
 'coach_consent',coalesce((SELECT a.group_consent AND a.consent_revoked_at IS NULL AND a.consent_expires_at>clock_timestamp() AND (r.user_id IS NOT NULL OR public.sail_session_valid(a.session_hash,NULL)) FROM public.sail_result_access a WHERE a.result_id=r.id),false),
 'coach_consent_expires_at',CASE WHEN p_kind IN ('owner','session') THEN (SELECT a.consent_expires_at FROM public.sail_result_access a WHERE a.result_id=r.id) END,
 'can_share_with_coach',p_kind IN ('owner','session') AND EXISTS(SELECT 1 FROM public.sail_result_access a WHERE a.result_id=r.id) AND EXISTS(SELECT 1 FROM public.groups g WHERE g.id=r.group_id AND g.status='active' AND (g.expires_at IS NULL OR g.expires_at>statement_timestamp())))
 FROM public.results r WHERE r.id=p_result_id;
$fn$;

CREATE OR REPLACE FUNCTION public.sail_read_result(p_result_id uuid,p_user_id uuid DEFAULT NULL,p_session_hash text DEFAULT NULL,p_share_hash text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_kind text;
BEGIN
 v_kind:=public.sail_result_access_kind(p_result_id,p_user_id,p_session_hash,p_share_hash);
 IF v_kind IS NULL THEN RETURN NULL; END IF;
 IF NOT public.sail_rate_limit(encode(sha256(convert_to('sail-read:'||coalesce(p_user_id::text,p_session_hash,p_share_hash),'UTF8')),'hex'),'read',120,60) THEN RAISE EXCEPTION 'read rate exceeded' USING ERRCODE='54000'; END IF;
 INSERT INTO public.sail_result_access_audit(result_id,actor_id,action,access_kind) VALUES(p_result_id,p_user_id,'read',v_kind);
 RETURN public.sail_result_dto(p_result_id,v_kind);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sail_list_group_results(p_group_id uuid,p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_results jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.groups g JOIN public.users u ON u.id=p_user_id
 WHERE g.id=p_group_id AND g.coach_id=p_user_id AND u.role IN ('coach','admin')
 AND g.status='active' AND (g.expires_at IS NULL OR g.expires_at>clock_timestamp())) THEN RETURN '[]'::jsonb; END IF;
 IF NOT public.sail_rate_limit(encode(sha256(convert_to('sail-read:'||p_user_id::text,'UTF8')),'hex'),'read',120,60) THEN RAISE EXCEPTION 'read rate exceeded' USING ERRCODE='54000'; END IF;
 SELECT coalesce(jsonb_agg(public.sail_result_dto(r.id,'coach') ORDER BY r.created_at DESC),'[]'::jsonb)
 INTO v_results FROM (SELECT rr.id,rr.created_at FROM public.results rr WHERE rr.group_id=p_group_id
 AND EXISTS(SELECT 1 FROM public.sail_result_access a WHERE a.result_id=rr.id AND a.group_id=rr.group_id AND a.group_consent AND a.consent_revoked_at IS NULL AND a.consent_expires_at>clock_timestamp() AND (rr.user_id IS NOT NULL OR public.sail_session_valid(a.session_hash,NULL))) ORDER BY rr.created_at DESC LIMIT 500) r;
 INSERT INTO public.sail_result_access_audit(actor_id,action,access_kind) VALUES(p_user_id,'group_list','coach');
 RETURN v_results;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sail_join_group_id(p_group_id uuid,p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_group public.groups;
BEGIN
 IF p_user_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.users WHERE id=p_user_id) THEN RAISE EXCEPTION 'verified user required' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_group FROM public.groups WHERE id=p_group_id FOR UPDATE;
 IF NOT FOUND OR v_group.status<>'active' OR (v_group.expires_at IS NOT NULL AND v_group.expires_at<=clock_timestamp()) THEN RAISE EXCEPTION 'inactive group' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.group_members WHERE group_id=p_group_id AND user_id=p_user_id) THEN
  IF (SELECT count(*) FROM public.group_members WHERE group_id=p_group_id)>=v_group.max_members THEN RAISE EXCEPTION 'group capacity reached' USING ERRCODE='22023'; END IF;
  INSERT INTO public.group_members(group_id,user_id) VALUES(p_group_id,p_user_id) ON CONFLICT DO NOTHING;
 END IF;
 RETURN jsonb_build_object('id',v_group.id,'name',v_group.name);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sail_join_group(p_code text,p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_id uuid;
BEGIN
 IF p_code IS NULL OR p_code !~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$' THEN RAISE EXCEPTION 'invalid group code' USING ERRCODE='22023'; END IF;
 SELECT id INTO v_id FROM public.groups WHERE code=p_code;
 IF v_id IS NULL THEN RAISE EXCEPTION 'group not found' USING ERRCODE='22023'; END IF;
 RETURN public.sail_join_group_id(v_id,p_user_id);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sail_create_result(p_session_hash text,p_request_key text,p_user_id uuid,p_group_id uuid,p_result jsonb,p_share_with_coach boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_id uuid; v_existing uuid; v_prior_fingerprint text; v_fingerprint text; v_key text; v_value jsonb;
BEGIN
 IF NOT public.sail_lock_session(p_session_hash,p_user_id) THEN RAISE EXCEPTION 'invalid session' USING ERRCODE='28000'; END IF;
 IF p_request_key IS NULL OR length(p_request_key) NOT BETWEEN 1 AND 128 OR p_result IS NULL OR jsonb_typeof(p_result)<>'object' THEN RAISE EXCEPTION 'invalid result request' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('sail-result:'||p_session_hash,0));
 v_fingerprint:=encode(sha256(convert_to(jsonb_build_object('result',p_result,'user_id',p_user_id,'group_id',p_group_id,'share',p_share_with_coach)::text,'UTF8')),'hex');
 SELECT result_id,request_fingerprint INTO v_existing,v_prior_fingerprint FROM public.sail_result_submissions WHERE session_hash=p_session_hash AND request_key=p_request_key;
 IF FOUND THEN
  IF v_prior_fingerprint IS DISTINCT FROM v_fingerprint THEN RAISE EXCEPTION 'idempotency key already used with different input' USING ERRCODE='23505'; END IF;
  RETURN v_existing;
 END IF;
 IF NOT public.sail_rate_limit(p_session_hash,'submit',6,3600) THEN RAISE EXCEPTION 'submission rate exceeded' USING ERRCODE='54000'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_result) k WHERE k NOT IN ('answers','nickname','device','assertiveness_raw','responsiveness_raw','assertiveness_norm','responsiveness_norm','type_s_pct','type_a_pct','type_i_pct','type_l_pct','dominant_type','secondary_type','intensity','consistency_score'))
 THEN RAISE EXCEPTION 'unexpected result property' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(p_result->'answers')<>'object' OR (SELECT count(*) FROM jsonb_object_keys(p_result->'answers'))<>30 THEN RAISE EXCEPTION 'exactly 30 answers required' USING ERRCODE='22023'; END IF;
 FOR v_key,v_value IN SELECT * FROM jsonb_each(p_result->'answers') LOOP
  IF v_key !~ '^Q([1-9]|[12][0-9]|30)$' THEN RAISE EXCEPTION 'invalid question' USING ERRCODE='22023'; END IF;
  IF substring(v_key FROM 2)::integer<=10 AND (jsonb_typeof(v_value)<>'string' OR v_value#>>'{}' NOT IN ('a','b','c','d'))
  OR substring(v_key FROM 2)::integer BETWEEN 11 AND 20 AND (jsonb_typeof(v_value)<>'string' OR v_value#>>'{}' NOT IN ('cardA','cardB'))
  OR substring(v_key FROM 2)::integer>=21 AND (jsonb_typeof(v_value)<>'number' OR (v_value#>>'{}')::numeric NOT BETWEEN 0 AND 100)
  THEN RAISE EXCEPTION 'invalid answer value' USING ERRCODE='22023'; END IF;
 END LOOP;
 IF length(coalesce(p_result->>'nickname',''))>20 OR length(coalesce(p_result->>'device',''))>200 OR pg_column_size(p_result)>32768 THEN RAISE EXCEPTION 'result payload too large' USING ERRCODE='22023'; END IF;
 IF p_group_id IS NOT NULL THEN
  PERFORM 1 FROM public.groups WHERE id=p_group_id AND status='active' AND (expires_at IS NULL OR expires_at>clock_timestamp()) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'inactive group' USING ERRCODE='22023'; END IF;
 END IF;
 IF p_share_with_coach AND p_group_id IS NULL THEN RAISE EXCEPTION 'group consent requires group' USING ERRCODE='22023'; END IF;
 IF NOT public.sail_session_valid(p_session_hash,p_user_id) THEN RAISE EXCEPTION 'invalid session' USING ERRCODE='28000'; END IF;
 INSERT INTO public.results(user_id,group_id,nickname,answers,assertiveness_raw,responsiveness_raw,assertiveness_norm,responsiveness_norm,type_s_pct,type_a_pct,type_i_pct,type_l_pct,dominant_type,secondary_type,intensity,consistency_score,device)
 VALUES(p_user_id,p_group_id,p_result->>'nickname',p_result->'answers',(p_result->>'assertiveness_raw')::numeric,(p_result->>'responsiveness_raw')::numeric,(p_result->>'assertiveness_norm')::numeric,(p_result->>'responsiveness_norm')::numeric,(p_result->>'type_s_pct')::numeric,(p_result->>'type_a_pct')::numeric,(p_result->>'type_i_pct')::numeric,(p_result->>'type_l_pct')::numeric,p_result->>'dominant_type',p_result->>'secondary_type',(p_result->>'intensity')::numeric,(p_result->>'consistency_score')::numeric,p_result->>'device') RETURNING id INTO v_id;
 INSERT INTO public.sail_result_access(result_id,session_hash,group_id,group_consent,consented_at,consent_expires_at)
 VALUES(v_id,p_session_hash,p_group_id,p_share_with_coach,CASE WHEN p_share_with_coach THEN clock_timestamp() END,CASE WHEN p_share_with_coach THEN CASE WHEN p_user_id IS NULL THEN (SELECT expires_at FROM public.sail_result_sessions WHERE token_hash=p_session_hash) ELSE clock_timestamp()+interval '30 days' END END);
 INSERT INTO public.sail_result_submissions(session_hash,request_key,request_fingerprint,result_id) VALUES(p_session_hash,p_request_key,v_fingerprint,v_id);
 IF p_user_id IS NOT NULL AND p_group_id IS NOT NULL THEN
  PERFORM public.sail_join_group_id(p_group_id,p_user_id);
 END IF;
 INSERT INTO public.sail_result_access_audit(result_id,actor_id,action,access_kind) VALUES(v_id,p_user_id,'create',CASE WHEN p_user_id IS NULL THEN 'session' ELSE 'owner' END);
 RETURN v_id;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sail_create_share(p_result_id uuid,p_user_id uuid,p_session_hash text,p_token_hash text,p_ttl_seconds integer DEFAULT 3600)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_kind text; v_expires timestamptz;
BEGIN
 IF NOT public.sail_lock_session(p_session_hash,p_user_id) THEN RAISE EXCEPTION 'invalid session' USING ERRCODE='28000'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('sail-share:'||p_result_id::text,0));
 v_kind:=public.sail_result_access_kind(p_result_id,p_user_id,p_session_hash,NULL);
 IF v_kind IS NULL OR v_kind NOT IN ('owner','session') OR NOT public.sail_session_valid(p_session_hash,p_user_id) THEN RAISE EXCEPTION 'share denied' USING ERRCODE='42501'; END IF;
 IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' OR p_ttl_seconds NOT BETWEEN 60 AND 86400 THEN RAISE EXCEPTION 'invalid share' USING ERRCODE='22023'; END IF;
 IF NOT public.sail_rate_limit(p_session_hash,'share',10,600) THEN RAISE EXCEPTION 'share rate exceeded' USING ERRCODE='54000'; END IF;
 IF NOT public.sail_session_valid(p_session_hash,p_user_id) THEN RAISE EXCEPTION 'invalid session' USING ERRCODE='28000'; END IF;
 SELECT least(clock_timestamp()+make_interval(secs=>p_ttl_seconds),expires_at) INTO v_expires FROM public.sail_result_sessions WHERE token_hash=p_session_hash;
 INSERT INTO public.sail_result_shares(token_hash,result_id,creator_session_hash,expires_at) VALUES(p_token_hash,p_result_id,p_session_hash,v_expires);
 INSERT INTO public.sail_result_access_audit(result_id,actor_id,action,access_kind) VALUES(p_result_id,p_user_id,'share_create',v_kind);
 RETURN jsonb_build_object('expires_at',v_expires);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sail_revoke_share(p_result_id uuid,p_user_id uuid,p_session_hash text,p_token_hash text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_kind text; v_count integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('sail-share:'||p_result_id::text,0));
 v_kind:=public.sail_result_access_kind(p_result_id,p_user_id,p_session_hash,NULL);
 IF v_kind IS NULL OR v_kind NOT IN ('owner','session') THEN RAISE EXCEPTION 'share revoke denied' USING ERRCODE='42501'; END IF;
 UPDATE public.sail_result_shares SET revoked_at=clock_timestamp() WHERE result_id=p_result_id AND revoked_at IS NULL AND (p_token_hash IS NULL OR token_hash=p_token_hash);
 GET DIAGNOSTICS v_count=ROW_COUNT;
 INSERT INTO public.sail_result_access_audit(result_id,actor_id,action,access_kind) VALUES(p_result_id,p_user_id,'share_revoke',v_kind);
 RETURN v_count;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sail_revoke_session(p_session_hash text,p_user_id uuid DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF NOT public.sail_session_valid(p_session_hash,p_user_id) THEN RETURN false; END IF;
 UPDATE public.sail_result_sessions SET revoked_at=clock_timestamp() WHERE token_hash=p_session_hash;
 UPDATE public.sail_result_shares SET revoked_at=clock_timestamp() WHERE creator_session_hash=p_session_hash AND revoked_at IS NULL;
 WITH revoked AS (UPDATE public.sail_result_access a SET group_consent=false,consent_revoked_at=clock_timestamp()
 WHERE a.session_hash=p_session_hash AND a.group_consent AND EXISTS(SELECT 1 FROM public.results r WHERE r.id=a.result_id AND r.user_id IS NULL) RETURNING a.result_id)
 INSERT INTO public.sail_result_access_audit(result_id,actor_id,action,access_kind) SELECT result_id,p_user_id,'group_consent_session_revoke','session' FROM revoked;
 INSERT INTO public.sail_result_access_audit(actor_id,action,access_kind) VALUES(p_user_id,'session_revoke','session');
 RETURN true;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sail_set_group_consent(p_result_id uuid,p_user_id uuid,p_session_hash text,p_consent boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_kind text; v_group uuid;
BEGIN
 IF p_user_id IS NULL AND NOT public.sail_lock_session(p_session_hash,NULL) THEN RAISE EXCEPTION 'invalid session' USING ERRCODE='28000'; END IF;
 v_kind:=public.sail_result_access_kind(p_result_id,p_user_id,p_session_hash,NULL);
 IF v_kind IS NULL OR v_kind NOT IN ('owner','session') THEN RAISE EXCEPTION 'consent denied' USING ERRCODE='42501'; END IF;
 SELECT group_id INTO v_group FROM public.results WHERE id=p_result_id;
 IF p_consent AND NOT EXISTS(SELECT 1 FROM public.groups WHERE id=v_group AND status='active' AND (expires_at IS NULL OR expires_at>clock_timestamp())) THEN RAISE EXCEPTION 'active group required' USING ERRCODE='22023'; END IF;
 UPDATE public.sail_result_access SET group_consent=p_consent,
 consented_at=CASE WHEN p_consent THEN clock_timestamp() ELSE consented_at END,
 consent_expires_at=CASE WHEN p_consent THEN CASE WHEN p_user_id IS NULL THEN (SELECT expires_at FROM public.sail_result_sessions WHERE token_hash=p_session_hash) ELSE clock_timestamp()+interval '30 days' END ELSE consent_expires_at END,
 consent_revoked_at=CASE WHEN p_consent THEN NULL ELSE clock_timestamp() END WHERE result_id=p_result_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'legacy result has no verified participation binding' USING ERRCODE='42501'; END IF;
 INSERT INTO public.sail_result_access_audit(result_id,actor_id,action,access_kind) VALUES(p_result_id,p_user_id,'group_consent',v_kind);
 RETURN true;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sail_authenticated_can_read_result(p_result_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
 SELECT public.sail_result_access_kind(p_result_id,auth.uid(),NULL,NULL) IN ('owner','coach');
$fn$;

-- Remove every old permissive/restrictive result policy; stale policy names must
-- not keep an OR path open. No result rows are rewritten.
DO $policies$
DECLARE v_policy record; v_column record; v_view record; v_sequence text;
BEGIN
 FOR v_policy IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='results' LOOP
  EXECUTE format('DROP POLICY %I ON public.results',v_policy.policyname);
 END LOOP;
 REVOKE ALL PRIVILEGES ON TABLE public.results FROM PUBLIC,anon,authenticated,service_role;
 FOR v_column IN SELECT attname FROM pg_attribute WHERE attrelid='public.results'::regclass AND attnum>0 AND NOT attisdropped LOOP
  EXECUTE format('REVOKE ALL PRIVILEGES(%I) ON TABLE public.results FROM PUBLIC,anon,authenticated,service_role',v_column.attname);
 END LOOP;
 -- Views/materialized views may execute as their owner, bypassing the base RLS.
 FOR v_view IN WITH RECURSIVE deps(oid) AS (
  SELECT 'public.results'::regclass::oid UNION
  SELECT rw.ev_class FROM deps d JOIN pg_depend dep ON dep.refobjid=d.oid
  JOIN pg_rewrite rw ON rw.oid=dep.objid JOIN pg_class c ON c.oid=rw.ev_class
  WHERE c.relkind IN ('v','m')
 ) SELECT DISTINCT n.nspname,c.relname FROM deps d JOIN pg_class c ON c.oid=d.oid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('v','m') LOOP
  EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM PUBLIC,anon,authenticated,service_role',v_view.nspname,v_view.relname);
  FOR v_column IN SELECT attname FROM pg_attribute WHERE attrelid=format('%I.%I',v_view.nspname,v_view.relname)::regclass AND attnum>0 AND NOT attisdropped LOOP
   EXECUTE format('REVOKE ALL PRIVILEGES(%I) ON TABLE %I.%I FROM PUBLIC,anon,authenticated,service_role',v_column.attname,v_view.nspname,v_view.relname);
  END LOOP;
 END LOOP;
 FOR v_sequence IN SELECT pg_get_serial_sequence('public.results',attname) FROM pg_attribute WHERE attrelid='public.results'::regclass AND attnum>0 AND NOT attisdropped LOOP
  IF v_sequence IS NOT NULL THEN EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE %s FROM PUBLIC,anon,authenticated,service_role',v_sequence); END IF;
 END LOOP;
END;
$policies$;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
CREATE POLICY sail_results_minimum_read ON public.results FOR SELECT TO authenticated
USING(public.sail_authenticated_can_read_result(id));
GRANT SELECT(id,nickname,assertiveness_norm,responsiveness_norm,type_s_pct,type_a_pct,type_i_pct,type_l_pct,dominant_type,secondary_type,intensity,consistency_score,created_at) ON public.results TO authenticated;
-- service_role has BYPASSRLS but no raw result privileges: old unsafe API
-- INSERT/SELECT paths fail closed after SQL-first deployment. New APIs use only
-- the narrowly scoped SECURITY DEFINER RPCs below, owned by the migration owner.

DO $membership_acl$
DECLARE v_column record;
BEGIN
 REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.group_members FROM PUBLIC,anon,authenticated,service_role;
 FOR v_column IN SELECT attname FROM pg_attribute WHERE attrelid='public.group_members'::regclass AND attnum>0 AND NOT attisdropped LOOP
  EXECUTE format('REVOKE INSERT(%I),UPDATE(%I),REFERENCES(%I) ON public.group_members FROM PUBLIC,anon,authenticated,service_role',v_column.attname,v_column.attname,v_column.attname);
 END LOOP;
END;
$membership_acl$;

-- Preserve existing profile policy behavior but forbid raw role/email/id writes.
-- Actual reviewed production did not grant authenticated UPDATE(role); this is
-- explicit least privilege, not a claim that self-escalation was reproduced.
DO $profiles$
DECLARE v_column record;
BEGIN
 REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.users FROM PUBLIC,anon,authenticated;
 FOR v_column IN SELECT attname FROM pg_attribute WHERE attrelid='public.users'::regclass AND attnum>0 AND NOT attisdropped LOOP
  EXECUTE format('REVOKE INSERT(%I),UPDATE(%I),REFERENCES(%I) ON public.users FROM PUBLIC,anon,authenticated',v_column.attname,v_column.attname,v_column.attname);
  IF v_column.attname IN ('nickname','name','full_name','phone') THEN EXECUTE format('GRANT UPDATE(%I) ON public.users TO authenticated',v_column.attname); END IF;
 END LOOP;
END;
$profiles$;

DO $functions$
DECLARE v_function record;
BEGIN
 FOR v_function IN SELECT p.oid::regprocedure AS identity FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'sail\_%' ESCAPE '\' LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',v_function.identity);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',v_function.identity);
 END LOOP;
END;
$functions$;
GRANT EXECUTE ON FUNCTION public.sail_authenticated_can_read_result(uuid) TO authenticated;
-- Existing Auth trigger still fires; clients cannot attach its definer function
-- to a caller-controlled relation or invoke it as an exposed RPC.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC,anon,authenticated;
-- Public phone lookup leaks account identifiers independently of result RLS.
-- Existing phone/password UI now uses its authenticated server flow; no raw
-- email lookup or registration enumeration RPC remains client-executable.
DO $phone_rpc$
DECLARE v_function regprocedure;
BEGIN
 FOREACH v_function IN ARRAY ARRAY[to_regprocedure('public.phone_exists(text)'),to_regprocedure('public.email_by_phone(text)')] LOOP
  IF v_function IS NOT NULL THEN
   EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',v_function);
   EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',v_function);
  END IF;
 END LOOP;
END;
$phone_rpc$;

-- Group-code lookup is now server-mediated and persistently throttled.
-- An exposed legacy RPC would bypass those checks and does not need a browser grant.
DO $group_lookup_rpc$
BEGIN
 IF to_regprocedure('public.resolve_group_by_code(text)') IS NOT NULL THEN
  REVOKE ALL ON FUNCTION public.resolve_group_by_code(text) FROM PUBLIC,anon,authenticated;
  GRANT EXECUTE ON FUNCTION public.resolve_group_by_code(text) TO service_role;
 END IF;
END;
$group_lookup_rpc$;

-- Fail closed if unexpected inherited roles retain privileges that a direct
-- REVOKE cannot remove. Do not modify unrelated role memberships automatically.
DO $postflight$
DECLARE v_role text; v_priv text; v_table text;
BEGIN
 FOREACH v_role IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  FOREACH v_priv IN ARRAY ARRAY['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] LOOP
   IF has_table_privilege(v_role,'public.results',v_priv) THEN RAISE EXCEPTION 'Unexpected inherited % privilege on results for %',v_priv,v_role; END IF;
  END LOOP;
  IF v_role IN ('anon','service_role') AND has_any_column_privilege(v_role,'public.results','SELECT') THEN RAISE EXCEPTION 'Unexpected raw result read privilege for %',v_role; END IF;
  IF has_table_privilege(v_role,'public.group_members','INSERT') OR has_table_privilege(v_role,'public.group_members','UPDATE') OR has_table_privilege(v_role,'public.group_members','DELETE') OR has_table_privilege(v_role,'public.group_members','TRUNCATE') OR has_any_column_privilege(v_role,'public.group_members','INSERT') OR has_any_column_privilege(v_role,'public.group_members','UPDATE') THEN RAISE EXCEPTION 'Unexpected inherited group membership write for %',v_role; END IF;
  IF has_any_column_privilege(v_role,'public.results','INSERT') OR has_any_column_privilege(v_role,'public.results','UPDATE') OR has_any_column_privilege(v_role,'public.results','REFERENCES') THEN RAISE EXCEPTION 'Unexpected inherited result column write privilege for %',v_role; END IF;
  FOREACH v_table IN ARRAY ARRAY['sail_result_sessions','sail_result_access','sail_result_shares','sail_result_submissions','sail_security_rate_events','sail_result_access_audit'] LOOP
   FOREACH v_priv IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] LOOP
    IF has_table_privilege(v_role,'public.'||v_table,v_priv) THEN RAISE EXCEPTION 'Unexpected private capability privilege for %',v_role; END IF;
   END LOOP;
   IF has_any_column_privilege(v_role,'public.'||v_table,'SELECT') OR has_any_column_privilege(v_role,'public.'||v_table,'INSERT') OR has_any_column_privilege(v_role,'public.'||v_table,'UPDATE') OR has_any_column_privilege(v_role,'public.'||v_table,'REFERENCES') THEN RAISE EXCEPTION 'Unexpected private column privilege for %',v_role; END IF;
  END LOOP;
 END LOOP;
 IF has_any_column_privilege('authenticated','public.users','INSERT') THEN RAISE EXCEPTION 'Unexpected inherited profile insert privilege'; END IF;
 IF has_column_privilege('authenticated','public.users','id','UPDATE') OR has_column_privilege('authenticated','public.users','email','UPDATE') THEN RAISE EXCEPTION 'Unexpected inherited protected profile column update'; END IF;
 IF has_column_privilege('authenticated','public.users','role','UPDATE') OR has_column_privilege('authenticated','public.users','role','INSERT') THEN RAISE EXCEPTION 'Unexpected inherited profile role mutation privilege'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('anon','authenticated') AND (rolsuper OR rolbypassrls)) THEN RAISE EXCEPTION 'Browser role unexpectedly bypasses row security'; END IF;
END;
$postflight$;
NOTIFY pgrst,'reload schema';
COMMIT;
