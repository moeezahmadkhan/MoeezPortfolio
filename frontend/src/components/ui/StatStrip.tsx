import type { Stat } from '../../content'
import './StatStrip.css'

export function StatStrip({ items }: { items: Stat[] }) {
  return (
    <dl className="stats">
      {items.map((stat) => (
        <div className="stats__item" key={stat.label}>
          <dt className="stats__value">{stat.value}</dt>
          <dd className="stats__label">{stat.label}</dd>
        </div>
      ))}
    </dl>
  )
}
