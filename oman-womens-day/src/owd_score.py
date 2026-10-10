"""Score for «يوم المرأة العُمانية» (40s, 100 BPM, D Hijaz).

Pure numpy: a khaleeji-flavoured groove (doum / tak / layered hand-claps),
an oud-like plucked riff (Karplus-Strong), warm pads, a string swell into the
finale, and the film's SFX placed on every cut. Usage:
  python3 owd_score.py <sfx_dir> out.wav
"""
import sys, wave, subprocess
import numpy as np

SR = 48000
DUR = 40.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N); SEND = np.zeros(N)
rng = np.random.default_rng(17)
BEAT = 0.6; BAR = 2.4; E8 = BEAT / 2


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
# D Hijaz: D Eb F# G A Bb C  (midi D4 = 62)
D, Eb, Fs, G, A, Bb, Cn = 62, 63, 66, 67, 69, 70, 72
chords = [[50, 57, 62, 66], [55, 62, 67, 70], [51, 58, 63, 67], [50, 57, 62, 66]]  # D(hij)  Gm  Eb  D

# intro pad (0–2.4) + riser into the hit
place(pad([50, 57, 62, 66, 69], 3.2, bright=0.6, att=1.5), 0.0, 0.9, rev=0.6)
place(noise_riser(2.3), 0.1, 0.6, rev=0.3)

GROOVE_ON = [(2.4, 19.2), (21.6, 28.8), (33.6, 38.4)]
HALF = [(19.2, 21.6), (28.8, 33.6)]


def in_any(t, spans):
    return any(a <= t < b for a, b in spans)


# drums per eighth note
for k in range(int(DUR / E8)):
    t0 = k * E8
    e = k % 8
    if in_any(t0, GROOVE_ON):
        if e in (0, 3, 5):
            place(doum(1.0 if e == 0 else 0.75), t0, 0.9, rev=0.08)
        if e in (2, 6):
            place(clap(), t0, 0.75, pan=rng.uniform(-0.2, 0.2), rev=0.35)
        if e in (1, 4, 7):
            place(tak(0.8), t0, 0.6, pan=0.35, rev=0.1)
        place(shaker(1.0 if e % 2 else 0.6), t0 + 0.004, 0.5, pan=-0.4, rev=0.05)
        if e % 2 == 1:
            place(shaker(0.5), t0 + E8 / 2, 0.4, pan=-0.4, rev=0.05)
    elif in_any(t0, HALF):
        if e == 0:
            place(doum(0.8), t0, 0.8, rev=0.15)
        if e == 4:
            place(clap(0.7), t0, 0.6, rev=0.5)

# bass + chords per bar
for b in range(int(DUR / BAR)):
    t0 = b * BAR
    if t0 < 2.4 or t0 >= 38.4:
        continue
    ch = chords[b % 4]
    place(pad(ch, BAR + 0.6, bright=0.8, att=0.3, rel=0.8), t0, 0.55, rev=0.5)
    if in_any(t0, GROOVE_ON):
        root = ch[0] - 12
        for off, n in ((0, root), (0.9, root), (1.5, root + 7), (1.8, root + 12)):
            place(bass(n, 0.6), t0 + off, 0.9, rev=0.02)

# oud riff (16 eighths = 2 bars), D Hijaz
riff = [(0, D + 12), (1, Eb + 12), (2, Fs + 12), (3, G + 12), (4, A + 12), (6, G + 12), (7, Fs + 12),
        (8, Eb + 12), (9, Fs + 12), (10, Eb + 12), (11, D + 12), (12, Cn), (14, D + 12)]
riff2 = [(0, A + 12), (1, Bb + 12), (2, A + 12), (3, G + 12), (4, Fs + 12), (6, G + 12), (7, A + 12),
         (8, Fs + 12), (9, Eb + 12), (10, D + 12), (12, Eb + 12), (13, Fs + 12), (14, D + 12)]
for s0, s1, pat in ((4.8, 9.6, riff), (14.4, 19.2, riff), (21.6, 24.0, riff2), (24.0, 28.8, riff2), (33.6, 38.4, riff)):
    t = s0
    while t < s1 - 0.01:
        for e, n in pat:
            tn = t + e * E8
            if tn < s1:
                place(pluck(n, 1.2, bright=0.6), tn, 0.55, pan=0.25, rev=0.3)
                if e in (0, 8):
                    place(pluck(n - 12, 1.4, bright=0.4), tn, 0.35, pan=-0.2, rev=0.3)
        t += 2 * BAR

# roles section: rising plucked notes on every beat
for i in range(8):
    n = [D, Eb, Fs, G, A, Bb, Cn, D + 12][i] + 12
    place(pluck(n, 0.9, bright=0.8), 9.6 + i * BEAT, 0.7, pan=(-0.4 if i % 2 else 0.4), rev=0.45)

# S5 breakdown: airy pad + plucked bells
place(pad([62, 69, 74, 78], 4.8, bright=1.3, att=0.6, rel=1.5), 19.2, 0.5, rev=0.8)
# S7 build: strings swell and snare roll into the finale
place(strings([50, 57, 62, 66, 69], 4.8), 28.8, 1.2, rev=0.6)
for k in range(32):
    tr = 31.2 + 2.4 * (1 - (1 - k / 32) ** 1.6)
    place(tak(0.4 + 0.6 * k / 32), tr, 0.55, pan=rng.uniform(-0.3, 0.3), rev=0.2)
place(noise_riser(2.4), 31.2, 0.8, rev=0.3)

# finale: big hit + held chord
place(sub_boom(1.1), 33.6, 0.9, rev=0.05)
place(pad([38, 50, 57, 62, 66, 69, 74], 6.4, bright=1.2, att=0.05, rel=3.0), 33.6, 0.9, rev=0.7)
place(strings([62, 66, 69, 74], 1.0), 32.6, 0.8, rev=0.5)
place(sub_boom(0.9), 2.4, 0.9, rev=0.05)
place(pluck(D + 24, 3.0, bright=0.9), 38.4, 0.8, rev=0.9)
place(pluck(A + 12, 3.0, bright=0.9), 38.45, 0.6, rev=0.9)
place(pluck(D + 12, 3.0, bright=0.9), 38.5, 0.6, rev=0.9)


# ---------------------------------------------------------------- SFX from the library
def load(name):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f"{sys.argv[1]}/{name}.mp3", "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype="<f4").astype(np.float64)


SFX = [
    ("impact", 2.4, 0.9), ("sub-drop", 2.4, 0.8), ("reveal", 2.75, 0.4), ("shutter", 3.3, 0.3),
    ("whoosh", 4.45, 0.7), ("swoosh", 4.75, 0.5), ("pop-soft", 5.05, 0.4), ("pop-soft", 5.45, 0.4), ("swell", 5.4, 0.35),
    ("reveal", 6.15, 0.45), ("tick", 7.3, 0.35),
    ("whoosh-reverse", 8.85, 0.55), ("impact-soft", 9.6, 0.6), ("glass", 13.8, 0.4),
    ("whoosh", 14.05, 0.7), ("sweep", 14.5, 0.45), ("glass", 16.4, 0.35), ("pop", 16.4, 0.3),
    ("whoosh-low", 18.95, 0.6), ("sub", 19.2, 0.6), ("reveal", 20.1, 0.4), ("reveal", 22.3, 0.4),
    ("whoosh-slow", 23.7, 0.5), ("success", 27.4, 0.3), ("swoosh", 27.4, 0.5),
    ("whoosh-low", 28.6, 0.5), ("swoosh", 31.0, 0.45),
    ("whoosh", 33.25, 0.8), ("impact", 33.6, 0.9), ("reveal", 34.1, 0.5), ("ding", 35.6, 0.35), ("success", 36.3, 0.35),
]
for i in range(8):  # roles: a tick on every word
    SFX.append(("snap" if i % 2 else "tap", 9.6 + i * BEAT, 0.45))
for i in range(28):  # mosaic flips
    row, col = divmod(i, 4)
    d = np.hypot(col - 1.5, row - 3)
    SFX.append(("click", 24.1 + d * 0.16 + 0.15, 0.18))
cache = {}
for name, t0, g in SFX:
    if name not in cache:
        cache[name] = load(name)
    place(cache[name], t0, g * 1.3, pan=rng.uniform(-0.25, 0.25), rev=0.15)


# ---------------------------------------------------------------- reverb + master
def reverb(x, d=2.6):
    t = tt(d)
    irL = lowpass(rng.standard_normal(len(t)) * np.exp(-t * 2.6), 6500)
    irR = lowpass(rng.standard_normal(len(t)) * np.exp(-t * 2.6), 6500)
    pre = int(0.025 * SR); n = len(x) + len(t) + pre
    nfft = 1 << int(np.ceil(np.log2(n)))
    X = np.fft.rfft(x, nfft)
    yl = np.fft.irfft(X * np.fft.rfft(np.r_[np.zeros(pre), irL], nfft), nfft)[: len(x)]
    yr = np.fft.irfft(X * np.fft.rfft(np.r_[np.zeros(pre), irR], nfft), nfft)[: len(x)]
    return yl * 0.06, yr * 0.06


rl, rr = reverb(SEND)
L += rl; R += rr
tf = tt(DUR)
fade = np.minimum(1, tf / 0.05) * np.clip((DUR - tf) / 1.4, 0, 1) ** 1.3
L *= fade; R *= fade
peak = max(np.abs(L).max(), np.abs(R).max())
L = np.tanh(L / peak * 1.6) * 0.86; R = np.tanh(R / peak * 1.6) * 0.86
pcm = (np.stack([L, R], 1) * 32767).astype("<i2")
with wave.open(sys.argv[2], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("ok", DUR, "s")
