import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const outputPath = resolve(projectRoot, 'src-tauri/icons/app-icon.png')

const size = 1024
const pixels = Buffer.alloc(size * size * 4)

const bgTop = [5, 58, 29]
const bgBottom = [2, 33, 16]
const accent = [74, 222, 128]
const accentHot = [105, 239, 156]

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

function mix(a, b, t) {
  return a + (b - a) * t
}

function blendPixel(x, y, color, alpha) {
  if (alpha <= 0 || x < 0 || y < 0 || x >= size || y >= size) return

  const offset = (y * size + x) * 4
  const dstAlpha = pixels[offset + 3] / 255
  const outAlpha = alpha + dstAlpha * (1 - alpha)

  if (outAlpha <= 0) return

  pixels[offset] = Math.round(
    (color[0] * alpha + pixels[offset] * dstAlpha * (1 - alpha)) / outAlpha,
  )
  pixels[offset + 1] = Math.round(
    (color[1] * alpha + pixels[offset + 1] * dstAlpha * (1 - alpha)) / outAlpha,
  )
  pixels[offset + 2] = Math.round(
    (color[2] * alpha + pixels[offset + 2] * dstAlpha * (1 - alpha)) / outAlpha,
  )
  pixels[offset + 3] = Math.round(outAlpha * 255)
}

function sdRoundRect(px, py, cx, cy, halfWidth, halfHeight, radius) {
  const qx = Math.abs(px - cx) - halfWidth + radius
  const qy = Math.abs(py - cy) - halfHeight + radius
  const ox = Math.max(qx, 0)
  const oy = Math.max(qy, 0)
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - radius
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax
  const vy = by - ay
  const wx = px - ax
  const wy = py - ay
  const lengthSq = vx * vx + vy * vy
  const t = lengthSq === 0 ? 0 : clamp((wx * vx + wy * vy) / lengthSq)
  const dx = px - (ax + t * vx)
  const dy = py - (ay + t * vy)
  return Math.hypot(dx, dy)
}

function drawBackground() {
  const radius = 230
  const half = size / 2

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const d = sdRoundRect(x + 0.5, y + 0.5, half, half, half, half, radius)
      const alpha = clamp(0.5 - d)
      if (alpha <= 0) continue

      const vertical = y / (size - 1)
      const highlight = clamp(1 - Math.hypot(x - 260, y - 180) / 720) * 16
      const color = bgTop.map((channel, index) =>
        Math.round(clamp(mix(channel, bgBottom[index], vertical) + highlight, 0, 255)),
      )

      blendPixel(x, y, color, alpha)
    }
  }
}

function drawMark() {
  const points = [
    [256, 704],
    [448, 384],
    [640, 576],
    [768, 320],
  ]
  const halfStroke = 46

  for (let y = 210; y < 780; y += 1) {
    for (let x = 175; x < 850; x += 1) {
      let distance = Infinity
      for (let i = 0; i < points.length - 1; i += 1) {
        distance = Math.min(
          distance,
          distanceToSegment(x + 0.5, y + 0.5, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]),
        )
      }

      const strokeAlpha = clamp(halfStroke + 0.75 - distance)
      if (strokeAlpha > 0) {
        const glow = clamp(1 - Math.hypot(x - 770, y - 320) / 520)
        const color = accent.map((channel, index) =>
          Math.round(mix(channel, accentHot[index], glow * 0.55)),
        )
        blendPixel(x, y, color, strokeAlpha)
      }

      const dotDistance = Math.hypot(x + 0.5 - 768, y + 0.5 - 320)
      const dotAlpha = clamp(72 + 0.75 - dotDistance)
      if (dotAlpha > 0) {
        blendPixel(x, y, accentHot, dotAlpha)
      }
    }
  }
}

function pngChunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const crcInput = Buffer.concat([typeBuffer, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcInput), 0)
  return Buffer.concat([length, typeBuffer, data, crc])
}

const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n += 1) {
  let c = n
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  crcTable[n] = c >>> 0
}

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function encodePng(width, height, rgba) {
  const scanlines = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (width * 4 + 1)
    scanlines[rowOffset] = 0
    rgba.copy(scanlines, rowOffset + 1, y * width * 4, (y + 1) * width * 4)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(scanlines, { level: 9 })),
    pngChunk('IEND'),
  ])
}

drawBackground()
drawMark()

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, encodePng(size, size, pixels))
console.log(`Generated ${outputPath}`)
