import { useMemo } from 'react'
import { Nav, SECTION_IDS } from './components/layout/Nav'
import { Footer } from './components/layout/Footer'
import { Hero } from './components/site/Hero'
import { About } from './components/site/About'
import { Work } from './components/site/Work'
import { Skills } from './components/site/Skills'
import { Experience } from './components/site/Experience'
import { Contact } from './components/site/Contact'
import { StageMount } from './three/StageMount'
import { ChatDock } from './components/chat/ChatDock'
import { useScrollTracker } from './lib/scrollState'
import { useSectionObserver } from './lib/useSectionObserver'

/**
 * Which section owns the screen, for the accent ramp in tokens.css.
 *
 * A third observer alongside Nav's and Stage's. They already run two, each
 * cheap and each answering for its own concern; sharing one would mean
 * threading the answer through props from a component with no other reason to
 * know it.
 */
function useAccentSection(): string {
  const ids = useMemo(() => SECTION_IDS, [])
  return useSectionObserver(ids)
}

export default function App() {
  useScrollTracker()
  const section = useAccentSection()
  return (
    /* The ramp cannot live on <html> or <body> — Chrome accepts the transition
       declaration on both and never fires it (see tokens.css). This wrapper is
       `display: contents`, so it hosts the property without existing in layout. */
    <div className="app" data-section={section || undefined}>
      <StageMount />
      <Nav />
      <main id="main">
        <Hero />
        <About />
        <Work />
        <Skills />
        <Experience />
        <Contact />
      </main>
      <Footer />
      <ChatDock />
    </div>
  )
}
