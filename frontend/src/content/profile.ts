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
  role: 'AI/ML Developer',
  thesis:
    'I design low-latency backend APIs, autonomous multi-agent systems, and real-time computer vision pipelines, and take them from model orchestration through containerized cloud deployment.',
  bio: [
    "I'm currently an AI Engineer at Ecommerce Steem, where I'm building AI chat software for Whoop wearables, a computer vision platform that tracks humans and animals in real time, and automation pipelines that connect LLMs to external tools using the Model Context Protocol.",
    "Before that, I worked as an AI & Computer Vision Developer at QUIDSol, building face-identification and pitch-deck-analysis pipelines, and as a Teacher's Assistant at Information Technology University, mentoring graduate students in agentic AI. I hold a BSCS from ITU (2021–2025), specializing in agentic AI, computer vision, and reinforcement learning.",
  ],
  location: 'Lahore, Pakistan',
  email: 'kmoeez2018@gmail.com',
  cvUrl: '/Moeez_Ahmad_Khan_CV.pdf',
  portrait: '/moeez.jpeg',
  stats: [
    { value: 'AI Engineer', label: 'Currently at Ecommerce Steem' },
    { value: 'BSCS, ITU', label: '2021 – 2025' },
    { value: 'Lahore, PK', label: 'Based in' },
  ],
  socials: [
    { label: 'GitHub', href: 'https://github.com/moeezahmadkhan' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/moeez-ahmad-khan-68a403364/' },
    { label: 'Website', href: 'https://moeezahmadkhan.com' },
  ],
}
