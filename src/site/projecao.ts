import { Euler, Vector3 } from 'three'

// Um retângulo 3D projetado na tela, devolvido como path de clip-path com cantos arredondados.
// É o mesmo princípio do quadro do Zentry (lido no componente Frame deles): quatro cantos com escala e
// rotação, projetados com distância focal, e curvas quadráticas em cada canto. Implementação própria.

const FOCAL = 900
const CANTOS = [new Vector3(0.5, -0.5, 0), new Vector3(0.5, 0.5, 0), new Vector3(-0.5, 0.5, 0), new Vector3(-0.5, -0.5, 0)]
const tmp = new Vector3()
const giro = new Euler()

type P = { x: number; y: number }

export type Quadro = { cx: number; cy: number; w: number; h: number; rx: number; ry: number; rz: number; raio: number }

export function caminhoDoQuadro(q: Quadro) {
  giro.set(q.rx, q.ry, q.rz)
  const pts: P[] = CANTOS.map((c) => {
    tmp.set(c.x * q.w, c.y * q.h, 0).applyEuler(giro)
    const k = FOCAL / (FOCAL + tmp.z)
    return { x: q.cx + tmp.x * k, y: q.cy + tmp.y * k }
  })
  let d = ''
  for (let i = 0; i < 4; i++) {
    const a = pts[(i + 3) % 4]!
    const b = pts[i]!
    const c = pts[(i + 1) % 4]!
    const la = Math.hypot(a.x - b.x, a.y - b.y)
    const lc = Math.hypot(c.x - b.x, c.y - b.y)
    const r = Math.min(q.raio, la / 2, lc / 2)
    const p1x = b.x + ((a.x - b.x) / la) * r
    const p1y = b.y + ((a.y - b.y) / la) * r
    const p2x = b.x + ((c.x - b.x) / lc) * r
    const p2y = b.y + ((c.y - b.y) / lc) * r
    d += `${i ? 'L' : 'M'}${p1x.toFixed(1)},${p1y.toFixed(1)} Q${b.x.toFixed(1)},${b.y.toFixed(1)} ${p2x.toFixed(1)},${p2y.toFixed(1)} `
  }
  return `path('${d}Z')`
}

export const suave = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return k * k * (3 - 2 * k)
}
