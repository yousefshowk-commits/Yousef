"""Lay the ElevenLabs narration over the score, line by line, synced to the film's chapters.

Cuts are taken at the pauses between phrases (from Scribe word timestamps), placed on each
chapter's visual beat, and the music is side-chain ducked under the voice.
Usage: python3 owd_vo_mix.py narration.mp3 score.wav out.wav
"""
import sys, wave, subprocess
import numpy as np

SR = 48000


def load(path, ch=2):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", str(ch), "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype="<f4").astype(np.float64).reshape(-1, ch)


# (source start, source end, film time)  — seconds
CUTS = [
    (0.00, 2.28, 2.50),    # في السابعَ عشرَ من أكتوبر            → «١٧» hit
    (2.28, 6.96, 4.95),    # إلى كلِّ امرأةٍ عُمانيّة… تصنعُ الفرق  → chapter 2
    (6.96, 11.68, 9.70),   # هي الأمّ، والمعلِّمة، والطبيبة… القائدة → roles on the beat
    (11.68, 16.48, 14.45), # شريكةٌ في بناء عُمان… من القلاع        → fort
    (16.48, 19.96, 19.55), # حضورُها صوت… وأثرُها باقٍ              → waveform
    (19.96, 23.32, 25.00), # قيمٌ تحملُها… جيلاً بعدَ جيل            → mosaic lockup
    (23.32, 24.76, 29.30), # هي الجذور
    (24.76, 25.96, 31.25), # وهي الأجنحة
    (25.96, 30.72, 34.00), # يومُ المرأة العُمانيّة… كلُّ عامٍ وأنتِ مُلهِمة
]

vo_src = load(sys.argv[1]).mean(axis=1)
music = load(sys.argv[2])
N = len(music)
vo = np.zeros(N)
fade = int(0.025 * SR)
for a, b, t in CUTS:
    seg = vo_src[int(a * SR):int(b * SR)].copy()
    ramp = np.linspace(0, 1, fade)
    seg[:fade] *= ramp; seg[-fade:] *= ramp[::-1]
    i = int(t * SR)
    vo[i:i + len(seg)] += seg[: N - i]

# gentle warmth: a touch of low-shelf body and a short room so the voice sits in the score
X = np.fft.rfft(vo); f = np.fft.rfftfreq(len(vo), 1 / SR)
X *= 1 + 0.25 / (1 + (f / 180) ** 2) - 0.15 / (1 + (f / 9000) ** -4)
vo = np.fft.irfft(X, len(vo))
rng = np.random.default_rng(3)
ir_t = np.arange(int(0.9 * SR)) / SR
ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 6.0)
nfft = 1 << int(np.ceil(np.log2(len(vo) + len(ir))))
room = np.fft.irfft(np.fft.rfft(vo, nfft) * np.fft.rfft(ir, nfft), nfft)[: len(vo)]
vo_l = vo + room * 0.012
vo_r = vo + np.roll(room, 240) * 0.012
vo_peak = max(np.abs(vo_l).max(), 1e-9)
vo_l /= vo_peak; vo_r /= vo_peak

# side-chain duck: smoothed voice envelope (fast attack, slow release)
env = np.abs(vo)
win = int(0.03 * SR)
env = np.convolve(env, np.ones(win) / win, mode="same")
env /= env.max()
sm = np.zeros(N); a_att, a_rel = 1 - np.exp(-1 / (0.02 * SR)), 1 - np.exp(-1 / (0.35 * SR))
# vectorised-ish one-pole follower in blocks
blk = 64
e = env[::blk]; out = np.zeros(len(e)); s = 0.0
aa, ar = 1 - (1 - a_att) ** blk, 1 - (1 - a_rel) ** blk
for k, v in enumerate(e):
    s += (v - s) * (aa if v > s else ar)
    out[k] = s
sm = np.repeat(out, blk)[:N]
duck = 1 - 0.7 * np.clip(sm * 3.0, 0, 1)

L = music[:, 0] * duck * 0.9 + vo_l * 1.4
R = music[:, 1] * duck * 0.9 + vo_r * 1.4
peak = max(np.abs(L).max(), np.abs(R).max())
L = np.tanh(L / peak * 1.25) * 0.9; R = np.tanh(R / peak * 1.25) * 0.9
pcm = (np.stack([L, R], 1) * 32767).astype("<i2")
with wave.open(sys.argv[3], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("ok")
