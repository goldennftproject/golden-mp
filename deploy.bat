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
REM 9/9: Y LO PRIMERO, ESTAR EN UNA RAMA. El deploy del 9/9 a las 21:54 commiteo bien y murio
REM en el push con "You are not currently on a branch": el repo estaba en HEAD DESPRENDIDO
REM porque una sesion de diagnostico hizo `git checkout <sha>` para comparar commits y no
REM volvio. Los ocho commits del dia estaban ahi, sanos, pero colgando fuera de main — y el
REM push no tiene adonde ir. Se comprueba ANTES de tocar nada: es un segundo, y el sintoma sin
REM el aviso parece que el deploy esta roto cuando lo que esta mal es donde esta parado el repo.
git symbolic-ref -q HEAD >nul
if errorlevel 1 goto :fallorama

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

:fallorama
echo.
echo   !! EL REPO NO ESTA EN UNA RAMA (HEAD desprendido). No se commiteo nada.
echo.
echo   Los commits que hagas asi quedan colgando y el push no tiene adonde ir.
echo   No se pierde nada: estan todos guardados. Para volver a la rama y llevarte
echo   lo que quedo suelto, en esta misma carpeta:
echo.
echo       git branch -f main HEAD
echo       git checkout main
echo.
echo   (comproba antes con  git log --oneline -3  que lo de arriba es tuyo)
echo   Y despues volve a correr este deploy.
pause
exit /b 1

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
