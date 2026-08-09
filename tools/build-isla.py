#!/usr/bin/env python3
"""
Golden Farm · armador de la COSTA de la isla.

Genera public/assets/farm/isla.png: el contorno completo de la granja con sus tres
transiciones terminadas a mano de pixel art, en vez de los tres rectángulos redondeados
de color plano que había antes (pasto | arena | agua, todos con el borde duro).

Qué dibuja, de adentro hacia afuera:
    pasto  →  borde de pasto más oscuro con matitas que cuelgan sobre la arena
    arena  →  arena seca con piedritas y conchillas, después arena mojada más oscura
    espuma →  la línea blanca donde rompe el agua
    agua   →  bajío claro, agua media y ya el mar (que lo pinta el juego por debajo)

Cada límite va con DITHERING (damero de 2 px) en vez de un corte limpio: es lo que hace
que se lea como pixel art y no como un vector. Y el contorno no es un óvalo perfecto:
se le suma ruido para que la orilla tenga entradas y salientes.

Uso:
    python3 tools/build-isla.py
    python3 tools/build-isla.py --preview    # además guarda una vista chica para mirar

Después de correrlo hay que subir el ?v=NN de "isla" en boot.js.
"""
import math
import os
import random
import sys

from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, "public", "assets", "farm", "isla.png")

# --- medidas, en píxeles de mundo (tienen que coincidir con config.js) ---
TILE = 42
COLS, ROWS = 23, 15
W, H = COLS * TILE, ROWS * TILE      # 966 x 630
MARGEN = 112                         # cuánto sobra la imagen alrededor de la granja
SEMILLA = 20260809

# La isla arranca del rectángulo de pasto: 8 px afuera de la cerca, esquinas de radio 34.
PASTO_FUERA, PASTO_RADIO = 8, 34

# Anchos de cada franja, medidos desde el borde del pasto hacia afuera.
ARENA_SECA   = 19    # arena clara
ARENA_MOJADA = 12    # arena oscura, la que lame el agua
ESPUMA       = 3     # línea blanca
AGUA_CLARA   = 34
AGUA_MEDIA   = 26

# --- paleta (a tono con el pasto #6c8c53 y la madera de los edificios) ---
C_PASTO        = (0x6c, 0x8c, 0x53)
C_PASTO_BORDE  = (0x55, 0x73, 0x3f)
C_ARENA        = (0xe8, 0xd9, 0xa6)
C_ARENA_2      = (0xdd, 0xca, 0x92)
C_ARENA_MOJADA = (0xbc, 0xa0, 0x6c)
C_ESPUMA       = (0xe9, 0xf5, 0xfb)
C_AGUA_CLARA   = (0x5c, 0xb4, 0xd8)
C_AGUA_MEDIA   = (0x3f, 0xa3, 0xcc)
C_AGUA_HONDA   = (0x2e, 0x7f, 0xa8)
C_PIEDRA       = (0xa8, 0x9c, 0x84)
C_CONCHILLA    = (0xf2, 0xe4, 0xd6)

BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def ruido(semilla, escala, ancho, alto):
    """Ruido de valor suave: una grilla chica de números al azar, interpolada."""
    rnd = random.Random(semilla)
    gw, gh = int(ancho / escala) + 3, int(alto / escala) + 3
    g = [[rnd.random() for _ in range(gw)] for _ in range(gh)]

    def suave(t):
        return t * t * (3 - 2 * t)

    def leer(x, y):
        fx, fy = x / escala, y / escala
        x0, y0 = int(fx), int(fy)
        tx, ty = suave(fx - x0), suave(fy - y0)
        a = g[y0][x0] * (1 - tx) + g[y0][x0 + 1] * tx
        b = g[y0 + 1][x0] * (1 - tx) + g[y0 + 1][x0 + 1] * tx
        return a * (1 - ty) + b * ty

    return leer


def dist_rect_redondeado(x, y, x1, y1, x2, y2, r):
    """Distancia con signo a un rectángulo de esquinas redondeadas (negativa adentro)."""
    cx = min(max(x, x1 + r), x2 - r)
    cy = min(max(y, y1 + r), y2 - r)
    dx, dy = x - cx, y - cy
    d = math.hypot(dx, dy)
    if d > 0:
        return d - r
    # adentro del rectángulo interior: la distancia es al lado más cercano
    return -min(x - x1, x2 - x, y - y1, y2 - y) - 0  # negativa


def construir():
    rnd = random.Random(SEMILLA)
    # El anillo de pasto que asoma afuera de la cerca usa EL MISMO tile que el suelo del juego.
    # Con un verde plano se veía la costura: un rectángulo texturado adentro y liso alrededor.
    tile = Image.open(os.path.join(RAIZ, "public", "assets", "farm", "grass_a.png")).convert("RGB")
    tpx, tw, th = tile.load(), tile.width, tile.height
    AN, AL = W + MARGEN * 2, H + MARGEN * 2
    img = Image.new("RGBA", (AN, AL), (0, 0, 0, 0))
    px = img.load()

    # dos ruidos: uno grande para las bahías, uno chico para el borde dentado
    n_grande = ruido(SEMILLA, 150, AN, AL)
    n_chico = ruido(SEMILLA + 7, 38, AN, AL)

    x1, y1 = -PASTO_FUERA, -PASTO_FUERA
    x2, y2 = W + PASTO_FUERA, H + PASTO_FUERA

    # los cortes, acumulados desde el borde del pasto hacia afuera
    d_arena_seca = ARENA_SECA
    d_arena_moj = d_arena_seca + ARENA_MOJADA
    d_espuma = d_arena_moj + ESPUMA
    d_agua_clara = d_espuma + AGUA_CLARA
    d_agua_media = d_agua_clara + AGUA_MEDIA

    def banda(d, corte, ancho_dither, mx, my):
        """¿Está d adentro del corte? Con damero de 2 px alrededor del límite."""
        if d < corte - ancho_dither:
            return True
        if d > corte + ancho_dither:
            return False
        t = (d - (corte - ancho_dither)) / (2.0 * ancho_dither)
        return t * 16 < BAYER[my & 3][mx & 3]

    for j in range(AL):
        wy = j - MARGEN
        for i in range(AN):
            wx = i - MARGEN
            d = dist_rect_redondeado(wx, wy, x1, y1, x2, y2, PASTO_RADIO)
            if d > d_agua_media + 6:
                continue                                   # más afuera lo pinta el mar del juego
            # el contorno no es un óvalo perfecto: entra y sale
            d += (n_grande(i, j) - 0.5) * 15 + (n_chico(i, j) - 0.5) * 4
            mx, my = i >> 1, j >> 1                        # damero de 2x2 px

            if d < 0:
                # borde del pasto: los últimos 3 px más oscuros; adentro, el tile de siempre
                c = C_PASTO_BORDE if d > -3.5 else tpx[wx % tw, wy % th]
            elif d < 2.2:
                c = C_ARENA_MOJADA            # sombrita del pasto sobre la arena: lo despega
            elif banda(d, d_arena_seca, 1.5, mx, my):
                c = C_ARENA_2 if (n_chico(i, j) > 0.60) else C_ARENA
            elif banda(d, d_arena_moj, 1.5, mx, my):
                c = C_ARENA_MOJADA
            elif banda(d, d_espuma, 1.0, mx, my):
                c = C_ESPUMA
            elif banda(d, d_agua_clara, 2.0, mx, my):
                c = C_AGUA_CLARA
            elif banda(d, d_agua_media, 1.5, mx, my):
                c = C_AGUA_MEDIA
            else:
                c = C_AGUA_HONDA
            px[i, j] = c + (255,)

    # --- detallitos sobre la arena: piedritas y conchillas ---
    for _ in range(6000):
        i = rnd.randrange(AN)
        j = rnd.randrange(AL)
        wx, wy = i - MARGEN, j - MARGEN
        d = dist_rect_redondeado(wx, wy, x1, y1, x2, y2, PASTO_RADIO)
        d += (n_grande(i, j) - 0.5) * 15 + (n_chico(i, j) - 0.5) * 4
        if not (2 < d < d_arena_moj - 2):
            continue
        c = C_PIEDRA if rnd.random() < 0.65 else C_CONCHILLA
        for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1))[: rnd.choice([1, 2, 4])]:
            if 0 <= i + dx < AN and 0 <= j + dy < AL and px[i + dx, j + dy][3]:
                px[i + dx, j + dy] = c + (255,)

    # --- matitas de pasto colgando sobre la arena, para que el borde no sea una línea ---
    for _ in range(70000):
        i = rnd.randrange(AN)
        j = rnd.randrange(AL)
        wx, wy = i - MARGEN, j - MARGEN
        d = dist_rect_redondeado(wx, wy, x1, y1, x2, y2, PASTO_RADIO)
        d += (n_grande(i, j) - 0.5) * 15 + (n_chico(i, j) - 0.5) * 4
        if not (-1 < d < 5):
            continue
        alto = rnd.choice([2, 3, 3, 4])
        for k in range(alto):
            for dx in range(rnd.choice([1, 1, 2])):
                xx, yy = i + dx, j - k
                if 0 <= xx < AN and 0 <= yy < AL and px[xx, yy][3]:
                    px[xx, yy] = (C_PASTO if k else C_PASTO_BORDE) + (255,)

    return img


def main():
    img = construir()
    # paleta: pixel art con pocos colores, pesa mucho menos y no pierde nada
    plano = img.convert("RGB").quantize(colors=48, method=Image.FASTOCTREE)
    plano = plano.convert("RGBA")
    alfa = img.split()[3]
    plano.putalpha(alfa)
    plano.save(SALIDA, optimize=True)
    kb = os.path.getsize(SALIDA) // 1024
    print("isla.png  %dx%d  ·  %d KB" % (img.width, img.height, kb))
    print("origen de la imagen en coordenadas del mundo: (%d, %d)" % (-MARGEN, -MARGEN))
    if "--preview" in sys.argv:
        p = os.path.join(RAIZ, "..", "_isla_preview.png")
        img.resize((img.width // 2, img.height // 2), Image.NEAREST).save(p)
        img.crop((0, 0, 420, 340)).resize((840, 680), Image.NEAREST).save(
            os.path.join(RAIZ, "..", "_isla_esquina.png"))
        print("vistas previas guardadas")
    print("ACORDATE de subir el ?v=NN de isla en boot.js")


if __name__ == "__main__":
    main()
