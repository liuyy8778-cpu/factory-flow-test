#!/bin/bash
# macOS 用：在 Finder 點兩下這個檔案即可啟動。
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "這台電腦還沒安裝 Node.js，請到 https://nodejs.org/ 下載 LTS 版安裝後再試。"
  open https://nodejs.org/; read -r -p "按 Enter 關閉"; exit 1
fi
[ -d node_modules ] || { echo "第一次啟動，正在安裝需要的元件..."; npm install || { read -r -p "安裝失敗，按 Enter 關閉"; exit 1; }; }
[ -f .next/BUILD_ID ] || { echo "第一次啟動，正在準備系統..."; npm run build || { read -r -p "準備失敗，按 Enter 關閉"; exit 1; }; }
echo "系統啟動中，等一下會自動打開瀏覽器。使用期間請不要關閉這個視窗。"
( sleep 5; open http://localhost:3000 ) &
npm run start
