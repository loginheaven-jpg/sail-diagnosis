-- ===========================================================
-- 004 — 사용자 프로필 확장: 전화번호 + 본명
-- 작성일: 2026-05-28
--
-- 사용자 인증 정책 변경 (전화번호+암호 기반):
--   - users.phone TEXT UNIQUE NOT NULL (장기적으로) — 일단 nullable로 추가
--     기존 행은 phone이 없으므로 NULL 허용, 새 가입자는 항상 채움
--   - users.full_name TEXT — 표시·식별용
--
--   가입 흐름:
--     1) /login 에서 전화번호 입력 → DB 조회
--        - 없으면 /signup 으로 redirect
--        - 있으면 암호 검증
--     2) /signup 에서 full_name + phone + email + password 입력 →
--        Supabase Auth (email+password) 가입 → 트리거가 public.users 생성 →
--        클라이언트가 phone, full_name 채움
--     3) OAuth 가입 후 phone 또는 full_name이 NULL이면 /onboarding 강제
-- ===========================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- phone은 NULL 허용하되, NULL이 아닐 때는 UNIQUE
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique
  ON public.users (phone)
  WHERE phone IS NOT NULL;

-- phone 형식 가벼운 검증 — 숫자/하이픈/+/공백만 허용, 8~20자
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_phone_format;
ALTER TABLE public.users
  ADD CONSTRAINT users_phone_format CHECK (
    phone IS NULL
    OR phone ~ '^[+0-9\-\s]{8,20}$'
  );

-- ===========================================================
-- handle_new_user 트리거 갱신 — full_name + phone 메타데이터 흡수
-- 슈퍼어드민 자동 부여 + email/phone 동기화 유지
-- ===========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, nickname, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone'),
    CASE WHEN NEW.email = 'loginheaven@gmail.com' THEN 'admin' ELSE 'user' END
  )
  ON CONFLICT (id) DO UPDATE
    SET role = CASE
        WHEN EXCLUDED.email = 'loginheaven@gmail.com' THEN 'admin'
        ELSE public.users.role
      END,
      full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
      phone     = COALESCE(public.users.phone, EXCLUDED.phone);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================================
-- 전화번호로 사용자 검색 — /login에서 phone-only lookup 사용
-- SECURITY DEFINER로 anon도 호출 가능하되, role/email 같은 민감정보는 노출 안 함
-- 결과: 존재하면 true, 없으면 false
-- ===========================================================
CREATE OR REPLACE FUNCTION public.phone_exists(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE phone = p_phone
  );
$$;

REVOKE ALL ON FUNCTION public.phone_exists(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phone_exists(TEXT) TO anon, authenticated;

-- ===========================================================
-- 전화번호 → email 조회 RPC — /login에서 phone+password로 들어왔을 때
-- supabase-js signInWithPassword가 email을 요구하므로,
-- 전화번호로 사용자의 email을 조회하여 그 email로 비번 검증.
-- 보안: email은 자체 식별자이지만 brute force 위험 있음 → rate limit는 Vercel 측에서.
-- ===========================================================
CREATE OR REPLACE FUNCTION public.email_by_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.users WHERE phone = p_phone LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.email_by_phone(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.email_by_phone(TEXT) TO anon, authenticated;

-- ===========================================================
-- 슈퍼어드민 프로필 즉시 채움 (기존 행이 있으면)
-- ===========================================================
UPDATE public.users
  SET full_name = 'Super Admin'
  WHERE email = 'loginheaven@gmail.com'
    AND full_name IS NULL;

-- PostgREST schema reload
NOTIFY pgrst, 'reload schema';
