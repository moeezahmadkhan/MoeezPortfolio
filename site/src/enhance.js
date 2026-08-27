/**
 * Progressive enhancement entry point.
 *
 * Nothing in this module may import three, directly or transitively — the 3D
 * layer is reached only through the dynamic import below, and scripts/gates.mjs
 * fails the build if `three` appears in this chunk.
 *
 * The static page is already complete when this runs. Everything here is an
 * upgrade that can fail, be declined, or be torn down, and the page must be
 * exactly as usable afterwards as it was before.
 */

const stage = document.querySelector('[data-stage]')

/** Reasons to never start the 3D layer at all. */
function declineReason() {
  if (!stage) return 'no stage element'

  // A context is the only real test. Creating and discarding one is cheap
  // compared with importing the scene and finding out.
  const probe = document.createElement('canvas')
  const gl = probe.getContext('webgl2')
  if (!gl) return 'no webgl2'
  gl.getExtension('WEBGL_lose_context')?.loseContext()

  const c = navigator.connection
  if (c?.saveData) return 'save-data requested'
  if (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4) {
    return 'low device memory'
  }
  return null
}

/**
 * The instrument and the text are peers, so the control that swaps between them
 * is injected next to the booking control rather than under it. It only appears
 * once the 3D layer is actually running — offering to turn off something that
 * never started would be noise.
 */
function mountToggle(onOff, onOn) {
  const row = document.querySelector('.contact-actions')
  if (!row) return null

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'ret'
  button.textContent = 'Read as text'
  button.setAttribute('aria-pressed', 'false')

  let live = true
  button.addEventListener('click', () => {
    live = !live
    button.textContent = live ? 'Read as text' : 'Show the instrument'
    button.setAttribute('aria-pressed', String(!live))
    live ? onOn() : onOff()
  })

  row.append(button)
  return button
}

async function start() {
  const declined = declineReason()
  if (declined) {
    // Deliberately silent. A visitor who never sees the 3D has not missed
    // anything they can act on, so the page says nothing about it.
    return
  }

  let scene = null
  let toggle = null

  const mount = async () => {
    if (scene) return
    try {
      const { createTurret } = await import('./scene/turret.js')
      scene = createTurret(stage)
      stage.dataset.enhanced = 'true'
      if (!toggle) toggle = mountToggle(teardown, remount)
    } catch {
      // A chunk that never arrives, a context that dies during construction.
      // The static instrument is already on the page and complete, so the
      // honest response is to leave the visitor on it. Silent for the same
      // reason declining is silent: there is nothing here they can act on.
      scene = null
      delete stage.dataset.enhanced
    }
  }

  const teardown = () => {
    scene?.dispose()
    scene = null
    delete stage.dataset.enhanced
  }

  const remount = () => { mount() }

  // Only build the scene when the stage is near the viewport. On a phone the
  // visitor may never reach it, and an unbuilt scene costs nothing.
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        io.disconnect()
        mount()
      }
    }
  }, { rootMargin: '200px' })
  io.observe(stage)

  // A context can be lost at any time — a GPU reset, a backgrounded tab on a
  // thermally throttled phone. Tear down and leave the static instrument in
  // place rather than showing a dead black rectangle.
  stage.addEventListener('webglcontextlost', (event) => {
    event.preventDefault()
    teardown()
  }, true)
}

start()
