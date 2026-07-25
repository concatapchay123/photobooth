const KIOSK_PATH = /^\/kiosk\/([a-z0-9][a-z0-9-]{0,62})\/?$/i;
const DASHBOARD_PATH = /^\/dashboard\/([a-z0-9][a-z0-9-]{0,62})\/?$/i;

const readAccessToken = () => {
  try {
    return new URLSearchParams(window.location.hash.replace(/^#/, '')).get('access') || '';
  } catch {
    return '';
  }
};

export const getHostedAccess = () => {
  if (typeof window === 'undefined') return null;

  const kioskMatch = KIOSK_PATH.exec(window.location.pathname);
  if (kioskMatch) return { role: 'kiosk', kioskId: kioskMatch[1], token: readAccessToken() };

  const dashboardMatch = DASHBOARD_PATH.exec(window.location.pathname);
  if (dashboardMatch) return { role: 'dashboard', kioskId: dashboardMatch[1], token: readAccessToken() };

  return null;
};

const isSameOriginApiRequest = (input) => {
  try {
    const target = input instanceof Request ? input.url : input instanceof URL ? input.href : input;
    const url = new URL(target, window.location.origin);
    return url.origin === window.location.origin && url.pathname.startsWith('/api/');
  } catch {
    return false;
  }
};

/**
 * A provisioned rental kiosk/dashboard carries its secret in the URL fragment.
 * Fragments are never sent to the server; this shim exchanges it for request headers
 * only when calling this host's API.
 */
export const installHostedAccess = () => {
  if (typeof window === 'undefined' || window.__photoboothHostedAccessInstalled) return;
  const access = getHostedAccess();
  if (!access?.token) return;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init = undefined) => {
    if (!isSameOriginApiRequest(input)) return nativeFetch(input, init);

    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    if (init?.headers) {
      new Headers(init.headers).forEach((value, name) => headers.set(name, value));
    }
    headers.set('X-Photobooth-Kiosk-Id', access.kioskId);
    headers.set('X-Photobooth-Access-Role', access.role);
    headers.set('X-Photobooth-Access-Token', access.token);

    if (input instanceof Request) {
      return nativeFetch(new Request(input, { ...init, headers }));
    }
    return nativeFetch(input, { ...init, headers });
  };
  window.__photoboothHostedAccessInstalled = true;
};
