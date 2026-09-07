import { join, resolve } from 'node:path';

// 所有營運資料都放在 data/ 底下：factory.db（資料庫）、files/（圖檔）。
// 可用環境變數 FACTORY_DATA_DIR 改到別的位置，例如外接硬碟。
export function dataDir(): string {
  return resolve(process.env.FACTORY_DATA_DIR || join(process.cwd(), 'data'));
}

export function dataPath(...parts: string[]): string {
  return join(dataDir(), ...parts);
}

// 一鍵備份的目的資料夾；預設在專案旁邊的「備份」資料夾。
export function backupDir(): string {
  return resolve(process.env.FACTORY_BACKUP_DIR || join(process.cwd(), '備份'));
}
