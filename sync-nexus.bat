@echo off
setlocal
REM ------------------------------------------------------------------
REM  Sync Project Nexus with GitHub (double-click to run)
REM   1. saves (commits) every edit you made on this PC
REM   2. gets the latest changes from GitHub (including merged Claude PRs)
REM   3. sends your edits to GitHub, so Vercel redeploys the live site
REM  .env and other secret files are never sent (they are in .gitignore).
REM ------------------------------------------------------------------
title Sync Project Nexus
cd /d "%~dp0"

where git >nul 2>nul
if errorlevel 1 (
  echo Git is not installed. Get it from https://git-scm.com/download/win
  goto :done
)

for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%b
if /i not "%BRANCH%"=="main" (
  echo You are on branch "%BRANCH%", not main. Switching to main...
  git checkout main
  if errorlevel 1 goto :fail
)

echo.
echo [1/3] Saving your edits...
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -q -m "Update from %COMPUTERNAME% on %DATE% %TIME:~0,5%"
  if errorlevel 1 goto :fail
  echo       Edits saved.
) else (
  echo       No new edits on this PC.
)

echo.
echo [2/3] Getting the latest changes from GitHub...
for /f "delims=" %%h in ('git rev-parse HEAD:package-lock.json 2^>nul') do set LOCK_BEFORE=%%h
git pull --no-rebase --no-edit origin main
if errorlevel 1 (
  echo.
  echo  Your edits and the GitHub changes touch the same lines.
  echo  Nothing was sent. Ask Claude to help, or open GitHub Desktop
  echo  to pick which version to keep.
  goto :done
)
for /f "delims=" %%h in ('git rev-parse HEAD:package-lock.json 2^>nul') do set LOCK_AFTER=%%h
if not "%LOCK_BEFORE%"=="%LOCK_AFTER%" (
  echo       Packages changed, installing them...
  call npm.cmd install --no-audit --no-fund
)

echo.
echo [3/3] Sending your edits to GitHub (Vercel will redeploy)...
git push origin main
if errorlevel 1 goto :fail

echo.
echo  Done. Your PC and GitHub are in sync. The live site updates in 2-3 minutes.
echo  If "npm run dev" is running, localhost already shows the latest version.
goto :done

:fail
echo.
echo  Something went wrong - read the message above, or send a screenshot to Claude.

:done
echo.
pause
