import type { Message } from './chatClient'
import { linkify } from './linkify'

/**
 * One turn. A refusal, a rate-limit notice and an ordinary answer all arrive as
 * the same assistant message and are all drawn the same way — there is no error
 * variant here on purpose. "I haven't written that down" is a correct answer,
 * and styling it as a failure would tell the visitor something went wrong.
 *
 * The body runs through `linkify` because the model is told to hand over exact
 * links from the notes and does — the corpus carries the LinkedIn profile, the
 * GitHub account, the site and QuerySphere's two links. Until now they arrived
 * as plain text in this paragraph and had to be selected and pasted.
 *
 * Parts, not markup: the reply is untrusted text and stays text, and React
 * builds the anchors around it.
 */
export function ChatMessage({ message }: { message: Message }) {
  const mine = message.role === 'assistant'
  return (
    <li className={`chat__msg chat__msg--${mine ? 'moeez' : 'visitor'}`}>
      <span className="chat__who">{mine ? 'Moeez' : 'You'}</span>
      <p>
        {linkify(message.content).map((part, i) =>
          typeof part === 'string' ? (
            part
          ) : (
            <a key={i} href={part.href} target="_blank" rel="noreferrer noopener">
              {part.text}
            </a>
          ),
        )}
      </p>
    </li>
  )
}
