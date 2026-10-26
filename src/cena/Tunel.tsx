'use client'

import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { AdditiveBlending, BackSide, BoxGeometry, DirectionalLight, Color, Fog, Group, InstancedMesh, MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PerspectiveCamera, Points, TorusGeometry } from 'three'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { RoboAgente, type AcaoRobo } from './RoboAgente'
import { arquivo } from '@/content/caminho'

// O túnel: uma animação só, sem texto. O robô agente, agora grande, voa por cinco trechos e a câmera o
// segue, mudando de distância e de ângulo em cada um:
//   entrada  a câmera espera diante da boca do túnel (a mesma cor do portal da estrada); o robô passa por
//            trás dela, aparece grande e mergulha na boca
//   0  costelas quentes; o anel de luz de cada uma acende quando o robô passa e fica aceso
//   1  parede de símbolos de código (os mesmos do topo) girando em volta
//   S  a sala: o túnel se abre num vão enorme com símbolos gigantes boiando; a câmera se afasta e o robô
//      olha para trás e acena
//   2  portais lima que giram; o robô dá um giro completo ao atravessar cada um
//   3  velocidade: câmera mais baixa e mais perto, lente mais aberta, riscos de luz nas paredes
// No fim, a saída é luz branca e o robô se vira e acena. Poeira no ar o caminho todo.
// `progresso` (0 a 1) vem da rolagem.

export const TRECHO = 60
const SALA = 56
const INICIO = 3
export const COMPRIMENTO = TRECHO * 4 + SALA + 22
const RAIO = 4.6
const LIMA = '#d7f452'
// onde começa cada trecho (z, para dentro é negativo) e a cor do ar nele
const Z_SALA = -TRECHO * 2
const Z_PORTAIS = Z_SALA - SALA
const Z_RISCOS = Z_PORTAIS - TRECHO
const AR = [
  { z: 0, cor: '#16110c' },
  { z: -TRECHO, cor: '#0c100e' },
  { z: Z_SALA - 6, cor: '#0d0e16' },
  { z: Z_PORTAIS + 6, cor: '#101012' },
  { z: Z_RISCOS, cor: '#0a0b10' },
]

// onde o robô está agora (lido pelas costelas para acender os anéis)
const voo = { z: INICIO }
const o = new Object3D()

function Costelas() {
  const n = 26
  const ref = useRef<InstancedMesh>(null)
  const refLuz = useRef<InstancedMesh>(null)
  const geo = useMemo(() => new TorusGeometry(RAIO, 0.12, 12, 72), [])
  const geoLuz = useMemo(() => new TorusGeometry(RAIO - 0.14, 0.035, 8, 72), [])
  const mat = useMemo(() => new MeshStandardMaterial({ color: '#4a3a2a', roughness: 0.45, metalness: 0.5 }), [])
  const matLuz = useMemo(() => new MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), [])
  const acesa = useRef(new Float32Array(n))
  const quente = useMemo(() => new Color('#ffb062'), [])
  const cor = useMemo(() => new Color(), [])
  useFrame((_, dt) => {
    const m = refLuz.current
    if (!m) return
    for (let i = 0; i < n; i++) {
      // acende quando o robô passa pela costela e fica aceso; apaga se ele voltar
      const passou = voo.z < -i * (TRECHO / n) + 0.5 ? 1 : 0
      acesa.current[i]! += (passou - acesa.current[i]!) * (1 - Math.exp(-dt * (passou ? 9 : 3)))
      const a = acesa.current[i]!
      m.setColorAt(i, cor.copy(quente).multiplyScalar(0.12 + a * 3.2 + Math.max(0, 1 - Math.abs(voo.z + i * (TRECHO / n)) / 2) * 3))
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })
  useEffect(() => {
    for (let i = 0; i < n; i++) {
      o.position.set(0, 0, -i * (TRECHO / n))
      o.rotation.set(0, 0, 0)
      o.updateMatrix()
      ref.current?.setMatrixAt(i, o.matrix)
      refLuz.current?.setMatrixAt(i, o.matrix)
    }
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true
    if (refLuz.current) {
      refLuz.current.instanceMatrix.needsUpdate = true
      for (let i = 0; i < n; i++) refLuz.current.setColorAt(i, new Color('#ffb062').multiplyScalar(0.12))
    }
  }, [])
  return (
    <>
      <instancedMesh ref={ref} args={[geo, mat, n]} />
      <instancedMesh ref={refLuz} args={[geoLuz, matLuz, n]} />
    </>
  )
}

function ParedeDeSimbolos() {
  const fonte = useLoader(FontLoader, arquivo('/fonts/3d/rubik-900.json'))
  const simbolos = ['{', '}', '<', '>', ';', '/']
  const porTipo = 46
  const geos = useMemo(
    () =>
      simbolos.map((s) => {
        const g = new TextGeometry(s, { font: fonte, size: 1, depth: 0.35, curveSegments: 6, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.05, bevelSegments: 3 })
        g.center()
        return g
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fonte],
  )
  const mats = useMemo(
    () => [
      new MeshStandardMaterial({ color: '#e9e8e3', roughness: 0.5 }),
      new MeshStandardMaterial({ color: '#232428', roughness: 0.4 }),
      new MeshStandardMaterial({ color: LIMA, emissive: LIMA, emissiveIntensity: 1.2, roughness: 0.5, toneMapped: false }),
    ],
    [],
  )
  const grupo = useRef<Group>(null)
  const refs = useRef<(InstancedMesh | null)[]>([])
  useEffect(() => {
    geos.forEach((_, t) => {
      const m = refs.current[t]
      if (!m) return
      for (let i = 0; i < porTipo; i++) {
        const k = t * porTipo + i
        const a = (k * 2.399) % (Math.PI * 2)
        const z = -TRECHO - ((k * 7.31) % TRECHO)
        const r = RAIO - 0.3 - ((k * 0.13) % 0.6)
        o.position.set(Math.cos(a) * r, Math.sin(a) * r, z)
        o.rotation.set(k, k * 0.7, a)
        o.scale.setScalar(0.7 + ((k * 0.37) % 0.8))
        o.updateMatrix()
        m.setMatrixAt(i, o.matrix)
      }
      m.instanceMatrix.needsUpdate = true
    })
  }, [geos])
  useFrame((_, dt) => {
    if (grupo.current) grupo.current.rotation.z += dt * 0.12
  })
  return (
    <group ref={grupo}>
      {geos.map((g, t) => (
        <instancedMesh
          key={t}
          ref={(el) => {
            refs.current[t] = el
          }}
          args={[g, mats[t % 3]!, porTipo]}
        />
      ))}
    </group>
  )
}

export const PORTAIS = Array.from({ length: 8 }, (_, i) => Z_PORTAIS - 5 - i * 7)

// portais: anel lima inteiro com dois arcos que giram dentro dele — aro de luz, não caixa esticada
function Portais({ progresso }: { progresso: { current: number } }) {
  const grupos = useRef<(Group | null)[]>([])
  const matAro = useMemo(() => new MeshBasicMaterial({ color: new Color(LIMA).multiplyScalar(1.5), toneMapped: false }), [])
  const matArco = useMemo(() => new MeshBasicMaterial({ color: new Color(LIMA).multiplyScalar(2.1), toneMapped: false }), [])
  const geoAro = useMemo(() => new TorusGeometry(3.4, 0.09, 10, 96), [])
  const geoArco = useMemo(() => new TorusGeometry(3.0, 0.06, 8, 64, Math.PI * 0.72), [])
  useFrame(() => {
    PORTAIS.forEach((_, i) => {
      const g = grupos.current[i]
      if (g) g.rotation.z = i * 0.3 + progresso.current * 10
    })
  })
  return (
    <>
      {PORTAIS.map((z, i) => (
        <group key={z} position={[0, 0, z]} ref={(g) => void (grupos.current[i] = g)}>
          <mesh geometry={geoAro} material={matAro} />
          <mesh geometry={geoArco} material={matArco} />
          <mesh geometry={geoArco} material={matArco} rotation={[0, 0, Math.PI]} />
        </group>
      ))}
    </>
  )
}

function Riscos({ progresso }: { progresso: { current: number } }) {
  const n = 320
  const ref = useRef<InstancedMesh>(null)
  const geo = useMemo(() => new BoxGeometry(0.05, 0.05, 1), [])
  const mat = useMemo(() => new MeshBasicMaterial({ toneMapped: false }), [])
  const base = useMemo(
    () => Array.from({ length: n }, (_, i) => ({ a: (i * 2.399) % (Math.PI * 2), r: 2.8 + ((i * 0.37) % 1.6), z: (i * 7.13) % TRECHO, comp: 1.5 + ((i * 0.53) % 4), lima: i % 6 === 0 })),
    [],
  )
  const cores = useMemo(() => ({ branco: new Color('#ffffff').multiplyScalar(2), lima: new Color(LIMA).multiplyScalar(2.4) }), [])
  useFrame((state) => {
    const m = ref.current
    if (!m) return
    const t = state.clock.elapsedTime
    base.forEach((r, i) => {
      const z = Z_RISCOS - ((r.z + t * 30 + progresso.current * 120) % TRECHO)
      o.position.set(Math.cos(r.a) * r.r, Math.sin(r.a) * r.r, z)
      o.rotation.set(0, 0, 0)
      o.scale.set(1, 1, r.comp)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      m.setColorAt(i, r.lima ? cores.lima : cores.branco)
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[geo, mat, n]} />
}

// a boca do túnel: um anel lima grosso e um segundo, fino, que pulsa; é o que a câmera vê na entrada
function Boca() {
  const fino = useRef<Mesh>(null)
  useFrame((st) => {
    if (fino.current) fino.current.scale.setScalar(1 + Math.sin(st.clock.elapsedTime * 2.2) * 0.04 + 0.06)
  })
  return (
    <group position={[0, 0, 1]}>
      <mesh>
        <torusGeometry args={[RAIO + 0.15, 0.22, 16, 96]} />
        <meshBasicMaterial color={new Color(LIMA).multiplyScalar(2)} toneMapped={false} />
      </mesh>
      <mesh ref={fino}>
        <torusGeometry args={[RAIO + 0.5, 0.03, 8, 96]} />
        <meshBasicMaterial color={new Color(LIMA).multiplyScalar(1.4)} toneMapped={false} transparent opacity={0.7} />
      </mesh>
    </group>
  )
}

// a sala: o túnel acaba num vão escuro com símbolos gigantes boiando devagar em volta do caminho
function Sala() {
  const fonte = useLoader(FontLoader, arquivo('/fonts/3d/rubik-900.json'))
  const pecas = useMemo(() => {
    const simbolos = ['{', '}', '<', '>', '/', ';', '(', ')', '[', ']', '=', '{', '<', '/']
    return simbolos.map((t, i) => {
      const g = new TextGeometry(t, { font: fonte, size: 1, depth: 0.4, curveSegments: 8, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.04, bevelSegments: 3 })
      g.center()
      const a = i * 2.399
      return { g, a, r: 9 + ((i * 3.7) % 9), z: Z_SALA - 6 - ((i * 13.3) % (SALA - 12)), escala: 3.5 + ((i * 1.9) % 5), giro: 0.1 + ((i * 0.07) % 0.25), tipo: i % 3 }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fonte])
  const mats = useMemo(
    () => [
      new MeshStandardMaterial({ color: LIMA, emissive: LIMA, emissiveIntensity: 0.5, roughness: 0.4 }),
      new MeshStandardMaterial({ color: '#e9e8e3', roughness: 0.35 }),
      new MeshStandardMaterial({ color: '#3d5afe', roughness: 0.3, metalness: 0.2 }),
    ],
    [],
  )
  const refs = useRef<(Mesh | null)[]>([])
  useFrame((st) => {
    const t = st.clock.elapsedTime
    pecas.forEach((p, i) => {
      const m = refs.current[i]
      if (!m) return
      const a = p.a + t * 0.04
      m.position.set(Math.cos(a) * p.r, Math.sin(a) * p.r * 0.7 + Math.sin(t * 0.5 + i) * 0.6, p.z)
      m.rotation.set(t * p.giro, t * p.giro * 1.3 + i, Math.sin(t * 0.3 + i) * 0.4)
    })
  })
  return (
    <group>
      {pecas.map((p, i) => (
        <mesh key={i} ref={(m) => void (refs.current[i] = m)} geometry={p.g} material={mats[p.tipo]} scale={p.escala} />
      ))}
      {/* um anel enorme e fino marca a porta de saída da sala */}
      <mesh position={[0, 0, Z_PORTAIS + 2]}>
        <torusGeometry args={[RAIO + 0.15, 0.08, 12, 96]} />
        <meshBasicMaterial color={new Color('#ffb062').multiplyScalar(2.5)} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 6, Z_SALA - SALA / 2]} intensity={60} distance={60} color="#9fb0ff" />
    </group>
  )
}

// poeira no ar: pontos quentes ao longo de todo o caminho, que se movem devagar
function Poeira() {
  const n = 2400
  const ref = useRef<Points>(null)
  const pos = useMemo(() => {
    const a = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2
      const r = Math.sqrt(Math.random()) * (RAIO - 0.4)
      a[i * 3] = Math.cos(ang) * r
      a[i * 3 + 1] = Math.sin(ang) * r
      a[i * 3 + 2] = INICIO - Math.random() * (COMPRIMENTO + INICIO)
    }
    return a
  }, [])
  useFrame((st) => {
    if (ref.current) {
      ref.current.rotation.z = st.clock.elapsedTime * 0.03
      ref.current.position.y = Math.sin(st.clock.elapsedTime * 0.3) * 0.2
    }
  })
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.035} color={new Color('#ffd9a8').multiplyScalar(1.4)} transparent opacity={0.65} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
    </points>
  )
}

function Saida() {
  return (
    <mesh position={[0, 0, -COMPRIMENTO + 2]}>
      <circleGeometry args={[RAIO + 1, 64]} />
      {/* off-white de papel, sem multiplicar acima de 1: a saída acolhe, não estoura */}
      <meshBasicMaterial color="#f2f1ec" toneMapped={false} />
    </mesh>
  )
}

// parede contínua do duto (costelas e símbolos por cima dela): escuridão com fundo de verdade
function Parede() {
  return (
    <mesh position={[0, 0, (Z_SALA + 8) / 2]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[RAIO + 0.05, RAIO + 0.05, -(Z_SALA + 8), 48, 1, true]} />
      <meshStandardMaterial color="#14110e" roughness={0.85} metalness={0.1} side={BackSide} />
    </mesh>
  )
}

const sino = (a: number, b: number, x: number) => {
  // sobe e desce dentro de [a, b]: 0 fora, 1 no meio
  const t = MathUtils.clamp((x - a) / (b - a), 0, 1)
  return Math.sin(t * Math.PI)
}

function Corredor({ progresso }: { progresso: { current: number } }) {
  const grupo = useRef<Group>(null)
  const acao = useRef<AcaoRobo>('voar')
  const fundo = useMemo(() => new Color(), [])
  const a = useMemo(() => new Color(), [])
  const b = useMemo(() => new Color(), [])
  const zSuave = useRef(INICIO)
  const olharTras = useRef(1)
  const luzFrente = useRef<DirectionalLight>(null)
  useEffect(() => {
    if (luzFrente.current && grupo.current) luzFrente.current.target = grupo.current
  }, [])

  useFrame((state, dt) => {
    const p = progresso.current
    const zAlvo = MathUtils.lerp(INICIO, -(COMPRIMENTO - 8), Math.min(p / 0.94, 1))
    zSuave.current += (zAlvo - zSuave.current) * (1 - Math.exp(-6 * dt))
    const z = zSuave.current
    voo.z = z
    const t = state.clock.elapsedTime
    const chegou = p > 0.95
    // na sala ele se vira para a câmera e acena; no resto, voa
    const naSala = sino(Z_SALA - 8, Z_PORTAIS + 14, z)
    // na boca do túnel ele ainda está de frente para a câmera, como o robô guia que entrou no furo;
    // quando começa a avançar, se vira e mergulha
    const deFrente = z > INICIO - 2.5
    acao.current = chegou || naSala > 0.6 ? 'acenar' : 'voar'
    olharTras.current += ((chegou || naSala > 0.6 || deFrente ? 1 : 0) - olharTras.current) * (1 - Math.exp(-dt * 3))
    // a mesma luz de frente que o robô guia tem, forte na entrada e sumindo dentro do túnel
    if (luzFrente.current) {
      luzFrente.current.intensity = 2.2 * MathUtils.smoothstep(z, -10, INICIO)
      luzFrente.current.position.set(state.camera.position.x + 3, state.camera.position.y + 6, state.camera.position.z + 2)
    }

    // a curva do caminho; na entrada ele vem de lado e se alinha com a boca
    const lado = 0
    const x = Math.sin(z * 0.12) * 1.4 * (1 - naSala) + Math.sin(t * 0.6) * 2.2 * naSala - lado * 2.6
    const y = Math.cos(z * 0.09) * 0.8 - 0.4 + naSala * Math.sin(t * 0.8) * 0.8 - lado * 1.2
    if (grupo.current) {
      // só um robô por vez: este só aparece quando o robô guia da página some (data-tunel)
      grupo.current.visible = document.documentElement.dataset.tunel === '1'
      grupo.current.position.set(x, y, z)
      // inclina de leve para o lado da curva, como quem faz a curva voando; nada de giros bruscos
      const inclina = -Math.cos(z * 0.12) * 0.28
      grupo.current.rotation.set(Math.sin(z * 0.09) * 0.08, MathUtils.lerp(Math.PI, 0, olharTras.current), inclina * (1 - olharTras.current))
    }

    // câmera: na entrada fica parada diante da boca; na sala se afasta para o lado; na velocidade, baixa e perto
    const veloz = MathUtils.smoothstep(-z, -Z_RISCOS - 4, -Z_RISCOS + 10) * (1 - MathUtils.smoothstep(-z, COMPRIMENTO - 24, COMPRIMENTO - 10))
    // na entrada a câmera está longe, diante da boca, e se aproxima enquanto o robô avança
    const entrada = MathUtils.smoothstep(z, -12, INICIO)
    const camZ = z + 6.5 + entrada * 9 + naSala * 11 - veloz * 2
    const camX = Math.sin(z * 0.12) * 1.1 * (1 - naSala) + Math.sin(t * 0.4) * 0.3 + naSala * 7
    const camY = Math.cos(z * 0.09) * 0.6 + 0.4 + naSala * 2.5 - veloz * 0.9
    state.camera.position.set(camX, camY, camZ)
    const olhaZ = Math.min(z - 8 + naSala * 6, 4)
    state.camera.lookAt(x * (0.4 + naSala * 0.6), y * 0.6, olhaZ)
    const cam = state.camera as PerspectiveCamera
    const fov = 58 + veloz * 16 + naSala * 6
    if (Math.abs(cam.fov - fov) > 0.05) {
      cam.fov = fov
      cam.updateProjectionMatrix()
    }

    // a cor do ar muda a cada trecho e clareia na saída
    let k = 0
    while (k < AR.length - 1 && z < AR[k + 1]!.z) k++
    const de = AR[k]!
    const para = AR[Math.min(k + 1, AR.length - 1)]!
    const mistura = para === de ? 0 : MathUtils.clamp((de.z - z) / (de.z - para.z), 0, 1)
    fundo.copy(a.set(de.cor)).lerp(b.set(para.cor), MathUtils.smoothstep(mistura, 0.6, 1))
    const saida = MathUtils.clamp((-z - (COMPRIMENTO - 26)) / 14, 0, 1)
    fundo.lerp(a.set('#f2f1ec'), saida * saida)
    state.scene.background = fundo
    const fog = state.scene.fog as Fog | null
    if (fog) {
      fog.color.copy(fundo)
      fog.far = 46 + naSala * 70
    }
  })

  return (
    <group ref={grupo} scale={0.75}>
      <RoboAgente acao={acao} brilho={1.6} />
      <pointLight position={[0, 1.5, 2]} intensity={14} distance={10} color="#ffe6c4" />
      <directionalLight ref={luzFrente} intensity={0} />
    </group>
  )
}

export default function Tunel({ progresso, ativo = true }: { progresso: { current: number }; ativo?: boolean }) {
  return (
    <Canvas frameloop={ativo ? 'always' : 'never'} dpr={[1, 1.5]} camera={{ fov: 58, near: 0.1, far: 140, position: [-2.6, -0.8, 18] }} onCreated={({ scene }) => (scene.fog = new Fog('#16110c', 8, 46))}>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 6, 5]} intensity={0.8} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2} position={[0, 5, 4]} scale={[8, 3, 1]} />
      </Environment>
      <Suspense fallback={null}>
        <Corredor progresso={progresso} />
        <ParedeDeSimbolos />
        <Sala />
      </Suspense>
      <Boca />
      <Poeira />
      <Costelas />
      <Portais progresso={progresso} />
      <Riscos progresso={progresso} />
      <Saida />
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.75} luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur />
        <Vignette offset={0.25} darkness={0.7} />
      </EffectComposer>
    </Canvas>
  )
}
