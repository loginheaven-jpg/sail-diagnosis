/**
 * General Group — 코드 없이 진단한 익명 사용자의 자동 귀속 그룹
 *
 * 정책 (사용자 결정):
 *   - 코드를 비워두고 진단한 결과는 슈퍼어드민의 "general" 그룹에 귀속된다.
 *   - 어드민만 그 결과를 열람할 수 있다 (RLS 자동 적용).
 *   - 그룹의 code는 시스템 예약값 '88888'. 사용자가 우연히 입력해도
 *     접근 결과는 동일하다 (어떻게든 어드민만 보는 그룹이므로).
 *
 * 구현:
 *   - 마이그레이션 없이 런타임에서 lazy create. 모듈 단위 캐시로 매 요청
 *     비용 회피. cold start 1회만 lookup/insert.
 *   - 슈퍼어드민이 아직 가입 안 한 상태라면 null을 반환 — 진단은 계속
 *     진행되며 group_id가 NULL로 저장됨 (anonymous fallback).
 */

import { createServiceRoleClient } from '@/lib/supabase/server';

const SUPERADMIN_EMAIL = 'loginheaven@gmail.com';
const GENERAL_GROUP_NAME = 'general';
const GENERAL_GROUP_CODE = '88888';

let cachedGeneralGroupId: string | null = null;
let lookupInFlight: Promise<string | null> | null = null;

export async function getOrCreateGeneralGroup(): Promise<string | null> {
  if (cachedGeneralGroupId) return cachedGeneralGroupId;
  if (lookupInFlight) return lookupInFlight;

  lookupInFlight = (async () => {
    try {
      const svc = createServiceRoleClient();

      // 1) 슈퍼어드민의 user_id 조회
      const { data: admin } = await svc
        .from('users')
        .select('id')
        .eq('email', SUPERADMIN_EMAIL)
        .maybeSingle<{ id: string }>();
      if (!admin) return null;

      // 2) general 그룹이 이미 있는지 확인
      const { data: existing } = await svc
        .from('groups')
        .select('id')
        .eq('coach_id', admin.id)
        .eq('name', GENERAL_GROUP_NAME)
        .maybeSingle<{ id: string }>();
      if (existing) {
        cachedGeneralGroupId = existing.id;
        return existing.id;
      }

      // 3) 없으면 생성
      const { data: created, error } = await svc
        .from('groups')
        .insert({
          coach_id: admin.id,
          name: GENERAL_GROUP_NAME,
          description:
            '코드 없이 진단한 익명 사용자가 자동으로 귀속되는 시스템 그룹. 관리자만 결과를 열람합니다.',
          code: GENERAL_GROUP_CODE,
          max_members: 1000000,
          status: 'active',
        } as never)
        .select('id')
        .single<{ id: string }>();

      if (error || !created) {
        // 코드 충돌 등으로 INSERT 실패 시 한 번 더 SELECT로 fallback
        const { data: retry } = await svc
          .from('groups')
          .select('id')
          .eq('coach_id', admin.id)
          .eq('name', GENERAL_GROUP_NAME)
          .maybeSingle<{ id: string }>();
        if (retry) {
          cachedGeneralGroupId = retry.id;
          return retry.id;
        }
        return null;
      }

      cachedGeneralGroupId = created.id;
      return created.id;
    } finally {
      lookupInFlight = null;
    }
  })();

  return lookupInFlight;
}
