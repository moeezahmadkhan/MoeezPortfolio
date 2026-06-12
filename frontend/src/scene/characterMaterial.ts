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
