export type Role = { period: string; title: string; org: string; bullets: string[] }

export const experience: Role[] = [
  {
    period: 'May 2026 – Present',
    title: 'AI Engineer',
    org: 'Ecommerce Steem',
    bullets: [
      'Architecting core AI chat software for high-end wearables (Whoop), focused on ultra-low-latency and lightweight edge inference.',
      'Engineering a full-stack computer vision platform that tracks humans and animals in real time, with context-aware AI insights and real-time dashboard analytics.',
      'Designing interactive full-stack application modules integrated with custom RAG frameworks.',
      'Building automation pipelines with the Model Context Protocol (MCP) to bridge LLMs with external developer tools.',
    ],
  },
  {
    period: 'Nov 2025 – June 2026',
    title: 'AI & Computer Vision Developer',
    org: 'QUIDSol',
    bullets: [
      'Project Horus (student identification): built an automated CV pipeline using YOLO/SCRFD for real-time face detection and ArcFace for identity assignment via FAISS vector matching.',
      'Silmaril AI: built a platform for venture capital with an AI-driven parsing engine that extracts financial metrics from pitch decks and delivers growth recommendations, Company Scores, and Founder insights.',
      'Improved pipeline reliability by optimizing asynchronous data flows across varied edge-case environments.',
      'Managed database logging and results triage for high-speed processing.',
    ],
  },
  {
    period: 'Nov 2025 – Feb 2026',
    title: "Teacher's Assistant",
    org: 'Information Technology University',
    bullets: [
      'Mentored graduate-level students in agentic AI, including autonomous multi-agent systems and RAG deployment.',
      'Facilitated technical workshops on agent orchestration and evaluated student-led workflows for production-level scalability.',
    ],
  },
]
