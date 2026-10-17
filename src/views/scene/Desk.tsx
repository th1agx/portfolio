import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { ANCHORS, PLACES, useSite } from '../../global/store'
import { INK } from './art'

// A mesa onde a fita está. Tudo aqui é desligado quando a câmera entra na fita.
export const DESK_Y = -0.56
export const PLAYER = { x: -2.6, y: DESK_Y + 0.43, w: 1.25, h: 0.86, d: 0.26 }

const smooth = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t) }

/** Momentos do toca-fitas, em fração do scroll. */
export const PLAYER_TIMING = {
  doorOpen: [ANCHORS.back + 0.01, ANCHORS.back + 0.03] as const,
  tapeIn: [ANCHORS.back + 0.025, ANCHORS.player - 0.015] as const,
  doorClose: [ANCHORS.player - 0.02, ANCHORS.player - 0.005] as const,
  play: [ANCHORS.player, ANCHORS.player + 0.015] as const,
}

export function Desk() {
  const lamp = useRef<THREE.SpotLight>(null)
  const fill = useRef<THREE.PointLight>(null)
  const playerFill = useRef<THREE.PointLight>(null)
  const door = useRef<THREE.Group>(null)
  const play = useRef<THREE.Mesh>(null)
  const group = useRef<THREE.Group>(null)

  const geo = useMemo(() => ({
    body: new RoundedBoxGeometry(PLAYER.w, PLAYER.h, PLAYER.d, 4, 0.06),
    door: new RoundedBoxGeometry(PLAYER.w * 0.86, PLAYER.h * 0.72, 0.03, 3, 0.02),
    key: new RoundedBoxGeometry(0.16, 0.06, 0.12, 2, 0.015),
  }), [])

  const mats = useMemo(() => ({
    wood: new THREE.MeshStandardMaterial({ color: '#2B1E17', roughness: 0.72, metalness: 0.02 }),
    plastic: new THREE.MeshStandardMaterial({ color: INK.tomato, roughness: 0.42, metalness: 0.05 }),
    door: new THREE.MeshPhysicalMaterial({ color: '#cfd3dc', roughness: 0.08, transmission: 0.88, thickness: 0.02, ior: 1.49 }),
    key: new THREE.MeshStandardMaterial({ color: INK.paper, roughness: 0.5 }),
    playKey: new THREE.MeshStandardMaterial({ color: INK.tomato, roughness: 0.45 }),
    metal: new THREE.MeshStandardMaterial({ color: '#8C8780', roughness: 0.35, metalness: 0.8 }),
    shade: new THREE.MeshStandardMaterial({ color: INK.mustard, roughness: 0.55, side: THREE.DoubleSide }),
    bulb: new THREE.MeshBasicMaterial({ color: '#FFE9C4' }),
  }), [])

  useFrame(() => {
    const p = useSite.getState().progress
    const onDesk = p < PLACES.desk[1] + 0.01 || p > PLACES.road[1]
    if (group.current) group.current.visible = onDesk
    if (lamp.current) {
      lamp.current.intensity = onDesk ? 34 : 0
      // o alvo do abajur precisa estar atualizado no mundo para a luz apontar para a mesa
      lamp.current.target.position.set(-0.9, DESK_Y, 0.3)
      lamp.current.target.updateMatrixWorld()
    }
    if (fill.current) fill.current.intensity = onDesk ? 2.2 : 0
    if (playerFill.current) playerFill.current.intensity = onDesk ? 3 : 0
    const open = smooth(...PLAYER_TIMING.doorOpen, p) * (1 - smooth(...PLAYER_TIMING.doorClose, p))
    if (door.current) door.current.rotation.x = open * 1.15
    if (play.current) play.current.position.y = PLAYER.h / 2 + 0.03 - smooth(...PLAYER_TIMING.play, p) * 0.035
  })

  return (
    <>
      {/* a luz do abajur e uma luz de preenchimento quente */}
      <spotLight ref={lamp} position={[-0.3, 2.1, -0.6]} angle={1.15} penumbra={0.9} intensity={34} color="#FFE2B8" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
      <pointLight ref={fill} position={[2.4, 0.6, 2.2]} intensity={2.2} distance={5} color="#FFD9A8" />
      <pointLight ref={playerFill} position={[PLAYER.x + 0.6, PLAYER.y + 0.9, 1.6]} intensity={3} distance={4} color="#FFD9A8" />
      <group ref={group}>
        {/* tampo */}
        <mesh material={mats.wood} rotation-x={-Math.PI / 2} position={[0, DESK_Y, 0]} receiveShadow><planeGeometry args={[11, 6]} /></mesh>
        {/* abajur: base, haste e cúpula mostarda */}
        <group position={[-0.3, DESK_Y, -1.3]}>
          <mesh material={mats.metal} position-y={0.03} castShadow><cylinderGeometry args={[0.28, 0.32, 0.06, 32]} /></mesh>
          <mesh material={mats.metal} position={[0, 1.2, 0.18]} rotation-x={0.25} castShadow><cylinderGeometry args={[0.025, 0.025, 2.4, 12]} /></mesh>
          <mesh material={mats.shade} position={[0, 2.45, 0.55]} rotation-x={-0.55} castShadow><coneGeometry args={[0.42, 0.5, 32, 1, true]} /></mesh>
          <mesh material={mats.bulb} position={[0, 2.36, 0.62]}><sphereGeometry args={[0.1, 16, 12]} /></mesh>
        </group>
        {/* toca-fitas portátil, em pé, de frente */}
        <group position={[PLAYER.x, PLAYER.y, 0]}>
          <mesh material={mats.plastic} geometry={geo.body} castShadow receiveShadow />
          <group ref={door} position={[0, -PLAYER.h * 0.36, PLAYER.d / 2]}>
            <mesh material={mats.door} geometry={geo.door} position={[0, PLAYER.h * 0.36, 0.02]} />
          </group>
          {[-0.36, -0.12, 0.12, 0.36].map((x, i) => (
            <mesh key={x} ref={i === 1 ? play : undefined} material={i === 1 ? mats.playKey : mats.key} geometry={geo.key} position={[x, PLAYER.h / 2 + 0.03, 0]} castShadow />
          ))}
          <mesh material={mats.metal} position={[PLAYER.w / 2 + 0.01, 0.2, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.03, 0.03, 0.04, 16]} /></mesh>
        </group>
      </group>
    </>
  )
}
