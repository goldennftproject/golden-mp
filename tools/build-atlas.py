#!/usr/bin/env python3
"""
Golden Farm · armador del atlas de sprites.

Junta TODOS los PNG que el juego necesita en un solo archivo (public/assets/atlas.png)
más su mapa (atlas.json). Así el navegador pide 2 archivos en vez de 300, que es la
diferencia entre entrar rápido o esperar en el server gratis de Render.

Uso:
    python3 tools/build-atlas.py            # arma el atlas
    python3 tools/build-atlas.py --check    # solo dice qué falta, sin escribir nada

Después de correrlo hay que subir el número de versión en boot.js:
    this.load.image("__atlas", "assets/atlas.png?v=NN");
    this.load.json("__atlasmap", "assets/atlas.json?v=NN");
(si no, el navegador sirve el atlas viejo de su caché).
"""
import json
import math
import os
import re
import sys

from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FARM = os.path.join(RAIZ, "public", "assets", "farm")
SALIDA_PNG = os.path.join(RAIZ, "public", "assets", "atlas.png")
SALIDA_JSON = os.path.join(RAIZ, "public", "assets", "atlas.json")
BOOT = os.path.join(RAIZ, "public", "game", "boot.js")

# Los iconos de recursos, cultivos, peces y monedas también van al atlas: el juego los
# usa para el "premio" que sale volando cuando talás, picás o cosechás.
EXTRA = ["res_", "crop_", "fish_", "coin_", "animal_", "deco_", "build_", "plano_", "rock_buried"]   # build_: obras · plano_: blueprints (12/8)

# Edificios que antes no tenían arte y por eso nunca entraron al atlas (9/8).
SUELTOS = ["establo", "curtiduria", "ofrendas", "mazo", "pet_gallina", "skin_sombrero", "godhand", "tree_sapling", "plot_wild"]

# BESTIARIO (10/8): las 11 criaturas nuevas son 176 cuadros. Sueltos serían 176 pedidos
# extra al server gratis; en el atlas son cero. Los arma tools/build-bestiario.py.
BESTIARIO = ["murcielago_", "baba_", "arana_", "goblin_", "esqueleto_", "golem_",
             "hombre_lobo_", "ogro_", "espectro_", "demonio_", "dragon_"]


def claves_pedidas():
    """Las claves que YA tenía el atlas anterior. Es la lista buena y probada: se conserva
    entera y encima se le suman los iconos EXTRA. Si no hay atlas previo, arranca vacía."""
    try:
        viejo = json.load(open(SALIDA_JSON, encoding="utf-8"))
        return {k: k + ".png" for k in viejo.get("frames", {})}
    except Exception:
        return {}


def archivos():
    """Todo lo que hay que empaquetar: lo que ya estaba + los iconos EXTRA."""
    pedidos = claves_pedidas()
    todos = {}
    for nombre in sorted(os.listdir(FARM)):
        if not nombre.endswith(".png"):
            continue
        clave = nombre[:-4]
        if clave in pedidos or clave in SUELTOS or any(clave.startswith(p) for p in EXTRA + BESTIARIO):
            todos[clave] = os.path.join(FARM, nombre)
    faltan = [k for k in pedidos if k not in todos]
    return todos, faltan


def empaquetar(imgs, ancho):
    """Acomoda por filas, ordenando de más alto a más bajo (simple y suficiente)."""
    orden = sorted(imgs.items(), key=lambda kv: -kv[1].height)
    marcos, x, y, alto_fila = {}, 0, 0, 0
    for clave, im in orden:
        w, h = im.size
        if x + w > ancho:
            x, y, alto_fila = 0, y + alto_fila, 0
        marcos[clave] = {"x": x, "y": y, "w": w, "h": h}
        x += w
        alto_fila = max(alto_fila, h)
    return marcos, y + alto_fila


def main():
    solo_chequear = "--check" in sys.argv
    rutas, faltan = archivos()
    if faltan:
        print("Sin archivo (el juego los pide pero no están):", ", ".join(sorted(faltan)))
    imgs = {k: Image.open(v).convert("RGBA") for k, v in rutas.items()}
    area = sum(im.width * im.height for im in imgs.values())
    ancho = 1024
    while ancho * ancho < area * 1.35:
        ancho *= 2

    marcos, alto = empaquetar(imgs, ancho)
    print(f"{len(imgs)} sprites · lienzo {ancho}x{alto}")
    if solo_chequear:
        return

    hoja = Image.new("RGBA", (ancho, alto), (0, 0, 0, 0))
    for clave, fr in marcos.items():
        hoja.paste(imgs[clave], (fr["x"], fr["y"]))

    # paleta optimizada (255 colores + transparencia): pesa un tercio y en pixel art no se nota
    # FASTOCTREE es el único método que conserva la transparencia (RGBA)
    hoja.quantize(colors=255, method=Image.FASTOCTREE).save(SALIDA_PNG, optimize=True)
    json.dump({"frames": marcos}, open(SALIDA_JSON, "w"), separators=(",", ":"))
    kb = os.path.getsize(SALIDA_PNG) / 1024
    print(f"atlas.png {kb:.0f} KB · atlas.json {os.path.getsize(SALIDA_JSON)/1024:.0f} KB")
    print("ACORDATE de subir el ?v=NN del atlas en boot.js")


if __name__ == "__main__":
    main()
