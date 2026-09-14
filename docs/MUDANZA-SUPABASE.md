# Mudar el juego a un proyecto nuevo de Supabase (14/9)

*Por qué: el proyecto `eusxpsmqczmczgyhndtd` (cuenta vieja, Free, region Brasil) lleva desde el
10/9 colgado en « Restarting… » por el incidente « Unresponsive Projects » de Supabase; la base
responde pero el dashboard no. Dirección decidió (14/9) arrancar de cero en un proyecto nuevo de
la otra cuenta: somos dos jugadores y la prueba del MVP empieza de todos modos desde el nivel 1.
Nada del proyecto viejo se migra.*

Todo se hace en el dashboard de la cuenta que anda. Son ocho pasos; el orden importa.

## 0 · Lugar en el plan Free

El plan Free permite **2 proyectos activos por organización**. Si la organización ya tiene dos,
el dashboard no deja crear el tercero. Lo más limpio: **New organization** (Free) y el proyecto
va ahí. La otra opción es pausar uno de los dos que no esté en uso.

## 1 · Crear el proyecto (3 min)

Dashboard → **New project**. Nombre `goldenfarm`, región **South America (São Paulo)** (los dos
jugadores están en Uruguay), una contraseña de base de datos — **guardala en un lugar seguro**:
es lo que hace falta para exportar o migrar sin dashboard, que es justo lo que no tuvimos esta
semana. Esperá a que diga *Project is ready*.

## 2 · Login anónimo (1 min)

**Authentication → Sign In / Providers** (o *Providers*): activar **Anonymous sign-ins**. Sin
esto nadie puede entrar: el juego no usa email.

## 3 · Las tablas (2 min)

**SQL Editor → New query** → pegar TODO `sql/instalar-proyecto-nuevo.sql` → **Run**. Tiene que
decir *Success*. Deja `farms`, los dos rankings, el mercado P2P y la bitácora del portero. Se
puede correr dos veces sin romper nada.

## 4 · El portero, en sombra (5 min)

**Edge Functions → Deploy a new function → Via Editor**. Nombre exacto: `guardar`. Borrar el
ejemplo y pegar el contenido COMPLETO de `supabase/functions/guardar/index.ts` (con
`MODO = "sombra"`, como está). *Verify JWT* activado. **Deploy**.

## 5 · Apuntar el juego al proyecto nuevo (2 min)

**Project Settings → API**: copiar *Project URL* y la key **anon public** (la `service_role`
NUNCA va al cliente; el script la rechaza). En una terminal dentro de `golden-mp`:

```
node tools/cambiar-supabase.js https://<ref>.supabase.co <anon key>
deploy.bat
```

El script reescribe `save.js` e `index.html`, comprueba que la key sea del mismo proyecto que la
URL y que sea la anon. Con el deploy, Render pasa a hablar con el proyecto nuevo.

**Qué pasa con los navegadores que ya jugaron:** desde el 14/9 la marca de cuenta y la copia
local de la granja llevan el nombre del proyecto en la llave (`gf-cuenta-<ref>`,
`gf-granja-copia-<ref>`). Un navegador con granja del proyecto viejo entra al nuevo como nuevo:
pide apodo, crea cuenta anónima, nivel 1. Sin eso, el arranque veía la marca vieja, creía que
« acá hubo granja », no creaba cuenta y dejaba al jugador colgado — o resucitaba la copia vieja
encima de la granja nueva.

## 6 · Probar que guarda por el portero (5 min)

Abrir el juego, poner apodo, cosechar una papa, esperar el check de guardado. Después
**Table Editor → `farm_saves_log`**: tiene que haber una fila con tu `user_id`, el `delta` y
`sospechas: []`. Si no aparece, el juego cayó al camino viejo (la consola dice « portero no
disponible aún ») — **no sigas** hasta resolverlo, porque el paso 7 te deja sin guardar.

## 7 · Cerrar la puerta vieja (1 min)

**SQL Editor** → pegar la **PARTE 2** de `sql/portero-guardado.sql` → **Run**. Desde ahí el
cliente ya no escribe `farms` directo: solo por el portero. Marcha atrás al final del mismo
archivo (dos policies comentadas).

## 8 · Sacar el portero de sombra (3 min)

Con P2P abierto el portero tiene que rechazar (LEYES.md). En `supabase/functions/guardar/index.ts`
cambiar `const MODO = "sombra";` por `"rechazo"`, re-deployar la función desde el editor (pegar
el archivo entero otra vez) y commitear el cambio en el repo para que el código versionado diga
lo mismo que lo que corre. Probar: cosechar → guarda; abrir con `?test`, tocar 🧪 → ese guardado
vuelve con **422 guardado rechazado**. Ese día el botón 🧪 muere.

## Después

- Sacar un **backup** apenas haya partidas que valgan algo (Database → Backups, o `pg_dump` con
  la contraseña del paso 1) y guardarlo aparte: es lo que nos faltó esta semana.
- Cuando soporte destrabe el proyecto viejo, pausarlo o borrarlo — que no queden dos bases con
  el mismo juego.
- El torneo (`sql/torneo-ranking.sql` + función `torneo`) queda para cuando salga del MVP.
