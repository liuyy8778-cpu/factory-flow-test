'use client';
import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, RefreshCw, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';
import { TURN_END_LABEL, parsePastedRows, seriesInput, type SeriesRowInput } from './series-types';

// 系列圖面：客戶一張圖管一整個系列。表格照師傅要看的七格抄，存檔後每個尺寸自動產生圖面。
type Row = Record<string, any>;
type Partner = { id: string; name: string; kind: string };
const blankRow = (): SeriesRowInput => ({ size: '', style: '', turn_end: 'work', turn_diameter: '', step_length: '', total_length: '', groove_gap: '', thread_depth: '', note: '' });
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={'field' + (wide ? ' field-wide' : '')}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function SeriesDrawings({ partners, demo, navigate }: { partners: Partner[]; demo: boolean; navigate: (v: string) => void }) {
  const [list, setList] = useState<Row[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [query, setQuery] = useState(''), [detail, setDetail] = useState<Row | null>(null), [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
  const [head, setHead] = useState({ request_id: '', customer_id: '', number: '', version: 'A', name: '', material: '', drive: '1/2', drawing_date: today(), note: '' });
  const [rows, setRows] = useState<SeriesRowInput[]>([]), [paste, setPaste] = useState(''), [file, setFile] = useState<File | null>(null), [pasteErrors, setPasteErrors] = useState<string[]>([]);
  const customers = partners.filter((p) => p.kind === 'customer');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/series', { cache: 'no-store' });
      const b = (await r.json()) as Row;
      if (!r.ok) throw Error(b.error);
      setList(b.series);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!demo) load();
  }, [demo, load]);

  function startNew() {
    if (demo) {
      toast.info('示範模式僅供預覽，請切回正式作業。');
      return;
    }
    setHead({ request_id: crypto.randomUUID(), customer_id: customers[0]?.id || '', number: '', version: 'A', name: '', material: '', drive: '1/2', drawing_date: today(), note: '' });
    setRows([blankRow()]);
    setPaste('');
    setFile(null);
    setPasteErrors([]);
    setOpen(true);
  }
  function applyPaste() {
    const { rows: parsed, errors } = parsePastedRows(paste);
    setPasteErrors(errors);
    if (parsed.length) {
      setRows((r) => [...r.filter((x) => x.size.trim()), ...parsed]);
      toast.success(`貼進 ${parsed.length} 列`);
    }
  }
  const change = (i: number, k: keyof SeriesRowInput, v: string) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));

  async function save() {
    const check = seriesInput.safeParse({ ...head, rows: rows.filter((r) => r.size.trim() || r.turn_diameter.trim()) });
    if (!check.success) {
      const msgs = [...new Set(check.error.issues.map((i) => (i.path[1] !== undefined ? `第 ${Number(i.path[1]) + 1} 列 ` : '') + i.message))];
      toast.error(msgs.slice(0, 3).join('；'));
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('payload', JSON.stringify({ action: 'create', request_id: head.request_id, ...check.data }));
      if (file) fd.append('file', file);
      const r = await fetch('/api/series', { method: 'POST', body: fd });
      const b = (await r.json()) as Row;
      if (!r.ok) throw Error(b.error);
      toast.success(`已建立系列圖面，產生 ${b.created} 個尺寸的圖面` + (b.warnings?.length ? `；${b.warnings.length} 個尺寸尚無來料規格` : ''));
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setBusy(false);
    }
  }
  async function act(action: 'regenerate' | 'disable', id: string) {
    if (action === 'disable' && !confirm('停用後，這個系列產生的圖面不再出現在新進貨的選圖清單；既有單據不受影響。確定停用？')) return;
    setBusy(true);
    try {
      const r = await fetch('/api/series', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, id, request_id: crypto.randomUUID() }) });
      const b = (await r.json()) as Row;
      if (!r.ok) throw Error(b.error);
      toast.success(action === 'regenerate' ? `補對應完成，新產生 ${b.created} 個尺寸的圖面` + (b.warnings?.length ? `；仍有 ${b.warnings.length} 個尺寸沒有來料規格` : '') : '已停用');
      await load();
      if (detail) setDetail(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失敗');
    } finally {
      setBusy(false);
    }
  }

  const shown = list.filter((s) => [s.customer, s.number, s.version, s.name, s.material].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  const pending = (s: Row) => s.rows.filter((r: Row) => !r.drawing_id).length;

  return (
    <div className="production-space">
      {!demo && error && (
        <div className="error" role="alert">
          {error}
          <Button variant="outline" onClick={load}>重試</Button>
        </div>
      )}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>系列圖面</h2>
            <span>{shown.length} 張</span>
          </div>
          <Button onClick={startNew}>
            <Plus size={17} />新增系列圖面
          </Button>
        </div>
        <div className="toolbar">
          <p className="production-hint">一張客戶圖管一整個系列。表格照師傅要看的七格抄一次，每個尺寸的圖面自動產生；進貨選料時會自動帶入。</p>
          <div className="search">
            <Search size={17} />
            <Input aria-label="搜尋系列圖面" placeholder="搜尋客戶、圖號、圖名" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
        {loading && !demo ? (
          <div className="empty-state" role="status">正在讀取…</div>
        ) : !shown.length ? (
          <div className="empty-state">
            <FileText size={32} />
            <b>還沒有系列圖面</b>
            <span>按「新增系列圖面」，把客戶圖的表格貼進來。</span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>{['客戶', '圖號 / 版本', '圖名 / 材質', '尺寸', '已對應來料', '狀態', '操作'].map((t) => <TableHead key={t}>{t}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.customer}</TableCell>
                  <TableCell>
                    <b>{s.number}</b> / {s.version}
                    <small>{s.drawing_date || ''}</small>
                  </TableCell>
                  <TableCell>
                    {s.name || '—'}
                    <small>{s.material || ''}{s.drive ? ` · ${s.drive}` : ''}</small>
                  </TableCell>
                  <TableCell>{s.rows.length} 個</TableCell>
                  <TableCell>
                    {s.rows.length - pending(s)} / {s.rows.length}
                    {pending(s) > 0 && <small className="late-date">{pending(s)} 個尺寸尚無來料規格</small>}
                  </TableCell>
                  <TableCell>{s.disabled ? <span className="status late">已停用</span> : <span className="status done">使用中</span>}</TableCell>
                  <TableCell>
                    <Button variant="ghost" onClick={() => setDetail(s)}>明細</Button>
                    {!s.disabled && pending(s) > 0 && (
                      <Button variant="ghost" disabled={busy} onClick={() => act('regenerate', s.id)}>
                        <RefreshCw size={14} />補對應
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <Dialog open={!!detail} onOpenChange={(v) => { if (!v) setDetail(null); }}>
        <DialogContent className="detail-dialog sm:max-w-5xl">
          <DialogTitle>{detail?.customer} · {detail?.number} / {detail?.version}</DialogTitle>
          <DialogDescription>{detail?.name || ''}{detail?.material ? ` · ${detail.material}` : ''}{detail?.drive ? ` · ${detail.drive}` : ''}{detail?.drawing_date ? ` · ${detail.drawing_date}` : ''}</DialogDescription>
          {detail && (
            <>
              {detail.file_key && (
                <a className="drawing-link" href={'/api/drawing-file?series=' + encodeURIComponent(detail.id)} target="_blank" rel="noreferrer">開啟圖檔：{detail.file_name} ↗</a>
              )}
              <Table>
                <TableHeader>
                  <TableRow>{['公稱', '型式', '車哪一頭', '車削尺寸', '階段距', '總長', '雙溝槽', '螺孔深', '來料', '圖面'].map((t) => <TableHead key={t}>{t}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {detail.rows.map((r: Row) => (
                    <TableRow key={r.id}>
                      <TableCell><b>{r.size}</b></TableCell>
                      <TableCell>{r.style || '—'}</TableCell>
                      <TableCell>{TURN_END_LABEL[r.turn_end]}</TableCell>
                      <TableCell>Ø{r.turn_diameter}</TableCell>
                      <TableCell>{r.step_length}</TableCell>
                      <TableCell>{r.total_length}</TableCell>
                      <TableCell>{r.groove_gap ? `H ${r.groove_gap}` : '無溝'}</TableCell>
                      <TableCell>{r.thread_depth || '—'}</TableCell>
                      <TableCell>{r.spec_count ? `${r.spec_count} 筆` : <span className="late-date">尚無規格</span>}</TableCell>
                      <TableCell>{r.drawing_id ? (r.drawing_used ? '已使用' : r.drawing_disabled ? '已停用' : '可用') : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {detail.note && <p className="job-note">{detail.note}</p>}
              <div className="form-actions">
                {!detail.disabled && <Button variant="outline" disabled={busy} onClick={() => act('disable', detail.id)}>停用整個系列</Button>}
                <Button variant="outline" onClick={() => navigate('drawings')}>到加工圖面庫查看</Button>
                <Button onClick={() => setDetail(null)}>關閉</Button>
              </div>
              <p className="production-hint">要改尺寸請用新版本重新建立（例如 A 改 B），已使用的圖面不能修改，這是為了保住舊單據的依據。</p>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={(v) => { if (!v && !busy) setOpen(false); }}>
        <DialogContent className="editor-dialog series-dialog" onPointerDownOutside={(e) => e.preventDefault()}>
          <div className="editor-heading">
            <div>
              <DialogTitle>新增系列圖面</DialogTitle>
              <DialogDescription>照客戶圖抄。左邊是圖面資料，下面表格一列一個公稱尺寸。</DialogDescription>
            </div>
          </div>
          <div className="receipt-editor-body">
            <section>
              <h3>圖面資料</h3>
              <div className="form-grid series-head">
                <Field label="客戶 *">
                  <Select value={head.customer_id} onValueChange={(v) => setHead((h) => ({ ...h, customer_id: v }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="選擇客戶" /></SelectTrigger>
                    <SelectContent>{customers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="圖號 *"><Input value={head.number} onChange={(e) => setHead((h) => ({ ...h, number: e.target.value }))} placeholder="例如：無溝6140" /></Field>
                <Field label="版本 *"><Input value={head.version} onChange={(e) => setHead((h) => ({ ...h, version: e.target.value }))} placeholder="A、B 或日期" /></Field>
                <Field label="分（方孔）"><Input value={head.drive} onChange={(e) => setHead((h) => ({ ...h, drive: e.target.value }))} placeholder="1/2，用來對應來料規格" /></Field>
                <Field label="圖名"><Input value={head.name} onChange={(e) => setHead((h) => ({ ...h, name: e.target.value }))} placeholder='例如：1/2" 手動套筒' /></Field>
                <Field label="材質"><Input value={head.material} onChange={(e) => setHead((h) => ({ ...h, material: e.target.value }))} placeholder="例如：6140" /></Field>
                <Field label="圖面日期"><Input type="date" value={head.drawing_date} onChange={(e) => setHead((h) => ({ ...h, drawing_date: e.target.value }))} /></Field>
                <Field label="圖檔（手機拍的照片即可）"><Input type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} /></Field>
                <Field label="備註" wide><Input value={head.note} onChange={(e) => setHead((h) => ({ ...h, note: e.target.value }))} placeholder="例如：色帶位置 8.5，深 0.4～0.5；23 以上 R 角車削 25°" /></Field>
              </div>
            </section>
            <section>
              <h3>從 Excel 貼上（可略過，直接在下面表格打）</h3>
              <p className="production-hint">每列一個尺寸，欄位順序：公稱尺寸、型式、車哪一頭（方孔／螺孔）、車削尺寸、階段距、總長、雙溝槽位置（無溝填 -）、螺孔深。用 Tab 或空白分隔。</p>
              <textarea className="series-paste" rows={4} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'10\tA\t螺孔\t15.0\t20\t38\t-\t8\n20\tB\t方孔\t23.2\t17\t38\t2\t17'} />
              <div className="editor-actions">
                <Button type="button" variant="outline" onClick={applyPaste} disabled={!paste.trim()}>解析並加到表格</Button>
                {pasteErrors.map((e, i) => <small key={i} className="late-date">{e}</small>)}
              </div>
            </section>
            <section>
              <h3>尺寸表（{rows.length} 列）</h3>
              <div className="series-table">
                <Table>
                  <TableHeader>
                    <TableRow>{['公稱尺寸', '型式', '車哪一頭', '車削尺寸 Ø', '階段距 L3', '總長 L', '雙溝槽 H', '螺孔深 L1', '備註', ''].map((t) => <TableHead key={t}>{t}</TableHead>)}</TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell><Input aria-label="公稱尺寸" value={r.size} onChange={(e) => change(i, 'size', e.target.value)} placeholder="10" /></TableCell>
                        <TableCell><Input aria-label="型式" value={r.style} onChange={(e) => change(i, 'style', e.target.value)} placeholder="A" /></TableCell>
                        <TableCell>
                          <Select value={r.turn_end} onValueChange={(v) => change(i, 'turn_end', v)}>
                            <SelectTrigger aria-label="車哪一頭"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="work">螺孔外徑 ØD1</SelectItem><SelectItem value="drive">方孔外徑 ØD2</SelectItem></SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Input aria-label="車削尺寸" inputMode="decimal" value={r.turn_diameter} onChange={(e) => change(i, 'turn_diameter', e.target.value)} placeholder="15.0" /></TableCell>
                        <TableCell><Input aria-label="階段距" inputMode="decimal" value={r.step_length} onChange={(e) => change(i, 'step_length', e.target.value)} placeholder="20" /></TableCell>
                        <TableCell><Input aria-label="總長" inputMode="decimal" value={r.total_length} onChange={(e) => change(i, 'total_length', e.target.value)} placeholder="38" /></TableCell>
                        <TableCell><Input aria-label="雙溝槽位置" inputMode="decimal" value={r.groove_gap} onChange={(e) => change(i, 'groove_gap', e.target.value)} placeholder="無溝留空" /></TableCell>
                        <TableCell><Input aria-label="螺孔深" inputMode="decimal" value={r.thread_depth} onChange={(e) => change(i, 'thread_depth', e.target.value)} placeholder="8" /></TableCell>
                        <TableCell><Input aria-label="備註" value={r.note} onChange={(e) => change(i, 'note', e.target.value)} /></TableCell>
                        <TableCell><Button variant="ghost" size="sm" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>移除</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="editor-actions">
                <Button type="button" variant="outline" onClick={() => setRows((r) => [...r, blankRow()])}><Plus size={14} />加一列</Button>
              </div>
            </section>
          </div>
          <div className="editor-footer">
            <small>存檔時會檢查：車削尺寸不能大於來料外徑、總長不能大於來料長度。沒有來料規格的尺寸會先存起來，規格建好後按「補對應」。</small>
            <div className="editor-actions">
              <Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>取消</Button>
              <Button disabled={busy || !head.customer_id} onClick={save}>{busy ? '儲存中…' : '儲存並產生圖面'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
