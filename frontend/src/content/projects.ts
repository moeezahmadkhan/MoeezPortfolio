export type Project = {
  slug: string
  name: string
  outcome: string
  metric?: string
  detail: string[]
  stack: string[]
  shot?: string
  links?: { repo?: string; demo?: string; writeup?: string }
  featured: boolean
}

export const projects: Project[] = [
  {
    slug: 'horus',
    name: 'Project Horus',
    outcome:
      'A face identification pipeline that detects, embeds, and matches people in live video against a searchable index.',
    detail: [
      'YOLO and SCRFD for detection, ArcFace embeddings for identity, FAISS for nearest-neighbour search across the enrolled set.',
      'Hardened against the conditions that actually break these systems in the field: uneven lighting, motion blur, and high-throughput streams.',
    ],
    stack: ['Python', 'YOLO', 'SCRFD', 'ArcFace', 'FAISS', 'OpenCV'],
    featured: true,
  },
  {
    slug: 'silmaril',
    name: 'Silmaril AI',
    outcome:
      'Pitch-deck analysis that pulls financial metrics and founder signals out of investor decks and matches them against investor criteria.',
    detail: [
      'Ingests and parses decks, runs LLM extraction over the contents, and embeds the result so founders and investors can be matched.',
      'Shipped as a FastAPI service behind a React front end with a Kanban view of the deal pipeline.',
    ],
    stack: ['FastAPI', 'React', 'LLM extraction', 'Embeddings', 'PostgreSQL'],
    featured: true,
  },
  {
    slug: 'whoop-chat',
    name: 'Wearable AI chat',
    outcome:
      'Low-latency conversational AI over live Whoop biometric streams, turning raw signals into health and performance insight.',
    detail: [
      'Parses a live biometric stream into a real-time store the model can query without a round trip to cold storage.',
      'Prompt and context strategy tuned to the hardware budget — the constraint is latency and context size, not model quality.',
    ],
    stack: ['Python', 'LLM serving', 'Streaming data', 'Prompt engineering'],
    featured: true,
  },
  {
    slug: 'query-sphere',
    name: 'Query Sphere',
    outcome:
      'A cross-platform community app with real-time messaging, built on Flutter and Firebase.',
    detail: [
      'Realtime sync across devices with Firebase as the backing store.',
      'Full client build for both mobile platforms from one codebase.',
    ],
    stack: ['Flutter', 'Firebase', 'Realtime'],
    links: { repo: 'https://github.com/moeezahmadkhan/querysphere' },
    featured: false,
  },
  {
    slug: 'stay-booking',
    name: 'Stay-booking platform',
    outcome:
      'A full MERN booking application with property management and JWT-secured authentication.',
    detail: [
      'Property listing, search, and booking flows backed by MongoDB.',
      'Token-based auth with protected routes across an Express API.',
    ],
    stack: ['MongoDB', 'Express', 'React', 'Node', 'JWT'],
    featured: false,
  },
]
