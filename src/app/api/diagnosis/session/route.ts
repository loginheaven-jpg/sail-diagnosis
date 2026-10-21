import type { NextRequest } from 'next/server';
import { readLimitedJson, recordBody, requireSameOrigin } from '@/lib/result-security-policy';
import { ensureParticipation, revokeParticipation, securityFailure, securityJson } from '@/lib/results-security';

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    recordBody(await readLimitedJson(request, 256), []);
    const session = await ensureParticipation(request);
    return securityJson({ ready: true, expiresAt: session.expiresAt });
  } catch (error) { return securityFailure(error); }
}

export async function DELETE(request: NextRequest) {
  try {
    requireSameOrigin(request);
    recordBody(await readLimitedJson(request, 256), []);
    await revokeParticipation();
    return securityJson({ ok: true });
  } catch (error) { return securityFailure(error); }
}
