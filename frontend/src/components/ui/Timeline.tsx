import type { Role } from '../../content'
import { useNearFocus } from '../../lib/useNearFocus'
import './Timeline.css'

/**
 * One role, its own component so `useNearFocus` is called once per row rather
 * than inside a `.map` callback — the same reason `NavLink` and `CardLink` are
 * their own components.
 */
function TimelineRow({ role }: { role: Role }) {
  const nearRef = useNearFocus<HTMLLIElement>()
  return (
    <li className="timeline__item" ref={nearRef}>
      <p className="timeline__period">{role.period}</p>
      <div className="timeline__body">
        <h3 className="timeline__role">{`${role.title} · ${role.org}`}</h3>
        <ul className="timeline__bullets">
          {role.bullets.map((bullet) => (
            <li key={bullet.slice(0, 24)}>{bullet}</li>
          ))}
        </ul>
      </div>
    </li>
  )
}

export function Timeline({ roles }: { roles: Role[] }) {
  return (
    <ol className="timeline">
      {roles.map((role) => (
        <TimelineRow role={role} key={`${role.org}-${role.period}`} />
      ))}
    </ol>
  )
}
