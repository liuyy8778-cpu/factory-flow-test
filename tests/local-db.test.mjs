import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// 真正的本機 adapter：開檔、跑 migration（含 trigger）、batch 交易回滾、稽核 actor。
globalThis.__betterSqlite3 = (await import('better-sqlite3')).default;
async function load(file) {
  const r = await build({ entryPoints: [file], bundle: true, platform: 'node', format: 'esm', write: false, plugins: [{ name: 'native', setup(b) { b.onResolve({ filter: /^better-sqlite3$/ }, () => ({ path: 'native', namespace: 'native' })); b.onLoad({ filter: /.*/, namespace: 'native' }, () => ({ contents: 'export default globalThis.__betterSqlite3' })); } }] });
  return import('data:text/javascript;base64,' + Buffer.from(r.outputFiles[0].text).toString('base64'));
}
const { openDatabase } = await load('db/local.ts');
const { auditedDatabase } = await load('db/audited.ts');

test('open database applies every migration once, including triggers', () => {
  const dir = mkdtempSync(join(tmpdir(), 'factory-'));
  try {
    const db = openDatabase(join(dir, 'nested', 'factory.db'));
    const tables = db.sqlite.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND substr(name,1,2)<>'__'").get().n;
    const triggers = db.sqlite.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='trigger'").get().n;
    assert.equal(tables, 21);
    assert.equal(triggers, 60);
    assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM __migrations').get().n, 12);
    db.close();
    const again = openDatabase(join(dir, 'nested', 'factory.db'));
    assert.equal(again.sqlite.prepare('SELECT count(*) AS n FROM __migrations').get().n, 12);
    again.close();
    assert.ok(existsSync(join(dir, 'nested', 'factory.db')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a database restored by backup-restore.mjs (no __migrations table) is adopted, not re-migrated', async () => {
  const { listMigrations } = await load('db/migrate.ts');
  const dir = mkdtempSync(join(tmpdir(), 'factory-'));
  try {
    const raw = new (globalThis.__betterSqlite3)(join(dir, 'factory.db'));
    for (const m of listMigrations()) raw.exec(m.sql);
    raw.exec("INSERT INTO partners (id,name,kind,contact,phone,tax_id,address) VALUES ('p','還原客戶','customer','','','','')");
    raw.close();
    const db = openDatabase(join(dir, 'factory.db'));
    assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM __migrations').get().n, 12);
    assert.equal(db.sqlite.prepare('SELECT name FROM partners').get().name, '還原客戶');
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('batch is atomic and audit actor comes from the request headers', async () => {
  const db = openDatabase(':memory:');
  const req = new Request('http://local/api', { headers: { 'oai-authenticated-user-id': 'ming', 'oai-authenticated-user-email': 'ming' } });
  const audited = auditedDatabase(db, req);
  const insert = (id) => audited.prepare('INSERT INTO partners (id,name,kind,contact,phone,tax_id,address) VALUES (?,?,?,?,?,?,?)').bind(id, '客戶' + id, 'customer', '', '', '', '');
  const first = await insert('a').run();
  assert.equal(first.meta.changes, 1);
  await assert.rejects(audited.batch([insert('b'), insert('a')]));
  assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM partners').get().n, 1, 'failed batch must roll back');
  const audit = db.sqlite.prepare("SELECT actor,table_name,action FROM operation_audit ORDER BY rowid").all();
  assert.deepEqual(audit, [{ actor: JSON.stringify({ id: 'ming', email: 'ming' }), table_name: 'partners', action: 'insert' }]);
  assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM audit_context').get().n, 0, 'audit context is cleared after each batch');
  const row = await audited.prepare('SELECT name FROM partners WHERE id=?').bind('a').first();
  assert.equal(row.name, '客戶a');
  assert.equal(await audited.prepare('SELECT name FROM partners WHERE id=?').bind('a').first('name'), '客戶a');
  const counter = await audited.prepare("INSERT INTO number_counters (id,value) VALUES ('k',1) ON CONFLICT(id) DO UPDATE SET value=value+1 RETURNING value").first();
  assert.equal(counter.value, 1);
  await assert.rejects(audited.prepare('DELETE FROM partners WHERE id=?').bind('a').run(), /permanent deletion disabled/);
  db.close();
});
