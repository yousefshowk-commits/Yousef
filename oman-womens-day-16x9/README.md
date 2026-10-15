# يوم المرأة العُمانية — 3D motion film (16:9)

50s horizontal (1920×1080, 30fps) celebratory film for Omani Women's Day (17 October). Real-time 3D (three.js via `@remotion/three`) in polished gold, lacquer red and emerald green over a deep maroon stage, with Arabic typography layered on top. Narration: ElevenLabs `eleven_v4`, voice «saber» (deep Modern Standard Arabic) — full text in `script.md`.

| Time | Phrase | 3D |
|---|---|---|
| 0–6.9 | في السابعَ عشرَ من أكتوبر… تحتفي عُمانُ بنصفِها المُشرِق | Two gold square frames fly in and lock into an 8-point khatam medallion; «١٧ أكتوبر» on a red lacquer disc |
| 6.9–12.6 | بامرأةٍ صنعتِ المجدَ… وحملتِ الوطنَ في قلبِها | Satin ribbons in red / ivory / green with gold threads |
| 12.6–21.7 | الأمّ · المعلِّمة · الطبيبة · المهندسة · القائدة… في كلِّ ميدان | Carousel of Omani-arch cards turning to each role on its word, then a crane-out |
| 21.7–30.9 | من أصالةِ القلاع وعَبَقِ اللُّبان… رؤية عُمان ٢٠٤٠ | Gold fort + lathed incense burner with rising frankincense smoke, crane up to a crown of light bars and «٢٠٤٠» |
| 30.9–37.0 | شريكةٌ في البناء · حاضرةٌ في القرار · أثرُها باقٍ في كلِّ إنجاز | Three pillars (red / ivory / green) rise on their words; a gold arch joins them |
| 37.0–40.8 | فإليكِ يا ابنةَ عُمان… كلُّ التقديرِ والوفاء | Falling damask-rose petals (Jebel Akhdar) around the medallion |
| 40.8–50 | يومُ المرأةِ العُمانيّة… كلُّ عامٍ وأنتِ فخرُ الوطنِ ونبضُه | Gold burst, medallion lockup, ribbons |

- `src/Film.tsx` — composition (`OWD169`), typography and scene windows; phrase times = ElevenLabs Scribe word timestamps + 2.0s.
- `src/Scenes3D.tsx`, `src/kit3d.tsx` — the 3D scenes and kit (materials, procedural env map, khatam / arch / fort / mabkhara geometry, ribbons, particles, canvas-rendered Arabic labels).
- `src/owd169_audio.py` — numpy score (90 BPM, D Hijaz: pads, oud plucks, frame-drum groove, strings, CC0 SFX on every cut) + narration with side-chain ducking: `python3 owd169_audio.py <sfx_dir> narration.mp3 mix_raw.wav`, then `ffmpeg -i mix_raw.wav -af loudnorm=I=-14:TP=-1 mix.wav`.
- Render (no GPU): `npx remotion render src/index.ts OWD169 out.mp4 --gl=swangle --muted`, then mux `mix.wav` with ffmpeg. Needs `remotion@4.0.529`, `@remotion/three`, `three@0.169`, `@react-three/fiber@8`, fonts (Alexandria, Aref Ruqaa, Amiri, Reem Kufi, El Messiri) and `tex/grain.png` + `sfx/` in `public/`.
