const DEFAULT_ALLOWED_ORIGINS = [
  'https://trackher.app',
  'https://www.trackher.app',
  'https://app.trackher.app',
  'capacitor://localhost',
  'http://localhost',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
] as const;

export function allowedOrigins(configuredOrigins?: string | null): Set<string> {
  const configured = (configuredOrigins ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured]);
}

export function isAllowedRequestOrigin(
  origin: string | null,
  configuredOrigins?: string | null,
): boolean {
  return origin === null || allowedOrigins(configuredOrigins).has(origin);
}

export function corsHeadersForOrigin(origin: string | null): HeadersInit {
  return {
    ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

export function withCors(response: Response, origin: string | null): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(corsHeadersForOrigin(origin))) {
    if (typeof value === 'string') headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
