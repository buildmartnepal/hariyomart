@echo off
setlocal
cd /d "%~dp0"
echo.
echo =============================================
echo   HARIYO MART v8.5.0 EASY PRODUCTION SETUP
echo =============================================
echo.
call npm install || exit /b 1
call npm run setup:env || exit /b 1
echo.
echo Private setup saved to HARIYO-PRIVATE-SETUP.generated.txt
echo DO NOT commit that file.
echo.
choice /M "Push configured secrets to Cloudflare now"
if errorlevel 2 goto migrate
call npm run secrets:push || exit /b 1
:migrate
call npm run cloudflare:config:check || exit /b 1
call npm run cloudflare:db:remote || exit /b 1
echo.
choice /M "Deploy Hariyo Mart v8.5.0 now"
if errorlevel 2 goto done
call npm run deploy:cloudflare || exit /b 1
echo.
choice /M "Create the FIRST admin now (skip if admin already exists)"
if errorlevel 2 goto done
call npm run bootstrap:admin
:done
echo.
echo Setup workflow finished.
echo Admin login: your production URL /login
echo Farmer studio: /farmer/overview
echo Smart marketplace: /nearby and /shop
endlocal
