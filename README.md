# 廠務帳 單機版

小型車床工廠的進出貨、請款收款、來料規格、加工圖面、派工與鐵桶登記系統。
從「廠務帳 V20」（原本跑在 OpenAI Sites / Cloudflare）重建成**一台電腦就能跑**的版本，所有資料都在你自己的硬碟上。

- 重建盤點與設計：[docs/rebuild-spec.md](docs/rebuild-spec.md)
- 原系統：`liuyy8778-cpu/factory-flow`

## 最簡單的用法（不用打任何指令）

1. 先裝 [Node.js](https://nodejs.org/)：進網頁按綠色的 LTS 下載，一路「下一步」裝完。
2. 在 GitHub 這頁按綠色 **Code** → **Download ZIP**，解壓縮到你想放的地方，例如 `D:\廠務帳`。
3. 打開那個資料夾，**點兩下 `啟動.bat`**（Mac 是 `啟動.command`）。
   第一次會跑幾分鐘安裝與準備，之後每次幾秒就好。黑色視窗留著不要關，瀏覽器會自動打開系統。
4. 畫面要你選操作人員，輸入名字按「開始使用」，就進到系統了。
5. 要關閉系統，把黑色視窗關掉。
6. 每天下班**點兩下 `備份.bat`**，資料會複製到 `備份` 資料夾。
7. 我改好新版後，先關閉啟動的黑色視窗，**點兩下 `更新.bat`**，它會自己下載新版並重新準備，不會動到你的資料。

下面是給想自己打指令的人看的，可以跳過。

## 安裝（第一次）

1. 安裝 [Node.js](https://nodejs.org/) 22 以上（LTS 版即可）。
2. 下載這個專案（Code → Download ZIP 解壓縮，或 `git clone`）。
3. 在專案資料夾開終端機，執行：

```
npm install
npm run build
```

Windows 若 `npm install` 在 better-sqlite3 那一步失敗，通常是缺少建置工具；重新執行一次多半就好，仍不行再安裝 Visual Studio Build Tools 的「使用 C++ 的桌面開發」。

## 每天啟動

```
npm run start
```

看到 `Ready` 後，用瀏覽器開 <http://localhost:3000>。

第一次會要你**選擇操作人員**。之後所有新增、修改、作廢都記在這個名字底下。要換人，點側欄左下角的「操作人員」。

關掉終端機視窗就是關閉系統。

## 資料放在哪

```
專案資料夾/
  data/
    factory.db     資料庫（客戶、單據、工單、圖面、稽核紀錄，全部在這一個檔）
    files/         圖面附件
  備份/            一鍵備份的輸出位置
  .env             設定檔（選用）
```

`data/` 與 `備份/` 不會被推上 GitHub。

## 備份（請養成習慣）

硬碟只有一份資料，硬碟壞了就全沒了。兩種備份方式：

1. **一鍵備份**：側欄「備份與復原」→「一鍵備份到資料夾」。會把資料庫和圖檔複製到 `備份/廠務帳-日期_時間/`。
   建議在 `.env` 把 `FACTORY_BACKUP_DIR` 指到外接硬碟或 NAS，例如 `FACTORY_BACKUP_DIR=E:\廠務帳備份`。
   也可以從終端機執行 `npm run backup`。
2. **匯出完整備份（含圖檔）**：同一頁的第二個按鈕，產生一個 JSON 檔，可用「檢查完整性」驗證，也可用 `public/backup-restore.mjs` 還原演練。

## 設定檔 .env（選用）

把 `.env.example` 複製成 `.env` 再修改：

| 項目 | 用途 | 預設 |
|---|---|---|
| `FACTORY_DATA_DIR` | 營運資料位置 | 專案內 `data/` |
| `FACTORY_BACKUP_DIR` | 一鍵備份目的地 | 專案內 `備份/` |
| `FACTORY_OPERATORS` | 操作人員名單，逗號分隔。設了就只能選不能打 | 不設，自由輸入 |
| `PORT` | 連接埠 | 3000 |

## 從原系統搬資料

1. 在原系統按「匯出完整備份（含圖檔）」得到 `factory-flow-<日期>.json`。
2. 用還原工具產出 SQLite 與附件：
   ```
   node public/backup-restore.mjs 備份檔.json 還原資料夾
   ```
3. 把還原結果放進 `data/`（`data/factory.db` 不存在時會自動放入）：
   ```
   npm run import-attachments -- 還原資料夾
   ```
4. 啟動系統，作業總覽的數字應與原系統一致。

## 多台電腦共用

把這套裝在一台常開的電腦或迷你主機，其他電腦用瀏覽器開 `http://主機IP:3000` 即可。
程式不用改，只要主機固定 IP。這時每個人各選自己的名字，稽核就記得到是誰改的。

## 開發者

```
npm run dev          開發模式（自動重載）
npm run test         28 個測試（含原系統 17 個完整流程測試）
npm run typecheck    TypeScript 檢查
npm run lint         ESLint
npm run db:generate  由 db/schema.ts 產生新的 migration
```

技術：Next.js 16、React 19、better-sqlite3、Tailwind v4。四個替換點的設計見 `docs/rebuild-spec.md` 第 2.3 節。
