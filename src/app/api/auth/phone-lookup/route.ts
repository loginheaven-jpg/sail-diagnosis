/** Phone/password login. The internal phone/email mapping never leaves the server. */
import { randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';

import { phoneLoginCredentials } from '@/lib/phone';
import { readLimitedJson, requireSameOrigin, ResultSecurityError } from '@/lib/result-security-policy';
import {
  capabilityContext, revokeParticipation, securityFailure, securityJson, throttleRequest,
} from '@/lib/results-security';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

const INVALID_CREDENTIALS = '전화번호 또는 암호를 확인해 주세요.';

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    await throttleRequest(request, 'phone-login', null, 10, 600);
    const credentials = phoneLoginCredentials(await readLimitedJson(request, 4096));
    if (!credentials) return securityJson({ error: INVALID_CREDENTIALS }, 401);

    const service = createServiceRoleClient();
    const { data: email, error: lookupError } = await service.rpc(
      'email_by_phone' as never, { p_phone: credentials.phone } as never,
    ) as unknown as { data: string | null; error: unknown };
    if (lookupError) throw new ResultSecurityError(503, '지금 로그인할 수 없습니다. 잠시 후 다시 시도해 주세요.');

    if (!email) {
      // An unknown identifier still makes an Auth password request. This client
      // never persists cookies and is discarded after the dummy attempt.
      await createServiceRoleClient().auth.signInWithPassword({
        email: `phone-missing-${randomUUID()}@example.invalid`, password: credentials.password,
      });
      return securityJson({ error: INVALID_CREDENTIALS }, 401);
    }

    const previous = await capabilityContext();
    const client = await createClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password: credentials.password });
    if (error || !data.user || !data.session) return securityJson({ error: INVALID_CREDENTIALS }, 401);

    try {
      // Preserve participation on a failed login; clear old proofs only after
      // authentication succeeded, using the verified pre-login actor snapshot.
      await revokeParticipation(previous);
    } catch (error) {
      await client.auth.signOut({ scope: 'local' });
      throw error;
    }
    return securityJson({ ok: true });
  } catch (error) {
    return securityFailure(error);
  }
}
