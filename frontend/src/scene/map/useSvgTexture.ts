import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'

/**
 * Rasterize an inline SVG string to a THREE texture once, off-screen. Used for
 * the map-table parchment + ink layers. Same-origin Blob URL → untainted canvas,
 * anisotropy maxed so the ink stays crisp at the table's glancing angle, and the
 * texture is disposed on unmount / when the SVG changes.
 */
export function useSvgTexture(svg: string, px = 2048): THREE.Texture | null {
  const gl = useThree((s) => s.gl)
  const [tex, setTex] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    let disposed = false
    let texture: THREE.CanvasTexture | null = null
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)
      if (disposed) return
      const ar = img.width / img.height || 700 / 460
      const w = px
      const h = Math.round(px / ar)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0, w, h)
      texture = new THREE.CanvasTexture(canvas)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = gl.capabilities.getMaxAnisotropy()
      texture.needsUpdate = true
      setTex(texture)
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url

    return () => {
      disposed = true
      texture?.dispose()
    }
  }, [svg, px, gl])

  return tex
}
