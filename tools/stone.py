"""Процедурная текстура: диск из тёмного камня у цзинь ши (вид сверху), прозрачный фон."""
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

S = 1536
rng = np.random.default_rng(7)

def noise(cells, seed):
    r = np.random.default_rng(seed)
    g = r.random((cells, cells)).astype(np.float32)
    im = Image.fromarray((g * 65535).astype(np.uint16).astype(np.int32), mode='I').convert('F')
    return np.asarray(im.resize((S, S), Image.BICUBIC), dtype=np.float32)

def fbm(base, octaves, seed, gain=0.5):
    acc = np.zeros((S, S), np.float32); amp = 1.0; tot = 0
    for o in range(octaves):
        acc += amp * noise(base * 2 ** o, seed + o); tot += amp; amp *= gain
    a = acc / tot
    return (a - a.min()) / (a.max() - a.min())

yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
cx = cy = (S - 1) / 2
dx, dy = xx - cx, yy - cy
r = np.hypot(dx, dy) / (S / 2)            # 0 в центре, 1 на краю кадра

R0 = 0.985                                 # край диска
RIM_IN = 0.925                             # начало бортика

# --- фактура камня ---
mott0 = fbm(4, 6, 11)                      # крупные пятна
wa = fbm(3, 4, 13); wb = fbm(3, 4, 14)
mx = np.clip(xx + (wa - 0.5) * S * 0.25, 0, S - 1).astype(np.int32)
my = np.clip(yy + (wb - 0.5) * S * 0.25, 0, S - 1).astype(np.int32)
mott = mott0[my, mx]
grain = fbm(64, 3, 31, 0.6)                # мелкое зерно
micro = rng.random((S, S)).astype(np.float32)
tone = 0.55 * mott + 0.3 * grain + 0.15 * micro

base_dark = np.array([15, 20, 22], np.float32)     # уголь с холодной зеленцой
base_light = np.array([44, 52, 53], np.float32)
t = np.clip((tone - 0.25) / 0.6, 0, 1)[..., None]
rgb = base_dark + (base_light - base_dark) * t
# участки чуть зеленее / чуть синее
hue = fbm(3, 4, 17)[..., None]
rgb += (hue - 0.5) * np.array([-6, 4, 2], np.float32) * 1.6
# тёмные поры
pores = (rng.random((S, S)) < 0.0035).astype(np.float32)
pores = np.clip(gaussian_filter(pores, 0.9) * 5, 0, 1)
rgb *= (1 - 0.45 * pores)[..., None]

# --- золотые прожилки: ridged noise с искажением координат ---
w1 = fbm(3, 4, 51); w2 = fbm(3, 4, 52)
warpx = ((w1 - 0.5) * S * 0.18).astype(np.float32)
warpy = ((w2 - 0.5) * S * 0.18).astype(np.float32)
vn = fbm(6, 6, 61)
ix = np.clip(xx + warpx, 0, S - 1).astype(np.int32)
iy = np.clip(yy + warpy, 0, S - 1).astype(np.int32)
vw = vn[iy, ix]
ridge = 1 - np.abs(vw * 2 - 1)
vein = np.clip((ridge - 0.978) / 0.022, 0, 1) ** 2.2
# вторая сеть — волосяные трещинки
vn2 = fbm(10, 5, 81)[iy, ix]
ridge2 = 1 - np.abs(vn2 * 2 - 1)
vein2 = np.clip((ridge2 - 0.988) / 0.012, 0, 1) ** 2
mask = np.clip((fbm(2, 3, 71) - 0.48) / 0.22, 0, 1)   # прожилки только местами
mask2 = np.clip((fbm(2, 3, 72) - 0.5) / 0.2, 0, 1)
vein = np.clip(vein * mask + vein2 * mask2 * 0.55, 0, 1) * (0.6 + 0.4 * grain)
vein = gaussian_filter(vein, 0.8) * 1.15
gold = np.array([196, 156, 84], np.float32)
rgb = rgb * (1 - vein[..., None] * 0.7) + gold * (vein[..., None] * 0.7)

# --- искры слюды ---
n_sp = 900
px = rng.integers(0, S, n_sp); py = rng.integers(0, S, n_sp)
sp = np.zeros((S, S), np.float32)
br = rng.random(n_sp) ** 3
sp[py, px] = br
sp_img = Image.fromarray(sp, mode='F')

glow = gaussian_filter(sp, 1.1) * 6
core = gaussian_filter(sp, 0.5) * 3
spark = np.clip(glow * 0.6 + core, 0, 1)
warm = (rng.random((S, S)) < 0.35)[..., None]
spark_col = np.where(warm, np.array([236, 206, 150], np.float32), np.array([214, 230, 226], np.float32))
rgb = rgb + (spark_col - rgb) * (spark[..., None] * 0.7)

# --- рельеф: утопленная чаша и скруглённый бортик, свет сверху-слева ---
def smooth(a, b, x):
    k = np.clip((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k)
h = smooth(RIM_IN - 0.01, RIM_IN + 0.025, r) - smooth(R0 - 0.03, R0, r) * 0.9
h += 0.004 * grain                           # микрорельеф
hs = gaussian_filter(h.astype(np.float32), 2)
gy, gx = np.gradient(hs * S * 0.06)
nx, ny, nz = -gx, -gy, np.ones_like(gx)
nl = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
L = np.array([-0.55, -0.65, 0.52]); L /= np.linalg.norm(L)
shade = (nx * L[0] + ny * L[1] + nz * L[2]) / nl
shade = (shade - L[2]) * 1.6                 # 0 на плоскости
rgb = rgb * (1 + np.clip(shade, -0.6, 0.9)[..., None])

# лёгкая полировка бортика и тень у внутренней кромки
rim = smooth(RIM_IN, RIM_IN + 0.02, r) * (1 - smooth(R0 - 0.01, R0, r))
rgb *= (1 + 0.12 * rim)[..., None]
inner_shadow = np.exp(-((r - (RIM_IN - 0.012)) / 0.03) ** 2) * (r < RIM_IN)
rgb *= (1 - 0.35 * inner_shadow)[..., None]
# мягкий отблеск полировки сверху-слева
sheen = np.exp(-(((xx - S * 0.34) / (S * 0.32)) ** 2 + ((yy - S * 0.3) / (S * 0.26)) ** 2))
rgb *= (1 + 0.16 * sheen * (r < RIM_IN))[..., None]
# мягкое затемнение к краю чаши, чтобы центр оставался спокойным
rgb *= (1 - 0.18 * smooth(0.2, RIM_IN, r))[..., None]

alpha = np.clip((R0 - r) * S / 2 / 1.2, 0, 1)
out = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)
img = Image.fromarray(out, 'RGBA')
import sys
outdir = sys.argv[1] if len(sys.argv) > 1 else "src/assets"
img.save(f'{outdir}/stone.avif', quality=62, speed=4)
img.save(f'{outdir}/stone.webp', quality=78, method=6)

