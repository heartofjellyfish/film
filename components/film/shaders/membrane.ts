/**
 * Membrane shader strings.
 *
 * Next.js webpack does not load `.glsl` files by default and the prototype
 * doesn't want to ship an extra loader plugin. We keep the human-readable
 * shader source in `membrane.vert.glsl` and `membrane.frag.glsl` for code
 * review and IDE syntax highlighting, and duplicate the same source here
 * as plain string constants so React Three Fiber's <shaderMaterial> can
 * consume it without any build-step configuration.
 *
 * If you edit one of the .glsl files, copy the change here too. The frag
 * shader header comment notes this as well.
 */

export const VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;

    vec4 viewPos = viewMatrix * worldPos;
    // BackSide rendering: flip the geometric normal so it points toward the
    // camera (sitting inside the sphere).
    vNormal = normalize(-normalMatrix * normal);
    vViewDir = normalize(-viewPos.xyz);

    gl_Position = projectionMatrix * viewPos;
  }
`;

export const FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  uniform float uTime;
  uniform vec3  uColorTop;
  uniform vec3  uColorBottom;
  uniform float uVeinSpeed;
  uniform float uFresnelPower;

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

  void main() {
    // Vertical gradient (warm pink-gold) — remap sphere y (~[-8, 8]) to [0,1]
    float h = clamp((vWorldPos.y + 8.0) / 16.0, 0.0, 1.0);
    vec3 base = mix(uColorBottom, uColorTop, h);

    // Fresnel (inside-out): grazing angles brighter
    float ndv = max(0.0, dot(normalize(vNormal), normalize(vViewDir)));
    float fresnel = pow(1.0 - ndv, uFresnelPower);

    // Slow flowing veins (FBM in world XZ, drifting in time)
    vec2 veinUv = vWorldPos.xz * 0.08 + vec2(uTime * uVeinSpeed, uTime * uVeinSpeed * 0.6);
    float veins = fbm(veinUv) * 0.45 + 0.55;

    vec3 col = base * veins + vec3(1.0, 0.85, 0.65) * fresnel * 0.35;
    float alpha = mix(0.4, 0.7, fresnel);

    gl_FragColor = vec4(col, alpha);
  }
`;
