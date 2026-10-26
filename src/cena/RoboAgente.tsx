'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Group, LatheGeometry, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Vector2 } from 'three'

// O robô agente, desenhado aqui em vez de usar um modelo pronto: flutua (sem pernas), casco branco
// brilhante em curvas contínuas (perfis de torno, sem caixas), viseira de vidro escuro com reflexo
// furta-cor e dois olhos lima que piscam, braços articulados (ombro + antebraço com mão), antena com
// ponta lima e propulsor embaixo. Altura total: 2 unidades (de -1 a 1).
// A ação vem por referência (sem re-render): parado, acenar, sim, joinha, dancar, voar, olhar.
// Parado, a cabeça e os olhos seguem o cursor (olhar), com o corpo acompanhando de leve.

export type AcaoRobo = 'parado' | 'acenar' | 'sim' | 'joinha' | 'dancar' | 'voar' | 'nao' | 'pulo' | 'giro' | 'surpreso' | 'carregar' | 'chamar'

const LIMA = '#d7f452'

// perfis de torno: curvas contínuas em vez de caixas arredondadas
function perfilCabeca(): Vector2[] {
  // capacete de ovo: fechado no topo (raio 0), bochechas largas, queixo estreito, base aberta
  const pontos: Vector2[] = []
  const N = 28
  for (let i = 0; i <= N; i++) {
    const t = i / N // 0 = base, 1 = topo
    const ang = t * Math.PI
    // superelipse no meridiano: mais "cheio" que uma elipse, sem cara de bola
    const rx = Math.pow(Math.sin(ang), 0.78)
    const ry = Math.cos(ang)
    const raio = rx * 0.62
    const y = ry * 0.5 - 0.08
    pontos.push(new Vector2(Math.max(0.001, raio), y))
  }
  return pontos
}

function perfilCorpo(): Vector2[] {
  // pera suave: ombros estreitos, barriga cheia, base arredondando para o propulsor
  const pontos: Vector2[] = []
  const N = 24
  for (let i = 0; i <= N; i++) {
    const t = i / N // 0 = base, 1 = topo
    const ang = t * Math.PI
    const rx = Math.pow(Math.sin(ang), 0.9)
    const ry = Math.cos(ang)
    const raio = rx * 0.5
    const y = ry * 0.56 - 0.02
    pontos.push(new Vector2(Math.max(0.001, raio), y))
  }
  return pontos
}

export function RoboAgente({ acao, olhar, brilho = 1 }: { acao: { current: AcaoRobo }; olhar?: { current: { x: number; y: number } }; brilho?: number }) {
  const m = useMemo(
    () => ({
      casco: new MeshPhysicalMaterial({ color: '#f4f4f1', roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06, sheen: 0.25, sheenColor: new Color('#ffffff') }),
      viseira: new MeshPhysicalMaterial({ color: '#0b0c10', roughness: 0.08, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04, iridescence: 0.35, iridescenceIOR: 1.3 }),
      olho: new MeshStandardMaterial({ color: LIMA, emissive: new Color(LIMA), emissiveIntensity: 1.6 * brilho, toneMapped: false }),
      junta: new MeshStandardMaterial({ color: '#1f2024', roughness: 0.35, metalness: 0.6 }),
      juntaClara: new MeshStandardMaterial({ color: '#43454c', roughness: 0.3, metalness: 0.7 }),
      propulsor: new MeshStandardMaterial({ color: LIMA, emissive: new Color(LIMA), emissiveIntensity: 2.2 * brilho, toneMapped: false, transparent: true, opacity: 0.85 }),
    }),
    [brilho],
  )
  const geoCabeca = useMemo(() => {
    const g = new LatheGeometry(perfilCabeca(), 64)
    g.computeVertexNormals()
    return g
  }, [])
  const geoCorpo = useMemo(() => {
    const g = new LatheGeometry(perfilCorpo(), 64)
    g.computeVertexNormals()
    return g
  }, [])
  const raiz = useRef<Group>(null)
  const cabeca = useRef<Group>(null)
  const corpo = useRef<Group>(null)
  const olhos = useRef<Group>(null)
  const bracoE = useRef<Group>(null)
  const bracoD = useRef<Group>(null)
  const anteE = useRef<Group>(null)
  const anteD = useRef<Group>(null)
  const olhoE = useRef<Mesh>(null)
  const olhoD = useRef<Mesh>(null)
  const chama = useRef<Group>(null)
  const proxPiscada = useRef(1.5)

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const a = acao.current
    const s = 1 - Math.exp(-8 * dt)
    const flutua = Math.sin(t * 2.2) * 0.06
    const ox = olhar?.current.x ?? 0
    const oy = olhar?.current.y ?? 0
    if (raiz.current) {
      // pulo: um quique alto; giro: uma volta inteira em torno de si
      const pulo = a === 'pulo' ? Math.abs(Math.sin(t * 6)) * 0.9 : a === 'chamar' ? -Math.pow(Math.max(0, Math.sin(t * 3)), 3) * 0.7 : 0
      raiz.current.position.y += (flutua + pulo - raiz.current.position.y) * (a === 'pulo' ? 0.5 : s)
      if (a === 'giro') raiz.current.rotation.y += dt * 9
      else {
        const giroAlvo = a === 'dancar' ? Math.sin(t * 4) * 0.5 : a === 'parado' ? ox * 0.25 : 0
        // volta ao ângulo mais próximo sem desenrolar várias voltas
        const atual = ((raiz.current.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI
        raiz.current.rotation.y = atual + (giroAlvo - atual) * s
      }
      const inclina = a === 'voar' ? -0.45 : a === 'dancar' ? Math.sin(t * 8) * 0.12 : a === 'chamar' ? 0.25 + Math.max(0, Math.sin(t * 3)) * 0.35 : a === 'parado' ? oy * 0.08 : 0
      raiz.current.rotation.x += (inclina - raiz.current.rotation.x) * s
    }
    if (cabeca.current) {
      // parado, a cabeça segue o cursor; nas outras ações, entra só um quê do cursor por cima da ação
      const aceno = a === 'sim' ? Math.sin(t * 9) * 0.25 : a === 'nao' ? 0 : 0
      const nega = a === 'nao' ? Math.sin(t * 9) * 0.35 : 0
      const segueY = a === 'parado' || a === 'voar' ? ox * 0.6 : ox * 0.2
      const segueX = a === 'parado' || a === 'voar' ? -oy * 0.4 : -oy * 0.12
      cabeca.current.rotation.y += (segueY + nega - cabeca.current.rotation.y) * s
      cabeca.current.rotation.x += (segueX + aceno - cabeca.current.rotation.x) * s
    }
    // os olhos acompanham o cursor antes da cabeça, como olhos de verdade
    if (olhos.current) {
      const alvoX = a === 'parado' || a === 'voar' ? ox * 0.1 : 0
      const alvoY = a === 'parado' || a === 'voar' ? oy * 0.05 : 0
      olhos.current.position.x += (alvoX - olhos.current.position.x) * s * 1.5
      olhos.current.position.y += (alvoY - olhos.current.position.y) * s * 1.5
    }
    if (corpo.current) corpo.current.rotation.z = Math.sin(t * 2.2 + 1) * 0.04
    // braços: soltos balançando; acenar levanta o direito e abana o antebraço; joinha levanta os dois
    if (bracoD.current) {
      const alvoZ =
        a === 'acenar' ? 2.5 : a === 'joinha' ? 2.2 : a === 'dancar' ? 1.4 + Math.sin(t * 8) * 0.6 : a === 'carregar' ? 1.6 : a === 'chamar' ? 0.35 : a === 'voar' ? 0.6 : a === 'surpreso' ? 0.9 : 0.15 + Math.sin(t * 2) * 0.05
      bracoD.current.rotation.z += (alvoZ - bracoD.current.rotation.z) * s
    }
    if (bracoE.current) {
      const alvoZ = a === 'joinha' ? -2.2 : a === 'dancar' ? -1.4 - Math.sin(t * 8) * 0.6 : a === 'voar' || a === 'carregar' ? -0.6 : a === 'surpreso' ? -0.9 : -0.15 - Math.sin(t * 2) * 0.05
      bracoE.current.rotation.z += (alvoZ - bracoE.current.rotation.z) * s
    }
    // antebraços: o aceno abana de verdade (cotovelo dobrado); parado, mão volta ao resto
    const dobra = a === 'acenar' ? 0.9 + Math.sin(t * 10) * 0.5 : a === 'joinha' ? 0.5 : a === 'carregar' ? 0.7 : 0.08
    if (anteD.current) anteD.current.rotation.x += (dobra - anteD.current.rotation.x) * s
    if (anteE.current) anteE.current.rotation.x += ((a === 'joinha' ? -0.4 : -0.08) - anteE.current.rotation.x) * s
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
      {/* cabeça: casco torneado, viseira curva de vidro, olhos, orelhas e antena */}
      <group ref={cabeca} position={[0, 0.44, 0]}>
        <mesh geometry={geoCabeca} material={m.casco} />
        {/* friso do painel: a linha onde o casco se abre */}
        <mesh material={m.junta} position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.607, 0.014, 10, 72]} />
        </mesh>
        {/* viseira: lente sólida de vidro embutida na curva da cabeça (sem frestas) */}
        <mesh material={m.viseira} position={[0, 0.02, 0.38]} scale={[0.72, 0.42, 0.42]}>
          <sphereGeometry args={[0.6, 48, 32]} />
        </mesh>
        {/* olhos sobre a lente */}
        <group ref={olhos} position={[0, 0.02, 0.56]}>
          <mesh ref={olhoE} material={m.olho} position={[-0.17, 0, 0.06]}>
            <capsuleGeometry args={[0.06, 0.11, 8, 20]} />
          </mesh>
          <mesh ref={olhoD} material={m.olho} position={[0.17, 0, 0.06]}>
            <capsuleGeometry args={[0.06, 0.11, 8, 20]} />
          </mesh>
        </group>
        {/* orelhas: discos nas laterais, com anel metálico */}
        {[-1, 1].map((lado) => (
          <group key={lado} position={[lado * 0.6, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
            <mesh material={m.casco}>
              <cylinderGeometry args={[0.14, 0.16, 0.1, 28]} />
            </mesh>
            <mesh material={m.juntaClara} position={[0, lado * 0.05, 0]}>
              <cylinderGeometry args={[0.085, 0.085, 0.02, 24]} />
            </mesh>
          </group>
        ))}
        {/* antena: haste cônica com ponta lima */}
        <mesh material={m.juntaClara} position={[0, 0.52, -0.06]}>
          <cylinderGeometry args={[0.016, 0.03, 0.16, 12]} />
        </mesh>
        <mesh material={m.olho} position={[0, 0.64, -0.06]}>
          <sphereGeometry args={[0.052, 20, 16]} />
        </mesh>
      </group>
      {/* corpo torneado em pera, com anel de junta e propulsor */}
      <group ref={corpo} position={[0, -0.46, 0]}>
        <mesh geometry={geoCorpo} material={m.casco} />
        <mesh material={m.junta} position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.18, 0.03, 10, 40]} />
        </mesh>
        {/* saia do propulsor: anel metálico na base */}
        <mesh material={m.junta} position={[0, -0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.13, 0.028, 10, 36]} />
        </mesh>
        <group ref={chama} position={[0, -0.58, 0]}>
          <mesh material={m.propulsor} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.13, 0.34, 24, 1]} />
          </mesh>
          <mesh material={m.propulsor} position={[0, -0.24, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.07, 0.18, 16, 1]} />
          </mesh>
        </group>
      </group>
      {/* braços articulados: ombro, braço, antebraço com mão */}
      {([-1, 1] as const).map((lado) => (
        <group key={lado} ref={lado === -1 ? bracoE : bracoD} position={[lado * 0.52, -0.18, 0]}>
          {/* ombro esférico */}
          <mesh material={m.junta}>
            <sphereGeometry args={[0.085, 20, 16]} />
          </mesh>
          <mesh material={m.casco} position={[0, -0.18, 0]}>
            <capsuleGeometry args={[0.075, 0.26, 8, 20]} />
          </mesh>
          {/* cotovelo e antebraço */}
          <group ref={lado === -1 ? anteE : anteD} position={[0, -0.36, 0]}>
            <mesh material={m.junta}>
              <sphereGeometry args={[0.06, 16, 12]} />
            </mesh>
            <mesh material={m.casco} position={[0, -0.14, 0]}>
              <capsuleGeometry args={[0.062, 0.2, 8, 20]} />
            </mesh>
            {/* mão: luva arredondada */}
            <mesh material={m.casco} position={[0, -0.3, 0]} scale={[1, 0.85, 0.9]}>
              <sphereGeometry args={[0.085, 20, 16]} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  )
}
