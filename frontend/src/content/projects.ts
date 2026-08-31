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

// To attach links to a project, add a `links` object to its entry:
//   links: {
//     repo: 'https://github.com/moeezahmadkhan/<repo>',   // source code
//     demo: 'https://<live-url>',                          // live deployment
//     writeup: 'https://<article-url>',                    // optional write-up
//   }
// Every key is optional — include only the ones that exist. Omit `links`
// entirely when there is nothing to link to; the card renders fine without it.

export const projects: Project[] = [
  {
    slug: 'horus',
    name: 'Project Horus',
    outcome:
      'An automated pipeline that identifies students from live video, matching faces against an enrolled index in real time.',
    detail: [
      'Detects faces in real time with YOLO and SCRFD, then generates ArcFace embeddings for each detection.',
      'Matches those embeddings against a FAISS vector index to assign identity.',
      'Tuned for reliability across varied edge-case environments and high-throughput processing.',
    ],
    stack: ['YOLO', 'SCRFD', 'ArcFace', 'FAISS'],
    featured: true,
  },
  {
    slug: 'silmaril',
    name: 'Silmaril AI',
    outcome:
      'A strategic platform for venture capital that extracts financial metrics from pitch decks and turns them into structured insight.',
    detail: [
      'Parses pitch decks with an AI-driven engine that extracts financial metrics automatically.',
      'Delivers automated growth recommendations alongside Company Scores and Founder insights.',
    ],
    stack: ['AI-driven parsing engine', 'Financial metric extraction'],
    featured: true,
  },
  {
    slug: 'wearable-ai-chat',
    name: 'Wearable AI chat',
    outcome:
      'AI chat software for high-end wearables (Whoop), built for ultra-low-latency, lightweight inference at the edge.',
    detail: [
      'Focused on ultra-low-latency responses so the chat experience keeps pace with live wearable data.',
      'Runs lightweight edge inference suited to wearable hardware constraints.',
    ],
    stack: ['Edge inference', 'Low-latency AI chat'],
    featured: true,
  },
  {
    slug: 'cv-intelligence-platform',
    name: 'CV intelligence platform',
    outcome:
      'A full-stack computer vision platform that tracks humans and animals in real time and turns the feed into dashboard analytics.',
    detail: [
      'Delivers context-aware AI insights drawn from the live video feed.',
      'Surfaces results through real-time dashboard analytics.',
    ],
    stack: ['Computer vision', 'Real-time dashboards'],
    featured: false,
  },
  {
    slug: 'query-sphere',
    name: 'Query Sphere',
    outcome:
      'A Flutter-based AI community app with real-time messaging and smart search, backed by Firebase.',
    detail: [
      'Real-time messaging layer synced across devices.',
      'Smart search querying across the community content.',
    ],
    stack: ['Flutter', 'Firebase'],
    links: { repo: 'https://github.com/moeezahmadkhan/querysphere' },
    featured: false,
  },
  {
    slug: 'stay-booking',
    name: 'Stay-booking platform',
    outcome:
      'A full MERN-stack booking application with property listing, dashboard management, and secure session authentication.',
    detail: [
      'Dynamic property booking pipelines from listing through checkout.',
      'Dashboard management layers for hosts, secured with JWT session authentication.',
    ],
    stack: ['MongoDB', 'Express', 'React', 'Node.js', 'JWT'],
    featured: false,
  },
  {
    slug: '3d-portfolio',
    name: 'Interactive 3D Portfolio',
    outcome:
      'A personal 3D portfolio site with a wizarding-themed, gamified environment showcasing production engineering projects.',
    detail: [
      'Built with Three.js and custom Blender models for a premium interactive feel.',
      'Includes an integrated AI chatbot that handles contextual visitor questions within the experience.',
    ],
    stack: ['Three.js', 'Blender'],
    links: { demo: 'https://moeezahmadkhan.com' },
    featured: false,
  },
]
