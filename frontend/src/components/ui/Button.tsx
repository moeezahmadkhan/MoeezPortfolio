import type { AnchorHTMLAttributes, ReactNode } from 'react'
import './Button.css'

type ButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: 'solid' | 'ghost'
  children: ReactNode
}

export function Button({ variant = 'solid', children, className = '', ...rest }: ButtonProps) {
  return (
    <a className={`btn btn--${variant} ${className}`.trim()} {...rest}>
      {children}
    </a>
  )
}
