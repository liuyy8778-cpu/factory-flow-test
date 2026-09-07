// 一鍵備份：把 data/ 整份複製到備份資料夾，檔名帶日期時間。
// 資料庫用 SQLite 的線上備份 API 複製，正在使用中也能安全備份。
// 用法：node scripts/backup-to-folder.mjs [目的資料夾]
import Database from 'better-sqlite3';
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function backupToFolder({ dataDir, backupDir, now = new Date() } = {}) {
  dataDir = resolve(dataDir || process.env.FACTORY_DATA_DIR || join(process.cwd(), 'data'));
  backupDir = resolve(backupDir || process.env.FACTORY_BACKUP_DIR || join(process.cwd(), '備份'));
  const dbFile = join(dataDir, 'factory.db');
  if (!existsSync(dbFile)) throw new Error('找不到資料庫：' + dbFile);
  const stamp = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    .format(now)
    .replace(' ', '_')
    .replaceAll(':', '');
  const target = join(backupDir, '廠務帳-' + stamp);
  if (existsSync(target)) throw new Error('備份資料夾已存在：' + target);
  mkdirSync(target, { recursive: true });
  const db = new Database(dbFile, { readonly: true });
  try {
    await db.backup(join(target, 'factory.db'));
  } finally {
    db.close();
  }
  const files = join(dataDir, 'files');
  let fileCount = 0;
  if (existsSync(files)) {
    cpSync(files, join(target, 'files'), { recursive: true });
    const walk = (d) => readdirSync(d).forEach((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : n.endsWith('.meta.json') ? 0 : fileCount++));
    walk(files);
  }
  return { target, database: join(target, 'factory.db'), size: statSync(join(target, 'factory.db')).size, files: fileCount, created_at: now.toISOString() };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const r = await backupToFolder({ backupDir: process.argv[2] });
    console.log('備份完成：' + r.target + '（附件 ' + r.files + ' 個）');
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
