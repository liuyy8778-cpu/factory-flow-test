import {stampTaipei} from '@/lib/dates';
import {drawingSummary,drawingReady} from '@/app/drawing-types';
import {database} from '@/db/raw';
import {z} from 'zod';
import {specLabel} from '@/app/material-types';
const text=z.string().trim().min(1).max(200);
const day=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v);
export async function allocationAction(b:Record<string,any>,req:Request){
 const db=database(req),stamp=new Date().toISOString(),id=b.request_id;
 if(b.action==='replace_material'){
 const p=z.object({id:text,spec_id:text,reason:text,expected_spec_id:text}).parse(b);
 const actor=decodeURIComponent(req.headers.get('oai-authenticated-user-id')||'');if(!actor)throw Error('請重新登入後再修改，才能記錄修改人員');
 if(await db.prepare('SELECT id FROM intake_audit WHERE id=?').bind(id).first())return {ok:true,id};
 const i=await db.prepare('SELECT i.*,d.lines AS document_lines FROM intakes i JOIN documents d ON d.id=i.document_id WHERE i.id=? AND d.voided=0').bind(p.id).first<any>();
 const spec=await db.prepare('SELECT * FROM material_specs WHERE id=?').bind(p.spec_id).first<any>();
 if(!i||!spec)throw Error('找不到來料或規格');if(i.spec_id===p.spec_id)throw Error('請選擇不同的料');
 const lines=JSON.parse(i.document_lines),raw=JSON.parse(spec.data);if(!lines[i.position])throw Error('原單明細位置不符，請重新整理');
 lines[i.position]={...lines[i.position],material:raw.material,name:raw.name,diameter:raw.raw_diameter,spec:specLabel(raw)};
 await db.batch([
 db.prepare(`INSERT INTO intake_audit (id,intake_id,stamp,actor,reason,before,after) SELECT ?,i.id,?,?,?,?,? FROM intakes i JOIN documents d ON d.id=i.document_id WHERE i.id=? AND i.spec_id=? AND i.dispatched=0 AND d.voided=0 AND d.lines=? AND NOT EXISTS(SELECT 1 FROM intake_allocations a WHERE a.intake_id=i.id) AND NOT EXISTS(SELECT 1 FROM work_orders w WHERE w.intake_id=i.id)`).bind(id,stamp,JSON.stringify({id:actor,email:decodeURIComponent(req.headers.get('oai-authenticated-user-email')||'')||''}),p.reason,i.material_snapshot,spec.data,p.id,p.expected_spec_id,i.document_lines),
 db.prepare('UPDATE intakes SET spec_id=?,material_snapshot=?,drawing_id=NULL,drawing_snapshot=NULL WHERE id=? AND EXISTS(SELECT 1 FROM intake_audit WHERE id=?)').bind(p.spec_id,spec.data,p.id,id),
 db.prepare('UPDATE documents SET lines=? WHERE id=? AND EXISTS(SELECT 1 FROM intake_audit WHERE id=?)').bind(JSON.stringify(lines),i.document_id,id)]);
 if(!await db.prepare('SELECT id FROM intake_audit WHERE id=?').bind(id).first())throw Error('資料已變更或已分配加工；請先取消尚未派工的分配，再更換料');
 return {ok:true,id};
 }
 if(b.action==='allocate'){
 const p=z.object({id:text,drawing_id:text,quantity:z.number().int().positive().max(10000000),fee:z.number().nonnegative().max(10000000),due:day}).parse(b);
 if(await db.prepare('SELECT id FROM intake_allocations WHERE id=?').bind(id).first())return {ok:true,id};
 const i=await db.prepare('SELECT i.*,d.date FROM intakes i JOIN documents d ON d.id=i.document_id WHERE i.id=? AND d.voided=0').bind(p.id).first<any>();if(!i||p.due<i.date)throw Error('請核對來料與交期');
 const dr=await db.prepare('SELECT * FROM drawings WHERE disabled=0 AND id=? AND customer_id=? AND (spec_id=? OR EXISTS(SELECT 1 FROM drawing_specs ds WHERE ds.drawing_id=drawings.id AND ds.spec_id=?))').bind(p.drawing_id,i.customer_id,i.spec_id,i.spec_id).first<any>();if(!dr)throw Error('圖面必須對應本批客戶與來料');
 if(!drawingReady(JSON.parse(dr.data)))throw Error('圖面兩端尚待確認，請確認後另存版本再分配');
 const snapshot=JSON.stringify({...JSON.parse(dr.data),id:dr.id,number:dr.number,version:dr.version,file_name:dr.file_name});
 const result=await db.prepare(`INSERT INTO intake_allocations(id,intake_id,drawing_id,drawing_snapshot,quantity,fee,due,created_at) SELECT ?,i.id,?,?,?,?,?,? FROM intakes i JOIN documents d ON d.id=i.document_id WHERE i.id=? AND i.spec_id=? AND d.voided=0 AND NOT EXISTS(SELECT 1 FROM work_orders w WHERE w.intake_id=i.id AND w.allocation_id IS NULL) AND i.quantity-COALESCE((SELECT SUM(a.quantity) FROM intake_allocations a WHERE a.intake_id=i.id),0)>=?`).bind(id,dr.id,snapshot,p.quantity,Math.round(p.fee*100),p.due,stamp,p.id,i.spec_id,p.quantity).run();
 if(!result.meta.changes)throw Error('分配數量超過未分配數量，或本筆已用舊方式全部派工，請重新整理');return {ok:true,id};
 }
 if(b.action==='remove_allocation'){
 const p=z.object({id:text}).parse(b);const r=await db.prepare('DELETE FROM intake_allocations WHERE id=? AND NOT EXISTS(SELECT 1 FROM work_orders WHERE allocation_id=?)').bind(p.id,p.id).run();if(!r.meta.changes)throw Error('此分配已派工或已移除，請重新整理');return {ok:true,id};
 }
 if(b.action==='dispatch_allocation'){
 const p=z.object({id:text,machine:text,operator:text}).parse(b);
 const existing=await db.prepare('SELECT id FROM work_orders WHERE allocation_id=?').bind(p.id).first<any>();if(existing)return {ok:true,id:existing.id};
 const a=await db.prepare('SELECT a.*,i.customer_id,i.material_snapshot,i.document_id,d.date FROM intake_allocations a JOIN intakes i ON i.id=a.intake_id JOIN documents d ON d.id=i.document_id WHERE a.id=? AND d.voided=0').bind(p.id).first<any>();if(!a)throw Error('找不到可派工的分配');
 const raw=JSON.parse(a.material_snapshot),dr=JSON.parse(a.drawing_snapshot);if(!drawingReady(dr))throw Error('圖面兩端尚待確認，不能派工');
 await db.batch([
 db.prepare(`INSERT INTO sales_orders(id,number,partner_id,date,due,product,spec,quantity,unit,price,note) SELECT ?,?,?,?,?,?,?,?,'支',?,? WHERE EXISTS(SELECT 1 FROM intake_allocations a JOIN intakes i ON i.id=a.intake_id JOIN documents d ON d.id=i.document_id WHERE a.id=? AND d.voided=0) AND NOT EXISTS(SELECT 1 FROM work_orders WHERE allocation_id=?)`).bind(id,`SRC-${id}`,a.customer_id,a.date,a.due,raw.name,`${raw.drive} × ${raw.size} × ${raw.profile} · ${drawingSummary(dr)}`,a.quantity,a.fee,`圖號 ${dr.number} / ${dr.version}；${dr.note||''}`,a.id,a.id),
 db.prepare(`INSERT INTO work_orders(id,number,order_id,machine,operator,status,good,defective,shipped,intake_id,allocation_id) SELECT ?,?,?,?,?, 'pending',0,0,0,?,? WHERE EXISTS(SELECT 1 FROM sales_orders WHERE id=?)`).bind(id,`WO-${stampTaipei()}-${id.slice(0,8).toUpperCase()}`,id,p.machine,p.operator,a.intake_id,a.id,id),
 db.prepare('UPDATE intakes SET dispatched=1 WHERE id=? AND EXISTS(SELECT 1 FROM work_orders WHERE id=?)').bind(a.intake_id,id)]);
 if(!await db.prepare('SELECT id FROM work_orders WHERE id=?').bind(id).first())throw Error('分配已變更，請重新整理');return {ok:true,id};
 }
 return null;
}
