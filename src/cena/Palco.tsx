'use client'

import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Environment, Lightformer, MeshReflectorMaterial, RoundedBox } from '@react-three/drei'
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import { CanvasTexture, Color, DoubleSide, ExtrudeGeometry, Group, MathUtils, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, Path, PlaneGeometry, QuadraticBezierCurve3, SRGBColorSpace, Shape, Texture, TextureLoader, TubeGeometry, Vector2, Vector3 } from 'three'
import { projetos } from '@/content/projetos'

// O palco dos projetos: um salão escuro com piso espelhado. Os quatro projetos são cards numa fila em
// arco (o da frente fica embaixo do objeto, os outros recuem para a direita e somem na névoa); a
// câmera fica parada — quem anda é a fila. Conforme a rolagem, o card da frente chega ao posto e o
// objeto do projeto se monta em cima dele:
//   Tributax   notas fiscais caem e empilham; um carimbo desce e marca "regra aplicada"
//   DevGuard   seis placas hexagonais (as seis etapas) voam e montam um escudo, acendendo uma a uma
//   ERP        um bloco central e quatro sistemas em volta, ligados por cabos com pacotes indo e vindo
//   English    balões de conversa sobem, crescem e estouram
// `progresso` (0 a 1) vem da rolagem; nada aqui depende de estado do React.

const LIMA = '#d7f452'
const AZUL = '#3d5afe'
const LARANJA = '#ff5a1f'

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

const FONTE = '"Inter Tight", system-ui, sans-serif'
const FONTE_MONO = '"IBM Plex Mono", monospace'

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

/* ---------- cards em arco ---------- */

// a capa do card: a imagem do projeto emoldurada, com nome e rótulo na própria capa
function capaCard(img: Texture | null, indice: number, nome: string, rotulo: string, w = 1024, h = 640) {
  return textura((c) => {
    c.fillStyle = '#101114'
    c.fillRect(0, 0, w, h)
    const m = 26
    const iw = w - m * 2
    const ih = h - m * 2
    if (img) {
      // enquadra a imagem cobrindo a área interna
      const fonte = img.image as HTMLImageElement
      const orig = { w: fonte.naturalWidth || iw, h: fonte.naturalHeight || ih }
      const k = Math.max(iw / orig.w, ih / orig.h)
      const dw = orig.w * k
      const dh = orig.h * k
      c.drawImage(fonte, m + (iw - dw) / 2, m + (ih - dh) / 2, dw, dh)
    } else {
      // sem imagem (ERP): mini-diagrama lima sobre grafite — o próprio objeto resumido
      c.fillStyle = '#131419'
      c.fillRect(m, m, iw, ih)
      c.strokeStyle = 'rgba(215,244,82,0.85)'
      c.lineWidth = 3
      const cx = w / 2
      const cy = h / 2 - 20
      c.strokeRect(cx - 90, cy - 44, 180, 88)
      const pontos = [
        [cx - 300, cy - 130],
        [cx + 300, cy - 110],
        [cx - 280, cy + 130],
        [cx + 290, cy + 120],
      ] as const
      c.lineWidth = 2
      for (const [px, py] of pontos) {
        c.strokeRect(px - 55, py - 24, 110, 48)
        c.beginPath()
        c.moveTo(px + (px < cx ? 55 : -55), py)
        c.quadraticCurveTo(px + (px < cx ? 130 : -130), py, px < cx ? cx - 90 : cx + 90, cy + (py < cy ? -22 : 22))
        c.stroke()
      }
      c.fillStyle = '#e9e8e3'
      c.font = `600 34px ${FONTE_MONO}`
      c.textAlign = 'center'
      c.fillText('ERP', cx, cy + 12)
    }
    // filete de moldura e vinco inferior
    c.strokeStyle = 'rgba(236,235,230,0.16)'
    c.lineWidth = 2
    c.strokeRect(m, m, iw, ih)
    const g = c.createLinearGradient(0, h - 190, 0, h - m)
    g.addColorStop(0, 'rgba(8,9,11,0)')
    g.addColorStop(1, 'rgba(8,9,11,0.92)')
    c.fillStyle = g
    c.fillRect(m, h - 190, iw, 190 - m)
    c.fillStyle = '#ecebe6'
    c.font = `700 58px ${FONTE}`
    c.textAlign = 'left'
    c.fillText(nome, m + 26, h - 58)
    c.fillStyle = 'rgba(236,235,230,0.6)'
    c.font = `500 21px ${FONTE_MONO}`
    c.fillText(rotulo.toUpperCase(), m + 27, h - 108)
    c.fillStyle = LIMA
    c.font = `500 26px ${FONTE_MONO}`
    c.textAlign = 'right'
    c.fillText(`0${indice + 1}`, w - m - 24, h - 58)
  }, w, h)
}

// cartão: placa fina de cantos arredondados com a capa na frente
function formaCard(w: number, h: number, r: number) {
  const s = new Shape()
  s.moveTo(-w / 2 + r, -h / 2)
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

const CARD_W = 3.1
const CARD_H = 1.95

// posição do card na fila: m=0 é o posto da frente; m cresce = recua para a direita e para o fundo
function vaga(m: number) {
  return {
    x: 2.35 + m * 1.7,
    y: -1.28 + Math.sin(m * 2.2) * 0.1,
    z: 2.55 - m * 1.35,
    rot: -0.07 - m * 0.42,
    esc: 1 - Math.min(m, 3) * 0.09,
  }
}

// onde cada card está na fila (m) e o quanto o objeto dele está montado (local), derivados do progresso
function estadoNaFila(p: number, j: number) {
  const f = Math.min(p * 4, 3.999)
  const i = Math.floor(f)
  const l = f - i
  const sai = Math.max(0, (l - 0.75) * 4)
  // o card atual sai no fim do trecho e o próximo entra no lugar dele, na mesma curva — a fila anda
  // inteira, sem troca seca
  const m = j === i ? sai : j === i + 1 ? 1 - sai : j < i ? i - j + 1 : j - i
  const local = j === i ? passo(0.1, 0.62, l) * (1 - passo(0.8, 0.96, l)) : 0
  return { m, local, ativo: MathUtils.clamp(1 - m, 0, 1) }
}

// o card: placa fina com a capa na frente e um aro lima que acende quando está no posto
function Card({ projeto, indice, progresso }: { projeto: (typeof projetos)[number]; indice: number; progresso: React.RefObject<number> }) {
  const g = useRef<Group>(null)
  const aroMat = useMemo(() => new MeshBasicMaterial({ color: new Color(LIMA).multiplyScalar(1.5), transparent: true, opacity: 0, toneMapped: false, fog: false }), [])
  const capa = useMemo(() => new MeshBasicMaterial({ toneMapped: false, fog: false }), [])
  const [placa, frente] = useMemo(() => {
    const geoPlaca = new ExtrudeGeometry(formaCard(CARD_W, CARD_H, 0.16), { depth: 0.07, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 3, curveSegments: 12 })
    geoPlaca.center()
    geoPlaca.translate(0, 0, 0.045)
    const moldura = new ExtrudeGeometry(formaMoldura(CARD_W + 0.14, CARD_H + 0.14, CARD_W + 0.03, CARD_H + 0.03), { depth: 0.02, bevelEnabled: false, curveSegments: 12 })
    moldura.center()
    return [geoPlaca, moldura] as const
  }, [])
  useFrame((st) => {
    const { m, ativo } = estadoNaFila(progresso.current ?? 0, indice)
    if (g.current) {
      const v = vaga(m)
      const t = st.clock.elapsedTime
      g.current.position.set(v.x, v.y + Math.sin(t * 1.3 + indice * 1.7) * 0.045 * (1 + ativo), v.z)
      g.current.rotation.set(Math.sin(t * 0.7 + indice) * 0.02, v.rot, Math.cos(t * 0.9 + indice) * 0.015)
      g.current.scale.setScalar(v.esc)
      g.current.visible = m < 4.5
    }
    // o da frente acende o aro e a capa; os de trás escurecem
    aroMat.opacity = ativo * (0.65 + Math.sin(st.clock.elapsedTime * 2.4) * 0.3)
    capa.color.setScalar(0.42 + ativo * 0.58)
  })
  return (
    <group ref={g}>
      <mesh geometry={placa}>
        <meshStandardMaterial color="#15161a" roughness={0.55} metalness={0.3} />
      </mesh>
      <mesh geometry={frente} material={aroMat} position={[0, 0, 0.09]} />
      {/* a capa colada na face frontal */}
      <mesh position={[0, 0, 0.095]} material={capa}>
        <shapeGeometry args={[formaCard(CARD_W - 0.1, CARD_H - 0.1, 0.13)]} />
      </mesh>
      <CapaLoader projeto={projeto} indice={indice} capa={capa} />
    </group>
  )
}

// moldura vazada (aro): o retângulo de fora menos o de dentro
function formaMoldura(ow: number, oh: number, iw: number, ih: number) {
  const s = formaCard(ow, oh, 0.2)
  const furo = new Path()
  const r = 0.16
  furo.moveTo(-iw / 2 + r, -ih / 2)
  furo.lineTo(iw / 2 - r, -ih / 2)
  furo.quadraticCurveTo(iw / 2, -ih / 2, iw / 2, -ih / 2 + r)
  furo.lineTo(iw / 2, ih / 2 - r)
  furo.quadraticCurveTo(iw / 2, ih / 2, iw / 2 - r, ih / 2)
  furo.lineTo(-iw / 2 + r, ih / 2)
  furo.quadraticCurveTo(-iw / 2, ih / 2, -iw / 2, ih / 2 - r)
  furo.lineTo(-iw / 2, -ih / 2 + r)
  furo.quadraticCurveTo(-iw / 2, -ih / 2, -iw / 2 + r, -ih / 2)
  s.holes.push(furo)
  return s
}

// carrega a imagem do projeto e desenha a capa do card com ela
function CapaLoader({ projeto, indice, capa }: { projeto: (typeof projetos)[number]; indice: number; capa: MeshBasicMaterial }) {
  const img = projeto.imagem ? useLoader(TextureLoader, projeto.imagem.src) : null
  useMemo(() => {
    capa.map = capaCard(img, indice, projeto.nome, projeto.rotulo)
    capa.needsUpdate = true
  }, [img])
  return null
}

/* ---------- montagem do palco ---------- */

// onde cada objeto fica: em cima do card da frente
const POSTO = new Vector3(1.5, 1.9, 0.2)
const ESCALAS = [0.56, 0.74, 0.76, 0.74]

function Fila({ progresso }: { progresso: React.RefObject<number> }) {
  const objetos = useRef<(Group | null)[]>([])
  const locais = useRef<React.RefObject<number>[]>(projetos.map(() => ({ current: 0 })))
  useFrame((st) => {
    const p = progresso.current ?? 0
    const f = Math.min(p * 4, 3.999)
    const i = Math.floor(f)
    projetos.forEach((_, j) => {
      const { m, local } = estadoNaFila(p, j)
      locais.current[j]!.current = local
      const o = objetos.current[j]
      if (o) {
        o.visible = local > 0.001 && m < 0.5
        const pulo = 1 + Math.sin(local * Math.PI) * 0.03
        o.scale.setScalar(ESCALAS[j]! * pulo)
        o.rotation.y = Math.sin(st.clock.elapsedTime * 0.25 + j * 2) * 0.06
      }
    })
  })
  return (
    <group>
      {projetos.map((projeto, j) => (
        <Card key={projeto.id} projeto={projeto} indice={j} progresso={progresso} />
      ))}
      {projetos.map((_, j) => (
        <group key={`obj-${j}`} ref={(g) => void (objetos.current[j] = g)} position={POSTO}>
          {j === 0 ? <Tributax p={locais.current[j]!} /> : j === 1 ? <DevGuard p={locais.current[j]!} /> : j === 2 ? <Erp p={locais.current[j]!} /> : <English p={locais.current[j]!} />}
        </group>
      ))}
    </group>
  )
}

export default function Palco({ progresso, ativo }: { progresso: React.RefObject<number>; ativo: boolean }) {
  return (
    <Canvas
      shadows
      frameloop={ativo ? 'always' : 'never'}
      dpr={[1, 1.75]}
      gl={{ antialias: false }}
      camera={{ position: [0, 1.5, 12.6], fov: 38 }}
      style={{ position: 'absolute', inset: 0 }}
    >
      {/* salão escuro: gradiente no fundo e névoa para a fila sumir com distância */}
      <color attach="background" args={['#0a0b0d']} />
      <fog attach="fog" args={['#0a0b0d', 15, 32]} />
      <ambientLight intensity={0.32} />
      <directionalLight position={[6, 10, 8]} intensity={2.0} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
      <directionalLight position={[-8, -2, -6]} intensity={0.55} color={AZUL} />
      <directionalLight position={[0, 3, -9]} intensity={0.4} color={LIMA} />
      <Environment resolution={256}>
        <Lightformer intensity={2.4} position={[0, 6, 6]} scale={[12, 3, 1]} />
        <Lightformer intensity={0.8} position={[6, 2, -4]} scale={[3, 6, 1]} />
        <Lightformer intensity={1} color={LIMA} position={[-8, 0, 2]} scale={[2, 8, 1]} />
        <Lightformer form="ring" intensity={1.6} position={[4, 4, 6]} scale={3} />
        <Lightformer intensity={0.6} color={AZUL} position={[0, -6, 2]} scale={[10, 2, 1]} />
      </Environment>
      {/* fundo em gradiente: quase preto em cima, um degrau mais claro embaixo */}
      <mesh position={[2, 3, -9]}>
        <planeGeometry args={[46, 22]} />
        <meshBasicMaterial map={textura((c, w, h) => {
          const g = c.createLinearGradient(0, 0, 0, h)
          g.addColorStop(0, '#07080a')
          g.addColorStop(0.62, '#0c0d10')
          g.addColorStop(1, '#121318')
          c.fillStyle = g
          c.fillRect(0, 0, w, h)
        }, 64, 256)} fog={false} />
      </mesh>
      {/* piso espelhado: o reflexo é o que dá escala e matéria ao salão */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.5, -2.35, 0]}>
        <planeGeometry args={[60, 40]} />
        <MeshReflectorMaterial
          blur={[280, 60]}
          resolution={768}
          mixBlur={1}
          mixStrength={14}
          roughness={0.92}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#0a0b0d"
          metalness={0.55}
          mirror={0.55}
        />
      </mesh>
      <CameraParada progresso={progresso} />
      <Suspense fallback={null}>
        <Fila progresso={progresso} />
      </Suspense>
      {/* brilho só no que é luz (aros, pacotes), grão de filme e vinheta: tira o aspecto de render limpo demais */}
      <EffectComposer multisampling={4}>
        <Bloom intensity={0.55} luminanceThreshold={1.05} luminanceSmoothing={0.15} mipmapBlur />
        <Noise opacity={0.04} premultiply />
        <Vignette offset={0.32} darkness={0.58} />
      </EffectComposer>
    </Canvas>
  )
}

/* câmera parada: só um ar com o ponteiro — quem anda é a fila */

function CameraParada({ progresso }: { progresso: React.RefObject<number> }) {
  const { camera, pointer } = useThree()
  const alvoPos = useRef(new Vector3(0, 1.5, 12.6))
  useFrame((_, dt) => {
    const p = progresso.current ?? 0
    // um leve dolly para dentro ao longo da seção, devagar: a sala parece respirar
    alvoPos.current.set(pointer.x * 0.55, 1.5 + pointer.y * 0.3, 12.6 - p * 1.1)
    const k = 1 - Math.exp(-dt * 3)
    camera.position.lerp(alvoPos.current, k)
    camera.lookAt(1.1, 0.9, 0)
  })
  return null
}
