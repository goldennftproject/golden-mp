#!/usr/bin/env python3
"""
Golden Farm · integrar el BESTIARIO de PixelLab al juego.               (10/08/2026)

Toma lo que bajó descargar_bestiario.ps1 (una carpeta por criatura, con todas sus
direcciones y animaciones) y deja en assets/farm los PNG que el juego espera:

    <bicho>_idle_0..3   ·   <bicho>_walk_0..5   ·   <bicho>_atk_0..5

boot.js ya arma las animaciones con esos nombres exactos (idle 4f, walk 6f, atk 6f),
así que no hay que tocar código: alcanza con que existan los archivos y con que el
bicho esté listado en assets/farm/bestiario.json.

Tres cosas que hace y conviene saber:

1. SE QUEDA CON LA DIRECCIÓN SURESTE. El juego dibuja a los mobs siempre de frente-
   derecha y los espeja por código cuando van al otro lado.

2. RECORTA A 4/6/6 REPARTIENDO PAREJO. PixelLab entrega 5 de idle y 7 de walk y atk
   (el primero de cada tanda es el cuadro de referencia). En vez de cortar los últimos
   —que dejaría la animación a mitad de camino y saltaría al reiniciar— se eligen N
   cuadros repartidos a lo largo de toda la secuencia, así el ciclo cierra.

3. RECORTA CON UN MARCO COMÚN. Cada cuadro se recorta con el MISMO rectángulo, sacado
   de la unión de todos los de esa criatura. Si se recortara cada uno por su cuenta,
   el bicho "bailaría" entre cuadros: cada frame quedaría centrado distinto.

Y baja la resolución: los PNG vienen de hasta 180 px y en pantalla el más grande se
dibuja a 96. Se guardan al doble del tamaño real de cada criatura (nítido de sobra) y
así el paquete pesa una fracción.

Uso:
    python3 tools/build-bestiario.py            # procesa e informa
    python3 tools/build-bestiario.py --check    # solo dice qué encontraría
"""
import json
import os
import sys

from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEN = os.path.join(RAIZ, "..", "pixellab_bestiario")
FARM = os.path.join(RAIZ, "public", "assets", "farm")
MANIFIESTO = os.path.join(FARM, "bestiario.json")

# cuántos cuadros espera el juego de cada animación (lo fija boot.js)
CUADROS = {"idle": 4, "walk": 6, "atk": 6}

# tamaño con el que se DIBUJA cada criatura en el juego (MONSTER_DEF.size en state.js).
# Se guarda al doble, que es más de lo que hace falta y deja margen si se agrandan.
TAM = {
    "murcielago": 26, "baba": 36, "arana": 40, "goblin": 44, "esqueleto": 48,
    "golem": 56, "hombre_lobo": 52, "ogro": 64, "espectro": 50, "demonio": 58, "dragon": 96,
}
BICHOS = list(TAM.keys())

# El nombre de la carpeta de la animación no siempre es "atk": si se generó con una
# descripción propia, PixelLab la nombra con la descripción. Estas son las pistas.
PISTAS = {
    "idle": ("idle", "quieto", "standing"),
    "walk": ("walk", "run", "scuttl", "camina"),
    "atk":  ("atk", "attack", "bite", "lunge", "rears", "swing", "claw", "golpe"),
}


def carpeta_anim(base, tipo):
    """Busca la carpeta de esa animación, en sureste. Devuelve (ruta, direccion)."""
    raiz = None
    for r, dirs, _ in os.walk(base):
        if os.path.basename(r) == "animations":
            raiz = r
            break
    if not raiz:
        return None, None
    nombres = sorted(os.listdir(raiz))
    # primero por nombre exacto, después por pista
    orden = [n for n in nombres if n == tipo] + [n for n in nombres if n != tipo]
    for n in orden:
        if n != tipo and not any(p in n.lower() for p in PISTAS[tipo]):
            continue
        d = os.path.join(raiz, n)
        for pref in ("south-east", "south"):     # sureste, y si no hay, el sur
            sub = os.path.join(d, pref)
            if os.path.isdir(sub) and [f for f in os.listdir(sub) if f.endswith(".png")]:
                return sub, pref
    return None, None


def elegir(n_origen, n_destino):
    """N cuadros repartidos a lo largo de la secuencia (nunca cortando el final)."""
    if n_origen <= n_destino:
        return list(range(n_origen)) + [n_origen - 1] * (n_destino - n_origen)
    return [round(i * (n_origen - 1) / (n_destino - 1)) for i in range(n_destino)]


def procesar(bicho, check=False):
    base = os.path.join(ORIGEN, bicho)
    if not os.path.isdir(base):
        return None, "no está la carpeta"

    # 1) juntar los cuadros elegidos de las tres animaciones
    tandas, avisos = {}, []
    for tipo, cuantos in CUADROS.items():
        d, dirn = carpeta_anim(base, tipo)
        if not d:
            return None, "falta la animación " + tipo
        arch = sorted(f for f in os.listdir(d) if f.endswith(".png"))
        idx = elegir(len(arch), cuantos)
        tandas[tipo] = [os.path.join(d, arch[i]) for i in idx]
        if dirn != "south-east":
            avisos.append(tipo + " en " + dirn)
        if len(arch) < cuantos:
            avisos.append(tipo + " solo tiene " + str(len(arch)) + " cuadros")

    if check:
        return {"avisos": avisos}, None

    # 2) marco COMÚN: la unión de todos los cuadros, para que no baile entre frames
    caja = None
    for tipo in CUADROS:
        for p in tandas[tipo]:
            b = Image.open(p).convert("RGBA").getbbox()
            if not b:
                continue
            caja = b if caja is None else (min(caja[0], b[0]), min(caja[1], b[1]),
                                           max(caja[2], b[2]), max(caja[3], b[3]))
    if not caja:
        return None, "los cuadros están vacíos"

    alto_final = TAM[bicho] * 2
    escala = min(1.0, alto_final / (caja[3] - caja[1]))

    escritos = 0
    for tipo, cuantos in CUADROS.items():
        for i, p in enumerate(tandas[tipo]):
            im = Image.open(p).convert("RGBA").crop(caja)
            if escala < 1.0:
                im = im.resize((max(1, round(im.width * escala)), max(1, round(im.height * escala))), Image.LANCZOS)
            im.save(os.path.join(FARM, "%s_%s_%d.png" % (bicho, tipo, i)))
            escritos += 1
    return {"frames": escritos, "px": "%dx%d" % (im.width, im.height), "avisos": avisos}, None


def main():
    check = "--check" in sys.argv
    listos, fallados = [], []
    for b in BICHOS:
        r, err = procesar(b, check)
        if err:
            fallados.append((b, err))
            print("  %-12s SALTEADA — %s" % (b, err))
            continue
        listos.append(b)
        extra = ("  ⚠ " + " · ".join(r["avisos"])) if r.get("avisos") else ""
        print("  %-12s %s%s" % (b, ("ok" if check else "%d cuadros de %s" % (r["frames"], r["px"])), extra))

    if check:
        print("\n(--check: no se escribió nada)")
        return

    # 3) el manifiesto: boot.js solo pide el arte de las criaturas listadas acá
    json.dump({
        "_comentario": "Criaturas con arte propio en assets/farm (idle 4f, walk 6f, atk 6f). Lo arma tools/build-bestiario.py.",
        "mobs": listos,
    }, open(MANIFIESTO, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    print("\n%d criaturas integradas · %d archivos" % (len(listos), len(listos) * 16))
    if fallados:
        print("Sin integrar: " + ", ".join(b for b, _ in fallados))
    print("bestiario.json actualizado. ACORDATE de subir su ?v=NN en boot.js.")


if __name__ == "__main__":
    main()
