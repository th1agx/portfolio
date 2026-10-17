import * as THREE from 'three'
import { ANCHORS, PLACES } from '../../global/store'

// Dentro da fita: um mundo separado, longe da mesa, onde a fita magnética é uma pista.
export const ROAD_ORIGIN = new THREE.Vector3(0, -60, 0)
export const ROAD_WIDTH = 2.6

const local: Array<[number, number, number]> = [
  [-26, 0, 2], [-18, 0.8, -5], [-9, -0.4, -1], [0, 1.2, -9], [9, -0.2, -3], [18, 0.9, -11], [27, 0, -5], [34, 0.4, 2],
]

export const roadCurve = new THREE.CatmullRomCurve3(local.map(([x, y, z]) => new THREE.Vector3(x, y, z).add(ROAD_ORIGIN)), false, 'centripetal')

/** Quadro local da pista num ponto u: tangente, "cima" (normal da fita) e lado. */
export function roadFrame(u: number) {
  const t = Math.min(0.999, Math.max(0.001, u))
  const pos = roadCurve.getPointAt(t)
  const tangent = roadCurve.getTangentAt(t).normalize()
  const side = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize()
  const up = new THREE.Vector3().crossVectors(side, tangent).normalize()
  return { pos, tangent, side, up }
}

const smooth = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t) }

/** Converte o progresso do scroll na posição ao longo da pista (0 a 1). */
export function roadU(p: number) {
  const [a, b] = PLACES.road
  return 0.02 + 0.96 * Math.min(1, Math.max(0, (p - a) / (b - a)))
}

/** Quanto a fita já virou: 0 = Lado A (por cima), 1 = Lado B (por baixo). */
export function flipAmount(p: number) {
  return smooth(ANCHORS.flip - 0.035, ANCHORS.flip + 0.035, p)
}

/** Onde cada faixa fica na pista: Lado A antes da virada, Lado B depois. */
export function trackU(side: 'A' | 'B', indexInSide: number, countInSide: number) {
  const [a, b] = PLACES.road
  const span = (x: number) => roadU(a + (b - a) * x)
  if (side === 'A') {
    const from = (ANCHORS.sideA - 0.05 - a) / (b - a), to = (ANCHORS.flip - 0.06 - a) / (b - a)
    return span(from + ((to - from) * (indexInSide + 0.5)) / countInSide)
  }
  const from = (ANCHORS.flip + 0.05 - a) / (b - a), to = (b - 0.03 - a) / (b - a)
  return span(from + ((to - from) * (indexInSide + 0.5)) / countInSide)
}
