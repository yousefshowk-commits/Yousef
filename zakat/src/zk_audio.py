"""Score, sound design and final mix for «الزكاة» (15s).

Pure numpy: a D-Hijaz pad, oud-like Karplus-Strong plucks, a soft frame-drum groove,
synthesised coin clinks / ticks / shimmers on every visual event, CC0 SFX on the cuts,
and the ElevenLabs narration placed at 0.4s with the music side-chain ducked under it.
Usage: python3 zk_audio.py <sfx_dir> narration.mp3 out.wav
"""
import sys, wave, subprocess
import numpy as np

SR = 48000
DUR = 15.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N); SEND = np.zeros(N)
VO = 0.4
rng = np.random.default_rng(7)
BEAT = 60 / 96


def tt(d):
    return np.arange(int(d * SR)) / SR


def hz(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def place(sig, t, gain=1.0, pan=0.0, rev=0.2, bus=None):
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


def load(path, ch=1):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", str(ch), "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    a = np.frombuffer(raw, dtype="<f4").astype(np.float64)
    return a.reshape(-1, ch) if ch > 1 else a


# ------------------------------------------------------------------ instruments
def pad(notes, d, g=1.0):
    t = tt(d); out = np.zeros(len(t))
    for n in notes:
        for det in (-0.07, 0.0, 0.08):
            ph = 2 * np.pi * hz(n + det) * t + rng.random() * 6
            out += (2 * ((ph / (2 * np.pi)) % 1) - 1) * 0.33
    out = filt(out, hi=1400)
    env = np.minimum(1, t / 0.9) * np.minimum(1, (d - t) / 1.2)
    return out * env * g / len(notes)


def pluck(n, d=1.4, g=1.0, bright=0.5):
    f = hz(n); p = int(SR / f)
    buf = rng.uniform(-1, 1, p) * 0.9
    buf = filt(np.concatenate([buf] * 3), hi=2000 + bright * 4000)[:p]
    out = np.zeros(int(d * SR))
    for i in range(len(out)):
        out[i] = buf[i % p]
        buf[i % p] = 0.5 * (buf[i % p] + buf[(i + 1) % p]) * 0.996
    t = tt(d)
    return out * np.exp(-t * 2.2) * g


def doum(g=1.0):
    t = tt(0.5); f = 60 + 80 * np.exp(-t * 26)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    return np.tanh(body * 1.5) * g


def tak(g=1.0):
    t = tt(0.16)
    return filt(rng.standard_normal(len(t)), lo=1500, hi=7000) * np.exp(-t * 45) * g


def sub(g=1.0, d=1.6):
    t = tt(d); f = 34 + 70 * np.exp(-t * 5)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2) * g


def clink(g=1.0, pitch=1.0, d=0.9):
    t = tt(d); out = np.zeros(len(t))
    for fr, a, k in [(2093, 1, 9), (3373, 0.7, 12), (4870, 0.55, 15), (6720, 0.35, 20), (8930, 0.2, 26)]:
        out += a * np.sin(2 * np.pi * fr * pitch * t + rng.random() * 6) * np.exp(-t * k)
    out += filt(rng.standard_normal(len(t)), lo=4000) * np.exp(-t * 90) * 0.5
    return out * g * 0.35


def shimmer(d=1.2, g=1.0):
    t = tt(d); out = np.zeros(len(t))
    for i in range(14):
        fr = hz(86 + [0, 3, 7, 10, 12, 15, 19][i % 7] + 12 * (i // 7))
        on = i * d / 18
        out += np.sin(2 * np.pi * fr * t) * np.exp(-np.maximum(0, t - on) * 7) * (t > on) * 0.12
    return out * g * np.minimum(1, (d - t) / 0.2)


def tick(g=1.0):
    t = tt(0.05)
    return np.sin(2 * np.pi * 3100 * t) * np.exp(-t * 140) * g


def riser(d, g=1.0):
    t = tt(d); k = t / d
    n = filt(rng.standard_normal(len(t)), lo=800, hi=9000) * k ** 2 * 0.4
    tone = np.sin(2 * np.pi * np.cumsum(200 + 900 * k ** 2) / SR) * k ** 3 * 0.2
    return (n + tone) * g


# ------------------------------------------------------------------ score
# D Hijaz: D Eb F# G A Bb C
D3, Eb3, Fs3, G3, A3, Bb3, C4 = 50, 51, 54, 55, 57, 58, 60
place(pad([D3 - 12, D3, A3, Fs3 + 12], 4.4, 0.55), 0.3, rev=0.4)
place(pad([G3 - 12, G3, Bb3, D3 + 12], 4.2, 0.5), 4.1, rev=0.4)
place(pad([Eb3 - 12, G3, Bb3, Eb3 + 12], 3.4, 0.5), 8.2, rev=0.4)
place(pad([D3 - 12, D3, Fs3, A3, D3 + 24], 3.6, 0.6), 11.6, rev=0.5)

# oud motif
motif = [(0, 62), (0.5, 63), (1, 66), (1.5, 67), (2, 69), (2.75, 67), (3, 66), (3.5, 63)]
for start in (2.0, 6.1, 9.2):
    for b, n in motif:
        place(pluck(n, g=0.22, bright=0.4), start + b * BEAT, pan=0.25, rev=0.3)
for b, n in [(0, 74), (0.5, 73), (1, 70), (2, 69), (3, 66), (4, 62)]:
    place(pluck(n, d=2.2, g=0.24, bright=0.7), 12.05 + b * BEAT * 0.75, pan=-0.2, rev=0.5)

# frame drum groove 2.0 → 11.9 (maqsum-ish, light so it sits under the voice)
t0 = 2.0
while t0 < 11.6:
    place(doum(0.45), t0, rev=0.1); place(tak(0.2), t0 + BEAT, pan=0.3)
    place(tak(0.14), t0 + BEAT * 1.5, pan=-0.3); place(doum(0.3), t0 + BEAT * 2, rev=0.1)
    place(tak(0.2), t0 + BEAT * 3, pan=0.3)
    t0 += BEAT * 4

# hits on every cut
for c, g in [(0.38, 1.0), (2.0, 0.6), (4.2, 0.7), (6.1, 0.55), (9.2, 0.6), (12.0, 0.9)]:
    place(sub(g), c, rev=0.05)

# ------------------------------------------------------------------ sound design
sfx_dir = sys.argv[1]
def sfx(name, t, g=1.0, pan=0.0):
    place(load(f"{sfx_dir}/{name}.mp3"), t, g, pan, rev=0.15)

sfx("whoosh-reverse", 0.02, 0.5)                 # coin falling
place(clink(1.4, 1.0, 1.4), 0.38, rev=0.5)        # coin lands
place(clink(0.8, 1.5, 1.0), 0.40, pan=0.3, rev=0.5)
sfx("impact-soft", 0.38, 0.6)
place(shimmer(1.4, 0.7), 0.5, rev=0.6)
sfx("reveal", 0.92, 0.45)                         # الزكاة title
for c in (2.0, 4.2, 6.1, 9.2, 12.0):              # gold slash
    sfx("whoosh", c - 0.16, 0.45, pan=-0.3)
for k in range(5):                                # arches rise
    place(tak(0.25), 2.08 + k * 0.08, pan=(k - 2) * 0.3)
sfx("swell", 2.4, 0.35); place(shimmer(1.0, 0.7), 2.62, rev=0.6)  # third pillar glows
sfx("whoosh-low", 3.9, 0.5)                       # zoom through
for i in range(14):                                # coin grid pops
    place(clink(0.18, 1.6 + rng.random() * 0.6, 0.3), 4.45 + i * 0.03, pan=rng.uniform(-0.6, 0.6), rev=0.2)
for i in range(12):                                # counter ticks
    place(tick(0.2), 4.4 + i * 0.062, pan=0.2)
place(clink(1.1, 1.25, 1.2), 5.15, rev=0.5); sfx("ding", 5.18, 0.35)
sfx("pop-soft", 5.45, 0.4)
sfx("swoosh", 6.5, 0.4, pan=0.4)                  # card 1
for i in range(3):
    place(clink(0.6, 0.62, 0.8), 6.72 + i * 0.17, pan=0.4, rev=0.3)  # gold bars (heavier)
sfx("glass", 7.38, 0.5, pan=0.4)
sfx("swoosh", 7.45, 0.4, pan=-0.4)                # card 2
for i in range(12):
    place(tick(0.28), 7.7 + i * (1.0 / 12), pan=-0.4)
sfx("glass", 8.72, 0.5, pan=-0.4)
sfx("sweep", 9.5, 0.45)                           # purification sweep
for at in (9.75, 9.95, 10.1, 10.25):
    place(shimmer(0.6, 0.35), at, pan=rng.uniform(-0.5, 0.5), rev=0.6)
sfx("pop", 10.5, 0.35, pan=0.5)                   # house pops
for i in range(8):                                 # coins arrive
    place(clink(0.5, 1.1 + i * 0.04, 0.6), 10.8 + i * 0.085 + 0.5, pan=0.5, rev=0.4)
sfx("success", 11.45, 0.4, pan=0.5)
sfx("riser", 10.9, 0.25)
sfx("sub-drop", 12.0, 0.6)
place(shimmer(2.0, 0.6), 12.1, rev=0.7)
place(clink(0.7, 0.9, 2.0), 13.22, rev=0.8)
place(shimmer(1.5, 0.5), 14.0, rev=0.8)

# reverb (noise IR) on the send
ir_t = tt(1.6); ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 3.5); ir = filt(ir, hi=6000)
nfft = 1 << int(np.ceil(np.log2(N + len(ir))))
rev = np.fft.irfft(np.fft.rfft(SEND, nfft) * np.fft.rfft(ir, nfft), nfft)[:N]
rev /= max(np.abs(rev).max(), 1e-9)
music_l = L + rev * 0.12 * np.abs(L).max(); music_r = R + np.roll(rev, 300) * 0.12 * np.abs(R).max()

# ------------------------------------------------------------------ voice + duck
vo_src = load(sys.argv[2])
vo = np.zeros(N); i0 = int(VO * SR)
vo[i0:i0 + len(vo_src)] += vo_src[: N - i0]
X = np.fft.rfft(vo); f = np.fft.rfftfreq(len(vo), 1 / SR)
X *= 1 + 0.2 / (1 + (f / 170) ** 2) + 0.15 / (1 + (np.maximum(f, 1) / 4500) ** -4)   # body + presence
vo = np.fft.irfft(X, len(vo))
vo /= max(np.abs(vo).max(), 1e-9)

env = np.convolve(np.abs(vo), np.ones(int(0.03 * SR)) / int(0.03 * SR), mode="same")
env /= env.max()
blk = 64; e = env[::blk]; out = np.zeros(len(e)); s = 0.0
aa, ar = 1 - np.exp(-blk / (0.02 * SR)), 1 - np.exp(-blk / (0.3 * SR))
for k, v in enumerate(e):
    s += (v - s) * (aa if v > s else ar); out[k] = s
duck = 1 - 0.6 * np.clip(np.repeat(out, blk)[:N] * 3, 0, 1)

mpk = max(np.abs(music_l).max(), np.abs(music_r).max())
Lm = music_l / mpk * duck * 0.62 + vo * 1.0
Rm = music_r / mpk * duck * 0.62 + vo * 1.0
fade = np.minimum(1, (DUR - tt(DUR)) / 0.6)
Lm *= fade; Rm *= fade
pk = max(np.abs(Lm).max(), np.abs(Rm).max())
Lm = np.tanh(Lm / pk * 1.2) * 0.92; Rm = np.tanh(Rm / pk * 1.2) * 0.92
pcm = (np.stack([Lm, Rm], 1) * 32767).astype("<i2")
with wave.open(sys.argv[3], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("ok")
