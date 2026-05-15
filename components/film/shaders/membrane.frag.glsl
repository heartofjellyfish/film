// membrane.frag.glsl — fragment shader for the inside-out jellyfish membrane.
// Mirror of components/film/shaders/membrane.ts FRAGMENT_SHADER. Edit both together.
//
// Visual recipe (spec §6.3 / detailed design §6.10):
//   - Warm pink-gold vertical gradient: vWorldPos.y drives top → bottom mix.
//   - Fresnel edge highlight: pow(1 - dot(N, V), uFresnelPower), brighter at
//     grazing angles (the membrane "rim" we see when looking sideways inside
//     the sphere).
//   - Slow flowing veins: a cheap 2D value-noise drifts in screen-ish UVs and
//     adds soft modulation so the membrane never reads as a flat sphere.
//   - Alpha: lerp(centerAlpha, edgeAlpha, fresnel). Centre is lighter so the
//     heart shines through; edges are denser.
//
// IMPORTANT: this material is NEVER fed to Bloom (red line — see film/CLAUDE.md
// "Bloom + transmission — THE PIT"). It uses simple transparent blending, no
// MeshPhysicalMaterial.transmission, so it never produces NaN/Inf that would
// flash black squares.

precision mediump float;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec3 vViewDir;

uniform float uTime;
uniform vec3  uColorTop;
uniform vec3  uColorBottom;
uniform float uVeinSpeed;
uniform float uFresnelPower;

// ---- cheap value-noise (no derivatives, no textures) ----------------------
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise2(p);
    p *= 2.13;
    a *= 0.55;
  }
  return v;
}
// --------------------------------------------------------------------------

void main() {
  // ---- vertical warm gradient on the membrane (radius 8 sphere → y in
  // roughly [-8, 8]; remap to [0, 1]) ----
  float h = clamp((vWorldPos.y + 8.0) / 16.0, 0.0, 1.0);
  vec3 base = mix(uColorBottom, uColorTop, h);

  // ---- Fresnel (we're inside the sphere; vNormal was already negated in
  // the vertex shader so a small N·V is the "looking-along-the-membrane"
  // grazing angle we want to highlight) ----
  float ndv = max(0.0, dot(normalize(vNormal), normalize(vViewDir)));
  float fresnel = pow(1.0 - ndv, uFresnelPower);

  // ---- flowing veins from FBM noise, drifting slowly along world XZ ----
  vec2 veinUv = vWorldPos.xz * 0.08 + vec2(uTime * uVeinSpeed, uTime * uVeinSpeed * 0.6);
  float veins = fbm(veinUv) * 0.45 + 0.55;

  // Combine: warm base × vein modulation, plus fresnel rim glow.
  vec3 col = base * veins + vec3(1.0, 0.85, 0.65) * fresnel * 0.35;

  // Alpha: thin at centre (0.4), denser at edges (0.7). Same lerp factor as
  // the fresnel so they line up visually.
  float alpha = mix(0.4, 0.7, fresnel);

  gl_FragColor = vec4(col, alpha);
}
