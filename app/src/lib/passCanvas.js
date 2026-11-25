import QRCode from 'qrcode'
import frameUrl from '../assets/frame.png'
import { formatMobile } from './phone'

// Geometry of frame.png (1122 x 1402). The transparent photo window spans
// roughly x 43–1077, y 310–1194; everything is drawn under the frame.
const WIN = { x: 43, y: 310, w: 1035, h: 885 }
const LEFT = { x: 92, w: 410 }
const PHOTO = { x: LEFT.x, y: 352, w: LEFT.w, h: 450 }
const QR = { size: 330, y: 830 }
const RIGHT = { x: 572, w: 460, top: 368, bottom: 1150 }

const C = {
  navy900: '#000a2e',
  navy800: '#01103f',
  navy600: '#0a2a7a',
  cyan: '#00e9fa',
  cream: '#faedd0',
  muted: '#9fb6e6',
  white: '#ffffff',
}
const FONT = 'Poppins, "Segoe UI", Arial, sans-serif'

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load image'))
    img.src = src
  })
}

export function loadFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That file could not be opened as an image. Please choose a JPG or PNG photo.'))
    }
    img.src = url
  })
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function setSpacing(ctx, px) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`
}

function wrap(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width <= maxWidth || !line) line = test
    else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines
}

/** Largest font size (max → min) at which text fits in maxLines; ellipsizes if it never fits. */
function fit(ctx, text, { weight, max, min, maxWidth, maxLines }) {
  for (let size = max; size >= min; size -= 2) {
    ctx.font = `${weight} ${size}px ${FONT}`
    const lines = wrap(ctx, text, maxWidth)
    if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= maxWidth))
      return { size, lines }
  }
  ctx.font = `${weight} ${min}px ${FONT}`
  const lines = wrap(ctx, text, maxWidth).slice(0, maxLines)
  let last = lines[lines.length - 1]
  while (ctx.measureText(last + '…').width > maxWidth && last.length > 1) last = last.slice(0, -1)
  lines[lines.length - 1] = last + '…'
  return { size: min, lines }
}

function drawBackground(ctx) {
  const g = ctx.createRadialGradient(560, 700, 60, 560, 750, 720)
  g.addColorStop(0, C.navy600)
  g.addColorStop(1, C.navy900)
  ctx.fillStyle = g
  ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h)

  // Soft diagonal sheen, echoing the frame's fabric texture.
  ctx.save()
  ctx.globalAlpha = 0.05
  ctx.strokeStyle = C.white
  ctx.lineWidth = 2
  for (let i = -WIN.h; i < WIN.w; i += 26) {
    ctx.beginPath()
    ctx.moveTo(WIN.x + i, WIN.y + WIN.h)
    ctx.lineTo(WIN.x + i + WIN.h, WIN.y)
    ctx.stroke()
  }
  ctx.restore()
}

function drawPhoto(ctx, img) {
  const { x, y, w, h } = PHOTO
  ctx.save()
  ctx.shadowColor = 'rgba(0, 233, 250, 0.45)'
  ctx.shadowBlur = 30
  roundRect(ctx, x, y, w, h, 30)
  ctx.fillStyle = C.navy800
  ctx.fill()
  ctx.restore()

  ctx.save()
  roundRect(ctx, x, y, w, h, 30)
  ctx.clip()
  // Cover-fit, biased upward so faces stay in frame.
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const sw = w / scale
  const sh = h / scale
  const sx = (img.naturalWidth - sw) / 2
  const sy = (img.naturalHeight - sh) * 0.3
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
  ctx.restore()

  roundRect(ctx, x, y, w, h, 30)
  ctx.lineWidth = 6
  ctx.strokeStyle = C.cyan
  ctx.stroke()
}

function drawQr(ctx, qrImg) {
  const s = QR.size
  const x = LEFT.x + (LEFT.w - s) / 2
  const y = QR.y
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
  ctx.shadowBlur = 20
  roundRect(ctx, x, y, s, s, 24)
  ctx.fillStyle = C.white
  ctx.fill()
  ctx.restore()
  const pad = 18
  ctx.drawImage(qrImg, x + pad, y + pad, s - pad * 2, s - pad * 2)
}

function drawDetails(ctx, record) {
  const { x, w } = RIGHT
  let y = RIGHT.top

  const cx = x + w / 2 // everything in this column is centred on this line
  ctx.textAlign = 'center'

  // "DELEGATE PASS" pill
  ctx.font = `600 22px ${FONT}`
  setSpacing(ctx, 4)
  const pill = 'DELEGATE PASS'
  const pw = ctx.measureText(pill).width + 44
  roundRect(ctx, cx - pw / 2, y, pw, 48, 24)
  ctx.fillStyle = 'rgba(0, 233, 250, 0.12)'
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = C.cyan
  ctx.stroke()
  ctx.fillStyle = C.cyan
  ctx.textBaseline = 'middle'
  ctx.fillText(pill, cx + 2, y + 25) // +2 offsets the trailing letter-spacing
  ctx.textBaseline = 'alphabetic'
  setSpacing(ctx, 0)
  const pillBottom = y + 48

  // Registration ID chip, pinned to the bottom of the column (lined up with the QR).
  const chipH = 92
  const chipY = RIGHT.bottom - chipH

  // Lay out the four fields first so the block can be centred vertically
  // in the space between the pill and the ID chip.
  const LABEL_H = 20
  const LABEL_GAP = 12
  const FIELD_GAP = 40
  const fields = [
    ['Name', record.name, { weight: 700, max: 50, min: 32, maxLines: 3 }],
    ['Designation', record.designation, { weight: 600, max: 36, min: 26, maxLines: 2 }],
    ['Sector', record.sector, { weight: 600, max: 36, min: 26, maxLines: 1 }],
    ['Mobile', formatMobile(record.mobile), { weight: 500, max: 32, min: 24, maxLines: 1, color: C.cream }],
  ].map(([label, text, opts]) => {
    const { size, lines } = fit(ctx, text, { maxWidth: w, ...opts })
    return { label, lines, size, opts, height: LABEL_H + LABEL_GAP + lines.length * size * 1.12 }
  })
  const blockH = fields.reduce((h, f) => h + f.height, 0) + FIELD_GAP * (fields.length - 1)
  const areaTop = pillBottom + 30
  const areaBottom = chipY - 30
  y = Math.max(areaTop, areaTop + (areaBottom - areaTop - blockH) / 2)

  for (const f of fields) {
    y += LABEL_H
    ctx.font = `600 20px ${FONT}`
    setSpacing(ctx, 3)
    ctx.fillStyle = C.cyan
    ctx.fillText(f.label.toUpperCase(), cx + 1.5, y)
    setSpacing(ctx, 0)
    y += LABEL_GAP

    ctx.font = `${f.opts.weight} ${f.size}px ${FONT}`
    ctx.fillStyle = f.opts.color || C.white
    for (const line of f.lines) {
      y += f.size * 1.12
      ctx.fillText(line, cx, y)
    }
    y += FIELD_GAP
  }

  roundRect(ctx, x, chipY, w, chipH, 22)
  const g = ctx.createLinearGradient(x, 0, x + w, 0)
  g.addColorStop(0, C.cyan)
  g.addColorStop(1, '#1e8cff')
  ctx.fillStyle = g
  ctx.fill()
  ctx.fillStyle = C.navy800
  ctx.font = `600 17px ${FONT}`
  setSpacing(ctx, 3)
  ctx.fillText('REGISTRATION ID', cx + 1.5, chipY + 32)
  ctx.font = `700 36px ${FONT}`
  setSpacing(ctx, 2)
  ctx.fillText(record.id, cx + 1, chipY + 72)
  setSpacing(ctx, 0)
  ctx.textAlign = 'left'
}

function drawDivider(ctx) {
  const x = (LEFT.x + LEFT.w + RIGHT.x) / 2
  const g = ctx.createLinearGradient(0, 370, 0, 1150)
  g.addColorStop(0, 'rgba(0, 233, 250, 0)')
  g.addColorStop(0.5, 'rgba(0, 233, 250, 0.55)')
  g.addColorStop(1, 'rgba(0, 233, 250, 0)')
  ctx.fillStyle = g
  ctx.fillRect(x - 1, 370, 2, 780)
}

/** Renders the finished pass and returns a canvas the size of the frame. */
export async function renderPass(record, photo) {
  await Promise.all(
    ['400', '500', '600', '700'].map((w) => document.fonts.load(`${w} 32px Poppins`).catch(() => {})),
  )
  const qrData = await QRCode.toDataURL(record.id, {
    width: 600,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: C.navy800, light: C.white },
  })
  const [frame, qrImg] = await Promise.all([loadImage(frameUrl), loadImage(qrData)])

  const canvas = document.createElement('canvas')
  canvas.width = frame.naturalWidth
  canvas.height = frame.naturalHeight
  const ctx = canvas.getContext('2d')

  drawBackground(ctx)
  drawPhoto(ctx, photo)
  drawQr(ctx, qrImg)
  drawDivider(ctx)
  drawDetails(ctx, record)
  ctx.drawImage(frame, 0, 0)
  return canvas
}
