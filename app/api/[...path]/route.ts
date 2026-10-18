import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const origin = request.headers.get('origin');
  if (!['GET', 'HEAD'].includes(request.method) && origin && origin !== request.nextUrl.origin) {
    return Response.json({ success: false, error: 'Request origin is not allowed.' }, { status: 403 });
  }
  try {
    const base = process.env.API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:5001/api' : 'https://booran-sales-floor-backend.vercel.app/api');
    const url = new URL(`${base.replace(/\/$/, '')}/${path.map(encodeURIComponent).join('/')}`);
    url.search = request.nextUrl.search;
    const headers = new Headers({ 'Content-Type': 'application/json' });
    const cookie = request.headers.get('cookie');
    if (cookie) headers.set('cookie', cookie);
    const response = await fetch(url, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text(),
      signal: AbortSignal.timeout(25000),
      cache: 'no-store',
      redirect: 'error',
    });
    const outgoing = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' });
    for (const cookieValue of response.headers.getSetCookie()) outgoing.append('Set-Cookie', cookieValue);
    const retry = response.headers.get('retry-after');
    if (retry) outgoing.set('Retry-After', retry);
    return new Response(response.body, { status: response.status, headers: outgoing });
  } catch {
    return Response.json({ success: false, error: 'The service is temporarily unavailable. Please retry.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as PUT, proxy as DELETE, proxy as HEAD };
