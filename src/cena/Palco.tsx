'use client'

import { useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, RoundedBox } from '@react-three/drei'
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import { CanvasTexture, Color, DoubleSide, ExtrudeGeometry, Group, MathUtils, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, Path, PlaneGeometry, QuadraticBezierCurve3, SRGBColorSpace, Shape, TubeGeometry, Vector2, Vector3 } from 'three'

// O palco dos projetos: uma cena só, e a câmera viaja de um projeto ao outro com a rolagem.
// Cada projeto é um objeto que conta o que ele faz, montado conforme o progresso local (0 a 1):
//   Tributax   notas fiscais caem e empilham; um carimbo desce e marca "regra aplicada"
//   DevGuard   seis placas hexagonais (as seis etapas) voam e montam um escudo, acendendo uma a uma
//   ERP        um bloco central e quatro sistemas em volta, ligados por cabos com pacotes indo e vindo
//   English    balões de conversa sobem, crescem e estouram
// `progresso` (0 a 1) vem da rolagem; nada aqui depende de estado do React.

const LIMA = '#d7f452'
const AZUL = '#3d5afe'
const LARANJA = '#ff5a1f'
const ESPACO = 26
// onde fica cada projeto: em fila, mas com alturas e profundidades diferentes para a câmera não andar em linha reta
const ESTACOES = [new Vector3(0, 0, 0), new Vector3(ESPACO, 3, -6), new Vector3(ESPACO * 2, -1, -2), new Vector3(ESPACO * 3, 2, -8)]
// de que ângulo a câmera olha cada um
const ANGULOS = [
  [0.35, 0.18],
  [-0.45, 0.05],
  [0.2, 0.5],
  [-0.25, -0.05],
]

const passo = (a: number, b: number, x: number) => MathUtils.smoothstep(x, a, b)
export const local = (p: number, i: number) => MathUtils.clamp((p - i / 4) * 4, 0, 1)

function textura(desenhar: (c: CanvasRenderingContext2D, w: number, h: number) => void, w = 512, h = 512) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  desenhar(canvas.getContext('2d')!, w, h)
  const t = new CanvasTexture(canvas)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  return t
}

const FONTE = '"Cabinet Grotesk", system-ui, sans-serif'

/* ---------- Tributax ---------- */

// a folha da nota: layout de DANFE desenhado à mão no canvas (caixas, código de barras, tabela de itens)
function desenharNota(c: CanvasRenderingContext2D, w: number, h: number, destaque: boolean) {
  c.fillStyle = '#f7f6f2'
  c.fillRect(0, 0, w, h)
  const m = 56
  const tinta = '#26272c'
  const cinza = 'rgba(38,39,44,0.16)'
  c.strokeStyle = 'rgba(38,39,44,0.55)'
  c.lineWidth = 2
  // cabeçalho
  c.strokeRect(m, m, w - m * 2, 190)
  c.beginPath()
  c.moveTo(m + 420, m)
  c.lineTo(m + 420, m + 190)
  c.stroke()
  c.fillStyle = tinta
  c.font = `800 46px ${FONTE}`
  c.fillText('DANFE', m + 24, m + 64)
  c.font = `500 22px ${FONTE}`
  c.fillText('Documento auxiliar da', m + 24, m + 104)
  c.fillText('nota fiscal eletrônica', m + 24, m + 132)
  c.fillText('NF-e  Nº 000.208', m + 24, m + 170)
  // código de barras
  let x = m + 450
  for (let i = 0; i < 70 && x < w - m - 20; i++) {
    const largura = 2 + ((i * 7) % 5)
    c.fillRect(x, m + 30, largura, 110)
    x += largura + 3 + ((i * 3) % 4)
  }
  c.fillStyle = cinza
  c.fillRect(m + 450, m + 152, w - m * 2 - 470, 14)
  // destinatário
  c.strokeRect(m, m + 220, w - m * 2, 150)
  for (let i = 0; i < 3; i++) {
    c.fillStyle = cinza
    c.fillRect(m + 20, m + 248 + i * 40, (w - m * 2) * (0.35 + ((i * 29) % 40) / 100), 14)
    c.fillRect(m + (w - m * 2) * 0.62, m + 248 + i * 40, (w - m * 2) * 0.3, 14)
  }
  // tabela de itens
  const ty = m + 400
  const linhas = 11
  const alt = 46
  c.strokeRect(m, ty, w - m * 2, alt * (linhas + 1))
  c.fillStyle = 'rgba(38,39,44,0.07)'
  c.fillRect(m, ty, w - m * 2, alt)
  const cols = [0.42, 0.56, 0.7, 0.84]
  cols.forEach((f) => {
    c.beginPath()
    c.moveTo(m + (w - m * 2) * f, ty)
    c.lineTo(m + (w - m * 2) * f, ty + alt * (linhas + 1))
    c.stroke()
  })
  c.fillStyle = tinta
  c.font = `500 18px ${FONTE}`
  ;['DESCRIÇÃO', 'NCM', 'CFOP', 'ICMS', 'VALOR'].forEach((t, i) => c.fillText(t, m + 14 + (i ? (w - m * 2) * cols[i - 1]! : 0), ty + 30))
  for (let i = 1; i <= linhas; i++) {
    const y = ty + alt * i
    c.strokeStyle = 'rgba(38,39,44,0.12)'
    c.beginPath()
    c.moveTo(m, y)
    c.lineTo(w - m, y)
    c.stroke()
    // a linha do ICMS que o motor decidiu fica marcada de lima
    if (destaque && i === 4) {
      c.fillStyle = 'rgba(215,244,82,0.85)'
      c.fillRect(m + 2, y + 2, w - m * 2 - 4, alt - 4)
    }
    c.fillStyle = cinza
    c.fillRect(m + 14, y + 16, (w - m * 2) * (0.18 + ((i * 37) % 20) / 100), 12)
    cols.forEach((f) => c.fillRect(m + (w - m * 2) * f + 14, y + 16, 60 + ((i * 13) % 30), 12))
  }
  // totais
  const by = ty + alt * (linhas + 1) + 30
  c.strokeStyle = 'rgba(38,39,44,0.55)'
  c.strokeRect(w - m - 380, by, 380, 120)
  c.fillStyle = tinta
  c.font = `800 30px ${FONTE}`
  c.fillText('TOTAL', w - m - 356, by + 72)
  c.fillStyle = cinza
  c.fillRect(m, by + 20, 420, 14)
  c.fillRect(m, by + 56, 340, 14)
}

// folha com uma leve curvatura nas bordas, como papel de verdade
function geometriaFolha() {
  const g = new PlaneGeometry(2.4, 3.1, 24, 1)
  const pos = g.attributes.position!
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    pos.setZ(i, Math.pow(Math.abs(x) / 1.2, 3) * 0.06)
  }
  g.computeVertexNormals()
  return g
}

function Tributax({ p }: { p: React.RefObject<number> }) {
  const notas = useRef<(Group | null)[]>([])
  const carimbo = useRef<Group>(null)
  const marca = useRef<Mesh>(null)
  const N = 7
  const folha = useMemo(geometriaFolha, [])
  const faces = useMemo(() => [false, true].map((d) => textura((c, w, h) => desenharNota(c, w, h, d), 1024, 1320)), [])
  const selo = useMemo(
    () =>
      textura((c, w, h) => {
        c.clearRect(0, 0, w, h)
        c.save()
        c.translate(w / 2, h / 2)
        c.strokeStyle = '#e2461a'
        c.fillStyle = '#e2461a'
        c.lineWidth = 16
        c.beginPath()
        c.roundRect(-w / 2 + 24, -h / 2 + 24, w - 48, h - 48, 26)
        c.stroke()
        c.lineWidth = 4
        c.beginPath()
        c.roundRect(-w / 2 + 48, -h / 2 + 48, w - 96, h - 96, 14)
        c.stroke()
        c.textAlign = 'center'
        c.font = `800 120px ${FONTE}`
        c.fillText('REGRA', 0, -10)
        c.font = `800 76px ${FONTE}`
        c.fillText('APLICADA', 0, 92)
        c.restore()
        // falhas de tinta: o carimbo nunca sai perfeito
        c.globalCompositeOperation = 'destination-out'
        for (let i = 0; i < 1600; i++) {
          const r = Math.random() * 3.2
          c.globalAlpha = 0.3 + Math.random() * 0.7
          c.beginPath()
          c.arc(Math.random() * w, Math.random() * h, r, 0, Math.PI * 2)
          c.fill()
        }
        c.globalAlpha = 0.5
        c.fillRect(w * 0.72, 0, w * 0.28, h * 0.2)
      }, 1024, 512),
    [],
  )
  const topo = N * 0.03 - 1.2
  // cada nota tem uma queda própria: de onde sai, quanto gira e onde para na pilha
  const quedas = useMemo(
    () => Array.from({ length: N }, (_, i) => ({ x: Math.sin(i * 12.9) * 0.9, z: Math.cos(i * 7.1) * 0.25, giro: Math.sin(i * 3.3) * 0.35, sobe: 7 + i * 1.2 })),
    [],
  )
  useFrame((st) => {
    const l = p.current ?? 0
    const tempo = st.clock.elapsedTime
    notas.current.forEach((g, i) => {
      if (!g) return
      const q = quedas[i]!
      const t = passo(0.02 + i * 0.045, 0.24 + i * 0.045, l)
      // cai planando: balança de um lado para o outro enquanto desce
      const plana = (1 - t) * Math.sin(tempo * 2 + i) * 0.35
      g.position.set(q.x * (1 - t * 0.9) + plana, MathUtils.lerp(q.sobe, i * 0.03 - 1.2, t), q.z * (1 - t * 0.5))
      g.rotation.set(-Math.PI / 2 + (1 - t) * 0.9 + plana * 0.4, (1 - t) * 0.3, q.giro * (1 - t * 0.8) + i * 0.035)
    })
    // o carimbo desce, bate (afunda um pouco) e sobe; a marca fica
    const desce = passo(0.46, 0.6, l) - passo(0.7, 0.84, l)
    const bateu = l > 0.595
    if (carimbo.current) {
      carimbo.current.visible = desce > 0.002
      carimbo.current.position.y = MathUtils.lerp(9, topo + 0.02, desce)
      carimbo.current.rotation.set(0, (1 - desce) * 0.9 + 0.12, (1 - desce) * 0.2)
    }
    if (marca.current) {
      marca.current.visible = bateu
      const s = bateu ? 1 + (1 - passo(0.595, 0.64, l)) * 0.12 : 1
      marca.current.scale.setScalar(s)
    }
  })
  return (
    <group>
      <directionalLight
        castShadow
        position={[2.5, 9, 3.5]}
        intensity={0.9}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0004}
        shadow-radius={6}
      />
      {quedas.map((_, i) => (
        <group key={i} ref={(g) => void (notas.current[i] = g)}>
          <mesh geometry={folha} castShadow receiveShadow>
            <meshPhysicalMaterial map={faces[i === N - 1 ? 1 : 0]} roughness={0.9} sheen={0.4} sheenColor="#ffffff" side={DoubleSide} />
          </mesh>
        </group>
      ))}
      <mesh ref={marca} position={[0.25, topo + 0.012, 0.05]} rotation={[-Math.PI / 2, 0, 0.1]} receiveShadow>
        <planeGeometry args={[1.7, 0.85]} />
        <meshStandardMaterial map={selo} transparent roughness={0.55} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
      <group ref={carimbo} position={[0.25, 9, 0.05]}>
        {/* almofada de borracha, base e cabo torneado */}
        <RoundedBox args={[1.8, 0.08, 0.95]} radius={0.03} position={[0, 0.04, 0]} castShadow>
          <meshStandardMaterial color="#c8401a" roughness={0.9} />
        </RoundedBox>
        <RoundedBox args={[1.9, 0.32, 1.02]} radius={0.1} smoothness={6} position={[0, 0.24, 0]} castShadow>
          <meshPhysicalMaterial color="#1d1e22" roughness={0.35} clearcoat={0.8} clearcoatRoughness={0.25} />
        </RoundedBox>
        <mesh position={[0, 0.4, 0]} castShadow>
          <latheGeometry args={[CABO, 48]} />
          <meshPhysicalMaterial color="#d7f452" roughness={0.3} clearcoat={1} clearcoatRoughness={0.15} />
        </mesh>
      </group>
    </group>
  )
}

// perfil do cabo do carimbo (girado em torno do eixo Y)
const CABO = [
  [0.0, 0],
  [0.36, 0],
  [0.36, 0.06],
  [0.16, 0.14],
  [0.12, 0.5],
  [0.16, 0.7],
  [0.34, 0.86],
  [0.36, 1.02],
  [0.26, 1.16],
  [0.0, 1.2],
].map(([x, y]) => new Vector2(x, y))

/* ---------- materiais de vidro ---------- */

// vidro claro com reflexo furta-cor: é o que tira a cara de "brinquedo" das formas simples
function vidro(cor = '#ffffff', fosco = 0.12) {
  return new MeshPhysicalMaterial({
    color: cor,
    transmission: 1,
    thickness: 0.8,
    roughness: fosco,
    ior: 1.45,
    iridescence: 0.5,
    iridescenceIOR: 1.3,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    attenuationColor: new Color(cor),
    attenuationDistance: 2.5,
    envMapIntensity: 1.4,
  })
}

// texto desenhado num plano transparente (fica dentro ou atrás do vidro e é refratado por ele)
function rotulo(linhas: string[], tamanhos: number[], w = 512, h = 256) {
  return textura((c) => {
    c.clearRect(0, 0, w, h)
    c.fillStyle = '#ffffff'
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    const total = tamanhos.reduce((a, b) => a + b * 1.1, 0)
    let y = h / 2 - total / 2
    linhas.forEach((l, i) => {
      const t = tamanhos[i]!
      c.font = `${i === 0 ? 800 : 500} ${t}px ${FONTE}`
      c.fillText(l, w / 2, y + t * 0.55)
      y += t * 1.1
    })
  }, w, h)
}

function hexagono(r: number, furo = 0) {
  const forma = new Shape()
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6
    if (i) forma.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    else forma.moveTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  if (furo) {
    const buraco = new Path()
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6
      if (i) buraco.lineTo(Math.cos(a) * furo, Math.sin(a) * furo)
      else buraco.moveTo(Math.cos(a) * furo, Math.sin(a) * furo)
    }
    forma.holes.push(buraco)
  }
  return forma
}

/* ---------- DevGuard ---------- */

// escudo de seis hexágonos: três em cima, dois no meio, um embaixo
const FAVO = [
  [-1.75, 1.5],
  [0, 1.5],
  [1.75, 1.5],
  [-0.875, 0],
  [0.875, 0],
  [0, -1.5],
]
const ETAPAS = ['Mapear', 'Especificar', 'Planejar', 'Construir', 'Testar', 'Revisar']

function DevGuard({ p }: { p: React.RefObject<number> }) {
  const placas = useRef<(Group | null)[]>([])
  const grupo = useRef<Group>(null)
  const geoPlaca = useMemo(() => {
    const g = new ExtrudeGeometry(hexagono(0.84), { depth: 0.16, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 5, curveSegments: 1 })
    g.center()
    return g
  }, [])
  const geoAro = useMemo(() => {
    const g = new ExtrudeGeometry(hexagono(0.98, 0.93), { depth: 0.04, bevelEnabled: false })
    g.center()
    return g
  }, [])
  const matVidro = useMemo(() => vidro('#eef2ff', 0.08), [])
  const aros = useMemo(() => FAVO.map(() => new MeshBasicMaterial({ color: new Color('#3a3c44'), toneMapped: false })), [])
  const textos = useMemo(() => ETAPAS.map((e, i) => new MeshBasicMaterial({ map: rotulo([`0${i + 1}`, e], [86, 52]), transparent: true, color: '#8d8c87', toneMapped: false })), [])
  const soltas = useMemo(() => FAVO.map((_, i) => new Vector3(Math.sin(i * 2.4) * 7, Math.cos(i * 1.7) * 5, -4 - (i % 3) * 3)), [])
  const lima = useMemo(() => new Color(LIMA).multiplyScalar(2.2), [])
  const apagado = useMemo(() => new Color('#3a3c44'), [])
  useFrame((st) => {
    const l = p.current ?? 0
    placas.current.forEach((g, i) => {
      if (!g) return
      const [x, y] = FAVO[i]!
      const t = passo(0.04 + i * 0.05, 0.34 + i * 0.05, l)
      const s = soltas[i]!
      g.position.set(MathUtils.lerp(s.x, x!, t), MathUtils.lerp(s.y, y!, t), MathUtils.lerp(s.z, 0, t))
      g.rotation.set((1 - t) * (1.6 + i * 0.4), (1 - t) * 2.4, (1 - t) * i * 0.6)
      // cada etapa acende na ordem: o aro fica lima e o texto atrás do vidro clareia
      const acesa = passo(0.48 + i * 0.05, 0.53 + i * 0.05, l)
      aros[i]!.color.copy(apagado).lerp(lima, acesa)
      textos[i]!.color.set(acesa > 0.5 ? '#121214' : '#8d8c87')
    })
    if (grupo.current) {
      const pronto = passo(0.82, 0.95, l)
      grupo.current.rotation.y = Math.sin(st.clock.elapsedTime * 0.6) * 0.18 * pronto + st.pointer.x * 0.15
      grupo.current.rotation.x = -st.pointer.y * 0.1
    }
  })
  return (
    <group ref={grupo}>
      {FAVO.map((_, i) => (
        <group key={i} ref={(g) => void (placas.current[i] = g)}>
          <mesh geometry={geoPlaca} material={matVidro} />
          <mesh geometry={geoAro} material={aros[i]} position={[0, 0, -0.02]} />
          {/* um fundo claro atrás de cada placa, para o vidro ter o que refratar */}
          <mesh position={[0, 0, -0.16]}>
            <circleGeometry args={[0.78, 6, Math.PI / 6]} />
            <meshStandardMaterial color="#e9e8e3" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0, -0.14]} material={textos[i]}>
            <planeGeometry args={[1.3, 0.65]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ---------- ERP ---------- */

const SISTEMAS = [
  { nome: 'Gestão', pos: new Vector3(-3, 1.9, 0.4), cor: '#f5f5f2' },
  { nome: 'Loja', pos: new Vector3(3, 1.6, -0.5), cor: '#6f86ff' },
  { nome: 'Marketing', pos: new Vector3(-2.8, -1.9, -0.6), cor: '#ff8a5c' },
  { nome: 'APIs', pos: new Vector3(2.9, -1.8, 0.6), cor: '#f5f5f2' },
]

function Erp({ p }: { p: React.RefObject<number> }) {
  const blocos = useRef<(Group | null)[]>([])
  const cabos = useRef<(Mesh | null)[]>([])
  const pacotes = useRef<(Mesh | null)[]>([])
  const centro = useRef<Group>(null)
  // cabos curvos do centro até cada sistema
  const curvas = useMemo(() => SISTEMAS.map((s) => new QuadraticBezierCurve3(new Vector3(), s.pos.clone().multiplyScalar(0.5).add(new Vector3(0, s.pos.y > 0 ? 0.9 : -0.9, 0.6)), s.pos)), [])
  const geoCabos = useMemo(() => curvas.map((c) => new TubeGeometry(c, 64, 0.03, 8)), [curvas])
  const vidros = useMemo(() => SISTEMAS.map((s) => Object.assign(vidro(s.cor, 0.38), { transmission: 0.8 })), [])
  const vidroCentro = useMemo(() => Object.assign(vidro('#d7f452', 0.25), { transmission: 0.55 }), [])
  const nomes = useMemo(() => SISTEMAS.map((s) => new MeshBasicMaterial({ map: rotulo([s.nome], [96]), transparent: true, color: '#f5f5f2', toneMapped: false })), [])
  const nomeCentro = useMemo(() => new MeshBasicMaterial({ map: rotulo(['ERP'], [150]), transparent: true, color: '#121214', toneMapped: false }), [])
  const ponto = new Vector3()
  useFrame((st) => {
    const l = p.current ?? 0
    const tempo = st.clock.elapsedTime
    if (centro.current) {
      const t = passo(0.03, 0.18, l)
      centro.current.scale.setScalar(t)
      centro.current.rotation.set(-st.pointer.y * 0.15, st.pointer.x * 0.25 + (1 - t) * 2, 0)
    }
    SISTEMAS.forEach((sis, i) => {
      const b = blocos.current[i]
      const t = passo(0.14 + i * 0.06, 0.38 + i * 0.06, l)
      if (b) {
        b.position.copy(sis.pos).multiplyScalar(0.3 + t * 0.7)
        b.position.y += Math.sin(tempo * 1.1 + i) * 0.1
        b.scale.setScalar(Math.max(0.0001, t))
        b.rotation.set(Math.sin(tempo * 0.7 + i) * 0.08, (1 - t) * 2 + Math.sin(tempo * 0.5 + i) * 0.12, 0)
      }
      // o cabo se desenha do centro até o sistema
      const liga = passo(0.38 + i * 0.05, 0.56 + i * 0.05, l)
      const cabo = cabos.current[i]
      if (cabo) cabo.geometry.setDrawRange(0, Math.floor(geoCabos[i]!.index!.count * liga / 6) * 6)
      // um pacote de luz vai e volta pela curva
      const pac = pacotes.current[i]
      if (pac) {
        const ida = (Math.sin(tempo * (1.4 + i * 0.25)) + 1) / 2
        curvas[i]!.getPoint(ida, ponto)
        pac.position.copy(ponto)
        pac.visible = liga > 0.98
      }
    })
  })
  return (
    <group>
      <group ref={centro}>
        <RoundedBox args={[2.6, 1.3, 0.5]} radius={0.22} smoothness={8} material={vidroCentro} />
        <mesh position={[0, 0, 0.27]} material={nomeCentro}>
          <planeGeometry args={[2, 0.9]} />
        </mesh>
      </group>
      {SISTEMAS.map((sis, i) => (
        <group key={sis.nome}>
          <group ref={(g) => void (blocos.current[i] = g)}>
            <RoundedBox args={[2.1, 0.82, 0.28]} radius={0.14} smoothness={8} material={vidros[i]} />
            <mesh position={[0, 0, 0.16]} material={nomes[i]}>
              <planeGeometry args={[1.8, 0.6]} />
            </mesh>
          </group>
          <mesh ref={(m) => void (cabos.current[i] = m)} geometry={geoCabos[i]}>
            <meshStandardMaterial color="#9a9993" roughness={0.35} metalness={0.6} />
          </mesh>
          <mesh ref={(m) => void (pacotes.current[i] = m)}>
            <sphereGeometry args={[0.09, 16, 12]} />
            <meshBasicMaterial color={new Color(LIMA).multiplyScalar(3)} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ---------- English ---------- */

const FALAS = [
  { texto: 'Hello!', cor: '#f5f5f2', x: -1.9, z: 0.4 },
  { texto: 'Olá', cor: '#d7f452', x: 1.5, z: -0.6 },
  { texto: 'How are you?', cor: '#6f86ff', x: 0.1, z: 0.8 },
  { texto: "Let's talk", cor: '#ff8a5c', x: -1.2, z: -1 },
  { texto: 'Nice!', cor: '#f5f5f2', x: 1.9, z: 0.2 },
]

// silhueta de balão de fala: retângulo de cantos bem redondos com a pontinha embaixo, numa forma só
function formaBalao(w: number, h: number) {
  const r = h * 0.45
  const s = new Shape()
  s.moveTo(-w / 2 + r, -h / 2)
  s.lineTo(-w / 2 + r + 0.15, -h / 2)
  s.lineTo(-w / 2 + r - 0.05, -h / 2 - 0.38)
  s.lineTo(-w / 2 + r + 0.55, -h / 2)
  s.lineTo(w / 2 - r, -h / 2)
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r)
  s.lineTo(w / 2, h / 2 - r)
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2)
  s.lineTo(-w / 2 + r, h / 2)
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r)
  s.lineTo(-w / 2, -h / 2 + r)
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2)
  return s
}

function Balao({ texto, cor }: { texto: string; cor: string }) {
  const largura = texto.length > 8 ? 3 : 2.1
  const geo = useMemo(() => {
    const g = new ExtrudeGeometry(formaBalao(largura, 1), { depth: 0.18, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 6, curveSegments: 24 })
    g.translate(0, 0, -0.09)
    return g
  }, [largura])
  const mat = useMemo(() => Object.assign(vidro(cor, 0.32), { transmission: 0.8 }), [cor])
  const escuroNoClaro = cor === '#d7f452'
  const letra = useMemo(() => new MeshBasicMaterial({ map: rotulo([texto], [texto.length > 8 ? 78 : 104], 640, 220), transparent: true, color: escuroNoClaro ? '#121214' : '#f5f5f2', toneMapped: false }), [texto, escuroNoClaro])
  return (
    <group>
      <mesh geometry={geo} material={mat} />
      <mesh position={[0, 0, 0.2]} material={letra}>
        <planeGeometry args={[largura * 0.92, 0.95]} />
      </mesh>
    </group>
  )
}

function English({ p }: { p: React.RefObject<number> }) {
  const baloes = useRef<(Group | null)[]>([])
  useFrame((st) => {
    const l = p.current ?? 0
    const tempo = st.clock.elapsedTime
    baloes.current.forEach((g, i) => {
      if (!g) return
      const f = FALAS[i]!
      // sobe de baixo, cresce com um pulinho e, no fim, estoura (encolhe rápido)
      const nasce = passo(0.06 + i * 0.1, 0.2 + i * 0.1, l)
      const estoura = passo(0.88 + i * 0.02, 0.94 + i * 0.02, l)
      const pulo = Math.sin(nasce * Math.PI) * 0.18
      g.scale.setScalar(Math.max(0.0001, (nasce + pulo) * (1 - estoura)))
      g.position.set(f.x, MathUtils.lerp(-4, 2.2 - i * 0.95, nasce) + Math.sin(tempo + i) * 0.08, f.z)
      g.rotation.set(-st.pointer.y * 0.1, Math.sin(tempo * 0.6 + i) * 0.2 + st.pointer.x * 0.2, Math.sin(tempo * 0.8 + i) * 0.04)
    })
  })
  return (
    <group>
      {FALAS.map((f, i) => (
        <group key={f.texto} ref={(g) => void (baloes.current[i] = g)}>
          <Balao texto={f.texto} cor={f.cor} />
        </group>
      ))}
    </group>
  )
}

/* ---------- câmera e montagem ---------- */

const alvo = new Vector3()
const olho = new Vector3()

function Camera({ progresso }: { progresso: React.RefObject<number> }) {
  const { camera, pointer } = useThree()
  const olhar = useRef(new Vector3())
  useFrame((_, dt) => {
    const p = progresso.current ?? 0
    // a câmera para em cada projeto e viaja entre eles: o progresso global vira posição com patamares
    const f = Math.min(p * 4, 3.999)
    const i = Math.floor(f)
    const dentro = f - i
    const viaja = passo(0.86, 1, dentro)
    const a = ESTACOES[i]!
    const b = ESTACOES[Math.min(i + 1, 3)]!
    alvo.lerpVectors(a, b, viaja)
    const [ang, alt] = ANGULOS[i]!
    const [ang2, alt2] = ANGULOS[Math.min(i + 1, 3)]!
    const ag = MathUtils.lerp(ang!, ang2!, viaja) + pointer.x * 0.12
    const al = MathUtils.lerp(alt!, alt2!, viaja) + pointer.y * 0.08
    // aproxima devagar enquanto o objeto se monta, e recua no meio da viagem para mostrar o caminho
    const dist = 14.5 - passo(0.1, 0.8, dentro) * 2.5 + Math.sin(viaja * Math.PI) * 6
    olho.set(alvo.x + Math.sin(ag) * dist - 2.6, alvo.y + Math.sin(al) * dist, alvo.z + Math.cos(ag) * dist)
    const k = 1 - Math.exp(-dt * 5)
    camera.position.lerp(olho, k)
    // o objeto fica à direita: o texto do projeto ocupa a esquerda
    olhar.current.lerp(alvo.clone().setX(alvo.x - 2.6), k)
    camera.lookAt(olhar.current)
  })
  return null
}

// halo de cor atrás de cada projeto (lima, azul, laranja, lima): luz difusa, sem borda
const CORES_HALO = ['#d7f452', '#3d5afe', '#ff5a1f', '#d7f452']
const HALOS = CORES_HALO.map(
  (cor) =>
    new MeshBasicMaterial({
      map: typeof document === 'undefined' ? null : textura((c, w, h) => {
        const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
        g.addColorStop(0, cor + '30')
        g.addColorStop(0.45, cor + '0c')
        g.addColorStop(1, cor + '00')
        c.fillStyle = g
        c.fillRect(0, 0, w, h)
      }, 256, 256),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
)

function Estacao({ i, progresso, children }: { i: number; progresso: React.RefObject<number>; children: (p: React.RefObject<number>) => React.ReactNode }) {
  const l = useRef(0)
  const g = useRef<Group>(null)
  useFrame(() => {
    l.current = local(progresso.current ?? 0, i)
    // fora do trecho dele (e dos vizinhos), o projeto nem desenha
    if (g.current) g.current.visible = Math.abs((progresso.current ?? 0) * 4 - i - 0.5) < 1.6
  })
  return (
    <group ref={g} position={ESTACOES[i]}>
      <mesh position={[0.5, 0.3, -5]} material={HALOS[i]}>
        <planeGeometry args={[22, 22]} />
      </mesh>
      {children(l)}
    </group>
  )
}

function Chao() {
  // um piso de pontos dá escala e mostra o deslocamento durante a viagem
  const pontos = useMemo(() => {
    const arr: number[] = []
    for (let x = -20; x <= ESPACO * 3 + 20; x += 1.6) for (let z = -24; z <= 12; z += 1.6) arr.push(x, -4.6, z)
    return new Float32Array(arr)
  }, [])
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pontos, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.06} color="#ecebe6" transparent opacity={0.28} sizeAttenuation />
    </points>
  )
}

export default function Palco({ progresso, ativo }: { progresso: React.RefObject<number>; ativo: boolean }) {
  return (
    <Canvas
      shadows
      frameloop={ativo ? 'always' : 'never'}
      dpr={[1, 1.75]}
      gl={{ antialias: false }}
      camera={{ position: [0, 2, 14], fov: 38 }}
      style={{ position: 'absolute', inset: 0 }}
    >
      {/* o mesmo escuro do fundo da página nos projetos */}
      <color attach="background" args={['#0c0d0f']} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 10, 8]} intensity={2.2} />
      <directionalLight position={[-8, -2, -6]} intensity={0.6} color={AZUL} />
      <Environment resolution={256}>
        <Lightformer intensity={2.4} position={[0, 6, 6]} scale={[12, 3, 1]} />
        <Lightformer intensity={0.8} position={[6, 2, -4]} scale={[3, 6, 1]} />
        <Lightformer intensity={1} color={LIMA} position={[-8, 0, 2]} scale={[2, 8, 1]} />
        <Lightformer form="ring" intensity={1.6} position={[4, 4, 6]} scale={3} />
        <Lightformer intensity={0.6} color={AZUL} position={[0, -6, 2]} scale={[10, 2, 1]} />
      </Environment>
      <Camera progresso={progresso} />
      <Chao />
      <Estacao i={0} progresso={progresso}>
        {(p) => <Tributax p={p} />}
      </Estacao>
      <Estacao i={1} progresso={progresso}>
        {(p) => <DevGuard p={p} />}
      </Estacao>
      <Estacao i={2} progresso={progresso}>
        {(p) => <Erp p={p} />}
      </Estacao>
      <Estacao i={3} progresso={progresso}>
        {(p) => <English p={p} />}
      </Estacao>
      {/* brilho só no que é luz (aros, pacotes), grão de filme e vinheta: tira o aspecto de render limpo demais */}
      <EffectComposer multisampling={4}>
        <Bloom intensity={0.6} luminanceThreshold={1.05} luminanceSmoothing={0.15} mipmapBlur />
        <Noise opacity={0.045} premultiply />
        <Vignette offset={0.3} darkness={0.6} />
      </EffectComposer>
    </Canvas>
  )
}
