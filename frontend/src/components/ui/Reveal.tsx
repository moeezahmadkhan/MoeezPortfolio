import { useEffect, useRef, useState, type ReactNode } from 'react'
import { prefersReducedMotion } from '../../lib/media'
import './Reveal.css'

type RevealProps = { children: ReactNode; delay?: number }

export function Reveal({ children, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  // Reduced motion starts shown, so the content is never gated behind an
  // animation that will not run.
  const [shown, setShown] = useState(() => prefersReducedMotion())

  useEffect(() => {
    if (shown || !ref.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [shown])

  return (
    <div
      ref={ref}
      className={`reveal${shown ? ' is-shown' : ''}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
