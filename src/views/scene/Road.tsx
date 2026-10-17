import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { PLACES, useSite } from '../../global/store'
import { drawProjectPanel, drawTapeSurface, INK, type TrackRow } from './art'
import { flipAmount, ROAD_ORIGIN, ROAD_WIDTH, roadCurve, roadFrame, trackU } from './roadPath'

const PANEL = { w: 2.3, h: 3.1 }

/** Faixa larga que segue a curva: a fita magnética como pista. */
function ribbon(segments = 700) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = []
  for (let i = 0; i <= segments; i++) {
    const u = i / segments
    const { pos: p, side } = roadFrame(u)
    const l = p.clone().addScaledVector(side, -ROAD_WIDTH / 2), r = p.clone().addScaledVector(side, ROAD_WIDTH / 2)
    pos.push(l.x, l.y, l.z, r.x, r.y, r.z)
    uv.push(u * 60, 0, u * 60, 1)
    if (i < segments) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2) }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx); g.computeVertexNormals()
  return g
}

export function Road({ rows, onOpenTrack }: { rows: TrackRow[]; onOpenTrack: (slug: string) => void }) {
  const group = useRef<THREE.Group>(null)
  const warm = useRef<THREE.DirectionalLight>(null)
  const amb = useRef<THREE.AmbientLight>(null)
  const reels = useRef<THREE.Group[]>([])
  const lamps = useRef<THREE.PointLight[]>([])

  const { geo, tapeMat, panels, panelGeo, reelMat, hubMat, pinMat } = useMemo(() => {
    const surface = drawTapeSurface()
    const bySide = { A: rows.filter((r) => r.side === 'A'), B: rows.filter((r) => r.side === 'B') }
    const panels = rows.map((row) => {
      const list = bySide[row.side], i = list.indexOf(row)
      const u = trackU(row.side, i, list.length)
      const f = roadFrame(u)
      const lateral = (i % 2 ? 1 : -1) * (ROAD_WIDTH / 2 + 1.35)
      // Lado A em pé sobre a fita; Lado B pendurado embaixo, de cabeça para baixo, para ler depois de virar
      const vertical = row.side === 'A' ? 1 : -1
      const center = f.pos.clone().addScaledVector(f.side, lateral).addScaledVector(f.up, vertical * (PANEL.h / 2 + 0.1))
      // base destra: x = lado, y = cima, z = contra a direção da viagem (a página olha para quem chega)
      const m = new THREE.Matrix4().makeBasis(f.side.clone().multiplyScalar(vertical), f.up.clone().multiplyScalar(vertical), f.tangent.clone().multiplyScalar(-1))
      const quat = new THREE.Quaternion().setFromRotationMatrix(m)
      // gira levemente para a pista, para a câmera ver a página chegando
      quat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.sign(lateral) * vertical * 0.45))
      const mat = new THREE.MeshBasicMaterial({ map: drawProjectPanel(PANEL, row), side: THREE.DoubleSide, toneMapped: false })
      return { row, center, quat, mat }
    })
    return {
      geo: ribbon(),
      tapeMat: new THREE.MeshStandardMaterial({ map: surface, emissiveMap: surface, emissive: '#5A3A2C', color: '#ffffff', roughness: 0.3, metalness: 0.25, side: THREE.DoubleSide }),
      panels, panelGeo: new THREE.PlaneGeometry(PANEL.w, PANEL.h),
      reelMat: new THREE.MeshStandardMaterial({ color: '#3B2620', roughness: 0.4, metalness: 0.3 }),
      hubMat: new THREE.MeshStandardMaterial({ color: INK.paper, roughness: 0.6 }),
      pinMat: new THREE.MeshStandardMaterial({ color: '#9A948C', roughness: 0.3, metalness: 0.85 }),
    }
  }, [rows])

  // os pinos-guia da fita viram pilares à beira da pista
  const pins = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const u = 0.04 + (i / 13) * 0.92, f = roadFrame(u), s = i % 2 ? 1 : -1
    return f.pos.clone().addScaledVector(f.side, s * (ROAD_WIDTH / 2 + 3.4)).addScaledVector(f.up, -0.4)
  }), [])

  useFrame((_, dt) => {
    const p = useSite.getState().progress
    const inside = p > PLACES.road[0] - 0.01 && p < PLACES.road[1] + 0.01
    if (group.current) group.current.visible = inside
    const flip = flipAmount(p)
    // Lado A: luz quente de abajur que entrou pela janela da fita. Lado B: luz fria de madrugada.
    if (warm.current) {
      warm.current.intensity = inside ? 4.2 : 0
      warm.current.color.lerpColors(new THREE.Color('#FFD7A0'), new THREE.Color('#8FA2FF'), flip)
      warm.current.position.copy(ROAD_ORIGIN).add(new THREE.Vector3(0, 30 * (1 - 2 * flip), 10))
    }
    lamps.current.forEach((l) => { if (l) l.intensity = inside ? 9 : 0 })
    if (amb.current) { amb.current.intensity = inside ? 1.1 : 0; amb.current.color.lerpColors(new THREE.Color('#6B4A3A'), new THREE.Color('#2E3270'), flip) }
    reels.current.forEach((r, i) => { if (r) r.rotation.y += dt * (i ? 0.25 : 0.2) })
  })

  const open = (slug: string) => (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onOpenTrack(slug) }
  const hover = (slug: string | null) => () => { useSite.getState().setHoverTrack(slug); document.body.style.cursor = slug ? 'pointer' : '' }

  const start = roadCurve.getPointAt(0), end = roadCurve.getPointAt(1)

  return (
    <>
      <directionalLight ref={warm} intensity={0} />
      <ambientLight ref={amb} intensity={0} />
      <group ref={group} visible={false}>
        <mesh geometry={geo} material={tapeMat} receiveShadow />
        {/* carretéis gigantes no começo e no fim da pista */}
        {[start, end].map((c, i) => (
          <group key={i} position={[c.x + (i ? 9 : -9), c.y - 1.5, c.z]} ref={(g) => { if (g) reels.current[i] = g }}>
            <mesh material={reelMat}><cylinderGeometry args={[9, 9, ROAD_WIDTH, 96]} /></mesh>
            <mesh material={hubMat} position-y={ROAD_WIDTH / 2 + 0.02}><cylinderGeometry args={[2.4, 2.4, 0.1, 6]} /></mesh>
            <mesh material={hubMat} position-y={-ROAD_WIDTH / 2 - 0.02}><cylinderGeometry args={[2.4, 2.4, 0.1, 6]} /></mesh>
          </group>
        ))}
        {pins.map((p, i) => (
          <mesh key={i} material={pinMat} position={p}><cylinderGeometry args={[0.3, 0.3, 2.2, 24]} /></mesh>
        ))}
        {panels.map(({ row, center }, i) => (
          <pointLight key={`l-${row.project.slug}`} ref={(l) => { if (l) lamps.current[i] = l }} position={center} intensity={0} distance={7} decay={1.6} color={row.side === 'A' ? '#FFD49A' : '#9DB0FF'} />
        ))}
        {panels.map(({ row, center, quat, mat }) => (
          <mesh key={row.project.slug} geometry={panelGeo} material={mat} position={center} quaternion={quat}
            onClick={open(row.project.slug)} onPointerOver={hover(row.project.slug)} onPointerOut={hover(null)} castShadow />
        ))}
      </group>
    </>
  )
}
