@echo off
setlocal
cd /d "%~dp0"
echo.
echo Hariyo Mart Nepal v8.3.3 - standalone Cloudflare web deployment
echo This release does NOT require hariyo-mart-services to exist.
echo.
call npm install
if errorlevel 1 exit /b %errorlevel%
call npm run cloudflare:config:check
if errorlevel 1 exit /b %errorlevel%
echo.
echo Applying remote D1 migrations through 0006...
call npm run cloudflare:db:remote
if errorlevel 1 exit /b %errorlevel%
echo.
echo Building and deploying hariyo-mart-nepal...
call npm run deploy:cloudflare:web
if errorlevel 1 exit /b %errorlevel%
echo.
echo Deploy completed. Verify:
echo   /api/health
echo   /api/system/readiness
echo   /api/system/supply-stack
echo.
echo IMPORTANT: configure JWT_SECRET, JWT_REFRESH_SECRET and Turnstile before public launch.
endlocal
