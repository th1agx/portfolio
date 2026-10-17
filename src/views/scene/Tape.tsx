import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { useSite } from '../../global/store'
import { drawBack, drawCover, drawCredits, drawLabel, drawSpine, drawTracklist, INK, trackLayout, type TrackRow } from './art'
import { person } from '../../models/content/pt'

// Medidas em unidades de mundo. A caixa fica em pé, como a fita na estante.
export const CASE = { w: 0.72, h: 1.12, d: 0.18, x: -1 }
export const CARD = { h: 1.04, cover: 0.66, spine: 0.12, credits: 0.22, back: 0.66, tracks: 0.66, x: 1.6, z: 0.3 }

const smooth = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t) }

interface Props {
  rows: TrackRow[]
  onOpenTrack: (slug: string) => void
}

export function Tape({ rows, onOpenTrack }: Props) {
  const lid = useRef<THREE.Group>(null)
  const card = useRef<THREE.Group>(null)
  const spineHinge = useRef<THREE.Group>(null)
  const creditsHinge = useRef<THREE.Group>(null)
  const backHinge = useRef<THREE.Group>(null)
  const tracksHinge = useRef<THREE.Group>(null)
  const reels = useRef<THREE.Group[]>([])

  const tex = useMemo(() => ({
    cover: drawCover({ w: CARD.cover, h: CARD.h }),
    spine: drawSpine({ w: CARD.spine, h: CARD.h }),
    credits: drawCredits({ w: CARD.credits, h: CARD.h }),
    back: drawBack({ w: CARD.back, h: CARD.h }),
    tracks: drawTracklist({ w: CARD.tracks, h: CARD.h }, rows, null),
    label: drawLabel({ w: 0.86, h: 0.34 }, person.name),
  }), [rows])

  // a linha da tracklist acende quando o cursor passa por cima
  const hover = useSite((s) => s.hoverTrack)
  useEffect(() => { drawTracklist({ w: CARD.tracks, h: CARD.h }, rows, hover, tex.tracks) }, [hover, rows, tex.tracks])

  // geometrias criadas uma vez: o componente re-renderiza no hover da tracklist
  const geo = useMemo(() => ({
    tray: new RoundedBoxGeometry(CASE.w, CASE.h, CASE.d / 2, 3, 0.02),
    lid: new RoundedBoxGeometry(CASE.w, CASE.h, 0.03, 3, 0.012),
    shell: new RoundedBoxGeometry(1.0, 0.63, 0.1, 4, 0.03),
  }), [])

  const mats = useMemo(() => {
    const paper = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ map, roughness: 0.86, metalness: 0 })
    return {
      cover: paper(tex.cover), spine: paper(tex.spine), credits: paper(tex.credits), back: paper(tex.back), tracks: paper(tex.tracks),
      paperBack: new THREE.MeshStandardMaterial({ color: INK.paper, roughness: 0.9 }),
      acrylic: new THREE.MeshPhysicalMaterial({ color: '#dfe3ea', roughness: 0.06, transmission: 0.92, thickness: 0.03, ior: 1.49, transparent: true, opacity: 1 }),
      shell: new THREE.MeshPhysicalMaterial({ color: '#2c2724', roughness: 0.35, transmission: 0.35, thickness: 0.08, ior: 1.45 }),
      label: new THREE.MeshStandardMaterial({ map: tex.label, roughness: 0.8 }),
      tape: new THREE.MeshStandardMaterial({ color: '#3b2620', roughness: 0.45, metalness: 0.2 }),
      hub: new THREE.MeshStandardMaterial({ color: INK.paper, roughness: 0.6 }),
      window: new THREE.MeshPhysicalMaterial({ color: '#1a1714', roughness: 0.1, transmission: 0.6, thickness: 0.01 }),
    }
  }, [tex])

  useFrame((_, delta) => {
    const s = useSite.getState()
    const p = s.progress
    // tampa abre para frente e para baixo
    if (lid.current) lid.current.rotation.x = -1.75 * smooth(0.02, 0.11, p)
    // o encarte sai de dentro da caixa e vai para a direita
    const slide = smooth(0.05, 0.16, p)
    if (card.current) {
      card.current.position.set(THREE.MathUtils.lerp(CASE.x, CARD.x, slide), Math.sin(slide * Math.PI) * 0.18, THREE.MathUtils.lerp(0.06, CARD.z, slide))
      card.current.rotation.set(0, Math.sin(slide * Math.PI) * -0.5, Math.sin(slide * Math.PI) * 0.06)
    }
    // dobradiças: cada painel abre quando a câmera chega perto dele
    if (spineHinge.current) spineHinge.current.rotation.y = -Math.PI / 2 * (1 - smooth(0.3, 0.4, p))
    const side = smooth(0.66, 0.78, p)
    if (creditsHinge.current) creditsHinge.current.rotation.y = -Math.PI / 2 * (1 - side)
    // o verso só aparece quando começa a abrir: dobrado, ele ficaria para fora da capa
    if (backHinge.current) { backHinge.current.rotation.y = -Math.PI * 0.985 * (1 - side); backHinge.current.visible = side > 0.02 }
    if (creditsHinge.current) creditsHinge.current.visible = side > 0.02 || p < 0.3
    // a tracklist fica dobrada atrás da capa (z negativo) e gira para a direita
    if (tracksHinge.current) tracksHinge.current.rotation.y = Math.PI * 0.985 * (1 - smooth(0.48, 0.58, p))
    // carretéis giram devagar sempre, e rápido quando uma faixa está em foco
    const speed = s.hoverTrack || s.activeProject ? 6 : 0.6
    reels.current.forEach((r, i) => { if (r) r.rotation.z -= delta * speed * (i ? 1.15 : 1) })
  })

  const onTracksMove = (e: ThreeEvent<PointerEvent>) => {
    if (!e.uv) return
    const y = 1 - e.uv.y
    const row = trackLayout(rows).find((r) => y >= r.y0 && y <= r.y1)
    const slug = row?.project.slug ?? null
    if (useSite.getState().hoverTrack !== slug) useSite.getState().setHoverTrack(slug)
    document.body.style.cursor = slug ? 'pointer' : ''
  }
  const onTracksLeave = () => { useSite.getState().setHoverTrack(null); document.body.style.cursor = '' }
  const onTracksClick = (e: ThreeEvent<MouseEvent>) => { const slug = useSite.getState().hoverTrack; if (slug) { e.stopPropagation(); onOpenTrack(slug) } }

  const onBackClick = (e: ThreeEvent<MouseEvent>) => {
    if (!e.uv) return
    const y = 1 - e.uv.y
    if (y > 0.31 && y < 0.4) window.open(person.links.github, '_blank', 'noopener')
    else if (y > 0.41 && y < 0.58) window.open(person.links.linkedin, '_blank', 'noopener')
  }
  const onBackMove = (e: ThreeEvent<PointerEvent>) => { const y = e.uv ? 1 - e.uv.y : 0; document.body.style.cursor = y > 0.31 && y < 0.58 ? 'pointer' : '' }

  const panel = (w: number, mat: THREE.Material, extra?: Partial<React.ComponentProps<'mesh'>>) => (
    <group>
      <mesh material={mat} castShadow receiveShadow {...extra}><planeGeometry args={[w, CARD.h]} /></mesh>
      <mesh material={mats.paperBack} rotation-y={Math.PI} position-z={-0.002}><planeGeometry args={[w, CARD.h]} /></mesh>
    </group>
  )

  return (
    <group>
      {/* caixa de acrílico: bandeja de trás + tampa articulada embaixo */}
      <group position={[CASE.x, 0, 0]}>
        <mesh material={mats.acrylic} geometry={geo.tray} position-z={-CASE.d / 4} />
        <group ref={lid} position={[0, -CASE.h / 2, CASE.d / 4]}>
          <mesh material={mats.acrylic} geometry={geo.lid} position={[0, CASE.h / 2, 0.02]} />
        </group>
        {/* a fita, deitada de lado dentro da caixa */}
        <group rotation-z={Math.PI / 2} position-z={-0.04}>
          <mesh material={mats.shell} geometry={geo.shell} castShadow />
          <mesh material={mats.label} position={[0, 0.1, 0.052]}><planeGeometry args={[0.86, 0.34]} /></mesh>
          <mesh material={mats.window} position={[0, -0.02, 0.053]}><planeGeometry args={[0.46, 0.13]} /></mesh>
          {[-0.21, 0.21].map((x, i) => (
            <group key={x} position={[x, -0.02, 0.01]} ref={(g) => { if (g) reels.current[i] = g }}>
              <mesh material={mats.tape} rotation-x={Math.PI / 2}><cylinderGeometry args={[i ? 0.11 : 0.17, i ? 0.11 : 0.17, 0.06, 48]} /></mesh>
              <mesh material={mats.hub} rotation-x={Math.PI / 2} position-z={0.035}><cylinderGeometry args={[0.045, 0.045, 0.01, 6]} /></mesh>
            </group>
          ))}
        </group>
      </group>

      {/* encarte: capa no centro; à esquerda lombada → créditos → verso; à direita a tracklist */}
      <group ref={card}>
        {panel(CARD.cover, mats.cover)}
        <group ref={spineHinge} position-x={-CARD.cover / 2}>
          <group position-x={-CARD.spine / 2}>{panel(CARD.spine, mats.spine)}</group>
          <group ref={creditsHinge} position-x={-CARD.spine}>
            <group position-x={-CARD.credits / 2}>{panel(CARD.credits, mats.credits)}</group>
            <group ref={backHinge} position-x={-CARD.credits}>
              <group position-x={-CARD.back / 2}>{panel(CARD.back, mats.back, { onClick: onBackClick, onPointerMove: onBackMove, onPointerLeave: onTracksLeave })}</group>
            </group>
          </group>
        </group>
        <group ref={tracksHinge} position-x={CARD.cover / 2}>
          <group position-x={CARD.tracks / 2}>{panel(CARD.tracks, mats.tracks, { onPointerMove: onTracksMove, onPointerLeave: onTracksLeave, onClick: onTracksClick })}</group>
        </group>
      </group>
    </group>
  )
}
