import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

const ease = [0.16, 1, 0.3, 1] as const

/** Blur + rise reveal that fires once when scrolled into view. */
export function Reveal({
  children,
  delay = 0,
  y = 34,
  className,
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: 'blur(10px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-12% 0px' }}
      transition={{ duration: 1, ease, delay }}
    >
      {children}
    </motion.div>
  )
}

/** Heading whose words "ignite" one after another, like casting Lumos along the line. */
export function IgniteHeading({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const words = text.split(' ')
  return (
    <motion.h2
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-15% 0px' }}
      variants={{ show: { transition: { staggerChildren: 0.09 } } }}
      aria-label={text}
    >
      {words.map((w, i) => (
        <motion.span
          key={i}
          aria-hidden
          style={{ display: 'inline-block', marginRight: '0.28em' }}
          variants={{
            hidden: { opacity: 0, y: 18, filter: 'blur(8px)', color: '#5a4a3a' },
            show: {
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
              color: 'var(--parchment)',
              transition: { duration: 0.8, ease },
            },
          }}
        >
          {w}
        </motion.span>
      ))}
    </motion.h2>
  )
}
