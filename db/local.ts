// 本機 SQLite adapter：對外提供與 Cloudflare D1 相同的 prepare / bind / first / all / run / batch 介面，
// 內部用 better-sqlite3。batch 以一個交易執行，任何一條失敗整批回滾，跟 D1 的語意一致。
import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { migrate } from './migrate';

type Row = Record<string, unknown>;

function normalize(values: unknown[]): unknown[] {
  return values.map((v) => {
    if (v === undefined) return null;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (v instanceof ArrayBuffer) return Buffer.from(v);
    if (v instanceof Uint8Array && !Buffer.isBuffer(v)) return Buffer.from(v);
    return v;
  });
}

function meta(changes: number, lastRowId = 0): D1Meta {
  return { changes, last_row_id: lastRowId, duration: 0, rows_read: 0, rows_written: 0 };
}

class LocalStatement implements D1PreparedStatement {
  constructor(private readonly db: Database.Database, readonly sql: string, readonly values: unknown[] = []) {}
  bind(...values: unknown[]): D1PreparedStatement {
    return new LocalStatement(this.db, this.sql, normalize(values));
  }
  private statement() {
    return this.db.prepare(this.sql);
  }
  async first<T = unknown>(colName?: string): Promise<T | null> {
    const row = this.statement().get(...this.values) as Row | undefined;
    if (!row) return null;
    if (colName) return (row[colName] as T) ?? null;
    return row as T;
  }
  async all<T = Row>(): Promise<D1Result<T>> {
    return this.execute<T>();
  }
  async run<T = Row>(): Promise<D1Result<T>> {
    return this.execute<T>();
  }
  // 同步執行，供 batch 在交易內呼叫。
  execute<T = Row>(): D1Result<T> {
    const stmt = this.statement();
    if (stmt.reader) {
      const results = stmt.all(...this.values) as T[];
      const changes = (this.db.prepare('SELECT changes() AS n').get() as { n: number }).n;
      return { results, success: true, meta: meta(Number(changes)) };
    }
    const r = stmt.run(...this.values);
    return { results: [], success: true, meta: meta(Number(r.changes), Number(r.lastInsertRowid)) };
  }
}

export class LocalDatabase implements D1Database {
  constructor(readonly sqlite: Database.Database) {}
  prepare(sql: string): D1PreparedStatement {
    return new LocalStatement(this.sqlite, sql);
  }
  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    const run = this.sqlite.transaction((items: LocalStatement[]) => items.map((s) => s.execute<T>()));
    return run(statements as LocalStatement[]);
  }
  async exec(sql: string) {
    this.sqlite.exec(sql);
    return { count: 0, duration: 0 };
  }
  close() {
    this.sqlite.close();
  }
}

export function openDatabase(file: string): LocalDatabase {
  if (file !== ':memory:') {
    const dir = dirname(file);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
  const sqlite = new Database(file);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
  migrate(sqlite);
  return new LocalDatabase(sqlite);
}
