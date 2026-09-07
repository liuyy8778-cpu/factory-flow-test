// 從原系統備份還原工具的輸出資料夾，把附件放回 data/files/{key}。
// 搭配 public/backup-restore.mjs 使用：
//   node public/backup-restore.mjs 備份檔.json 還原資料夾
//   node scripts/import-attachments.mjs 還原資料夾
// 資料庫則把 還原資料夾/factory-flow.sqlite 複製成 data/factory.db。
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';

const [source] = process.argv.slice(2);
if (!source) {
  console.error('用法：node scripts/import-attachments.mjs 還原資料夾');
  process.exit(1);
}
const dataDir = resolve(process.env.FACTORY_DATA_DIR || join(process.cwd(), 'data'));
const root = join(dataDir, 'files');
const manifest = JSON.parse(readFileSync(join(source, 'attachments.json'), 'utf8'));
let count = 0;
for (const f of manifest) {
  if (!f.key || f.key.includes('..') || f.key.startsWith('/')) throw new Error('無效的附件位置：' + f.key);
  const target = resolve(root, f.key);
  if (!target.startsWith(root + sep)) throw new Error('無效的附件位置：' + f.key);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(source, 'attachments', f.filename), target);
  writeFileSync(target + '.meta.json', JSON.stringify({ contentType: f.type || '' }));
  count++;
}
const sqlite = join(source, 'factory-flow.sqlite');
const db = join(dataDir, 'factory.db');
if (existsSync(sqlite) && !existsSync(db)) {
  mkdirSync(dataDir, { recursive: true });
  copyFileSync(sqlite, db);
  console.log('資料庫已放到 ' + db);
} else if (existsSync(db)) {
  console.log('data/factory.db 已存在，未覆寫。要換成還原的資料庫，請先把舊檔移走。');
}
console.log('附件匯入完成：' + count + ' 個');
