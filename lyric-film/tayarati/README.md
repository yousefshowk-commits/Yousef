# طيارتي — lyric film

A 38.6s vertical (1080×1920, 60fps) motion-graphics lyric film for «طيارتي». Each word enters on its sung timestamp, taken from a word-level transcription of the vocal. The motion pulses on the track's ~96 BPM beat grid, which came from a librosa beat analysis.

Only the eight supplied lines appear as lyrics. The song's middle section (21.0–30.6s) plays as a flight sequence with no lyrics, and the opening lines return as a reprise.

| Time | Line | Visual idea |
|---|---|---|
| 0.0–3.9 | طَيَّارَتِي أُحِبُّهَا | A paper sheet drifts down like a leaf and folds itself into a kite, one flap per beat. The panels paint in, and the string draws a heart around «أحبها» |
| 4.0–6.4 | مِنْ وَرَقٍ أَصْنَعُهَا | The words land as torn paper stickers with marching "cut here" lines, then a gust blows them away |
| 6.4–8.8 | طَيَّارَتِي سَرِيعَة | The kite whips across the frame. «سريعة» smashes in as a smear frame with colour echoes, speed lines and wind curls. The HUD switches to a speedometer |
| 8.9–11.3 | خُيُوطُهَا رَفِيعَة | Outline-only type is laid along the string, with a «Ø 0.8 mm» caliper callout |
| 11.4–13.8 | أَسْحَبُهَا فَتَرْتَفِعْ | The string snaps taut with a camera jolt, then the kite climbs while the clouds pour downward |
| 13.8–16.3 | وَفِي الْهَوَاءِ تَنْدَفِعْ | «الهواء» ripples like air (sliced so the Arabic letter joins stay intact). On «تندفع» the kite dashes at the camera through radial speed lines |
| 16.4–18.7 | بِرَأْسِهَا تَمِيلُ | The whole frame tilts on a spring with a pendulum overshoot. A spirit-level bubble slides with it |
| 18.7–21.0 | وَذَيْلُهَا طَوِيلُ | The tail grows bows and unrolls into a waving ribbon carrying «طويل» |
| 21.0–30.6 | (instrumental) | A figure-eight flight over rooftops. More kites launch on the beats, with confetti on every downbeat and a loop-the-loop on the bar at 26.3 |
| 31.1–36.0 | reprise | Sunset light. The first two lines return, and the heart string draws again |
| 36.1–38.6 | — | The final «طيارتي» lands with a confetti burst, then the frame settles on a paper end card |

The kite's path runs through the whole film as one function of time (`hero(t)`). Its tail is sampled from the kite's own past positions, so the tail trails any move. The kite's path, wind and camera pan are all integrated from absolute time, so the film renders the same at any fps.

## Run

```bash
npm install
cp /path/to/song.mp3 public/song.mp3   # the track is not committed
npx remotion studio src/index.ts
npx remotion render src/index.ts Tayarati out/tayarati-lyric-film.mp4 --codec h264 --crf 18
```

`Tayarati` renders at 60fps and `Tayarati30` at 30fps for quick previews. Fonts are Lalezar, Baloo Bhaijaan 2, Aref Ruqaa and JetBrains Mono (from Google Fonts, stored in `public/fonts`).
