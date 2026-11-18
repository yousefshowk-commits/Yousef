# CLAUDE.md

Repository of independent projects by the same author, each in its own folder. Everything user-facing is in Arabic (RTL).

## Map

| Folder | Project | Stack |
|---|---|---|
| `/` (src/, index.html) | Class rewards system | React + TS + Tailwind + Vite |
| `midad/` | Midad — Arabic calligraphy studio | React + TS + Tailwind + Vite + harfbuzzjs (own `package.json`) |
| `showreel/`, `lyric-film/`, `wedding-invite/`, `oman-womens-day*/`, `zakat/` | Motion films (rendered mp4 + sources) | Remotion / canvas |

Each project's README holds its run commands and features; do not duplicate them here.

## Conventions

- Each web project builds with `npm run build` (runs `tsc --noEmit` then Vite) — keep it green before committing.
- `midad/`: Arabic text is shaped by HarfBuzz and rendered as SVG paths; never fall back to SVG `<text>` for calligraphy (breaks letter-level editing and vector export). Bundled fonts are OFL — keep `public/fonts/LICENSES-OFL.txt` updated when adding one.
- Don't commit `node_modules/` or `dist/` (see `.gitignore`).
