import { cookies } from 'next/headers';
import Link from 'next/link';
import { OPERATOR_COOKIE, normalizeOperator, operatorList } from '@/lib/operator';

export const dynamic = 'force-dynamic';

export default async function OperatorPage() {
  const current = normalizeOperator((await cookies()).get(OPERATOR_COOKIE)?.value);
  const list = operatorList();
  return (
    <main className="operator-page">
      <form method="post" action="/api/operator" className="operator-card">
        <h1>選擇操作人員</h1>
        <p>接下來所有新增、修改、作廢都會記在這個名字底下。單機版不需要密碼。</p>
        {list.length ? (
          <label className="field">
            <span>操作人員</span>
            <select name="name" defaultValue={current || list[0]} required>
              {list.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="field">
            <span>操作人員</span>
            <input name="name" defaultValue={current || ''} maxLength={40} required autoFocus placeholder="輸入你的名字" />
          </label>
        )}
        <button type="submit">開始使用</button>
        {current && (
          <p className="operator-current">
            目前是「{current}」。<Link href="/">回到工作區</Link>
          </p>
        )}
        {!list.length && <p className="operator-hint">要固定名單，在 .env 設定 FACTORY_OPERATORS=阿明,小華</p>}
      </form>
    </main>
  );
}
