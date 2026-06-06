export type Project = {
  name: string
  incantation: string // a playful "spell name"
  blurb: string
  tags: string[]
  glyph: string
}

export const projects: Project[] = [
  {
    name: 'Real-Time Vision · Attendance',
    incantation: 'Oculus Reparo',
    blurb:
      'An edge computer-vision pipeline: motion-triggered capture, on-device person detection and re-identification on a palm-sized NPU — real-time, fully local, no footage leaving the device.',
    tags: ['Edge NPU', 'Detection', 'Re-ID', 'FAISS', 'Real-time CV'],
    glyph: '👁',
  },
  {
    name: 'Silmaril AI',
    incantation: 'Legilimens',
    blurb:
      'A strategic platform for investors. An AI-driven parsing engine extracts financial metrics from pitch decks and surfaces automated growth recommendations and founder insights.',
    tags: ['NLP', 'LLMs', 'Document Parsing', 'Analytics'],
    glyph: '💎',
  },
  {
    name: 'Airbnb Replica',
    incantation: 'Domus Revelio',
    blurb:
      'A full MERN-stack application with property management and secure JWT authentication — research instincts brought into production-grade web engineering.',
    tags: ['MongoDB', 'Express', 'React', 'Node', 'JWT'],
    glyph: '🏰',
  },
  {
    name: 'Query Sphere',
    incantation: 'Protego Totalum',
    blurb:
      'A Flutter community app with real-time messaging and Firebase integration — cross-platform conjuring with live sync.',
    tags: ['Flutter', 'Firebase', 'Realtime', 'Mobile'],
    glyph: '🔮',
  },
]

export type SpellGroup = { title: string; spells: string[] }

export const spellbook: SpellGroup[] = [
  {
    title: 'MLOps & Orchestration',
    spells: ['Docker', 'Kafka', 'QLoRA Fine-Tuning', 'n8n Automation', 'CI/CD'],
  },
  {
    title: 'Model Deployment & Serving',
    spells: ['FastAPI', 'Nginx', 'LLM Serving & Quantization', 'Edge Deployment', 'REST APIs'],
  },
  {
    title: 'Cloud & Infrastructure',
    spells: ['AWS (EC2 · Bedrock)', 'GCP', 'Linux / Ubuntu', 'FAISS', 'PostgreSQL'],
  },
  {
    title: 'Ancient Tongues',
    spells: ['Python', 'C++', 'SQL', 'Bash'],
  },
]

export type Chronicle = {
  era: string
  role: string
  house: string
  deeds: string[]
}

export const chronicles: Chronicle[] = [
  {
    era: 'Jan 2026 — Present',
    role: 'AI Developer',
    house: 'Ecommerce Steem',
    deeds: [
      'Architecting low-latency AI chat software for Whoop wearables.',
      'Processing live biometric data into real-time health & performance insights.',
      'Optimizing LLM prompt strategies & context management within hardware limits.',
    ],
  },
  {
    era: '2025 — Present',
    role: 'AI & Computer Vision Developer',
    house: 'QUIDSol',
    deeds: [
      'Built Project Horus: YOLO/SCRFD detection + ArcFace identification via FAISS.',
      'Built Silmaril AI: financial-metric extraction & founder insights from pitch decks.',
      'Hardened pipelines for reliability across varied lighting and high-speed processing.',
    ],
  },
  {
    era: '2024 — 2025',
    role: "Teacher's Assistant",
    house: 'Information Technology University',
    deeds: [
      'Mentoring MS students in Agentic AI — multi-agent systems and RAG.',
      'Running workshops on agent orchestration and scalable workflows.',
      'Refining student AI projects to production-level engineering standards.',
    ],
  },
]

export const familiar = {
  greeting:
    'Well met, traveller. I am the Familiar of these halls — I keep my master Moeez’s secrets. Ask, and I shall reveal his craft.',
  starters: [
    'What are his best projects?',
    'Is he a fit for my role?',
    'What’s his tech stack?',
    'Is he available for hire?',
  ],
}
