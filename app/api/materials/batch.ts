import { z } from 'zod';
import { database } from '@/db/raw';
import { materialKey,fields,type Material } from '@/app/material-types';
const word=z.string().trim().min(1).max(200);
const dimension=z.string().trim().regex(/^\d+(\.\d+)?$/).refine(v=>Number(v)>0&&Number(v)<=10000);
export const materialInput=z.object({material:word,name:word,drive:word,size:word,profile:word,raw_length:dimension,raw_diameter:dimension,style:word});
export const draftInput=z.object({series:z.enum(['metric','imperial','bit','e']),common:z.object({material:z.string().max(200),name:z.string().max(200),raw_length:z.string().max(100),style:z.string().max(200)}),selected:z.array(z.string().max(50)).max(100),rows:z.array(z.object({id:z.string().max(100),material:z.string().max(200),name:z.string().max(200),drive:z.string().max(50),size:z.string().max(100),profiles:z.array(z.string().max(100)).max(5),raw_length:z.string().max(100),raw_diameter:z.string().max(100),style:z.string().max(200)})).max(100)});
export async function saveMaterials(input:{data:Material;code?:string}[],req?:Request){
 const db=database(req);const existing=(await db.prepare('SELECT id,code,data FROM material_specs').all()).results as {id:string;code:string;data:string}[];
 const known=new Map(existing.map(s=>[materialKey(JSON.parse(s.data)),s]));
 const unique=new Map<string,{data:Material;code?:string}>();let repeated=0;
 for(const row of input){const k=materialKey(row.data);if(unique.has(k)||known.has(k)){repeated++;continue}unique.set(k,row)}
 if(!unique.size)return {created:0,skipped:input.length,ids:input.map(r=>known.get(materialKey(r.data))?.id).filter(Boolean)};
 const records=await Promise.all([...unique].map(async([fingerprint,r])=>{const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(fingerprint));const hash=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');return {id:'mat_'+hash,code:r.code||'MAT-'+hash.slice(0,16).toUpperCase(),fingerprint,data:r.data}}));
 const options=new Map<string,{id:string;field:string;value:string}>();for(const r of records)for(const [field]of fields){const value=r.data[field];options.set(field+':'+value,{id:field+':'+value,field,value})}
 const results=await db.batch([
  db.prepare("INSERT OR IGNORE INTO spec_options (id,field,value) SELECT json_extract(value,'$.id'),json_extract(value,'$.field'),json_extract(value,'$.value') FROM json_each(?)").bind(JSON.stringify([...options.values()])),
  ...records.map(r=>db.prepare('INSERT INTO material_specs (id,code,data,fingerprint) VALUES (?,?,?,?) ON CONFLICT(fingerprint) DO NOTHING').bind(r.id,r.code,JSON.stringify(r.data),r.fingerprint)),
 ]);
 const created=results.slice(1).reduce((s,r)=>s+(r.meta.changes||0),0);
 return {created,skipped:repeated+records.length-created,ids:records.map(r=>r.id)};
}
