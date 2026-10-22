/** Preserve an internal destination without accepting schemes, hosts or controls. */
export function safeInternalRedirect(value: unknown, fallback = '/'): string {
  const valid = (candidate: unknown): string | null => {
    if (typeof candidate !== 'string' || !candidate.startsWith('/') || candidate.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(candidate)) return null;
    try {
      const origin = 'https://sail-redirect.invalid';
      const target = new URL(candidate, origin);
      if (target.origin !== origin || target.pathname.startsWith('//')) return null;
      return target.pathname + target.search + target.hash;
    } catch { return null; }
  };
  return valid(value) ?? valid(fallback) ?? '/';
}

/** Redirects use the configured public origin, never a proxy's internal Next URL. */
export function authRedirectUrl(
  requestUrl: string,
  destination: unknown,
  configuredOrigin = process.env.SAIL_APP_ORIGIN,
): URL {
  const base = new URL(configuredOrigin ?? requestUrl);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password
    || (configuredOrigin !== undefined && configuredOrigin !== base.origin)) {
    throw new Error('Invalid application origin configuration.');
  }
  return new URL(safeInternalRedirect(destination), base.origin);
}
