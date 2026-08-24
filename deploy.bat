@echo off
REM ================================================
REM  Golden MP - Deploy de un clic
REM  Sube los cambios a GitHub; Render redeploya solo.
REM  Ponelo DENTRO de la carpeta del repo (junto a package.json).
REM ================================================
cd /d "%~dp0"

echo.
echo == Sello de build (respaldo local; el servidor lo calcula solo desde los .js) ==
powershell -NoProfile -ExecutionPolicy Bypass -File "tools\stamp-build.ps1"

echo.
echo == Subiendo cambios a GitHub ==
git add -A
git commit -m "deploy %date% %time%"
git push
if errorlevel 1 goto :fallo

echo.
echo == Comprobacion: que no haya quedado nada sin subir ==
REM 24/8: el 24/8 el sello quedo SIN commitear y el server siguio anunciando el numero viejo.
REM El sello ya no depende de esto (lo calcula el servidor), pero un archivo del JUEGO que se
REM quede sin subir es igual de grave y hasta hoy nadie avisaba. Ahora avisa.
git status --porcelain -- public src > "%TEMP%\gf_pend.txt"
for /f %%A in ("%TEMP%\gf_pend.txt") do if %%~zA GTR 0 (
  echo.
  echo   !! OJO: quedaron cambios SIN SUBIR en public/ o src/:
  type "%TEMP%\gf_pend.txt"
  echo   Lo que ves en el juego NO va a incluirlos.
  echo.
)
del "%TEMP%\gf_pend.txt" 2>nul

echo.
echo Listo. Render va a redeployar automaticamente en 1-2 minutos.
echo Podes cerrar esta ventana.
pause
exit /b 0

:fallo
echo.
echo   !! EL PUSH FALLO. Render NO va a redeployar: nada de esto llego al juego.
pause
exit /b 1
