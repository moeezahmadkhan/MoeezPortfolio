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
 * Ordinary English, beyond the stopwords. Roughly the words a person reaches for
 * without thinking about the subject — verbs of asking and doing, plain adjectives,
 * generic nouns, connectives.
 *
 * This list only ever applies to a word the corpus does NOT contain, and it draws
 * the line the coverage score turns on. His notes are about a thousand words long,
 * so almost every ordinary English word is missing from them; charging every
 * missing word against the question means the only questions that survive are the
 * keyword-shaped ones. "What is Project Horus, in plain terms?" scored 0.24 and was
 * refused, while "What is Silmaril AI?" scored 1.00 — the difference was phrasing,
 * not substance.
 *
 * So a missing ORDINARY word ("plain", "terms", "actually", "hard", "touch") says
 * nothing and is ignored. A missing SALIENT word ("Kubernetes", "Terraform",
 * "Google", "MIT", "binary", "PyTorch") is the evidence that matters and still
 * counts at full weight. Everything not listed here is treated as salient, so the
 * failure mode of an incomplete list is a refusal, which is the safe direction.
 */
const COMMON_WORDS = [
  // asking, telling, thinking
  'ask', 'answer', 'call', 'describe', 'explain', 'mean', 'meant', 'meaning',
  'talk', 'speak', 'spoke', 'hear', 'heard', 'listen', 'read', 'write', 'wrote',
  'written', 'share', 'show', 'discuss', 'mention', 'suggest', 'wonder', 'guess',
  'remember', 'forget', 'imagine', 'consider', 'believe', 'feel', 'felt', 'seem',
  // doing
  'go', 'goes', 'went', 'gone', 'come', 'came', 'make', 'made', 'take', 'took',
  'taken', 'put', 'keep', 'kept', 'find', 'found', 'look', 'see', 'saw', 'seen',
  'become', 'became', 'leave', 'left', 'bring', 'brought', 'begin', 'began',
  'start', 'stop', 'try', 'help', 'learn', 'teach', 'taught', 'study', 'hire',
  'join', 'prefer', 'choose', 'chose', 'pick', 'decide', 'spend', 'spent', 'plan',
  'hope', 'wish', 'love', 'hate', 'enjoy', 'care', 'mind', 'matter', 'happen',
  'change', 'move', 'grow', 'grew', 'break', 'broke', 'broken', 'fix', 'solve',
  'handle', 'approach', 'deal', 'meet', 'met', 'watch', 'live', 'lived', 'stay',
  'follow', 'reach', 'turn', 'hold', 'held', 'carry', 'send', 'sent', 'walk',
  'run', 'ran', 'sit', 'stand', 'open', 'close', 'add', 'remove', 'compare',
  'happened', 'wanted', 'liked', 'tried', 'worked',
  // plain adjectives
  'good', 'bad', 'best', 'worst', 'better', 'worse', 'big', 'small', 'large',
  'little', 'long', 'short', 'high', 'low', 'new', 'old', 'young', 'early', 'late',
  'easy', 'easier', 'easiest', 'hard', 'harder', 'hardest', 'difficult', 'simple',
  'complex', 'important', 'main', 'major', 'minor', 'real', 'true', 'right',
  'wrong', 'clear', 'common', 'different', 'same', 'similar', 'other', 'another',
  'next', 'last', 'first', 'second', 'third', 'few', 'several', 'whole', 'full',
  'empty', 'free', 'busy', 'available', 'ready', 'able', 'likely', 'possible',
  'actual', 'current', 'recent', 'past', 'future', 'present', 'usual', 'normal',
  'typical', 'favourite', 'favorite', 'interesting', 'strong', 'stronger',
  'strongest', 'weak', 'weaker', 'weakest', 'proud', 'happy', 'quick', 'nice',
  'cool', 'great', 'awesome', 'amazing', 'terrible', 'boring', 'plain', 'general',
  'specific', 'overall', 'personal', 'professional', 'daily', 'weekly',
  // generic nouns
  'thing', 'way', 'time', 'day', 'week', 'month', 'year', 'people', 'person',
  'someone', 'something', 'anything', 'nothing', 'everything', 'everyone',
  'anyone', 'nobody', 'somebody', 'place', 'area', 'part', 'point', 'side', 'end',
  'top', 'bottom', 'level', 'kind', 'sort', 'type', 'case', 'example', 'reason',
  'idea', 'question', 'problem', 'issue', 'story', 'life', 'home', 'house',
  'city', 'town', 'country', 'world', 'school', 'college', 'job', 'career',
  'company', 'business', 'office', 'week', 'hour', 'minute', 'moment', 'stage',
  'step', 'piece', 'bit', 'lot', 'number', 'amount', 'group', 'list', 'set',
  'name', 'word', 'term', 'note', 'detail', 'fact', 'sense', 'view', 'opinion',
  'advice', 'goal', 'aim', 'habit', 'routine', 'background', 'history', 'title',
  'shipping', 'ship', 'touch', 'head', 'hand', 'eye', 'face', 'body', 'mind',
  // Added after the live evaluation refused questions the notes plainly answer:
  // "What is your email address?" scored 0.40 and "What frontend and graphics
  // work have you done?" 0.65, each dragged under the floor by ONE of these.
  // Both are words a visitor wraps a question in; neither is a thing he could
  // have written down.
  'address', 'done', 'fit', 'experience',
  // connectives, quantifiers, time words
  'over', 'under', 'after', 'before', 'during', 'between', 'among', 'through',
  'across', 'around', 'without', 'within', 'into', 'onto', 'upon', 'since',
  'until', 'while', 'because', 'though', 'although', 'unless', 'either',
  'neither', 'both', 'each', 'every', 'whether', 'perhaps', 'maybe', 'instead',
  'rather', 'quite', 'almost', 'enough', 'always', 'never', 'often', 'sometimes',
  'usually', 'ago', 'soon', 'now', 'today', 'tomorrow', 'yesterday', 'once',
  'twice', 'together', 'alone', 'only', 'even', 'else', 'far', 'near', 'back',
  'down', 'away', 'along', 'behind', 'beyond', 'per', 'via', 'etc',
]

/** Membership is checked against the folded form, so the list can be written plainly. */
const COMMON = new Set<string>()

/**
 * The smallest suffix folding that closes the gaps this corpus actually has:
 * the notes say "Matches" and "faces", a visitor types "match" and "face". One
 * rule fires at most, and every rule refuses to run when it would leave a stub —
 * that is what keeps "FAISS" out of "fais" and "string" out of "str".
 */
function stem(word: string): string {
  // "node.js", "c++", "c#" are identifiers, not English. English suffix rules on
  // them produce "node.j", which is not wrong so much as meaningless.
  if (/[.+#]/.test(word)) return word

  const drop = (suffix: string, min: number, add = '') =>
    word.endsWith(suffix) && word.length - suffix.length >= min
      ? word.slice(0, -suffix.length) + add
      : null

  return (
    drop('ing', 4) ??
    drop('ed', 4) ??
    drop('ly', 4) ??
    (word.length > 4 ? drop('ies', 3, 'y') : null) ??
    (/(?:s|x|z|ch|sh)es$/.test(word) ? drop('es', 3) : null) ??
    (/(?:ss|us|is)$/.test(word) ? null : drop('s', 3)) ??
    word
  )
}

for (const word of COMMON_WORDS) {
  COMMON.add(word)
  COMMON.add(stem(word))
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    // A dot is kept inside a token so "node.js" survives, which means a token can
    // also arrive wearing the sentence's full stop: "in production." never matched
    // "production". Trailing "+" and "#" are left alone — they are C++ and C#.
    .map((t) => t.replace(/^\.+|\.+$/g, ''))
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
 * Measured over the real 12-chunk corpus, not chosen by feel. Across 55 questions —
 * all 20 headings of qa.md, plus off-topic, near-miss and partially-covered sets —
 * every answerable one scores 1.00. Once the phrasing is discounted, a question
 * about his work is made of his words, so it either covers or it does not.
 *
 * The refusals top out at 0.57 and the band above them is empty:
 *   0.570  "write me a binary search in Python"   (search and Python are his; binary is not)
 *   0.567  "Is the Whoop chat deployed to production?"  (3 of 4 terms his; the notes never say it shipped)
 *   0.399  "Did you work at Google?"
 *   0.389  "How does Project Horus scale?"
 *   0.34 and below: everything else, and 0.00 for eleven of them
 *
 * 0.7 sits inside that gap, clear of the top of the refusals rather than adjacent
 * to it. Erring high is the safe direction: a refused question costs a visitor one
 * email, an answered one the notes do not support is the bot inventing an employer.
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
    const n = df.get(term) ?? 0
    if (n > 0) {
      const weight = idf(n, docs.length)
      asked += weight
      answered += weight
    } else if (!COMMON.has(term)) {
      // Absent and salient: the question is reaching for something he never wrote
      // down. Absent and ordinary: it is just how the sentence was phrased.
      asked += idf(0, docs.length)
    }
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
