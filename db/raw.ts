import { auditedDatabase } from './audited';
import { openDatabase, type LocalDatabase } from './local';
import { dataPath } from '@/lib/paths';

// 整個程式共用一個連線；用 globalThis 保存，避免開發模式熱重載時重複開啟。
const globalRef = globalThis as unknown as { __factoryDb?: LocalDatabase };

export function localDatabase(): LocalDatabase {
  if (!globalRef.__factoryDb) globalRef.__factoryDb = openDatabase(dataPath('factory.db'));
  return globalRef.__factoryDb;
}

export function database(req?: Request): D1Database {
  return auditedDatabase(localDatabase(), req);
}
