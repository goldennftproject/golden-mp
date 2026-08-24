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
REM 24/8: git add -A venia FALLANDO EN SILENCIO. node_modules estaba versionado y trae enlaces
REM simbolicos que Windows no puede escribir ("Function not implemented"): git abortaba el add
REM ENTERO, no se quedaba nada preparado, y el commit no se hacia. El push subia solo lo que ya
REM estuviera commiteado de antes, asi que cualquier cambio hecho aca NUNCA llegaba al juego.
REM node_modules ya no se versiona (Render instala las dependencias solo, desde package.json).
REM Y si el add vuelve a fallar por lo que sea, esto se planta: mejor no deployar que deployar
REM la mitad.
git add -A
if errorlevel 1 goto :falloadd
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

:falloadd
echo.
echo   !! GIT ADD FALLO: no se preparo nada, asi que no hay nada que subir.
echo   No se deploya a medias. Mira el error de arriba.
pause
exit /b 1

:fallo
echo.
echo   !! EL PUSH FALLO. Render NO va a redeployar: nada de esto llego al juego.
pause
exit /b 1
