# Reteñido de assets del rincón a la paleta de madera del granero (16/8).
# Referencia = un PNG ya aprobado (por defecto buzon.png). Ajusta SOLO los píxeles de
# madera (0.035 < h < 0.14), protegiendo los dorados muy claros (v > 0.85):
# hue -> hue medio de la referencia; sat y val -> escalados por la razón de medias.
# Uso: python tools/retint-rincon.py entrada.png salida.png [referencia.png]
import sys, colorsys
from PIL import Image

def madera_stats(img):
    hs = ss = vs = n = 0
    for r, g, b, a in img.convert("RGBA").getdata():
        if a < 128: continue
        h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
        if 0.035 < h < 0.14 and v <= 0.85 and s > 0.15:
            hs += h; ss += s; vs += v; n += 1
    return (hs/n, ss/n, vs/n) if n else (0.068, 0.58, 0.49)

def retint(src, dst, ref):
    th, ts, tv = madera_stats(Image.open(ref))
    img = Image.open(src).convert("RGBA")
    sh, ss_, sv = madera_stats(img)
    out = []
    for r, g, b, a in img.getdata():
        if a >= 128:
            h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
            if 0.035 < h < 0.14 and v <= 0.85 and s > 0.15:   # solo madera; dorados quedan
                h = th
                s = min(1, s * (ts / ss_)) if ss_ else s
                v = min(1, v * (tv / sv)) if sv else v
                r, g, b = [round(c * 255) for c in colorsys.hsv_to_rgb(h, s, v)]
        out.append((r, g, b, a))
    res = Image.new("RGBA", img.size); res.putdata(out); res.save(dst)
    print(f"{src} -> {dst}  (ref h={th:.3f} s={ts:.2f} v={tv:.2f} | src h={sh:.3f} s={ss_:.2f} v={sv:.2f})")

if __name__ == "__main__":
    ref = sys.argv[3] if len(sys.argv) > 3 else "public/assets/farm/buzon.png"
    retint(sys.argv[1], sys.argv[2], ref)
