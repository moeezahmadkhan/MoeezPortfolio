export type Chunk = {
  id: string
  source: string
  heading: string
  text: string
  tokens: number
}

// Small, closed stopword list. Enough to stop "the" and "about" dominating the
// scores; deliberately not a full linguistic stemmer, which this corpus does not need.
//
// The second half of the list is the part that matters for honesty. "Do you know
// Docker?" is a question about Docker and nothing else — but "know" appears nowhere
// in Moeez's notes, so if it survives tokenisation it looks identical to
// "Kubernetes" and drags a perfectly answerable question below the floor. These are
// the words a visitor wraps a question in, not the question.
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'am', 'has', 'have', 'had', 'of', 'in', 'on', 'at', 'to', 'for', 'with',
  'about', 'from', 'by', 'as', 'it', 'its', 'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'they', 'we', 'me', 'my', 'your', 'his', 'her', 'their',
  'our', 'do', 'does', 'did', 'can', 'could', 'would', 'should', 'will', 'what',
  'which', 'who', 'whom', 'whose', 'how', 'when', 'where', 'why', 'if', 'then',
  'than', 'so', 'not', 'no', 'yes', 'there', 'here', 'up', 'out', 'off', 'again',
  'just', 'also', 'very', 'really', 'much', 'many', 'more', 'most', 'some', 'any',
  'all', 'well', 'still', 'ever', 'please', 'thanks', 'thank', 'hi', 'hello', 'hey',
  'ok', 'okay', 'tell', 'know', 'think', 'say', 'said', 'want', 'need', 'get',
  'got', 'give', 'like', 'let', 'sure', 'maybe', 'use', 'used', 'using',
])

/**
 * The smallest suffix folding that closes the gaps this corpus actually has:
 * the notes say "Matches" and "faces", a visitor types "match" and "face". One
 * rule fires at most, and every rule refuses to run when it would leave a stub —
 * that is what keeps "FAISS" out of "fais" and "string" out of "str".
 */
function stem(word: string): string {
  const drop = (suffix: string, min: number, add = '') =>
    word.endsWith(suffix) && word.length - suffix.length >= min
      ? word.slice(0, -suffix.length) + add
      : null

  return (
    drop('ing', 4) ??
    drop('ed', 4) ??
    (word.length > 4 ? drop('ies', 3, 'y') : null) ??
    (/(?:s|x|z|ch|sh)es$/.test(word) ? drop('es', 3) : null) ??
    (/(?:ss|us|is)$/.test(word) ? null : drop('s', 3)) ??
    word
  )
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map(stem)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
}

const K1 = 1.4 // term-frequency saturation
const B = 0.72 // length normalisation
const HEADING_BOOST = 2.2 // a term in the heading is worth more than one in the body

/**
 * How much of the question must exist in the notes before the bot answers at all.
 *
 * Measured over the real 12-chunk corpus, not chosen by feel. Every answerable
 * question in `retrieval.test.ts` scores exactly 1.00 — coverage is the share of
 * the question that exists at all, and a question about his own work uses his own
 * words. The highest-scoring *un*answerable one is 0.57 ("Is the Whoop chat
 * deployed to production?": three of four terms are his, but the notes never say
 * whether it shipped). Every other unanswerable question — near misses like "Did
 * you work at Google?" and off-topic ones like "write me a binary search in
 * Python" — lands at 0.40 or below, and six of them at 0.00. The band between 0.57
 * and 1.00 is empty, so the floor goes inside it, clear of the top of the refusals
 * rather than adjacent to it.
 *
 * Erring high is the safe direction. A refused question costs a visitor one email;
 * an answered one the notes do not support is the bot inventing an employer.
 */
export const COVERAGE_FLOOR = 0.7

/** Chunks scoring under this fraction of the winner are noise, not context. */
const RELATIVE_CUTOFF = 0.25

/** Robertson/Sparck-Jones idf, defined at n = 0 so an absent term still weighs in. */
function idf(n: number, total: number): number {
  return Math.log(1 + (total - n + 0.5) / (n + 0.5))
}

export type Scored = { chunk: Chunk; score: number }

/**
 * Scores the whole corpus against a query and reports two different things.
 *
 * `ranked` is BM25-lite: which chunk answers best. That is a *ranking*, and a
 * ranking always has a winner — which is exactly why it cannot be the thing that
 * decides whether to answer.
 *
 * `coverage` is the calibrated one, in [0, 1]: the share of the question's
 * information — idf-weighted, so rare words count for more — that exists anywhere
 * in the corpus. A term the notes have never seen is not skipped; it counts
 * against the question at full weight, because an unknown word is the clearest
 * evidence there is that this question is outside what Moeez wrote down.
 */
export function scoreCorpus(
  query: string,
  corpus: Chunk[],
): { coverage: number; ranked: Scored[] } {
  const terms = tokenize(query)
  if (terms.length === 0 || corpus.length === 0) return { coverage: 0, ranked: [] }

  const docs = corpus.map((chunk) => ({
    chunk,
    body: tokenize(chunk.text),
    heading: new Set(tokenize(chunk.heading)),
  }))
  const avgLen = docs.reduce((sum, d) => sum + d.body.length, 0) / docs.length

  const unique = [...new Set(terms)]
  const df = new Map<string, number>()
  for (const term of unique) {
    df.set(term, docs.filter((d) => d.body.includes(term) || d.heading.has(term)).length)
  }

  let asked = 0
  let answered = 0
  for (const term of unique) {
    const weight = idf(df.get(term) ?? 0, docs.length)
    asked += weight
    if ((df.get(term) ?? 0) > 0) answered += weight
  }

  const ranked = docs
    .map((doc) => {
      let score = 0
      for (const term of terms) {
        const n = df.get(term) ?? 0
        if (n === 0) continue
        const tf =
          doc.body.filter((t) => t === term).length + (doc.heading.has(term) ? HEADING_BOOST : 0)
        if (tf === 0) continue
        score +=
          idf(n, docs.length) *
          ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * doc.body.length) / avgLen)))
      }
      return { chunk: doc.chunk, score }
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id))

  return { coverage: asked === 0 ? 0 : answered / asked, ranked }
}

/**
 * BM25-lite with a floor. Chosen over embeddings deliberately: the corpus is a few
 * thousand words, the free model tier has no dependable embeddings endpoint, and
 * this adds zero runtime services. If the corpus outgrows ~50k words, replace this
 * file — nothing else in the pipeline changes.
 *
 * The floor is the point of the function. Returning the least-bad chunk for a
 * question the notes know nothing about is how the generation step ends up
 * inventing an employer, so a question the corpus does not cover returns nothing
 * at all and the caller is free to say so.
 */
export function retrieve(query: string, corpus: Chunk[], k = 6): Chunk[] {
  const { coverage, ranked } = scoreCorpus(query, corpus)
  if (coverage < COVERAGE_FLOOR || ranked.length === 0) return []

  const best = ranked[0].score
  return ranked
    .filter((s) => s.score >= best * RELATIVE_CUTOFF)
    .slice(0, k)
    .map((s) => s.chunk)
}
