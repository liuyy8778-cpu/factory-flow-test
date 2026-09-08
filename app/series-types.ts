// 系列圖面：前後端共用的型別、尺寸比對與貼上解析。
import { z } from 'zod';

export const TURN_END_LABEL: Record<string, string> = { drive: '方孔外徑 ØD2', work: '螺孔外徑 ØD1' };

const num = z.string().trim().regex(/^\d+(\.\d+)?$/, '請填數字').refine((x) => Number(x) > 0 && Number(x) <= 10000, '數值需在 0 到 10000 之間');
const optionalNum = z.string().trim().refine((x) => x === '' || (/^\d+(\.\d+)?$/.test(x) && Number(x) >= 0 && Number(x) <= 10000), '請填數字或留空');

export const seriesRowInput = z.object({
  size: z.string().trim().min(1, '公稱尺寸必填').max(20),
  style: z.string().trim().max(20).default(''),
  turn_end: z.enum(['drive', 'work']),
  turn_diameter: num,
  step_length: num,
  total_length: num,
  groove_gap: optionalNum.default(''),
  thread_depth: optionalNum.default(''),
  note: z.string().trim().max(500).default(''),
});
export type SeriesRowInput = z.infer<typeof seriesRowInput>;

export const seriesInput = z.object({
  customer_id: z.string().trim().min(1),
  number: z.string().trim().min(1, '圖號必填').max(100),
  version: z.string().trim().min(1, '版本必填').max(50),
  name: z.string().trim().max(200).default(''),
  material: z.string().trim().max(100).default(''),
  drive: z.string().trim().max(20).default(''),
  drawing_date: z.string().trim().max(20).default(''),
  note: z.string().trim().max(2000).default(''),
  rows: z.array(seriesRowInput).min(1, '至少一列').max(200),
});
export type SeriesInput = z.infer<typeof seriesInput>;

// 「M10」「10」「010」視為同一尺寸；英制分數約分。
export function normalizeSize(v: string): string {
  const s = v.trim().toUpperCase().replace(/\s+/g, ' ');
  const m = s.match(/^(M|H|E)?0*(\d+(?:\.\d+)?)$/);
  if (m) return `${m[1] === 'M' ? '' : m[1] || ''}${Number(m[2])}`;
  return normalizeFraction(s);
}

export function normalizeFraction(v: string): string {
  const s = v.trim().toUpperCase().replace(/^(\d+)\s+(\d+\/\d+)$/, '$1-$2');
  const a = s.match(/^(?:(\d+)-)?(\d+)\/(\d+)$/);
  if (!a || !Number(a[3])) return s;
  let n = Number(a[1] || 0) * Number(a[3]) + Number(a[2]), d = Number(a[3]);
  const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);
  const g = gcd(n, d);
  n /= g;
  d /= g;
  return d === 1 ? String(n) : `${n}/${d}`;
}

export function specMatchesRow(spec: { drive: string; size: string }, seriesDrive: string, rowSize: string): boolean {
  if (seriesDrive && normalizeFraction(spec.drive) !== normalizeFraction(seriesDrive)) return false;
  return normalizeSize(spec.size) === normalizeSize(rowSize);
}

// 從 Excel 貼上的內容解析成列。欄位順序固定：
// 公稱尺寸 型式 車哪一頭 車削尺寸 階段距 總長 雙溝槽位置 螺孔深 [備註]
// 「車哪一頭」可寫 方孔／螺孔／方／螺／D2／D1。空值可用 - 或 —。
export function parsePastedRows(text: string): { rows: SeriesRowInput[]; errors: string[] } {
  const rows: SeriesRowInput[] = [], errors: string[] = [];
  const blank = (v: string | undefined) => !v || /^[-—–]+$/.test(v.trim()) ? '' : v.trim();
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const cells = line.includes('\t') ? line.split('\t') : line.split(/,|，|\s{2,}|\s+/);
    if (cells.length < 6) {
      errors.push(`第 ${i + 1} 行欄位不足（至少要 6 欄：尺寸 型式 車哪一頭 車削尺寸 階段距 總長）`);
      return;
    }
    const end = parseTurnEnd(cells[2]);
    if (!end) {
      errors.push(`第 ${i + 1} 行「車哪一頭」看不懂：${cells[2]}（請填 方孔 或 螺孔）`);
      return;
    }
    rows.push({ size: blank(cells[0]), style: blank(cells[1]), turn_end: end, turn_diameter: blank(cells[3]), step_length: blank(cells[4]), total_length: blank(cells[5]), groove_gap: blank(cells[6]), thread_depth: blank(cells[7]), note: blank(cells.slice(8).join(' ')) });
  });
  return { rows, errors };
}

export function parseTurnEnd(v: string | undefined): 'drive' | 'work' | null {
  const s = (v || '').trim().toUpperCase();
  if (!s) return null;
  if (s.includes('方') || s === 'D2' || s === 'ØD2' || s === 'DRIVE') return 'drive';
  if (s.includes('螺') || s === 'D1' || s === 'ØD1' || s === 'WORK') return 'work';
  return null;
}

// 把一列轉成原系統的圖面格式（ends-v1）。A 型車螺孔外徑：那一段長度 = 總長 − 階段距；B 型車方孔外徑：長度 = 階段距。
export function rowToDrawingData(row: SeriesRowInput, series: { id: string; name: string; material: string }) {
  const total = Number(row.total_length), step = Number(row.step_length);
  const cutLength = row.turn_end === 'drive' ? step : total - step;
  const machine = { mode: 'machine' as const, diameter: row.turn_diameter, cut_length: String(Math.round(cutLength * 100) / 100), diameter_tolerance: '±0.1', cut_length_tolerance: '±0.2' };
  const unchanged = { mode: 'unchanged' as const, diameter: '', cut_length: '', diameter_tolerance: '', cut_length_tolerance: '' };
  const groove = row.groove_gap
    ? { kind: 'custom' as const, name: '雙圓溝', base: 'drive' as const, reference: 'edge' as const, position: '', width: '', measure: 'depth' as const, value: '', radius: '', tolerance: '', note: `雙圓溝，間距 H ${row.groove_gap}` }
    : { kind: 'none' as const, name: '', base: 'drive' as const, reference: 'edge' as const, position: '', width: '', measure: 'depth' as const, value: '', radius: '', tolerance: '', note: '' };
  const noteParts = [row.thread_depth ? `螺孔深 L1 ${row.thread_depth}` : '', row.note].filter(Boolean);
  const base = { format: 'ends-v1' as const, groove, operation_code: '', length: row.total_length, length_tolerance: '±0.2', note: noteParts.join('；'), ends: { drive: row.turn_end === 'drive' ? machine : unchanged, work: row.turn_end === 'work' ? machine : unchanged } };
  const seriesInfo = { series_id: series.id, name: series.name, material: series.material, size: row.size, style: row.style, turn_end: row.turn_end, turn_end_label: TURN_END_LABEL[row.turn_end], turn_diameter: row.turn_diameter, step_length: row.step_length, total_length: row.total_length, groove_gap: row.groove_gap, thread_depth: row.thread_depth };
  return { base, data: { ...base, series: seriesInfo }, cutLength };
}
