// 單號用的日期一律以台北時間為準，跟畫面顯示一致。
export function todayTaipei(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

// YYYYMMDD，供 SO-/WO-/OUT-/IN-/AR- 這類單號使用。
export function stampTaipei(date = new Date()): string {
  return todayTaipei(date).replaceAll('-', '');
}
