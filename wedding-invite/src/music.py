"""Calm score for the wedding invitation film (52s, 60 BPM, D Nahawand).

Pure numpy synthesis: warm pads, a qanun-like plucked arpeggio, a breathy
ney melody under the names, soft bells on every reveal, and a long hall reverb.
Usage: python3 music.py out.wav
"""
import sys, wave
import numpy as np

SR = 48000
DUR = 52.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N); SEND = np.zeros(N)
rng = np.random.default_rng(11)


def tt(d):
    return np.arange(int(d * SR)) / SR


def place(sig, t, gain=1.0, pan=0.0, rev=0.35):
    i = int(t * SR)
    if i >= N:
        return
    s = sig[: N - i] * gain
    l, r = np.sqrt(0.5 * (1 - pan)), np.sqrt(0.5 * (1 + pan))
    L[i:i + len(s)] += s * l * 1.414
    R[i:i + len(s)] += s * r * 1.414
    SEND[i:i + len(s)] += s * rev


def hz(n):  # midi -> Hz
    return 440.0 * 2 ** ((n - 69) / 12)


def lowpass(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / fc) ** 4)
    return np.fft.irfft(X, len(x))


# ---------------------------------------------------------------- instruments
def pad(notes, d, bright=1.0):
    t = tt(d); out = np.zeros(len(t))
    for n in notes:
        f = hz(n)
        for det in (-0.07, 0.0, 0.08):
            ff = f * 2 ** (det / 12)
            ph = rng.uniform(0, 6.28)
            for k, a in ((1, 1.0), (2, 0.35 * bright), (3, 0.16 * bright), (4, 0.06 * bright)):
                out += a * np.sin(2 * np.pi * ff * k * t + ph * k) * (1 + 0.15 * np.sin(2 * np.pi * 0.21 * t + k))
    att, rel = 1.6, 2.2
    env = np.minimum(1, t / att) * np.minimum(1, (d - t) / rel).clip(0)
    return out * env / (len(notes) * 3.2)


def pluck_fast(n, d=3.0, bright=0.5):
    """Vectorised Karplus-Strong (block copy) — much faster than the loop."""
    f = hz(n); P = max(2, int(round(SR / f))); total = int(d * SR)
    y = np.zeros(total + P + 1)
    y[:P] = lowpass(rng.uniform(-1, 1, P * 8), 2200 + 4000 * bright)[:P]
    pos = P
    while pos < total + P:
        m = min(P, total + P - pos)
        prev = y[pos - P: pos - P + m + 1]
        y[pos:pos + m] = 0.4985 * (prev[:m] + prev[1:m + 1])
        pos += m
    out = y[P:P + total]
    t = tt(d)[: len(out)]
    body = np.sin(2 * np.pi * f * t) * np.exp(-t * 2.2) * 0.3
    att = np.minimum(1, t / 0.004)
    return (out + body) * att * np.exp(-t * 1.0) * 0.5


def bell(n, d=5.0):
    t = tt(d); f = hz(n); out = np.zeros(len(t))
    for ratio, a, dec in ((1, 1, 0.9), (2.76, 0.45, 1.6), (5.4, 0.25, 2.6), (8.93, 0.12, 4.0), (0.5, 0.3, 0.6)):
        out += a * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t * dec)
    return out * np.minimum(1, t / 0.002) * 0.22


def ney(seq, gain=0.18):
    """seq: list of (start, dur, midi). Breathy sine with vibrato + glide."""
    for st, d, n in seq:
        t = tt(d); f = hz(n)
        vib = 1 + 0.006 * np.sin(2 * np.pi * 5.2 * t) * np.minimum(1, t / 0.6)
        glide = 1 - 0.015 * np.exp(-t * 9)
        ph = 2 * np.pi * np.cumsum(f * vib * glide) / SR
        tone = np.sin(ph) + 0.18 * np.sin(2 * ph) + 0.06 * np.sin(3 * ph)
        breath = lowpass(rng.standard_normal(len(t)), 2200) * 0.08
        env = np.minimum(1, t / 0.35) * np.minimum(1, (d - t) / 0.6).clip(0)
        place((tone + breath) * env * gain, st, pan=-0.15, rev=0.7)


def swell(d=2.5):
    t = tt(d); x = lowpass(rng.standard_normal(len(t)), 3500)
    env = (t / d) ** 2.5 * np.minimum(1, (d - t) / 0.08).clip(0)
    return x * env * 0.1


def sub_bloom(d=4.0):
    t = tt(d); return np.sin(2 * np.pi * hz(38) * t) * np.minimum(1, t / 0.4) * np.exp(-t * 0.9) * 0.35


# ---------------------------------------------------------------- arrangement
# D Nahawand (D harmonic minor). Bar = 4 s.
D, BAR = 50, 4.0
chords = {  # (pad voicing, arpeggio pool)
    "Dm": ([50, 57, 62, 65], [62, 65, 69, 74, 69, 65]),
    "Bb": ([46, 53, 58, 62], [58, 62, 65, 70, 65, 62]),
    "Gm": ([43, 55, 58, 62], [55, 58, 62, 67, 62, 58]),
    "A":  ([45, 52, 57, 61], [57, 61, 64, 69, 64, 61]),
    "F":  ([41, 53, 57, 60], [57, 60, 65, 69, 65, 60]),
    "C":  ([48, 55, 60, 64], [60, 64, 67, 72, 67, 64]),
}
prog = ["Dm", "Dm", "Bb", "Gm", "F", "C", "Dm", "A", "Bb", "Gm", "A", "Dm", "Dm"]

for b, name in enumerate(prog):
    st = b * BAR
    voicing, pool = chords[name]
    place(pad(voicing, BAR + 2.4, bright=0.6 + 0.4 * (b >= 5)), st, gain=0.55, rev=0.5)
    place(np.sin(2 * np.pi * hz(voicing[0] - 12) * tt(BAR + 1)) * np.minimum(1, tt(BAR + 1) / 1.0)
          * np.minimum(1, (BAR + 1 - tt(BAR + 1)) / 1.2).clip(0) * 0.16, st, rev=0.2)
    if b == 0:
        continue  # first bar: pad only, the film is drawing its star
    density = 1 if b < 3 else 2
    step = 1.0 / density
    for k in range(int(BAR / step)):
        if b == len(prog) - 1 and k * step > 2.5:
            break
        n = pool[(k + b) % len(pool)]
        human = rng.uniform(-0.012, 0.012)
        place(pluck_fast(n, 3.0, bright=0.45), st + k * step + human,
              gain=0.33 * (1.0 if k % density == 0 else 0.6), pan=0.35 * np.sin(k * 1.3), rev=0.45)

# ney melody under the names (bars 5-7) and the closing (bar 11)
ney([(20.5, 1.6, 69), (22.1, 0.9, 70), (23.0, 2.6, 69), (25.8, 0.9, 67), (26.7, 1.0, 65), (27.7, 2.8, 64),
     (30.6, 1.2, 65), (31.8, 1.0, 64), (32.8, 3.0, 62)], gain=0.15)
ney([(44.6, 1.4, 69), (46.0, 1.0, 67), (47.0, 1.0, 65), (48.0, 1.0, 64), (49.0, 3.0, 62)], gain=0.13)

# bells on reveals (synced to the film)
for t0, n in ((0.6, 86), (3.2, 81), (6.5, 86), (8.0, 81), (9.5, 77), (13.5, 81), (15.5, 86), (17.6, 77),
              (23.2, 86), (25.1, 81), (27.0, 89), (31.5, 81), (32.6, 86), (35.2, 81), (41.0, 89), (42.6, 81),
              (45.5, 86), (48.3, 81)):
    place(bell(n), t0, gain=0.55, pan=rng.uniform(-0.5, 0.5), rev=0.8)

for t0 in (6.0, 13.0, 21.0, 31.0, 39.0, 45.0):  # soft swells into each scene
    place(swell(2.2), t0 - 2.2, gain=0.35, rev=0.6)
for t0 in (0.0, 21.0, 45.0):
    place(sub_bloom(), t0 + 0.4, rev=0.1)

# ---------------------------------------------------------------- hall reverb
def reverb(x, d=3.4):
    t = tt(d)
    irL = rng.standard_normal(len(t)) * np.exp(-t * 2.1); irR = rng.standard_normal(len(t)) * np.exp(-t * 2.1)
    irL = lowpass(irL, 6000); irR = lowpass(irR, 6000)
    pre = int(0.03 * SR)
    n = len(x) + len(t) + pre
    nfft = 1 << int(np.ceil(np.log2(n)))
    X = np.fft.rfft(x, nfft)
    yl = np.fft.irfft(X * np.fft.rfft(np.r_[np.zeros(pre), irL], nfft), nfft)[: len(x)]
    yr = np.fft.irfft(X * np.fft.rfft(np.r_[np.zeros(pre), irR], nfft), nfft)[: len(x)]
    return yl * 0.05, yr * 0.05


rl, rr = reverb(SEND)
L += rl; R += rr
fade = np.ones(N); tf = tt(DUR)
fade *= np.minimum(1, tf / 0.3)
fade *= np.clip((DUR - tf) / 3.5, 0, 1) ** 1.5
L *= fade; R *= fade
peak = max(np.abs(L).max(), np.abs(R).max())
L = np.tanh(L / peak * 1.05) * 0.72; R = np.tanh(R / peak * 1.05) * 0.72
pcm = (np.stack([L, R], 1) * 32767).astype("<i2")
with wave.open(sys.argv[1] if len(sys.argv) > 1 else "music.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("ok", DUR, "s")
