export type SkillGroup = { title: string; items: string[] }

export const skills: SkillGroup[] = [
  {
    title: 'MLOps & orchestration',
    items: ['Docker', 'Kafka', 'QLoRA fine-tuning', 'n8n automation', 'CI/CD'],
  },
  {
    title: 'Model deployment & serving',
    items: ['FastAPI', 'Nginx', 'LLM serving & quantization', 'Edge deployment', 'REST APIs'],
  },
  {
    title: 'Cloud & infrastructure',
    items: ['AWS (EC2 · Bedrock)', 'GCP', 'Linux', 'FAISS', 'PostgreSQL'],
  },
  { title: 'Languages', items: ['Python', 'C++', 'SQL', 'Bash', 'TypeScript'] },
]
