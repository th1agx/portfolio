import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { ANCHORS, useSite } from '../../global/store'
import { device } from '../../global/device'
import type { Container } from '../../app/container'

// Um repouso por âncora: onde a câmera fica e para onde olha. Entre eles, curva Catmull-Rom.
const SHOTS: Array<{ at: number; pos: [number, number, number]; look: [number, number, number] }> = [
  { at: ANCHORS.intro, pos: [-0.5, 0.22, 2.25], look: [-1, 0, 0] },
  { at: ANCHORS.opened, pos: [0.25, 0.4, 3.6], look: [0.2, 0, 0.1] },
  { at: ANCHORS.cover, pos: [1.75, 0.04, 2.35], look: [1.55, 0, 0.3] },
  { at: ANCHORS.spine, pos: [0.95, 0.06, 1.65], look: [1.18, 0, 0.3] },
  { at: ANCHORS.tracklist, pos: [2.2, 0.02, 2.3], look: [2.2, 0, 0.3] },
  { at: ANCHORS.back, pos: [0.7, 0.02, 2.3], look: [0.7, 0, 0.3] },
  { at: ANCHORS.end, pos: [0.55, 0.55, 4.3], look: [0.65, 0, 0] },
]

const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

export function CameraRig({ container }: { container: Container }) {
  const curves = useMemo(() => ({
    pos: new THREE.CatmullRomCurve3(SHOTS.map((s) => new THREE.Vector3(...s.pos)), false, 'centripetal'),
    look: new THREE.CatmullRomCurve3(SHOTS.map((s) => new THREE.Vector3(...s.look)), false, 'centripetal'),
  }), [])
  const target = useRef({ pos: new THREE.Vector3(), look: new THREE.Vector3() })
  const current = useRef<{ pos: THREE.Vector3; look: THREE.Vector3 } | null>(null)

  useFrame(({ camera }, delta) => {
    const p = useSite.getState().progress
    // em qual trecho entre duas âncoras estamos; a curva desacelera perto de cada repouso
    let i = 0
    while (i < SHOTS.length - 2 && p > SHOTS[i + 1].at) i++
    const a = SHOTS[i].at, b = SHOTS[i + 1].at
    const u = easeInOut(Math.min(1, Math.max(0, (p - a) / (b - a))))
    const t = (i + u) / (SHOTS.length - 1)
    curves.pos.getPoint(t, target.current.pos)
    curves.look.getPoint(t, target.current.look)
    // um respiro do ponteiro, como câmera na mão
    if (!device.reducedMotion) {
      target.current.pos.x += container.pointer.ndc.x * 0.04
      target.current.pos.y += container.pointer.ndc.y * 0.03
    }
    if (!current.current) current.current = { pos: target.current.pos.clone(), look: target.current.look.clone() }
    const k = device.reducedMotion ? 1 : 1 - Math.exp(-delta * 5)
    current.current.pos.lerp(target.current.pos, k)
    current.current.look.lerp(target.current.look, k)
    camera.position.copy(current.current.pos)
    camera.lookAt(current.current.look)
  })
  return null
}
