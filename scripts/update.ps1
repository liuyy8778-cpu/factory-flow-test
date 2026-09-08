$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
$app = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $app
$branch = 'claude/data-lookup-lf8por'
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$zipUrl = "https://github.com/liuyy8778-cpu/factory-flow-test/archive/refs/heads/$branch.zip?t=$stamp"
$tmp = Join-Path $env:TEMP 'factory-flow-update'
$zip = Join-Path $env:TEMP 'factory-flow-update.zip'
$ProgressPreference = 'SilentlyContinue'

Write-Host "程式資料夾：$app"
$running = Get-CimInstance Win32_Process -Filter "name='node.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.IndexOf($app, [System.StringComparison]::OrdinalIgnoreCase) -ge 0 }
if ($running) {
  Write-Host '系統還在執行中，先幫你關閉。'
  $running | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Seconds 2
}

Write-Host '正在下載最新版...'
if (Test-Path $zip) { Remove-Item $zip -Force }
Invoke-WebRequest -Uri $zipUrl -OutFile $zip -UseBasicParsing
$size = (Get-Item $zip).Length
Write-Host ("下載完成：{0:N0} KB" -f ($size / 1KB))
if ($size -lt 100KB) { throw '下載的檔案太小，可能不是程式。請截圖給我。' }

Write-Host '正在解壓縮...'
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
Expand-Archive -Path $zip -DestinationPath $tmp -Force
$src = Get-ChildItem $tmp -Directory | Select-Object -First 1
if (-not $src) { throw '解壓縮後找不到資料夾' }
$srcVer = Select-String -Path (Join-Path $src.FullName 'app\version-info.tsx') -Pattern "v:(\d+),date:'([^']+)'" | Select-Object -First 1
if ($srcVer) { Write-Host ("下載到的版本：V{0} · {1}" -f $srcVer.Matches[0].Groups[1].Value, $srcVer.Matches[0].Groups[2].Value) }

Write-Host '正在換上新程式（不動 data 與 備份）...'
$skip = @('data', '備份', 'node_modules', '.next', '.git', '.env')
$count = 0
Get-ChildItem -LiteralPath $src.FullName -Force | Where-Object { $skip -notcontains $_.Name } | ForEach-Object {
  $dest = Join-Path $app $_.Name
  if ($_.PSIsContainer) {
    Copy-Item -LiteralPath $_.FullName -Destination $app -Recurse -Force
  } else {
    Copy-Item -LiteralPath $_.FullName -Destination $dest -Force
  }
  $count++
}
Write-Host "已換上 $count 個項目"
if (-not (Test-Path (Join-Path $app 'app\series-drawings.tsx'))) { throw '複製後找不到新檔案 app\series-drawings.tsx，更新沒有成功。請截圖給我。' }
$ver = Select-String -Path (Join-Path $app 'app\version-info.tsx') -Pattern "v:(\d+),date:'([^']+)'" | Select-Object -First 1
if ($ver) { Write-Host ("現在的版本：V{0} · {1}" -f $ver.Matches[0].Groups[1].Value, $ver.Matches[0].Groups[2].Value) }

if (Test-Path (Join-Path $app '.next')) { Remove-Item (Join-Path $app '.next') -Recurse -Force }
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $zip -Force -ErrorAction SilentlyContinue

Write-Host '正在重新準備系統，約 1 到 3 分鐘...'
& npm install
if ($LASTEXITCODE -ne 0) { throw 'npm install 失敗，請截圖給我' }
& npm run build
if ($LASTEXITCODE -ne 0) { throw '建置失敗，請截圖給我' }
Write-Host ''
Write-Host '更新完成。現在可以點「啟動」了。'
