# VARIANTES DE ÁRBOL PARA EL BOSQUE (16/8) — sin generar arte nuevo y sin gastar créditos.
# Fabrica N árboles distintos RECOMBINANDO el tree.png que ya existe: se separa la copa del
# tronco, y cada variante arma una copa nueva superponiendo 2-3 copias de la misma copa
# (espejadas, escaladas y desplazadas). El resultado son siluetas diferentes con exactamente
# los mismos píxeles y la misma paleta, así que no se nota "otro estilo": se nota variedad.
# Los troncos también se espejan para que no se repita el mismo dibujo.
#   python tools/build-bosque-variantes.py
# Salida: public/assets/farm/tree_v1.png … tree_vN.png  (los carga boot.js)
import os, math, random
from PIL import Image

RAIZ = os.path.join(os.path.dirname(__file__), "..", "public", "assets", "farm")
CORTE = 0.62          # el 62% de arriba del sprite es copa
N = 6                 # cuántas variantes fabricar
random.seed(20250816)  # mismas variantes en cada corrida

def partes(im):
    h = im.height
    corte = int(h * CORTE)
    return im.crop((0, 0, im.width, corte)), im.crop((0, corte, im.width, h))

def pegar(base, capa, dx, dy):
    base.alpha_composite(capa, (max(0, dx), max(0, dy)))

def variante(copa, tronco, receta):
    """receta = lista de (escala, espejo, dx, dy) para superponer copias de la copa"""
    W = int(copa.width * 1.45); H = int(copa.height * 1.35)
    lienzo = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for esc, esp, dx, dy in receta:
        c = copa.resize((max(1, int(copa.width * esc)), max(1, int(copa.height * esc))), Image.NEAREST)
        if esp: c = c.transpose(Image.FLIP_LEFT_RIGHT)
        pegar(lienzo, c, int(W * dx), int(H * dy))
    # recortar al contenido y pegar el tronco centrado abajo
    bb = lienzo.getbbox()
    lienzo = lienzo.crop(bb)
    total = Image.new("RGBA", (max(lienzo.width, tronco.width), lienzo.height + tronco.height), (0, 0, 0, 0))
    total.alpha_composite(lienzo, ((total.width - lienzo.width) // 2, 0))
    t = tronco.transpose(Image.FLIP_LEFT_RIGHT) if random.random() < 0.5 else tronco
    total.alpha_composite(t, ((total.width - t.width) // 2, lienzo.height))
    return total

# recetas: cada una compone la copa de otra manera (una sola, dos solapadas, tres en racimo…)
RECETAS = [
    [(1.00, False, 0.15, 0.18)],                                              # la de siempre
    [(1.00, True,  0.15, 0.18)],                                              # espejada
    [(0.86, False, 0.02, 0.22), (0.86, True, 0.30, 0.14)],                    # dos lóbulos
    [(0.78, True,  0.00, 0.26), (0.92, False, 0.22, 0.10), (0.62, True, 0.52, 0.30)],  # racimo de tres
    [(1.06, False, 0.10, 0.14), (0.66, True, 0.46, 0.34)],                    # una grande + una chica
    [(0.80, False, 0.04, 0.30), (0.80, True, 0.34, 0.30), (0.90, False, 0.18, 0.06)],  # ancha y baja
]

def main():
    src = Image.open(os.path.join(RAIZ, "tree.png")).convert("RGBA")
    copa, tronco = partes(src)
    hechas = []
    for i in range(min(N, len(RECETAS))):
        v = variante(copa, tronco, RECETAS[i])
        # normalizar la altura a la del original: el bosque cuenta con un tamaño parejo
        alto = src.height
        anc = max(1, round(v.width * alto / v.height))
        v = v.resize((anc, alto), Image.NEAREST)
        nombre = f"tree_v{i+1}.png"
        v.save(os.path.join(RAIZ, nombre))
        hechas.append(nombre)
        print(" ", nombre, v.size)
    # hoja de contacto para revisar de un vistazo
    ims = [Image.open(os.path.join(RAIZ, n)).convert("RGBA") for n in hechas]
    W = sum(i.width + 12 for i in ims) + 12
    hoja = Image.new("RGBA", (W, ims[0].height + 24), (110, 140, 90, 255))
    x = 12
    for i in ims:
        hoja.paste(i, (x, 12), i); x += i.width + 12
    hoja.save(os.path.join(RAIZ, "..", "..", "..", "tools", "_variantes.png"))
    print("hoja de contacto: tools/_variantes.png")

if __name__ == "__main__":
    main()
