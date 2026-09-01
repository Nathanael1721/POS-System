/**
 * Validated backend origin for every server-side fetch in the web app.
 *
 * The backend URL comes from an environment variable; parsing + protocol
 * validation here prevents a misconfigured (or injected) value from turning
 * the Next.js auth proxies into unintended request forwarders (SSRF).
 * Only absolute http/https origins are accepted.
 */

function parseBackendBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`NEXT_PUBLIC_API_URL bukan URL yang valid: ${raw}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Backend harus http(s), didapat: ${url.protocol}`);
  }
  return url.origin;
}

/** Backend origin, validated once at module load. */
export const BACKEND_BASE = parseBackendBase();

/** Absolute backend URL for a relative API path (e.g. "/api/auth/login"). */
export function backendUrl(path: string): string {
  return new URL(path, BACKEND_BASE).toString();
}
