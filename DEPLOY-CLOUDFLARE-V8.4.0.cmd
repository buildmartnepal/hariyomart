@echo off
setlocal
cd /d "%~dp0"
echo.
echo Hariyo Mart Nepal v8.4.0 - Production Access + Mobile SaaS Upgrade
echo ================================================================
echo This upgrades D1 first, verifies the standalone Worker config, then deploys the web Worker.
echo.
call npm install
if errorlevel 1 exit /b %errorlevel%
call npm run cloudflare:config:check
if errorlevel 1 exit /b %errorlevel%
call npm run cloudflare:db:remote
if errorlevel 1 exit /b %errorlevel%
call npm run deploy:cloudflare:web
if errorlevel 1 exit /b %errorlevel%
echo.
echo v8.4.0 web deployment finished.
echo Open /admin/users and create farmer, vendor, customer or additional admin accounts.
endlocal
