import type { Role } from '../../content'
import './Timeline.css'

export function Timeline({ roles }: { roles: Role[] }) {
  return (
    <ol className="timeline">
      {roles.map((role) => (
        <li className="timeline__item" key={`${role.org}-${role.period}`}>
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
      ))}
    </ol>
  )
}
