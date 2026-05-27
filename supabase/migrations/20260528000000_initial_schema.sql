-- SAIL 진단 서비스 초기 스키마 (Phase 1)
-- 작성일: 2026-05-28
-- 참조: architecture.md § 5

-- ============================================
-- 1. users — auth.users 와 1:1 매핑되는 프로필 테이블
-- ============================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'coach', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. results — 진단 응답 + 채점 결과
-- ============================================
CREATE TABLE public.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  session_code TEXT,
  nickname TEXT,
  answers JSONB NOT NULL,
  assertiveness_raw NUMERIC NOT NULL,
  responsiveness_raw NUMERIC NOT NULL,
  assertiveness_norm NUMERIC NOT NULL,
  responsiveness_norm NUMERIC NOT NULL,
  type_s_pct NUMERIC NOT NULL,
  type_a_pct NUMERIC NOT NULL,
  type_i_pct NUMERIC NOT NULL,
  type_l_pct NUMERIC NOT NULL,
  dominant_type CHAR(1) NOT NULL CHECK (dominant_type IN ('S','A','I','L')),
  secondary_type CHAR(1) CHECK (secondary_type IN ('S','A','I','L')),
  intensity NUMERIC NOT NULL,
  consistency_score NUMERIC,
  device TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. RLS — Row Level Security
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (id = auth.uid());

ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
-- 누구나 결과 생성 가능 (비로그인 진단 허용)
CREATE POLICY "results_insert_all" ON public.results
  FOR INSERT WITH CHECK (true);
-- 누구나 결과 조회 가능 (URL 공유 모델)
CREATE POLICY "results_select_all" ON public.results
  FOR SELECT USING (true);
-- UPDATE/DELETE 정책 없음 = 차단

-- ============================================
-- 4. 인덱스
-- ============================================
CREATE INDEX idx_results_user ON public.results(user_id);
CREATE INDEX idx_results_session ON public.results(session_code);
CREATE INDEX idx_results_dominant ON public.results(dominant_type);
CREATE INDEX idx_results_created ON public.results(created_at DESC);

-- ============================================
-- 5. 신규 가입 자동 users 생성 트리거
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, nickname)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
