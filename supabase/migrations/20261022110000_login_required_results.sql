-- Phase 1 beta policy B: results belong to an authenticated SAIL member.
-- Apply immediately after 20261021150000_results_security.sql, before the new SAIL app.
-- Existing results, including historic anonymous/NULL rows, are neither claimed nor deleted.
BEGIN;

-- This session table was introduced only by the preceding unapplied security
-- migration. The two SQL files must be deployed in the same maintenance window.
DO $preflight$
BEGIN
 IF to_regclass('public.sail_result_sessions') IS NULL THEN
   RAISE EXCEPTION 'Apply 20261021150000_results_security.sql before this migration';
 END IF;
 IF EXISTS (SELECT 1 FROM public.sail_result_sessions WHERE user_id IS NULL) THEN
   RAISE EXCEPTION 'Review pre-existing anonymous security sessions before enabling login-only beta';
 END IF;
END;
$preflight$;

ALTER TABLE public.sail_result_sessions
  ALTER COLUMN user_id SET NOT NULL;

-- Prevent raw service-role callers from using member-less session/share
-- capabilities. Login identity is verified on the server through auth.getUser().
-- Public clients have no EXECUTE grant to this helper.
CREATE OR REPLACE FUNCTION public.sail_result_access_kind(
 p_result_id uuid, p_user_id uuid, p_session_hash text, p_share_hash text
)
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_result public.results; v_access public.sail_result_access;
BEGIN
 IF p_user_id IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO v_result FROM public.results WHERE id=p_result_id;
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF v_result.user_id=p_user_id THEN RETURN 'owner'; END IF;
 SELECT * INTO v_access FROM public.sail_result_access WHERE result_id=p_result_id;
 IF v_result.user_id IS NULL AND v_access.session_hash=p_session_hash
 AND public.sail_session_valid(p_session_hash,p_user_id) THEN RETURN 'session'; END IF;
 IF p_share_hash IS NOT NULL AND EXISTS(
   SELECT 1 FROM public.sail_result_shares sh
   JOIN public.sail_result_sessions ss ON ss.token_hash=sh.creator_session_hash
   WHERE sh.token_hash=p_share_hash AND sh.result_id=p_result_id AND sh.revoked_at IS NULL
   AND sh.expires_at>clock_timestamp() AND ss.revoked_at IS NULL
   AND ss.expires_at>clock_timestamp()
 ) THEN RETURN 'share'; END IF;
 IF v_access.group_consent AND v_access.group_id=v_result.group_id
 AND v_access.consent_revoked_at IS NULL AND v_access.consent_expires_at>clock_timestamp()
 AND (v_result.user_id IS NOT NULL OR public.sail_session_valid(v_access.session_hash,NULL))
 AND EXISTS(SELECT 1 FROM public.groups g JOIN public.users u ON u.id=p_user_id
   WHERE g.id=v_result.group_id AND g.coach_id=p_user_id AND u.role IN ('coach','admin')
   AND g.status='active' AND (g.expires_at IS NULL OR g.expires_at>clock_timestamp()))
 THEN RETURN 'coach'; END IF;
 RETURN NULL;
END;
$fn$;

NOTIFY pgrst,'reload schema';
COMMIT;
