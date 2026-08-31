export type Stat = { value: string; label: string }
export type Social = { label: string; href: string }

export type Profile = {
  name: string
  role: string
  thesis: string
  bio: string[]
  location: string
  email: string
  cvUrl: string
  portrait: string
  stats: Stat[]
  socials: Social[]
}

export const profile: Profile = {
  name: 'Moeez Ahmad Khan',
  role: 'AI/ML Engineer',
  thesis:
    'I build computer-vision and LLM systems, and the infrastructure that keeps them running in production.',
  bio: [
    'I work across the whole span of an AI product: the model, the serving layer, and the interface people actually touch. Most of my work lives in computer vision and LLM systems — face recognition pipelines, document understanding, and low-latency chat over live biometric data.',
    'I studied at Information Technology University, Lahore (BSCS), and I now assist on its MS Agentic AI course while shipping production systems for two teams.',
  ],
  location: 'Lahore, Pakistan · open to remote',
  email: 'kmoeez2018@gmail.com',
  cvUrl: '/Moeez_Ahmad_Khan_CV.pdf',
  portrait: '/moeez.jpeg',
  stats: [
    { value: 'CV + LLM', label: 'Core focus' },
    { value: '3', label: 'Teams shipped for' },
    { value: 'Lahore, PK', label: 'Based in' },
  ],
  socials: [
    { label: 'GitHub', href: 'https://github.com/moeezahmadkhan' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/moeez-ahmad-khan-68a403364/' },
  ],
}
