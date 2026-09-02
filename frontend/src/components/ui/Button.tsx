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
    <a className={`btn btn--${variant} ${className}`.trim()} {...rest} {...(label ? scramble : {})}>
      {children}
    </a>
  )
}
