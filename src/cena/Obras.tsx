'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useRecuperacao } from './contexto'
import {
  AdditiveBlending,
  BackSide,
  DoubleSide,
  TubeGeometry,
  BufferAttribute,
  BufferGeometry,
  LineSegments,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  LinearMipmapLinearFilter,
  PerspectiveCamera,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3,
  type Group,
} from 'three'
import { projetos, imagensDaParede } from '@/content/projetos'
import { trilhaTela, fovObras } from './trilhaTela'
import { Precompilar } from './Precompilar'

// Os projetos como um mundo em profundidade:
// cada projeto é uma capa com o brilho da própria imagem, posta numa grade de
// 3 × 2 células (18 × 13,5) num passeio sorteado, e 30 unidades mais funda que a anterior. A câmera segue um
// caminho que para 16 unidades na frente de cada capa e então atravessa para a próxima; a rolagem só diz onde
// ela está no caminho. Atrás, uma parede de imagens desfocadas e azuladas espalhadas até 400 de fundura,
// partículas correndo pelas linhas de uma grade e um céu azul com manchas de cor.

// cor compartilhada das partículas brancas da grade (antes: um Color novo para cada uma das 150 mil)
const BRANCO = new Color('#ffffff')

const CEL_L = 18
const CEL_A = 13.5
const COLS = 3
const LINS = 2
const ruidoS = (a: number, b: number) => {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return (n - Math.floor(n)) * 2 - 1
}
const suave = (x: number) => x * x * (3 - 2 * x)
const prende = (x: number) => Math.min(1, Math.max(0, x))
// a chegada vinda do vale (0 a 1): primeiro as partículas aparecem, enquanto os riscos do vale se dissolvem
// nelas, e só depois as imagens dos projetos
type Ref = { current: number }
// no fim, enquanto os riscos se juntam na linha, as imagens e a matriz se apagam (o Mundo atualiza a cada quadro)
let resta = 1
const particulas = (c: number) => suave(prende((c - 0.35) / 0.35)) * resta
const imagens = (c: number) => suave(prende((c - 0.7) / 0.3)) * resta * resta

// lugar de cada capa: passeio pela grade sem voltar para a célula anterior
function lugares(n: number) {
  const celulas = [{ c: 0, r: 0 }]
  for (let t = 1; t <= n; t++) {
    const { c, r } = celulas[t - 1]!
    const antes = celulas[t - 2]
    const vizinhas: { c: number; r: number }[] = []
    for (let dr = -1; dr <= 1; dr++)
      for (const dc of [-1, 1]) {
        const v = { c: c + dc, r: r + dr }
        if (v.c >= 0 && v.c < COLS && v.r >= 0 && v.r < LINS && !(antes && v.c === antes.c && v.r === antes.r)) vizinhas.push(v)
      }
    celulas.push(vizinhas[Math.floor((ruidoS(t, 6) * 0.5 + 0.5) * vizinhas.length) % vizinhas.length] ?? { c, r })
  }
  const xy = ({ c, r }: { c: number; r: number }) => [(c + 0.5) * CEL_L - (COLS * CEL_L) / 2, (r + 0.5) * CEL_A - (LINS * CEL_A) / 2] as const
  const capas = Array.from({ length: n }, (_, i) => {
    const [x, y] = xy(celulas[i]!)
    return new Vector3(x, y, -45 - i * 30 + ruidoS(i, 3) * 2)
  })
  const [fx, fy] = xy(celulas[n]!)
  // caminho: chega a 16 na frente de cada capa, passa por ela e já mira a próxima
  const pos: Vector3[] = []
  capas.forEach((c, i) => {
    const prox = capas[i + 1] ?? new Vector3(fx, fy, 0)
    if (i === 0) pos.push(new Vector3(c.x, c.y, 8))
    pos.push(new Vector3(c.x, c.y, c.z + 16))
    pos.push(new Vector3(prox.x, prox.y, c.z - 4))
    if (!capas[i + 1]) pos.push(new Vector3(prox.x, prox.y, c.z - 18))
  })
  return { capas, caminho: new CatmullRomCurve3(pos, false, 'centripetal') }
}

const vertPadrao = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`

// capa: a imagem como um painel de pontos: cada célula vira um ponto do tamanho do seu
// brilho, com colunas de luz descendo como chuva e linhas de varredura. Com o mouse em cima a matriz se desfaz
// e a imagem aparece limpa.
const fragImagem = /* glsl */ `
  uniform sampler2D uImagem;
  uniform float uOpacidade;
  uniform float uFoco;
  uniform float uTempo;
  varying vec2 vUv;
  float h1(float n) { return fract(sin(n * 91.345) * 43758.5453); }
  void main() {
    vec2 b = smoothstep(vec2(0.0), vec2(0.03), min(vUv, 1.0 - vUv));
    // vista por trás (na volta, quando a câmera olha o caminho percorrido) a imagem não fica espelhada
    vec2 uvf = gl_FrontFacing ? vUv : vec2(1.0 - vUv.x, vUv.y);
    vec3 limpa = texture2D(uImagem, uvf).rgb;
    vec2 cel = vec2(240.0, 180.0);
    vec2 g = uvf * cel;
    vec2 c = floor(g) + 0.5;
    vec2 f = fract(g) - 0.5;
    vec3 cor = texture2D(uImagem, c / cel).rgb;
    float lum = dot(cor, vec3(0.3, 0.55, 0.15));
    float raio = 0.16 + 0.3 * sqrt(lum);
    float ponto = 1.0 - smoothstep(raio - 0.06, raio + 0.05, length(f));
    // chuva: em cada coluna, uma cabeça de luz que desce e deixa rastro
    float h = h1(c.x);
    float cab = fract(h * 7.0 + uTempo * (0.08 + h * 0.18));
    float d = fract(cab - (1.0 - uvf.y));
    float chuva = exp(-d * 14.0) * step(0.45, h);
    float varre = 0.85 + 0.15 * sin(uvf.y * 900.0 - uTempo * 4.0);
    vec3 matriz = (cor * 1.35 + vec3(0.03, 0.05, 0.14) + vec3(0.45, 0.65, 1.0) * chuva * (0.35 + lum)) * ponto * varre + cor * 0.08;
    vec3 c3 = mix(matriz, limpa, 0.72 + 0.28 * uFoco);
    gl_FragColor = vec4(c3, uOpacidade * b.x * b.y);
    #include <colorspace_fragment>
  }
`

// brilho em volta da capa: a própria imagem bem desfocada (mip alto), somada, que some com a distância da borda
const fragBrilho = /* glsl */ `
  uniform sampler2D uImagem;
  uniform float uForca;
  uniform float uHalo;
  varying vec2 vUv;
  void main() {
    vec2 t = vUv * (1.0 + uHalo * 2.0) - uHalo;
    vec2 n = clamp(t, 0.0, 1.0);
    float dentro = step(0.0, t.x) * step(t.x, 1.0) * step(0.0, t.y) * step(t.y, 1.0);
    vec2 bi = smoothstep(vec2(0.0), vec2(0.15), min(n, 1.0 - n));
    float miolo = bi.x * bi.y * dentro;
    vec3 c = min(textureLod(uImagem, clamp(t, 0.1, 0.9), 5.5).rgb, vec3(0.55));
    vec2 fora = max(max(-t, t - 1.0), 0.0) / max(uHalo, 1e-4);
    float queda = pow(1.0 - clamp(length(fora), 0.0, 1.0), 2.5);
    vec3 cor = c * queda * (1.0 - miolo) * 0.9 * uForca;
    // luz somada: não escreve opacidade, para o céu do vale continuar aparecendo por trás na chegada
    gl_FragColor = vec4(cor, 0.0);
  }
`

function Capa({ textura, largura, altura, fade, chegada, aoClicar }: { textura: Texture; largura: number; altura: number; fade: Ref; chegada: Ref; aoClicar: () => void }) {
  const img = useMemo(
    () => new ShaderMaterial({ vertexShader: vertPadrao, fragmentShader: fragImagem, uniforms: { uImagem: { value: textura }, uOpacidade: { value: 0 }, uFoco: { value: 0 }, uTempo: { value: 0 } }, transparent: true, depthWrite: false, side: DoubleSide }),
    [textura],
  )
  const halo = 0.32
  const brilho = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vertPadrao,
        fragmentShader: fragBrilho,
        uniforms: { uImagem: { value: textura }, uForca: { value: 0 }, uHalo: { value: halo } },
        transparent: true,
        side: DoubleSide,
        depthWrite: false,
        blending: AdditiveBlending,
        // luz somada (cor já multiplicada): soma sem escrever opacidade, e o céu do vale continua por trás
        premultipliedAlpha: true,
      }),
    [textura],
  )
  const grupo = useRef<Group>(null)
  const sobre = useRef(false)
  const foco = useRef(0)
  useFrame((st, delta) => {
    const f = fade.current * imagens(chegada.current)
    // com o mouse em cima, a capa cresce um pouco e a matriz se desfaz
    foco.current += ((sobre.current && f > 0.5 ? 1 : 0) - foco.current) * (1 - Math.exp(-Math.min(delta, 0.05) / 0.18))
    img.uniforms.uOpacidade!.value = f
    img.uniforms.uFoco!.value = foco.current
    img.uniforms.uTempo!.value = st.clock.elapsedTime
    brilho.uniforms.uForca!.value = f * (0.55 + foco.current * 0.25)
    grupo.current?.scale.setScalar(1 + foco.current * 0.07)
  })
  // a capa visível é clicável: abre o projeto (o mesmo que clicar na legenda)
  const clicavel = () => fade.current > 0.5
  return (
    <group ref={grupo}>
      <mesh material={brilho} position-z={-0.6} renderOrder={1} raycast={() => null}>
        <planeGeometry args={[largura * (1 + halo * 2), altura * (1 + halo * 2)]} />
      </mesh>
      <mesh
        material={img}
        renderOrder={2}
        onClick={(e) => {
          if (!clicavel()) return
          e.stopPropagation()
          aoClicar()
        }}
        onPointerOver={() => {
          sobre.current = true
          if (clicavel()) document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          sobre.current = false
          document.body.style.cursor = ''
        }}
      >
        <planeGeometry args={[largura, altura]} />
      </mesh>
    </group>
  )
}

// parede de fundo: as imagens num atlas, cada uma num quadro desfocado e azulado, espalhados em profundidade
function Parede({ texturas, chegada }: { texturas: Texture[]; chegada: Ref }) {
  const { geo, mat } = useMemo(() => {
    const CL = 512
    const CA = 384
    const cols = Math.ceil(Math.sqrt(texturas.length))
    const lins = Math.ceil(texturas.length / cols)
    const canvas = document.createElement('canvas')
    canvas.width = cols * CL
    canvas.height = lins * CA
    const ctx = canvas.getContext('2d')!
    const rects: number[][] = []
    texturas.forEach((t, i) => {
      const im = t.image as CanvasImageSource & { width: number; height: number }
      const x = (i % cols) * CL
      const y = Math.floor(i / cols) * CA
      const s = Math.max(CL / im.width, CA / im.height)
      ctx.save()
      // a textura chega de cabeça para baixo (ver o carregamento em Mundo): desvira dentro da própria célula
      if (t.userData.invertida) {
        ctx.translate(0, 2 * y + CA)
        ctx.scale(1, -1)
      }
      ctx.drawImage(im, x + (CL - im.width * s) / 2, y + (CA - im.height * s) / 2, im.width * s, im.height * s)
      ctx.restore()
      rects.push([(x + 16) / canvas.width, 1 - (y + CA - 16) / canvas.height, 480 / canvas.width, 352 / canvas.height])
    })
    const atlas = new CanvasTexture(canvas)
    atlas.colorSpace = SRGBColorSpace
    atlas.minFilter = LinearMipmapLinearFilter

    // vagas: grade de 4 × 3 em 72 × 40,5, sem o miolo (onde passam as capas), de 10 até 390 de fundura
    let semente = Math.floor(11 * 9301 + 49297) % 233280 || 1
    const rnd = () => ((semente = (semente * 16807) % 2147483647) - 1) / 2147483646
    const W = 72
    const H = 40.5
    const fl = W / 4
    const fa = H / 3
    const base: { x: number; y: number }[] = []
    for (let o = 0; o < 4; o++)
      for (let e = 0; e < 3; e++) {
        const x = -W / 2 + (o + 0.5) * fl
        const y = -H / 2 + (e + 0.5) * fa
        if (!(Math.abs(x) - fl / 2 < 18 && Math.abs(y) - fa / 2 < 6.75)) base.push({ x, y })
      }
    const vagas: { x: number; y: number; z: number; w: number; h: number }[] = []
    for (let z = 10; z > 10 - 400; z -= 10)
      for (const b of base) {
        if (rnd() > 0.55) continue
        const zz = () => z - rnd() * 6
        if (rnd() < 0.45) {
          for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) if (rnd() >= 0.3) vagas.push({ x: b.x + (dx * fl) / 4, y: b.y + (dy * fa) / 4, z: zz(), w: fl / 2, h: fa / 2 })
        } else vagas.push({ x: b.x, y: b.y, z: zz(), w: fl, h: fa })
      }
    const halo = 0.35
    const inset = 0.86
    const pos: number[] = []
    const local: number[] = []
    const rect: number[] = []
    const tom: number[] = []
    const idx: number[] = []
    vagas.forEach((v, i) => {
      const r = rects[Math.floor(rnd() * rects.length)]!
      const sombra = 0.55 + rnd() * 0.45
      const w = v.w * inset
      const h = v.h * inset
      for (const [a, b] of [[0, 0], [1, 0], [1, 1], [0, 1]] as const) {
        pos.push(v.x - w / 2 - w * halo + a * (w + w * halo * 2), v.y - h / 2 - h * halo + b * (h + h * halo * 2), v.z)
        local.push(a ? 1 + halo : -halo, b ? 1 + halo : -halo)
        rect.push(...r)
        tom.push(sombra)
      }
      const k = i * 4
      idx.push(k, k + 1, k + 2, k, k + 2, k + 3)
    })
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
    g.setAttribute('aLocal', new BufferAttribute(new Float32Array(local), 2))
    g.setAttribute('aRect', new BufferAttribute(new Float32Array(rect), 4))
    g.setAttribute('aTom', new BufferAttribute(new Float32Array(tom), 1))
    g.setIndex(idx)
    const m = new ShaderMaterial({
      uniforms: { uAtlas: { value: atlas }, uTinta: { value: new Color('#92afff') }, uHalo: { value: halo }, uBrilho: { value: 0.11 }, uFade: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute vec2 aLocal; attribute vec4 aRect; attribute float aTom;
        varying vec2 vLocal; varying vec4 vRect; varying float vTom; varying float vFundo;
        void main() {
          vLocal = aLocal; vRect = aRect; vTom = aTom;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vFundo = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uAtlas; uniform vec3 uTinta; uniform float uHalo; uniform float uBrilho; uniform float uFade;
        varying vec2 vLocal; varying vec4 vRect; varying float vTom; varying float vFundo;
        void main() {
          vec2 i = clamp(vLocal, 0.0, 1.0);
          vec3 o = textureLod(uAtlas, vRect.xy + i * vRect.zw, 2.5).rgb;
          vec2 bi = smoothstep(vec2(0.0), vec2(0.12), min(i, 1.0 - i));
          float dentro = bi.x * bi.y * step(0.0, vLocal.x) * step(vLocal.x, 1.0) * step(0.0, vLocal.y) * step(vLocal.y, 1.0);
          vec3 borrado = textureLod(uAtlas, vRect.xy + clamp(vLocal, 0.15, 0.85) * vRect.zw, 5.0).rgb;
          vec2 fora = max(max(-vLocal, vLocal - 1.0), 0.0) / uHalo;
          float queda = pow(1.0 - clamp(length(fora), 0.0, 1.0), 2.5);
          vec3 cinza = vec3(dot(o, vec3(0.3, 0.55, 0.15))) * uTinta;
          vec3 cor = mix(o, cinza, 0.85) * dentro + borrado * uTinta * queda * 0.5 * (1.0 - dentro);
          float a = smoothstep(0.0, 14.0, vFundo) * (1.0 - smoothstep(72.0, 180.0, vFundo));
          gl_FragColor = vec4(cor * vTom * uBrilho * a * uFade, 0.0);
        }`,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      blending: AdditiveBlending,
      // luz somada (cor já multiplicada): soma sem escrever opacidade, e o céu do vale continua por trás
      premultipliedAlpha: true,
    })
    return { geo: g, mat: m }
  }, [texturas])
  useEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat])
  useFrame(() => (mat.uniforms.uFade!.value = imagens(chegada.current)))
  return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={0} />
}

// partículas correndo pelas linhas de uma grade, vindo do fundo
function Grade({ chegada }: { chegada: Ref }) {
  const { size } = useThree()
  const mat = useRef<ShaderMaterial>(null)
  const geo = useMemo(() => {
    const W = 72
    const H = 40.5
    const cols = 8
    const lins = 6
    const passo = 1.125
    const faixas: { x: number; y: number; cor: Color }[] = []
    const paleta = ['#ffffff', '#8fd3ff', '#5aa4ff', '#3d7dff', '#2f5fe8'].map((c) => new Color(c))
    let s = 7
    const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
    const nH = Math.round(W / passo)
    for (let e = 0; e <= lins; e++) for (let t = 0; t <= nH; t++) faixas.push({ x: -W / 2 + (t * W) / nH, y: -H / 2 + (e * H) / lins, cor: paleta[Math.floor(rnd() * paleta.length)]! })
    const nV = Math.round(H / passo)
    for (let t = 0; t <= cols; t++) for (let e = 1; e < nV; e++) faixas.push({ x: -W / 2 + (t * W) / cols, y: -H / 2 + (e * H) / nV, cor: paleta[Math.floor(rnd() * paleta.length)]! })
    const total = 150000
    const pos = new Float32Array(total * 3)
    const dado = new Float32Array(total * 2)
    const cor = new Float32Array(total * 4)
    for (let i = 0; i < total; i++) {
      const f = faixas[i % faixas.length]!
      // escrita direta nos arrays (sem alocar um array temporário por partícula); a ordem das chamadas a rnd()
      // é a mesma de antes, então o resultado é idêntico
      const p3 = i * 3
      pos[p3] = f.x
      pos[p3 + 1] = f.y
      pos[p3 + 2] = 0
      const p2 = i * 2
      dado[p2] = rnd()
      dado[p2 + 1] = (0.7 + rnd() * 0.6) / 360
      const c = rnd() < 0.15 ? BRANCO : f.cor
      const p4 = i * 4
      cor[p4] = c.r
      cor[p4 + 1] = c.g
      cor[p4 + 2] = c.b
      cor[p4 + 3] = 0.5 + rnd() * 0.5
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('aDado', new BufferAttribute(dado, 2))
    g.setAttribute('aCor', new BufferAttribute(cor, 4))
    return g
  }, [])
  useFrame((st) => {
    if (!mat.current) return
    mat.current.uniforms.uFade!.value = particulas(chegada.current)
    mat.current.uniforms.uTempo!.value = st.clock.elapsedTime
    // pontos em pixels do aparelho: a escala e os limites levam a densidade da tela (no Mac, 2x)
    mat.current.uniforms.uDpr!.value = st.gl.getPixelRatio()
    mat.current.uniforms.uEscala!.value = (size.height * st.gl.getPixelRatio()) / (2 * Math.tan(((st.camera as PerspectiveCamera).fov * Math.PI) / 360))
  })
  return (
    <points geometry={geo} frustumCulled={false} renderOrder={0}>
      <shaderMaterial
        ref={mat}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        premultipliedAlpha
        uniforms={{ uTempo: { value: 0 }, uEscala: { value: 800 }, uFade: { value: 1 }, uDpr: { value: 1 } }}
        vertexShader={/* glsl */ `
          attribute vec2 aDado; attribute vec4 aCor;
          uniform float uTempo; uniform float uEscala; uniform float uDpr; uniform float uFade;
          varying vec4 vCor;
          ${surgir}
          void main() {
            float k = fract(aDado.x + uTempo * 6.0 * aDado.y);
            vec3 p = vec3(position.xy, k * 360.0 + (50.0 - 360.0));
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            float fundo = -mv.z;
            float pontas = smoothstep(0.0, 0.15, k) * (1.0 - smoothstep(0.95, 1.0, k));
            float pisca = 0.7 + 0.3 * sin(uTempo * (1.0 + fract(aDado.x * 91.0) * 4.0) + aDado.x * 40.0);
            vCor = vec4(aCor.rgb, aCor.a * pontas * pisca * smoothstep(0.5, 4.0, fundo) * (1.0 - smoothstep(120.0, 200.0, fundo)) * surgir(fundo, uFade));
            gl_PointSize = clamp(0.07 * uEscala / max(fundo, 0.1), 1.3 * uDpr, 3.0 * uDpr);
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={/* glsl */ `
          uniform float uFade;
          varying vec4 vCor;
          void main() {
            vec2 q = gl_PointCoord * 2.0 - 1.0;
            float a = (1.0 - smoothstep(0.55, 1.0, length(q))) * vCor.a;
            gl_FragColor = vec4(vCor.rgb * a, 0.0);
          }`}
      />
    </points>
  )
}

// as partículas não acendem de uma vez: nascem atrás de uma frente de luz que vem do fundo até a câmera
// conforme a chegada avança (e voltam para o fundo na saída). Na frente, um brilho a mais.
const surgir = /* glsl */ `
  float surgir(float fundo, float f) {
    if (f <= 0.001) return 0.0;
    float frente = mix(440.0, -20.0, f);
    return smoothstep(frente - 18.0, frente + 18.0, fundo) + exp(-pow((fundo - frente) / 9.0, 2.0)) * 1.8 * (1.0 - f);
  }
`

// matriz de fundo: planos de pontos em grade espalhados em profundidade;
// em cada coluna uma cabeça de luz desce devagar e acende os pontos por onde passa (a chuva da Matrix)
function Matriz({ chegada }: { chegada: Ref }) {
  const { size } = useThree()
  const mat = useRef<ShaderMaterial>(null)
  const geo = useMemo(() => {
    const passo = 1.5
    const L = 210
    const A = 118
    const nx = Math.round(L / passo)
    const ny = Math.round(A / passo)
    const planos: number[] = []
    for (let z = -6; z > -400; z -= 34) planos.push(z)
    const n = nx * ny * planos.length
    const pos = new Float32Array(n * 3)
    const col = new Float32Array(n)
    let i = 0
    planos.forEach((z, k) => {
      const dx = (k % 2) * passo * 0.5
      for (let x = 0; x < nx; x++)
        for (let y = 0; y < ny; y++) {
          pos[i * 3] = -L / 2 + x * passo + dx
          pos[i * 3 + 1] = -A / 2 + y * passo
          pos[i * 3 + 2] = z
          col[i] = x + k * 1000
          i++
        }
    })
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('aColuna', new BufferAttribute(col, 1))
    return g
  }, [])
  useFrame((st) => {
    if (!mat.current) return
    mat.current.uniforms.uFade!.value = particulas(chegada.current)
    mat.current.uniforms.uTempo!.value = st.clock.elapsedTime
    // pontos em pixels do aparelho: a escala e os limites levam a densidade da tela (no Mac, 2x)
    mat.current.uniforms.uDpr!.value = st.gl.getPixelRatio()
    mat.current.uniforms.uEscala!.value = (size.height * st.gl.getPixelRatio()) / (2 * Math.tan(((st.camera as PerspectiveCamera).fov * Math.PI) / 360))
  })
  return (
    <points geometry={geo} frustumCulled={false} renderOrder={0}>
      <shaderMaterial
        ref={mat}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        premultipliedAlpha
        uniforms={{ uTempo: { value: 0 }, uEscala: { value: 800 }, uFade: { value: 0 }, uDpr: { value: 1 } }}
        vertexShader={/* glsl */ `
          attribute float aColuna;
          uniform float uTempo; uniform float uEscala; uniform float uFade; uniform float uDpr;
          varying float vA; varying float vChuva;
          ${surgir}
          float h1(float n) { return fract(sin(n * 78.233) * 43758.5453); }
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            float fundo = -mv.z;
            float h = h1(aColuna);
            float y = (position.y + 59.0) / 118.0;
            float cab = fract(h * 13.0 + uTempo * (0.025 + h * 0.05));
            float d = fract(cab - (1.0 - y));
            vChuva = exp(-d * 9.0) * step(0.62, h);
            float perto = smoothstep(2.0, 9.0, fundo) * (1.0 - smoothstep(150.0, 320.0, fundo));
            vA = (0.16 + vChuva * 1.1) * perto * surgir(fundo, uFade);
            gl_PointSize = clamp(0.06 * uEscala / max(fundo, 0.1), 1.2 * uDpr, 2.6 * uDpr);
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={/* glsl */ `
          varying float vA; varying float vChuva;
          void main() {
            vec2 q = gl_PointCoord * 2.0 - 1.0;
            float a = (1.0 - smoothstep(0.5, 1.0, length(q))) * vA;
            vec3 cor = mix(vec3(0.45, 0.62, 1.0), vec3(0.85, 0.95, 1.0), vChuva);
            gl_FragColor = vec4(cor * a, 0.0);
          }`}
      />
    </points>
  )
}

// poeira de estrelas: pontos parados no espaço inteiro, de tamanhos e brilhos variados, que piscam devagar
// (um céu cheio de pontinhos, como um campo de estrelas)
function Poeira({ chegada }: { chegada: Ref }) {
  const { size } = useThree()
  const mat = useRef<ShaderMaterial>(null)
  const geo = useMemo(() => {
    const n = 90000
    const pos = new Float32Array(n * 3)
    const dado = new Float32Array(n * 2)
    let s = 13
    const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (rnd() - 0.5) * 180
      pos[i * 3 + 1] = (rnd() - 0.5) * 110
      pos[i * 3 + 2] = 30 - rnd() * 420
      dado[i * 2] = rnd()
      dado[i * 2 + 1] = Math.pow(rnd(), 3)
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('aDado', new BufferAttribute(dado, 2))
    return g
  }, [])
  useFrame((st) => {
    if (!mat.current) return
    mat.current.uniforms.uFade!.value = particulas(chegada.current)
    mat.current.uniforms.uTempo!.value = st.clock.elapsedTime
    // pontos em pixels do aparelho: a escala e os limites levam a densidade da tela (no Mac, 2x)
    mat.current.uniforms.uDpr!.value = st.gl.getPixelRatio()
    mat.current.uniforms.uEscala!.value = (size.height * st.gl.getPixelRatio()) / (2 * Math.tan(((st.camera as PerspectiveCamera).fov * Math.PI) / 360))
  })
  return (
    <points geometry={geo} frustumCulled={false} renderOrder={0}>
      <shaderMaterial
        ref={mat}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        premultipliedAlpha
        uniforms={{ uTempo: { value: 0 }, uEscala: { value: 800 }, uFade: { value: 0 }, uDpr: { value: 1 } }}
        vertexShader={/* glsl */ `
          attribute vec2 aDado;
          uniform float uTempo; uniform float uEscala; uniform float uFade; uniform float uDpr;
          varying float vA; varying vec3 vCor;
          ${surgir}
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            float fundo = -mv.z;
            float pisca = 0.55 + 0.45 * sin(uTempo * (0.6 + aDado.x * 2.5) + aDado.x * 60.0);
            vA = surgir(fundo, uFade) * (0.25 + aDado.y * 0.9) * pisca * smoothstep(1.0, 6.0, fundo) * (1.0 - smoothstep(220.0, 380.0, fundo));
            vCor = mix(vec3(0.62, 0.75, 1.0), vec3(1.0), aDado.y);
            gl_PointSize = clamp((0.05 + aDado.y * 0.12) * uEscala / max(fundo, 0.1), 1.2 * uDpr, 3.5 * uDpr);
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={/* glsl */ `
          varying float vA; varying vec3 vCor;
          void main() {
            vec2 q = gl_PointCoord * 2.0 - 1.0;
            float a = (1.0 - smoothstep(0.5, 1.0, length(q))) * vA;
            gl_FragColor = vec4(vCor * a, 0.0);
          }`}
      />
    </points>
  )
}

// riscos de velocidade: traços finos que vêm do fundo em direção à câmera, abertos em volta do caminho
// (linhas que cortam a tela), mais longos quanto mais perto
function Riscos({ chegada, junta }: { chegada: Ref; junta: Ref }) {
  const obj = useMemo(() => {
    const n = 420
    const pos = new Float32Array(n * 2 * 3)
    const dado = new Float32Array(n * 2 * 3)
    let s = 29
    const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
    for (let i = 0; i < n; i++) {
      const ang = rnd() * Math.PI * 2
      const raio = 9 + Math.pow(rnd(), 0.7) * 60
      const sem = rnd()
      const vel = 0.5 + rnd()
      for (let k = 0; k < 2; k++) {
        pos.set([Math.cos(ang) * raio, Math.sin(ang) * raio * 0.62, 0], (i * 2 + k) * 3)
        dado.set([sem, vel, k], (i * 2 + k) * 3)
      }
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('aDado', new BufferAttribute(dado, 3))
    const m = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      // luz somada (cor já multiplicada): soma sem escrever opacidade, e o céu do vale continua por trás
      premultipliedAlpha: true,
      uniforms: { uTempo: { value: 0 }, uCamZ: { value: 0 }, uFade: { value: 0 }, uJunta: { value: 0 }, uCamXY: { value: new Vector3() } },
      vertexShader: /* glsl */ `
        attribute vec3 aDado;
        uniform float uTempo; uniform float uCamZ; uniform float uFade; uniform float uJunta; uniform vec3 uCamXY;
        varying float vA;
        void main() {
          // no fim dos projetos (uJunta) os riscos correm mais e se juntam num plano vertical na frente da câmera:
          // na tela, uma linha de luz só, no meio, que vira a trilha do "Até aqui"
          float j = uJunta * uJunta * (3.0 - 2.0 * uJunta);
          float k = fract(aDado.x + uTempo * 0.05 * aDado.y * (1.0 + j * 3.0));
          float z = uCamZ + 20.0 - (1.0 - k) * 320.0;
          float comp = mix(1.5, 16.0, k * k) * aDado.y * (1.0 + j * 2.0);
          vec2 xy = mix(position.xy, vec2(0.0, position.y * 1.6), j) + uCamXY.xy * j;
          vec3 p = vec3(xy, z + comp * aDado.z);
          vA = mix(0.0, 1.0, aDado.z) * smoothstep(0.0, 0.3, k) * (1.0 - smoothstep(0.85, 1.0, k)) * 0.55 * uFade * (1.0 + j * 1.5);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() { gl_FragColor = vec4(vec3(0.62, 0.78, 1.0) * vA, 0.0); }`,
    })
    const l = new LineSegments(g, m)
    l.frustumCulled = false
    l.renderOrder = 0
    return l
  }, [])
  useFrame((st) => {
    const m = obj.material as ShaderMaterial
    m.uniforms.uTempo!.value = st.clock.elapsedTime
    m.uniforms.uCamZ!.value = st.camera.position.z
    // na chegada os riscos daqui continuam os do vale (mais fortes) e assentam no ritmo normal
    const c = chegada.current
    m.uniforms.uFade!.value = particulas(c) * (1 + (1 - imagens(c)) * 1.6)
    m.uniforms.uJunta!.value = 0
    ;(m.uniforms.uCamXY!.value as Vector3).copy(st.camera.position)
  })
  useEffect(() => () => (obj.geometry.dispose(), (obj.material as ShaderMaterial).dispose()), [obj])
  return <primitive object={obj} />
}

// a trilha de luz pelo caminho da câmera: acende do fim para o começo quando a câmera olha para trás. Duas
// espessuras: a fina de perto e a larga para quando a câmera sobe e vê tudo de cima
const vertTrilha = /* glsl */ `
  varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalMatrix * normal;
    vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }`
const fragTrilha = /* glsl */ `
  uniform float uRevela; uniform float uAlfa; uniform float uTempo;
  varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main() {
    float frente = 1.0 - uRevela;
    float acesa = smoothstep(frente - 0.004, frente + 0.004, vUv.x);
    float face = pow(abs(dot(normalize(vN), normalize(vV))), 1.4);
    float ponta = exp(-pow((vUv.x - frente) * 160.0, 2.0)) * step(0.001, uRevela) * (1.0 - step(0.999, uRevela));
    float pulso = 1.0;
    vec3 cor = mix(vec3(0.35, 0.5, 1.0), vec3(0.92, 0.96, 1.0), face);
    float a = (face * acesa * pulso + ponta * 3.0) * uAlfa;
    gl_FragColor = vec4(cor * a, 0.0);
  }`

function Trilha({ caminho, junta }: { caminho: CatmullRomCurve3; junta: Ref }) {
  const fina = useMemo(() => new TubeGeometry(caminho, 900, 0.07, 8, false), [caminho])
  const larga = useMemo(() => new TubeGeometry(caminho, 900, 0.55, 8, false), [caminho])
  const mats = useMemo(
    () =>
      [0, 1].map(
        () =>
          new ShaderMaterial({
            vertexShader: vertTrilha,
            fragmentShader: fragTrilha,
            uniforms: { uRevela: { value: 0 }, uAlfa: { value: 0 }, uTempo: { value: 0 } },
            transparent: true,
            depthWrite: false,
            side: DoubleSide,
            blending: AdditiveBlending,
            premultipliedAlpha: true,
          }),
      ),
    [],
  )
  useFrame((st) => {
    const j = junta.current
    const revela = suave(prende(j / 0.4))
    const alto = suave(prende((j - 0.4) / 0.4))
    mats.forEach((m, i) => {
      m.uniforms.uRevela!.value = revela
      m.uniforms.uTempo!.value = st.clock.elapsedTime
      m.uniforms.uAlfa!.value = suave(prende(j / 0.06)) * (i === 0 ? 1 - alto * 0.7 : alto)
    })
  })
  useEffect(() => () => (fina.dispose(), larga.dispose(), mats.forEach((m) => m.dispose())), [fina, larga, mats])
  return (
    <>
      <mesh geometry={fina} material={mats[0]} frustumCulled={false} renderOrder={3} />
      <mesh geometry={larga} material={mats[1]} frustumCulled={false} renderOrder={3} />
    </>
  )
}

// céu: azul fundo com três manchas de cor que se mexem devagar
function Ceu({ chegada }: { chegada: { current: number } }) {
  const mat = useRef<ShaderMaterial>(null)
  const { camera } = useThree()
  const g = useRef<Group>(null)
  useFrame((st) => {
    if (mat.current) {
      mat.current.uniforms.uTempo!.value = st.clock.elapsedTime
      // o céu deste mundo só cobre o céu do vale no fim da subida
      mat.current.uniforms.uAlfa!.value = suave(prende((chegada.current - 0.55) / 0.45))
    }
    g.current?.position.copy(camera.position)
  })
  return (
    <group ref={g}>
      <mesh renderOrder={-1}>
        <sphereGeometry args={[500, 32, 16]} />
        <shaderMaterial
          ref={mat}
          side={BackSide}
          depthWrite={false}
          transparent
          uniforms={{ uTempo: { value: 0 }, uAlfa: { value: 0 } }}
          vertexShader={/* glsl */ `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
          fragmentShader={/* glsl */ `
            uniform float uTempo; uniform float uAlfa; varying vec3 vDir;
            float mancha(vec3 d, vec3 c, float t) { float r = 1.0 - dot(d, normalize(c)); return exp(-r * r / (t * t)); }
            void main() {
              vec3 d = normalize(vDir + vec3(sin(uTempo * 0.05 + vDir.y * 3.0), cos(uTempo * 0.04 + vDir.x * 2.0), 0.0) * 0.06);
              vec3 c = mix(vec3(0.02, 0.035, 0.14), vec3(0.05, 0.085, 0.26), smoothstep(-0.6, 0.8, d.y));
              c += vec3(0.07, 0.12, 0.55) * mancha(d, vec3(-0.6, 0.35, -1.0), 0.45) * 0.55;
              c += vec3(0.25, 0.1, 0.5) * mancha(d, vec3(0.7, -0.2, -1.0), 0.35) * 0.35;
              c += vec3(0.1, 0.3, 0.7) * mancha(d, vec3(0.1, 0.8, -0.6), 0.5) * 0.3;
              gl_FragColor = vec4(c, uAlfa);
            }`}
        />
      </mesh>
    </group>
  )
}

function Mundo({ progresso, chegada, junta, ativo, abrir }: { progresso: Ref; chegada: Ref; junta: Ref; ativo: (i: number) => void; abrir: (i: number) => void }) {
  const { camera, gl, size } = useThree()
  const ponto = useMemo(() => new Vector3(), [])
  const [texturas, setTexturas] = useState<Texture[] | null>(null)
  const { capas, caminho } = useMemo(() => lugares(projetos.length), [])
  const fades = useMemo(() => projetos.map(() => ({ current: 0 })), [])
  const entrada = useRef(projetos.map(() => 0))
  const alvo = useMemo(() => new Vector3(), [])
  const olhar = useMemo(() => new Vector3(), [])
  const cima = useMemo(() => new Vector3(0, 1, 0), [])
  const olharAtual = useRef(new Vector3(0, 0, -40))
  const ultimoAtivo = useRef(-1)

  // A linha que o "Até aqui" continua é a vista de cima do caminho, na pose final da câmera. Ela só era calculada
  // quando a câmera chegava ali de verdade (rolando devagar); quem pulava direto para a seção (barra de rolagem, âncora,
  // máquina lenta que não alcança a câmera) ficava sem a curva e via uma reta no lugar. Aqui a pose final é calculada
  // na hora de montar, e o cálculo ao vivo (abaixo) só a refina
  useEffect(() => {
    const fim = new Vector3()
    caminho.getPointAt(1, fim)
    fim.set(fim.x, fim.y + 8 + 102, fim.z + 45)
    const fovAqui = fovObras(size.width, size.height)
    const cam = new PerspectiveCamera(fovAqui, size.width / size.height, 0.1, 1000)
    cam.position.copy(fim)
    cam.up.set(0, 0, 1)
    cam.lookAt(fim.x, fim.y - 40, fim.z)
    cam.updateMatrixWorld()
    cam.updateProjectionMatrix()
    const p = new Vector3()
    const pts: { x: number; y: number }[] = []
    for (let i = 0; i <= 90; i++) {
      caminho.getPointAt(i / 90, p)
      p.project(cam)
      if (p.z < 1 && p.y > -1.6 && p.y < 1.6) pts.push({ x: ((p.x + 1) / 2) * size.width, y: ((1 - p.y) / 2) * size.height })
    }
    if (pts.length >= 2) {
      trilhaTela.pontos = pts
      trilhaTela.meia = (0.55 * size.height) / (2 * 110 * Math.tan((fovAqui * Math.PI) / 360))
      trilhaTela.versao++
    }
  }, [caminho, size.width, size.height])

  useEffect(() => {
    const loader = new TextureLoader()
    let vivo = true
    const aniso = gl.capabilities.getMaxAnisotropy()
    const ajustar = (t: Texture) => {
      t.colorSpace = SRGBColorSpace
      t.minFilter = LinearMipmapLinearFilter
      t.anisotropy = aniso
      return t
    }
    // o decode de nove JPEGs de 2048 px na thread principal custava mais de 1 s num computador fraco. O
    // createImageBitmap decodifica fora dela (e já entrega a imagem de cabeça para baixo, como o WebGL quer);
    // sem ele, cai no TextureLoader de antes
    const carregar = async (src: string): Promise<Texture> => {
      try {
        if (typeof createImageBitmap !== 'function') throw new Error('sem createImageBitmap')
        const resp = await fetch(src)
        if (!resp.ok) throw new Error(String(resp.status))
        const bmp = await createImageBitmap(await resp.blob(), { imageOrientation: 'flipY' })
        const t = new Texture(bmp)
        t.flipY = false
        t.userData.invertida = true
        t.needsUpdate = true
        return ajustar(t)
      } catch {
        return new Promise<Texture>((ok) => loader.load(src, (t) => ok(ajustar(t))))
      }
    }
    Promise.all(imagensDaParede.map(carregar)).then((ts) => vivo && setTexturas(ts))
    return () => {
      vivo = false
    }
  }, [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const fovAlvo = fovObras(size.width, size.height)
    if (Math.abs((camera as PerspectiveCamera).fov - fovAlvo) > 0.01) {
      ;(camera as PerspectiveCamera).fov = fovAlvo
      camera.updateProjectionMatrix()
    }
    resta = 1 - suave(prende((junta.current - 0.55) / 0.35))
    caminho.getPointAt(prende(progresso.current), alvo)
    // a chegada: enquanto a câmera do vale ergue os olhos, este mundo desce do alto para o quadro
    const falta = 1 - suave(prende(chegada.current))
    alvo.y -= falta * 26
    alvo.z += falta * 18
    // a saída ("Até aqui"): a câmera vira para trás e olha o caminho que percorreu, com a trilha de luz
    // acendendo por ele; depois sobe e olha de cima, e o caminho vira uma linha em pé na tela, a mesma que
    // continua como a trilha da seção seguinte. Tudo entra como alvo do mesmo amortecimento da rolagem
    // (sem salto entre o passeio e a virada)
    olhar.set(alvo.x, alvo.y + falta * 4, alvo.z - 40)
    // telas baixas (celular deitado): a câmera olha um pouco mais para baixo, e as capas sobem 8% da altura, para a legenda caber
    // embaixo delas em vez de por cima (some quando a câmera sobe para ver o caminho)
    if (size.height < 520) olhar.y -= 0.08 * 2 * 40 * Math.tan((fovAlvo * Math.PI) / 360) * (1 - suave(prende(junta.current / 0.2)))
    cima.set(0, 1, 0)
    const j = junta.current
    if (j > 0.001) {
      const e1 = suave(prende(j / 0.45))
      const e2 = suave(prende((j - 0.3) / 0.5))
      const giro = Math.PI * e1
      const desce = (Math.PI / 2) * e2
      alvo.set(alvo.x, alvo.y + e1 * 8 + e2 * 102, alvo.z + e2 * 45)
      olhar.set(Math.sin(giro) * Math.cos(desce) * 40, -Math.sin(desce) * 40, -Math.cos(giro) * Math.cos(desce) * 40).add(alvo)
      cima.set(0, Math.cos(desce), Math.sin(desce))
    }
    // amortecido (damping 0,2)
    const k = 1 - Math.exp(-dt / 0.2)
    camera.position.lerp(alvo, k)
    olharAtual.current.lerp(olhar, k)
    camera.up.lerp(cima, k).normalize()
    camera.lookAt(olharAtual.current)
    // vista de cima: conta para o "Até aqui" onde a linha está na tela, para ele continuar dali
    if (j > 0.82) {
      camera.updateMatrixWorld()
      const pts: { x: number; y: number }[] = []
      for (let i = 0; i <= 90; i++) {
        caminho.getPointAt(i / 90, ponto)
        ponto.project(camera)
        if (ponto.z < 1 && ponto.y > -1.6 && ponto.y < 1.6) pts.push({ x: ((ponto.x + 1) / 2) * size.width, y: ((1 - ponto.y) / 2) * size.height })
      }
      trilhaTela.pontos = pts
      // o tubo largo (raio 0,55) visto de cima, a ~110 de altura: metade da largura dele na tela, em px
      trilhaTela.meia = (0.55 * size.height) / (2 * 110 * Math.tan(((camera as PerspectiveCamera).fov * Math.PI) / 360))
      trilhaTela.versao++
    }
    // quais capas aparecem: as duas à frente (entram em 2 s, saem em 1 s) e somem ao serem atravessadas
    const z = camera.position.z
    let i0 = capas.findIndex((c) => z > c.z + 10)
    if (i0 < 0) i0 = capas.length
    capas.forEach((c, i) => {
      const quer = i >= i0 && i < i0 + 2 ? 1 : 0
      const e = entrada.current[i]!
      entrada.current[i] = quer ? Math.min(e + dt / 2, 1) : Math.max(e - dt / 1, 0)
      const perto = prende((z - c.z - 3) / 9)
      fades[i]!.current = Math.max(suave(entrada.current[i]!) * suave(perto), suave(prende(junta.current / 0.35)) * 0.95)
    })
    // a capa "da vez" é a mais visível, mas só enquanto a câmera está parada na frente dela: quando avança e a
    // capa cresce até encher a tela, o painel sai (nada de texto por cima da imagem)
    // durante a travessia de uma capa (ela enche a tela) não há painel
    if (junta.current > 0.05) {
      if (ultimoAtivo.current !== -1) {
        ultimoAtivo.current = -1
        ativo(-1)
      }
      return
    }
    const atravessa = capas.some((c, i) => z - c.z <= 12 && fades[i]!.current > 0.15)
    const melhor = atravessa ? -1 : capas.findIndex((c, i) => z - c.z > 12 && fades[i]!.current > 0.35)
    if (melhor !== ultimoAtivo.current) {
      ultimoAtivo.current = melhor
      ativo(melhor)
    }
  })

  return (
    <>
      <Ceu chegada={chegada} />
      <Matriz chegada={chegada} />
      <Poeira chegada={chegada} />
      <Grade chegada={chegada} />
      <Riscos chegada={chegada} junta={junta} />
      <Trilha caminho={caminho} junta={junta} />
      {texturas && <Parede texturas={texturas} chegada={chegada} />}
      {texturas &&
        projetos.map((p, i) => (
          <group key={p.id} position={capas[i]!}>
            <Capa textura={texturas[i]!} largura={CEL_L} altura={CEL_A} fade={fades[i]!} chegada={chegada} aoClicar={() => abrir(i)} />
          </group>
        ))}
      {/* só depois das imagens: a parede e as capas só existem quando as texturas chegam, e os shaders delas precisam
          compilar antes de o visitante chegar (antes, compilavam no primeiro quadro visível: travada de ~1 s) */}
      {texturas && <Precompilar nome="obras" />}
    </>
  )
}

export default function Obras({ progresso, entrada, junta, ativo, abrir }: { progresso: Ref; entrada: Ref; junta: Ref; ativo: (i: number) => void; abrir: (i: number) => void }) {
  const raiz = useRef<HTMLDivElement>(null)
  const rec = useRecuperacao()
  const [visivel, setVisivel] = useState(false)
  useEffect(() => {
    const el = raiz.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisivel(!!e?.isIntersecting), { rootMargin: '20% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={raiz} style={{ position: 'absolute', inset: 0 }}>
      <Canvas key={rec.chave} frameloop={visivel ? 'always' : 'never'} dpr={[1, 2]} camera={{ fov: 50, near: 0.1, far: 1000, position: [-18, -6.75, 8] }} gl={{ antialias: true, alpha: true }} onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}>
        {rec.filho}
        <Mundo progresso={progresso} chegada={entrada} junta={junta} ativo={ativo} abrir={abrir} />
      </Canvas>
    </div>
  )
}
