# يوم المرأة العُمانية — motion film

A 40s vertical (1080×1920, 60fps) motion-design film for Omani Women's Day (17 October), in the flag's red / ivory / green with gold Islamic geometry. Cuts are locked to a synthesized 100 BPM score in D Hijaz (bar = 2.4s).

| Time | Chapter | Visual idea |
|---|---|---|
| 0.0–4.8 | ١٧ أكتوبر | An 8-point khatam rosette draws itself layer by layer; «١٧» slams in on the first downbeat with a shockwave and camera shake |
| 4.8–9.6 | إلى كلِّ امرأةٍ عُمانيّة | Diagonal flag-band wipe; words rise from masks and «عُمانيّة» is inked in gold Ruqaa calligraphy |
| 9.6–14.4 | هي… | Eight roles, one per beat, each in its own type treatment (solid, outline, calligraphy, label blocks) around an orbit counter |
| 14.4–19.2 | شريكةٌ في بناء عُمان | A fort (round Nizwa-style tower, stepped merlons, palms) draws itself as a gold blueprint; the flag raises and waves |
| 19.2–24.0 | حضورُها صوت · وأثرُها باقٍ | A living waveform horizon in the flag colours with beat-driven rings |
| 24.0–28.8 | قيمٌ تحملُها جيلاً بعد جيل | A 4×7 mosaic of geometric tiles flips in a wave from the centre to reveal values, then disperses |
| 28.8–33.6 | هي الجذورُ وهي الأجنحة | Procedural gold roots grow under the horizon, then embers take flight in V-streams |
| 33.6–40.0 | يوم المرأة العُمانية | Flag wipe, ray burst and a slow rosette behind the gold lockup, «كلُّ عامٍ وأنتِ مُلهِمة» |

- `src/OmanWomen.tsx` — the Remotion composition (registered as `OmanWomen` at 30fps and `OmanWomen60` at 60fps). It reads `owd/score.wav`, `tex/grain.png` and fonts (Alexandria, Aref Ruqaa, Amiri, Reem Kufi, El Messiri, Cormorant Garamond) from `public/`.
- `src/owd_score.py` — numpy score: doum/tak/hand-claps groove, oud-like Karplus-Strong riffs, pads, string swell, plus CC0 SFX placed on every cut. `python3 owd_score.py <sfx_dir> score.wav`.

## Narration

Voiceover by ElevenLabs (`eleven_v4`, voice «Infinite Voice» — deep, warm Modern Standard Arabic), recorded as one take in `src/narration.mp3`:

> في السابعَ عشرَ من أكتوبر… إلى كلِّ امرأةٍ عُمانيّة… تصنعُ الفرقَ كلَّ يوم. هي الأمّ، والمعلِّمة، والطبيبة… وهي القائدة. شريكةٌ في بناءِ عُمان… من القِلاعِ إلى المستقبل. حضورُها صوت… وأثرُها باقٍ. قِيَمٌ تحملُها… جيلاً بعدَ جيل. هي الجذور… وهي الأجنحة. يومُ المرأةِ العُمانيّة… كلُّ عامٍ وأنتِ مُلهِمة.

`src/owd_vo_mix.py` cuts the take at the pauses (from ElevenLabs Scribe word timestamps), places each line on its chapter's visual beat, side-chain ducks the score under the voice, and writes the final mix: `python3 owd_vo_mix.py narration.mp3 score.wav score-vo.wav`, then mux it over the rendered video with ffmpeg.
