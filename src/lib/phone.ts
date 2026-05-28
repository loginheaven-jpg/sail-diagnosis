/**
 * 전화번호 정규화·검증 유틸
 *
 * 정책:
 *   - DB에 저장하는 phone 컬럼: '+82-10-1234-5678' 같은 일관된 형식 없이,
 *     사용자가 입력한 숫자만 추출하여 '01012345678' 형태로 저장.
 *   - UI 표시는 '010-1234-5678'.
 *   - 한국 휴대폰 외 형식도 일단 허용 (8~15자리 숫자).
 */

/** 입력 → 숫자만 추출. 국가코드 +82는 010으로 변환. */
export function normalizePhone(input: string): string {
  if (!input) return '';
  let s = input.trim();
  // +82-10- → 010
  s = s.replace(/^\+?82[-\s]?/, '0');
  // 숫자만
  s = s.replace(/\D/g, '');
  return s;
}

/** 화면 표시용 — 한국 휴대폰이면 010-XXXX-XXXX, 그 외면 그대로 */
export function formatPhone(normalized: string): string {
  if (!normalized) return '';
  if (/^010\d{8}$/.test(normalized)) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 7)}-${normalized.slice(7)}`;
  }
  if (/^0[2-9]\d{7,9}$/.test(normalized)) {
    // 일반 전화: 02-XXX-XXXX 또는 0XX-XXX-XXXX 정도. 간단 처리
    return normalized;
  }
  return normalized;
}

/** 유효한 휴대폰 번호인지 (한국 010 + 일반 유선 + 국제) */
export function isValidPhone(normalized: string): boolean {
  if (!normalized) return false;
  return /^[0-9]{8,15}$/.test(normalized);
}
