@echo off
setlocal
cd /d "%~dp0"
echo Hariyo Mart Nepal v10.0.1 production deployment
echo.
call npm ci || exit /b 1
call npm run v10:preflight || exit /b 1
call npm run cloudflare:types || exit /b 1
call npm run typecheck || exit /b 1
call npm run test || exit /b 1
call npm run build:cloudflare:production || exit /b 1
call npm run deploy:cloudflare:production || exit /b 1
echo.
echo Hariyo Mart v10.0.1 deployment completed.
endlocal
