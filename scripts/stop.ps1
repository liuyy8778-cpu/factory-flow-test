# Stop node.exe processes started from this project folder (our own server only).
$app = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Get-CimInstance Win32_Process -Filter "name='node.exe'" |
  Where-Object { $_.CommandLine -and $_.CommandLine.IndexOf($app, [System.StringComparison]::OrdinalIgnoreCase) -ge 0 } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
