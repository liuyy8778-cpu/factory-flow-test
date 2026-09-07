import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { dataPath } from '@/lib/paths';
import type { Storage, StoredObject } from './index';

function root() {
  return dataPath('files');
}

// key 由伺服器產生（drawings/{id}/{uuid}），這裡仍擋掉任何跳出 files/ 的路徑。
function locate(key: string): string {
  if (!key || key.includes('..') || key.startsWith('/') || key.includes('\\')) throw new Error('無效的檔案位置');
  const base = root();
  const full = resolve(base, key);
  if (!full.startsWith(base + sep)) throw new Error('無效的檔案位置');
  return full;
}

export const storage: Storage = {
  async put(key, bytes, options) {
    const file = locate(key);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, Buffer.from(bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes));
    await writeFile(file + '.meta.json', JSON.stringify({ contentType: options?.httpMetadata?.contentType || '' }));
  },
  async get(key): Promise<StoredObject | null> {
    const file = locate(key);
    let body: Buffer;
    try {
      body = await readFile(file);
    } catch {
      return null;
    }
    let contentType = '';
    try {
      contentType = (JSON.parse(await readFile(file + '.meta.json', 'utf8')) as { contentType?: string }).contentType || '';
    } catch {}
    const bytes = new Uint8Array(body.byteLength);
    bytes.set(body);
    return {
      body: bytes,
      httpMetadata: { contentType },
      async arrayBuffer() {
        return bytes.buffer;
      },
    };
  },
  async delete(key) {
    const file = locate(key);
    await rm(file, { force: true });
    await rm(file + '.meta.json', { force: true });
  },
};
