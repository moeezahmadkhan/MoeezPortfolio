import { useThree } from '@react-three/fiber'
// From the concrete file, not the `@react-three/drei` barrel — see the comment on
// the drei imports in Stage.tsx for why: the barrel drags in modules with their own
// internal dynamic `import()`, which corrupts the eager/lazy chunk split.
import { useGLTF } from '@react-three/drei/core/Gltf'
import { KTX2Loader } from 'three-stdlib'
import type { GLTFLoader } from 'three-stdlib'
import type { WebGLRenderer } from 'three'

/**
 * KTX2 / Basis-Universal support for `useGLTF`.
 *
 * The shipped character models carry ETC1S (Basis) GPU textures (see
 * `tools/build_ktx2.sh`) so they stay GPU-compressed instead of decoding to
 * tens of MB of VRAM each. drei's `useGLTF` auto-configures the Draco and
 * meshopt decoders but NOT a KTX2 loader, so we attach our own.
 *
 * The Basis transcoder (`basis_transcoder.{js,wasm}`) is self-hosted at
 * `/public/basis/` rather than pulled from a CDN, so the scene loads offline.
 */
const ktx2Loader = new KTX2Loader().setTranscoderPath('/basis/')
let supportDetected = false

/** Detect the GPU's transcode targets once — needs the live renderer. */
function ensureSupport(gl: WebGLRenderer) {
  if (!supportDetected) {
    ktx2Loader.detectSupport(gl)
    supportDetected = true
  }
}

/**
 * Stable reference so drei's `useGLTF` loader cache keys match across calls.
 * `useDraco`/`useMeshOpt` stay at their defaults (both on) — a single uniform
 * call works for every model regardless of which geometry codec it uses.
 */
function attachKtx2(loader: GLTFLoader) {
  loader.setKTX2Loader(ktx2Loader)
}

/** `useGLTF` for a KTX2-textured model. Drop-in replacement for `useGLTF`. */
export function useKtx2Gltf(url: string) {
  const gl = useThree((s) => s.gl)
  ensureSupport(gl)
  return useGLTF(url, true, true, attachKtx2)
}

/**
 * Starts fetching `url` ahead of any component actually rendering it, through
 * the same KTX2/Draco/meshopt-configured loader `useKtx2Gltf` uses — sharing
 * `useLoader`'s cache means a subsequent `useKtx2Gltf(url)` call resolves
 * from cache (or simply suspends on the same in-flight promise) rather than
 * re-fetching. `gl` is required so the transcoder's supported-format
 * detection has run at least once before transcoding starts; callers that
 * already hold a live renderer (e.g. via `useThree`) should pass it.
 */
export function preloadKtx2Gltf(url: string, gl: WebGLRenderer) {
  ensureSupport(gl)
  useGLTF.preload(url, true, true, attachKtx2)
}
