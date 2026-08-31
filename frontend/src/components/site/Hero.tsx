import { profile } from '../../content'
import { Button } from '../ui/Button'
import { Magnetic } from '../ui/Magnetic'
import './Hero.css'

export function Hero() {
  const github = profile.socials.find((s) => s.label === 'GitHub')
  return (
    <section id="top" className="hero" aria-label="Introduction">
      <div className="hero__inner">
        <p className="hero__role">{profile.role}</p>
        <h1 className="hero__name">{profile.name}</h1>
        <p className="hero__thesis">{profile.thesis}</p>
        <div className="hero__actions">
          <Magnetic>
            <Button href="#work">View work</Button>
          </Magnetic>
          <Magnetic>
            <Button href={profile.cvUrl} variant="ghost" target="_blank" rel="noreferrer">
              Résumé
            </Button>
          </Magnetic>
          {github && (
            <Magnetic>
              <Button href={github.href} variant="ghost" target="_blank" rel="noreferrer">
                GitHub
              </Button>
            </Magnetic>
          )}
        </div>
        <p className="hero__meta">{profile.location}</p>
      </div>
      <a className="hero__cue" href="#about" aria-label="Scroll to About">
        <span aria-hidden="true">↓</span>
      </a>
    </section>
  )
}
