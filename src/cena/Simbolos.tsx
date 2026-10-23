'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { BufferGeometry, Color, InstancedMesh, MeshPhysicalMaterial, Object3D, Ray, Vector3 } from 'three'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { criarCorpo, impulso, passo, type Corpo } from './fisica'
import { arquivo } from '@/content/caminho'

// O topo: um aglomerado de símbolos de código ({ } < / > ; = ( ) [ ]) grossos e arredondados, como peças de
// borracha, flutuando no painel escuro. O cursor empurra as peças; o clique troca a cor das coloridas
// (começando pelo lima da marca) e sacode o aglomerado; a rolagem espalha e aproxima a câmera.

export const PALETA = ['#d7f452', '#3d5afe', '#ff5a1f', '#9b5cff', '#ffc21a']

const SIMBOLOS = ['{', '}', '<', '>', '/', ';', '=', '(', ')', '[', ']'] as const
type Acabamento = 'cor' | 'branco' | 'grafite'

function semente(s: number) {
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const PECAS = (() => {
  const r = semente(42)
  const acab: Acabamento[] = ['cor', 'branco', 'grafite', 'branco', 'grafite']
  return Array.from({ length: 34 }, (_, i) => ({ simbolo: SIMBOLOS[i % SIMBOLOS.length]!, acabamento: acab[Math.floor(r() * acab.length)]! }))
})()

function Pecas({ corIndice, ativo }: { corIndice: number; ativo: { current: boolean } }) {
  const { camera, pointer } = useThree()
  const fonte = useLoader(FontLoader, arquivo('/fonts/3d/rubik-900.json'))
  const geos = useMemo(() => {
    const m = new Map<string, { geo: BufferGeometry; raio: number }>()
    for (const s of SIMBOLOS) {
      const g = new TextGeometry(s, { font: fonte, size: 1.7, depth: 0.55, curveSegments: 10, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.11, bevelSegments: 6 })
      g.center()
      g.computeBoundingSphere()
      m.set(s, { geo: g, raio: g.boundingSphere!.radius * 0.72 })
    }
    return m
  }, [fonte])
  const materiais = useMemo(
    () => ({
      cor: new MeshPhysicalMaterial({ color: PALETA[0], roughness: 0.5, sheen: 0.6, sheenRoughness: 0.5, clearcoat: 0.15 }),
      branco: new MeshPhysicalMaterial({ color: '#eceae6', roughness: 0.5, sheen: 0.4, clearcoat: 0.15 }),
      grafite: new MeshPhysicalMaterial({ color: '#1d1e22', roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.3 }),
    }),
    [],
  )
  const aleatorio = useMemo(() => semente(2025), [])
  const corpos = useMemo<Corpo[]>(() => PECAS.map((p) => criarCorpo(geos.get(p.simbolo)!.raio, aleatorio)), [geos, aleatorio])
  const grupos = useMemo(() => {
    const g = new Map<string, number[]>()
    PECAS.forEach((p, i) => {
      const k = `${p.simbolo}|${p.acabamento}`
      g.set(k, [...(g.get(k) ?? []), i])
    })
    return g
  }, [])
  const malhas = useRef<Map<string, InstancedMesh>>(new Map())
  const raio = useMemo(() => new Ray(), [])
  const alvo = useMemo(() => new Vector3(), [])
  const dummy = useMemo(() => new Object3D(), [])
  const cor = useRef(new Color(PALETA[0]))
  const corAlvo = useMemo(() => new Color(PALETA[corIndice % PALETA.length]), [corIndice])
  const rolagemAnterior = useRef(0)

  useEffect(() => {
    if (corIndice > 0) impulso(corpos, aleatorio)
  }, [corIndice, corpos, aleatorio])

  useFrame((state, dt) => {
    const r = Math.min(1.5, window.scrollY / window.innerHeight)
    const vr = (r - rolagemAnterior.current) / Math.max(dt, 1e-3)
    rolagemAnterior.current = r
    if (Math.abs(vr) > 0.01) for (const c of corpos) c.vel.addScaledVector(c.pos.clone().normalize(), vr * 6)
    state.camera.position.set(Math.sin(state.clock.elapsedTime * 0.2) * 0.6, 0, 19 - r * 5)
    state.camera.lookAt(0, 0, 0)

    if (ativo.current) {
      raio.origin.copy(camera.position)
      raio.direction.set(pointer.x, pointer.y, 0.5).unproject(camera).sub(camera.position).normalize()
      raio.at((0 - camera.position.z) / raio.direction.z, alvo)
    }
    passo(corpos, dt, ativo.current ? raio : null, ativo.current ? alvo : null)

    cor.current.lerp(corAlvo, 1 - Math.exp(-6 * dt))
    materiais.cor.color.copy(cor.current)

    for (const [k, indices] of grupos) {
      const m = malhas.current.get(k)
      if (!m) continue
      indices.forEach((i, j) => {
        const c = corpos[i]!
        dummy.position.copy(c.pos)
        dummy.quaternion.copy(c.giro)
        dummy.updateMatrix()
        m.setMatrixAt(j, dummy.matrix)
      })
      m.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <>
      {[...grupos.entries()].map(([k, indices]) => {
        const [simbolo, acab] = k.split('|') as [string, Acabamento]
        return (
          <instancedMesh
            key={k}
            ref={(el) => {
              if (el) malhas.current.set(k, el)
            }}
            args={[geos.get(simbolo)!.geo, materiais[acab], indices.length]}
            frustumCulled={false}
          />
        )
      })}
    </>
  )
}

export default function Simbolos() {
  const [corIndice, setCorIndice] = useState(0)
  const [visivel, setVisivel] = useState(true)
  const raiz = useRef<HTMLDivElement>(null)
  const ativo = useRef(false)

  useEffect(() => {
    const el = raiz.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisivel(!!e?.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={raiz} style={{ position: 'absolute', inset: 0 }} onPointerEnter={() => (ativo.current = true)} onPointerLeave={() => (ativo.current = false)}>
      <Canvas
        frameloop={visivel ? 'always' : 'never'}
        dpr={[1, 1.75]}
        camera={{ fov: 25, position: [0, 0, 19], near: 1, far: 80 }}
        gl={{ antialias: true }}
        onClick={() => setCorIndice((i) => i + 1)}
        style={{ cursor: 'pointer' }}
      >
        <color attach="background" args={['#161618']} />
        <hemisphereLight args={['#f4f4ff', '#25262b', 0.6]} />
        <directionalLight position={[-8, 12, 10]} intensity={2.2} />
        <directionalLight position={[10, -4, 6]} intensity={0.5} color="#c8d4ff" />
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={3} position={[-4, 6, 8]} scale={[10, 6, 1]} />
          <Lightformer form="rect" intensity={1.2} position={[8, 0, 6]} rotation-y={-Math.PI / 3} scale={[6, 10, 1]} />
          <Lightformer form="ring" intensity={1.5} position={[0, -6, 6]} scale={4} />
        </Environment>
        <Pecas corIndice={corIndice} ativo={ativo} />
      </Canvas>
    </div>
  )
}
