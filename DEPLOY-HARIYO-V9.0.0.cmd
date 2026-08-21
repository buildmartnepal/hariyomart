@echo off
setlocal
cd /d %~dp0

echo Hariyo Mart Nepal v9.0.0 - Demo Lab + Repeat Commerce deployment
call npm clean-install --progress=false || exit /b %errorlevel%
call npm run catalog:sync || exit /b %errorlevel%
call npm run v9:doctor || exit /b %errorlevel%
call npm run production:guard || exit /b %errorlevel%
call npm run typecheck || exit /b %errorlevel%
call npm run test || exit /b %errorlevel%
call npm run build:cloudflare || exit /b %errorlevel%
call npm run deploy:cloudflare:production || exit /b %errorlevel%

echo Deployment complete. Verify /api/system/readiness then open /demo.
endlocal
