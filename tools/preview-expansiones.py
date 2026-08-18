# VISTA PREVIA DE LAS EXPANSIONES (18/8) — la granja con bloques comprados de a uno.
#
# Dirección: "las cercas también se expanden". O sea que la cerca NO rodea un rectángulo:
# abraza exactamente lo que compraste, con ángulos hacia dentro incluidos.
#
# Cómo se dibuja sin arte nuevo: se RECORRE EL PERÍMETRO celda a celda. Para cada celda tuya,
# si el vecino de arriba no es tuyo va cerca de arriba; si el de la izquierda no es tuyo, cerca
# izquierda; etc. Cualquier forma sale sola — no hay que enumerar casos ni dibujar esquinas.
#
#   python3 tools/preview-expansiones.py [salida.png]
#   BLOQUES="6,7,11" python3 tools/preview-expansiones.py     (índices de GF.EXPANSIONES)
import json, os, subprocess, sys
from PIL import Image, ImageDraw

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FARM = os.path.join(RAIZ, "public", "assets", "farm")
SPRITE = {"rock": "node_stone", "cofre_diario": "baul_premios"}


def datos():
    js = """
    const fs=require("fs"),vm=require("vm");
    const ctx={console:{log(){},warn(){}},Math,Date,JSON}; ctx.window=ctx;
    vm.runInNewContext(fs.readFileSync("public/game/config.js","utf8"),ctx,{filename:"config.js"});
    const G=ctx.GF;
    process.stdout.write(JSON.stringify({T:G.TILE, COLS:G.COLS_BASE, ROWS:G.ROWS_BASE, MAPA:G.MAPA,
      POND:G.POND, PLOTS:G.PLOTS_BASE, EXP:G.EXPANSIONES, BLOQUE:G.BLOQUE,
      OBJ:G.WORLD_OBJECTS.map(o=>({key:o.key,type:o.type,leftCol:o.leftCol,baseRow:o.baseRow,wCells:o.wCells}))}));
    """
    out = subprocess.run(["node", "-e", js], cwd=RAIZ, capture_output=True, text=True)
    if out.returncode:
        sys.exit("no se pudo leer config.js:\n" + out.stderr)
    return json.loads(out.stdout)


def abrir(n):
    r = os.path.join(FARM, n + ".png")
    return Image.open(r).convert("RGBA") if os.path.exists(r) else None


def esc_ancho(im, a):
    return im.resize((max(1, a), max(1, round(im.height * a / im.width))), Image.NEAREST)


def main():
    d = datos()
    T, C0, R0 = d["T"], d["COLS"], d["ROWS"]
    comprados = [int(x) for x in os.environ.get("BLOQUES", "").split(",") if x.strip().isdigit()]

    # el conjunto de celdas QUE SON TUYAS: el corral + cada bloque comprado
    mias = {(c, r) for c in range(C0) for r in range(R0)}
    for i in comprados:
        e = d["EXP"][i]
        for c in range(e["c0"], e["c1"]):
            for r in range(e["r0"], e["r1"]):
                mias.add((c, r))

    # 18/8 (dirección: "el cercado no puede pisar los árboles"). Hoy hay un anillo de césped de
    # 2,3 celdas entre la cerca y el primer tronco, y ese aire tiene que viajar con la expansión.
    # Se generaliza a cualquier forma: el bosque se retira de toda celda que esté a menos de AIRE
    # de algo tuyo. En un rectángulo da exactamente el anillo de siempre; en un contorno irregular
    # lo sigue sin que haya que enumerar ni un caso.
    AIRE = 2.3
    RA = int(AIRE) + 1
    despejado = set(mias)
    for (c, r) in mias:
        for dc in range(-RA, RA + 1):
            for dr in range(-RA, RA + 1):
                if dc * dc + dr * dr <= AIRE * AIRE:
                    despejado.add((c + dc, r + dr))

    B = d["BLOQUE"]
    CMIN, CMAX = -B, C0 + B          # el mapa completo: el corral mas un anillo de bloques
    RMIN, RMAX = -B, R0 + B
    ANCHO, ALTO = (CMAX - CMIN) * T, (RMAX - RMIN) * T
    MAPA = d["MAPA"] or 1600
    MX, MY = round((MAPA - ANCHO) / 2), round((MAPA - ALTO) / 2)
    im = Image.new("RGBA", (MAPA, MAPA), (46, 66, 40, 255))
    OX, OY = MX - CMIN * T, MY - RMIN * T      # donde cae la celda (0,0)

    def xy(c, r):
        return OX + c * T, OY + r * T

    # ---- cesped en lo tuyo ----
    pastos = [p for p in (abrir("grass_a"), abrir("grass_b"), abrir("grass_c")) if p]
    pastos = [esc_ancho(p, T) for p in pastos]
    if pastos:
        for (c, r) in despejado:                      # el césped llega hasta donde llega el aire
            im.alpha_composite(pastos[(c * 7 + r * 3) % len(pastos)], xy(c, r))

    # ---- bosque en lo que NO es tuyo ----
    tree = abrir("tree")
    if tree:
        esc = 2 * T / tree.width
        tw, th = max(1, round(tree.width * esc)), max(1, round(tree.height * esc))
        chico = tree.resize((tw, th), Image.NEAREST)
        pend = []
        sem = [20250816]

        def az():
            sem[0] = (sem[0] * 1664525 + 1013904223) % 4294967296
            return sem[0] / 4294967296

        for r in range(RMIN - 3, RMAX + 3):
            for c in range(CMIN - 3, CMAX + 3):
                if (c, r) in despejado:               # el bosque respeta el anillo de césped
                    continue
                for ax, ay in (((c + 0.5) * T, (r + 1) * T), (c * T, (r + 0.5) * T)):
                    if az() > 0.86:
                        continue
                    pend.append((ay, ax))
        pend.sort()
        for ay, ax in pend:
            im.alpha_composite(chico, (int(OX + ax - tw / 2), int(OY + ay - th)))

    # ---- laguna, parcelas y objetos ----
    p = d["POND"]
    pond = abrir("pond")
    if pond:
        cw, ch = p["cols"] * T, p["rows"] * T
        rel = pond.width / pond.height
        a = min(cw, ch * rel)
        po = pond.resize((max(1, round(a)), max(1, round(a / rel))), Image.NEAREST)
        x, y = xy(p["col"], p["row"])
        im.alpha_composite(po, (x + (cw - po.width) // 2, y + (ch - po.height) // 2))
    plot = abrir("plot")
    for pl in d["PLOTS"]:
        if plot:
            im.alpha_composite(esc_ancho(plot, T), xy(pl["col"], pl["row"]))
    for o in sorted(d["OBJ"], key=lambda o: o["baseRow"]):
        s = abrir(SPRITE.get(o["type"], o["key"]))
        if not s:
            continue
        s = esc_ancho(s, int(o["wCells"] * T))
        x, y = xy(o["leftCol"], o["baseRow"] + 1)
        im.alpha_composite(s, (x, y - s.height))

    # ---- LA CERCA, recorriendo el perimetro ----
    ft, fb, fl, fr = abrir("fence_top"), abrir("fence_bottom"), abrir("fence_left"), abrir("fence_right")
    FH = round(T * 0.62)
    if ft:
        ft, fb = esc_ancho(ft, T), esc_ancho(fb, T)
        fl = fl.resize((max(1, round(T * 0.22)), T), Image.NEAREST)
        fr = fr.resize((max(1, round(T * 0.22)), T), Image.NEAREST)
        for (c, r) in sorted(mias, key=lambda t: t[1]):
            x, y = xy(c, r)
            if (c, r - 1) not in mias:
                im.alpha_composite(ft, (x, y - ft.height // 2))
            if (c, r + 1) not in mias:
                im.alpha_composite(fb, (x, y + T - fb.height // 2))
            if (c - 1, r) not in mias:
                im.alpha_composite(fl, (x - fl.width // 2, y))
            if (c + 1, r) not in mias:
                im.alpha_composite(fr, (x + T - fr.width // 2, y))

    ImageDraw.Draw(im).text((14, 14), "bloques comprados: %s  ·  %d celdas de granja  ·  aire cerca-bosque %.1f celdas" %
                            (",".join(map(str, comprados)) or "ninguno", len(mias), AIRE), fill=(255, 210, 74))
    salida = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, "vista-expansiones.png")
    im.convert("RGB").save(salida)
    print("%s  ·  %d bloques  ·  %d celdas" % (salida, len(comprados), len(mias)))


if __name__ == "__main__":
    main()
