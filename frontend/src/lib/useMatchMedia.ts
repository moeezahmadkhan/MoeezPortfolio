import { useEffect, useState } from 'react'

function readMatch(query: string): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(query).matches
}

/**
 * Live boolean for a media query, reactive to the query's own `change` event —
 * not a generic `resize` listener. `change` only fires when the match value
 * actually flips (e.g. crossing a `min-width` breakpoint), so a component
 * using this re-renders on breakpoint crossings only, never on every resize
 * pixel.
 */
export function useMatchMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => readMatch(query))

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(query)
    setMatches(mql.matches)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}
