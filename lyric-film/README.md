# عوّدت قلبي — lyric film

A 30s vertical (1080×1920, 60fps) kinetic-typography film for the verse:

> عوّدت قلبي على صوتك وضحكاتك / أسهر عليها إلين النوم يدركني
> ما فيه أحدٍ في البشر سوّى بي سواتك / اسمك إذا مر بين الناس يربكني

Each word enters on its sung timestamp (taken from a transcription of the vocal), and the motion follows the track's ~83 BPM beat grid.

| Time | Line | Visual idea |
|---|---|---|
| 0.0–4.8 | عوّدت قلبي على صوتك | An ECG line draws, collapses into a heart, and a ring of bars reacts to the live audio spectrum. The camera dives into the heart |
| 4.4–7.9 | وضحكاتك | The word is cut into strips that wave like laughter without breaking the Arabic letter joins, plus a particle burst and marquee texture |
| 6.9–14.3 | أسهر عليها إلين النوم يدركني | A night sky with a moon, a shooting star and a fast clock. The type gets drowsy and eyelids close on «يدركني» |
| 14.2–21.9 | ما فيه أحدٍ في البشر سوّى بي سواتك | The eyes open on a crowd of dots. All but one fade away, and that last dot bursts into a ring around «سواتك» |
| 21.2–28.0 | اسمك إذا مر بين الناس يربكني | «اسمك» is hand-written over people walking past, then «يربكني» glitches with an RGB split and the screen shuts off like an old CRT |
| 28.0–30.4 | — | A flatline in the silence, then on the final bass hit the heart bursts with shockwaves and the end card appears |

Built with Remotion (React). `src/Lyric.tsx` is the composition and is registered as `Lyric60` at 60fps.
