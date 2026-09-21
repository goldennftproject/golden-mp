# Cómo llega el código al juego  (15/9)

> **Esto es la Ley 5**, dictada por dirección el 15/9: *« todo lo que hagas, e incluso lo que
> hagas en tu sandbox, y que yo lo apruebe como un cambio, lo pondrás para que yo pueda hacerle
> deploy »*. El texto completo está en `docs/LEYES.md`; acá está el cómo.

**Esto se escribe porque el 15/9 se perdió una tarde entera por no saberlo.** Ocho commits
—el portero del mercado, el orden del pantano, el combate, el freeze, el muñeco de la Zona,
la vida por nivel— se quedaron en el contenedor de la nube y el diseñador probó el juego sin
nada de eso puesto. El deploy se hizo, pero sobre archivos que no habían cambiado.

## Hay DOS copias del repo, y solo una es la de verdad

1. **La del contenedor** (`/home/claude/golden-mp`) — donde trabajo y donde corro la suite.
   Su `git` es un cuaderno mío: sus commits **no llegan a ningún lado solos** y su `origin/main`
   se queda viejo. Está siempre divergido de la otra (hoy: 32 commits por delante y 30 por detrás).
2. **La del PC de Golden** (`C:\Users\pauli\Desktop\golden\golden-mp`) — **ésta es la que se
   deploya**. `deploy.bat` hace add/commit/push desde ahí y Render publica eso.

## La regla

**Cada cambio de código termina copiado al PC. Si no se copió, no existe.** Commitear en el
contenedor no es entregar: es tomar nota.

El camino es el puente de dispositivo (`mcp__remote-devices__*`). Con `device_bash` caído
—pasa— se hace igual con `device_stage_files` (leer) y `device_commit_files` (escribir).

## Antes de escribir encima, comparar

Él también toca su copia (arte, sobre todo), así que nunca se pisa a ciegas:

1. `device_stage_files` de los archivos que voy a tocar;
2. comparar su copia con **mi versión de antes de los cambios** (`git show <base>:<archivo>`);
3. si son iguales, su copia no tiene nada mío por delante y se puede escribir encima.

**`public/index.html` es la excepción**: lleva el sello `GF_BUILD` que `deploy.bat` reescribe en
cada deploy. Al entregarlo hay que dejarle EL SELLO QUE ÉL TIENE (leerlo de su copia y ponerlo en
la mía), o el diff del deploy se llena de ruido.

## Y después, comprobar que llegó

No alcanza con que el commit diga OK. Se vuelve a leer el archivo del PC y se busca lo nuevo
dentro (`grep` de una constante que acabo de agregar). Lo mismo con el juego publicado: abrir
`https://golden-mp.onrender.com` y pedir `/game/state.js` con un `?x=` para saltar la caché.
**« Antes de decir que falta que deploye, chequeá »** — y también antes de decir que ya está.

## Hay OTRO que escribe en el PC (21/9)

Golden usa además un chat aparte para lo visual. Sus cambios entran directo en el PC y se
deployan con `deploy.bat`, igual que los míos: aparecen en el `git log` del PC como commits
« deploy … » que NO se corresponden con ninguna entrega mía. El 20-21/9 fueron dos: los marcadores
individuales de hambre del corral (`animal_feed_marker.png` + `boot.js` + `farm.js` +
`test-marcadores-animales.js`) y el Mercado a 2,1 celdas (`farm.js` + `test-celdas-vs-sprites.js`
+ `TODO.md`). Yo tomé su `farm.js` y me faltaron el PNG y `boot.js`, y « arreglé » algo que ya
funcionaba. Para que no se repita, antes de tocar un archivo:

1. `git log --since=<mi última entrega> --stat` en el PC: cada commit con archivos que yo no
   entregué es de él;
2. traer al contenedor TODO lo que toque ese commit (arte, boot.js, tests, TODO), no solo el
   archivo que voy a editar;
3. correr sus tests además de los míos; los suyos también custodian su trabajo.
4. si su commit trae un PNG nuevo, va al atlas: `python3 tools/build-atlas.py` y subir el `?v=`
   en `boot.js` **y en el `<link rel="preload">` de `index.html`** (el 22/9 estaban en 49 y 44:
   el preload pedía un atlas viejo). `test-carga-una-pasada.js` avisa si queda un PNG suelto.
