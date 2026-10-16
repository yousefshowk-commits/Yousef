# الزكاة — talking-character motion film

A 15s vertical (1080×1920, 60fps) motion-design film in which an animated Omani character (kumma cap, dishdasha, furakha tassel) explains Zakat. The mouth, head nods and brows are driven by the narration's audio, and each chapter cuts on a spoken line.

| Time | Line | Visual idea |
|---|---|---|
| 0.0–2.0 | هل تعلمُ ما هي الزكاة؟ | A gold coin drops and lands with a shockwave, 8-point rosettes draw around it, «الزكاة؟» is inked in gold Ruqaa |
| 2.0–4.2 | الرُّكنُ الثالثُ من أركانِ الإسلام | Five arches rise, the third turns gold with rays, then the camera zooms through it |
| 4.2–6.1 | اثنانِ ونصفٌ بالمئةِ فقط | «٢٫٥٪» counts up over a grid of 40 coins; one flips gold and jumps (1 in 40) |
| 6.1–9.2 | من مالِك، إذا بلغَ النِّصابَ ومرَّ عليه عام | Two glass cards: gold bars fill a meter past the nisab line, and a crescent orbits 12 lunar months |
| 9.2–12.0 | تُطهِّرُ مالَك… وتُسعِدُ غيرَك | A light sweep turns a dull coin pile gold, then coins arc into a house that lights up |
| 12.0–15.0 | وما نقصَ مالٌ من صدقة | Rosette lockup of the hadith (رواه مسلم), with the character's hand on his heart |

- `src/Zakat.tsx` is the Remotion composition, registered as `Zakat` (30fps) and `Zakat60` (60fps). It reads `src/lipsync.json`, `tex/grain.png` and fonts (Alexandria, Aref Ruqaa, Amiri, Reem Kufi, JetBrains Mono) from `public/`.
- `src/narration.mp3` is the voice-over from ElevenLabs (`eleven_v4`, voice «ABD ULRAHMAN FARAJ»), placed at 0.4s.
- `src/zk_lipsync.py` turns the narration into 60Hz jaw-open and lip-spread curves: `python3 zk_lipsync.py narration.mp3 lipsync.json`.
- `src/zk_audio.py` builds the score and the mix. The score is a numpy D-Hijaz pad, oud-like plucks and a frame-drum groove. On top of it are synthesised coin clinks, ticks and shimmers on every visual event, plus CC0 SFX. The voice is mixed in with side-chain ducking: `python3 zk_audio.py <sfx_dir> narration.mp3 mix.wav`. Mux the mix over the render with `loudnorm=I=-14:TP=-1`.
