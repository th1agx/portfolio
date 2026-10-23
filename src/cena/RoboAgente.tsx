'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { Color, Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial } from 'three'

// O robô agente, desenhado aqui em vez de usar um modelo pronto: flutua (sem pernas), casco branco
// brilhante, viseira de vidro escuro com dois olhos lima que piscam, braços soltos ao lado do corpo,
// antena com uma bolinha lima e um propulsor lima embaixo. Altura total: 2 unidades (de -1 a 1).
// A ação vem por referência (sem re-render): parado, acenar, sim, joinha, dancar, voar, olhar.

export type AcaoRobo = 'parado' | 'acenar' | 'sim' | 'joinha' | 'dancar' | 'voar' | 'nao' | 'pulo' | 'giro' | 'surpreso' | 'carregar' | 'chamar'

const LIMA = '#d7f452'

export function RoboAgente({ acao, olhar, brilho = 1 }: { acao: { current: AcaoRobo }; olhar?: { current: { x: number; y: number } }; brilho?: number }) {
  const m = useMemo(
    () => ({
      casco: new MeshPhysicalMaterial({ color: '#f4f4f1', roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }),
      viseira: new MeshPhysicalMaterial({ color: '#0e0f12', roughness: 0.05, clearcoat: 1, metalness: 0.3 }),
      olho: new MeshStandardMaterial({ color: LIMA, emissive: new Color(LIMA), emissiveIntensity: 1.6 * brilho, toneMapped: false }),
      junta: new MeshStandardMaterial({ color: '#25262b', roughness: 0.4 }),
      propulsor: new MeshStandardMaterial({ color: LIMA, emissive: new Color(LIMA), emissiveIntensity: 2.2 * brilho, toneMapped: false, transparent: true, opacity: 0.85 }),
    }),
    [brilho],
  )
  const raiz = useRef<Group>(null)
  const cabeca = useRef<Group>(null)
  const corpo = useRef<Group>(null)
  const bracoE = useRef<Group>(null)
  const bracoD = useRef<Group>(null)
  const olhoE = useRef<Mesh>(null)
  const olhoD = useRef<Mesh>(null)
  const chama = useRef<Mesh>(null)
  const proxPiscada = useRef(1.5)

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const a = acao.current
    const s = 1 - Math.exp(-8 * dt)
    const flutua = Math.sin(t * 2.2) * 0.06
    if (raiz.current) {
      // pulo: um quique alto; giro: uma volta inteira em torno de si
      const pulo = a === 'pulo' ? Math.abs(Math.sin(t * 6)) * 0.9 : a === 'chamar' ? -Math.pow(Math.max(0, Math.sin(t * 3)), 3) * 0.7 : 0
      raiz.current.position.y += (flutua + pulo - raiz.current.position.y) * (a === 'pulo' ? 0.5 : s)
      if (a === 'giro') raiz.current.rotation.y += dt * 9
      else {
        const giroAlvo = a === 'dancar' ? Math.sin(t * 4) * 0.5 : 0
        // volta ao ângulo mais próximo sem desenrolar várias voltas
        const atual = ((raiz.current.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI
        raiz.current.rotation.y = atual + (giroAlvo - atual) * s
      }
      const inclina = a === 'voar' ? -0.45 : a === 'dancar' ? Math.sin(t * 8) * 0.12 : a === 'chamar' ? 0.25 + Math.max(0, Math.sin(t * 3)) * 0.35 : 0
      raiz.current.rotation.x += (inclina - raiz.current.rotation.x) * s
    }
    if (cabeca.current) {
      const ox = olhar?.current.x ?? 0
      const oy = olhar?.current.y ?? 0
      const aceno = a === 'sim' ? Math.sin(t * 9) * 0.25 : a === 'nao' ? 0 : 0
      const nega = a === 'nao' ? Math.sin(t * 9) * 0.35 : 0
      cabeca.current.rotation.y += (ox * 0.6 + nega - cabeca.current.rotation.y) * s
      cabeca.current.rotation.x += (-oy * 0.35 + aceno - cabeca.current.rotation.x) * s
    }
    if (corpo.current) corpo.current.rotation.z = Math.sin(t * 2.2 + 1) * 0.04
    // braços: soltos balançando; acenar levanta o direito e abana; joinha levanta os dois
    if (bracoD.current) {
      const alvoZ =
        a === 'acenar' ? 2.5 + Math.sin(t * 10) * 0.35 : a === 'joinha' ? 2.2 : a === 'dancar' ? 1.4 + Math.sin(t * 8) * 0.6 : a === 'carregar' ? 1.6 : a === 'chamar' ? 0.35 : a === 'voar' ? 0.6 : a === 'surpreso' ? 0.9 : 0.15 + Math.sin(t * 2) * 0.05
      bracoD.current.rotation.z += (alvoZ - bracoD.current.rotation.z) * s
    }
    if (bracoE.current) {
      const alvoZ = a === 'joinha' ? -2.2 : a === 'dancar' ? -1.4 - Math.sin(t * 8) * 0.6 : a === 'voar' || a === 'carregar' ? -0.6 : a === 'surpreso' ? -0.9 : -0.15 - Math.sin(t * 2) * 0.05
      bracoE.current.rotation.z += (alvoZ - bracoE.current.rotation.z) * s
    }
    // piscar, e olhos "felizes" (achatados) no joinha e na dança
    proxPiscada.current -= dt
    let olhoY = a === 'joinha' || a === 'dancar' || a === 'carregar' ? 0.45 : a === 'surpreso' ? 1.7 : 1
    if (proxPiscada.current < 0) {
      olhoY = 0.1
      if (proxPiscada.current < -0.12) proxPiscada.current = 2 + Math.random() * 3
    }
    for (const o of [olhoE.current, olhoD.current]) if (o) o.scale.y += (olhoY - o.scale.y) * 0.5
    if (chama.current) {
      const forca = a === 'voar' ? 1.8 : 1
      chama.current.scale.set(1, forca * (0.9 + Math.sin(t * 30) * 0.1), 1)
    }
  })

  return (
    <group ref={raiz}>
      {/* cabeça com viseira, olhos e antena */}
      <group ref={cabeca} position={[0, 0.42, 0]}>
        <RoundedBox args={[1.25, 0.95, 1]} radius={0.42} smoothness={6} material={m.casco} />
        <RoundedBox args={[1.02, 0.6, 0.2]} radius={0.24} smoothness={5} material={m.viseira} position={[0, -0.02, 0.43]} />
        <mesh ref={olhoE} material={m.olho} position={[-0.22, 0, 0.545]}>
          <capsuleGeometry args={[0.07, 0.12, 6, 12]} />
        </mesh>
        <mesh ref={olhoD} material={m.olho} position={[0.22, 0, 0.545]}>
          <capsuleGeometry args={[0.07, 0.12, 6, 12]} />
        </mesh>
        <mesh material={m.junta} position={[0, 0.56, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.22, 8]} />
        </mesh>
        <mesh material={m.olho} position={[0, 0.7, 0]}>
          <sphereGeometry args={[0.07, 16, 12]} />
        </mesh>
      </group>
      {/* corpo em ovo, solto da cabeça */}
      <group ref={corpo} position={[0, -0.42, 0]}>
        <mesh material={m.casco} scale={[0.62, 0.55, 0.55]}>
          <sphereGeometry args={[0.8, 40, 28]} />
        </mesh>
        <mesh material={m.junta} position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.46, 0.025, 8, 40]} />
        </mesh>
        <mesh ref={chama} material={m.propulsor} position={[0, -0.5, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.16, 0.36, 20, 1, true]} />
        </mesh>
      </group>
      {/* braços soltos, girando pelo ombro */}
      <group ref={bracoE} position={[-0.6, -0.25, 0]}>
        <mesh material={m.casco} position={[0, -0.24, 0]}>
          <capsuleGeometry args={[0.11, 0.32, 6, 14]} />
        </mesh>
      </group>
      <group ref={bracoD} position={[0.6, -0.25, 0]}>
        <mesh material={m.casco} position={[0, -0.24, 0]}>
          <capsuleGeometry args={[0.11, 0.32, 6, 14]} />
        </mesh>
      </group>
    </group>
  )
}
