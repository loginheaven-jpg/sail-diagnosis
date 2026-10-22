/** Server-only result access. Browser identities/tokens never become caller RPC arguments. */
import 'server-only';
import { createHmac } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { ResultRow } from '@/types/database';
import {
  capabilityHash, minimalResultData, newCapability, ResultSecurityError, SESSION_TTL_SECONDS,
  validCapability, validUuid,
} from './result-security-policy';

export type ResultDto = Pick<ResultRow,
  'id' | 'nickname' | 'assertiveness_norm' | 'responsiveness_norm' |
  'type_s_pct' | 'type_a_pct' | 'type_i_pct' | 'type_l_pct' |
  'dominant_type' | 'secondary_type' | 'intensity' | 'consistency_score' | 'created_at'> & {
    access_kind: 'owner' | 'session' | 'share' | 'coach';
    can_manage: boolean;
    coach_consent: boolean;
    coach_consent_expires_at: string | null;
    can_share_with_coach: boolean;
  };

const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'X-Content-Type-Options': 'nosniff',
};
const verifiedContexts = new WeakSet<object>();

export function securityJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
}

export function securityFailure(error: unknown): NextResponse {
  const known = error instanceof ResultSecurityError;
  const response = securityJson({ error: known ? error.message : '지금 요청을 완료할 수 없습니다. 잠시 후 다시 확인해 주세요.' }, known ? error.status : 503);
  if (known && error.status === 429) response.headers.set('Retry-After', '60');
  return response;
}

/** Only explicit loopback test configuration relaxes Secure for a production local build. */
export function secureCapabilityCookies(): boolean {
  const origin = process.env.SAIL_APP_ORIGIN;
  if (process.env.SAIL_ALLOW_LOCAL_HTTP === 'true' && origin) {
    try {
      const url = new URL(origin);
      if (url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) return false;
    } catch { /* fail secure */ }
  }
  return process.env.NODE_ENV === 'production';
}

export function participationCookieName(): string {
  return secureCapabilityCookies() ? '__Host-sail-participation' : 'sail_participation_local';
}

export function shareCookieName(resultId: string): string {
  if (!validUuid(resultId)) throw new ResultSecurityError(400, '결과 주소를 확인해 주세요.');
  return (secureCapabilityCookies() ? '__Host-sail-share-' : 'sail_share_local-') + resultId.toLowerCase();
}

export async function putCapabilityCookie(name: string, value: string, seconds: number): Promise<void> {
  (await cookies()).set(name, value, {
    path: '/', httpOnly: true, secure: secureCapabilityCookies(), sameSite: 'lax',
    maxAge: Math.max(0, Math.floor(seconds)), priority: 'high',
  });
}

export async function actorUserId(): Promise<string | null> {
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error && error.name !== 'AuthSessionMissingError' && error.code !== 'session_not_found' && error.code !== 'refresh_token_not_found') {
    throw new ResultSecurityError(503, '로그인 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
  return data.user?.id ?? null;
}

interface RpcError { code?: string; message?: string }
export async function resultRpc<T>(name: string, args: Record<string, unknown>): Promise<T | null> {
  const service = createServiceRoleClient();
  const result = await service.rpc(name as never, args as never) as unknown as { data: T | null; error: RpcError | null };
  if (result.error) {
    switch (result.error.code) {
      case '54000': throw new ResultSecurityError(429, '요청이 많습니다. 잠시 후 다시 시도해 주세요.');
      case '28000': throw new ResultSecurityError(401, '참여 세션이 만료되었습니다. 진단 화면에서 다시 시작해 주세요.');
      case '42501': throw new ResultSecurityError(404, '결과 또는 접근 권한을 확인할 수 없습니다.');
      case '22023': throw new ResultSecurityError(400, '요청 내용이나 그룹 상태를 확인해 주세요.');
      case '23505': throw new ResultSecurityError(409, '동일한 요청을 확인하고 다시 시도해 주세요.');
      default: throw new ResultSecurityError(503, '결과 연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  }
  return result.data;
}

export async function capabilityContext(resultId?: string) {
  const userId = await actorUserId();
  const jar = await cookies();
  const participation = jar.get(participationCookieName())?.value;
  const share = resultId && validUuid(resultId) ? jar.get(shareCookieName(resultId))?.value : undefined;
  const context = Object.freeze({
    userId,
    sessionHash: validCapability(participation) ? capabilityHash(participation) : null,
    shareHash: validCapability(share) ? capabilityHash(share) : null,
  });
  verifiedContexts.add(context);
  return context;
}

/** Persistent, opaque rate keys; no raw address, UA, token or answer is retained. */
export async function throttleRequest(request: Request, action: string, userId: string | null, limit = 30, seconds = 60): Promise<void> {
  const pepper = process.env.SAIL_RATE_LIMIT_PEPPER || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!pepper) throw new ResultSecurityError(503, '결과 연결 설정을 확인해 주세요.');
  const categories: Record<string, string> = {
    session: 'session', diagnosis: 'submit', submit: 'submit', share: 'share',
    'share-exchange': 'read', read: 'read', 'share-revoke': 'revoke', revoke: 'revoke',
    'group-consent': 'consent', consent: 'consent', 'phone-login': 'auth', 'group-join': 'auth',
    'group-lookup': 'read', 'group-create': 'auth', 'group-update': 'auth', 'group-delete': 'auth', auth: 'auth', profile: 'profile',
  };
  const category = categories[action];
  if (!category) throw new ResultSecurityError(503, '요청 제한 설정을 확인해 주세요.');
  // Proxy headers are only an optional secondary key. An untrusted caller cannot
  // rotate the primary actor/global bucket by supplying a different header.
  const primary = createHmac('sha256', pepper).update(`sail:${action}:${userId ?? 'anonymous-global'}`).digest('hex');
  const allowed = await resultRpc<boolean>('sail_rate_limit', {
    p_key_hash: primary, p_action: category, p_limit: limit, p_window_seconds: seconds,
  });
  if (!allowed) throw new ResultSecurityError(429, '요청이 많습니다. 잠시 후 다시 시도해 주세요.');
  if (process.env.SAIL_TRUST_PROXY_IP === 'true') {
    const address = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    if (address && address.length <= 128) {
      const key = createHmac('sha256', pepper).update(`sail-network:${action}:${address}`).digest('hex');
      if (!await resultRpc<boolean>('sail_rate_limit', { p_key_hash: key, p_action: category, p_limit: limit, p_window_seconds: seconds })) {
        throw new ResultSecurityError(429, '요청이 많습니다. 잠시 후 다시 시도해 주세요.');
      }
    }
  }
}

export async function ensureParticipation(request: Request): Promise<{ sessionHash: string; userId: string | null; expiresAt: string }> {
  const userId = await actorUserId();
  if (!userId) throw new ResultSecurityError(401, '로그인 후 진단을 이용해 주세요.');
  await throttleRequest(request, 'session', userId, 30, 60);
  const existing = (await cookies()).get(participationCookieName())?.value;
  if (validCapability(existing)) {
    const hash = capabilityHash(existing);
    if (await resultRpc<boolean>('sail_session_valid', { p_session_hash: hash, p_user_id: userId })) {
      const session = await resultRpc<{ expires_at: string }>('sail_create_session', { p_token_hash: hash, p_user_id: userId });
      if (!session?.expires_at) throw new ResultSecurityError(503, '참여 세션을 확인하지 못했습니다.');
      return { sessionHash: hash, userId, expiresAt: session.expires_at };
    }
    // A new Auth actor never inherits an anonymous result. Before rotating its
    // browser proof, revoke that anonymous session and the links it issued.
    if (userId) await resultRpc('sail_revoke_session', { p_session_hash: hash, p_user_id: null });
  }
  const secret = newCapability();
  const hash = capabilityHash(secret);
  const session = await resultRpc<{ expires_at: string }>('sail_create_session', { p_token_hash: hash, p_user_id: userId });
  if (!session?.expires_at) throw new ResultSecurityError(503, '참여 세션을 준비하지 못했습니다.');
  await putCapabilityCookie(participationCookieName(), secret, SESSION_TTL_SECONDS);
  return { sessionHash: hash, userId, expiresAt: session.expires_at };
}

export async function requireParticipation(): Promise<{ sessionHash: string; userId: string | null }> {
  const { sessionHash, userId } = await capabilityContext();
  if (!userId) throw new ResultSecurityError(401, '로그인 후 진단을 이용해 주세요.');
  if (!sessionHash || !await resultRpc<boolean>('sail_session_valid', { p_session_hash: sessionHash, p_user_id: userId })) {
    throw new ResultSecurityError(401, '참여 세션이 만료되었습니다. 진단 화면에서 다시 시작해 주세요.');
  }
  return { sessionHash, userId };
}

/** Restrict output even if a future database function accidentally adds a raw column. */
export function minimalResult(value: unknown): ResultDto | null {
  return minimalResultData(value) as ResultDto | null;
}

export async function getAuthorizedResult(id: string): Promise<ResultDto | null> {
  if (!validUuid(id)) return null;
  const context = await capabilityContext(id);
  if (!context.userId) throw new ResultSecurityError(401, '결과를 보려면 로그인해 주세요.');
  const data = await resultRpc<unknown>('sail_read_result', {
    p_result_id: id, p_user_id: context.userId,
    p_session_hash: context.sessionHash, p_share_hash: context.shareHash,
  });
  return minimalResult(data);
}

export async function listAuthorizedGroupResults(groupId: string): Promise<ResultDto[]> {
  if (!validUuid(groupId)) return [];
  const userId = await actorUserId();
  if (!userId) return [];
  const data = await resultRpc<unknown>('sail_list_group_results', { p_group_id: groupId, p_user_id: userId });
  if (!Array.isArray(data)) return [];
  return data.map(minimalResult).filter((row): row is ResultDto => row !== null);
}

export async function revokeParticipation(previous?: Awaited<ReturnType<typeof capabilityContext>>): Promise<void> {
  // Login handlers may capture the verified old actor before changing Auth.
  // Never accept a caller-constructed identity/hash object as that snapshot.
  if (previous && !verifiedContexts.has(previous)) throw new ResultSecurityError(400, '로그인 상태를 다시 확인해 주세요.');
  const context = previous ?? await capabilityContext();
  try {
    if (context.sessionHash) {
      const revoked = await resultRpc<boolean>('sail_revoke_session', { p_session_hash: context.sessionHash, p_user_id: context.userId });
      // Auth may have been established outside our login handler. The secret
      // can revoke an anonymous session, but can never claim/read it or name a
      // different authenticated owner. SQL still enforces exact NULL binding.
      if (!revoked && context.userId) await resultRpc('sail_revoke_session', { p_session_hash: context.sessionHash, p_user_id: null });
    }
  } finally {
    // A failed DB revocation must never carry the old browser proofs into a new
    // authenticated account. The failure is still reported for explicit retry.
    const jar = await cookies();
    for (const entry of jar.getAll()) {
      if (entry.name === participationCookieName() || entry.name.startsWith('__Host-sail-share-') || entry.name.startsWith('sail_share_local-')) {
        await putCapabilityCookie(entry.name, '', 0);
      }
    }
    // This contains no identity/proof. The client clears persisted draft answers
    // before passive save effects can replay them under the next Auth actor.
    jar.set('sail_clear_progress', '1', {
      path: '/', httpOnly: false, secure: secureCapabilityCookies(), sameSite: 'lax', maxAge: 300,
    });
  }
}
