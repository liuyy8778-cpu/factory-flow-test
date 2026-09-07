import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,mkdirSync,existsSync,statSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyBackup,BACKUP_TABLES,digest} from '../app/backup-format.ts';
const migrations=__MIGRATIONS__;
const quote=s=>'"'+s.replaceAll('"','""')+'"';
const canonical=rows=>JSON.stringify(rows.map(row=>Object.fromEntries(Object.entries(row).sort(([a],[b])=>a.localeCompare(b)))));
export async function restoreCopy(backup,destination){
 const checked=await verifyBackup(backup);const db=new DatabaseSync(':memory:');
 try{
 for(const sql of migrations)db.exec(sql);
 const triggers=db.prepare("SELECT name,sql FROM sqlite_master WHERE type='trigger'").all();
 for(const t of triggers)db.exec('DROP TRIGGER '+quote(t.name));
 db.exec('PRAGMA foreign_keys=OFF; BEGIN');
 for(const table of BACKUP_TABLES){const columns=db.prepare('PRAGMA table_info('+quote(table)+')').all().map(c=>c.name);const expected=['__backup_rowid',...columns].sort().join('|');const insert=db.prepare('INSERT INTO '+quote(table)+' (rowid,'+columns.map(quote).join(',')+') VALUES ('+['?',...columns.map(()=>'?')].join(',')+')');for(const row of backup.payload.tables[table]){if(Object.keys(row).sort().join('|')!==expected)throw Error('資料欄位版本不符：'+table);insert.run(row.__backup_rowid,...columns.map(c=>row[c]))}}
 if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('還原後資料關聯檢查失敗');
 for(const table of BACKUP_TABLES){const restored=db.prepare('SELECT rowid AS __backup_rowid,* FROM '+quote(table)+' ORDER BY rowid').all();if(canonical(restored)!==canonical(backup.payload.tables[table]))throw Error('還原內容不符：'+table)}
 for(const t of triggers)db.exec(t.sql);
 db.exec('COMMIT; PRAGMA foreign_keys=ON');if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('SQLite 完整性檢查失敗');
 // Require a NEW destination. Never open or overwrite an existing database.
 if(existsSync(destination))throw Error('輸出資料夾已存在，請選擇新的空路徑');mkdirSync(destination,{recursive:true});mkdirSync(join(destination,'attachments'));
 const manifest=[];for(const f of backup.payload.files){const filename=await digest(f.key);writeFileSync(join(destination,'attachments',filename),Buffer.from(f.base64,'base64'),{flag:'wx'});manifest.push({key:f.key,original_name:f.name,type:f.type,filename,size:f.size,sha256:f.sha256})}
 db.prepare('VACUUM INTO ?').run(join(destination,'factory-flow.sqlite'));
 const report={...checked,restored_at:new Date().toISOString(),database_integrity:'ok',relationships:'ok',all_rows_match:true,attachments_verified:true,production_modified:false};
 writeFileSync(join(destination,'attachments.json'),JSON.stringify(manifest,null,2),{flag:'wx'});writeFileSync(join(destination,'report.json'),JSON.stringify(report,null,2),{flag:'wx'});return report;
 }finally{db.close()}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [file,destination]=process.argv.slice(2);if(!file||!destination)throw Error('用法：node backup-restore.mjs 備份檔.json 新的輸出資料夾');if(statSync(file).size>40*1024*1024)throw Error('本版支援 40 MB 以內的備份');const result=await restoreCopy(JSON.parse(readFileSync(file,'utf8')),resolve(destination));console.log(JSON.stringify(result,null,2))}catch(e){console.error(e.message);process.exitCode=1}
}
