# ¿CUÁNTOS ÁRBOLES HACEN FALTA DE VERDAD? (17/8)
#
# Idea de dirección: "no hace falta poner tres árboles detrás de uno; si ponés dos a los costados
# del que está más adelantado ya cubrís la visión de los costados".
#
# Este script lo mide en vez de discutirlo. Dibuja SOLO la franja de bosque con distintas
# configuraciones y cuenta dos cosas:
#   · cuántos árboles se usan
#   · qué porcentaje de la franja queda AGUJEREADO (se ve el fondo entre las copas)
#
# La variable nueva es TRABA: cuánto se corre en X una fila respecto de la anterior, en pasos.
#   TRABA = 0    -> todas las filas alineadas (lo que había): el de atrás cae DETRÁS del de adelante
#   TRABA = 0.5  -> filas trabadas como ladrillos: el de atrás cae en el HUECO de los dos de adelante
#
#   python3 tools/medir-bosque.py
import os

from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
tree = Image.open(os.path.join(RAIZ, "public", "assets", "farm", "tree.png")).convert("RGBA")
anchoT, altoT = tree.size
T = 42
ANCHO = 1400          # ancho de la franja de prueba
FILAS_FONDO = 260     # alto de bosque que se dibuja (como el margen real)


def franja(paso_c, filas_c, traba, jitter=8, eMin=0.92, eMax=1.26):
    """Dibuja una franja de bosque y devuelve (nº de árboles, % de agujeros)."""
    paso = max(1, round(T * paso_c))
    pasoY = max(1, round(paso * filas_c))
    alto = FILAS_FONDO + altoT
    im = Image.new("RGBA", (ANCHO, alto), (0, 0, 0, 0))
    sem = [20250816]

    def az():
        sem[0] = (sem[0] * 1664525 + 1013904223) % 4294967296
        return sem[0] / 4294967296

    lista, fila = [], 0
    y = 0
    while y < FILAS_FONDO:
        corr = round(paso * traba * (fila % 2))
        x = -paso
        while x < ANCHO + paso:
            px = x + corr + round((az() * 2 - 1) * jitter)
            py = y + round((az() * 2 - 1) * jitter)
            lista.append((py, px, eMin + az() * (eMax - eMin)))
            x += paso
        y += pasoY
        fila += 1
    lista.sort(key=lambda t: t[0] + altoT * t[2])   # por la base, como el juego
    for py, px, esc in lista:
        t2 = tree.resize((max(1, round(anchoT * esc)), max(1, round(altoT * esc))), Image.NEAREST)
        im.alpha_composite(t2, (px, py))

    # los agujeros se cuentan SOLO en la franja de bosque cerrado, no en el borde de abajo
    alfa = im.split()[3].crop((0, 40, ANCHO, FILAS_FONDO))
    total = alfa.width * alfa.height
    huecos = sum(1 for v in alfa.getdata() if v < 40)
    return len(lista), 100.0 * huecos / total


def main():
    print("PASO = separación horizontal (celdas) · FILAS = separación vertical (x paso)")
    print("TRABA = corrimiento de las filas alternas (0 = alineadas · 0,5 = trabadas)\n")
    print("paso  filas  traba   árboles   agujeros")
    base = None
    for paso_c, filas_c, traba in [
        (0.60, 0.74, 0.0),    # lo que hay hoy
        (0.60, 0.74, 0.5),
        (0.75, 0.90, 0.5),
        (0.85, 1.00, 0.5),
        (0.95, 1.10, 0.5),
        (1.05, 1.20, 0.5),
        (0.85, 1.00, 0.0),    # la misma densidad SIN trabar, para aislar el efecto
        (1.05, 1.20, 0.0),
    ]:
        n, h = franja(paso_c, filas_c, traba)
        if base is None:
            base = n
        marca = "   <- hoy" if (paso_c, filas_c, traba) == (0.60, 0.74, 0.0) else ""
        print("%.2f  %.2f   %.1f   %7d   %6.2f%%   (%+.0f%% árboles)%s"
              % (paso_c, filas_c, traba, n, h, 100.0 * (n - base) / base, marca))


if __name__ == "__main__":
    main()
