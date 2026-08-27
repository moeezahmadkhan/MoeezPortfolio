import { useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
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
