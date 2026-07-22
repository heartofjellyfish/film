'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

const VERTEX = /* glsl */ `
  varying vec3 vLocal;
  void main() {
    vLocal = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision mediump float;
  varying vec3 vLocal;
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform vec3 uGlow;
  uniform float uGlowStrength;
  void main() {
    float vertical = smoothstep(-0.75, 0.8, vLocal.y);
    float horizon = pow(max(0.0, 1.0 - abs(vLocal.y)), 5.0);
    vec3 color = mix(uBottom, uTop, vertical);
    color += uGlow * horizon * uGlowStrength;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function CinematicDome({
  top,
  bottom,
  glow,
  glowStrength = 0.18,
}: {
  top: string;
  bottom: string;
  glow: string;
  glowStrength?: number;
}) {
  const uniforms = useMemo(() => ({
    uTop: { value: new THREE.Color(top) },
    uBottom: { value: new THREE.Color(bottom) },
    uGlow: { value: new THREE.Color(glow) },
    uGlowStrength: { value: glowStrength },
  }), [top, bottom, glow, glowStrength]);

  return (
    <mesh renderOrder={-1000}>
      <sphereGeometry args={[70, 32, 20]} />
      <shaderMaterial
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
      />
    </mesh>
  );
}
