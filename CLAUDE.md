# film/ — context for Claude

Prototype for *The Heart of the Jellyfish* by Qi · 琦 (release: 2026-12-20).
A three-mode scroll-driven 3D film: Sea Rising → The Deep → The Heart of the Jellyfish.

**This is a separate repo from `web/`.** Do not modify `web/`. Film is the prototype / v2.

## Stack

- **Next.js 15** App Router + TypeScript strict, **React 19**
- **react-three-fiber** + **drei** + **three.js** (Water.js for water surface, drei `<Sky>`)
- **leva** for in-browser tweaking (`?tweak=1`)
- **Tailwind** for DOM overlays
- **Vitest** + **@testing-library/react** for unit tests
- Deployed eventually on Vercel (separate project from web/)

---

## Patterns inherited from `web/` — MUST follow

### depthRef — single source of truth

`depthRef` is a `MutableRefObject<number>` with value range `[0, 1]`.

**Only `ModeMachine.ts` writes `depthRef.current`.** Every other module reads it.

```typescript
// WRONG — never do this outside ModeMachine.ts
depthRef.current = someValue;

// RIGHT — read in useFrame
useFrame(() => {
  const d = depthRef.current;
  mesh.position.y = lerp(startY, endY, d);
});
```

No global state library. No useState for depth-derived values inside R3F. Ref is the bus.

### gltf-transform compression pipeline

Every new GLB must be compressed before commit. Raw Sketchfab downloads bundle 4k–8k PNGs
and can be 18× larger than compressed. Run:

```sh
npx --yes @gltf-transform/cli@latest dedup in.glb out.glb && \
npx --yes @gltf-transform/cli@latest weld out.glb out.glb && \
npx --yes @gltf-transform/cli@latest webp out.glb out.glb --slots baseColor && \
npx --yes @gltf-transform/cli@latest resize out.glb out.glb --width 2048 --height 2048 && \
npx --yes @gltf-transform/cli@latest draco out.glb out.glb
```

Do NOT use `gltf-transform optimize` — its `simplify`/`prune` strips NORMAL attributes
producing flat-shaded geometry.

### `<XxxGate>` — large asset lazy loading

Any asset > 5 MB must use an `<AssetGate revealAt={depthThreshold}>` wrapper.
It flips a `useState` once `depthRef` crosses the threshold — keeps first paint fast.
Once loaded, the gate **never unloads** (backwards scroll doesn't re-trigger load).

```tsx
<AssetGate revealAt={0.78}>
  <Suspense fallback={null}>
    <HeavyMesh />
  </Suspense>
</AssetGate>
```

### `mat.fog = true`

Set `mat.fog = true` on every material so props dissolve into the depth palette.
Underwater props: `transparent: false` unless they really need alpha — fog handles falloff.

### Bloom + transmission — THE PIT

**Never pair `<Bloom>` with any material that has `transmission > 0`.**

The transmission backdrop produces NaN/Inf at animated mesh edges, and no
`luminanceThreshold` filters them out. Visible symptom: flashing black squares.

**Correct pattern** — only feed non-transmissive meshes to bloom:

```tsx
<EffectComposer>
  <Selection>
    <Select enabled>
      <HeartMesh />   {/* safe: no transmission */}
    </Select>
    <Bloom luminanceThreshold={0.6} selectionLayer={1} />
  </Selection>
</EffectComposer>
{/* membrane lives OUTSIDE the composer, or outside <Select> */}
<MembraneMesh />
```

Do NOT use `transparent: true` on a material that already has `transmission`.
Transmission handles its own alpha through a separate pass — doubling up causes
depth-sort flicker on animated skinned meshes.

---

## Film-specific patterns

### Three-mode state machine

ModeMachine owns three modes. ModeMachine is the only writer of depthRef.

| Mode | depthRef driver | Audio |
|---|---|---|
| **auto** | time tween 0→1 (22s prototype / 90s production) | placeholder ambient |
| **scroll** | `window.scrollY / maxScroll` | highlight cut or placeholder |
| **listen** | locked at nearest anchor | full track from 0, or placeholder |

Transitions:
- `auto → scroll`: first scroll input
- `scroll → listen`: within ±5% of anchor + 3 s idle
- `listen → scroll`: any scroll ≥ 5 px
- Any mode → auto: ESC or "restart" button

Mobile: always stays in `auto`, ignores scroll/listen transitions.

### Scene anchors (prototype)

```typescript
// scenes/registry.ts
export const SCENE_ANCHORS = {
  'i_sea_rising': 0.05,
  'vi_heart':     0.55,
} as const;
```

Full 10-scene version: anchors 0.05 through 0.95, monotonically increasing.

### Module dependency rule

Level 0: EnvProbe, EntryCeremony (no deps)
Level 1: ModeMachine (depends on EnvProbe)
Level 2: Scenes, Overlay, AssetGate, AudioSubsystem (read from ModeMachine)
Level 3: FilmRoot, TweakPanel (compose everything)

Scenes must not import each other. Events between scenes go up through FilmRoot.

### depthRef single-write contract

`grep -r "depthRef.current ="` in CI should only match `ModeMachine.ts`.

---

## Asset budget

- First paint preloaded: < 5 MB (chrysaora is ~1.6 MB — keep it that way)
- Gated assets: < 50 MB each (texture-resize before going higher)
- Placeholder audio total: < 2 MB (short WAV loops × 3)
- Real track mp3s: **never commit** — CDN later

## Directory structure

```
film/
├── app/
│   ├── page.tsx              ← entry: mounts <FilmRoot>
│   ├── layout.tsx
│   ├── globals.css
│   └── preview-jelly/        ← standalone GLB inspector
├── components/
│   ├── film/                 ← film skeleton
│   │   ├── types.ts          ← global shared types
│   │   ├── FilmRoot.tsx
│   │   ├── EntryCeremony.tsx
│   │   ├── ModeMachine.ts
│   │   ├── useDepthRef.ts
│   │   ├── ChapterCard.tsx
│   │   ├── EnvProbe.ts
│   │   ├── AssetGate.tsx
│   │   ├── TweakPanel.tsx
│   │   ├── scenes/
│   │   │   ├── registry.ts
│   │   │   ├── SceneSeaRising.tsx
│   │   │   ├── SceneJellyHeart.tsx
│   │   │   └── SceneTransition.tsx
│   │   ├── shaders/
│   │   │   ├── membrane.frag.glsl
│   │   │   ├── membrane.vert.glsl
│   │   │   └── heart.glsl
│   │   ├── audio/
│   │   │   ├── AudioManager.ts
│   │   │   └── manifest.ts
│   │   └── __fixtures__/
│   │       └── modeMachine.ts
│   └── JellyPreview.tsx
├── public/
│   ├── models/chrysaora/
│   └── audio/
│       ├── placeholder/      ← CC0 ambient WAVs (Qi: fill from freesound.org)
│       └── tracks/           ← real mp3s go here (never commit)
├── vitest.config.ts
├── vitest.setup.ts
├── CLAUDE.md
├── CREDITS.md
└── README.md
```
