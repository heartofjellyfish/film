# Asset credits

## 3D models

### Chrysaora jellyfish (`public/models/chrysaora/`)
**"Pacific Sea Nettle"** by [NestaEric](https://sketchfab.com/NestaEric)
Source: https://sketchfab.com/3d-models/pacific-sea-nettle-679b5ec2efb8401f97ee7dd5ac54fa29
License: Sketchfab Standard License (royalty-free, commercial use)

## Placeholder audio

These WAV files are **programmatically generated** (not sourced from freesound.org or any
third-party library). They are synthesized by `scripts/generate-placeholder-audio.mjs`
using pure sinusoidal mathematics + deterministic LCG noise — no external audio samples.

The author (Qi · 琦) holds all rights to the generated output and releases these
placeholder files under **CC0 1.0 Universal** (public domain dedication). Anyone may
use, modify, or redistribute them without attribution.

- `public/audio/placeholder/ambient_ocean.wav` — procedurally generated ocean surf simulation
  (layered sub-bass sines + band-pass noise, 7 s loop, 44.1 kHz mono 16-bit PCM)
  © 2026 Qi · 琦, released under CC0 1.0

- `public/audio/placeholder/ambient_underwater.wav` — procedurally generated deep sub-bass rumble
  (sine cluster 82-118 Hz with slow AM modulation, 7 s loop, 44.1 kHz mono 16-bit PCM)
  © 2026 Qi · 琦, released under CC0 1.0

- `public/audio/placeholder/ambient_membrane.wav` — procedurally generated warm harmonic hum
  (110/165 Hz harmonics with tremolo/vibrato, 7 s loop, 44.1 kHz mono 16-bit PCM)
  © 2026 Qi · 琦, released under CC0 1.0

## Other

- **Three.js Water shader** — Jérôme Etienne / three.js examples
- **Sky atmospheric scattering** — Preetham model via drei
