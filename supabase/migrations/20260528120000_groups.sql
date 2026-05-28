-- ===========================================================
-- SAIL 그룹 시스템 (Phase 7)
-- 작성일: 2026-05-28
-- 참조: architecture.md ADR-18 ~ ADR-23
--
-- 변경 요약:
--   1. groups 테이블 신규 — 코치가 소유하는 그룹
--   2. group_members 조인 테이블 신규 — 멤버 ↔ 그룹 다대다
--   3. coach_applications 테이블 신규 — 코치 자기등록 신청
--   4. results.group_id 컬럼 추가 (FK to groups)
--   5. results.session_code 컬럼 DROP (group_id로 통합)
--   6. handle_new_user 트리거 보강 — 슈퍼어드민 이메일 매칭
--   7. 모든 새 테이블에 RLS 정책 적용
--   8. results RLS 정책 갱신 — 본인/그룹 코치/어드민/익명 영구URL 허용
-- ===========================================================

-- ===========================================================
-- 1. groups 테이블
-- ===========================================================
CREATE TABLE public.groups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  code         TEXT UNIQUE NOT NULL,
  max_members  INT  NOT NULL DEFAULT 100 CHECK (max_members > 0),
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 코드 형식: 5자리 영숫자 (혼동 글자 0/O/1/I/L 제외)
ALTER TABLE public.groups
  ADD CONSTRAINT groups_code_format CHECK (code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$');

CREATE INDEX idx_groups_coach    ON public.groups(coach_id);
CREATE INDEX idx_groups_status   ON public.groups(status) WHERE status = 'active';
CREATE UNIQUE INDEX idx_groups_code_unique ON public.groups(code);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER groups_touch_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===========================================================
-- 2. group_members 조인 테이블
-- ===========================================================
CREATE TABLE public.group_members (
  group_id  UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX idx_group_members_user ON public.group_members(user_id);

-- ===========================================================
-- 3. coach_applications: 코치 자기등록 신청
-- ===========================================================
CREATE TABLE public.coach_applications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  motivation  TEXT,                             -- 신청 사유 (선택)
  reviewed_by UUID REFERENCES public.users(id), -- 어드민
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 한 사용자가 동시에 여러 pending 신청을 못 하도록
CREATE UNIQUE INDEX idx_coach_apps_user_pending
  ON public.coach_applications(user_id)
  WHERE status = 'pending';

CREATE INDEX idx_coach_apps_status ON public.coach_applications(status);

-- ===========================================================
-- 4~5. results 변경: session_code DROP, group_id ADD
-- ===========================================================
ALTER TABLE public.results
  DROP COLUMN IF EXISTS session_code;

ALTER TABLE public.results
  ADD COLUMN group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL;

CREATE INDEX idx_results_group ON public.results(group_id);

-- ===========================================================
-- 6. handle_new_user 트리거 — 슈퍼어드민 자동 부여
-- ===========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, nickname, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    CASE WHEN NEW.email = 'loginheaven@gmail.com' THEN 'admin' ELSE 'user' END
  )
  ON CONFLICT (id) DO UPDATE
    SET role = CASE
      WHEN EXCLUDED.email = 'loginheaven@gmail.com' THEN 'admin'
      ELSE public.users.role
    END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================================
-- 7. RLS — groups
-- ===========================================================
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- SELECT: 그룹 코치 본인 + 그룹 멤버 + 어드민
CREATE POLICY "groups_select" ON public.groups FOR SELECT USING (
  coach_id = auth.uid()
  OR auth.uid() IN (SELECT user_id FROM public.group_members WHERE group_id = id)
  OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- INSERT: 본인을 coach_id로 지정하는 coach 또는 admin만
CREATE POLICY "groups_insert" ON public.groups FOR INSERT WITH CHECK (
  coach_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('coach', 'admin'))
);

-- UPDATE: 본인 코치 또는 어드민
CREATE POLICY "groups_update" ON public.groups FOR UPDATE USING (
  coach_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- DELETE: 본인 코치 또는 어드민
CREATE POLICY "groups_delete" ON public.groups FOR DELETE USING (
  coach_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- ===========================================================
-- 7b. RLS — group_members
-- ===========================================================
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_select" ON public.group_members FOR SELECT USING (
  user_id = auth.uid()                                                   -- 본인
  OR group_id IN (SELECT id FROM public.groups WHERE coach_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "members_insert" ON public.group_members FOR INSERT WITH CHECK (
  user_id = auth.uid()                                                   -- 본인 가입
  OR group_id IN (SELECT id FROM public.groups WHERE coach_id = auth.uid())  -- 코치가 추가
  OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "members_delete" ON public.group_members FOR DELETE USING (
  user_id = auth.uid()
  OR group_id IN (SELECT id FROM public.groups WHERE coach_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- ===========================================================
-- 7c. RLS — coach_applications
-- ===========================================================
ALTER TABLE public.coach_applications ENABLE ROW LEVEL SECURITY;

-- 본인 신청 + 어드민만 조회
CREATE POLICY "coach_apps_select" ON public.coach_applications FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- 신청은 본인만, role='user' 상태에서만 가능
CREATE POLICY "coach_apps_insert" ON public.coach_applications FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'user')
);

-- 승인/거부 업데이트는 어드민만
CREATE POLICY "coach_apps_update" ON public.coach_applications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- ===========================================================
-- 8. results RLS 갱신
--    기존 정책 제거 후 새 정책 적용
-- ===========================================================
DROP POLICY IF EXISTS "results_insert_all" ON public.results;
DROP POLICY IF EXISTS "results_select_all" ON public.results;

-- INSERT: 누구나 (비로그인 진단 허용)
CREATE POLICY "results_insert" ON public.results FOR INSERT WITH CHECK (true);

-- SELECT:
--   (1) 익명 결과(user_id IS NULL): 누구나 — 영구 URL 공유 모델 유지
--   (2) 본인 결과: 로그인 사용자
--   (3) 그룹 코치: 자기 그룹에 연결된 모든 결과
--   (4) 어드민: 전체
CREATE POLICY "results_select" ON public.results FOR SELECT USING (
  user_id IS NULL
  OR user_id = auth.uid()
  OR (group_id IS NOT NULL AND group_id IN (
    SELECT id FROM public.groups WHERE coach_id = auth.uid()
  ))
  OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- UPDATE/DELETE: 정책 없음 = 차단 (결과는 immutable)

-- ===========================================================
-- 9. users 권한 확장
--    어드민이 다른 사용자의 role을 변경할 수 있어야 함
-- ===========================================================
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;

-- SELECT: 본인 + 어드민(전체)
CREATE POLICY "users_select" ON public.users FOR SELECT USING (
  id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
);

-- UPDATE: 본인 (단 role/email은 제외하고 싶지만 RLS에서는 컬럼 레벨 제한 안 됨 — API에서 강제)
--         또는 어드민
CREATE POLICY "users_update" ON public.users FOR UPDATE USING (
  id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
);

-- ===========================================================
-- 10. 헬퍼 함수: 코드 → group_id 조회 (RLS 우회용 SECURITY DEFINER)
--     /api/diagnosis 에서 사용 — 비로그인 사용자도 코드 검증 가능해야 함
-- ===========================================================
CREATE OR REPLACE FUNCTION public.resolve_group_by_code(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_group_id UUID;
BEGIN
  SELECT id INTO v_group_id
  FROM public.groups
  WHERE code = UPPER(p_code)
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
  RETURN v_group_id;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_group_by_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_group_by_code(TEXT) TO anon, authenticated;
