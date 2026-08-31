import * as THREE from 'three'

/**
 * Apply the candlelit-archive material finish to a cloned character scene, in
 * place. Mirrors the treatment baked into WizardModel so every figurine in the
 * scene reads the same: a crisp PBR finish, a faint warm emissive so the gold
 * lighting catches, and `Glow_*` materials left untouched (their baked emissive
 * is what Bloom turns into magic).
 *
 * Call on a `scene.clone(true)` — never the cached original, since it mutates
 * materials and toggles shadow flags.
 */
export function applyWizardingMaterials(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    mesh.receiveShadow = true
    const mat = mesh.material as THREE.MeshStandardMaterial
    if (!mat) return
    mat.envMapIntensity = 1.15
    if (mat.roughness !== undefined && !Number.isNaN(mat.roughness)) {
      mat.roughness = Math.min(mat.roughness, 0.35)
    }
    if (mat.metalness !== undefined && !Number.isNaN(mat.metalness)) {
      mat.metalness = Math.max(mat.metalness, 0.05)
    }
    if (mat.name?.startsWith('Glow')) {
      mat.needsUpdate = true
    } else {
      mat.emissive = new THREE.Color('#3a2a12')
      mat.emissiveIntensity = 0.24
    }
  })
}

/** Dispose every geometry under a cloned model root (use in an unmount cleanup). */
export function disposeModel(root: THREE.Object3D): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh && m.geometry) m.geometry.dispose?.()
  })
}

/**
 * Clone each mesh's material(s) in place, so the caller owns them outright.
 *
 * `Object3D#clone(true)` deep-clones the node hierarchy, but `Mesh#copy()`
 * (three 0.169) assigns `this.material = Array.isArray(source.material) ?
 * source.material.slice() : source.material` — the same material instance(s)
 * as the source, not copies. A `.slice()` of an array is a new array of the
 * *same* material references. So `scene.clone(true)` on a cached GLTF scene
 * still shares every material with that cache entry; mutating a "clone"
 * mutates the original too. Call this right after `clone(true)`, before any
 * per-instance material mutation, to break that sharing.
 *
 * Geometry is deliberately left alone — it stays shared with the cache, and
 * callers must not dispose it (see `disposeMaterials` below).
 */
export function cloneMaterials(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh || !mesh.material) return
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map((m) => m.clone())
      : mesh.material.clone()
  })
}

/**
 * Dispose every material under a root whose materials this component owns
 * (i.e. a root that has been through `cloneMaterials`). Never call this on a
 * root still sharing materials with the GLTF cache — it would dispose the
 * cache's originals out from under every other consumer.
 *
 * Geometries are NOT disposed here: even after `cloneMaterials`, geometry
 * remains shared with the cached GLTF scene, and other mounts (or a future
 * remount) still read it.
 */
export function disposeMaterials(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh || !mesh.material) return
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((m) => m.dispose())
    } else {
      mesh.material.dispose()
    }
  })
}
