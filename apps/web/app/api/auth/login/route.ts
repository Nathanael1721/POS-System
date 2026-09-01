import { NextResponse } from 'next/server';
import { backendUrl } from '@/lib/backend-url';

/**
 * Server-side proxy for login. Forwards credentials to the Hono backend so the
 * browser talks to a same-origin Next route. Auth-only, per the spec.
 * The backend target is a validated http(s) origin (see lib/backend-url).
 */
export async function POST(req: Request): Promise<NextResponse> {
  const body = await req.text();
  const res = await fetch(backendUrl('/api/auth/login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': req.headers.get('x-forwarded-for') ?? '',
    },
    body,
  });
  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
