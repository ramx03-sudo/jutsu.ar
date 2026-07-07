import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
varying float vDepth;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vDepth = worldPos.z;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const fragmentShader = `
varying vec2 vUv;
varying float vDepth;

uniform float uTime;
uniform vec3 uColor;

void main() {
  vec2 uv = vUv;

  // --- Petal Shape Mask (sharp edges)
  float shape = smoothstep(0.5, 0.48, abs(uv.x - 0.5));
  float taper = smoothstep(0.0, 0.2, uv.y) * smoothstep(1.0, 0.8, uv.y);
  float mask = shape * taper;

  // --- Core Glow (center energy)
  float core = exp(-20.0 * distance(uv, vec2(0.5)));

  // --- Edge Highlight (anime shine)
  float edge = pow(1.0 - abs(uv.x - 0.5) * 2.0, 6.0);

  // --- Subtle flicker
  float flicker = 0.9 + 0.1 * sin(uTime * 8.0 + vDepth * 2.0);

  // --- Final color layering
  vec3 color = uColor * core * 1.5 + uColor * edge * 0.6;
  color *= flicker;

  // --- Alpha falloff
  float alpha = mask * (core + edge);
  if (alpha < 0.05) discard;

  gl_FragColor = vec4(color, alpha);
}
`;

export function createPetalMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#ff2f7a') }
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
}
