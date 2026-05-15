/**
 * TweakPanel — Leva-based parameter tweaking panel.
 *
 * Mounted only when ?tweak=1 is present in the URL (FilmRoot gates it).
 * Module 09 implements the full panel. This is the placeholder stub so
 * FilmRoot can import it today without errors.
 *
 * Spec §3.8.5: 0 production overhead — FilmRoot only renders this when ?tweak=1.
 * Module 09 will replace the body with real Leva controls.
 *
 * RED LINE: TweakPanel is Level 3 (composition) — it reads from other modules
 * but never writes depthRef.current directly (that is ModeMachine's sole responsibility).
 */
'use client';

export function TweakPanel() {
  // Module 09 will replace this stub with the full Leva implementation.
  return null;
}
