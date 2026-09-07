// 操作人員：單機版不做密碼登入，第一次開啟時選名字存 cookie。
// proxy.ts 會把 cookie 轉成原系統用的兩個身分 header，所以稽核、換料、圖面編輯、備份的守門都照舊。
export const OPERATOR_COOKIE = 'factory_operator';

export function operatorList(): string[] {
  return (process.env.FACTORY_OPERATORS || '')
    .split(/[,，、\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function normalizeOperator(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let name: string;
  try {
    name = decodeURIComponent(raw).trim();
  } catch {
    return null;
  }
  if (!name || name.length > 40 || /[\r\n\t]/.test(name)) return null;
  const list = operatorList();
  if (list.length && !list.includes(name)) return null;
  return name;
}
