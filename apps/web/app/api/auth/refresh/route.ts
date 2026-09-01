import { NextResponse } from 'next/server';
import { backendUrl } from '@/lib/backend-url';

/** Server-side proxy for token refresh (validated backend origin). */
export async function POST(req: Request): Promise<NextResponse> {
  const body = await req.text();
  const res = await fetch(backendUrl('/api/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
