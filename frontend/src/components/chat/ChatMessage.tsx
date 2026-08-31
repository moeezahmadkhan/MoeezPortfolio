import type { Message } from './chatClient'

/**
 * One turn. A refusal, a rate-limit notice and an ordinary answer all arrive as
 * the same assistant message and are all drawn the same way — there is no error
 * variant here on purpose. "I haven't written that down" is a correct answer,
 * and styling it as a failure would tell the visitor something went wrong.
 */
export function ChatMessage({ message }: { message: Message }) {
  const mine = message.role === 'assistant'
  return (
    <li className={`chat__msg chat__msg--${mine ? 'moeez' : 'visitor'}`}>
      <span className="chat__who">{mine ? 'Moeez' : 'You'}</span>
      <p>{message.content}</p>
    </li>
  )
}
