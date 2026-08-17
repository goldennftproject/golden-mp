# COMPARADOR DEL BORDE DEL BOSQUE (17/8)
#
# Idea de dirección: "no hace falta poner tres árboles detrás de uno; con dos a los costados del
# que está más adelantado ya cubrís los costados".
#
# Medido antes (tools/medir-bosque.py): agujeros de fondo YA no hay, ni siquiera con un 80% menos
# de árboles. O sea que lo que molesta no son huecos al vacío, es QUÉ SE VE por los espacios entre
# troncos: hoy se ve la fila de atrás, y eso es lo que lee como "tres troncos apilados".
#
# Medido en el sprite: el tronco mide 23-27 px y las columnas van cada 25 px, o sea que en teoría
# se tocan. El que abre los huecos es el JITTER HORIZONTAL de ±8 px, que puede separar dos troncos
# hasta 41 px. De ahí salen las dos palancas nuevas:
#   TRABA   : corrimiento de las filas alternas (0,5 = el de atrás cae en el hueco de los de adelante)
#   JITTER_X: desorden horizontal, separado del vertical (el vertical puede seguir alto sin abrir huecos)
#
#   python3 tools/comparar-bosque.py [salida.png]
import os
import sys

from PIL import Image, ImageDraw

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
tree = Image.open(os.path.join(RAIZ, "public", "assets", "farm", "tree.png")).convert("RGBA")
anchoT, altoT = tree.size
T = 42
ANCHO = 700
FONDO = 200          # cuánto bosque se dibuja hacia atrás
CESPED = (86, 140, 62, 255)


def borde(paso_c, filas_c, traba, jx, jy, celdas=2.5, var=0.15):
    """Dibuja la franja y devuelve (imagen, nº de árboles) — el BORDE DE ABAJO es el que da al claro."""
    # 17/8 (dirección): "ten en cuenta que un árbol ocupe solo una celda".
    # El tamaño deja de ser un número mágico y pasa a expresarse en CELDAS: el sprite mide
    # 105 px de ancho y la celda 42, así que un árbol de 1 celda es escala 0,40.
    base = celdas * T / anchoT
    eMin, eMax = base * (1 - var), base * (1 + var)
    paso = max(1, round(T * paso_c))
    pasoY = max(1, round(paso * filas_c))
    im = Image.new("RGBA", (ANCHO, FONDO + altoT + 30), CESPED)
    sem = [20250816]

    def az():
        sem[0] = (sem[0] * 1664525 + 1013904223) % 4294967296
        return sem[0] / 4294967296

    lista, fila, y = [], 0, 0
    while y < FONDO:
        corr = round(paso * traba * (fila % 2))
        x = -paso
        while x < ANCHO + paso:
            lista.append((y + round((az() * 2 - 1) * jy),
                          x + corr + round((az() * 2 - 1) * jx),
                          eMin + az() * (eMax - eMin)))
            x += paso
        y += pasoY
        fila += 1
    lista.sort(key=lambda t: t[0] + altoT * t[2])
    capa = Image.new("RGBA", im.size, (0, 0, 0, 0))
    for py, px, esc in lista:
        t2 = tree.resize((max(1, round(anchoT * esc)), max(1, round(altoT * esc))), Image.NEAREST)
        capa.alpha_composite(t2, (px, py))
    im.alpha_composite(capa)
    # agujeros: césped visible DENTRO de la masa (no en el borde de abajo, que es el claro)
    alfa = capa.split()[3].crop((0, 40, ANCHO, FONDO))
    datos = list(alfa.get_flattened_data()) if hasattr(alfa, "get_flattened_data") else list(alfa.getdata())
    huecos = 100.0 * sum(1 for v in datos if v < 40) / len(datos)
    return im, len(lista), huecos


CASOS = [
    ("HOY                  arbol 2,3-3,2 celdas (mas grande que los de la granja)", 0.60, 0.74, 0.0, 8, 8, 2.75),
    ("I   arbol 2 celdas    igual que los arboles de la granja      paso 0,90", 0.90, 0.90, 0.5, 5, 7, 2.00),
    ("J   arbol 1,5 celdas                                          paso 0,75", 0.75, 0.90, 0.5, 4, 6, 1.50),
    ("K   arbol 1 CELDA                                             paso 0,60", 0.60, 0.90, 0.5, 3, 5, 1.00),
    ("L   arbol 1 CELDA                                             paso 0,80", 0.80, 0.90, 0.5, 3, 5, 1.00),
    ("M   arbol 1 CELDA     uno pegado al otro                      paso 1,00", 1.00, 0.90, 0.5, 2, 5, 1.00),
]


def main():
    tiras = []
    for txt, p, f, tr, jx, jy, cel in CASOS:
        im, n, hue = borde(p, f, tr, jx, jy, celdas=cel)
        im = im.crop((20, FONDO - 120, ANCHO - 20, FONDO + altoT + 20))
        im = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
        cab = Image.new("RGB", (im.width, 34), (30, 42, 24))
        ImageDraw.Draw(cab).text((12, 12), "%s   |   %d arboles   |   agujeros %.2f%%" % (txt, n, hue), fill=(255, 210, 74))
        t = Image.new("RGB", (im.width, im.height + 34))
        t.paste(cab, (0, 0))
        t.paste(im.convert("RGB"), (0, 34))
        tiras.append(t)
    out = Image.new("RGB", (tiras[0].width, sum(t.height for t in tiras) + 10 * len(tiras)), (30, 42, 24))
    y = 0
    for t in tiras:
        out.paste(t, (0, y))
        y += t.height + 10
    salida = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, "comparar-bosque.png")
    out.save(salida)
    print("comparativa: " + salida)


if __name__ == "__main__":
    main()
