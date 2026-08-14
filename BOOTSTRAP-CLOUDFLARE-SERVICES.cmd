@echo off
setlocal
cd /d "%~dp0"
echo.
echo Hariyo Mart v8.3.2 - Cloudflare services bootstrap
echo Target: hariyo-mart-services must exist before hariyo-mart-nepal.
echo.
call npm install
if errorlevel 1 exit /b %errorlevel%
call npm run cloudflare:bootstrap:services
if errorlevel 1 exit /b %errorlevel%
echo.
echo Services Worker deployed. Retry the Cloudflare connected web build now.
endlocal
