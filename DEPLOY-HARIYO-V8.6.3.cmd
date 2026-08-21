@echo off
setlocal
cd /d "%~dp0"
echo.
echo ====================================================
echo Hariyo Mart Nepal v8.6.3 - Production Deploy
echo ====================================================
echo.
where node >nul 2>nul || (echo ERROR: Node.js is not installed.& exit /b 1)
where npm >nul 2>nul || (echo ERROR: npm is not installed.& exit /b 1)

echo [1/5] Installing exact dependencies...
call npm ci
if errorlevel 1 exit /b %errorlevel%

echo [2/5] Syncing catalog and Cloudflare seed...
call npm run catalog:sync
if errorlevel 1 exit /b %errorlevel%

echo [3/5] Running v8.6 production checks...
call npm run production:guard
if errorlevel 1 exit /b %errorlevel%
set ALLOW_TURNSTILE_PLACEHOLDER=0
call npm run cloudflare:config:check
if errorlevel 1 exit /b %errorlevel%
call npm run v8.6:doctor
if errorlevel 1 exit /b %errorlevel%

echo [4/5] Generating Cloudflare binding types...
call npm run cloudflare:types
if errorlevel 1 exit /b %errorlevel%

echo [5/5] Deploying services, D1 migration and public web Worker...
call npm run deploy:cloudflare:production
if errorlevel 1 exit /b %errorlevel%

echo.
echo Deployment command completed. Verify /api/health, /api/system/readiness, /shop, /nearby and a product detail page.
endlocal
