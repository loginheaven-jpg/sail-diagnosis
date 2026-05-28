-- ===========================================================
-- 003 — RLS 무한 재귀 수정 (긴급 핫픽스)
-- 작성일: 2026-05-28
--
-- 문제:
--   002_groups.sql 의 RLS 정책에 순환 참조 존재:
--     groups SELECT → group_members 서브쿼리 → group_members SELECT →
--     groups 서브쿼리 → groups SELECT … (infinite recursion)
--   results.group_id IN (SELECT id FROM groups …) 도 동일 문제 유발.
--   증상: PostgREST가 "infinite recursion detected in policy" 42P17 반환,
--         모든 SELECT 실패. (service_role은 RLS 우회라 정상 동작)
--
-- 해결:
--   SECURITY DEFINER 함수로 권한 체크를 wrap. 함수 내부에서는 호출자의
--   RLS 정책이 다시 발동되지 않으므로 재귀가 끊어짐.
-- ===========================================================

-- ===========================================================
-- 1) 헬퍼 함수
-- ===========================================================

-- 사용자가 admin인가? (users 테이블 RLS 우회)
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_user_id AND role = 'admin'
  );
$$;

-- 사용자가 특정 그룹의 코치인가? (groups 테이블 RLS 우회)
CREATE OR REPLACE FUNCTION public.is_group_coach(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = p_group_id AND coach_id = p_user_id
  );
$$;

-- 사용자가 특정 그룹의 멤버인가? (group_members 테이블 RLS 우회)
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
$$;

-- 사용자의 role 반환 (없으면 'user')
CREATE OR REPLACE FUNCTION public.user_role(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.users WHERE id = p_user_id),
    'user'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_group_coach(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_group_member(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_role(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_coach(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_member(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_role(UUID) TO anon, authenticated;

-- ===========================================================
-- 2) 정책 재작성 — groups
-- ===========================================================
DROP POLICY IF EXISTS "groups_select" ON public.groups;
DROP POLICY IF EXISTS "groups_insert" ON public.groups;
DROP POLICY IF EXISTS "groups_update" ON public.groups;
DROP POLICY IF EXISTS "groups_delete" ON public.groups;

CREATE POLICY "groups_select" ON public.groups FOR SELECT USING (
  coach_id = auth.uid()
  OR public.is_group_member(id, auth.uid())
  OR public.is_admin(auth.uid())
);

CREATE POLICY "groups_insert" ON public.groups FOR INSERT WITH CHECK (
  coach_id = auth.uid()
  AND public.user_role(auth.uid()) IN ('coach', 'admin')
);

CREATE POLICY "groups_update" ON public.groups FOR UPDATE USING (
  coach_id = auth.uid()
  OR public.is_admin(auth.uid())
);

CREATE POLICY "groups_delete" ON public.groups FOR DELETE USING (
  coach_id = auth.uid()
  OR public.is_admin(auth.uid())
);

-- ===========================================================
-- 3) 정책 재작성 — group_members
-- ===========================================================
DROP POLICY IF EXISTS "members_select" ON public.group_members;
DROP POLICY IF EXISTS "members_insert" ON public.group_members;
DROP POLICY IF EXISTS "members_delete" ON public.group_members;

CREATE POLICY "members_select" ON public.group_members FOR SELECT USING (
  user_id = auth.uid()
  OR public.is_group_coach(group_id, auth.uid())
  OR public.is_admin(auth.uid())
);

CREATE POLICY "members_insert" ON public.group_members FOR INSERT WITH CHECK (
  user_id = auth.uid()
  OR public.is_group_coach(group_id, auth.uid())
  OR public.is_admin(auth.uid())
);

CREATE POLICY "members_delete" ON public.group_members FOR DELETE USING (
  user_id = auth.uid()
  OR public.is_group_coach(group_id, auth.uid())
  OR public.is_admin(auth.uid())
);

-- ===========================================================
-- 4) 정책 재작성 — coach_applications
-- ===========================================================
DROP POLICY IF EXISTS "coach_apps_select" ON public.coach_applications;
DROP POLICY IF EXISTS "coach_apps_insert" ON public.coach_applications;
DROP POLICY IF EXISTS "coach_apps_update" ON public.coach_applications;

CREATE POLICY "coach_apps_select" ON public.coach_applications FOR SELECT USING (
  user_id = auth.uid()
  OR public.is_admin(auth.uid())
);

CREATE POLICY "coach_apps_insert" ON public.coach_applications FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND public.user_role(auth.uid()) = 'user'
);

CREATE POLICY "coach_apps_update" ON public.coach_applications FOR UPDATE USING (
  public.is_admin(auth.uid())
);

-- ===========================================================
-- 5) 정책 재작성 — results (group 코치 가시성)
-- ===========================================================
DROP POLICY IF EXISTS "results_select" ON public.results;

CREATE POLICY "results_select" ON public.results FOR SELECT USING (
  user_id IS NULL                                          -- 익명: URL 공유 모델
  OR user_id = auth.uid()                                  -- 본인
  OR (group_id IS NOT NULL AND public.is_group_coach(group_id, auth.uid()))
  OR public.is_admin(auth.uid())
);
-- INSERT 정책(results_insert)은 그대로(누구나)

-- ===========================================================
-- 6) 정책 재작성 — users (admin 체크 재귀 방지)
--    기존 정책에서 EXISTS (SELECT 1 FROM users WHERE id=auth.uid() AND role='admin')
--    부분이 users 정책 평가 중 또 users를 참조해 재귀 위험.
-- ===========================================================
DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;

CREATE POLICY "users_select" ON public.users FOR SELECT USING (
  id = auth.uid()
  OR public.is_admin(auth.uid())
);

CREATE POLICY "users_update" ON public.users FOR UPDATE USING (
  id = auth.uid()
  OR public.is_admin(auth.uid())
);

-- ===========================================================
-- 7) PostgREST schema cache reload
-- ===========================================================
NOTIFY pgrst, 'reload schema';
