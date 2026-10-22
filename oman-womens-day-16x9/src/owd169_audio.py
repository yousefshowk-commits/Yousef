"""Score + mix for «يوم المرأة العُمانية» 16:9 (50s, 90 BPM, D Hijaz).

Pure numpy: pads, oud-like Karplus-Strong plucks, a soft khaleeji frame-drum
groove, string swells and CC0 SFX on every cut / 3D hit; the ElevenLabs
narration sits on top (starts at 2.0s) with side-chain ducking.
  python3 owd169_audio.py <sfx_dir> narration.mp3 out.wav
"""
import sys, wave, subprocess
import numpy as np

SR = 48000
DUR = 50.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N); SEND = np.zeros(N)
rng = np.random.default_rng(17)
BEAT = 60 / 90; BAR = 4 * BEAT; E8 = BEAT / 2


def tt(d):
    return np.arange(int(d * SR)) / SR


def hz(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def place(sig, t, gain=1.0, pan=0.0, rev=0.25):
    i = int(t * SR)
    if i >= N or i < 0:
        return
    s = sig[: N - i] * gain
    l, r = np.sqrt(0.5 * (1 - pan)), np.sqrt(0.5 * (1 + pan))
    L[i:i + len(s)] += s * l * 1.414
    R[i:i + len(s)] += s * r * 1.414
    SEND[i:i + len(s)] += s * rev


def lowpass(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / fc) ** 4)
    return np.fft.irfft(X, len(x))


def bandpass(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / hi) ** 4) * (1 - 1 / np.sqrt(1 + (f / lo) ** 4))
    return np.fft.irfft(X, len(x))


# ---------------------------------------------------------------- drums
def doum(g=1.0):
    t = tt(0.55)
    f = 58 + 90 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 6.5)
    skin = bandpass(rng.standard_normal(len(t)), 200, 900) * np.exp(-t * 40) * 0.35
    return np.tanh((body + skin) * 1.6) * g


def tak(g=1.0):
    t = tt(0.18)
    n = bandpass(rng.standard_normal(len(t)), 1800, 7000) * np.exp(-t * 55)
    ring = np.sin(2 * np.pi * 410 * t) * np.exp(-t * 45) * 0.5
    return (n + ring) * 0.6 * g


def clap(g=1.0):
    t = tt(0.35)
    out = np.zeros(len(t))
    for k, off in enumerate((0.0, 0.011, 0.023, 0.031)):  # a few hands, slightly apart
        i = int(off * SR)
        n = bandpass(rng.standard_normal(len(t) - i), 900, 5200) * np.exp(-tt((len(t) - i) / SR) * (60 if k < 3 else 16))
        out[i:] += n
    return out * 0.45 * g


def shaker(g=1.0):
    t = tt(0.09)
    return bandpass(rng.standard_normal(len(t)), 5000, 12000) * np.sin(np.pi * t / 0.09) * 0.25 * g


def sub_boom(g=1.0):
    t = tt(2.2)
    f = 42 + 50 * np.exp(-t * 6)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6) * g


# ---------------------------------------------------------------- tonal
def pluck(n, d=1.6, bright=0.55, g=1.0):
    """Oud-ish Karplus-Strong with a plectrum click."""
    f = hz(n); P = max(2, int(round(SR / f))); total = int(d * SR)
    buf = rng.uniform(-1, 1, P)
    buf = lowpass(np.r_[buf, np.zeros(P)], 2000 + 6000 * bright)[:P]
    y = np.zeros(total)
    y[:P] = buf
    i = P
    while i < total:
        j = min(total, i + P)
        seg = y[i - P:j - P]
        prev = y[i - P - 1:j - P - 1] if i - P - 1 >= 0 else np.r_[0, y[i - P:j - P - 1]]
        y[i:j] = 0.4985 * (seg + prev)
        i = j
    t = tt(d)
    y *= np.minimum(1, (d - t) / 0.08).clip(0)
    click = bandpass(rng.standard_normal(int(0.01 * SR)), 2000, 8000) * 0.3
    y[:len(click)] += click
    return y * 0.9 * g


def pad(notes, d, bright=1.0, att=1.2, rel=1.6):
    t = tt(d); out = np.zeros(len(t))
    for n in notes:
        f = hz(n)
        for det in (-0.08, 0.0, 0.09):
            ff = f * 2 ** (det / 12); ph = rng.uniform(0, 6.28)
            for k, a in ((1, 1.0), (2, 0.4 * bright), (3, 0.18 * bright), (5, 0.05 * bright)):
                out += a * np.sin(2 * np.pi * ff * k * t + ph * k)
    env = np.minimum(1, t / att) * np.minimum(1, (d - t) / rel).clip(0)
    return out * env / (len(notes) * 3.5)


def strings(notes, d, g=1.0):
    t = tt(d); out = np.zeros(len(t))
    for n in notes:
        for det in (-0.12, -0.04, 0.05, 0.11):
            ff = hz(n) * 2 ** (det / 12) * (1 + 0.003 * np.sin(2 * np.pi * 5.2 * t + rng.uniform(0, 6)))
            ph = 2 * np.pi * np.cumsum(ff) / SR
            saw = sum(np.sin(k * ph) / k for k in range(1, 9))
            out += saw
    out = lowpass(out, 3200)
    env = (t / d) ** 2.2
    return out * env * 0.05 * g / len(notes)


def bass(n, d, g=1.0):
    t = tt(d)
    y = np.sin(2 * np.pi * hz(n) * t) + 0.3 * np.sin(4 * np.pi * hz(n) * t)
    return y * np.exp(-t * 2.2) * np.minimum(1, t / 0.005) * 0.55 * g


def noise_riser(d, g=1.0):
    t = tt(d)
    n = rng.standard_normal(len(t))
    out = np.zeros(len(t)); seg = int(0.05 * SR)
    for i in range(0, len(t), seg):  # sweeping band
        k = i / len(t)
        out[i:i + seg] = bandpass(n[i:i + seg + 0], 300 + 6000 * k, 1200 + 12000 * k)[: len(out[i:i + seg])]
    return out * (t / d) ** 2.5 * 0.5 * g


# ---------------------------------------------------------------- arrangement
# Film beats (s): lock 2.05 · cuts 6.9 / 12.65 / 21.75 / 30.95 / 37.05 / 40.85 · roles 12.8 15.0 17.7 18.5 19.5
# 2040 hit 26.2 · pillars 31.0 32.5 34.4 · arch 35.9 · title 40.85
D, Eb, Fs, G, A, Bb, Cn = 62, 63, 66, 67, 69, 70, 72
chords = [[50, 57, 62, 66], [55, 62, 67, 70], [51, 58, 63, 67], [50, 57, 62, 66]]  # D(hij) Gm Eb D

GROOVE = [(7.0, 12.4, 0.55), (12.65, 21.5, 1.0), (26.4, 30.8, 0.9), (31.0, 36.9, 0.8), (41.0, 47.2, 1.0)]


def groove_gain(t):
    for a, b, g in GROOVE:
        if a <= t < b:
            return g
    return 0.0


# intro: pad + riser into the medallion lock
place(pad([50, 57, 62, 66, 69], 3.4, bright=0.6, att=1.6), 0.0, 0.9, rev=0.6)
place(noise_riser(1.9), 0.15, 0.55, rev=0.3)
place(sub_boom(1.0), 2.05, 0.9, rev=0.05)

# chord bed per bar (skips the breakdown and the end)
for b in range(int(DUR / BAR) + 1):
    t0 = 2.05 + b * BAR
    if t0 >= 47.0 or 37.05 <= t0 < 40.85:
        continue
    ch = chords[b % 4]
    place(pad(ch, BAR + 0.8, bright=0.75, att=0.5, rel=1.0), t0, 0.5, rev=0.55)
    g = groove_gain(t0)
    if g > 0.5:
        root = ch[0] - 12
        for off, n in ((0, root), (1.5 * BEAT, root), (2.5 * BEAT, root + 7), (3 * BEAT, root + 12)):
            place(bass(n, 0.7), t0 + off, 0.8 * g, rev=0.02)

# drums per eighth (grid anchored to the lock at 2.05)
k = 0
while True:
    t0 = 2.05 + k * E8
    if t0 >= DUR:
        break
    e = k % 8; g = groove_gain(t0)
    if g > 0:
        if e in (0, 3, 5):
            place(doum(1.0 if e == 0 else 0.7), t0, 0.8 * g, rev=0.1)
        if e in (2, 6) and g > 0.7:
            place(clap(), t0, 0.55 * g, pan=rng.uniform(-0.2, 0.2), rev=0.4)
        if e in (1, 4, 7):
            place(tak(0.7), t0, 0.45 * g, pan=0.35, rev=0.12)
        place(shaker(1.0 if e % 2 else 0.6), t0 + 0.004, 0.35 * g, pan=-0.4, rev=0.05)
    k += 1

# oud riffs
riff = [(0, D + 12), (1, Eb + 12), (2, Fs + 12), (3, G + 12), (4, A + 12), (6, G + 12), (7, Fs + 12),
        (8, Eb + 12), (9, Fs + 12), (10, Eb + 12), (11, D + 12), (12, Cn), (14, D + 12)]
riff2 = [(0, A + 12), (1, Bb + 12), (2, A + 12), (3, G + 12), (4, Fs + 12), (6, G + 12), (7, A + 12),
         (8, Fs + 12), (9, Eb + 12), (10, D + 12), (12, Eb + 12), (13, Fs + 12), (14, D + 12)]
for s0, s1, pat, g in ((7.0, 12.4, riff, 0.4), (21.8, 24.5, riff2, 0.35), (26.4, 30.8, riff, 0.45), (41.0, 46.4, riff2, 0.45)):
    t = s0
    while t < s1 - 0.01:
        for e, n in pat:
            tn = t + e * E8
            if tn < s1:
                place(pluck(n, 1.2, bright=0.6), tn, g, pan=0.25, rev=0.35)
                if e in (0, 8):
                    place(pluck(n - 12, 1.4, bright=0.4), tn, g * 0.6, pan=-0.2, rev=0.3)
        t += 2 * BAR

# sparse plucks in the opening line
for i, tn in enumerate((2.05, 3.4, 4.3, 5.4)):
    place(pluck([D + 24, A + 12, Fs + 12, D + 12][i], 2.4, bright=0.8), tn, 0.5, pan=(-0.3 if i % 2 else 0.3), rev=0.7)

# roles: a bright pluck on each word
for i, tn in enumerate((12.8, 15.0, 17.7, 18.5, 19.5)):
    place(pluck([D + 12, Fs + 12, G + 12, A + 12, D + 24][i], 1.4, bright=0.85), tn, 0.65, pan=(-0.35 if i % 2 else 0.35), rev=0.5)

# heritage → 2040: airy pad, string swell into the hit
place(pad([62, 69, 74, 78], 3.0, bright=1.3, att=0.6, rel=1.2), 21.75, 0.45, rev=0.8)
place(strings([50, 57, 62, 66, 69], 2.0), 24.25, 1.1, rev=0.6)
place(noise_riser(1.7), 24.5, 0.55, rev=0.3)
place(sub_boom(0.9), 26.2, 0.85, rev=0.05)
place(pad([38, 50, 57, 62, 66, 69], 4.4, bright=1.1, att=0.05, rel=2.0), 26.2, 0.6, rev=0.6)

# pillars: sub + rising pluck per pillar, swell into the arch
for i, tn in enumerate((31.0, 32.5, 34.4)):
    place(sub_boom(0.55), tn - 0.05, 0.6, rev=0.05)
    place(pluck([A + 12, Cn + 12, D + 24][i], 1.8, bright=0.8), tn, 0.6, rev=0.5)
place(strings([62, 66, 69, 74], 1.4), 34.5, 0.7, rev=0.6)

# breakdown (petals): airy pad + bells
place(pad([62, 69, 74, 78, 81], 4.2, bright=1.4, att=0.5, rel=1.6), 37.05, 0.55, rev=0.9)
for i, tn in enumerate(np.arange(37.3, 40.6, BEAT)):
    place(pluck([D + 24, A + 24, Fs + 24, A + 12, D + 24][i % 5], 1.6, bright=1.0), tn, 0.28, pan=rng.uniform(-0.5, 0.5), rev=0.85)
place(strings([50, 57, 62, 66, 69], 2.6), 38.3, 1.0, rev=0.6)
for kk in range(24):  # snare-ish roll into the finale
    tr = 39.55 + 1.3 * (1 - (1 - kk / 24) ** 1.6)
    place(tak(0.35 + 0.6 * kk / 24), tr, 0.45, pan=rng.uniform(-0.3, 0.3), rev=0.2)
place(noise_riser(1.4), 39.45, 0.7, rev=0.3)

# finale: big hit + held chord, last pluck rings out
place(sub_boom(1.15), 40.85, 0.95, rev=0.05)
place(pad([38, 50, 57, 62, 66, 69, 74], 8.6, bright=1.2, att=0.05, rel=3.4), 40.85, 0.85, rev=0.7)
place(strings([62, 66, 69, 74], 6.0), 41.0, 0.5, rev=0.6)
place(pluck(D + 24, 3.4, bright=0.9), 47.2, 0.8, rev=0.9)
place(pluck(A + 12, 3.4, bright=0.9), 47.25, 0.6, rev=0.9)
place(pluck(D + 12, 3.4, bright=0.9), 47.3, 0.6, rev=0.9)


# ---------------------------------------------------------------- SFX
def load(path, ch=1):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", str(ch), "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype="<f4").astype(np.float64).reshape(-1, ch) if ch > 1 else np.frombuffer(raw, dtype="<f4").astype(np.float64)


SFX = [
    ("whoosh-reverse", 1.25, 0.5), ("impact", 2.05, 0.8), ("reveal", 2.3, 0.4), ("glass", 2.6, 0.3),
    ("whoosh", 6.6, 0.6), ("swoosh", 6.95, 0.4), ("pop-soft", 7.1, 0.25),
    ("sweep", 12.35, 0.5), ("whoosh", 12.5, 0.5),
    ("swoosh", 14.6, 0.35), ("swoosh", 17.3, 0.35), ("swoosh", 18.1, 0.3), ("swoosh", 19.1, 0.3),
    ("whoosh-slow", 20.1, 0.45), ("reveal", 20.35, 0.4),
    ("whoosh-low", 21.5, 0.6), ("sub", 21.85, 0.45), ("pop-soft", 23.1, 0.3),
    ("whoosh-slow", 24.6, 0.45), ("impact-soft", 26.2, 0.7), ("reveal", 26.45, 0.45), ("shimmer", 0, 0),
    ("swoosh", 28.75, 0.35),
    ("whoosh", 30.7, 0.5), ("impact-soft", 31.0, 0.5), ("impact-soft", 32.5, 0.5), ("impact-soft", 34.4, 0.5),
    ("swell", 34.7, 0.35), ("ding", 35.95, 0.3),
    ("whoosh-slow", 36.8, 0.45), ("glass", 37.2, 0.25),
    ("whoosh", 40.5, 0.7), ("impact", 40.85, 0.85), ("reveal", 41.1, 0.5), ("success", 43.0, 0.3), ("ding", 45.8, 0.25),
]
cache = {}
for name, t0, g in SFX:
    if g <= 0:
        continue
    if name not in cache:
        cache[name] = load(f"{sys.argv[1]}/{name}.mp3")
    place(cache[name], t0, g * 1.2, pan=rng.uniform(-0.25, 0.25), rev=0.15)


# ---------------------------------------------------------------- reverb + music master
def reverb(x, d=2.8):
    t = tt(d)
    irL = lowpass(rng.standard_normal(len(t)) * np.exp(-t * 2.4), 6500)
    irR = lowpass(rng.standard_normal(len(t)) * np.exp(-t * 2.4), 6500)
    pre = int(0.025 * SR); n = len(x) + len(t) + pre
    nfft = 1 << int(np.ceil(np.log2(n)))
    X = np.fft.rfft(x, nfft)
    yl = np.fft.irfft(X * np.fft.rfft(np.r_[np.zeros(pre), irL], nfft), nfft)[: len(x)]
    yr = np.fft.irfft(X * np.fft.rfft(np.r_[np.zeros(pre), irR], nfft), nfft)[: len(x)]
    return yl * 0.06, yr * 0.06


rl, rr = reverb(SEND)
L += rl; R += rr
tf = tt(DUR)
fade = np.minimum(1, tf / 0.05) * np.clip((DUR - tf) / 1.6, 0, 1) ** 1.3
L *= fade; R *= fade
peak = max(np.abs(L).max(), np.abs(R).max())
L = np.tanh(L / peak * 1.5) * 0.8; R = np.tanh(R / peak * 1.5) * 0.8

# ---------------------------------------------------------------- narration + ducking
VO_AT = 2.0
vo_src = load(sys.argv[2])
vo = np.zeros(N)
i0 = int(VO_AT * SR)
vo[i0:i0 + len(vo_src)] = vo_src[: N - i0]
X = np.fft.rfft(vo); f = np.fft.rfftfreq(len(vo), 1 / SR)
X *= 1 + 0.2 / (1 + (f / 160) ** 2)            # a little chest
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
sm = np.zeros(N); prev = 0.0
step = 48
for j in range(0, N, step):
    x = env[j]
    prev = att * prev + (1 - att) * x if x > prev else rel * prev + (1 - rel) * x
    sm[j:j + step] = prev
duck = 1 - 0.58 * np.clip(sm * 3.0, 0, 1)

outL = L * duck * 0.62 + vo_l * 0.92
outR = R * duck * 0.62 + vo_r * 0.92
pk = max(np.abs(outL).max(), np.abs(outR).max())
outL /= pk / 0.95; outR /= pk / 0.95
pcm = (np.stack([outL, outR], 1) * 32767).astype("<i2")
with wave.open(sys.argv[3], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("ok", DUR, "s")
