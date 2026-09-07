import {database} from '@/db/raw';
import {storage} from '@/storage';
import {z} from 'zod';
import {drawingInput} from '@/app/api/materials/drawing-validation';
import {batchDrawingDraft,drawingRowError} from '@/app/batch-drawing-types';
const bucket=()=>storage;
export async function GET(){try{const r=await database().prepare("SELECT data,updated_at FROM material_drafts WHERE id='drawing-batch'").first<{data:string;updated_at:string}>();return Response.json({draft:r?{data:JSON.parse(r.data),updated_at:r.updated_at}:null},{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'圖面草稿無法讀取'},{status:503})}}
export async function POST(req:Request){const uploaded:string[]=[];try{
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'請從本站操作'},{status:403});
 const form=await req.formData(),p=z.object({request_id:z.string().uuid(),mode:z.enum(['draft','commit']),draft:batchDrawingDraft}).parse(JSON.parse(String(form.get('payload'))));
 const db=database(req),resultId='drawing-batch-result:'+p.request_id;
 const prior=await db.prepare('SELECT data FROM material_drafts WHERE id=?').bind(resultId).first<{data:string}>();if(prior)return Response.json(JSON.parse(prior.data));
 if(new Set(p.draft.rows.map(r=>r.key)).size!==p.draft.rows.length)throw Error('草稿列識別重複，請重新載入');
 const old=await db.prepare("SELECT data FROM material_drafts WHERE id='drawing-batch'").first<{data:string}>();const oldRows=old?batchDrawingDraft.parse(JSON.parse(old.data)).rows:[];
 // Reuse only a saved draft attachment or an attachment verified against its source drawing.
 let total=0;for(const r of p.draft.rows){const file=form.get('file:'+r.key);if(file instanceof File&&file.size){total+=file.size;if(file.size>5*1024*1024||total>20*1024*1024||!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type))throw Error('每個圖檔限 5 MB，整批限 20 MB；可用 PDF、JPG、PNG、WebP')}else if(r.file&&!oldRows.some(o=>o.file?.key===r.file!.key)){const source=r.source_drawing_id?await db.prepare('SELECT file_key,file_name,file_type FROM drawings WHERE id=? AND customer_id=?').bind(r.source_drawing_id,p.draft.customer_id).first<{file_key:string;file_name:string;file_type:string}>():null;if(!source||source.file_key!==r.file.key)throw Error('圖檔來源已失效，請重新選擇圖檔');r.file={key:source.file_key,name:source.file_name,type:source.file_type}}}
 const specs=(await db.prepare('SELECT id,data FROM material_specs').all()).results.map((s:any)=>({...s,data:JSON.parse(s.data)}));
 const ds=(await db.prepare('SELECT * FROM drawings').all()).results as any[],links=(await db.prepare('SELECT * FROM drawing_specs').all()).results as any[];
 const existing=ds.map(d=>({...d,spec_ids:[d.spec_id,...links.filter(l=>l.drawing_id===d.id).map(l=>l.spec_id)]}));
 const ready=p.mode==='commit'?p.draft.rows.filter(r=>!drawingRowError(r,specs,existing,p.draft.customer_id)):[];
 if(p.mode==='commit'&&!ready.length)throw Error('沒有可建立的完整圖面');
 if(p.mode==='commit'&&!await db.prepare("SELECT id FROM partners WHERE id=? AND kind='customer'").bind(p.draft.customer_id).first())throw Error('請選擇有效客戶');
 const pairs=new Set<string>();for(const r of ready)for(const sid of r.spec_ids){const k=JSON.stringify([r.number.trim(),r.version.trim(),sid]);if(pairs.has(k))throw Error('草稿中有重複圖號／版本／來料，請合併適用來料或移除重複列');pairs.add(k)}
 for(const r of p.draft.rows){const file=form.get('file:'+r.key);if(file instanceof File&&file.size){const key=`drawing-batches/${p.request_id}/${r.key}/${crypto.randomUUID()}`;await bucket().put(key,await file.arrayBuffer(),{httpMetadata:{contentType:file.type}});uploaded.push(key);r.file={key,name:file.name,type:file.type}}}
 const stamp=new Date().toISOString(),readyIds=new Set(ready.map(r=>r.key)),remaining={...p.draft,rows:p.draft.rows.filter(r=>!readyIds.has(r.key))};
 const pref=new Map<string,string>();for(const r of ready)if(r.preferred)for(const sid of r.spec_ids)pref.set(sid,r.key);
 const rows=ready.map(r=>({...r,data:drawingInput.parse(r.data),customer_id:p.draft.customer_id,number:r.number.trim(),version:r.version.trim(),spec_id:r.spec_ids[0],preferred:pref.get(r.spec_ids[0])===r.key?1:0,file_key:r.file?.key||null,file_name:r.file?.name||null,file_type:r.file?.type||null}));
 const mapping=ready.flatMap(r=>[...new Set(r.spec_ids)].slice(1).map(sid=>({id:r.key+':'+sid,drawing_id:r.key,spec_id:sid,preferred:pref.get(sid)===r.key?1:0})));
 const response={ok:true,created:ready.length,draft:{data:p.mode==='commit'?remaining:p.draft,updated_at:stamp}};
 const stmts=[];
 if(ready.length){const ids=JSON.stringify([...pref.keys()]);stmts.push(db.prepare('UPDATE drawings SET preferred=0 WHERE customer_id=? AND spec_id IN (SELECT value FROM json_each(?))').bind(p.draft.customer_id,ids),db.prepare('UPDATE drawing_specs SET preferred=0 WHERE drawing_id IN (SELECT id FROM drawings WHERE customer_id=?) AND spec_id IN (SELECT value FROM json_each(?))').bind(p.draft.customer_id,ids),db.prepare("INSERT INTO drawings(id,customer_id,spec_id,number,version,data,preferred,file_key,file_name,file_type) SELECT json_extract(value,'$.key'),json_extract(value,'$.customer_id'),json_extract(value,'$.spec_id'),json_extract(value,'$.number'),json_extract(value,'$.version'),json_extract(value,'$.data'),json_extract(value,'$.preferred'),json_extract(value,'$.file_key'),json_extract(value,'$.file_name'),json_extract(value,'$.file_type') FROM json_each(?)").bind(JSON.stringify(rows)),db.prepare("INSERT INTO drawing_specs(id,drawing_id,spec_id,preferred) SELECT json_extract(value,'$.id'),json_extract(value,'$.drawing_id'),json_extract(value,'$.spec_id'),json_extract(value,'$.preferred') FROM json_each(?)").bind(JSON.stringify(mapping)))}
 stmts.push(db.prepare("INSERT INTO material_drafts(id,data,updated_at) VALUES ('drawing-batch',?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at").bind(JSON.stringify(response.draft.data),stamp),db.prepare('INSERT INTO material_drafts(id,data,updated_at) VALUES (?,?,?)').bind(resultId,JSON.stringify(response),stamp));
 await db.batch(stmts);return Response.json(response);
 }catch(e){for(const key of uploaded)try{await bucket().delete(key)}catch{}console.error(e);return Response.json({error:e instanceof z.ZodError?'請檢查草稿欄位，整批最多 25 張圖面。':e instanceof Error&&!/D1|SQLITE|constraint/i.test(e.message)?e.message:'建立未完成，可能有重複圖面；請重新整理後核對。'},{status:400})}}
