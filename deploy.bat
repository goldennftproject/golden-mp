@echo off
REM ================================================
REM  Golden MP - Deploy de un clic
REM  Sube los cambios a GitHub; Render redeploya solo.
REM  Ponelo DENTRO de la carpeta del repo (junto a package.json).
REM ================================================
cd /d "%~dp0"

echo.
echo == Subiendo cambios a GitHub ==
git add -A
git commit -m "deploy %date% %time%"
git push

echo.
echo Listo. Render va a redeployar automaticamente en 1-2 minutos.
echo Podes cerrar esta ventana.
pause
