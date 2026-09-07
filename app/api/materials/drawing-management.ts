import {database} from '@/db/raw';
import {z} from 'zod';
import {drawingInput,validateDrawingRaw} from './drawing-validation';
const text=z.string().trim().min(1).max(200);
export async function manageDrawing(b:Record<string,any>,req:Request){if(!['edit_drawing','drawing_status'].includes(b.action))return null;
 const db=database(req),id=b.request_id,actor=decodeURIComponent(req.headers.get('oai-authenticated-user-id')||'');if(!actor)throw Error('請重新登入以記錄修改人員');
 if(await db.prepare('SELECT id FROM drawing_audit WHERE id=?').bind(id).first())return {ok:true,id};
 const p=z.object({id:text,expected_revision:z.number().int().positive(),reason:text}).parse(b);
 const old=await db.prepare('SELECT * FROM drawings WHERE id=?').bind(p.id).first<any>();if(!old)throw Error('找不到圖面');
 let next={...old,revision:old.revision+1};
 if(b.action==='edit_drawing'){const v=z.object({number:text,version:text,data:drawingInput}).parse(b);next={...next,number:v.number,version:v.version,data:JSON.stringify(v.data)};const specs=(await db.prepare('SELECT data FROM material_specs WHERE id=? OR id IN(SELECT spec_id FROM drawing_specs WHERE drawing_id=?)').bind(old.spec_id,old.id).all()).results as {data:string}[];for(const s of specs)validateDrawingRaw(v.data,JSON.parse(s.data));}
 else next.disabled=z.boolean().parse(b.disabled)?1:0;
 const guard=b.action==='edit_drawing'?" AND used=0 AND NOT EXISTS(SELECT 1 FROM intakes WHERE drawing_id=drawings.id) AND NOT EXISTS(SELECT 1 FROM intake_allocations WHERE drawing_id=drawings.id)":"";
 const stamp=new Date().toISOString();await db.batch([
 db.prepare(`INSERT INTO drawing_audit(id,drawing_id,stamp,actor,reason,action,before,after) SELECT ?,id,?,?,?,?,?,? FROM drawings WHERE id=? AND revision=?${guard}`).bind(id,stamp,JSON.stringify({id:actor,email:decodeURIComponent(req.headers.get('oai-authenticated-user-email')||'')||''}),p.reason,b.action,JSON.stringify(old),JSON.stringify(next),p.id,p.expected_revision),
 db.prepare('UPDATE drawings SET number=?,version=?,data=?,disabled=?,revision=? WHERE id=? AND EXISTS(SELECT 1 FROM drawing_audit WHERE id=?)').bind(next.number,next.version,next.data,next.disabled,next.revision,p.id,id)]);
 if(!await db.prepare('SELECT id FROM drawing_audit WHERE id=?').bind(id).first())throw Error('圖面已被使用或內容已變更，請重新整理；已使用圖面請另存版本');return {ok:true,id};
}
