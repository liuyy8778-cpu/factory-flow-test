import {grooveDraft,grooveError} from '@/app/groove-types';
import {z} from 'zod';
const decimal=z.string().trim().regex(/^\d+(\.\d+)?$/).refine(x=>Number(x)>0&&Number(x)<=10000);
const tolerance=z.string().trim().min(1).max(200);
const inactive={diameter:z.literal('').default(''),cut_length:z.literal('').default(''),diameter_tolerance:z.literal('').default(''),cut_length_tolerance:z.literal('').default('')};
const end=z.discriminatedUnion('mode',[
 z.object({mode:z.literal('machine'),diameter:decimal,cut_length:decimal,diameter_tolerance:tolerance,cut_length_tolerance:tolerance}),
 z.object({mode:z.literal('unchanged'),...inactive}),z.object({mode:z.literal('pending'),...inactive})
]);
export const drawingInput=z.union([
 z.object({format:z.literal('ends-v1'),groove:grooveDraft.optional(),operation_code:z.string().trim().max(50).optional(),length:decimal,length_tolerance:tolerance,note:z.string().max(2000),ends:z.object({drive:end,work:end})}).strict(),
 z.object({length:decimal,diameter:decimal,length_tolerance:tolerance,diameter_tolerance:tolerance,note:z.string().max(2000)}).strict()
]);
export function validateDrawingRaw(d:z.infer<typeof drawingInput>,raw:Record<string,any>){
 if('groove' in d&&d.groove&&d.groove.kind!=='pending'){const error=grooveError(d.groove,d.length,raw.raw_diameter);if(error)throw Error(error)}
 if(Number(d.length)>Number(raw.raw_length))throw Error('加工後總長不能大於來料長度');
 if('ends' in d){for(const [key,e] of Object.entries(d.ends)){if(e.mode!=='machine')continue;const name=key==='drive'?'方孔端':'工作端';if(Number(e.diameter)>Number(raw.raw_diameter))throw Error(name+'加工後外徑不能大於來料外徑');if(Number(e.cut_length)>Number(d.length))throw Error(name+'加工長度不能大於完成總長');}}
 if('ends' in d&&d.groove?.kind==='round'){const g=d.groove,w=Number(g.width),near=Number(g.position)-(g.reference==='center'?w/2:0),a=g.base==='drive'?near:Number(d.length)-near-w,b=a+w;let surface=Number(raw.raw_diameter);if(d.ends.drive.mode==='machine'&&a<Number(d.ends.drive.cut_length))surface=Math.min(surface,Number(d.ends.drive.diameter));if(d.ends.work.mode==='machine'&&b>Number(d.length)-Number(d.ends.work.cut_length))surface=Math.min(surface,Number(d.ends.work.diameter));if(Number(g.value)>=(g.measure==='depth'?surface/2:surface))throw Error('溝底徑或深度必須小於該位置車修後的外徑範圍');}
 if(!('ends' in d)&&Number(d.diameter)>Number(raw.raw_diameter))throw Error('加工後外徑不能大於來料外徑');
}
