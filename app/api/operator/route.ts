import { OPERATOR_COOKIE, normalizeOperator } from '@/lib/operator';

export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin) return new Response('請從本站操作', { status: 403 });
  const form = await req.formData();
  const name = normalizeOperator(String(form.get('name') || ''));
  if (!name) return new Response('請選擇或輸入有效的操作人員名稱（40 字以內）', { status: 400 });
  const headers = new Headers({ Location: new URL('/', req.url).toString() });
  headers.append(
    'Set-Cookie',
    `${OPERATOR_COOKIE}=${encodeURIComponent(name)}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`,
  );
  return new Response(null, { status: 303, headers });
}
