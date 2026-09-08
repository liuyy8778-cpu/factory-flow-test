import { z } from 'zod';
import { database } from '@/db/raw';
import { storage } from '@/storage';
import { seriesInput, specMatchesRow, rowToDrawingData, type SeriesRowInput } from '@/app/series-types';
import { drawingInput, validateDrawingRaw } from '@/app/api/materials/drawing-validation';

type Row = Record<string, any>;
const FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export async function GET() {
  try {
    const db = database();
    const [series, rows] = await db.batch([
      db.prepare('SELECT s.*,p.name AS customer FROM series_drawings s JOIN partners p ON p.id=s.customer_id ORDER BY s.rowid DESC'),
      db.prepare('SELECT r.*,d.used AS drawing_used,d.disabled AS drawing_disabled FROM series_drawing_rows r LEFT JOIN drawings d ON d.id=r.drawing_id ORDER BY r.series_id,r.position'),
    ]);
    const byId = new Map<string, Row[]>();
    for (const r of rows.results as Row[]) {
      if (!byId.has(r.series_id)) byId.set(r.series_id, []);
      byId.get(r.series_id)!.push(r);
    }
    return Response.json({ series: (series.results as Row[]).map((s) => ({ ...s, rows: byId.get(s.id) || [] })) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error(e);
    return Response.json({ error: '資料暫時無法讀取，請稍後重試。' }, { status: 503 });
  }
}

// 依系列列找出對應的來料規格，產生標準圖面資料並逐一驗證守門。
function buildDrawings(series: { id: string; customer_id: string; number: string; version: string; name: string; material: string; drive: string; file: { key: string | null; name: string | null; type: string | null } }, rows: (SeriesRowInput & { position: number })[], specs: Row[], existingSpecs: Set<string>) {
  const drawings: Row[] = [], links: Row[] = [], rowUpdates: { position: number; drawing_id: string | null; spec_count: number }[] = [];
  const warnings: string[] = [];
  for (const row of rows) {
    const matched = specs.filter((s) => specMatchesRow(s.data, series.drive, row.size));
    if (!matched.length) {
      warnings.push(`尺寸 ${row.size}：尚無對應的來料規格，等規格建好後按「補對應」`);
      rowUpdates.push({ position: row.position, drawing_id: null, spec_count: 0 });
      continue;
    }
    const { base, data, cutLength } = rowToDrawingData(row, series);
    if (cutLength <= 0) throw Error(`尺寸 ${row.size}：階段距不能大於或等於總長`);
    const parsed = drawingInput.parse(base);
    for (const s of matched) {
      try {
        validateDrawingRaw(parsed, s.data);
      } catch (e) {
        throw Error(`尺寸 ${row.size}（${s.data.drive} × ${s.data.size} × ${s.data.profile}）：${e instanceof Error ? e.message : '驗證失敗'}`);
      }
      if (existingSpecs.has(JSON.stringify([series.customer_id, s.id, series.number, series.version]))) throw Error(`尺寸 ${row.size}：此客戶、來料、圖號與版本已有圖面，請用新版本`);
    }
    const drawingId = `${series.id}:${row.position}`;
    drawings.push({ key: drawingId, customer_id: series.customer_id, spec_id: matched[0].id, number: series.number, version: series.version, data: JSON.stringify(data), preferred: 1, file_key: series.file.key, file_name: series.file.name, file_type: series.file.type });
    for (const s of matched.slice(1)) links.push({ id: `${drawingId}:${s.id}`, drawing_id: drawingId, spec_id: s.id, preferred: 1 });
    rowUpdates.push({ position: row.position, drawing_id: drawingId, spec_count: matched.length });
  }
  return { drawings, links, rowUpdates, warnings, specIds: [...new Set(drawings.map((d) => d.spec_id).concat(links.map((l) => l.spec_id)))] };
}

async function loadSpecsAndExisting(db: D1Database) {
  const [specs, ds, links] = await db.batch([db.prepare('SELECT id,data FROM material_specs'), db.prepare('SELECT id,customer_id,spec_id,number,version FROM drawings'), db.prepare('SELECT drawing_id,spec_id FROM drawing_specs')]);
  const drawingsById = new Map((ds.results as Row[]).map((d) => [d.id, d]));
  const existing = new Set<string>();
  for (const d of ds.results as Row[]) existing.add(JSON.stringify([d.customer_id, d.spec_id, d.number, d.version]));
  for (const l of links.results as Row[]) {
    const d = drawingsById.get(l.drawing_id);
    if (d) existing.add(JSON.stringify([d.customer_id, l.spec_id, d.number, d.version]));
  }
  return { specs: (specs.results as Row[]).map((s) => ({ ...s, data: JSON.parse(s.data) })), existing };
}

function writeStatements(db: D1Database, customerId: string, built: ReturnType<typeof buildDrawings>) {
  if (!built.drawings.length) return [] as D1PreparedStatement[];
  const ids = JSON.stringify(built.specIds);
  return [
    db.prepare('UPDATE drawings SET preferred=0 WHERE customer_id=? AND spec_id IN (SELECT value FROM json_each(?))').bind(customerId, ids),
    db.prepare('UPDATE drawing_specs SET preferred=0 WHERE drawing_id IN (SELECT id FROM drawings WHERE customer_id=?) AND spec_id IN (SELECT value FROM json_each(?))').bind(customerId, ids),
    db.prepare("INSERT INTO drawings(id,customer_id,spec_id,number,version,data,preferred,file_key,file_name,file_type) SELECT json_extract(value,'$.key'),json_extract(value,'$.customer_id'),json_extract(value,'$.spec_id'),json_extract(value,'$.number'),json_extract(value,'$.version'),json_extract(value,'$.data'),json_extract(value,'$.preferred'),json_extract(value,'$.file_key'),json_extract(value,'$.file_name'),json_extract(value,'$.file_type') FROM json_each(?)").bind(JSON.stringify(built.drawings)),
    ...(built.links.length ? [db.prepare("INSERT INTO drawing_specs(id,drawing_id,spec_id,preferred) SELECT json_extract(value,'$.id'),json_extract(value,'$.drawing_id'),json_extract(value,'$.spec_id'),json_extract(value,'$.preferred') FROM json_each(?)").bind(JSON.stringify(built.links))] : []),
  ];
}

export async function POST(req: Request) {
  let uploaded = '';
  try {
    const origin = req.headers.get('origin');
    if (origin && origin !== new URL(req.url).origin) return Response.json({ error: '請從本站操作' }, { status: 403 });
    const type = req.headers.get('content-type') || '';
    let body: Row, file: File | null = null;
    if (type.includes('multipart/form-data')) {
      const form = await req.formData();
      body = JSON.parse(String(form.get('payload') || '{}'));
      const f = form.get('file');
      if (f instanceof File && f.size) file = f;
    } else body = await req.json();
    const b = z.object({ action: z.enum(['create', 'regenerate', 'disable']), request_id: z.string().uuid() }).passthrough().parse(body);
    const db = database(req);
    const id = b.request_id;

    if (b.action === 'create') {
      const p = seriesInput.parse(b);
      if (await db.prepare('SELECT id FROM series_drawings WHERE id=?').bind(id).first()) return Response.json({ ok: true, id });
      if (!(await db.prepare("SELECT id FROM partners WHERE id=? AND kind='customer'").bind(p.customer_id).first())) throw Error('請選擇有效客戶');
      if (await db.prepare('SELECT id FROM series_drawings WHERE customer_id=? AND number=? AND version=?').bind(p.customer_id, p.number, p.version).first()) throw Error('此客戶已有相同圖號與版本的系列圖面，請改版本');
      const sizes = new Set<string>();
      for (const r of p.rows) {
        const k = r.size.trim().toUpperCase();
        if (sizes.has(k)) throw Error(`公稱尺寸 ${r.size} 重複`);
        sizes.add(k);
      }
      let fileMeta = { key: null as string | null, name: null as string | null, type: null as string | null };
      if (file) {
        if (file.size > 8 * 1024 * 1024 || !FILE_TYPES.includes(file.type)) throw Error('圖檔限 PDF、JPG、PNG、WebP，最大 8 MB');
        uploaded = `series/${id}/${crypto.randomUUID()}`;
        await storage.put(uploaded, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
        fileMeta = { key: uploaded, name: file.name, type: file.type };
      }
      const { specs, existing } = await loadSpecsAndExisting(db);
      const rows = p.rows.map((r, position) => ({ ...r, position }));
      const built = buildDrawings({ id, ...p, file: fileMeta }, rows, specs, existing);
      const rowJson = JSON.stringify(rows.map((r) => {
        const u = built.rowUpdates.find((x) => x.position === r.position)!;
        return { id: `${id}:row:${r.position}`, series_id: id, position: r.position, size: r.size, style: r.style, turn_end: r.turn_end, turn_diameter: r.turn_diameter, step_length: r.step_length, total_length: r.total_length, groove_gap: r.groove_gap, thread_depth: r.thread_depth, note: r.note, drawing_id: u.drawing_id, spec_count: u.spec_count };
      }));
      await db.batch([
        db.prepare('INSERT INTO series_drawings(id,customer_id,number,version,name,material,drive,drawing_date,note,file_key,file_name,file_type,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id, p.customer_id, p.number, p.version, p.name, p.material, p.drive, p.drawing_date, p.note, fileMeta.key, fileMeta.name, fileMeta.type, new Date().toISOString()),
        ...writeStatements(db, p.customer_id, built),
        db.prepare("INSERT INTO series_drawing_rows(id,series_id,position,size,style,turn_end,turn_diameter,step_length,total_length,groove_gap,thread_depth,note,drawing_id,spec_count) SELECT json_extract(value,'$.id'),json_extract(value,'$.series_id'),json_extract(value,'$.position'),json_extract(value,'$.size'),json_extract(value,'$.style'),json_extract(value,'$.turn_end'),json_extract(value,'$.turn_diameter'),json_extract(value,'$.step_length'),json_extract(value,'$.total_length'),json_extract(value,'$.groove_gap'),json_extract(value,'$.thread_depth'),json_extract(value,'$.note'),json_extract(value,'$.drawing_id'),json_extract(value,'$.spec_count') FROM json_each(?)").bind(rowJson),
      ]);
      uploaded = '';
      return Response.json({ ok: true, id, created: built.drawings.length, warnings: built.warnings });
    }

    if (b.action === 'regenerate') {
      // 只補「尚無來料規格」的列：規格後來建好了，再對應一次。
      const p = z.object({ id: z.string().min(1) }).parse(b);
      const s = await db.prepare('SELECT * FROM series_drawings WHERE id=? AND disabled=0').bind(p.id).first<Row>();
      if (!s) throw Error('找不到系列圖面');
      const pending = (await db.prepare('SELECT * FROM series_drawing_rows WHERE series_id=? AND drawing_id IS NULL ORDER BY position').bind(p.id).all()).results as Row[];
      if (!pending.length) return Response.json({ ok: true, id: p.id, created: 0, warnings: [] });
      const { specs, existing } = await loadSpecsAndExisting(db);
      const rows = pending.map((r) => ({ size: r.size, style: r.style, turn_end: r.turn_end, turn_diameter: r.turn_diameter, step_length: r.step_length, total_length: r.total_length, groove_gap: r.groove_gap, thread_depth: r.thread_depth, note: r.note, position: r.position }));
      const built = buildDrawings({ id: s.id, customer_id: s.customer_id, number: s.number, version: s.version, name: s.name, material: s.material, drive: s.drive, file: { key: s.file_key, name: s.file_name, type: s.file_type } }, rows, specs, existing);
      const updates = built.rowUpdates.filter((u) => u.drawing_id);
      if (updates.length) await db.batch([...writeStatements(db, s.customer_id, built), ...updates.map((u) => db.prepare('UPDATE series_drawing_rows SET drawing_id=?,spec_count=? WHERE series_id=? AND position=?').bind(u.drawing_id, u.spec_count, s.id, u.position))]);
      return Response.json({ ok: true, id: p.id, created: built.drawings.length, warnings: built.warnings });
    }

    if (b.action === 'disable') {
      if (!decodeURIComponent(req.headers.get('oai-authenticated-user-id') || '')) throw Error('請先選擇操作人員');
      const p = z.object({ id: z.string().min(1) }).parse(b);
      await db.batch([
        db.prepare('UPDATE series_drawings SET disabled=1 WHERE id=?').bind(p.id),
        db.prepare('UPDATE drawings SET disabled=1,revision=revision+1 WHERE id IN (SELECT drawing_id FROM series_drawing_rows WHERE series_id=? AND drawing_id IS NOT NULL)').bind(p.id),
      ]);
      return Response.json({ ok: true, id: p.id });
    }
    throw Error('不支援此操作');
  } catch (e) {
    if (uploaded) try { await storage.delete(uploaded); } catch {}
    console.error(e);
    return Response.json({ error: e instanceof z.ZodError ? '請檢查欄位：' + e.issues.map((i) => i.message).filter((m, idx, a) => a.indexOf(m) === idx).slice(0, 3).join('、') : e instanceof Error && !/SQLITE|constraint/i.test(e.message) ? e.message : '儲存未完成，可能與既有圖面重複；請重新整理後核對。' }, { status: 400 });
  }
}
