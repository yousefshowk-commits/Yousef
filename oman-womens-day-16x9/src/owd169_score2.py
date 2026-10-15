"""Score v2 + mix for «يوم المرأة العُمانية» 16:9 (50s) — cinematic orchestral, D major, 76 BPM.

Pure numpy: felt piano arpeggios + melody, string ensemble, low brass swells, harp glissandi,
celesta sparkles, timpani and cymbal swells; CC0 SFX on the cuts; ElevenLabs narration on top
with side-chain ducking. Picture events are written on the film's reference timeline and mapped
through the same piecewise-linear time warp the picture uses (warp.json: {"vo_at", "old", "new"}).
  python3 owd169_score2.py <sfx_dir> narration.mp3 warp.json out.wav
"""
import sys, json, wave, subprocess
import numpy as np

SR = 48000
DUR = 50.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N); SEND = np.zeros(N)
rng = np.random.default_rng(29)
BEAT = 60 / 76; BAR = 4 * BEAT; E8 = BEAT / 2

WARP = json.load(open(sys.argv[3]))
VO_AT = WARP["vo_at"]
def _pchip(x, y):
    x, y = np.asarray(x, float), np.asarray(y, float)
    h = np.diff(x); d = np.diff(y) / h; m = np.zeros(len(x)); m[0], m[-1] = d[0], d[-1]
    for i in range(1, len(x) - 1):
        if d[i - 1] * d[i] > 0:
            w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    def f(t):
        i = int(np.clip(np.searchsorted(x, t) - 1, 0, len(x) - 2))
        s = (t - x[i]) / h[i]
        return float((2*s**3 - 3*s**2 + 1) * y[i] + (s**3 - 2*s**2 + s) * h[i] * m[i] + (-2*s**3 + 3*s**2) * y[i+1] + (s**3 - s**2) * h[i] * m[i+1])
    return f
_inv = _pchip(WARP["new"], WARP["old"])   # film → reference (same curve the picture uses)
_grid = np.linspace(0, DUR, 5001); _ref = np.array([_inv(g) for g in _grid])
def W(t):
    """reference-timeline seconds → final film seconds (inverse of the picture's warp)"""
    return float(np.interp(t, _ref, _grid))


def tt(d):
    return np.arange(int(d * SR)) / SR


def hz(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def place(sig, t, gain=1.0, pan=0.0, rev=0.3):
    i = int(t * SR)
    if i >= N or i < 0:
        return
    s = sig[: N - i] * gain
    l, r = np.sqrt(0.5 * (1 - pan)), np.sqrt(0.5 * (1 + pan))
    L[i:i + len(s)] += s * l * 1.414
    R[i:i + len(s)] += s * r * 1.414
    SEND[i:i + len(s)] += s * rev


def filt(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    if hi: X *= 1 / np.sqrt(1 + (f / hi) ** 4)
    if lo: X *= 1 - 1 / np.sqrt(1 + (f / lo) ** 4)
    return np.fft.irfft(X, len(x))


# ---------------------------------------------------------------- instruments
def piano(n, d=3.0, vel=1.0):
    f = hz(n); t = tt(d); y = np.zeros(len(t)); B = 0.00018
    for k in range(1, 10):
        fk = f * k * np.sqrt(1 + B * k * k)
        if fk > 16000: break
        y += (1 / k ** 1.25) * np.sin(2 * np.pi * fk * t + rng.uniform(0, 6)) * np.exp(-t * (0.7 + 0.55 * k) * (1 + n / 120))
    y += filt(rng.standard_normal(len(t)), 800, 5000) * np.exp(-t * 90) * 0.08  # hammer
    y *= np.minimum(1, t / 0.003) * np.clip((d - t) / 0.25, 0, 1)
    return y * 0.32 * vel


def ensemble(notes, d, att=1.2, rel=1.6, bright=3200, g=1.0):
    t = tt(d); out = np.zeros(len(t))
    for n in notes:
        for det in (-0.11, -0.04, 0.03, 0.1):
            ff = hz(n) * 2 ** (det / 12) * (1 + 0.0025 * np.sin(2 * np.pi * 5.0 * t + rng.uniform(0, 6)))
            ph = 2 * np.pi * np.cumsum(ff) / SR
            out += sum(np.sin(k * ph) / k for k in range(1, 10))
    out = filt(out, 90, bright)
    env = np.minimum(1, t / att) ** 1.5 * np.clip((d - t) / rel, 0, 1)
    return out * env * 0.035 * g / len(notes)


def brass(notes, d, g=1.0):
    t = tt(d); out = np.zeros(len(t))
    for n in notes:
        for det in (-0.06, 0.05):
            ph = 2 * np.pi * np.cumsum(hz(n) * 2 ** (det / 12) * np.ones(len(t))) / SR
            out += sum(np.sin(k * ph) / k ** 0.9 for k in range(1, 14))
    bright = 600 + 2200 * np.minimum(1, t / 0.35)  # filter opens like a swell
    out = filt(out, 60, 2600) * (0.55 + 0.45 * bright / 2800)
    env = np.minimum(1, t / 0.12) * np.clip((d - t) / 1.2, 0, 1)
    return out * env * 0.03 * g / len(notes)


def harp(n, d=2.2, bright=0.85):
    f = hz(n); P = max(2, int(round(SR / f))); total = int(d * SR)
    buf = filt(np.r_[rng.uniform(-1, 1, P), np.zeros(P)], hi=2500 + 7000 * bright)[:P]
    y = np.zeros(total); y[:P] = buf; i = P
    while i < total:
        j = min(total, i + P)
        seg = y[i - P:j - P]
        prev = y[i - P - 1:j - P - 1] if i - P - 1 >= 0 else np.r_[0, y[i - P:j - P - 1]]
        y[i:j] = 0.4993 * (seg + prev); i = j
    t = tt(d)
    return y * np.clip((d - t) / 0.1, 0, 1) * 0.55


def celesta(n, d=1.6):
    t = tt(d); f = hz(n)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 3) + 0.35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 9) + 0.12 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6)
    return y * np.minimum(1, t / 0.002) * 0.22


def timp(g=1.0, pitch=58):
    t = tt(2.2)
    f = hz(pitch - 24) * (1 + 0.15 * np.exp(-t * 18))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.4)
    head = filt(rng.standard_normal(len(t)), 80, 900) * np.exp(-t * 30) * 0.5
    return np.tanh((body + head) * 1.3) * 0.6 * g


def sub_hit(g=1.0):
    t = tt(2.6)
    f = 38 + 44 * np.exp(-t * 5)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.4) * g


def swell(d, g=1.0):
    """reverse-cymbal swell"""
    t = tt(d)
    return filt(rng.standard_normal(len(t)), 3000, 14000) * (t / d) ** 3 * 0.35 * g


def harp_gliss(t0, up=True, notes=None, span=0.7, g=0.5):
    notes = notes or [62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86]
    seq = notes if up else notes[::-1]
    for i, n in enumerate(seq):
        place(harp(n, 1.8), t0 + i * span / len(seq), g * (0.7 + 0.3 * i / len(seq)), pan=-0.5 + i / len(seq), rev=0.6)


# ---------------------------------------------------------------- harmony  (D major)
D_, Bm, G_, A_, Em = [50, 57, 62, 66], [47, 54, 59, 62], [43, 50, 55, 59], [45, 52, 57, 61], [40, 52, 55, 59]
PROG = [D_, Bm, G_, A_]


def arp_bar(t0, ch, vel=1.0, oct_up=12, dur=BAR):
    tones = sorted(set([n + oct_up for n in ch[1:]] + [n + oct_up + 12 for n in ch[1:3]]))
    pat = [0, 1, 2, 3, 4, 3, 2, 1]
    for i, p in enumerate(pat):
        tn = t0 + i * E8
        if tn - t0 >= dur - 0.01: break
        place(piano(tones[p % len(tones)], 2.2, vel * (0.85 if i % 2 else 1.0)), tn, 0.55, pan=-0.25 + 0.5 * p / 4, rev=0.4)


# ---------------------------------------------------------------- arrangement (reference times → W)
lock, c2, c3, c4, c5, c6, c7 = W(2.05), W(6.9), W(12.65), W(21.75), W(30.95), W(37.05), W(40.85)
roles = [W(x) for x in (12.8, 15.0, 17.7, 18.5, 19.5)]
ink, y2040, pillars, arch, sub_line = W(20.25), W(26.2), [W(x) for x in (31.0, 32.5, 34.4)], W(35.9), W(42.95)

# intro: low strings + swell into the medallion lock
place(ensemble([38, 50, 57], lock + 0.6, att=1.6, rel=0.5, bright=1800), 0.0, 1.0, rev=0.5)
place(swell(lock - 0.1), 0.1, 0.8, rev=0.3)
place(timp(1.0), lock, 0.9, rev=0.3); place(sub_hit(0.9), lock, 0.8, rev=0.05)
for i, n in enumerate((86, 90, 93, 98)):
    place(celesta(n), lock + 0.08 * i, 0.7, pan=-0.3 + 0.2 * i, rev=0.7)

# opening lines: piano arps + string bed, bars from the lock
b = 0; t = lock
while t < c7 - 0.05:
    ch = PROG[b % 4]
    in_break = c6 - 0.05 <= t < c7
    if not in_break:
        vel = 0.55 if t < c2 else 0.75 if t < c3 else 0.9
        if c4 <= t < y2040: vel = 0.6
        arp_bar(t, ch, vel)
        place(ensemble([n + 12 for n in ch], BAR + 1.0, att=0.9, rel=1.2, bright=2600 if t < c3 else 3600), t, 0.8 if t < c3 else 1.0, rev=0.55)
        if t >= c2:   # cello/bass pulse
            for k in range(4):
                place(piano(ch[0] - 12, 1.0, 0.8), t + k * BEAT, 0.5, rev=0.15)
                place(ensemble([ch[0] - 12], BEAT * 0.95, att=0.02, rel=0.2, bright=900, g=1.6), t + k * BEAT, 0.6, rev=0.1)
        if c3 <= t < c4 or y2040 <= t < c6:
            place(timp(0.45), t, 0.5, rev=0.3)
    b += 1; t = lock + b * BAR

# cuts: harp glissandi
for c, up in ((c2, True), (c3, True), (c4, False), (c5, True), (c6, False)):
    harp_gliss(c - 0.55, up)
# roles: celesta + harp note on each word
for i, tr in enumerate(roles):
    place(celesta([74, 78, 81, 83, 86][i] + 12), tr, 0.8, pan=(-0.4 if i % 2 else 0.4), rev=0.7)
    place(harp([74, 78, 81, 83, 86][i], 2.0), tr, 0.5, rev=0.5)
place(brass([62, 66, 69], 2.2, g=0.8), ink, 0.7, rev=0.5)

# heritage → 2040: swell + timp roll, brass hit on «٢٠٤٠»
place(swell(1.8), y2040 - 1.8, 0.9)
for k in range(18):
    place(timp(0.25 + 0.5 * k / 18), y2040 - 1.5 + 1.5 * (1 - (1 - k / 18) ** 1.5), 0.45, rev=0.3)
place(timp(1.0), y2040, 0.95); place(sub_hit(0.9), y2040, 0.8, rev=0.05)
place(brass([50, 57, 62, 66, 69], 4.0, g=1.2), y2040, 0.95, rev=0.6)
for i, n in enumerate((86, 90, 93)):
    place(celesta(n), y2040 + 0.1 * i, 0.6, rev=0.7)

# pillars: timp + low brass, celesta on the arch
for i, tp in enumerate(pillars):
    place(timp(0.8, pitch=[58, 62, 65][i]), tp, 0.85, rev=0.3)
    place(brass([[50, 57], [55, 62], [57, 64]][i], 1.6, g=0.9), tp, 0.7, rev=0.5)
harp_gliss(arch - 0.7, True)
for i, n in enumerate((86, 90, 93, 98)):
    place(celesta(n), arch + 0.09 * i, 0.6, rev=0.7)

# petals: breakdown — solo piano melody over high strings, timp roll into the finale
place(ensemble([74, 78, 81], c7 - c6 + 0.6, att=0.8, rel=0.8, bright=5000, g=0.9), c6, 0.9, rev=0.8)
mel = [(0, 78, 1), (1, 81, 1), (2, 83, 2), (4, 81, 1), (5, 78, 1), (6, 76, 2), (8, 74, 3)]
for st, n, ln in mel:
    tn = c6 + 0.25 + st * E8 * 1.05
    if tn < c7 - 0.3:
        place(piano(n, 2.8, 0.95), tn, 0.65, rev=0.6)
place(swell(1.6), c7 - 1.6, 1.0)
for k in range(20):
    place(timp(0.25 + 0.6 * k / 20), c7 - 1.4 + 1.4 * (1 - (1 - k / 20) ** 1.5), 0.45, rev=0.3)

# finale: full orchestra hit, arps, melody, ring out
place(timp(1.1), c7, 1.0); place(sub_hit(1.1), c7, 0.9, rev=0.05)
place(brass([38, 50, 57, 62, 66, 69], 4.5, g=1.4), c7, 1.0, rev=0.6)
place(ensemble([62, 66, 69, 74, 78], DUR - c7, att=0.3, rel=3.0, bright=5200, g=1.2), c7, 1.0, rev=0.7)
harp_gliss(c7 + 0.05, True, span=0.9)
b = 0; t = c7
fin = [D_, G_, A_, D_]
while t < DUR - 4.2:
    arp_bar(t, fin[b % 4], 0.85)
    place(timp(0.4), t, 0.45, rev=0.3)
    b += 1; t = c7 + b * BAR
mel2 = [(0, 81, 1), (1, 83, 1), (2, 86, 2), (4, 85, 1), (5, 83, 1), (6, 81, 2), (8, 78, 1), (9, 81, 1), (10, 86, 3)]
for st, n, ln in mel2:
    place(piano(n, 3.0, 0.9), sub_line + st * E8, 0.55, rev=0.6)
tend = DUR - 4.0
for i, n in enumerate((50, 57, 62, 66, 69, 74, 78)):
    place(piano(n, 4.0, 0.9), tend + 0.03 * i, 0.6, rev=0.8)
place(ensemble([50, 57, 62, 66], 4.0, att=0.2, rel=3.2, bright=3000), tend, 0.9, rev=0.8)
for i, n in enumerate((90, 93, 98)):
    place(celesta(n), tend + 0.15 + 0.1 * i, 0.5, rev=0.8)


# ---------------------------------------------------------------- SFX
def load(path, ch=1):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", str(ch), "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype="<f4").astype(np.float64)


SFX = [("impact-soft", lock, 0.5), ("reveal", lock + 0.25, 0.35),
       ("whoosh-slow", c2 - 0.3, 0.4), ("whoosh-slow", c3 - 0.3, 0.4), ("whoosh-low", c4 - 0.25, 0.45),
       ("reveal", y2040 + 0.25, 0.35), ("whoosh-slow", c5 - 0.3, 0.4), ("whoosh-slow", c6 - 0.3, 0.35),
       ("impact", c7, 0.55), ("reveal", c7 + 0.25, 0.4)]
SFX += [("swoosh", r - 0.35, 0.22) for r in roles[1:]]
cache = {}
for name, t0, g in SFX:
    if name not in cache:
        cache[name] = load(f"{sys.argv[1]}/{name}.mp3")
    place(cache[name], t0, g, pan=rng.uniform(-0.25, 0.25), rev=0.15)


# ---------------------------------------------------------------- hall reverb + music master
def reverb(x, d=3.2):
    t = tt(d)
    irL = filt(rng.standard_normal(len(t)) * np.exp(-t * 2.0), hi=7000)
    irR = filt(rng.standard_normal(len(t)) * np.exp(-t * 2.0), hi=7000)
    pre = int(0.03 * SR); n = len(x) + len(t) + pre
    nfft = 1 << int(np.ceil(np.log2(n)))
    X = np.fft.rfft(x, nfft)
    yl = np.fft.irfft(X * np.fft.rfft(np.r_[np.zeros(pre), irL], nfft), nfft)[: len(x)]
    yr = np.fft.irfft(X * np.fft.rfft(np.r_[np.zeros(pre), irR], nfft), nfft)[: len(x)]
    return yl * 0.07, yr * 0.07


rl, rr = reverb(SEND)
L += rl; R += rr
tf = tt(DUR)
fade = np.minimum(1, tf / 0.05) * np.clip((DUR - tf) / 1.8, 0, 1) ** 1.2
L *= fade; R *= fade
peak = max(np.abs(L).max(), np.abs(R).max())
L = np.tanh(L / peak * 1.4) * 0.8; R = np.tanh(R / peak * 1.4) * 0.8

# ---------------------------------------------------------------- narration + ducking
vo_src = load(sys.argv[2])
vo = np.zeros(N)
i0 = int(VO_AT * SR)
vo[i0:i0 + len(vo_src)] = vo_src[: N - i0]
X = np.fft.rfft(vo); f = np.fft.rfftfreq(len(vo), 1 / SR)
X *= 1 + 0.12 / (1 + (f / 200) ** 2) + 0.1 / (1 + (4500 / np.maximum(f, 1)) ** 4)   # body + air
vo = np.fft.irfft(X, len(vo))
ir_t = np.arange(int(0.8 * SR)) / SR
ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 6.5)
nfft = 1 << int(np.ceil(np.log2(len(vo) + len(ir))))
room = np.fft.irfft(np.fft.rfft(vo, nfft) * np.fft.rfft(ir, nfft), nfft)[: len(vo)]
vo_l = vo + room * 0.01; vo_r = vo + np.roll(room, 240) * 0.01
vp = max(np.abs(vo_l).max(), 1e-9); vo_l /= vp; vo_r /= vp

env = np.abs(vo)
win = int(0.03 * SR)
env = np.convolve(env, np.ones(win) / win, mode="same")
env /= max(env.max(), 1e-9)
att, rel = np.exp(-1 / (0.02 * SR)), np.exp(-1 / (0.45 * SR))
sm = np.zeros(N); prev = 0.0; step = 48
for j in range(0, N, step):
    x = env[j]
    prev = att * prev + (1 - att) * x if x > prev else rel * prev + (1 - rel) * x
    sm[j:j + step] = prev
duck = 1 - 0.55 * np.clip(sm * 3.0, 0, 1)

outL = L * duck * 0.6 + vo_l * 0.92
outR = R * duck * 0.6 + vo_r * 0.92
pk = max(np.abs(outL).max(), np.abs(outR).max())
outL /= pk / 0.95; outR /= pk / 0.95
pcm = (np.stack([outL, outR], 1) * 32767).astype("<i2")
with wave.open(sys.argv[4], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("ok", DUR, "s")
