#!/usr/bin/env python3
"""
Golden Farm · integrar los ADORNOS de PixelLab al juego.                (10/08/2026)

Toma lo que bajó descargar_adornos.ps1 (un PNG por adorno, de 64x64 con mucho aire
alrededor) y deja en assets/farm los archivos que el juego busca:

    deco_valla · deco_flores · deco_farol · deco_banco
    deco_espantapajaros · deco_fuente · deco_estatua · deco_arbolito

farm.js los usa si existen (dibujarAdorno) y si no cae al dibujo por código de antes,
así que esto no puede romper nada: en el peor caso el adorno se ve como se veía.

Dos cosas que hace:

1. RECORTA EL AIRE. PixelLab centra el objeto en el lienzo y deja borde transparente.
   Si no se recorta, el adorno queda flotando arriba de donde uno lo puso.

2. GUARDA AL DOBLE DEL TAMAÑO EN PANTALLA. El alto real lo fija DECO_ALTO en state.js;
   acá se guarda a 2x de eso, que es nítido de sobra y pesa una fracción en el atlas.

Uso:
    python3 tools/build-adornos.py            # procesa e informa
    python3 tools/build-adornos.py --check    # solo dice qué encontraría
"""
import os
import sys

from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEN = os.path.join(RAIZ, "..", "pixellab_adornos")
# los coleccionables del cofre de 7 días bajan a su propia carpeta (descargar_adornos_cofre.ps1)
ORIGEN_COFRE = os.path.join(RAIZ, "..", "pixellab_adornos_cofre")
FARM = os.path.join(RAIZ, "public", "assets", "farm")

# alto con el que se DIBUJA cada adorno en el juego (DECO_ALTO en state.js).
# Se guarda al doble. Si cambiás uno allá, cambialo acá y volvé a correr esto.
TAM = {
    "valla": 24, "flores": 24, "farol": 40, "banco": 26,
    "espantapajaros": 48, "fuente": 30, "estatua": 36, "arbolito": 46,
}
# adornos del cofre de login (no se compran): mismos altos que DECO_ALTO en state.js
TAM_COFRE = {
    "espantapajaros_oro": 48, "farolito": 40,
}


def main():
    check = "--check" in sys.argv
    listos, faltan = [], []

    fuentes = [(ORIGEN, TAM), (ORIGEN_COFRE, TAM_COFRE)]
    pares = [(carpeta, nombre, alto) for carpeta, tam in fuentes for nombre, alto in tam.items()]
    for carpeta, nombre, alto in pares:
        origen = os.path.join(carpeta, "deco_%s.png" % nombre)
        if not os.path.isfile(origen):
            faltan.append(nombre)
            print("  %-18s SALTEADO — no está %s" % (nombre, os.path.basename(origen)))
            continue

        im = Image.open(origen).convert("RGBA")
        caja = im.getbbox()
        if not caja:
            faltan.append(nombre)
            print("  %-18s SALTEADO — la imagen está vacía" % nombre)
            continue
        im = im.crop(caja)

        destino = alto * 2
        if im.height > destino:
            ancho = max(1, round(im.width * destino / im.height))
            im = im.resize((ancho, destino), Image.LANCZOS)

        if not check:
            im.save(os.path.join(FARM, "deco_%s.png" % nombre))
        listos.append(nombre)
        print("  %-18s %dx%d  (en pantalla %d px de alto)" % (nombre, im.width, im.height, alto))

    if check:
        print("\n(--check: no se escribió nada)")
        return

    print("\n%d adornos integrados" % len(listos))
    if faltan:
        print("Sin integrar: " + ", ".join(faltan))
    print("Ahora: python3 tools/build-atlas.py  y subir el ?v=NN del atlas en boot.js")


if __name__ == "__main__":
    main()
