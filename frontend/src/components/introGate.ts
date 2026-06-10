// Pure gate so the cinematic intro plays at most once per browser session.
// Takes a Storage-like object (sessionStorage in the app, a fake in tests).
export type IntroStorage = Pick<Storage, 'getItem' | 'setItem'>

const KEY = 'introSeen'

export function shouldPlayIntro(storage: IntroStorage): boolean {
  return storage.getItem(KEY) !== '1'
}

export function markIntroSeen(storage: IntroStorage): void {
  storage.setItem(KEY, '1')
}
