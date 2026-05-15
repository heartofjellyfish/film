// membrane.vert.glsl — vertex shader for the inside-out membrane in Scene #6.
// Mirror of components/film/shaders/membrane.ts VERTEX_SHADER. Edit both together.
//
// The membrane is a SphereGeometry rendered with side = THREE.BackSide so the
// camera sits inside it. We compute view direction and the inward-facing
// normal (negated, because the BackSide flips the geometric normal) and pass
// them to the fragment shader for Fresnel.
//
// Output varyings:
//   vWorldPos — world-space position, used by the frag shader for the warm
//               gradient (top vs bottom of the membrane).
//   vNormal   — view-space inward-facing normal (already negated).
//   vViewDir  — view-space direction from fragment to the eye.

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;

  vec4 viewPos = viewMatrix * worldPos;
  // Negate because we're rendering the inside (BackSide); the geometric
  // normal points outward from the sphere centre but the camera sees the
  // inside-facing surface, so flip.
  vNormal = normalize(-normalMatrix * normal);
  vViewDir = normalize(-viewPos.xyz);

  gl_Position = projectionMatrix * viewPos;
}
