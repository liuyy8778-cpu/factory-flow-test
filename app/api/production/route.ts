import {stampTaipei} from '@/lib/dates';
import {barrelStatements} from '../barrels-helper';
import { database } from '@/db/raw';
import { z } from 'zod';
const text = z.string().trim().min(1).max(200);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v);
const count = z.number().int().min(0).max(10000000);
const optionalText = z.string().trim().max(2000);

export async function GET() {
  try {
    const db = database();
    const [orders, jobs, reports] = await db.batch([
      db.prepare(`SELECT s.*, p.name AS customer, w.id AS work_order_id, w.number AS work_number,
        w.status AS work_status, w.good, w.shipped FROM sales_orders s
        JOIN partners p ON p.id=s.partner_id LEFT JOIN work_orders w ON w.order_id=s.id WHERE w.intake_id IS NULL ORDER BY s.rowid DESC`),
      db.prepare(`SELECT w.*, s.number AS order_number, s.partner_id, s.product, s.spec, s.quantity,
        s.unit, s.price, s.due, s.note AS order_note, p.name AS customer, i.quantity AS intake_quantity, i.material_snapshot,COALESCE(a.drawing_snapshot,i.drawing_snapshot) AS drawing_snapshot,doc.number AS receipt_number FROM work_orders w
        JOIN sales_orders s ON s.id=w.order_id JOIN partners p ON p.id=s.partner_id LEFT JOIN intake_allocations a ON a.id=w.allocation_id LEFT JOIN intakes i ON i.id=w.intake_id LEFT JOIN documents doc ON doc.id=i.document_id ORDER BY w.rowid DESC`),
      db.prepare('SELECT * FROM production_reports ORDER BY rowid DESC'),
    ]);
    return Response.json({orders:orders.results, jobs:jobs.results.map((x:any)=>({...x,material_snapshot:x.material_snapshot?JSON.parse(x.material_snapshot):null,drawing_snapshot:x.drawing_snapshot?JSON.parse(x.drawing_snapshot):null})), reports:reports.results}, {headers:{'Cache-Control':'no-store'}});
  } catch(e) {
    console.error(e);
    return Response.json({error:'生產資料暫時無法讀取，請稍後重試。'}, {status:503});
  }
}

export async function POST(req: Request) {
  try {
    if(req.headers.get('origin') && req.headers.get('origin') !== new URL(req.url).origin) return Response.json({error:'請從本站操作'}, {status:403});
    const b = z.object({action:z.string(),request_id:z.string()}).passthrough().parse(await req.json());
    const db = database(req);
    // One key per form submission makes a retry safe after a lost response.
    const id = z.string().uuid().parse(b.request_id);
    const stamp = new Date().toISOString();
    const number = (prefix:string) => `${prefix}-${stampTaipei()}-${id.slice(0,8).toUpperCase()}`;
    let resultId = id;
    if(b.action === 'order') {
      const p = z.object({partner_id:text,date:day,due:day,product:text,spec:optionalText,quantity:count.refine(v=>v>0),unit:text,price:z.number().nonnegative().max(10000000),note:optionalText}).parse(b);
      if(p.due<p.date) throw Error('交期不能早於訂單日期');
      const customer = await db.prepare("SELECT id FROM partners WHERE id=? AND kind='customer'").bind(p.partner_id).first();
      if(!customer) throw Error('請先建立並選擇客戶');
      await db.prepare('INSERT OR IGNORE INTO sales_orders (id,number,partner_id,date,due,product,spec,quantity,unit,price,note) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
        .bind(id,number('SO'),p.partner_id,p.date,p.due,p.product,p.spec,p.quantity,p.unit,Math.round(p.price*100),p.note).run();
    } else if(b.action === 'work_order') {
      const p = z.object({order_id:text,machine:z.string().trim().max(200),operator:z.string().trim().max(200)}).parse(b);
      if(!await db.prepare('SELECT id FROM sales_orders WHERE id=?').bind(p.order_id).first()) throw Error('找不到訂單，請重新整理');
      await db.prepare("INSERT OR IGNORE INTO work_orders (id,number,order_id,machine,operator,status,good,defective,shipped) VALUES (?,?,?,?,?,'pending',0,0,0)")
        .bind(id,number('WO'),p.order_id,p.machine,p.operator).run();
      const row = await db.prepare('SELECT id FROM work_orders WHERE order_id=?').bind(p.order_id).first<{id:string}>();
      if(!row) throw Error('工單建立失敗，請重試');
      resultId = row.id;
    } else if(b.action === 'assign') {
      const p = z.object({id:text,machine:text,operator:text}).parse(b);
      const r = await db.prepare("UPDATE work_orders SET machine=?,operator=? WHERE id=? AND status IN ('pending','paused')").bind(p.machine,p.operator,p.id).run();
      if(!r.meta.changes) throw Error('只有待開工或暫停中的工單可以重新派工');
    } else if(b.action === 'state') {
      const p = z.object({id:text,state:z.enum(['running','paused','completed'])}).parse(b);
      const job = await db.prepare('SELECT status FROM work_orders WHERE id=?').bind(p.id).first<{status:string}>();
      if(job?.status===p.state) return Response.json({ok:true,id:p.id});
      let sql:string;
      let values: (string|number)[];
      if(p.state==='running') {
        sql="UPDATE work_orders SET status='running',started_at=COALESCE(started_at,?) WHERE id=? AND status IN ('pending','paused') AND machine<>'' AND operator<>''";
        values=[stamp,p.id];
      } else if(p.state==='paused') {
        sql="UPDATE work_orders SET status='paused' WHERE id=? AND status='running'";
        values=[p.id];
      } else {
        sql="UPDATE work_orders SET status='completed',completed_at=? WHERE id=? AND status IN ('running','paused') AND good=(SELECT quantity FROM sales_orders WHERE id=work_orders.order_id)";
        values=[stamp,p.id];
      }
      const r=await db.prepare(sql).bind(...values).run();
      if(!r.meta.changes) throw Error(p.state==='completed'?'良品須達訂單數量，才能完工；請重新確認工單狀態。':'工單狀態已改變，或尚未指定機台與人員，請重新整理。');
    } else if(b.action === 'report') {
      const p=z.object({id:text,good:count,defective:count,note:optionalText}).parse(b);
      if(!p.good&&!p.defective) throw Error('請至少回報一件良品或不良品');
      if(await db.prepare('SELECT id FROM production_reports WHERE id=?').bind(id).first()) return Response.json({ok:true,id});
      // Guard and increments are in a single transactional batch. Quantity is good-piece target.
      await db.batch([
        db.prepare(`INSERT INTO production_reports (id,work_order_id,reported_at,operator,good,defective,note)
          SELECT ?,w.id,?,w.operator,?,?,? FROM work_orders w JOIN sales_orders s ON s.id=w.order_id
          WHERE w.id=? AND w.status='running' AND w.good+?<=s.quantity`)
          .bind(id,stamp,p.good,p.defective,p.note,p.id,p.good),
        db.prepare('UPDATE work_orders SET good=good+?,defective=defective+? WHERE id=? AND EXISTS(SELECT 1 FROM production_reports WHERE id=?)')
          .bind(p.good,p.defective,p.id,id),
      ]);
      if(!await db.prepare('SELECT id FROM production_reports WHERE id=?').bind(id).first()) throw Error('工單須在加工中，且累計良品不可超過訂單數量');
    } else if(b.action === 'ship') {
      const p=z.object({id:text,date:day,barrels:count.default(0),packages:count.default(0),package_unit:z.enum(['包','桶']).default('包'),quantity:count.refine(v=>v>0),tax_rate:z.number().min(0).max(100),note:optionalText}).parse(b);
      if(await db.prepare('SELECT id FROM documents WHERE id=?').bind(id).first()) return Response.json({ok:true,id});
      const job=await db.prepare(`SELECT w.*,s.partner_id,s.product,s.spec,s.unit,s.price FROM work_orders w JOIN sales_orders s ON s.id=w.order_id WHERE w.id=?`).bind(p.id).first<Record<string,any>>();
      if(!job) throw Error('找不到工單');
      const subtotal=p.quantity*job.price;
      const tax=Math.round(subtotal*p.tax_rate/100);
      if(!Number.isSafeInteger(subtotal+tax)||subtotal+tax>1e14) throw Error('金額超出可記錄範圍');
      const lines=JSON.stringify([{name:job.product,spec:job.spec,qty:p.quantity,unit:job.unit,packages:p.packages,package_unit:p.package_unit,price:job.price/100}]);
      await db.batch([
        db.prepare(`INSERT INTO documents (id,number,kind,partner_id,date,lines,subtotal,tax,total,note,work_order_id,customer_id,barrels)
          SELECT ?,?,'out',?,?,?,?,?,?,?,id,?,? FROM work_orders WHERE id=? AND status='completed' AND shipped+?<=good`)
          .bind(id,number('OUT'),job.partner_id,p.date,lines,subtotal,tax,subtotal+tax,p.note,job.partner_id,p.barrels,p.id,p.quantity),
        db.prepare('UPDATE work_orders SET shipped=shipped+? WHERE id=? AND EXISTS(SELECT 1 FROM documents WHERE id=?)').bind(p.quantity,p.id,id),...barrelStatements(id,job.partner_id,p.date,p.barrels,'out')
      ]);
      if(!await db.prepare('SELECT id FROM documents WHERE id=?').bind(id).first()) throw Error('工單須已完工，且出貨數量不可超過尚未出貨良品');
    } else if(b.action === 'complete_ship') {
      // 簡易流程：出貨即完工。出貨數量 = 最終良品數，派工數量減出貨數的差額記為不良／短少。
      const p=z.object({id:text,date:day,barrels:count.default(0),packages:count.default(0),package_unit:z.enum(['包','桶']).default('包'),quantity:count.refine(v=>v>0),tax_rate:z.number().min(0).max(100),note:optionalText}).parse(b);
      if(await db.prepare('SELECT id FROM documents WHERE id=?').bind(id).first()) return Response.json({ok:true,id});
      const job=await db.prepare(`SELECT w.*,s.partner_id,s.product,s.spec,s.unit,s.price,s.quantity AS order_quantity FROM work_orders w JOIN sales_orders s ON s.id=w.order_id WHERE w.id=?`).bind(p.id).first<Record<string,any>>();
      if(!job) throw Error('找不到工單');
      if(job.status==='completed') throw Error('這張工單已完工，請改用「轉出貨單」');
      if(job.shipped+p.quantity>job.order_quantity) throw Error('出貨數量不可超過派工數量減已出貨數');
      const subtotal=p.quantity*job.price;
      const tax=Math.round(subtotal*p.tax_rate/100);
      if(!Number.isSafeInteger(subtotal+tax)||subtotal+tax>1e14) throw Error('金額超出可記錄範圍');
      const lines=JSON.stringify([{name:job.product,spec:job.spec,qty:p.quantity,unit:job.unit,packages:p.packages,package_unit:p.package_unit,price:job.price/100}]);
      const reportId=id+':complete';
      await db.batch([
        db.prepare(`INSERT INTO production_reports (id,work_order_id,reported_at,operator,good,defective,note)
          SELECT ?,w.id,?,w.operator,?,s.quantity-w.shipped-?,'出貨即完工' FROM work_orders w JOIN sales_orders s ON s.id=w.order_id
          WHERE w.id=? AND w.status IN ('pending','running','paused') AND w.shipped+?<=s.quantity`)
          .bind(reportId,stamp,p.quantity,p.quantity,p.id,p.quantity),
        db.prepare(`UPDATE work_orders SET good=shipped+?,defective=(SELECT quantity FROM sales_orders WHERE id=work_orders.order_id)-shipped-?,status='completed',started_at=COALESCE(started_at,?),completed_at=? WHERE id=? AND EXISTS(SELECT 1 FROM production_reports WHERE id=?)`)
          .bind(p.quantity,p.quantity,stamp,stamp,p.id,reportId),
        db.prepare(`INSERT INTO documents (id,number,kind,partner_id,date,lines,subtotal,tax,total,note,work_order_id,customer_id,barrels)
          SELECT ?,?,'out',?,?,?,?,?,?,?,id,?,? FROM work_orders WHERE id=? AND status='completed' AND shipped+?<=good`)
          .bind(id,number('OUT'),job.partner_id,p.date,lines,subtotal,tax,subtotal+tax,p.note,job.partner_id,p.barrels,p.id,p.quantity),
        db.prepare('UPDATE work_orders SET shipped=shipped+? WHERE id=? AND EXISTS(SELECT 1 FROM documents WHERE id=?)').bind(p.quantity,p.id,id),...barrelStatements(id,job.partner_id,p.date,p.barrels,'out')
      ]);
      if(!await db.prepare('SELECT id FROM documents WHERE id=?').bind(id).first()) throw Error('工單狀態已改變，或出貨數量超過派工數量，請重新整理');
    } else throw Error('不支援此操作');
    return Response.json({ok:true,id:resultId});
  } catch(e) {
    console.error(e);
    return Response.json({error:e instanceof z.ZodError?'請檢查必填欄位、日期及整數數量。':e instanceof Error&&!/D1|SQLITE|constraint/i.test(e.message)?e.message:'儲存未完成，請重新整理確認，或重試原操作。'}, {status:400});
  }
}
