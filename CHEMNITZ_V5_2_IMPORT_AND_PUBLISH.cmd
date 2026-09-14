@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d %~dp0

if not exist package.json (
  echo [ERROR] Extract this ZIP directly into F:\ZVG-SITE-GIT and run it there.
  exit /b 2
)
if not exist data\zvg-chemnitz-v5\chemnitz_39_v5.json (
  echo [ERROR] Missing V5 data. Keep the previous V5/V5.1 files in this project.
  exit /b 2
)
if not exist var\chemnitz_v5_locations.json (
  echo [ERROR] Missing verified geo report.
  exit /b 2
)
if not exist var\chemnitz_v5_media_manifest.json (
  echo [ERROR] Missing prepared V5.1 media manifest.
  exit /b 2
)

echo ============================================================
echo ZVG-DE CHEMNITZ V5.2 - ACTUAL DB IMPORT + GITHUB MAIN PUBLISH
echo Fixes Windows batch control flow: npm.cmd is called with CALL.
echo Existing 593 photos / 196 PDFs are reused; nothing is redownloaded.
echo ============================================================

echo [1/7] Re-check existing V5.1 quality gate...
node scripts\zvg_chemnitz_v5_2\verify_v52.cjs
if errorlevel 1 goto :blocked

echo [2/7] Database dry-run...
node scripts\zvg_chemnitz_v5_2\import_chemnitz_v5.cjs --dry-run
if errorlevel 1 goto :blocked

echo [3/7] Production frontend build...
call npm run build
if errorlevel 1 goto :blocked

echo.
echo ============================================================
echo [READY] QA + DB dry-run + frontend build passed.
echo The next step WILL update the database for Amtsgericht Chemnitz.
echo ============================================================
choice /C YN /N /M "Import/upsert the 39 Chemnitz proceedings into the database now? [Y/N]: "
if errorlevel 2 (
  echo [STOP] Cancelled before database write.
  exit /b 20
)

echo [4/7] REAL database import/upsert...
node scripts\zvg_chemnitz_v5_2\import_chemnitz_v5.cjs --confirm=CHEMNITZ_39
if errorlevel 1 (
  echo [STOP] Database import failed. Nothing will be published.
  exit /b 12
)

echo [5/7] Stage only ZVG-DE runtime/media files for Git...
git add public/zvg-media/chemnitz-v5 public/zvg-docs/chemnitz-v5 data/zvg-chemnitz-v5 scripts/zvg_chemnitz_v5_1 scripts/zvg_chemnitz_v5_2 CHEMNITZ_V5_2_IMPORT_AND_PUBLISH.cmd
if exist components\PropertyAnalysisPanel.tsx git add components\PropertyAnalysisPanel.tsx
if exist "app\properties\[id]\page.tsx" git add "app\properties\[id]\page.tsx"
if exist app\globals.css git add app\globals.css
if exist prisma\schema.prisma git add prisma\schema.prisma

echo.
echo -------- STAGED FILES --------
git diff --cached --stat
echo ------------------------------
choice /C YN /N /M "Commit the staged ZVG-DE files shown above? [Y/N]: "
if errorlevel 2 (
  echo [STOP] Database IS already imported, but Git publish was cancelled.
  echo Run this script again later; importer is idempotent/upsert-based.
  exit /b 21
)

git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Publish Chemnitz V5.2 verified court data and media"
  if errorlevel 1 exit /b 13
) else (
  echo [INFO] Nothing new to commit; continuing with current HEAD.
)

echo [6/7] Fetch GitHub and verify Production can fast-forward from current HEAD...
git fetch origin
if errorlevel 1 exit /b 14
for /f "delims=" %%B in ('git branch --show-current') do set CURBR=%%B
if "!CURBR!"=="" (
  echo [ERROR] Could not determine current branch.
  exit /b 15
)

git merge-base --is-ancestor origin/main HEAD
if errorlevel 1 (
  echo [STOP] origin/main is not an ancestor of current HEAD.
  echo No production push was attempted. Send me: git log --oneline --decorate --graph -20 --all
  exit /b 16
)

echo.
echo ============================================================
echo COMMITS THAT WILL ENTER PRODUCTION MAIN:
git log --oneline --decorate origin/main..HEAD
echo ============================================================
choice /C YN /N /M "Push current HEAD directly to origin/main (Vercel Production)? [Y/N]: "
if errorlevel 2 (
  echo [STOP] Database is imported and commit exists, but Production push was cancelled.
  exit /b 22
)

echo [7/7] Push HEAD -^> GitHub main -^> Vercel Production...
git push origin HEAD:main
if errorlevel 1 (
  echo [STOP] GitHub push failed. Database is already imported; no DB rollback was attempted.
  exit /b 17
)

echo.
echo ============================================================
echo [OK] CHEMNITZ V5.2 COMPLETE
echo - Database import completed and verified by importer: 39 court rows
 echo - Media/doc files committed
 echo - GitHub main updated
 echo - Vercel Production deployment should now start automatically
 echo ============================================================
exit /b 0

:blocked
echo.
echo ============================================================
echo [STOP] PRE-IMPORT CHECK FAILED. DATABASE WAS NOT CHANGED BY V5.2.
echo ============================================================
exit /b 9
