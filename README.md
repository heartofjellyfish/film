# 水母之心 · The Heart of the Jellyfish — film/

Prototype for the album experience site by **Qi · 琦** (releasing 2026-12-20).

A scroll-driven 3D film in three acts:
1. **Sea Rising** — a static shore, the water rises and swallows the camera
2. **The Deep** — drifting through dark water toward a glow
3. **The Heart of the Jellyfish** — inside the bell, a warm pulsing heart

Three viewing modes: Auto (time-driven), Scroll (visitor-driven), Listen (song plays in full).

---

## Development

```bash
npm install
npm run dev       # localhost:3000
```

Optional URL params:
- `?tweak=1` — show Leva slider panel
- `?stats=1` — show R3F FPS / draw call counter
- `?focus=vi_heart` — jump straight to Scene vi (debug)

Preview the jellyfish model alone: `localhost:3000/preview-jelly`

---

## Commands

```bash
npm run dev          # Next.js dev server
npm run build        # production build
npm run start        # serve production build
npm run lint         # ESLint (eslint-config-next)
npm run typecheck    # tsc --noEmit
npm run test         # vitest watch
npm run test:run     # vitest run (CI)
npm run test:coverage # vitest coverage (logic modules only)
```

---

## Structure

See `CLAUDE.md` for full architecture notes, patterns, and the Bloom+transmission pit.

---

## Assets

- 3D model: `public/models/chrysaora/` — Pacific Sea Nettle (Sketchfab Standard License)
- Placeholder audio: `public/audio/placeholder/` — CC0 ambients (see CREDITS.md)
- Real tracks: `public/audio/tracks/` — **never commit mp3s to git**, CDN later

---

## URL Routes

| URL | Behavior |
|---|---|
| `/` | Full film: entry ceremony → Auto mode → Sea Rising (#1) → The Heart of the Jellyfish (#6) → EndCard |
| `/?focus=i_sea_rising` | Skips to #1 immediately after entry, locks depthRef at anchor 0.05 |
| `/?focus=vi_heart` | Skips to #6 immediately after entry, locks depthRef at anchor 0.55 — use this for verifying the sanctuary feel |
| `/?tweak=1` | Adds Leva slider panel (top-right) for live-tuning sky / water / bloom / fog params |
| `/?stats=1` | Adds R3F Stats overlay showing FPS and draw-call counter |
| `/preview-jelly` | Standalone Chrysaora model inspector with its own Leva panel for material tuning |
