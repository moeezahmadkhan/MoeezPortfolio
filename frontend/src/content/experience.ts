export type Role = { period: string; title: string; org: string; bullets: string[] }

export const experience: Role[] = [
  {
    period: 'Jan 2026 — present',
    title: 'AI Developer',
    org: 'Ecommerce Steem',
    bullets: [
      'Building low-latency AI chat over Whoop wearable data.',
      'Turning live biometric streams into real-time health and performance insight.',
      'Tuning LLM prompt and context strategy against a hard hardware budget.',
    ],
  },
  {
    period: '2025 — present',
    title: 'AI & Computer Vision Developer',
    org: 'QUIDSol',
    bullets: [
      'Built Project Horus: YOLO/SCRFD detection with ArcFace identification over FAISS.',
      'Built Silmaril AI: financial-metric extraction and founder insight from pitch decks.',
      'Hardened both pipelines for varied lighting and high-throughput processing.',
    ],
  },
  {
    period: '2024 — 2025',
    title: "Teacher's Assistant",
    org: 'Information Technology University',
    bullets: [
      'Mentoring MS students in Agentic AI — multi-agent systems and RAG.',
      'Running workshops on agent orchestration and scalable workflows.',
      'Reviewing student projects up to production engineering standards.',
    ],
  },
]
