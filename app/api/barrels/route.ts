import {database} from '@/db/raw';
import {z} from 'zod';
const count=z.number().int().min(0).max(10000000);
const day=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v);
export async function GET(){try{const db=database();const [entries,audit]=await db.batch([db.prepare('SELECT e.*,p.name AS customer,d.voided AS document_voided FROM barrel_entries e JOIN partners p ON p.id=e.customer_id LEFT JOIN documents d ON d.id=e.document_id ORDER BY e.date,e.rowid'),db.prepare('SELECT * FROM barrel_audit ORDER BY stamp DESC')]);return Response.json({entries:entries.results,audit:audit.results},{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'鐵桶帳讀取失敗，請重試'},{status:503})}}
export async function POST(req:Request){try{
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'請從本站操作'},{status:403});
 const b=z.object({action:z.enum(['manual','edit','void']),request_id:z.string().uuid()}).passthrough().parse(await req.json());const db=database(req);const stamp=new Date().toISOString();
 if(await db.prepare('SELECT id FROM barrel_audit WHERE id=?').bind(b.request_id).first())return Response.json({ok:true});
 if(b.action==='manual'){
 const p=z.object({customer_id:z.string().min(1),date:day,kind:z.enum(['empty_in','empty_out','opening']),incoming:count,outgoing:count,note:z.string().max(2000)}).parse(b);
 if(!await db.prepare("SELECT id FROM partners WHERE id=? AND kind='customer'").bind(p.customer_id).first())throw Error('請選擇客戶');
 if((!p.incoming&&!p.outgoing)||(p.incoming&&p.outgoing)||p.kind==='empty_in'&&p.outgoing||p.kind==='empty_out'&&p.incoming)throw Error('請填單一方向的桶數');
 const number=`桶-${p.date.replaceAll('-','')}-${b.request_id.slice(0,8).toUpperCase()}`;
 await db.batch([db.prepare('INSERT INTO barrel_entries (id,customer_id,number,date,kind,incoming,outgoing,note) VALUES (?,?,?,?,?,?,?,?)').bind(b.request_id,p.customer_id,number,p.date,p.kind,p.incoming,p.outgoing,p.note),db.prepare('INSERT INTO barrel_audit (id,entry_id,stamp,before,after,reason) VALUES (?,?,?,NULL,?,?)').bind(b.request_id,b.request_id,stamp,JSON.stringify({...p,number,voided:0}),'新增登記')]);
 }else{
 const p=z.object({id:z.string().min(1),version:z.number().int().positive(),incoming:count,outgoing:count,date:day,note:z.string().max(2000),reason:z.string().trim().min(1).max(500)}).parse(b);
 const old=await db.prepare('SELECT * FROM barrel_entries WHERE id=?').bind(p.id).first<any>();if(!old||old.version!==p.version||old.voided)throw Error('紀錄已變更或作廢，請重新整理');
 if(p.incoming&&p.outgoing||['in','empty_in'].includes(old.kind)&&p.outgoing||['out','empty_out'].includes(old.kind)&&p.incoming)throw Error('進出方向不符');
 if(old.document_id&&p.date!==old.date)throw Error('隨貨紀錄日期依原單，不能獨立修改');
 if(old.document_id&&b.action==='void'){
 const doc=await db.prepare('SELECT * FROM documents WHERE id=?').bind(old.document_id).first<any>();
 if(doc.invoice_id)throw Error('已請款出貨單不能直接作廢');
 if(await db.prepare('SELECT id FROM intakes WHERE document_id=? AND dispatched=1').bind(old.document_id).first())throw Error('已派工進貨單不能直接作廢');
 }
 const next={...old,date:p.date,incoming:p.incoming,outgoing:p.outgoing,note:p.note,version:old.version+1,voided:b.action==='void'?1:0};
 // Version claim and dependent writes are one atomic batch. An audit row is the claim token.
 const stmts=[db.prepare('INSERT INTO barrel_audit (id,entry_id,stamp,before,after,reason) SELECT ?,id,?,?,?,? FROM barrel_entries WHERE id=? AND version=? AND voided=0 AND (?=0 OR document_id IS NULL OR (EXISTS(SELECT 1 FROM documents d WHERE d.id=barrel_entries.document_id AND d.invoice_id IS NULL) AND NOT EXISTS(SELECT 1 FROM intakes i WHERE i.document_id=barrel_entries.document_id AND i.dispatched=1)))').bind(b.request_id,stamp,JSON.stringify(old),JSON.stringify(next),p.reason,p.id,p.version,b.action==='void'?1:0),db.prepare('UPDATE barrel_entries SET date=?,incoming=?,outgoing=?,note=?,version=version+1,voided=? WHERE id=? AND EXISTS(SELECT 1 FROM barrel_audit WHERE id=?)').bind(next.date,next.incoming,next.outgoing,next.note,next.voided,p.id,b.request_id)];
 if(old.document_id){stmts.push(db.prepare('UPDATE documents SET barrels=?,voided=? WHERE id=? AND EXISTS(SELECT 1 FROM barrel_audit WHERE id=?)').bind(b.action==='void'?0:p.incoming+p.outgoing,next.voided,old.document_id,b.request_id));if(b.action==='void')stmts.push(db.prepare("UPDATE work_orders SET shipped=shipped-(SELECT CAST(json_extract(lines,'$[0].qty') AS INTEGER) FROM documents WHERE id=?) WHERE id=(SELECT work_order_id FROM documents WHERE id=?) AND EXISTS(SELECT 1 FROM barrel_audit WHERE id=?)").bind(old.document_id,old.document_id,b.request_id))}
 const result=await db.batch(stmts);if(!result[0].meta.changes)throw Error('紀錄已被修改，請重新整理');
 }
 return Response.json({ok:true});
 }catch(e){return Response.json({error:e instanceof z.ZodError?'請檢查日期、桶數及修改原因':e instanceof Error&&!/SQLITE|D1/i.test(e.message)?e.message:'儲存失敗，請重試'},{status:400})}}
