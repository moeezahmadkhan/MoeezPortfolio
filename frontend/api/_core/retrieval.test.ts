import { describe, expect, it } from 'vitest'
import realCorpus from './corpus.generated.json'
import { COVERAGE_FLOOR, retrieve, scoreCorpus, tokenize, type Chunk } from './retrieval'

const corpus: Chunk[] = [
  {
    id: 'a',
    source: 'x.md',
    heading: 'Project: Horus',
    text: 'Face detection with YOLO and SCRFD, identity with ArcFace embeddings, search over a FAISS index.',
    tokens: 20,
  },
  {
    id: 'b',
    source: 'x.md',
    heading: 'Project: Query Sphere',
    text: 'A Flutter and Firebase community app with realtime messaging across devices.',
    tokens: 14,
  },
  {
    id: 'c',
    source: 'x.md',
    heading: 'Availability',
    text: 'I am open to remote work and answer email quickly.',
    tokens: 12,
  },
]

const real = realCorpus as Chunk[]

/** The heading of the top-ranked chunk, or null when retrieval declined to answer. */
function top(question: string): string | null {
  return retrieve(question, real, 3)[0]?.heading ?? null
}

describe('tokenize', () => {
  it('lowercases, splits, and drops stopwords', () => {
    expect(tokenize('The FAISS index and a YOLO model')).toEqual(['faiss', 'index', 'yolo', 'model'])
  })

  it('returns nothing for an empty string', () => {
    expect(tokenize('   ')).toEqual([])
  })

  it('folds the endings that would otherwise hide a match', () => {
    // "How does Horus match faces?" must reach a chunk that says "Matches" and "faces".
    expect(tokenize('matches matching matched')).toEqual(['match', 'match', 'match'])
    expect(tokenize('faces face')).toEqual(['face', 'face'])
    expect(tokenize('actually plainly quickly')).toEqual(['actual', 'plain', 'quick'])
    // A token keeps an internal dot so "node.js" survives; it must not keep the
    // sentence's full stop, or "broke in production." never reaches "production".
    expect(tokenize('broke in production.')).toEqual(['broke', 'production'])
    expect(tokenize('node.js and C++')).toEqual(['node.js', 'c++'])
    expect(tokenize('pipelines pipeline')).toEqual(['pipeline', 'pipeline'])
  })

  it('does not maul short words or words that merely end in s', () => {
    expect(tokenize('FAISS things string based speed')).toEqual([
      'faiss',
      'thing',
      'string',
      'based',
      'speed',
    ])
  })

  it('drops conversational verbs that carry no topic', () => {
    // "Do you know Docker?" is a question about Docker and nothing else. If "know"
    // survives it looks exactly like an unanswerable term and drags coverage down —
    // measured: "Do you use FastAPI?" scored 0.40 and was refused, while FastAPI is
    // right there in his skills.
    expect(tokenize('Do you know Docker?')).toEqual(['docker'])
    expect(tokenize('Tell me what you think about Rust')).toEqual(['rust'])
    expect(tokenize('What do you use, have you used, are you using MCP?')).toEqual(['mcp'])
  })
})

describe('retrieve', () => {
  it('ranks the chunk that shares the query terms first', () => {
    expect(retrieve('tell me about FAISS and ArcFace', corpus, 1)[0].id).toBe('a')
  })

  it('matches on the heading as well as the body', () => {
    expect(retrieve('query sphere', corpus, 1)[0].id).toBe('b')
  })

  it('returns at most k chunks', () => {
    expect(retrieve('flutter faiss remote', corpus, 2)).toHaveLength(2)
  })

  it('returns an empty list for a query with no shared terms', () => {
    expect(retrieve('quantum tunnelling in semiconductors', corpus)).toEqual([])
  })

  it('returns an empty list for an empty query', () => {
    expect(retrieve('', corpus)).toEqual([])
  })

  it('returns an empty list for an empty corpus', () => {
    expect(retrieve('faiss', [])).toEqual([])
  })
})

describe('retrieve over the real corpus', () => {
  it('finds the project a visitor names', () => {
    expect(top('How does Project Horus match faces?')).toBe('Project: Project Horus')
    expect(top('What is Silmaril AI?')).toBe('Project: Silmaril AI')
    expect(top('Tell me about Query Sphere')).toBe('Project: Query Sphere')
  })

  it('finds the role, the skills, and the profile', () => {
    expect(top('What do you do at Ecommerce Steem?')).toMatch(/Ecommerce Steem/)
    expect(top('Do you know Docker and Kafka?')).toBe('Skills')
    expect(top('Are you based in Lahore?')).toBe('Who I am')
    // "Flutter-based" tokenises to the same "based" as "Based in Lahore", and the
    // Query Sphere chunk is short enough to win the length normalisation. A lexical
    // retriever cannot tell those apart, so the contract is that the right chunk is
    // in the context, not that it is first.
    expect(retrieve('Where are you based?', real, 3).map((c) => c.heading)).toContain('Who I am')
  })

  it('never returns more than k chunks', () => {
    expect(retrieve('computer vision real time pipelines', real, 3).length).toBeLessThanOrEqual(3)
  })
})

// The requirement this file exists for: the bot answers only from Moeez's own
// material. Retrieval is the only place that can say "I have nothing" honestly,
// so the questions it must decline are tested as first-class cases, not as a
// footnote. Returning the least-bad chunk here is how a bot invents an employer.
describe('retrieve declines what the corpus does not cover', () => {
  const offTopic = [
    'what do you think of the Rust borrow checker?',
    'who won the 2022 World Cup?',
    'write me a binary search in Python',
    'what are your salary expectations?',
    'what is the capital of France?',
    'explain how a transformer attention head works',
  ]

  for (const question of offTopic) {
    it(`returns nothing for: ${question}`, () => {
      expect(retrieve(question, real)).toEqual([])
    })
  }
})

describe('retrieve declines a plausible but absent fact', () => {
  // Each of these shares vocabulary with a chunk. None of them is answerable:
  // the technology is not in his skills, or the employer is not in his history.
  const nearMisses = [
    'Have you used Kubernetes in production?',
    'How much PyTorch have you written?',
    'Did you work at Google?',
    'Tell me about your time at Microsoft',
    'What did you build with Rust and WebAssembly?',
    'How many years of Java experience do you have?',
  ]

  for (const question of nearMisses) {
    it(`returns nothing for: ${question}`, () => {
      expect(retrieve(question, real)).toEqual([])
    })
  }
})

// The 20 headings in content/persona/qa.md are the questions Moeez expects to be
// asked — they are the plan's own list, written before any of this existed. If a
// retriever refuses most of them it is not being careful, it is being useless.
describe('retrieve answers the questions qa.md was written to cover', () => {
  // Every one of these names something the notes actually contain. The wrapper
  // words around it ("in plain terms", "actually hard", "right now") are ordinary
  // English that his notes happen not to use, and must not be read as evidence
  // that the question is off-corpus.
  const answerable = [
    'What are you working on right now?',
    'What is Project Horus, in plain terms?',
    'What was actually hard about Horus?',
    'What is Silmaril AI?',
    'What does the Whoop chat system do?',
    'Are you available for work?',
    'What kind of role are you looking for?',
    'What is your experience with LLM serving?',
    'What is your experience with computer vision in production?',
    'How do you approach a system you have never seen before?',
    'Tell me about a time something broke in production.',
    'Why should I hire you over another AI engineer?',
    'What did you do at ITU?',
    'What are you learning right now?',
    'Where are you based and how do you work?',
    'What did you study at Information Technology University?',
  ]

  for (const question of answerable) {
    it(`retrieves something for: ${question}`, () => {
      expect(retrieve(question, real).length).toBeGreaterThan(0)
    })
  }

  it('puts the named project first when one is named', () => {
    expect(top('What is Project Horus, in plain terms?')).toBe('Project: Project Horus')
    expect(top('What was actually hard about Horus?')).toBe('Project: Project Horus')
    expect(top('What did you do at ITU?')).toBe('Who I am')
  })

  // The remaining four ask about him rather than about his work, and the facts
  // corpus has no word in common with them at all — not one that is merely absent,
  // but nothing to retrieve. Refusing is correct until he writes the answer down,
  // which is what qa.md is for. The test below proves the refusal is not permanent.
  const notYetWritten = [
    'What is your strongest area?',
    'What are you weakest at?',
    'Do you prefer research or shipping?',
    'What do you use day to day?',
    'How do I get in touch?',
  ]

  for (const question of notYetWritten) {
    it(`declines, for now: ${question}`, () => {
      expect(retrieve(question, real)).toEqual([])
    })
  }

  it('answers them as soon as he writes the answer down', () => {
    // qa.md chunks carry the question as their heading, so filling one in is what
    // closes the gap. This is the corpus healing itself, not a scoring change.
    const filled: Chunk[] = [
      ...real,
      {
        id: 'qa#touch',
        source: 'content/persona/qa.md',
        heading: 'How do I get in touch?',
        text: 'Email is best. I read everything that arrives and I answer within a day or two.',
        tokens: 22,
      },
    ]
    expect(retrieve('How do I get in touch?', filled, 1)[0].heading).toBe('How do I get in touch?')
  })
})

describe('the relevance floor is calibrated, not guessed', () => {
  const covered = [
    'How does Project Horus match faces?',
    'What is Silmaril AI?',
    'Tell me about Query Sphere',
    'What does the Whoop chat software do?',
    'What do you do at Ecommerce Steem?',
    'Do you know Docker?',
    'Where are you based?',
    'What is your experience with LLM serving and quantization?',
    'Tell me about the computer vision platform',
    'What did you do at QUIDSol?',
    'How do I contact you?',
    'What is the 3D portfolio built with?',
    'Do you use FastAPI?',
    'What is MCP and how do you use it?',
    'Tell me about the booking platform',
    'What did you teach at the university?',
    'What is Project Horus, in plain terms?',
    'What was actually hard about Horus?',
    'Why should I hire you over another AI engineer?',
    'What did you study at Information Technology University?',
  ]

  const uncovered = [
    'what do you think of the Rust borrow checker?',
    'who won the 2022 World Cup?',
    'write me a binary search in Python',
    'what are your salary expectations?',
    'Have you used Kubernetes in production?',
    'How much PyTorch have you written?',
    'Did you work at Google?',
    'Tell me about your time at Microsoft',
    'What did you build with Rust and WebAssembly?',
    'How many years of Java experience do you have?',
    'Do you know Kubernetes?',
    'What is your Terraform experience?',
    'Did you study at MIT?',
    'what is the capital of France?',
    'explain how a transformer attention head works',
    // Not off-topic at all — these are about his own projects, and the notes still
    // do not answer them. Half a question is not coverage.
    'How does Project Horus scale?',
    'Is the Whoop chat deployed to production?',
    'How accurate is the face recognition in Horus?',
  ]

  it('scores every covered question at or above the floor', () => {
    for (const question of covered) {
      expect(scoreCorpus(question, real).coverage).toBeGreaterThanOrEqual(COVERAGE_FLOOR)
    }
  })

  it('scores every uncovered question below the floor', () => {
    for (const question of uncovered) {
      expect(scoreCorpus(question, real).coverage).toBeLessThan(COVERAGE_FLOOR)
    }
  })

  it('leaves a real margin between the two groups, not a hairline', () => {
    // If this ever narrows, the floor has stopped being a decision and become a
    // coin toss. Better to fail here than to let a plausible invention through.
    const worstCovered = Math.min(...covered.map((q) => scoreCorpus(q, real).coverage))
    const bestUncovered = Math.max(...uncovered.map((q) => scoreCorpus(q, real).coverage))
    expect(worstCovered - bestUncovered).toBeGreaterThan(0.2)
    expect(COVERAGE_FLOOR).toBeGreaterThan(bestUncovered)
    expect(COVERAGE_FLOOR).toBeLessThanOrEqual(worstCovered)
  })

  it('scores a query of pure stopwords as zero, not as a match', () => {
    expect(scoreCorpus('what about the it and so on', real).coverage).toBe(0)
    expect(retrieve('what about the it and so on', real)).toEqual([])
  })
})
