'use client';
import { useSyncExternalStore } from 'react';

// 側欄底部顯示目前操作人員，點一下可切換。cookie 不是 httpOnly，只是顯示名稱。
function readName() {
  try {
    const m = document.cookie.match(/(?:^|; )factory_operator=([^;]*)/);
    return m ? decodeURIComponent(m[1]) : '';
  } catch {
    return '';
  }
}
const subscribe = () => () => {};

export default function OperatorBadge() {
  const name = useSyncExternalStore(subscribe, readName, () => '');
  return (
    <a href="/operator" className="operator-badge" title="切換操作人員">
      {name ? `操作人員：${name}` : '選擇操作人員'}
    </a>
  );
}
