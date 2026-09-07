# 廠務帳 單機版重建 盤點規格書

日期：2026-09-07
來源：`liuyy8778-cpu/factory-flow`（廠務帳 V20，Sites / Cloudflare Workers / D1 / R2）
目標：在一台電腦上以 Node.js 執行，資料全部存在本機硬碟，不依賴任何雲端服務。

這份文件是「動工前的盤點」。2026-09-07 已依此完成第一版，實作差異見文末「實作備註」。

---

## 0. 一句話結論

原系統的**資料模型、業務規則、畫面**可以整套沿用；要換掉的只有**四個地基**：資料庫連線、圖檔儲存、操作人員來源、建置與啟動方式。

打個比方：房子的格局、水電、家具都留著，只換地基和門鎖。

---

## 1. 原系統盤點摘要

### 1.1 技術組成

| 項目 | 原系統 | 備註 |
|---|---|---|
| 前端框架 | Next.js 16 App Router + React 19，經 vinext 跑在 Cloudflare Workers | 單頁式，全部靠 `view` 狀態切頁 |
| UI | Tailwind v4 + shadcn/ui（new-york） | 60 個樣板元件，實際用到 13 個 |
| 資料庫 | Cloudflare D1（SQLite） | 程式直接用 D1 的 `prepare/bind/batch` 介面，**沒有用 Drizzle ORM 查詢**，Drizzle 只用來產 migration |
| 圖檔 | Cloudflare R2 | 4 處 put/get/delete |
| 身分 | Sites 平台注入的 header `oai-authenticated-user-id` / `-email` | 應用層沒有任何登入程式 |
| 測試 | Node 內建 test runner + `node:sqlite` 記憶體資料庫 | 主測試 425 行，涵蓋 17 個完整流程 |

### 1.2 資料表（21 張，全部 text 主鍵）

| 群組 | 資料表 |
|---|---|
| 往來與帳款 | `partners`、`documents`、`invoices`、`payments` |
| 訂單與生產 | `sales_orders`、`work_orders`、`production_reports` |
| 來料與規格 | `spec_options`、`material_specs`、`material_drafts`、`number_counters` |
| 進貨與分配 | `intakes`、`intake_allocations`、`intake_audit` |
| 圖面 | `drawings`、`drawing_specs`、`drawing_audit` |
| 鐵桶 | `barrel_entries`、`barrel_audit` |
| 稽核 | `operation_audit`、`audit_context` |

完整欄位定義見 `db/schema.ts`，migration 見 `drizzle/0000` 到 `0011`。

**關鍵事實**：有 60 個 SQLite trigger 只存在 migration 裡，不在 schema 檔：

- 0009：防止同客戶同圖號同版本透過共用來料重複建圖
- 0010：圖面一旦被引用就標記 `used=1`，不可回退
- 0011：13 張表的新增/修改/刪除自動寫進 `operation_audit`；12 張表禁止實體刪除（只能作廢）

**這些 trigger 必須原封照搬，否則稽核、禁刪、圖面保護全部失效。**

### 1.3 畫面與模組（側欄 11 項）

| 頁籤 | 功能 | 主要檔案 |
|---|---|---|
| 作業總覽 | 四張統計卡（未收款、待請款、本月出貨、逾期）、快速動作、近期進出貨 | `app/page.tsx` |
| 來料規格庫 | 規格列表、篩選排序分頁、新增規格、快速批次建料精靈 | `app/materials.tsx`、`app/batch-materials.tsx` |
| 加工圖面庫 | 圖面列表、多維篩選、新增、修改、停用、另存版本、批次建圖 | `app/materials.tsx`、`app/batch-drawings.tsx`、`app/drawing-manage.tsx` |
| 其他訂單 | 一般訂單建立、開立工單 | `app/production.tsx` |
| 工單與派工 | 工單狀態機、指派機台人員、產量回報、完工、轉出貨、派工標籤列印 | `app/production.tsx`、`app/job-label.tsx` |
| 出貨管理 | 出貨單列表、勾選合併請款、明細列印 | `app/page.tsx` |
| 進貨管理 | 進貨單列表、登記來料編輯器、加工分配、換料 | `app/receipt-list.tsx`、`app/receipt-editor.tsx`、`app/intake-allocation.tsx` |
| 請款與收款 | 請款單列表、登記收款 | `app/page.tsx` |
| 鐵桶登記簿 | 進出桶紀錄、客戶累計差額、更正與作廢 | `app/barrels.tsx` |
| 往來廠商 | 客戶與供應商維護 | `app/page.tsx` |
| 備份與復原 | 匯出完整備份、檢查備份檔、復原被移除的分配、操作紀錄 | `app/safety-center.tsx` |

另有示範模式（`demo` 狀態）：只換讀取來源為假資料，所有寫入入口都擋掉。

### 1.4 API（8 個 route + 5 個 helper，全在 `app/api/`）

| 端點 | 動作 |
|---|---|
| `/api/data` | partner、document、invoice、payment |
| `/api/materials` | defaults、option、draft、batch_specs、spec、drawing、receipt、bind、terms、dispatch、edit_drawing、drawing_status、replace_material、allocate、remove_allocation、dispatch_allocation |
| `/api/production` | order、work_order、assign、state、report、ship |
| `/api/barrels` | manual、edit、void |
| `/api/safety` | 操作紀錄分頁、復原分配 |
| `/api/backup` | 匯出完整備份 JSON（含圖檔 base64） |
| `/api/drawing-file` | 圖檔串流 |
| `/api/receipt-draft`、`/api/drawing-batch` | 草稿存取、批次建圖 |

共通約定：POST 檢查同源 origin；前端產 `request_id`（UUID）當主鍵做冪等；業務守門寫在 SQL 的條件式 INSERT/UPDATE 裡，靠 `batch()` 的交易語意保證原子性。

### 1.5 核心業務規則（重建時逐條保留）

**帳款**
- 合併請款：只能合併同一客戶、未作廢、未請款的出貨單，最多 80 張，到期日不早於請款日。
- 收款：可分次，單次不超過未收餘額。
- 金額一律以「分」為整數存，顯示時除以 100。

**作廢**
- 沒有獨立作廢按鈕，只能從鐵桶登記簿「作廢整張原單及桶帳」。
- 已請款的出貨單、含已派工明細的進貨單不能作廢。
- 作廢出貨單會把工單的已出貨數減回。
- 12 張表禁止實體刪除，唯一可刪的是未派工的加工分配，且可從備份中心復原。

**訂單與工單**
- 一張訂單一張工單。開工需先指定機台與人員。
- 回報累計良品不超過訂單量；完工時良品必須等於訂單量。
- 出貨需已完工且累計出貨不超過良品數，支援分批。

**來料、分配、派工**
- 進貨明細保存料快照與圖面快照，圖面日後改版不影響既有單。
- 一筆來料可切多筆分配，總分配數不超過進貨數；每筆分配各開一張工單。
- 換料只允許未派工、無分配的明細，必填原因，會同步改原單明細並清空圖面。
- 交期不早於進貨日。
- 舊式整批派工與新式分配派工互斥。

**圖面**
- 同客戶同料只能有一張慣用圖面。
- 同客戶、同料、同圖號、同版本不可重複。
- 已被使用的圖面不可修改，只能另存版本；停用不影響既有單據。
- 派工或分配前，圖面兩端必須已確認且溝槽無誤。
- 幾何驗證：總長不超過來料長、各端外徑不超過來料外徑、加工長不超過總長、溝底徑或深度小於該位置車修後外徑。

**鐵桶**
- 每張進出貨單自動產生一筆桶帳；一單一桶帳。
- 手動登記限收空桶、送空桶、期初差額，且只能單一方向。
- 更正用版本號樂觀鎖，作廢列不計入累計差額。

**料號與去重**
- 以正規化寫法產生 fingerprint 去重（22 與 22.0 同、6P 與 6p 同）。
- 料號 id 為 `mat_` 加 SHA-256，決定性。

**上限**
- 單據明細 100 筆、合併請款 80 張、批次建料 100 列、批次建圖 25 張、圖檔單檔 5 MB 整批 20 MB、備份含附件 16 MB。

**不猜測原則**
- 未加工長度、外徑、溝槽、舊圖端別在資訊不足時一律顯示「待確認」而非 0，標籤會印「資料待確認，勿依此加工」。這是安全要求，不可簡化。

### 1.6 環境耦合點（必須替換）

| 耦合 | 位置 | 單機版替代 |
|---|---|---|
| `cloudflare:workers` 的 `env.DB` | `db/index.ts`、`db/raw.ts` | 本機 SQLite 檔案，透過相容 D1 介面的 adapter |
| D1 `batch()` 交易語意 | `db/audited.ts` 及所有 route | better-sqlite3 的 `transaction()` |
| `env.BUCKET`（R2） | `app/api/materials`、`drawing-batch`、`drawing-file`、`backup` | 本機資料夾，透過儲存介面 |
| `oai-authenticated-user-*` header | `db/audited.ts`、`allocations.ts`、`drawing-management.ts`、`safety`、`backup` | 操作人員 cookie，由 middleware 轉成相同 header |
| `.openai/hosting.json`、`build/sites-vite-plugin.ts`、`worker/`、`vite.config.ts`、`scripts/*.sh` | 建置與部署 | 標準 `next dev` / `next build` / `next start` |
| `app/chatgpt-auth.ts` | 無任何引用 | 刪除 |
| `worker/index.ts` 的影像最佳化 | `/_vinext/image` | 不需要，圖檔走 `/api/drawing-file` |
| 時區不一致：後端用 UTC 前 10 碼，前端用 Asia/Taipei | 各 route 的 `new Date().toISOString().slice(0,10)` | 統一改為 Asia/Taipei |

### 1.7 其他發現

- `preview/` 目錄是「V21-TEST.1」：獨立的 Vite/React 唯讀測試版，部署在 Vercel，資料讀 Supabase TEST 專案。與單機版無關，但表示原作者已在嘗試搬離 Sites。
- `recharts` 有安裝但 app 沒用到，可移除。
- shadcn 的 60 個元件只用到 13 個：button、input、checkbox、select、combobox、dialog、alert-dialog、table、tabs、sidebar、collapsible、progress、sonner。其餘可捨棄。
- `tests/production-flow.test.mjs` 已經有一個用 `node:sqlite` 模擬 D1 的假 adapter。**這個假 adapter 就是單機版 adapter 的雛形。**

---

## 2. 單機版設計

### 2.1 執行方式

```
安裝 Node.js 22 以上
npm install
npm run dev      開發模式
npm run build    正式建置
npm run start    正式執行
瀏覽器開 http://localhost:3000
```

同一台電腦使用。若日後要區網共用，只需把主機 IP 開放，程式不動。

### 2.2 資料放哪裡

```
專案資料夾/
  data/
    factory.db        SQLite 資料庫，所有帳務與稽核
    files/            圖檔附件，沿用原 key 結構 drawings/{id}/{uuid}
  .env                路徑與設定
  備份/                一鍵備份預設輸出位置（可用 .env 改到外接硬碟）
```

`data/` 整個資料夾寫進 `.gitignore`，營運資料永遠不推上 GitHub。

### 2.3 四個地基的替換設計

**地基 1：資料庫 adapter**

- 套件：`better-sqlite3`。Node 22 內建的 `node:sqlite` 仍是實驗性，正式執行不用。
- 做法：寫一個 `db/local.ts`，提供與 D1 相同的介面：`prepare(sql).bind(...).run() / .all() / .first()`、`batch([...])`。`batch` 內部用 `transaction()` 包起來，回傳每條的 `meta.changes`。
- 效果：所有 route 檔案的 SQL 一行不改。原本的 `json_each`、`RETURNING`、`PRAGMA`、`rowid`、部分唯一索引，better-sqlite3 全部支援。
- Migration：啟動時依 `drizzle/meta/_journal.json` 順序執行尚未套用的 `.sql`，用一張 `__migrations` 表記錄。60 個 trigger 隨之建立。
- 稽核 actor：`db/audited.ts` 的 Proxy 邏輯保留，改包在同一個 transaction 內，比 D1 更安全。
- 設定：`PRAGMA journal_mode=WAL`、`PRAGMA foreign_keys=ON`。

**地基 2：圖檔儲存介面**

- 定義 `storage/index.ts`：`put(key, bytes, contentType)`、`get(key)`、`delete(key)`。
- 單機版實作：寫到 `data/files/{key}`，content type 另存一個 `.meta.json`。
- 4 處呼叫端改用這個介面，未來上線只換實作。
- 備份格式 `files[].base64 + sha256` 契約不變，`verifyBackup` 與還原工具照用。

**地基 3：操作人員**

- 單機版不做密碼登入。
- 第一次開啟時顯示「選擇操作人員」畫面，名字存 cookie。
- 一個 `proxy.ts`（Next 16 的 middleware）讀 cookie，轉成 `oai-authenticated-user-id` 與 `-email` 兩個內部 header。
- 效果：原本所有登入守門（換料、圖面編輯、備份、復原）**一行不改**就能過，稽核從第一天記人名。
- 未來上線只需把「讀 cookie」換成「驗證 session」，其餘不動。這就是前面說的「留位子」。

**地基 4：建置與啟動**

- 改用標準 Next.js，移除 vinext、wrangler、`@cloudflare/vite-plugin`、`worker/`、`build/`、`.openai/`、`scripts/*.sh`。
- `next.config.ts` 設 `images.unoptimized=true`，`serverExternalPackages=['better-sqlite3']`。
- 測試改成純 `node --test`，不再需要先 build。

### 2.4 備份策略

- 保留原「匯出完整備份」按鈕與 JSON 格式。
- 新增「一鍵備份」：把 `data/` 整份複製到 `.env` 指定的路徑，例如外接硬碟，檔名帶日期。
- 保留 `backup-restore.mjs` 還原演練工具。

### 2.5 明確不做的事

- 不做密碼登入、不做多角色權限。
- 不做排程、簽核、設備維護、出勤。
- 不改業務規則、不改畫面配置。先做到「跟原系統一樣」，改良排隊到之後。

---

## 3. 分階段計畫

一次只做一件事，每階段結束都能獨立跑起來給你驗收。

### 階段 0：地基

- 建立 Next.js 專案骨架，搬入 `db/schema.ts`、`drizzle/`、`app/globals.css`、必要的 13 個 UI 元件。
- 寫 `db/local.ts` adapter、migration runner、`storage/`、`proxy.ts`、操作人員畫面。
- 把 `tests/production-flow.test.mjs` 改接本機 adapter，17 個流程測試全綠。
- 驗收標準：空資料庫啟動、選人、看到空的作業總覽。

### 階段 1：往來與帳款

- 往來廠商、出貨管理、進貨管理（舊式手打單）、請款與收款、鐵桶登記簿、作業總覽。
- 端點：`/api/data`、`/api/barrels`。
- 驗收標準：建廠商、開出貨單、合併請款、登記收款、作廢、桶帳，全部照原規則走。

### 階段 2：來料與生產

- 來料規格庫、批次建料、進貨管理（登記來料編輯器）、加工分配、其他訂單、工單與派工、轉出貨、派工標籤列印。
- 端點：`/api/materials`（除圖面動作）、`/api/production`、`/api/receipt-draft`。
- 驗收標準：來料進貨到出貨請款一條龍走通。

### 階段 3：圖面與安全

- 加工圖面庫、批次建圖、圖面管理、圖檔上傳與檢視、備份與復原中心、操作紀錄。
- 端點：`/api/materials` 圖面動作、`/api/drawing-batch`、`/api/drawing-file`、`/api/backup`、`/api/safety`。
- 驗收標準：匯出備份、用還原工具還原成新的 SQLite 副本，內容完全相同。

### 階段 4：資料搬遷與交付

- 見第 4 節。
- 寫使用者手冊：安裝、啟動、備份、還原。

---

## 4. 資料搬遷

原系統資料不在程式碼裡，只在你另外下載的「匯出完整備份」JSON 檔。

搬遷步驟：

1. 在原系統按「匯出完整備份（含圖檔）」，得到 `factory-flow-<日期>.json`。
2. 用原系統附的還原工具產出 SQLite 副本與附件資料夾：
   ```
   node backup-restore.mjs 備份檔.json 輸出資料夾
   ```
   工具會驗證檢查碼、還原每一列連 rowid、比對關聯、重建 trigger，輸出 `factory-flow.sqlite` 與 `attachments/`。
3. 把 `factory-flow.sqlite` 改名放到 `data/factory.db`。
4. 把 `attachments/` 內的檔案依 `attachments.json` 的 key 對照，放回 `data/files/{key}`。單機版會附一支小腳本做這件事。
5. 啟動單機版，作業總覽的數字應與原系統一致。

因為 migration 與 trigger 完全相同，這一步不需要任何欄位轉換。

---

## 5. 待你決定的事

1. **操作人員名單**：第一版要預設幾個名字？還是開放自由輸入？我的建議是 `.env` 列名單，畫面只能選不能打。
2. **一鍵備份目的地**：預設路徑放哪裡，例如 `D:\廠務帳備份\`。
3. **是否保留示範模式**：原系統有「查看示範資料」。我的建議是保留，成本很低。

其餘設計我已給明確立場，你不反對就照這份做。

---

## 附錄 A：檔案處置清單

| 處置 | 檔案 |
|---|---|
| 原封搬入 | `db/schema.ts`、`drizzle/**`、`app/api/**`（改 import 路徑）、`app/*.tsx`、`app/*.ts`（除 chatgpt-auth）、`app/globals.css`、`tests/*.test.mjs`、`scripts/backup-restore-source.mjs`、`scripts/build-backup-tool.mjs`、`public/favicon.svg` |
| 改寫 | `db/index.ts`、`db/raw.ts`、`db/audited.ts`、`app/api/drawing-file/route.ts`、`app/api/backup/route.ts`（改用 storage 介面）、`next.config.ts`、`package.json` |
| 新增 | `db/local.ts`、`db/migrate.ts`、`storage/index.ts`、`storage/local.ts`、`proxy.ts`、`app/operator/page.tsx`、`.env.example`、`scripts/import-attachments.mjs`、`scripts/backup-to-folder.mjs` |
| 刪除 | `worker/`、`build/`、`.openai/`、`vite.config.ts`、`vercel.json`、`scripts/*.sh`、`app/chatgpt-auth.ts`、`examples/`、`preview/`、`backups/`、`worker-configuration.d.ts`、未用的 47 個 shadcn 元件、`recharts` |

## 附錄 B：套件變動

移除：`vinext`、`wrangler`、`@cloudflare/vite-plugin`、`@vitejs/*`、`vite`、`recharts`、`react-server-dom-webpack`
新增：`better-sqlite3`、`@types/better-sqlite3`
保留：`next`、`react`、`react-dom`、`drizzle-orm`、`drizzle-kit`、`zod`、`tailwindcss`、`@tailwindcss/postcss`、`lucide-react`、`sonner`、`clsx`、`tailwind-merge`、`class-variance-authority`、`radix-ui`、`@base-ui/react`、`cmdk`、`date-fns`、`next-themes`

---

## 附錄 C：實作備註（2026-09-07 完成第一版）

- 四階段在同一次完成，因為畫面與 API 是整套原樣搬入，拆階段反而多工。
- Next 16 的 middleware 檔名是 `proxy.ts`，不是 `middleware.ts`。
- trigger 實際數量是 60 個（0009 有 2 個、0010 有 7 個、0011 有 51 個），測試會核對這個數字。
- 操作人員名字含中文，HTTP header 不能直接放，所以 `proxy.ts` 用百分號編碼寫入 header，四個讀取端解碼。
- 一鍵備份做成 `/api/local-backup` 與「備份與復原」頁的按鈕，也可用 `npm run backup` 從指令列執行。
- 測試 28 個全數通過，其中 17 個是原系統的完整流程測試，直接跑在本機 adapter 的相容介面上。
