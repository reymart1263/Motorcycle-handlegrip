@echo off
REM Run dev server without PowerShell npm.ps1 (ExecutionPolicy issues).
setlocal
cd /d "%~dp0"
if not exist "node_modules\tsx\dist\cli.mjs" (
  echo [dev.cmd] Run: npm.cmd install
  exit /b 1
)
node "node_modules\tsx\dist\cli.mjs" "server.ts"
