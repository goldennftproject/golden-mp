# VISTA PREVIA DE LA GRANJA (17/8) — dibuja el mapa con el ARTE REAL, sin abrir el juego.
#
# Por qué existe: cada vez que se movía un edificio había que deployar y entrar a mirar.
# Este script lee las MISMAS posiciones que usa el juego (las saca de config.js ejecutándolo
# de verdad con node) y arma un PNG con los sprites reales, el césped, la cerca y el anillo
# de bosque. Así se aprueba un layout en segundos en vez de a ciegas.
#
#   python3 tools/preview-granja.py [salida.png]
import json
import math
import os
import subprocess
import sys

from PIL import Image, ImageDraw

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FARM = os.path.join(RAIZ, "public", "assets", "farm")

# El juego dibuja cada tipo con un sprite que no siempre se llama igual que el tipo.
SPRITE = {"rock": "node_stone", "cofre_diario": "baul_premios"}


def datos_del_juego():
    """Ejecuta config.js con node y devuelve el layout REAL. Nada de reescribir la lógica acá:
    si el juego cambia, esta vista previa cambia sola."""
    js = """
    const fs=require("fs"),vm=require("vm");
    const ctx={console:{log(){},warn(){}},Math,Date,JSON}; ctx.window=ctx;
    vm.runInNewContext(fs.readFileSync("public/game/config.js","utf8"),ctx,{filename:"config.js"});
    const G=ctx.GF;
    process.stdout.write(JSON.stringify({
      T:G.TILE, COLS:G.COLS, ROWS:G.ROWS, POND:G.POND, PLOTS:G.PLOTS_BASE,
      OBJ:G.WORLD_OBJECTS.map(o=>({key:o.key,type:o.type,leftCol:o.leftCol,baseRow:o.baseRow,wCells:o.wCells})),
      B:{margen:G.BOSQUE_MARGEN,mx:G.BOSQUE_MARGEN_X,my:G.BOSQUE_MARGEN_Y,
         tam:G.BOSQUE_TAM,var:G.BOSQUE_ESC_VAR,leyes:G.BOSQUE_LEYES,cada:G.BOSQUE_FILA_CADA,dens:G.BOSQUE_DENSIDAD,frente:G.BOSQUE_FRENTE_SOLIDO,jf:G.BOSQUE_JITTER_FONDO,
         jx:G.BOSQUE_JITTER_X,jy:G.BOSQUE_JITTER_Y,colchon:G.BOSQUE_COLCHON,
         redondez:G.BOSQUE_REDONDEZ,onda:G.BOSQUE_ONDA,aire:G.BOSQUE_AIRE}
    }));
    """
    out = subprocess.run(["node", "-e", js], cwd=RAIZ, capture_output=True, text=True)
    if out.returncode:
        sys.exit("no se pudo leer config.js:\n" + out.stderr)
    return json.loads(out.stdout)


def abrir(nombre):
    ruta = os.path.join(FARM, nombre + ".png")
    return Image.open(ruta).convert("RGBA") if os.path.exists(ruta) else None


def escalar_al_ancho(im, ancho):
    alto = max(1, round(im.height * ancho / im.width))
    return im.resize((max(1, ancho), alto), Image.NEAREST)


def main():
    d = datos_del_juego()
    T, C, R = d["T"], d["COLS"], d["ROWS"]
    W, H = C * T, R * T
    MX, MY = d["B"]["mx"] or d["B"]["margen"], d["B"]["my"] or d["B"]["margen"]
    lienzo = Image.new("RGBA", (W + 2 * MX, H + 2 * MY), (47, 90, 40, 255))
    OX, OY = MX, MY   # origen del mundo dentro del lienzo

    # ---- césped del claro ----
    pastos = [p for p in (abrir("grass_a"), abrir("grass_b"), abrir("grass_c")) if p]
    if pastos:
        pastos = [escalar_al_ancho(p, T) for p in pastos]
        cx2, cy2 = -(-MX // T), -(-MY // T)   # el pasto llega hasta donde llega el bosque
        for r in range(-cy2, R + cy2):
            for c in range(-cx2, C + cx2):
                x, y = OX + c * T, OY + r * T
                if -T < x < lienzo.width and -T < y < lienzo.height:
                    lienzo.alpha_composite(pastos[(c * 7 + r * 3) % len(pastos)], (x, y))

    # ---- anillo de bosque (misma métrica que farm.js: dibujarBosque) ----
    tree = abrir("tree")
    if tree:
        b = d["B"]
        escBase = (b["tam"] or 2) * T / tree.width
        eMin, eMax = escBase * (1 - b["var"]), escBase * (1 + b["var"])
        anchoS, altoS = tree.width * escBase, tree.height * escBase
        colchon = b["colchon"] * T
        RX, RY = W / 2 + colchon, H / 2 + colchon
        anchoT, altoT = tree.width, tree.height
        RED = b["redondez"] or 0
        ONDA = b["onda"] or 0
        AMP = [0.085, 0.055, 0.035, 0.02]

        def met(nx, ny):
            return max(abs(nx), abs(ny)) * (1 - RED) + math.hypot(nx, ny) * RED

        BASE = met((W - W / 2) / RX, (H - H / 2) / RY) + b["aire"] + sum(AMP) * ONDA

        def borde(nx, ny):
            a = math.atan2(ny, nx)
            return BASE + ONDA * (AMP[0] * math.sin(3 * a + 0.7) + AMP[1] * math.sin(5 * a + 2.1) +
                                  AMP[2] * math.sin(8 * a + 4.3) + AMP[3] * math.sin(13 * a))

        semilla = 20250816

        def az():
            nonlocal semilla
            semilla = (semilla * 1664525 + 1013904223) % 4294967296
            return semilla / 4294967296

        # LAS TRES LEYES, igual que farm.js
        ANCLA = {"c": lambda c, r: ((c + 0.5) * T, (r + 1) * T),
                 "x": lambda c, r: (c * T, r * T),
                 "v": lambda c, r: (c * T, (r + 0.5) * T)}
        lista = []
        cIni, cFin = int(-MX // T) - 1, int(-(-(W + MX) // T)) + 1
        rIni, rFin = int(-MY // T) - 1, int(-(-(H + MY) // T)) + 1
        CADA = max(1, b["cada"] or 1)
        for r in range(rIni, rFin + 1):
            if r % CADA != 0:
                continue
            for c2 in range(cIni, cFin + 1):
                for ley in str(b["leyes"] or "cxv"):
                    if ley not in ANCLA:
                        continue
                    ax0, ay0 = ANCLA[ley](c2, r)
                    esc = eMin + az() * (eMax - eMin)
                    az()
                    rx, ry, rd = az(), az(), az()
                    nx0 = (ax0 - W / 2) / RX
                    ny0 = (ay0 - altoS * 0.28 - H / 2) / RY
                    fuera0 = met(nx0, ny0) - borde(nx0, ny0)
                    if fuera0 < 0:
                        continue
                    enFrente = fuera0 * min(RX, RY) <= (b["frente"] or 1.5) * T
                    jf = b["jf"] or 0
                    jx = b["jx"] if enFrente else max(b["jx"], jf)
                    jy = b["jy"] if enFrente else max(b["jy"], jf)
                    ax = ax0 + round((rx * 2 - 1) * jx)
                    ay = ay0 + round((ry * 2 - 1) * jy)
                    nx = (ax - W / 2) / RX
                    ny = (ay - altoS * 0.28 - H / 2) / RY
                    if met(nx, ny) - borde(nx, ny) < 0:
                        continue
                    if enFrente and ley == "x":
                        continue
                    if not enFrente and rd > (b["dens"] or {}).get(ley, 1):
                        continue
                    lista.append((ay - altoT * esc, ax - anchoT * esc / 2, esc))
        lista.sort(key=lambda t: t[0] + altoT * t[2])   # por la BASE, no por el techo del sprite
        for py, px, esc in lista:
            im = tree.resize((max(1, round(anchoT * esc)), max(1, round(altoT * esc))), Image.NEAREST)
            lienzo.alpha_composite(im, (OX + int(px), OY + int(py)))

    # ---- laguna ----
    p = d["POND"]
    pond = abrir("pond")
    caja = (OX + p["col"] * T, OY + p["row"] * T, OX + (p["col"] + p["cols"]) * T, OY + (p["row"] + p["rows"]) * T)
    if pond:
        im = pond.resize((caja[2] - caja[0], caja[3] - caja[1]), Image.NEAREST)
        lienzo.alpha_composite(im, (caja[0], caja[1]))
    else:
        ImageDraw.Draw(lienzo).ellipse(caja, fill=(70, 150, 200, 255), outline=(230, 180, 90, 255), width=4)

    # ---- parcelas ----
    plot = abrir("plot")
    for i, pl in enumerate(d["PLOTS"]):
        xy = (OX + pl["col"] * T, OY + pl["row"] * T)
        if plot:
            lienzo.alpha_composite(escalar_al_ancho(plot, T), xy)
        else:
            ImageDraw.Draw(lienzo).rectangle([xy[0], xy[1], xy[0] + T, xy[1] + T], fill=(120, 80, 50, 255))

    # ---- cerca ----
    for nom, pos in (("fence_top", "t"), ("fence_bottom", "b"), ("fence_left", "l"), ("fence_right", "r")):
        im = abrir(nom)
        if not im:
            continue
        if pos in "tb":
            im = escalar_al_ancho(im, T)
            fila = OY - im.height // 2 if pos == "t" else OY + H - im.height // 2
            for c in range(C):
                lienzo.alpha_composite(im, (OX + c * T, fila))
        else:
            im = im.resize((max(1, round(T * 0.22)), T), Image.NEAREST)
            col = OX - im.width // 2 if pos == "l" else OX + W - im.width // 2
            for r in range(R):
                lienzo.alpha_composite(im, (col, OY + r * T))

    # ---- objetos, de arriba hacia abajo para que el de adelante tape al de atrás ----
    for o in sorted(d["OBJ"], key=lambda o: o["baseRow"]):
        im = abrir(SPRITE.get(o["type"], o["key"]))
        if not im:
            continue
        im = escalar_al_ancho(im, o["wCells"] * T)
        lienzo.alpha_composite(im, (OX + o["leftCol"] * T, OY + (o["baseRow"] + 1) * T - im.height))

    salida = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, "vista-granja.png")
    lienzo.convert("RGB").save(salida)
    print("mundo %dx%d celdas · %d objetos · %s (%dx%d px)"
          % (C, R, len(d["OBJ"]), salida, lienzo.width, lienzo.height))


if __name__ == "__main__":
    main()
