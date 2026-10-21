/** Pure policy helpers. No network, cookies, secret values or diagnostic logging. */
import { createHash, randomBytes } from 'node:crypto';

import type { AnswerRecord } from '@/types/sail';

export const SESSION_TTL_SECONDS = 24 * 60 * 60;
export const SHARE_TTL_SECONDS = 60 * 60;
export const MAX_DIAGNOSIS_BYTES = 12 * 1024;

export class ResultSecurityError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ResultSecurityError';
    this.status = status;
  }
}

export function validUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function validCapability(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
}

export function newCapability(): string {
  return randomBytes(32).toString('base64url');
}

export function capabilityHash(value: string): string {
  if (!validCapability(value)) throw new ResultSecurityError(400, '접근 정보를 확인해 주세요.');
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function isSameOriginMutation(
  request: Pick<Request, 'url' | 'headers'>,
  configuredOrigin = process.env.SAIL_APP_ORIGIN,
): boolean {
  const origin = request.headers.get('origin');
  if (!origin || origin === 'null' || request.headers.get('sec-fetch-site') === 'cross-site') return false;
  try {
    const expected = new URL(configuredOrigin || request.url);
    const actual = new URL(origin);
    return ['http:', 'https:'].includes(expected.protocol)
      && actual.origin === expected.origin
      && origin === actual.origin;
  } catch {
    return false;
  }
}

export function requireSameOrigin(request: Pick<Request, 'url' | 'headers'>): void {
  if (!isSameOriginMutation(request)) throw new ResultSecurityError(403, '요청 출처를 확인해 주세요.');
}

export async function readLimitedJson(request: Request, maxBytes = MAX_DIAGNOSIS_BYTES): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new ResultSecurityError(415, 'JSON 요청이 필요합니다.');
  }
  const declared = request.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) {
    throw new ResultSecurityError(413, '요청 내용이 너무 큽니다.');
  }
  const reader = request.body?.getReader();
  if (!reader) throw new ResultSecurityError(400, '요청 내용을 확인해 주세요.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    size += next.value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new ResultSecurityError(413, '요청 내용이 너무 큽니다.');
    }
    chunks.push(next.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new ResultSecurityError(400, '요청 내용을 확인해 주세요.'); }
}

export function recordBody(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ResultSecurityError(400, '요청 내용을 확인해 주세요.');
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !keys.includes(key))) throw new ResultSecurityError(400, '허용되지 않은 요청 항목입니다.');
  return body;
}

/** Group lifecycle fields cannot bypass the consent/access boundary by coercion. */
export function groupMutationInput(value: unknown, create = false) {
  const body = recordBody(value, create
    ? ['name', 'description', 'maxMembers', 'expiresAt']
    : ['name', 'description', 'maxMembers', 'expiresAt', 'status', 'rotateCode']);
  if ((create || body.name !== undefined) && (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 50 || /[\u0000-\u001f\u007f]/.test(body.name))) throw new ResultSecurityError(400, '그룹 이름은 2~50자로 입력해 주세요.');
  if (body.description != null && (typeof body.description !== 'string' || body.description.trim().length > 500 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body.description))) throw new ResultSecurityError(400, '그룹 설명을 확인해 주세요.');
  if (body.maxMembers !== undefined && (typeof body.maxMembers !== 'number' || !Number.isInteger(body.maxMembers) || body.maxMembers < 1 || body.maxMembers > 1000)) throw new ResultSecurityError(400, '정원은 1~1000명의 정수로 입력해 주세요.');
  if (body.expiresAt != null && (typeof body.expiresAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(body.expiresAt) || !Number.isFinite(Date.parse(body.expiresAt)))) throw new ResultSecurityError(400, '그룹 만료 일시를 확인해 주세요.');
  if (body.status !== undefined && body.status !== 'active' && body.status !== 'archived') throw new ResultSecurityError(400, '그룹 상태를 확인해 주세요.');
  if (body.rotateCode !== undefined && typeof body.rotateCode !== 'boolean') throw new ResultSecurityError(400, '코드 변경 선택을 확인해 주세요.');
  return {
    ...(body.name !== undefined ? { name: (body.name as string).trim() } : {}),
    ...(body.description !== undefined ? { description: typeof body.description === 'string' ? body.description.trim() || null : null } : {}),
    ...(body.maxMembers !== undefined ? { max_members: body.maxMembers as number } : {}),
    ...(body.expiresAt !== undefined ? { expires_at: body.expiresAt as string | null } : {}),
    ...(body.status !== undefined ? { status: body.status as 'active' | 'archived' } : {}),
    rotateCode: body.rotateCode === true,
  };
}

export function completeAnswers(value: unknown): value is AnswerRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const answers = value as Record<string, unknown>;
  if (Object.keys(answers).length !== 30) return false;
  for (let index = 1; index <= 30; index++) {
    const answer = answers[`Q${index}`];
    if (index <= 10) { if (!['a', 'b', 'c', 'd'].includes(answer as string)) return false; }
    else if (index <= 20) { if (answer !== 'cardA' && answer !== 'cardB') return false; }
    else if (typeof answer !== 'number' || !Number.isFinite(answer) || answer < 0 || answer > 100) return false;
  }
  return true;
}

export interface DiagnosisInput {
  nickname: string | null;
  groupCode: string | null;
  answers: AnswerRecord;
  device: string | null;
  requestId: string | null;
  shareWithCoach: boolean;
}

export function diagnosisInput(value: unknown): DiagnosisInput {
  const body = recordBody(value, ['nickname', 'groupCode', 'answers', 'device', 'requestId', 'shareWithCoach']);
  if (!completeAnswers(body.answers)) throw new ResultSecurityError(400, '30개 문항의 응답을 모두 확인해 주세요.');
  if (body.nickname != null && (typeof body.nickname !== 'string' || body.nickname.trim().length > 20 || /[\u0000-\u001f\u007f]/.test(body.nickname))) throw new ResultSecurityError(400, '닉네임을 확인해 주세요.');
  if (body.groupCode != null && typeof body.groupCode !== 'string') throw new ResultSecurityError(400, '그룹 코드를 확인해 주세요.');
  const code = typeof body.groupCode === 'string' ? body.groupCode.trim().toUpperCase() : null;
  if (code && !/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/.test(code)) throw new ResultSecurityError(400, '그룹 코드를 확인해 주세요.');
  if (body.device != null && (typeof body.device !== 'string' || body.device.length > 200)) throw new ResultSecurityError(400, '기기 정보를 확인해 주세요.');
  if (body.requestId != null && !validUuid(body.requestId)) throw new ResultSecurityError(400, '요청 식별자를 확인해 주세요.');
  if (body.shareWithCoach != null && typeof body.shareWithCoach !== 'boolean') throw new ResultSecurityError(400, '공유 선택을 확인해 주세요.');
  if (body.shareWithCoach === true && !code) throw new ResultSecurityError(400, '그룹을 선택한 뒤 공유를 확인해 주세요.');
  return {
    nickname: typeof body.nickname === 'string' ? body.nickname.trim() || null : null,
    groupCode: code || null,
    answers: body.answers,
    device: typeof body.device === 'string' ? body.device : null,
    requestId: typeof body.requestId === 'string' ? body.requestId.toLowerCase() : null,
    shareWithCoach: body.shareWithCoach === true,
  };
}

/** Stable fallback keeps network retries idempotent even for a legacy client. */
export function diagnosisRequestKey(input: DiagnosisInput): string {
  const answers = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`Q${i + 1}`, input.answers[`Q${i + 1}`]]));
  return input.requestId ?? createHash('sha256').update(JSON.stringify({ answers, nickname: input.nickname, groupCode: input.groupCode, shareWithCoach: input.shareWithCoach })).digest('hex');
}

/** A database/API addition must not silently widen the public result projection. */
export function minimalResultData(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const kinds = ['owner', 'session', 'share', 'coach'];
  const types = ['S', 'A', 'I', 'L'];
  if (!validUuid(row.id) || !types.includes(String(row.dominant_type)) || !kinds.includes(String(row.access_kind))) return null;
  if (typeof row.created_at !== 'string' || !Number.isFinite(Date.parse(row.created_at))) return null;
  if (row.nickname !== null && (typeof row.nickname !== 'string' || row.nickname.length > 20)) return null;
  if (row.secondary_type !== null && !types.includes(String(row.secondary_type))) return null;
  const numeric = ['assertiveness_norm', 'responsiveness_norm', 'type_s_pct', 'type_a_pct', 'type_i_pct', 'type_l_pct', 'intensity'];
  if (numeric.some((key) => typeof row[key] !== 'number' || !Number.isFinite(row[key]))) return null;
  if (row.consistency_score !== null && (typeof row.consistency_score !== 'number' || !Number.isFinite(row.consistency_score))) return null;
  const keys = ['id', 'nickname', ...numeric, 'dominant_type', 'secondary_type', 'consistency_score', 'created_at', 'access_kind'];
  const result = Object.fromEntries(keys.map((key) => [key, row[key]]));
  result.can_manage = ['owner', 'session'].includes(String(row.access_kind)) && row.can_manage === true;
  result.coach_consent = row.coach_consent === true;
  const consentExpiry = row.coach_consent_expires_at;
  if (consentExpiry != null && (typeof consentExpiry !== 'string' || !Number.isFinite(Date.parse(consentExpiry)))) return null;
  result.coach_consent_expires_at = result.can_manage ? consentExpiry ?? null : null;
  result.can_share_with_coach = result.can_manage && row.can_share_with_coach === true;
  return result;
}
