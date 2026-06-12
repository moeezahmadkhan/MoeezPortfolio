// One-shot: pull the embedded PNG out of the provided Canva "Marauder's Map" SVG
// (a 2.6MB wrapper around a single raster) so we can ship the PNG directly
// instead of rasterising a huge data-URI SVG at runtime.
import fs from 'node:fs'
const SRC = process.argv[2]
const OUT = process.argv[3]
const svg = fs.readFileSync(SRC, 'utf8')
const m = svg.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/)
if (!m) {
  console.error('no embedded png found')
  process.exit(1)
}
const buf = Buffer.from(m[1], 'base64')
fs.writeFileSync(OUT, buf)
// PNG IHDR: width/height are big-endian uint32 at byte offsets 16 and 20.
const w = buf.readUInt32BE(16)
const h = buf.readUInt32BE(20)
console.log(`wrote ${OUT} bytes=${buf.length} dims=${w}x${h}`)
