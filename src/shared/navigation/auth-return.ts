const APP_ORIGIN = 'https://kurio.local';

export function isAuthPath(pathname: string) {
  return /^\/(?:login|register|cadastro)(?:\/|$)/.test(pathname);
}

/**
 * Accept only same-origin application paths and never allow an auth page to
 * become the destination of another auth page. This prevents recursive URLs
 * such as /login?returnTo=/login?returnTo=…
 */
export function safeAuthReturn(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/';

  try {
    const url = new URL(value, APP_ORIGIN);
    if (url.origin !== APP_ORIGIN || isAuthPath(url.pathname)) return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}
