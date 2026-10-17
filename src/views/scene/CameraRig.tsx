import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { ANCHORS, PLACES, useSite } from '../../global/store'
import { device } from '../../global/device'
import type { Container } from '../../app/container'
import { PLAYER } from './Desk'
import { flipAmount, roadFrame, roadU } from './roadPath'

// Mesa: um repouso por âncora (onde a câmera fica e para onde olha), ligados por curva Catmull-Rom.
const DESK_SHOTS: Array<{ at: number; pos: [number, number, number]; look: [number, number, number] }> = [
  { at: ANCHORS.intro, pos: [-0.5, 0.22, 2.25], look: [-1, 0, 0] },
  { at: ANCHORS.opened, pos: [0.25, 0.4, 3.6], look: [0.2, 0, 0.1] },
  { at: ANCHORS.cover, pos: [1.75, 0.04, 2.35], look: [1.55, 0, 0.3] },
  { at: ANCHORS.spine, pos: [0.95, 0.06, 1.65], look: [1.18, 0, 0.3] },
  { at: ANCHORS.tracklist, pos: [2.2, 0.02, 2.3], look: [2.2, 0, 0.3] },
  { at: ANCHORS.back, pos: [0.7, 0.02, 2.3], look: [0.7, 0, 0.3] },
  { at: ANCHORS.player, pos: [-1.75, 0.55, 2.6], look: [PLAYER.x, PLAYER.y, 0] },
  // o mergulho: a câmera encosta na janela da fita até a tela ficar escura
  { at: ANCHORS.dive, pos: [PLAYER.x, PLAYER.y + 0.0, 0.32], look: [PLAYER.x, PLAYER.y, 0] },
]
// depois de rebobinar, a mesa vista de longe
const END_SHOT = { pos: new THREE.Vector3(0.1, 1.1, 5.6), look: new THREE.Vector3(-0.4, -0.25, 0) }

const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

export function CameraRig({ container }: { container: Container }) {
  const curves = useMemo(() => ({
    pos: new THREE.CatmullRomCurve3(DESK_SHOTS.map((s) => new THREE.Vector3(...s.pos)), false, 'centripetal'),
    look: new THREE.CatmullRomCurve3(DESK_SHOTS.map((s) => new THREE.Vector3(...s.look)), false, 'centripetal'),
  }), [])
  const target = useRef({ pos: new THREE.Vector3(), look: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) })
  const current = useRef<{ pos: THREE.Vector3; look: THREE.Vector3; up: THREE.Vector3 } | null>(null)
  const lastPlace = useRef<'desk' | 'road' | 'end'>('desk')

  useFrame(({ camera }, delta) => {
    const p = useSite.getState().progress
    const place = p < PLACES.road[0] ? 'desk' : p < PLACES.road[1] ? 'road' : 'end'
    const T = target.current

    if (place === 'desk') {
      let i = 0
      while (i < DESK_SHOTS.length - 2 && p > DESK_SHOTS[i + 1].at) i++
      const a = DESK_SHOTS[i].at, b = DESK_SHOTS[i + 1].at
      const u = easeInOut(Math.min(1, Math.max(0, (p - a) / (b - a))))
      const t = (i + u) / (DESK_SHOTS.length - 1)
      curves.pos.getPoint(t, T.pos)
      curves.look.getPoint(t, T.look)
      T.up.set(0, 1, 0)
    } else if (place === 'road') {
      // sobre a pista: um pouco acima da fita, olhando adiante. Na virada, gira em torno da fita.
      const u = roadU(p)
      const f = roadFrame(u), ahead = roadFrame(Math.min(0.999, u + 0.03))
      const angle = Math.PI * flipAmount(p)
      const up = f.up.clone().applyAxisAngle(f.tangent, angle)
      T.pos.copy(f.pos).addScaledVector(up, 0.85)
      T.look.copy(ahead.pos).addScaledVector(ahead.up.clone().applyAxisAngle(ahead.tangent, angle), 0.55)
      T.up.copy(up)
    } else {
      T.pos.copy(END_SHOT.pos); T.look.copy(END_SHOT.look); T.up.set(0, 1, 0)
    }

    // um respiro do ponteiro, como câmera na mão
    if (!device.reducedMotion && place !== 'road') {
      T.pos.x += container.pointer.ndc.x * 0.04
      T.pos.y += container.pointer.ndc.y * 0.03
    }

    // troca de lugar é um corte seco (escondido pelo escuro da janela), nunca uma viagem pelo vazio
    if (!current.current || place !== lastPlace.current) {
      current.current = { pos: T.pos.clone(), look: T.look.clone(), up: T.up.clone() }
      lastPlace.current = place
    }
    const k = device.reducedMotion ? 1 : 1 - Math.exp(-delta * (place === 'road' ? 7 : 5))
    current.current.pos.lerp(T.pos, k)
    current.current.look.lerp(T.look, k)
    current.current.up.lerp(T.up, k).normalize()
    // dentro da fita a lente abre: mais pista na tela, mais sensação de velocidade
    const cam = camera as THREE.PerspectiveCamera
    const fov = place === 'road' ? 56 : 34
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov += (fov - cam.fov) * (place !== lastPlace.current ? 1 : Math.min(1, delta * 4)); cam.updateProjectionMatrix() }
    camera.position.copy(current.current.pos)
    camera.up.copy(current.current.up)
    camera.lookAt(current.current.look)
  })
  return null
}
