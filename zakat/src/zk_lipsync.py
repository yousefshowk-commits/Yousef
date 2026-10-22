"""Lip-sync curves for the Zakat character, analysed from the narration take.

Writes 60 samples per second of:
  open  — jaw opening (0..1) from a smoothed, gated RMS envelope
  wide  — lip spread (0..1) from the spectral centroid: high = "ee/s" (wide), low = "oo/w" (round)
Usage: python3 zk_lipsync.py narration.mp3 lipsync.json
"""
import json, subprocess, sys
import numpy as np

SR, FPS = 24000, 60
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", sys.argv[1], "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                     capture_output=True, check=True).stdout
x = np.frombuffer(raw, dtype="<f4").astype(np.float64)
hop, win = SR // FPS, 1024
n = len(x) // hop
pad = np.concatenate([np.zeros(win // 2), x, np.zeros(win)])
w = np.hanning(win)
freqs = np.fft.rfftfreq(win, 1 / SR)
band = (freqs > 80) & (freqs < 6000)
rms, cen = np.zeros(n), np.zeros(n)
for i in range(n):
    seg = pad[i * hop:i * hop + win] * w
    rms[i] = np.sqrt(np.mean(seg ** 2))
    mag = np.abs(np.fft.rfft(seg))[band]
    cen[i] = (freqs[band] * mag).sum() / max(mag.sum(), 1e-9)

db = 20 * np.log10(rms + 1e-9)
top = np.percentile(db, 97)
o = np.clip((db - (top - 30)) / 30, 0, 1) ** 1.4
# attack fast / release a touch slower so the jaw doesn't chatter
s, op = 0.0, np.zeros(n)
for i, v in enumerate(o):
    s += (v - s) * (0.75 if v > s else 0.45)
    op[i] = s
c = np.clip((cen - 900) / 1800, 0, 1)
c = np.convolve(c, np.ones(5) / 5, mode="same")
c = np.where(op > 0.08, c, 0.5)
json.dump({"fps": FPS, "open": [round(v, 3) for v in op], "wide": [round(v, 3) for v in c]}, open(sys.argv[2], "w"))
print(n, "frames", round(n / FPS, 2), "s")
