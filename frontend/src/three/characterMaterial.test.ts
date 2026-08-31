import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { cloneMaterials, disposeMaterials } from './characterMaterial'

describe('cloneMaterials', () => {
  it('isolates a cloned mesh from the cached original material', () => {
    // Mirrors what HeroWizard actually does: a "cached" mesh (standing in for
    // the GLTF cache's scene), then a `clone(true)` of it — which, per three's
    // Mesh#copy(), shares the same material reference as the original.
    const cached = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshStandardMaterial({ opacity: 1, transparent: true }),
    )
    const instance = cached.clone(true)
    expect(instance.material).toBe(cached.material) // sanity: clone(true) does share it

    cloneMaterials(instance)

    expect(instance.material).not.toBe(cached.material)

    // This is the mutation HeroWizard does every frame.
    ;(instance.material as THREE.MeshStandardMaterial).opacity = 0.2

    expect((cached.material as THREE.MeshStandardMaterial).opacity).toBe(1)
    expect((instance.material as THREE.MeshStandardMaterial).opacity).toBe(0.2)
  })

  it('isolates every entry of an array-material mesh', () => {
    const cached = new THREE.Mesh(new THREE.BoxGeometry(), [
      new THREE.MeshStandardMaterial({ opacity: 1 }),
      new THREE.MeshStandardMaterial({ opacity: 1 }),
    ])
    const instance = cached.clone(true)

    cloneMaterials(instance)

    const instanceMats = instance.material as THREE.MeshStandardMaterial[]
    const cachedMats = cached.material as THREE.MeshStandardMaterial[]
    instanceMats[0].opacity = 0.5
    instanceMats[1].opacity = 0.7

    expect(cachedMats[0].opacity).toBe(1)
    expect(cachedMats[1].opacity).toBe(1)
    expect(instanceMats[0]).not.toBe(cachedMats[0])
    expect(instanceMats[1]).not.toBe(cachedMats[1])
  })

  it('isolates every mesh in a multi-node hierarchy', () => {
    const cached = new THREE.Group()
    const child = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshStandardMaterial({ opacity: 1 }),
    )
    cached.add(child)
    const instance = cached.clone(true)
    const instanceChild = instance.children[0] as THREE.Mesh

    cloneMaterials(instance)

    ;(instanceChild.material as THREE.MeshStandardMaterial).opacity = 0.1
    expect((child.material as THREE.MeshStandardMaterial).opacity).toBe(1)
  })

  it('leaves geometry shared with the cache — it is not cloned', () => {
    const geometry = new THREE.BoxGeometry()
    const cached = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial())
    const instance = cached.clone(true)

    cloneMaterials(instance)

    expect(instance.geometry).toBe(cached.geometry)
  })

  it('preserves Glow_* material pass-through: cloning does not rename or drop them', () => {
    const glowMat = new THREE.MeshStandardMaterial()
    glowMat.name = 'Glow_wand'
    const cached = new THREE.Mesh(new THREE.BoxGeometry(), glowMat)
    const instance = cached.clone(true)

    cloneMaterials(instance)

    expect((instance.material as THREE.MeshStandardMaterial).name).toBe('Glow_wand')
    expect(instance.material).not.toBe(cached.material)
  })
})

describe('disposeMaterials', () => {
  it('disposes every owned material under the root', () => {
    const matA = new THREE.MeshStandardMaterial()
    const matB = new THREE.MeshStandardMaterial()
    let disposedA = false
    let disposedB = false
    matA.addEventListener('dispose', () => {
      disposedA = true
    })
    matB.addEventListener('dispose', () => {
      disposedB = true
    })
    const root = new THREE.Group()
    root.add(new THREE.Mesh(new THREE.BoxGeometry(), matA))
    root.add(new THREE.Mesh(new THREE.BoxGeometry(), matB))

    disposeMaterials(root)

    expect(disposedA).toBe(true)
    expect(disposedB).toBe(true)
  })

  it('does not dispose geometry', () => {
    const geometry = new THREE.BoxGeometry()
    let geometryDisposed = false
    geometry.addEventListener('dispose', () => {
      geometryDisposed = true
    })
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial())

    disposeMaterials(mesh)

    expect(geometryDisposed).toBe(false)
  })

  it('disposes every material of an array-material mesh', () => {
    const matA = new THREE.MeshStandardMaterial()
    const matB = new THREE.MeshStandardMaterial()
    let disposedCount = 0
    matA.addEventListener('dispose', () => disposedCount++)
    matB.addEventListener('dispose', () => disposedCount++)
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), [matA, matB])

    disposeMaterials(mesh)

    expect(disposedCount).toBe(2)
  })
})
