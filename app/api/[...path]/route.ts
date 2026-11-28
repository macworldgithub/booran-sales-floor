import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const origin = request.headers.get('origin');
  const publicOrigins = (process.env.APP_PUBLIC_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
  const allowedOrigin = !origin || (publicOrigins.length
    ? publicOrigins.includes(origin) && new URL(origin).host === request.headers.get('host')
    : origin === request.nextUrl.origin);
  if (!['GET', 'HEAD'].includes(request.method) && !allowedOrigin) {
    return Response.json({ success: false, error: 'Request origin is not allowed.' }, { status: 403 });
  }
  try {
    const base = process.env.API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:5001/api' : 'https://booran-sales-floor-backend.vercel.app/api');
    const url = new URL(`${base.replace(/\/$/, '')}/${path.map(encodeURIComponent).join('/')}`);
    url.search = request.nextUrl.search;
    const binaryUpload = request.method === 'PUT' && request.headers.get('content-type') === 'application/octet-stream' && (
      path.length === 5 && path[0] === 'leads' && path[2] === 'media' && path[4] === 'content' ||
      path.length === 6 && path[0] === 'public' && path[1] === 'trade-ins' && path[3] === 'photos' && path[5] === 'content'
    );
    const archiveDownload = ['GET', 'HEAD'].includes(request.method) && path.length === 5 && path[0] === 'iappraise' && path[1] === 'archive' && path[3] === 'media';
    const virtualyardCsv = request.method === 'POST' && path[0] === 'integrations' && path[1] === 'virtualyard' && path[2] === 'csv';
    const csvUpload = virtualyardCsv && path.length === 3 && request.headers.get('content-type') === 'text/csv';
    const headers = new Headers({ 'Content-Type': binaryUpload ? 'application/octet-stream' : csvUpload ? 'text/csv' : 'application/json' });
    let body: string | ArrayBuffer | undefined;
    if (!['GET', 'HEAD'].includes(request.method)) {
      if (binaryUpload || csvUpload) {
        const reader = request.body?.getReader();
        const chunks: Uint8Array[] = [];
        let size = 0;
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > (csvUpload ? 4 : 2) * 1024 * 1024) {
              await reader.cancel();
              return Response.json({ success: false, error: csvUpload ? 'Each CSV file must be 4 MB or less.' : 'Upload chunks must not exceed 2 MB.' }, { status: 413, headers: { 'Cache-Control': 'no-store' } });
            }
            chunks.push(value);
          }
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
        body = bytes.buffer;
      } else body = await request.text();
    }
    const cookie = request.headers.get('cookie');
    if (cookie) headers.set('cookie', cookie);
    if (process.env.TRUST_LOOPBACK_PROXY === 'true') {
      const forwardedFor = request.headers.get('x-forwarded-for');
      if (forwardedFor && forwardedFor.length <= 256) headers.set('X-Forwarded-For', forwardedFor);
    }
    const response = await fetch(url, {
      method: request.method,
      headers,
      body,
      signal: AbortSignal.timeout(binaryUpload || archiveDownload || virtualyardCsv ? 85000 : 25000),
      cache: 'no-store',
      redirect: 'error',
    });
    const outgoing = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' });
    const privateImage = ['GET', 'HEAD'].includes(request.method) && path.length === 5 && (
      (path[0] === 'leads' && path[2] === 'media' && path[4] === 'content') ||
      (path[0] === 'deliveries' && path[2] === 'accessories' && path[4] === 'proof')
    );
    const pdfDownload = ['GET', 'HEAD'].includes(request.method) && path.length === 2 && path[0] === 'daily-traffic' && path[1] === 'pdf';
    const responseType = response.headers.get('content-type') || '';
    if (privateImage && /^image\/(?:jpeg|png|webp|gif|heic|heif)$/.test(responseType)) outgoing.set('Content-Type', responseType);
    if (pdfDownload && response.ok) {
      outgoing.set('Content-Type', responseType.startsWith('application/pdf') ? 'application/pdf' : responseType.startsWith('text/html') ? 'text/html; charset=utf-8' : responseType);
      if (response.headers.get('content-disposition')) outgoing.set('Content-Disposition', response.headers.get('content-disposition')!);
    }
    if (archiveDownload && response.ok) {
      outgoing.set('Content-Type', 'application/octet-stream');
      outgoing.set('Content-Disposition', response.headers.get('content-disposition') || 'attachment');
    }
    outgoing.set('X-Content-Type-Options', 'nosniff');
    for (const cookieValue of response.headers.getSetCookie()) outgoing.append('Set-Cookie', cookieValue);
    const retry = response.headers.get('retry-after');
    if (retry) outgoing.set('Retry-After', retry);
    return new Response(response.body, { status: response.status, headers: outgoing });
  } catch {
    return Response.json({ success: false, error: 'The service is temporarily unavailable. Please retry.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as PUT, proxy as DELETE, proxy as HEAD };
