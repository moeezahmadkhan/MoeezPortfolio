import { Nav } from './components/layout/Nav'
import { Footer } from './components/layout/Footer'
import { Hero } from './components/site/Hero'
import { About } from './components/site/About'
import { Work } from './components/site/Work'
import { Skills } from './components/site/Skills'
import { Experience } from './components/site/Experience'
import { Contact } from './components/site/Contact'
import { StageMount } from './three/StageMount'
import { useScrollTracker } from './lib/scrollState'

export default function App() {
  useScrollTracker()
  return (
    <>
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
    </>
  )
}
