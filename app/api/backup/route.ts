import {database} from '@/db/raw';
import {storage} from '@/storage';
import {BACKUP_TABLES,digest,fileReferences,type BackupPayload} from '@/app/backup-format';
export async function GET(req:Request){try{
 if(!decodeURIComponent(req.headers.get('oai-authenticated-user-id')||''))return Response.json({error:'請登入後使用備份中心'},{status:401});
 const db=database();const schema=(await db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE sql IS NOT NULL AND type IN ('table','index','trigger')").all()).results.filter((x:any)=>BACKUP_TABLES.includes(x.tbl_name)) as BackupPayload['schema'];
 const columns=await db.batch(BACKUP_TABLES.map(t=>db.prepare(`PRAGMA table_info("${t}")`)));
 const sizes=await db.batch(BACKUP_TABLES.map((t,i)=>{const pairs=columns[i].results.map((c:any)=>`'${c.name}',"${c.name}"`).join(',');return db.prepare(`SELECT COALESCE(SUM(length(json_object(${pairs}))),0) AS bytes FROM "${t}"`)}));
 if(sizes.reduce((n,r)=>n+Number((r.results[0] as {bytes:number}|undefined)?.bytes||0),0)>4*1024*1024)throw Error('資料已超過本版單檔備份容量，請安排分批備份；本次未產生備份');
 const results=await db.batch(BACKUP_TABLES.map(t=>db.prepare(`SELECT rowid AS __backup_rowid,* FROM "${t}" ORDER BY rowid`)));
 const tables=Object.fromEntries(BACKUP_TABLES.map((t,i)=>[t,results[i].results])) as BackupPayload['tables'];
 let size=new TextEncoder().encode(JSON.stringify(tables)).length;if(size>6*1024*1024)throw Error('資料超過本版單檔備份上限，請先安排分批備份；本次未產生備份');
 const foreign=await db.batch(BACKUP_TABLES.map(t=>db.prepare(`PRAGMA foreign_key_list("${t}")`)));
 const relations=foreign.flatMap((r,i)=>r.results.map((f:any)=>({table:BACKUP_TABLES[i],from:f.from,target:f.table,to:f.to})));
 const bucket=storage,files:BackupPayload['files']=[];
 for(const [key,meta] of fileReferences(tables)){const object=await bucket.get(key);if(!object)throw Error('備份未完成，找不到附件：'+meta.name);const bytes=new Uint8Array(await object.arrayBuffer());size+=Math.ceil(bytes.length*4/3);if(size>16*1024*1024)throw Error('含附件備份超過本版 16 MB 上限，請安排分批備份；本次未產生備份');let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));files.push({key,...meta,base64:btoa(binary),sha256:await digest(bytes),size:bytes.length})}
 const payload:BackupPayload={format:'factory-flow-backup-v1',version:'V20',created_at:new Date().toISOString(),tables,schema,relations,files};
 return Response.json({payload,sha256:await digest(JSON.stringify(payload))},{headers:{'Cache-Control':'no-store','Content-Disposition':'attachment; filename="factory-flow-backup.json"'}});
 }catch(e){console.error(e);return Response.json({error:e instanceof Error?e.message:'備份失敗，請重試'},{status:400})}}
