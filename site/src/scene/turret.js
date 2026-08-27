/**
 * The turret: four instruments on a ring, one in the light path at a time.
 *
 * Every bar in here is scaled by a number that also appears as text on the
 * page. Nothing is keyframed for looks — if a reading moves, it moved because
 * the arithmetic behind it moved. That is the whole thesis of the site, and it
 * is cheaper to honour than to fake.
 *
 * Deliberately no 3D text: labels live in the DOM, which holds the chunk
 * budget, keeps every word selectable, and means the accessible name of this
 * canvas is a caption a screen reader can actually read.
 */
import {
  Scene, PerspectiveCamera, WebGLRenderer, Group, Vector2, Raycaster,
  BoxGeometry, PlaneGeometry, EdgesGeometry, TorusGeometry, Fog,
  MeshBasicMaterial, LineBasicMaterial, LineSegments, Mesh, Color,
} from 'three'

/**
 * The palette is read from the stylesheet, not restated here. Both files
 * carrying their own copy of six hexes is how `--oxide` and the scene's oxide
 * drifted apart in the first place, and a drift inside a canvas is invisible
 * to every tool that would otherwise catch it. The fallbacks exist only for
 * the case where the module somehow runs before the tokens are parsed; they
 * are not a second source of truth.
 */
const tokens = getComputedStyle(document.documentElement)

const token = (name, fallback) => {
  const value = tokens.getPropertyValue(name).trim()
  // Only a hex is accepted. Given oklch() or color-mix(), three warns and
  // hands back an unchanged colour rather than throwing, so a silent wrong
  // colour is the failure mode this guards against — not a crash.
  return new Color(/^#[0-9a-f]{3,8}$/i.test(value) ? value : fallback)
}

const INK = {
  cyanotype: token('--cyanotype', '#2f6e8f'),
  brass: token('--brass', '#8a6e3e'),
  sodium: token('--sodium', '#f2c14e'),
  oxide: token('--oxide', '#c04a34'),
  plate: token('--plate', '#151a18'),
  ground: token('--lampblack', '#0a0c0b'),
}

/**
 * The four stations, in scroll order. `bars` are [value, total] pairs taken
 * from evidence-ledger.md — the same numbers the prose quotes.
 */
const STATIONS = [
  {
    id: 'vanguard', threshold: '0.45',
    caption: 'Vanguard — 2,676 of 10,291 faces cleared the gate',
    bars: [[2676, 10291], [2376, 2676], [300, 2676]],
    accent: INK.cyanotype,
  },
  {
    id: 'sumero', threshold: '93.0%',
    caption: 'Sumero — 133 of 179 cases pass, 22 criticals open',
    bars: [[133, 179], [174, 187], [22, 179]],
    accent: INK.cyanotype,
  },
  {
    id: 'pawlyse', threshold: '140s',
    caption: 'Pawlyse — 140s of a 180s budget spent on research',
    bars: [[140, 180], [6, 6], [10, 13]],
    accent: INK.cyanotype,
  },
  {
    id: 'nexis', threshold: '11×w',
    caption: 'Nexis — 0 of 100+ parsed decks reached a user',
    bars: [[0, 100], [11, 11], [0, 1]],
    accent: INK.oxide,
  },
]

const RADIUS = 3.1
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)')

export function createTurret(stage) {
  const mobile = matchMedia('(max-width: 44rem)').matches

  // ── Renderer ────────────────────────────────────────────────────────────
  const renderer = new WebGLRenderer({
    antialias: !mobile,       // SMAA-class cost buys nothing at phone density
    alpha: true,              // the page ground shows through; no second fill
    powerPreference: 'high-performance',
  })
  // Hard cap. Above these the extra pixels are invisible and the frame budget
  // is not: an uncapped DPR on a 3x phone is 9x the fragment work.
  const dprCap = mobile ? 1.5 : 2
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap))
  renderer.shadowMap.enabled = false   // nothing casts; lighting is baked into colour

  const canvas = renderer.domElement
  canvas.setAttribute('aria-hidden', 'true')   // decorative; the caption carries the meaning
  canvas.tabIndex = -1
  stage.append(canvas)

  // Render statistics, for the budget test. three already counts these per
  // frame; exposing the read costs nothing and means the draw-call and
  // triangle budgets are asserted against the renderer rather than assumed.
  canvas.getRenderStats = () => ({
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
  })

  // A frame readback, for the proof test. Counters say the renderer was asked
  // to draw; only pixels say the GPU actually did. The renderer keeps no
  // drawing buffer between frames, so the read has to follow its own render
  // inside one task — hence the explicit render call rather than a toDataURL
  // on whatever happened to be there.
  //
  // Returns aggregates, never the buffer: a 1440-wide frame is ~5MB of RGBA
  // and crossing the test boundary with that would cost more than the render.
  canvas.captureFrame = () => {
    renderer.render(scene, camera)
    const gl = renderer.getContext()
    const w = canvas.width
    const h = canvas.height
    const px = new Uint8Array(w * h * 4)
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px)

    // The renderer is alpha:true over the page ground, so a covered pixel is
    // exactly a pixel some geometry rasterised into. Tones are quantised to
    // 5 bits per channel so anti-aliasing does not inflate the count.
    let lit = 0
    let checksum = 0
    const tones = new Set()
    // Bounding box of everything drawn, so the framing can be asserted rather
    // than eyeballed: geometry touching column 0 or column w-1 is a ring being
    // cropped by the canvas, not a ring receding into fog.
    let left = w, right = -1, top = h, bottom = -1
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 8) continue
      lit++
      const p = i / 4
      const x = p % w
      const y = h - 1 - Math.floor(p / w)   // readPixels is bottom-up; report top-down
      if (x < left) left = x
      if (x > right) right = x
      if (y < top) top = y
      if (y > bottom) bottom = y
      const tone = ((px[i] >> 3) << 10) | ((px[i + 1] >> 3) << 5) | (px[i + 2] >> 3)
      tones.add(tone)
      checksum = (checksum + tone * (i + 1)) % 2147483647
    }
    return {
      width: w, height: h, lit, coverage: lit / (w * h), tones: tones.size, checksum,
      bounds: lit ? { left, right, top, bottom } : null,
    }
  }

  // The palette actually in use, so the tokens-to-canvas link can be asserted
  // rather than trusted. Hex out, because that is what the stylesheet holds.
  canvas.readInk = () => Object.fromEntries(
    Object.entries(INK).map(([name, colour]) => [name, `#${colour.getHexString()}`]),
  )

  // The scene graph as numbers, so a test can assert that a bar is the length
  // the prose says it is. This is the site's one real claim about itself — the
  // geometry is the data — and an untested claim is a decoration.
  canvas.readInstrument = () => [...built.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, group]) => ({
      id: STATIONS[index].id,
      // Bars are authored against a 1.9 unit track; the fill's x scale is the
      // ratio times that width, so dividing gives the ratio straight back.
      fills: group.children
        .filter((c) => c.isMesh && (c.material === mat.fill || c.material === mat.fillOxide))
        .map((m) => m.scale.x / 1.9),
      declared: STATIONS[index].bars.map(([value, total]) => (total > 0 ? Math.min(1, value / total) : 0)),
      lit: group.userData.frame.material === mat.frameLit,
    }))

  // A live caption, so everything the canvas communicates also exists as text.
  const caption = document.createElement('p')
  caption.className = 'stage-caption'
  caption.setAttribute('role', 'status')
  caption.setAttribute('aria-live', 'polite')
  stage.append(caption)

  const scene = new Scene()
  // One lamp in the room, and it falls off. Fog does the whole job of "the
  // station in the light path is the one you can read" — the three behind it
  // sink toward the plate without needing per-station materials, which would
  // have cost three extra materials and three extra draw calls.
  // Fog colour is the plate the canvas sits on, not the page ground. Fogging
  // toward #0a0c0b over a #151a18 box made distant stations DARKER than their
  // own background — they advanced instead of receding, which is the opposite
  // of the intent. Measured, not guessed: a frame tally showed the far plates
  // resolving away from the ground rather than into it.
  scene.fog = new Fog(INK.plate, 7.0, 13.0)

  // A 30° lens at this radius put stations 2 and 4 outside the frustum: the
  // frame read as one panel with two slivers clipped by the canvas edge, and
  // the ring the whole thesis rests on was only ever visible mid-rotation.
  // Wider lens and some elevation, so the ring is a wheel seen slightly from
  // above and all four instruments are inside the frame at rest.
  const camera = new PerspectiveCamera(40, 1, 0.1, 40)
  camera.position.set(0, 1.35, 8.0)
  // Aimed below the ring, which lifts the whole wheel in frame and leaves the
  // bottom band to the caption. The caption is opaque, so anything drawn down
  // there would simply be covered.
  camera.lookAt(0, -0.42, 0)

  const turret = new Group()
  scene.add(turret)

  // ── Shared resources, disposed exactly once ─────────────────────────────
  // One geometry per shape and one material per colour, reused by every
  // station. Four stations end up as ~20 draw calls and under 3k triangles,
  // against budgets of 100 and 300k.
  const geo = {
    bar: new BoxGeometry(1, 1, 1),
    plate: new PlaneGeometry(2.5, 1.7),
    ring: new TorusGeometry(RADIUS, 0.008, 3, 96),
  }
  geo.frame = new EdgesGeometry(geo.plate)

  const mat = {
    track: new MeshBasicMaterial({ color: INK.cyanotype, transparent: true, opacity: 0.22 }),
    fill: new MeshBasicMaterial({ color: INK.cyanotype }),
    fillOxide: new MeshBasicMaterial({ color: INK.oxide }),
    plate: new MeshBasicMaterial({ color: INK.plate, transparent: true, opacity: 0.94 }),
    frame: new LineBasicMaterial({ color: INK.brass, transparent: true, opacity: 0.55 }),
    frameLit: new LineBasicMaterial({ color: INK.sodium }),
    ring: new LineBasicMaterial({ color: INK.brass, transparent: true, opacity: 0.3 }),
  }

  const ring = new Mesh(geo.ring, mat.ring)
  ring.rotation.x = Math.PI / 2
  turret.add(ring)

  // ── Stations ────────────────────────────────────────────────────────────
  const built = new Map()

  function buildStation(index) {
    if (built.has(index)) return
    const data = STATIONS[index]
    const group = new Group()
    const angle = (index / STATIONS.length) * Math.PI * 2

    group.position.set(Math.sin(angle) * RADIUS, 0, Math.cos(angle) * RADIUS)
    group.rotation.y = angle

    const plate = new Mesh(geo.plate, mat.plate)
    group.add(plate)

    const frame = new LineSegments(geo.frame, mat.frame)
    group.add(frame)
    group.userData.frame = frame
    group.userData.index = index

    data.bars.forEach(([value, total], row) => {
      const y = 0.42 - row * 0.42
      const width = 1.9
      const ratio = total > 0 ? Math.min(1, value / total) : 0

      const track = new Mesh(geo.bar, mat.track)
      track.scale.set(width, 0.07, 0.02)
      track.position.set(0, y, 0.02)
      group.add(track)

      // A zero-valued bar is drawn as nothing at all rather than as a sliver.
      // Nexis reaching no users has to read as empty, because it is.
      if (ratio > 0) {
        const fill = new Mesh(geo.bar, data.accent === INK.oxide ? mat.fillOxide : mat.fill)
        fill.scale.set(width * ratio, 0.07, 0.03)
        fill.position.set(-(width * (1 - ratio)) / 2, y, 0.03)
        group.add(fill)
      }
    })

    turret.add(group)
    built.set(index, group)
  }

  // Station 1 exists before the first frame. The rest arrive on idle time so
  // they never compete with the first paint of the scene.
  buildStation(0)
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200))
  const idleHandles = []
  for (let i = 1; i < STATIONS.length; i++) {
    idleHandles.push(idle(() => buildStation(i), { timeout: 2000 }))
  }

  // ── Detents ─────────────────────────────────────────────────────────────
  // Scroll position across the document maps to a station index. The turret
  // seats into one of four positions like a filter wheel rather than drifting
  // continuously, so at rest exactly one instrument is square to the viewer.
  const TAU = Math.PI * 2
  let targetIndex = 0
  let current = 0
  let lastCaption = ''
  let dirty = true

  // The detent follows the station being read, not raw scroll progress across
  // the document.
  //
  // Progress was measured and it did not work: on desktop the loop pauses at
  // scrollY 699 when the stage leaves the viewport, while the second detent
  // needed 1038. The ring could not reach station two, let alone four — every
  // visitor saw Vanguard and nothing else, and three of the four instruments
  // were built for nobody. An observer on the articles has no such ceiling,
  // costs no layout read, and answers the question the ring is actually
  // asking: which system is this person looking at.
  const articles = STATIONS.map((s) => document.getElementById(s.id)).filter(Boolean)
  const seen = new Map()
  const reading = new IntersectionObserver((entries) => {
    let best = null
    for (const entry of entries) {
      seen.set(entry.target, entry.intersectionRatio)
    }
    for (const [el, ratio] of seen) {
      if (ratio > 0 && (!best || ratio > best.ratio)) best = { el, ratio }
    }
    if (!best) return
    const index = articles.indexOf(best.el)
    if (index < 0 || index === targetIndex) return
    targetIndex = index
    // Off screen there is no transit to watch, so the ring is simply already
    // right when it comes back. Animating a rotation nobody can see would be
    // battery spent on a secret.
    if (!running()) {
      current = -(targetIndex / STATIONS.length) * TAU
      turret.rotation.y = current
      syncIndex(targetIndex)
      dirty = true
    }
  }, { threshold: [0, 0.25, 0.5, 0.75] })
  for (const el of articles) reading.observe(el)

  function syncIndex(index) {
    const station = STATIONS[index]
    if (station.caption === lastCaption) return
    lastCaption = station.caption
    caption.textContent = station.caption
    dirty = true

    for (const link of document.querySelectorAll('.index a')) {
      const isCurrent = link.getAttribute('href') === `#${station.id}`
      isCurrent ? link.setAttribute('aria-current', 'true') : link.removeAttribute('aria-current')
    }
    for (const [i, group] of built) {
      group.userData.frame.material = i === index ? mat.frameLit : mat.frame
    }
  }

  // ── Raycast, throttled ──────────────────────────────────────────────────
  // Pointer picking runs at 30fps, not per frame and not per pointermove. A
  // raycast against four plates is cheap, but it is not free and nothing about
  // hovering needs 60Hz.
  const raycaster = new Raycaster()
  const pointer = new Vector2()
  let pointerLive = false
  let lastPick = 0
  const PICK_INTERVAL = 1000 / 30

  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect()
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    pointerLive = true
  }
  canvas.addEventListener('pointermove', onPointerMove, { passive: true })

  function pick(now) {
    if (!pointerLive || now - lastPick < PICK_INTERVAL) return
    lastPick = now
    raycaster.setFromCamera(pointer, camera)
    const plates = [...built.values()].map((g) => g.children[0])
    const hit = raycaster.intersectObjects(plates, false)[0]
    canvas.style.cursor = hit ? 'pointer' : ''
  }

  canvas.addEventListener('click', () => {
    raycaster.setFromCamera(pointer, camera)
    const plates = [...built.values()].map((g) => g.children[0])
    const hit = raycaster.intersectObjects(plates, false)[0]
    if (!hit) return
    const index = hit.object.parent.userData.index
    document.getElementById(STATIONS[index].id)?.scrollIntoView({
      behavior: REDUCED.matches ? 'auto' : 'smooth',
    })
  })

  // ── Sizing ──────────────────────────────────────────────────────────────
  // The stage box already has its size from CSS aspect-ratio, so the renderer
  // only ever reads it. Nothing here can change layout, which is why CLS stays
  // at zero when the canvas mounts.
  const resize = new ResizeObserver(() => {
    const { width, height } = stage.getBoundingClientRect()
    if (width === 0 || height === 0) return
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap))
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    dirty = true
  })
  resize.observe(stage)

  // ── Loop ────────────────────────────────────────────────────────────────
  let frame = 0
  let onScreen = true
  let visible = document.visibilityState === 'visible'
  let disposed = false

  function running() { return onScreen && visible && !disposed }

  // Time constant, not a per-frame fraction. 7.7 reproduces the old 0.12-per-
  // frame feel at 60Hz and now holds that feel everywhere: the previous
  // constant settled twice as fast on a 120Hz phone as on a 60Hz laptop, which
  // is the kind of difference nobody can name but everybody feels.
  const APPROACH = 7.7
  let last = 0

  function tick(now) {
    frame = requestAnimationFrame(tick)
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
    last = now

    // Unwrapped to the nearest equivalent angle, so the turret always takes
    // the short way round. Coming back from the fourth station used to mean
    // three quarters of a turn backwards past every other instrument; it is a
    // quarter turn forwards.
    let goal = -(targetIndex / STATIONS.length) * TAU
    goal += Math.round((current - goal) / TAU) * TAU

    if (REDUCED.matches) {
      if (current !== goal) dirty = true
      current = goal
    } else {
      const remaining = goal - current
      if (Math.abs(remaining) < 0.0004) {
        // Snap rather than approach forever. An asymptote costs a redraw a
        // frame for a rotation nobody can see.
        if (current !== goal) dirty = true
        current = goal
      } else {
        current += remaining * (1 - Math.exp(-APPROACH * dt))
        dirty = true
      }
    }
    turret.rotation.y = current

    syncIndex(targetIndex)
    pick(now)

    // Seated and unchanged means the last frame is still correct. The loop
    // keeps running so a scroll or a hover is picked up immediately, but the
    // GPU is left alone — which on a phone is the difference between warm and
    // throttled while somebody reads the case studies.
    if (dirty) {
      renderer.render(scene, camera)
      dirty = false
    }

    if (!running()) {
      cancelAnimationFrame(frame)
      frame = 0
    }
  }

  function play() {
    if (frame || !running()) return
    // A pause of any length would otherwise arrive as one enormous dt and jump
    // the turret across the transit it was meant to animate.
    last = 0
    dirty = true
    frame = requestAnimationFrame(tick)
  }

  // Pause when the tab is hidden and when the stage scrolls out of view. A
  // render loop nobody is looking at is pure battery cost, and on a phone that
  // is the difference between warm and throttled.
  const onVisibility = () => { visible = document.visibilityState === 'visible'; play() }
  document.addEventListener('visibilitychange', onVisibility)

  const viewport = new IntersectionObserver((entries) => {
    onScreen = entries.some((e) => e.isIntersecting)
    play()
  }, { rootMargin: '120px' })
  viewport.observe(stage)

  // The turret answers to scroll, so a scroll while paused still has to be
  // reflected the moment it resumes.
  const onScroll = () => { if (!frame) play() }
  window.addEventListener('scroll', onScroll, { passive: true })

  play()

  // ── Teardown ────────────────────────────────────────────────────────────
  return {
    dispose() {
      if (disposed) return
      disposed = true
      cancelAnimationFrame(frame)
      frame = 0

      resize.disconnect()
      reading.disconnect()
      viewport.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('scroll', onScroll)
      canvas.removeEventListener('pointermove', onPointerMove)
      for (const h of idleHandles) window.cancelIdleCallback?.(h)

      // Geometries and materials are shared, so they are disposed from the
      // registries rather than by walking the graph — walking would try to
      // dispose the same BoxGeometry once per bar.
      for (const g of Object.values(geo)) g.dispose()
      for (const m of Object.values(mat)) m.dispose()

      scene.clear()
      built.clear()

      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
      caption.remove()

      for (const link of document.querySelectorAll('.index a[aria-current]')) {
        link.removeAttribute('aria-current')
      }
    },
  }
}
