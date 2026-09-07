// 圖檔儲存介面。介面刻意做得跟 R2 一樣（put / get / delete），
// 單機版實作是本機資料夾；日後上線只要換 storage/local.ts 的實作，四個呼叫端都不用動。
export interface StoredObject {
  body: Uint8Array<ArrayBuffer>;
  httpMetadata: { contentType?: string };
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface Storage {
  put(key: string, bytes: ArrayBuffer | Uint8Array, options?: { httpMetadata?: { contentType?: string } }): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}

export { storage } from './local';
