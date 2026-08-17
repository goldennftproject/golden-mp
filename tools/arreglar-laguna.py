# CERRAR LA ORILLA IZQUIERDA DE LA LAGUNA (17/8)
#
# pond.png venía con la forma TOCANDO el borde izquierdo del lienzo: la orilla quedaba
# seccionada en plano, como si alguien hubiera recortado el PNG un poco corto. Se veía como
# una laguna "cortada" y no había forma de arreglarlo desde el código, porque el corte estaba
# en el arte.
#
# Esto no inventa dibujo nuevo: ensancha el lienzo a la izquierda y PROLONGA las filas que
# quedaron abiertas, con un perfil de media elipse para que el contorno cierre redondo. Cada
# fila se extiende con su propio color, tomado del píxel que quedó al borde, y el píxel más
# externo se oscurece para reponer la línea de contorno que tiene el resto de la orilla.
#
#   python3 tools/arreglar-laguna.py          # arregla y guarda
#   python3 tools/arreglar-laguna.py --ver    # solo informa, no escribe
import os
import shutil
import sys

from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RAIZ, "public", "assets", "farm", "pond.png")
COPIA = os.path.join(RAIZ, "public", "assets", "farm", "pond_original.png")


def main():
    im = Image.open(SRC).convert("RGBA")
    W, H = im.size
    px = im.load()

    xL = []
    for y in range(H):
        fila = [x for x in range(W) if px[x, y][3] > 40]
        xL.append(fila[0] if fila else None)
    abiertas = [y for y in range(H) if xL[y] == 0]
    if not abiertas:
        print("la orilla ya cierra sola: no hay nada que hacer")
        return
    y0, y1 = min(abiertas), max(abiertas)
    print("filas cortadas contra el borde: %d..%d  (%d filas)" % (y0, y1, len(abiertas)))

    # PROLONGAR LA CURVA REAL, no inventar una forma. La primera versión metía una media elipse
    # y salía un nudo: la elipse moría de golpe contra un contorno que ya venía retrocediendo.
    # Ahora se toman las filas sanas de arriba y de abajo del corte, se ajusta la parábola que
    # describe su contorno  xL(y) = a*(y - yc)^2 + b  y se continúa esa misma curva por dentro
    # del corte. Donde la curva predice una x negativa, eso es exactamente lo que falta.
    K = 7
    arriba = [(y, xL[y]) for y in range(max(0, y0 - K), y0) if xL[y] is not None]
    abajo = [(y, xL[y]) for y in range(y1 + 1, min(H, y1 + 1 + K)) if xL[y] is not None]
    muestras = arriba + abajo
    if len(muestras) < 4:
        print("no hay contorno sano suficiente a los lados del corte")
        return
    yc = (y0 + y1) / 2.0
    # mínimos cuadrados sobre  x = a*u^2 + b   con  u = y - yc
    su4 = sum((y - yc) ** 4 for y, _ in muestras)
    su2 = sum((y - yc) ** 2 for y, _ in muestras)
    n = len(muestras)
    sxu2 = sum(x * (y - yc) ** 2 for y, x in muestras)
    sx = sum(x for _, x in muestras)
    det = su4 * n - su2 * su2
    if abs(det) < 1e-6:
        print("el contorno no describe una curva utilizable")
        return
    a_c = (sxu2 * n - sx * su2) / det
    b_c = (su4 * sx - su2 * sxu2) / det
    faltan = [max(0.0, -(a_c * (y - yc) ** 2 + b_c)) for y in range(y0, y1 + 1)]
    EXT = int(round(max(faltan))) + 1
    print("curva del contorno: x = %.4f*(y-%.1f)^2 + %.2f  →  falta hasta %.1f px" % (a_c, yc, b_c, max(faltan)))
    print("se ensancha el lienzo %d px" % EXT)

    nuevo = Image.new("RGBA", (W + EXT, H), (0, 0, 0, 0))
    nuevo.alpha_composite(im, (EXT, 0))
    npx = nuevo.load()

    # se prolongan también 2 filas por fuera del corte, para empalmar sin escalón
    for y in range(max(0, y0 - 2), min(H, y1 + 3)):
        pred = a_c * (y - yc) ** 2 + b_c
        e = int(round(-pred))
        if e <= 0:
            continue
        e = min(e, EXT)
        base = px[0, y] if (xL[y] == 0) else px[max(0, xL[y] or 0), y]
        if base[3] <= 40:
            base = px[0, int(yc)]
        for k in range(1, e + 1):
            x = EXT - k
            if x < 0:
                break
            if k >= e - 1:
                npx[x, y] = (max(0, base[0] - 62), max(0, base[1] - 52), max(0, base[2] - 34), 255)
            else:
                npx[x, y] = base

    if "--ver" in sys.argv:
        print("(modo --ver: no se escribió nada)")
        return

    if not os.path.exists(COPIA):
        shutil.copy2(SRC, COPIA)
        print("copia del original en pond_original.png")
    nuevo.save(SRC)
    print("pond.png: %dx%d → %dx%d, orilla cerrada" % (W, H, nuevo.width, nuevo.height))
    col0 = [y for y in range(nuevo.height) if nuevo.load()[0, y][3] > 40]
    print("filas tocando el borde ahora: %d  (antes %d)" % (len(col0), len(abiertas)))


if __name__ == "__main__":
    main()
