"""Shorten long pauses in a narration take; writes the tightened wav and the orig→new time map.
  python3 tighten.py in.mp3 out.wav map.json [keep_s]"""
import sys, json, re, subprocess, wave
import numpy as np
SR = 48000
src, out, mapf = sys.argv[1:4]
keep = float(sys.argv[4]) if len(sys.argv) > 4 else 0.34
log = subprocess.run(["ffmpeg", "-hide_banner", "-i", src, "-af", "silencedetect=noise=-40dB:d=0.3", "-f", "null", "-"], capture_output=True, text=True).stderr
starts = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", log)]
ends = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", log)]
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
x = np.frombuffer(raw, dtype="<f4").astype(np.float64)
pieces, old, new, cur, t_new = [], [0.0], [0.0], 0, 0.0
fade = int(0.02 * SR)
for a, b in zip(starts, ends):
    if a < 0.05 or b - a <= keep:   # leading silence / short pause: leave
        continue
    cut_a, cut_b = a + keep / 2, b - keep / 2
    seg = x[cur:int(cut_a * SR)].copy()
    pieces.append(seg); t_new += len(seg) / SR
    old += [cut_a, cut_b]; new += [t_new, t_new]
    cur = int(cut_b * SR)
pieces.append(x[cur:]); t_new += len(x[cur:]) / SR
old.append(len(x) / SR); new.append(t_new)
r = np.linspace(0, 1, fade)
for i, p in enumerate(pieces):   # micro fades at each splice (both sides are near-silent); length is preserved
    if i > 0: p[:fade] *= r
    if i < len(pieces) - 1: p[-fade:] *= r[::-1]
y = np.concatenate(pieces)
with wave.open(out, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())
json.dump({"old": old, "new": new}, open(mapf, "w"))
print(f"{len(x)/SR:.2f}s -> {len(y)/SR:.2f}s")
