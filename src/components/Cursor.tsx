import { useEffect, useRef } from 'react'
import './Cursor.css'

/** A glowing wand-tip that trails the pointer and drips golden sparkles when it moves. */
export function Cursor() {
  const glow = useRef<HTMLDivElement>(null)
  const layer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Skip on touch / coarse pointers.
    if (window.matchMedia('(pointer: coarse)').matches) return

    let mx = window.innerWidth / 2
    let my = window.innerHeight / 2
    let gx = mx
    let gy = my
    let lastSpawn = 0
    let lastX = mx
    let lastY = my
    let raf = 0
    let hovering = false

    const onMove = (e: PointerEvent) => {
      mx = e.clientX
      my = e.clientY
      const t = e.target as HTMLElement
      hovering = !!t.closest('a, button, .spell-card, .tilt')
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    const spawn = (x: number, y: number) => {
      if (!layer.current) return
      const s = document.createElement('span')
      s.className = 'cursor-spark'
      const size = 2 + Math.random() * 4
      const ox = (Math.random() - 0.5) * 14
      const oy = (Math.random() - 0.5) * 14
      s.style.cssText = `left:${x + ox}px;top:${y + oy}px;width:${size}px;height:${size}px;`
      layer.current.appendChild(s)
      setTimeout(() => s.remove(), 900)
    }

    const tick = (now: number) => {
      gx += (mx - gx) * 0.18
      gy += (my - gy) * 0.18
      if (glow.current) {
        glow.current.style.transform = `translate(${gx}px, ${gy}px) translate(-50%, -50%) scale(${hovering ? 1.9 : 1})`
        glow.current.classList.toggle('cursor-glow--hover', hovering)
      }
      const moved = Math.hypot(mx - lastX, my - lastY)
      if (moved > 3 && now - lastSpawn > 22) {
        spawn(gx, gy)
        lastSpawn = now
        lastX = mx
        lastY = my
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    document.body.classList.add('has-wand-cursor')

    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
      document.body.classList.remove('has-wand-cursor')
    }
  }, [])

  return (
    <>
      <div ref={layer} className="cursor-layer" aria-hidden />
      <div ref={glow} className="cursor-glow" aria-hidden />
    </>
  )
}
