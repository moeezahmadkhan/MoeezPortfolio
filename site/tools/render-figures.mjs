/**
 * Offline figure renderer. Not shipped and not on any page — it exists so the
 * portraits in the contact block and the social card can be regenerated from
 * the source GLBs instead of being binaries nobody can rebuild.
 *
 *   npm run figures
 *
 * The output is a still image on purpose. A 120k-triangle character behind a
 * Draco decoder and a Basis transcoder is ~1.8MB of runtime cost for something
 * that never moves; a render of it is 30KB, needs no JavaScript, and cannot
 * break the instrument.
 */
import {
  Scene, PerspectiveCamera, WebGLRenderer, Box3, Vector3, Color,
  AmbientLight, DirectionalLight, ACESFilmicToneMapping, SRGBColorSpace,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

const renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
renderer.setPixelRatio(1)
renderer.toneMapping = ACESFilmicToneMapping
renderer.toneMappingExposure = 1.15
renderer.outputColorSpace = SRGBColorSpace
document.body.append(renderer.domElement)

const loader = new GLTFLoader()
  .setDRACOLoader(new DRACOLoader().setDecoderPath('/decoders/draco/'))
  .setKTX2Loader(new KTX2Loader().setTranscoderPath('/decoders/basis/').detectSupport(renderer))
  .setMeshoptDecoder(MeshoptDecoder)

// Sodium key from the upper right, cyanotype fill from the lower left: the
// page's own two lights, so the figures sit in the same room as the console.
function light(scene) {
  scene.add(new AmbientLight(0xffffff, 1.1))
  const key = new DirectionalLight(0xf2c14e, 2.4)
  key.position.set(2.5, 3.2, 3.0)
  scene.add(key)
  const fill = new DirectionalLight(0x2f6e8f, 1.5)
  fill.position.set(-3.0, -0.6, 1.8)
  scene.add(fill)
  const rim = new DirectionalLight(0xffffff, 0.9)
  rim.position.set(-1.2, 1.6, -3.0)
  scene.add(rim)
}

async function frame(name, { width, height, yaw, pitch, zoom = 1, background = null, lift = 0 }) {
  const gltf = await loader.loadAsync(`/models/${name}.glb`)
  const scene = new Scene()
  if (background) scene.background = new Color(background)
  light(scene)

  const object = gltf.scene
  const box = new Box3().setFromObject(object)
  object.position.sub(box.getCenter(new Vector3()))
  object.position.y += lift
  scene.add(object)

  const radius = box.getSize(new Vector3()).length() / 2
  const camera = new PerspectiveCamera(30, width / height, 0.01, 100)
  const distance = (radius / Math.tan((15 * Math.PI) / 180)) / zoom
  camera.position.set(
    Math.sin(yaw) * Math.cos(pitch) * distance,
    Math.sin(pitch) * distance,
    Math.cos(yaw) * Math.cos(pitch) * distance,
  )
  camera.lookAt(0, 0, 0)

  renderer.setSize(width, height, false)
  renderer.domElement.style.cssText = `width:${width / 2}px;height:${height / 2}px`
  renderer.render(scene, camera)
  return renderer.domElement
}

const RAD = Math.PI / 180
/**
 * The social card. Composed here rather than in an image editor so it can be
 * regenerated when the positioning line changes — a card that disagrees with
 * the page is worse than no card, and that is exactly what a hand-made PNG
 * becomes after the second copy edit.
 */
window.renderCard = async (name, opts) => {
  await Promise.all([
    document.fonts.load('600 56px "Bodoni Moda"'),
    document.fonts.load('400 16px "IBM Plex Mono"'),
    document.fonts.load('600 16px "IBM Plex Mono"'),
  ])

  const W = 1200
  const H = 630
  const card = document.createElement('canvas')
  card.width = W
  card.height = H
  const ctx = card.getContext('2d')

  ctx.fillStyle = '#0a0c0b'
  ctx.fillRect(0, 0, W, H)

  const figure = await frame(name, { width: 480, height: 600, yaw: opts.yaw, pitch: opts.pitch, zoom: 0.9 })
  ctx.drawImage(figure, W - 470, 30, 440, 550)

  // Wordmark, then the hairline the site puts under its own header.
  ctx.fillStyle = '#dce3e1'
  ctx.font = '600 30px "Bodoni Moda", Georgia, serif'
  ctx.letterSpacing = '10px'
  ctx.fillText('MOEEZ AHMAD KHAN', 72, 92)
  ctx.letterSpacing = '0px'

  ctx.strokeStyle = '#222a27'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(72, 124.5)
  ctx.lineTo(W - 72, 124.5)
  ctx.stroke()

  ctx.fillStyle = '#a2854e'
  ctx.font = '400 15px "IBM Plex Mono", monospace'
  ctx.letterSpacing = '3px'
  ctx.fillText('AI/ML ENGINEER · LAHORE · REMOTE', 72, 176)
  ctx.letterSpacing = '0px'

  ctx.fillStyle = '#dce3e1'
  ctx.font = '600 54px "Bodoni Moda", Georgia, serif'
  const lines = ['I ship models that', 'get measured,', 'not demoed.']
  lines.forEach((line, i) => ctx.fillText(line, 72, 268 + i * 66))

  ctx.fillStyle = '#8d9a97'
  ctx.font = '400 15px "IBM Plex Mono", monospace'
  ctx.letterSpacing = '2px'
  ctx.fillText('moeezahmadkhan.com', 72, 552)
  ctx.letterSpacing = '0px'

  return card.toDataURL('image/jpeg', 0.9)
}

window.renderFigure = async (name, opts) => {
  const canvas = await frame(name, opts)
  return canvas.toDataURL(opts.type || 'image/webp', opts.quality ?? 0.86)
}

// A contact sheet of eight yaws, so the camera angle for each figure is chosen
// by looking rather than by guessing which way the model happens to face.
window.renderSheet = async (name) => {
  const cell = { w: 220, h: 275 }
  const sheet = document.createElement('canvas')
  sheet.width = cell.w * 8
  sheet.height = cell.h + 22
  const ctx = sheet.getContext('2d')
  ctx.fillStyle = '#151a18'
  ctx.fillRect(0, 0, sheet.width, sheet.height)
  for (let i = 0; i < 8; i++) {
    const deg = i * 45
    const canvas = await frame(name, {
      width: cell.w, height: cell.h, yaw: deg * RAD, pitch: 6 * RAD, zoom: 0.92,
    })
    ctx.drawImage(canvas, i * cell.w, 0)
    ctx.fillStyle = '#f2c14e'
    ctx.font = '13px monospace'
    ctx.fillText(`${deg}`, i * cell.w + 8, cell.h + 15)
  }
  return sheet.toDataURL('image/webp', 0.85)
}

window.RAD = RAD
