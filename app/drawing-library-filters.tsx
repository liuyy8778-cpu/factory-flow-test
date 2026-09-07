'use client';
import {useState} from 'react';
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from '@/components/ui/collapsible';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import DrawingPickerFilterControls from './drawing-picker-filters';
import DiameterFilter from './diameter-filter';
import type {CatalogSpec} from './catalog-filter';
import type {DrawingLibraryFilters} from './drawing-library-filter';
type Row=Record<string,any>;
export default function DrawingLibraryControls({value:f,onChange,specs,drawings,partners,onReset}:{value:DrawingLibraryFilters;onChange:(v:DrawingLibraryFilters)=>void;specs:CatalogSpec[];drawings:Row[];partners:Row[];onReset:()=>void}){
 const [more,setMore]=useState(false),[expanded,setExpanded]=useState(true);
 const pick=(key:'customer'|'version'|'used'|'groove'|'part',label:string,options:string[][])=><label className="field"><span>{label}</span><Select value={f[key]||'__all__'} onValueChange={v=>onChange({...f,[key]:v==='__all__'?'':v})}><SelectTrigger aria-label={label}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="__all__">全部</SelectItem>{options.map(([value,label])=><SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></label>;
 const count=[f.customer,f.number,f.version,f.used,f.groove,f.part,...Object.values(f.materials.catalog),f.materials.sizeMode==='all'?'':f.materials.sizeMode,...[f.length,f.driveDiameter,f.workDiameter,f.materials.length,f.materials.diameter].map(d=>d.op==='all'?'':d.op)].filter(Boolean).length;
 return <Collapsible className="catalog-filters" open={expanded} onOpenChange={setExpanded}><div className="editor-actions"><CollapsibleTrigger asChild><Button variant="outline">{expanded?'收起篩選':'展開篩選'}</Button></CollapsibleTrigger><span>{partners.find(p=>p.id===f.customer)?.name||'全部客戶'}{f.number?' · '+f.number:''}{f.materials.catalog.material?' · '+f.materials.catalog.material:''}{f.materials.sizeMode==='range'?` · ${f.materials.from}～${f.materials.to}`:''} · 已設定 {count} 項條件</span></div><CollapsibleContent forceMount hidden={!expanded}><div className="catalog-filter-grid">{pick('customer','客戶',partners.filter(p=>p.kind==='customer').map(p=>[p.id,p.name]))}<label className="field"><span>圖號</span><Input placeholder="例如 無溝6140" value={f.number} onChange={e=>onChange({...f,number:e.target.value})}/></label>{pick('version','版本',[...new Set<string>(drawings.map(d=>d.version))].sort().map(v=>[v,v]))}{pick('used','使用狀態',[['unused','未使用（可直接修改）'],['used','已使用（另存版本）']])}</div>
 <DrawingPickerFilterControls library specs={specs} customer={f.customer} value={f.materials} onChange={materials=>onChange({...f,materials})} onClear={()=>{}}/>
 <div className="editor-actions"><Button variant="outline" aria-expanded={more} onClick={()=>setMore(v=>!v)}>{more?'收起加工條件':'加工條件'}{[f.groove,f.part,f.length.op==='all'?'':1,f.driveDiameter.op==='all'?'':1,f.workDiameter.op==='all'?'':1].filter(Boolean).length? '（已設定）':''}</Button><Button variant="ghost" onClick={onReset}>清除全部篩選</Button></div>
 {more&&<div className="catalog-filter-grid">{pick('groove','溝槽型式',[['none','無溝'],['round','圓一溝'],['custom','自訂型式'],['pending','待確認／未記錄']])}{pick('part','外徑加工部位',[['drive','僅方孔端'],['work','僅工作端'],['both','雙頭'],['none','兩端外徑不加工'],['pending','待確認／舊圖未記錄']])}<DiameterFilter label="完成總長" value={f.length} onChange={length=>onChange({...f,length})}/><DiameterFilter label="方孔端加工後外徑" value={f.driveDiameter} onChange={driveDiameter=>onChange({...f,driveDiameter})}/><DiameterFilter label="工作端加工後外徑" value={f.workDiameter} onChange={workDiameter=>onChange({...f,workDiameter})}/></div>}
 <p>來料條件須在同一筆適用料符合；符合後顯示整張圖面。加工外徑僅比對已記錄加工尺寸的端別。</p></CollapsibleContent></Collapsible>
}
