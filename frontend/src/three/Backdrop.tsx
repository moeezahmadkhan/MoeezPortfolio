import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Color, ShaderMaterial, Vector2 } from 'three'
import { damp } from '../lib/frame'
import { scrollState } from '../lib/scrollState'
import { BACKDROP_SCROLL_LAMBDA, BACKDROP_TINT_LAMBDA } from './motion'
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

  // Value noise + fbm, run fullscreen every frame — which makes the octave
  // count the single biggest per-pixel cost on the page, and the reason this
  // shader is compiled twice.
  //
  // Desktop keeps three octaves and the ember layer, which is a second fbm at a
  // much higher frequency: six noise() evaluations per pixel in all. Mobile
  // takes two octaves and no embers — two evaluations. The embers are the first
  // thing to go rather than the last octave of the haze because they are the
  // detail a phone is least able to show: sparse specks a fraction of a CSS
  // pixel across, on a screen where the whole backdrop sits behind body copy.
  #ifdef MOBILE
    #define FBM_OCTAVES 2
  #else
    #define FBM_OCTAVES 3
  #endif

  // How much of the tint the haze is allowed to put on screen.
  //
  // Mobile is not merely the two-octave sum scaled back to match — it is
  // deliberately quieter than desktop, and that is a legibility decision rather
  // than a performance one. Measured on the built site: the hero's body copy
  // came out at 3.73:1 against this ground on a phone versus 5.79:1 on desktop,
  // because on desktop the copy sits in the reserved left column while on a
  // phone it sits over the middle of the screen, which is exactly where this
  // shader's radial falloff peaks. Same text, same colour, ground 3.85x
  // brighter. tools/check_contrast.mjs measures it and fails below 4.5:1, so
  // this number has a check rather than a hope behind it. (No backticks in this
  // comment: it lives inside a JS template literal, and one would end it.)
  #ifdef MOBILE
    #define GROUND_GAIN 0.22
  #else
    #define GROUND_GAIN 0.34
  #endif

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < FBM_OCTAVES; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);

    // Slow upward drift, so it reads as heat haze rather than a moving texture.
    float f = fbm(uv * aspect * 3.0 + vec2(0.0, -uTime * 0.035 - uScroll * 0.6));

    float embers = 0.0;
    #ifndef MOBILE
      // Ember specks: sparse, high-frequency, drifting a little faster.
      float e = fbm(uv * aspect * 22.0 + vec2(uTime * 0.05, -uTime * 0.12));
      embers = smoothstep(0.86, 0.99, e) * 0.5;
    #endif

    // Radial falloff keeps the centre readable and the edges dark. On mobile
    // this is also the only edge darkening there is: Stage drops the
    // post-processing Vignette at that width, and this is what stands in for it.
    float vignette = smoothstep(1.15, 0.25, length((uv - 0.5) * aspect * 2.0));

    vec3 color = uTint * (f * GROUND_GAIN + embers) * vignette;
    gl_FragColor = vec4(color, 1.0);
  }
`

export function Backdrop({ activeId, mobile }: { activeId: string; mobile: boolean }) {
  const { size } = useThree()
  // Lazily construct once and cache on the ref — `useRef(new Color())` would
  // build (and discard) a Color on every re-render since the argument is
  // evaluated eagerly even though only the first value is ever kept.
  const targetRef = useRef<Color | null>(null)
  if (!targetRef.current) targetRef.current = new Color()
  const target = targetRef.current
  // The colour the backdrop is actually showing right now, as opposed to the
  // one it is easing toward. Kept outside the material so that rebuilding the
  // material — which a resize across the breakpoint does, since the two
  // branches are different compiled programs — can start the new one from the
  // colour the old one was displaying, instead of snapping back to the hero's.
  const liveRef = useRef<Color | null>(null)
  if (!liveRef.current) liveRef.current = new Color(...sectionTint(''))
  const live = liveRef.current

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        // `mobile` is a compile-time branch, not a uniform: an `if (uMobile)`
        // around the ember layer would still cost the texture fetches on some
        // drivers, and would leave the octave loop at its desktop bound, which
        // is the expensive half. Two programs, each with only the work its
        // viewport needs.
        defines: mobile ? { MOBILE: '' } : {},
        depthWrite: false,
        depthTest: false,
        uniforms: {
          uTime: { value: 0 },
          uScroll: { value: 0 },
          uTint: { value: live.clone() },
          uResolution: { value: new Vector2(size.width, size.height) },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- size/live seed the
    // first frame only; recompiling on every resize pixel is exactly what this
    // must not do.
    [mobile],
  )

  // The material is owned outright (constructed here, never shared), so a
  // rebuild has to dispose the program it replaces or a few breakpoint
  // crossings leak one compiled shader each.
  useEffect(() => () => material.dispose(), [material])

  useFrame((_, dt) => {
    const u = material.uniforms
    u.uTime.value += dt
    // The SMOOTHED progress, not the raw one. This drift was already damped
    // here, but damping a value that steps only spreads the step out — the
    // input has to be continuous first, and `scrollState.smooth` is where it
    // becomes so (Task 1). Same reason the hero's fade reads `smooth`.
    u.uScroll.value = damp(
      u.uScroll.value,
      scrollState.smooth.progress,
      BACKDROP_SCROLL_LAMBDA,
      dt,
    )
    u.uResolution.value.set(size.width, size.height)

    target.setRGB(...sectionTint(activeId))
    const tint = u.uTint.value as Color
    tint.r = damp(tint.r, target.r, BACKDROP_TINT_LAMBDA, dt)
    tint.g = damp(tint.g, target.g, BACKDROP_TINT_LAMBDA, dt)
    tint.b = damp(tint.b, target.b, BACKDROP_TINT_LAMBDA, dt)
    live.copy(tint)
  })

  // A fullscreen quad in clip space: two triangles, four corner vertices, no
  // matrices, no culling surprises — the cheapest possible full-viewport surface.
  return (
    <mesh frustumCulled={false} renderOrder={-1} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
