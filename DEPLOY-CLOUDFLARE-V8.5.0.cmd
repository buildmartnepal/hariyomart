@echo off
setlocal
cd /d "%~dp0"
echo Hariyo Mart v8.5.0 production deploy
call npm install || exit /b 1
call npm run cloudflare:config:check || exit /b 1
call npm run cloudflare:db:remote || exit /b 1
call npm run deploy:cloudflare || exit /b 1
echo v8.5.0 deployed.
endlocal
