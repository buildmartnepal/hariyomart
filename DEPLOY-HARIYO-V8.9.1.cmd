@echo off
setlocal
cd /d %~dp0

echo Hariyo Mart Nepal v8.9.1 - production/test deployment
call npm ci || exit /b %errorlevel%
call npm run catalog:sync || exit /b %errorlevel%
call npm run v8.8:doctor || exit /b %errorlevel%
call npm run production:guard || exit /b %errorlevel%
call npm run typecheck || exit /b %errorlevel%
call npm run test || exit /b %errorlevel%
call npm run build:cloudflare || exit /b %errorlevel%
call npm run deploy:cloudflare:production || exit /b %errorlevel%

echo Deployment complete. Verify /api/health and /api/system/readiness.
endlocal
