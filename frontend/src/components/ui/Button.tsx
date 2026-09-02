import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { useScramble } from '../../lib/useScramble'
import './Button.css'

type ButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: 'solid' | 'ghost'
  children: ReactNode
}

export function Button({ variant = 'solid', children, className = '', ...rest }: ButtonProps) {
  // The decode rewrites the element's text, so it can only take a button whose
  // label IS text. One with an icon or a nested element beside its words keeps
  // the plain hover it has always had.
  const label = typeof children === 'string' ? children : ''
  const scramble = useScramble(label)
  return (
    // The decode's props go on FIRST so a caller's own `aria-label`, `ref` or
    // `onMouseEnter` still wins. A button that needs one of those needs it more
    // than it needs the flourish.
    <a className={`btn btn--${variant} ${className}`.trim()} {...(label ? scramble : {})} {...rest}>
      {children}
    </a>
  )
}
