import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Color, ShaderMaterial, Vector2 } from 'three'
import { damp } from '../lib/frame'
import { scrollState } from '../lib/scrollState'
import { sectionTint } from './tint'

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const FRAG = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uScroll;
  uniform vec3  uTint;
  uniform vec2  uResolution;

  // Value noise + 3-octave fbm (dropped from 4 to stay inside the mobile perf
  // budget — see task-6-7-report.md). Cheap enough to run fullscreen every frame.
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);

    // Slow upward drift, so it reads as heat haze rather than a moving texture.
    float f = fbm(uv * aspect * 3.0 + vec2(0.0, -uTime * 0.035 - uScroll * 0.6));

    // Ember specks: sparse, high-frequency, drifting a little faster.
    float e = fbm(uv * aspect * 22.0 + vec2(uTime * 0.05, -uTime * 0.12));
    float embers = smoothstep(0.86, 0.99, e) * 0.5;

    // Radial falloff keeps the centre readable and the edges dark.
    float vignette = smoothstep(1.15, 0.25, length((uv - 0.5) * aspect * 2.0));

    vec3 color = uTint * (f * 0.34 + embers) * vignette;
    gl_FragColor = vec4(color, 1.0);
  }
`

export function Backdrop({ activeId }: { activeId: string }) {
  const { size } = useThree()
  // Lazily construct once and cache on the ref — `useRef(new Color())` would
  // build (and discard) a Color on every re-render since the argument is
  // evaluated eagerly even though only the first value is ever kept.
  const targetRef = useRef<Color | null>(null)
  if (!targetRef.current) targetRef.current = new Color()
  const target = targetRef.current
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          uTime: { value: 0 },
          uScroll: { value: 0 },
          uTint: { value: new Color(...sectionTint('')) },
          uResolution: { value: new Vector2(size.width, size.height) },
        },
      }),
    [],
  )

  useFrame((_, dt) => {
    const u = material.uniforms
    u.uTime.value += dt
    u.uScroll.value = damp(u.uScroll.value, scrollState.progress, 3, dt)
    u.uResolution.value.set(size.width, size.height)

    target.setRGB(...sectionTint(activeId))
    const tint = u.uTint.value as Color
    tint.r = damp(tint.r, target.r, 2, dt)
    tint.g = damp(tint.g, target.g, 2, dt)
    tint.b = damp(tint.b, target.b, 2, dt)
  })

  // A fullscreen quad in clip space: two triangles, four corner vertices, no
  // matrices, no culling surprises — the cheapest possible full-viewport surface.
  return (
    <mesh frustumCulled={false} renderOrder={-1} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
