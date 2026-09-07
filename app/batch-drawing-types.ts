import {grooveDraft,grooveError} from './groove-types';
import {z} from 'zod';
import {drawingInput,validateDrawingRaw} from './api/materials/drawing-validation';
import {drawingReady,editDrawing} from './drawing-types';
const str=z.string().max(200),short=z.string().max(2000);
const end=z.object({mode:z.enum(['pending','unchanged','machine']),diameter:str,cut_length:str,diameter_tolerance:str,cut_length_tolerance:str});
export const batchDrawingDraft=z.object({customer_id:str,rows:z.array(z.object({key:z.string().uuid(),source_drawing_id:str.optional(),spec_ids:z.array(str).max(100),number:str,version:str,preferred:z.boolean(),data:z.object({format:z.literal('ends-v1'),groove:grooveDraft.optional(),operation_code:z.string().max(50).optional(),length:str,length_tolerance:str,note:short,ends:z.object({drive:end,work:end})}),file:z.object({key:str,name:str,type:str}).nullable().optional()})).max(25)});
export type DrawingDraft=z.infer<typeof batchDrawingDraft>;
export type DrawingRow=DrawingDraft['rows'][number];
export function newDrawingRow(ids:string[]):DrawingRow{return {key:crypto.randomUUID(),spec_ids:ids,number:'',version:'A',preferred:true,data:editDrawing({}),file:null}}
export function drawingRowError(row:DrawingRow,specs:Record<string,any>[],existing:Record<string,any>[],customer:string){
 if(!customer)return '請選客戶';if(!row.number.trim())return '缺圖號';if(!row.version.trim())return '缺版本';if(!row.spec_ids.length)return '未選適用來料';
 const parsed=drawingInput.safeParse(row.data);if(!parsed.success)return '請補齊尺寸與公差';if(grooveError(row.data.groove,row.data.length))return grooveError(row.data.groove,row.data.length);if(!drawingReady(row.data))return '兩端尚待確認';
 for(const id of row.spec_ids){const s=specs.find(s=>s.id===id);if(!s)return '適用來料已不存在';try{validateDrawingRaw(parsed.data,s.data)}catch(e){return e instanceof Error?e.message:'尺寸不符'}if(existing.some(d=>d.customer_id===customer&&d.number===row.number.trim()&&d.version===row.version.trim()&&(d.spec_id===id||(d.spec_ids||[]).includes(id))))return '相同圖號／版本／來料已存在'}
 return '';
}
