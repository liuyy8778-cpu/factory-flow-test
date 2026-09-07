import {noDiameter,diameterMatches,type DiameterCondition,type CatalogSpec} from './catalog-filter';
import {emptyDrawingPicker,selectDrawingMaterials,type DrawingPickerFilters} from './drawing-picker-filter';
import {materialCode,searchCode} from './material-types';
type Row=Record<string,any>;
export type DrawingLibraryFilters={customer:string;number:string;version:string;used:string;groove:string;part:string;materials:DrawingPickerFilters;length:DiameterCondition;driveDiameter:DiameterCondition;workDiameter:DiameterCondition};
export const emptyDrawingLibrary=():DrawingLibraryFilters=>({customer:'',number:'',version:'',used:'',groove:'',part:'',materials:emptyDrawingPicker(),length:{...noDiameter},driveDiameter:{...noDiameter},workDiameter:{...noDiameter}});
const contains=(a:unknown,b:string)=>String(a??'').toLowerCase().includes(b.trim().toLowerCase());
const dim=(v:unknown,c:DiameterCondition)=>c.op==='all'||typeof v==='string'&&!!v.trim()&&diameterMatches(v,c);
export function selectLibraryDrawings(drawings:Row[],specs:CatalogSpec[],f:DrawingLibraryFilters,query:string,status:string){
 const matching=new Set(selectDrawingMaterials(specs,[], '',{...f.materials,drawing:'all'},'').map(s=>s.id));
 const materialActive=Object.values(f.materials.catalog).some(Boolean)||f.materials.sizeMode!=='all'||f.materials.diameter.op!=='all'||f.materials.length.op!=='all';
 const byId=new Map(specs.map(s=>[s.id,s]));
 return drawings.filter(d=>{
 if(status!=='all'&&(status==='inactive'?!d.disabled:!!d.disabled))return false;
 if(f.customer&&d.customer_id!==f.customer||!contains(d.number,f.number)||f.version&&d.version!==f.version||f.used&&(f.used==='used'?!d.in_use:!!d.in_use))return false;
 const linked=[...new Set<string>(d.spec_ids||[d.spec_id])];if(materialActive&&!linked.some(id=>matching.has(id)))return false;
 const data=d.data||{},drive=data.ends?.drive,work=data.ends?.work;
 if(f.groove&&(data.groove?.kind||'pending')!==f.groove)return false;
 const dm=drive?.mode==='machine',wm=work?.mode==='machine';
 if(f.part==='drive'&&!(dm&&!wm&&work?.mode==='unchanged')||f.part==='work'&&!(wm&&!dm&&drive?.mode==='unchanged')||f.part==='both'&&!(dm&&wm)||f.part==='none'&&!(drive?.mode==='unchanged'&&work?.mode==='unchanged')||f.part==='pending'&&data.ends&&drive?.mode!=='pending'&&work?.mode!=='pending')return false;
 if(!dim(data.length,f.length)||!dim(dm?drive.diameter:undefined,f.driveDiameter)||!dim(wm?work.diameter:undefined,f.workDiameter))return false;
 const haystack=[d.customer,d.number,d.version,data.note,data.operation_code,data.groove?.name,...linked.flatMap(id=>{const s=byId.get(id);return s?[materialCode(s.data),searchCode(s.data),...Object.values(s.data)]:[]})].join(' ').toLowerCase();
 return query.trim().toLowerCase().split(/\s+/).filter(Boolean).every(q=>haystack.includes(q));
 });
}
