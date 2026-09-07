import { NextResponse, type NextRequest } from 'next/server';
import { OPERATOR_COOKIE, normalizeOperator } from '@/lib/operator';

// 把「操作人員 cookie」轉成原系統的身分 header。
// 沒選人：頁面導去 /operator；API 則不帶身分，讓原本的守門（需登入才能換料、改圖、備份）自然擋下。
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const name = normalizeOperator(req.cookies.get(OPERATOR_COOKIE)?.value);
  const headers = new Headers(req.headers);
  headers.delete('oai-authenticated-user-id');
  headers.delete('oai-authenticated-user-email');
  if (name) {
    headers.set('oai-authenticated-user-id', encodeURIComponent(name));
    headers.set('oai-authenticated-user-email', encodeURIComponent(name));
  }
  if (pathname.startsWith('/api/') || pathname === '/operator') return NextResponse.next({ request: { headers } });
  if (!name) return NextResponse.redirect(new URL('/operator', req.url));
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/((?!_next/|favicon\\.svg|backup-restore\\.mjs).*)'],
};
