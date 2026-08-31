export type SkillGroup = { title: string; items: string[] }

export const skills: SkillGroup[] = [
  {
    title: 'AI/ML & Orchestration',
    items: [
      'Agentic AI',
      'RAG Pipelines',
      'Model Context Protocol (MCP)',
      'LLM Fine-Tuning (QLoRA)',
      'Workflow Automation (n8n)',
      'LLM Serving & Quantization',
      'FAISS Vector DB',
    ],
  },
  {
    title: 'Backend Development',
    items: [
      'Node.js',
      'Express',
      'NestJS',
      'TypeScript',
      'Python',
      'FastAPI',
      'C++',
      'SQL',
      'RESTful APIs',
      'WebSocket',
    ],
  },
  {
    title: 'Cloud & Deployment',
    items: [
      'AWS (EC2, Bedrock)',
      'GCP',
      'Docker',
      'Kafka',
      'Nginx',
      'CI/CD Pipelines',
      'Linux/Ubuntu System Administration',
    ],
  },
  {
    title: 'Frontend & Graphics',
    items: [
      'React',
      'Next.js',
      'Flutter',
      'Three.js',
      'Blender',
      'UI/UX Micro-Interactions',
      'State Management',
    ],
  },
]
