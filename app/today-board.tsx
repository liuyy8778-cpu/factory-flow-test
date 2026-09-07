'use client';
import { useCallback, useEffect, useState } from 'react';
import { ArrowDownToLine, HardHat, Truck, ReceiptText, Clock, FileText, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { drawingReady } from './drawing-types';

// 今日看板：六格「今天該做什麼」，每格點進去就是對應頁面。
// 資料只讀不寫，規則全部沿用原 API。
type Row = Record<string, any>;
type Props = { navigate: (v: string) => void; demo: boolean; documents: Row[]; today: string };

const fmt = (n: number) => n.toLocaleString('zh-TW');

export default function TodayBoard({ navigate, demo, documents, today }: Props) {
  const [intakes, setIntakes] = useState<Row[]>([]);
  const [jobs, setJobs] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const [m, p] = await Promise.all([fetch('/api/materials', { cache: 'no-store' }), fetch('/api/production', { cache: 'no-store' })]);
      const mb = (await m.json()) as Row, pb = (await p.json()) as Row;
      if (!m.ok) throw Error(mb.error);
      if (!p.ok) throw Error(pb.error);
      setIntakes(mb.intakes || []);
      setJobs(pb.jobs || []);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
    }
  }, []);
  useEffect(() => {
    if (!demo) load();
  }, [demo, load]);

  const allocated = (i: Row) => (i.allocations || []).reduce((s: number, a: Row) => s + Number(a.quantity || 0), 0);
  const legacyDispatched = (i: Row) => !!i.work_order_id; // 舊式整批派工
  const needDrawing = intakes.filter((i) => !legacyDispatched(i) && !i.drawing_id && !(i.allocations || []).length);
  const toDispatch = intakes.filter((i) => {
    if (legacyDispatched(i)) return false;
    const pendingAlloc = (i.allocations || []).some((a: Row) => !a.work_order_id);
    const remaining = Number(i.quantity) - allocated(i);
    const hasDrawing = !!i.drawing_id && drawingReady(i.drawing_snapshot);
    return pendingAlloc || (remaining > 0 && hasDrawing);
  });
  const working = jobs.filter((j) => j.status !== 'completed');
  const overdue = jobs.filter((j) => j.due < today && (j.status !== 'completed' || j.shipped < j.good));
  const readyToShip = jobs.filter((j) => j.status === 'completed' && j.shipped < j.good);
  const unbilled = documents.filter((x) => x.kind === 'out' && !x.voided && !x.invoice_id);

  const cards: { key: string; title: string; count: number; hint: string; view: string; icon: React.ReactNode; tone?: string }[] = [
    { key: 'drawing', title: '待確認圖面', count: needDrawing.length, hint: '進貨了但還沒選圖面，選好才能派工', view: 'in', icon: <FileText size={20} /> },
    { key: 'dispatch', title: '待派工', count: toDispatch.length, hint: '圖面確認了，等派給師傅', view: 'in', icon: <ArrowDownToLine size={20} /> },
    { key: 'working', title: '加工中', count: working.length, hint: '做好了就按「出貨（即完工）」', view: 'production', icon: <HardHat size={20} /> },
    { key: 'overdue', title: '逾期未出貨', count: overdue.length, hint: '交期已過，優先處理', view: 'production', icon: <Clock size={20} />, tone: 'orange' },
    { key: 'ready', title: '完工待出貨', count: readyToShip.length, hint: '舊流程完工的工單，還沒開出貨單', view: 'production', icon: <Truck size={20} /> },
    { key: 'unbilled', title: '出貨待請款', count: unbilled.length, hint: '月底到「月結」勾選請款', view: 'out', icon: <ReceiptText size={20} /> },
  ];

  return (
    <div className="today-board-wrap">
      {demo && <p className="production-hint">示範模式只顯示帳款假資料；今日看板需切回正式作業。</p>}
      {error && (
        <div className="error" role="alert">
          {error}
          <Button variant="outline" onClick={load}>重試</Button>
        </div>
      )}
      <div className="today-board">
        {cards.map((c) => (
          <button key={c.key} className={'today-card' + (c.count > 0 ? ' has-items' : '') + (c.tone ? ' ' + c.tone : '')} onClick={() => navigate(c.view)}>
            <div className="today-card-head">
              <span>{c.title}</span>
              {c.icon}
            </div>
            <b>
              {fmt(c.count)}
              <small>{c.key === 'unbilled' ? '張' : c.key === 'drawing' || c.key === 'dispatch' ? '筆' : '張'}</small>
            </b>
            <p>
              {c.hint}
              <ArrowUpRight size={15} />
            </p>
          </button>
        ))}
      </div>
      <div className="workflow today-flow">
        <b>① 進貨</b>→<b>② 派工（即開工，印標籤給師傅）</b>→<b>③ 出貨（即完工，印四聯單）</b>→<b>④ 月結（代工費用報表）</b>
      </div>
    </div>
  );
}
