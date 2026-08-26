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

const INK = {
  cyanotype: new Color('#2f6e8f'),
  brass: new Color('#8a6e3e'),
  sodium: new Color('#f2c14e'),
  oxide: new Color('#c04a34'),
  plate: new Color('#151a18'),
  ground: new Color('#0a0c0b'),
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

  // A live caption, so everything the canvas communicates also exists as text.
  const caption = document.createElement('p')
  caption.className = 'stage-caption'
  caption.setAttribute('role', 'status')
  caption.setAttribute('aria-live', 'polite')
  stage.append(caption)

  const scene = new Scene()
  // One lamp in the room, and it falls off. Fog does the whole job of "the
  // station in the light path is the one you can read" — the three behind it
  // sink toward the page ground without needing per-station materials, which
  // would have cost three extra materials and three extra draw calls.
  scene.fog = new Fog(INK.ground, 6.2, 12.4)
  const camera = new PerspectiveCamera(30, 1, 0.1, 40)
  camera.position.set(0, 0.55, 8.4)
  camera.lookAt(0, 0, 0)

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
  let targetIndex = 0
  let current = 0
  let lastCaption = ''

  function detentFromScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight
    const progress = max > 0 ? window.scrollY / max : 0
    return Math.min(STATIONS.length - 1, Math.round(progress * (STATIONS.length - 1)))
  }

  function syncIndex(index) {
    const station = STATIONS[index]
    if (station.caption === lastCaption) return
    lastCaption = station.caption
    caption.textContent = station.caption

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
  })
  resize.observe(stage)

  // ── Loop ────────────────────────────────────────────────────────────────
  let frame = 0
  let onScreen = true
  let visible = document.visibilityState === 'visible'
  let disposed = false

  function running() { return onScreen && visible && !disposed }

  function tick(now) {
    frame = requestAnimationFrame(tick)
    targetIndex = detentFromScroll()

    const goal = -(targetIndex / STATIONS.length) * Math.PI * 2
    if (REDUCED.matches) {
      current = goal
    } else {
      // Critically-damped-ish approach. Settles into the detent instead of
      // easing forever, and is frame-rate independent enough for 30 and 60.
      current += (goal - current) * 0.12
    }
    turret.rotation.y = current

    syncIndex(targetIndex)
    pick(now)
    renderer.render(scene, camera)

    if (!running()) {
      cancelAnimationFrame(frame)
      frame = 0
    }
  }

  function play() {
    if (frame || !running()) return
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
