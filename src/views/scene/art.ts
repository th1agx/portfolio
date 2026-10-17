import * as THREE from 'three'
import type { Project } from '../../models/entities/Project'

// O encarte é impresso como numa risograph: três tintas sobre papel, cada uma levemente fora de registro,
// com grão de papel e meio-tom. Tudo desenhado em canvas, sem imagem externa.

export const INK = {
  paper: '#F2E8CF',
  mustard: '#F2B630',
  tomato: '#E0453A',
  navy: '#1E1F5C',
  line: '#1A1414',
}

const COND = '"Barlow Condensed", "Arial Narrow", sans-serif'
const HAND = '"Gloria Hallelujah", "Comic Sans MS", cursive'
const PX = 1024 // pixels por unidade de mundo

/** Painel do encarte em unidades de mundo. */
export interface PanelSpec { w: number; h: number }

function canvas(spec: PanelSpec) {
  const c = document.createElement('canvas')
  c.width = Math.round(spec.w * PX)
  c.height = Math.round(spec.h * PX)
  return [c, c.getContext('2d')!] as const
}

function rand(seed: number) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
}

/** Grão de papel por cima de tudo: o que faz parecer impresso e não renderizado. */
function grain(g: CanvasRenderingContext2D, amount = 26, seed = 1) {
  const { width: w, height: h } = g.canvas
  const d = g.getImageData(0, 0, w, h)
  const r = rand(seed)
  for (let i = 0; i < d.data.length; i += 4) {
    const n = (r() - 0.5) * amount
    d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n
  }
  g.putImageData(d, 0, 0)
}

/** Meio-tom: pontos de tamanho variável dentro de um círculo, como sol de capa de disco. */
function halftoneDisc(g: CanvasRenderingContext2D, cx: number, cy: number, radius: number, color: string, step = 14) {
  g.fillStyle = color
  for (let y = cy - radius; y <= cy + radius; y += step) {
    for (let x = cx - radius; x <= cx + radius; x += step) {
      const d = Math.hypot(x - cx, y - cy) / radius
      if (d > 1) continue
      const s = (1 - d * d) * step * 0.55 + 1
      g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill()
    }
  }
}

/** Linha de tinta que treme, como traço à mão. */
function wobblyLine(g: CanvasRenderingContext2D, pts: Array<[number, number]>, width: number, color: string, seed = 3) {
  const r = rand(seed)
  g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round'
  g.beginPath()
  pts.forEach(([x, y], i) => { const jx = x + (r() - 0.5) * width * 0.6, jy = y + (r() - 0.5) * width * 0.6; i ? g.lineTo(jx, jy) : g.moveTo(jx, jy) })
  g.stroke()
}

/** Imprime uma camada de tinta com desregistro: desenha duas vezes, a segunda deslocada e mais clara. */
function misregister(g: CanvasRenderingContext2D, draw: (dx: number, dy: number) => void) {
  g.save(); g.globalAlpha = 0.35; draw(3, -2); g.restore()
  draw(0, 0)
}

function star(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  g.fillStyle = color; g.beginPath()
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, rr = i % 2 ? r * 0.32 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) }
  g.closePath(); g.fill()
}

function texture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** Capa: quem ele é, em letra manuscrita grande sobre o azul-noite, um sol de meio-tom e os carretéis. */
export function drawCover(spec: PanelSpec) {
  const [c, g] = canvas(spec)
  const W = c.width, H = c.height
  g.fillStyle = INK.navy; g.fillRect(0, 0, W, H)
  misregister(g, (dx, dy) => halftoneDisc(g, W * 0.68 + dx, H * 0.36 + dy, W * 0.36, INK.tomato, 16))
  // carretéis da fita, o motivo geométrico da capa
  ;[[0.26, 0.6], [0.74, 0.72]].forEach(([fx, fy], k) => {
    const x = W * fx, y = H * fy
    for (let i = 0; i < 4; i++) wobblyLine(g, circlePts(x, y, W * (0.16 - i * 0.03)), 7, i % 2 ? INK.mustard : INK.paper, 10 + k * 5 + i)
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; wobblyLine(g, [[x + Math.cos(a) * W * 0.03, y + Math.sin(a) * W * 0.03], [x + Math.cos(a) * W * 0.065, y + Math.sin(a) * W * 0.065]], 8, INK.paper, 30 + i) }
  })
  // a fita passando de um carretel ao outro, tangente aos dois
  wobblyLine(g, [[W * 0.26, H * 0.6 + W * 0.16], [W * 0.74, H * 0.72 + W * 0.16]], 6, INK.paper, 51)
  ;[[0.12, 0.12, 22], [0.88, 0.1, 16], [0.16, 0.44, 12], [0.9, 0.52, 20], [0.52, 0.06, 10]].forEach(([fx, fy, r]) => star(g, W * fx, H * fy, r, INK.mustard))
  // nome em letra manuscrita, com contorno de tinta
  g.save(); g.translate(W * 0.08, H * 0.22); g.rotate(-0.06)
  g.font = `400 ${W * 0.135}px ${HAND}`; g.lineJoin = 'round'
  g.lineWidth = W * 0.022; g.strokeStyle = INK.line; g.strokeText('Thiago', 0, 0); g.strokeText('Antunes', 0, W * 0.15)
  g.fillStyle = INK.mustard; g.fillText('Thiago', 0, 0); g.fillText('Antunes', 0, W * 0.15)
  g.restore()
  g.fillStyle = INK.paper; g.font = `800 ${W * 0.06}px ${COND}`; g.textBaseline = 'alphabetic'
  g.fillText('ENGENHEIRO DE SOFTWARE', W * 0.08, H * 0.93)
  grain(g, 30, 11)
  return texture(c)
}

/** Lombada: o nome na vertical, como na estante. */
export function drawSpine(spec: PanelSpec) {
  const [c, g] = canvas(spec)
  const W = c.width, H = c.height
  g.fillStyle = INK.tomato; g.fillRect(0, 0, W, H)
  g.fillStyle = INK.paper; g.fillRect(0, 0, W, H * 0.12); g.fillRect(0, H * 0.92, W, H * 0.08)
  g.strokeStyle = INK.line; g.lineWidth = 6; g.strokeRect(W * 0.2, H * 0.03, W * 0.6, H * 0.06)
  g.save(); g.translate(W * 0.5, H * 0.52); g.rotate(Math.PI / 2)
  g.font = `800 ${W * 0.62}px ${COND}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = INK.line
  g.fillText('THIAGO ANTUNES', 0, 0)
  g.restore()
  g.font = `800 ${W * 0.2}px ${COND}`; g.textAlign = 'center'; g.fillStyle = INK.line; g.fillText('TA-001', W / 2, H * 0.975)
  grain(g, 24, 12)
  return texture(c)
}

/** Aba de créditos: o que ele faz, de verdade, em texto corrido vertical. */
export function drawCredits(spec: PanelSpec) {
  const [c, g] = canvas(spec)
  const W = c.width, H = c.height
  g.fillStyle = INK.mustard; g.fillRect(0, 0, W, H)
  halftoneDisc(g, W * 0.5, H * 0.1, W * 0.32, INK.tomato, 10)
  g.save(); g.translate(W * 0.5, H * 0.56); g.rotate(Math.PI / 2)
  g.font = `800 ${W * 0.13}px ${COND}`; g.textAlign = 'center'; g.fillStyle = INK.line
  ;['ENGENHEIRO DE SOFTWARE NA 3D LAB  ·  BELO HORIZONTE', 'PYTHON  ·  TYPESCRIPT  ·  PHP  ·  LARAVEL  ·  NEST  ·  IA', 'GRAVADO EM 2026  ·  ESCRITO E PROGRAMADO POR THIAGO'].forEach((l, i) => g.fillText(l, 0, (i - 1) * W * 0.2))
  g.restore()
  grain(g, 24, 13)
  return texture(c)
}

export interface TrackRow { side: 'A' | 'B'; code: string; project: Project }

/** Geometria das linhas da tracklist, compartilhada entre o desenho e o clique. */
export function trackLayout(rows: TrackRow[]) {
  const top = 0.17, rowH = 0.115, sideGap = 0.08
  return rows.map((r, i) => {
    const sideOffset = r.side === 'B' ? sideGap : 0
    const y0 = top + i * rowH + sideOffset
    return { ...r, y0, y1: y0 + rowH }
  })
}

/** Dobra de dentro: a tracklist. Cada projeto é uma faixa. hover acende a linha. */
export function drawTracklist(spec: PanelSpec, rows: TrackRow[], hover: string | null, target?: THREE.CanvasTexture) {
  const [c, g] = target ? [target.image as HTMLCanvasElement, (target.image as HTMLCanvasElement).getContext('2d')!] : canvas(spec)
  const W = c.width, H = c.height
  g.fillStyle = INK.paper; g.fillRect(0, 0, W, H)
  g.font = `800 ${W * 0.085}px ${COND}`; g.fillStyle = INK.tomato; g.textBaseline = 'alphabetic'
  const layout = trackLayout(rows)
  const first = (side: string) => layout.find((l) => l.side === side)!
  g.fillText('LADO A', W * 0.08, H * (first('A').y0 - 0.02))
  g.fillText('LADO B', W * 0.08, H * (first('B').y0 - 0.02))
  layout.forEach((l, i) => {
    const y = H * l.y0, h = H * (l.y1 - l.y0)
    if (hover === l.project.slug) { g.fillStyle = INK.mustard; g.fillRect(W * 0.05, y + h * 0.05, W * 0.9, h * 0.9) }
    g.fillStyle = INK.navy; g.font = `800 ${W * 0.075}px ${COND}`
    g.fillText(`${l.code}  ${l.project.name.toUpperCase()}`, W * 0.08, y + h * 0.4)
    g.fillStyle = INK.line; g.font = `400 ${W * 0.029}px ${HAND}`
    wrap(g, l.project.line, W * 0.08, y + h * 0.64, W * 0.84, 2)
    wobblyLine(g, [[W * 0.08, y + h], [W * 0.92, y + h]], 2, INK.navy, 70 + i)
  })
  grain(g, 22, 14)
  if (target) { target.needsUpdate = true; return target }
  return texture(c)
}

/** Verso: onde encontrar o Thiago. */
export function drawBack(spec: PanelSpec) {
  const [c, g] = canvas(spec)
  const W = c.width, H = c.height
  g.fillStyle = INK.navy; g.fillRect(0, 0, W, H)
  misregister(g, (dx, dy) => halftoneDisc(g, W * 0.3 + dx, H * 0.78 + dy, W * 0.3, INK.mustard, 14))
  g.save(); g.translate(W * 0.08, H * 0.2); g.rotate(-0.05)
  g.font = `400 ${W * 0.09}px ${HAND}`; g.lineWidth = W * 0.016; g.strokeStyle = INK.line; g.lineJoin = 'round'
  g.strokeText('Lado de fora', 0, 0); g.fillStyle = INK.tomato; g.fillText('Lado de fora', 0, 0)
  g.restore()
  g.fillStyle = INK.paper; g.font = `800 ${W * 0.07}px ${COND}`
  g.fillText('GITHUB.COM/TH1AGX', W * 0.08, H * 0.38)
  g.fillText('LINKEDIN.COM/IN/', W * 0.08, H * 0.48)
  g.fillText('THIAGOFILIPEANTUNES', W * 0.08, H * 0.555)
  grain(g, 28, 15)
  return texture(c)
}

/** Etiqueta da fita: o título manuscrito sobre papel. */
export function drawLabel(spec: PanelSpec, title: string) {
  const [c, g] = canvas(spec)
  const W = c.width, H = c.height
  g.fillStyle = INK.paper; g.fillRect(0, 0, W, H)
  g.fillStyle = INK.tomato; g.fillRect(0, H * 0.72, W, H * 0.28)
  wobblyLine(g, [[W * 0.06, H * 0.3], [W * 0.94, H * 0.3]], 3, INK.navy, 90)
  wobblyLine(g, [[W * 0.06, H * 0.52], [W * 0.94, H * 0.52]], 3, INK.navy, 91)
  g.font = `400 ${H * 0.2}px ${HAND}`; g.fillStyle = INK.navy; g.fillText(title, W * 0.07, H * 0.26)
  g.font = `800 ${H * 0.16}px ${COND}`; g.fillStyle = INK.line; g.fillText('A', W * 0.9, H * 0.92)
  grain(g, 20, 16)
  return texture(c)
}

function circlePts(x: number, y: number, r: number): Array<[number, number]> {
  return Array.from({ length: 49 }, (_, i) => { const a = (i / 48) * Math.PI * 2; return [x + Math.cos(a) * r, y + Math.sin(a) * r] })
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lines: number) {
  const words = text.split(' ')
  let line = '', n = 0
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (g.measureText(test).width > max && line) { g.fillText(line, x, y); line = w; y += max * 0.052; if (++n >= lines) return }
    else line = test
  }
  if (line && n < lines) g.fillText(line, x, y)
}
