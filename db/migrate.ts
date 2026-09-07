// 啟動時依 drizzle/meta/_journal.json 的順序套用尚未執行過的 migration。
// 60 個 trigger（稽核、禁刪、圖面保護）都在這些 .sql 裡，照原樣執行即可。
import type Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(process.cwd(), 'drizzle');
// 原系統的還原工具（backup-restore.mjs）產出的 SQLite 已套用到這一支 migration，但沒有 __migrations 紀錄。
// 遇到「有資料表、沒紀錄」的資料庫，就把到這一支為止都視為已套用，只補跑後面新增的。
const RESTORED_BASELINE = '0011_lively_slipstream';

export function listMigrations(): { tag: string; sql: string }[] {
  const journal = JSON.parse(readFileSync(join(MIGRATIONS_DIR, 'meta', '_journal.json'), 'utf8')) as {
    entries: { idx: number; tag: string }[];
  };
  return journal.entries
    .sort((a, b) => a.idx - b.idx)
    .map((e) => ({ tag: e.tag, sql: readFileSync(join(MIGRATIONS_DIR, e.tag + '.sql'), 'utf8') }));
}

export function migrate(sqlite: Database.Database, migrations = listMigrations()): string[] {
  sqlite.exec('CREATE TABLE IF NOT EXISTS __migrations (tag TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  const done = new Set((sqlite.prepare('SELECT tag FROM __migrations').all() as { tag: string }[]).map((r) => r.tag));
  const applied: string[] = [];
  const insert = sqlite.prepare('INSERT INTO __migrations (tag, applied_at) VALUES (?, ?)');
  const hasSchema = !!sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='documents'").get();
  if (!done.size && hasSchema) {
    const baseline = migrations.findIndex((m) => m.tag === RESTORED_BASELINE);
    sqlite.transaction(() => {
      for (const m of migrations.slice(0, baseline + 1)) {
        insert.run(m.tag, new Date().toISOString());
        done.add(m.tag);
      }
    })();
  }
  for (const m of migrations) {
    if (done.has(m.tag)) continue;
    sqlite.transaction(() => {
      sqlite.exec(m.sql);
      insert.run(m.tag, new Date().toISOString());
    })();
    applied.push(m.tag);
  }
  return applied;
}
