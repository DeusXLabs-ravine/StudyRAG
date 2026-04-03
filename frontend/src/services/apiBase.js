const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);
const PRODUCTION_API_BASE = 'https://api.studyrag.co/api';

function normalizeUrl(url) {
  return typeof url === 'string' ? url.trim().replace(/\/+$/, '') : '';
}

function isLoopbackUrl(url) {
  return /:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i.test(url);
}

export function isLocalHostname(hostname = '') {
  return LOCAL_HOSTNAMES.has(hostname);
}

export function resolveApiBaseUrl({
  envApiUrl,
  location = typeof window !== 'undefined' ? window.location : null,
} = {}) {
  const normalizedEnvApiUrl = normalizeUrl(envApiUrl);
  const hostname = location?.hostname || '';
  const isRemotePage = hostname && !isLocalHostname(hostname);

  if (normalizedEnvApiUrl && !(isRemotePage && isLoopbackUrl(normalizedEnvApiUrl))) {
    return normalizedEnvApiUrl;
  }

  if (hostname === 'studyrag.co' || hostname.endsWith('.studyrag.co')) {
    return PRODUCTION_API_BASE;
  }

  return '/api';
}

export function resolveLiveWsUrl({
  envApiUrl,
  location = typeof window !== 'undefined' ? window.location : null,
} = {}) {
  const apiBaseUrl = resolveApiBaseUrl({ envApiUrl, location });

  if (/^https?:\/\//i.test(apiBaseUrl)) {
    return apiBaseUrl.replace(/^http/i, 'ws').replace(/\/api\/?$/, '/live');
  }

  if (location && !isLocalHostname(location.hostname)) {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${location.host}/live`;
  }

  return 'ws://localhost:5000/live';
}
