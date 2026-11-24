'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  LatheGeometry,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PointLight,
  ShaderMaterial,
  SphereGeometry,
  SpriteMaterial,
  SRGBColorSpace,
  Vector2,
} from 'three'

// O robô agente, modelado aqui (sem arquivo 3D), no desenho da referência do personagem: capacete de metal claro com frestas de
// painel e uma moldura em volta do visor preto, olhos ovais de LED com linhas de varredura, fones grossos com anel azul, pescoço articulado, peito com o núcleo aceso de um lado, ombros com anel de luz, braços em segmentos com cotovelo e mãos
// escuras de cinco dedos, e o bocal metálico com o jato de plasma (shader). Altura total: 2 unidades (de -1 a 1).
// A ação vem por referência (sem re-render): parado, acenar, sim, joinha, dancar, voar, olhar.

export type AcaoRobo = 'parado' | 'acenar' | 'sim' | 'joinha' | 'dancar' | 'voar' | 'nao' | 'pulo' | 'giro' | 'surpreso' | 'carregar' | 'chamar'

const AZUL = '#0000f0' // azul vivo da logo
const AZUL_VIVO = '#2a6bff'
const AZUL_CLARO = '#bcd6ff'

// semieixos da cabeça e do corpo (esferas achatadas): tudo o que "cola" na superfície usa estas medidas
const CABECA = { x: 0.56, y: 0.5, z: 0.5 }
const CORPO = { x: 0.43, y: 0.4, z: 0.39 }
const Y_CABECA = 0.43
const Y_CORPO = -0.4

// ponto na superfície de um elipsoide a partir de azimute (para a direita) e elevação (para cima), e o quanto sai dela
const sobre = (r: { x: number; y: number; z: number }, az: number, el: number, fora = 0): [number, number, number] => {
  const dx = Math.sin(az) * Math.cos(el)
  const dy = Math.sin(el)
  const dz = Math.cos(az) * Math.cos(el)
  const nx = dx / r.x
  const ny = dy / r.y
  const nz = dz / r.z
  const n = Math.hypot(nx, ny, nz)
  return [dx * r.x + (nx / n) * fora, dy * r.y + (ny / n) * fora, dz * r.z + (nz / n) * fora]
}

// ---------- texturas procedurais (sem arquivos) ----------
function texturaBrilho() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  r.addColorStop(0, 'rgba(255,255,255,1)')
  r.addColorStop(0.25, 'rgba(255,255,255,0.45)')
  r.addColorStop(0.6, 'rgba(255,255,255,0.1)')
  r.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = r
  g.fillRect(0, 0, 128, 128)
  return new CanvasTexture(c)
}

/** casco de metal claro com frestas de painel, grades pequenas e marcações: a mesma imagem é cor e relevo (a fresta escura afunda).
 *  u: volta da esfera (0 é atrás, 0,5 é a frente), v: de cima a baixo */
function texturaCasco(verticais: number[], horizontais: number[], detalhes: { u: number; v: number; w: number; h: number; tipo: 'grade' | 'placa' | 'triangulo' }[]) {
  const W = 1024
  const H = 512
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  // metal claro, com um leve escovado horizontal
  g.fillStyle = '#e4e7ec'
  g.fillRect(0, 0, W, H)
  for (let y = 0; y < H; y += 2) {
    g.fillStyle = `rgba(${y % 6 === 0 ? '255,255,255' : '150,158,175'},0.05)`
    g.fillRect(0, y, W, 1)
  }
  const linha = (x0: number, y0: number, x1: number, y1: number) => {
    g.strokeStyle = 'rgba(60,66,84,0.18)'
    g.lineWidth = 10
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke()
    g.strokeStyle = 'rgba(30,34,48,0.92)'
    g.lineWidth = 2.6
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke()
    g.strokeStyle = 'rgba(255,255,255,0.9)'
    g.lineWidth = 1.2
    g.beginPath(); g.moveTo(x0 + 2.6, y0 + 2.6); g.lineTo(x1 + 2.6, y1 + 2.6); g.stroke()
  }
  for (const u of verticais) {
    linha(u * W, 0, u * W, H)
    if (u === 0) linha(W, 0, W, H)
  }
  for (const v of horizontais) linha(0, v * H, W, v * H)
  for (const d of detalhes) {
    const x = d.u * W
    const y = d.v * H
    const w = d.w * W
    const h = d.h * H
    if (d.tipo === 'grade') {
      g.fillStyle = 'rgba(28,32,44,0.85)'
      for (let i = 0; i < 4; i++) g.fillRect(x, y + (i * h) / 4, w, h / 7)
    } else if (d.tipo === 'placa') {
      g.strokeStyle = 'rgba(30,34,48,0.8)'
      g.lineWidth = 2
      g.strokeRect(x, y, w, h)
      g.fillStyle = 'rgba(30,34,48,0.55)'
      for (let i = 0; i < 3; i++) g.fillRect(x + 4, y + 4 + i * (h / 3.2), w - 8, 2)
    } else {
      g.strokeStyle = 'rgba(30,34,48,0.85)'
      g.lineWidth = 2.4
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w / 2, y + h); g.closePath(); g.stroke()
    }
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  return t
}

/** olho de LED: oval azul com o miolo claro e linhas de varredura horizontais */
function texturaOlho() {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 128
  const g = c.getContext('2d')!
  const r = g.createRadialGradient(32, 64, 4, 32, 64, 58)
  r.addColorStop(0, '#e8f2ff')
  r.addColorStop(0.35, '#6fb6ff')
  r.addColorStop(0.75, '#1f63ff')
  r.addColorStop(1, '#0a2ad0')
  g.fillStyle = r
  g.fillRect(0, 0, 64, 128)
  g.fillStyle = 'rgba(0,10,60,0.35)'
  for (let y = 0; y < 128; y += 5) g.fillRect(0, y, 64, 1.6)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

/** a grade do fone: furinhos em círculos */
function texturaGrade() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#1a1d24'
  g.fillRect(0, 0, 128, 128)
  g.fillStyle = '#05060a'
  for (let rr = 8; rr < 60; rr += 9)
    for (let a = 0; a < Math.PI * 2; a += 9 / rr) g.fillRect(64 + Math.cos(a) * rr - 1.4, 64 + Math.sin(a) * rr - 1.4, 2.8, 2.8)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

// ---------- o plasma: uma língua de fogo azul, turbulenta, com o miolo quente quase branco ----------
const vertChama = /* glsl */ `
uniform float uT;
uniform float uForca;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vV;
void main() {
  vUv = uv;
  vec3 p = position;
  float w = sin(p.y * 22.0 - uT * 26.0 + p.x * 30.0) * 0.016 + sin(p.y * 11.0 - uT * 15.0 + 1.7) * 0.012;
  p.x += w * uv.y * (1.0 + uForca * 0.3);
  p.z += w * 0.7 * uv.y;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`

const fragChama = /* glsl */ `
uniform float uT;
uniform float uForca;
uniform float uNucleo;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vV;
float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float n3(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1, 0, 0)), f.x), mix(h3(i + vec3(0, 1, 0)), h3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(h3(i + vec3(0, 0, 1)), h3(i + vec3(1, 0, 1)), f.x), mix(h3(i + vec3(0, 1, 1)), h3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
void main() {
  float H = vUv.y;
  float ang = vUv.x * 6.2831853;
  vec3 q = vec3(cos(ang) * 1.3, sin(ang) * 1.3, H * 3.4 - uT * (5.5 + uForca * 2.5));
  float r = n3(q) * 0.55 + n3(q * 2.1 + 7.0) * 0.3 + n3(q * 4.3 + 3.0) * 0.15;
  float ndv = abs(dot(normalize(vN), normalize(vV)));
  float dens = pow(ndv, mix(1.1, 2.4, uNucleo));
  float corte = H + (r - 0.5) * 0.75 + uNucleo * 0.22;
  float a = dens * (1.0 - smoothstep(0.5, 1.0, corte)) * smoothstep(0.0, 0.05, H);
  a *= 0.72 + 0.28 * r;
  float quente = clamp(dens * 1.2 - corte * 0.85 + 0.2 + uNucleo * 0.25, 0.0, 1.0);
  vec3 c = mix(uA, uB, smoothstep(0.0, 0.5, quente));
  c = mix(c, uC, smoothstep(0.5, 1.0, quente));
  gl_FragColor = vec4(c * (1.3 + uForca * 0.5), a * mix(0.55, 1.0, uNucleo));
}`

const N_FAISCAS = 12

export function RoboAgente({ acao, olhar, brilho = 1 }: { acao: { current: AcaoRobo }; olhar?: { current: { x: number; y: number } }; brilho?: number }) {
  const T = useMemo(() => {
    // as texturas e geometrias só existem no navegador (esta cena só é carregada lá)
    const brilhoTex = texturaBrilho()
    const mapaCabeca = texturaCasco([0, 0.5], [0.12, 0.88], [
      { u: 0.44, v: 0.08, w: 0.04, h: 0.03, tipo: 'triangulo' },
      { u: 0.29, v: 0.3, w: 0.03, h: 0.07, tipo: 'grade' },
      { u: 0.68, v: 0.62, w: 0.035, h: 0.06, tipo: 'placa' },
    ])
    const mapaCorpo = texturaCasco([0, 0.25, 0.5, 0.75], [0.2, 0.74], [
      { u: 0.52, v: 0.6, w: 0.05, h: 0.08, tipo: 'placa' },
      { u: 0.41, v: 0.3, w: 0.05, h: 0.03, tipo: 'grade' },
      { u: 0.55, v: 0.86, w: 0.02, h: 0.03, tipo: 'triangulo' },
    ])
    const metal = { roughness: 0.34, metalness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.18, envMapIntensity: 1.25 }
    return {
      brilhoTex,
      casco: new MeshPhysicalMaterial({ color: '#ffffff', map: mapaCabeca, bumpMap: mapaCabeca, bumpScale: 1.6, ...metal }),
      cascoCorpo: new MeshPhysicalMaterial({ color: '#ffffff', map: mapaCorpo, bumpMap: mapaCorpo, bumpScale: 1.6, ...metal }),
      membro: new MeshPhysicalMaterial({ color: '#dfe2e8', ...metal }),
      moldura: new MeshPhysicalMaterial({ color: '#c9cdd5', roughness: 0.3, metalness: 0.55, clearcoat: 0.6, envMapIntensity: 1.3 }),
      vidro: new MeshPhysicalMaterial({ color: '#020309', roughness: 0.04, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.9 }),
      grafite: new MeshStandardMaterial({ color: '#2a2d35', metalness: 0.85, roughness: 0.3, envMapIntensity: 1.25 }),
      grafiteEscuro: new MeshStandardMaterial({ color: '#15171c', metalness: 0.7, roughness: 0.42 }),
      mao: new MeshStandardMaterial({ color: '#202329', metalness: 0.75, roughness: 0.36, envMapIntensity: 1.2 }),
      grade: new MeshStandardMaterial({ map: texturaGrade(), metalness: 0.6, roughness: 0.5 }),
      olho: new MeshBasicMaterial({ map: texturaOlho(), color: new Color('#ffffff').multiplyScalar(1.35 * brilho), toneMapped: false }),
      led: new MeshBasicMaterial({ color: new Color(AZUL_VIVO).multiplyScalar(1.7 * brilho), toneMapped: false }),
      ledMiolo: new MeshBasicMaterial({ color: new Color(AZUL_CLARO).multiplyScalar(1.15 * brilho), toneMapped: false }),
      ledAnel: new MeshBasicMaterial({ color: new Color(AZUL_VIVO).multiplyScalar(1.6 * brilho), toneMapped: false }),
      aura: new SpriteMaterial({ map: brilhoTex, color: AZUL_VIVO, blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5 * Math.min(1.4, brilho), toneMapped: false }),
      auraForte: new SpriteMaterial({ map: brilhoTex, color: AZUL_CLARO, blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5 * Math.min(1.4, brilho), toneMapped: false }),
      faisca: new MeshBasicMaterial({ color: new Color(AZUL_CLARO).multiplyScalar(1.4), toneMapped: false, transparent: true, blending: AdditiveBlending, depthWrite: false }),
      // a casca de vidro do visor e a moldura clara em volta dela, as duas acompanhando a curva do capacete
      geoViseira: new SphereGeometry(1, 64, 32, Math.PI / 2 - 0.9, 1.8, Math.PI / 2 - 0.52, 0.98),
      geoMoldura: new SphereGeometry(1, 64, 32, Math.PI / 2 - 1.0, 2.0, Math.PI / 2 - 0.62, 1.18),
      // o bocal do propulsor: colar, anéis e a boca que se abre
      geoBocal: new LatheGeometry(
        [new Vector2(0.0, 0.05), new Vector2(0.17, 0.05), new Vector2(0.18, 0.0), new Vector2(0.15, -0.03), new Vector2(0.15, -0.07), new Vector2(0.13, -0.09), new Vector2(0.12, -0.14), new Vector2(0.155, -0.2), new Vector2(0.14, -0.21), new Vector2(0.1, -0.17), new Vector2(0.0, -0.15)],
        48,
      ),
      // a língua de fogo: do bocal (raio 0,09) afinando em gota até a ponta
      geoChama: new LatheGeometry(
        Array.from({ length: 28 }, (_, k) => {
          const t = k / 27
          return new Vector2(0.09 * Math.pow(1 - t, 0.85) * (1 + 0.3 * Math.sin(t * Math.PI)), -t * 0.36)
        }),
        24,
      ),
      chamaFora: new ShaderMaterial({
        uniforms: { uT: { value: 0 }, uForca: { value: 1 }, uNucleo: { value: 0 }, uA: { value: new Color(AZUL) }, uB: { value: new Color(AZUL_VIVO) }, uC: { value: new Color('#9fc2ff') } },
        vertexShader: vertChama,
        fragmentShader: fragChama,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        toneMapped: false,
      }),
      chamaMiolo: new ShaderMaterial({
        uniforms: { uT: { value: 0 }, uForca: { value: 1 }, uNucleo: { value: 1 }, uA: { value: new Color(AZUL_VIVO) }, uB: { value: new Color('#8fb8ff') }, uC: { value: new Color('#f2f7ff') } },
        vertexShader: vertChama,
        fragmentShader: fragChama,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        toneMapped: false,
      }),
    }
  }, [brilho])

  const raiz = useRef<Group>(null)
  const cabeca = useRef<Group>(null)
  const corpo = useRef<Group>(null)
  const bracoE = useRef<Group>(null)
  const bracoD = useRef<Group>(null)
  const cotoveloE = useRef<Group>(null)
  const cotoveloD = useRef<Group>(null)
  const maoE = useRef<Group>(null)
  const maoD = useRef<Group>(null)
  const olhoE = useRef<Group>(null)
  const olhoD = useRef<Group>(null)
  const chama = useRef<Group>(null)
  const faiscas = useRef<InstancedMesh>(null)
  const luzChama = useRef<PointLight>(null)
  const bulbo = useRef<Group>(null)
  const proxPiscada = useRef(1.5)
  const sementes = useMemo(() => Array.from({ length: N_FAISCAS }, (_, i) => ({ fase: i / N_FAISCAS + Math.random() * 0.05, vel: 0.7 + Math.random() * 0.8, x: (Math.random() - 0.5) * 2, z: (Math.random() - 0.5) * 2, tam: 0.7 + Math.random() * 0.6 })), [])
  const aux = useMemo(() => new Object3D(), [])

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
        const atual = ((raiz.current.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI
        raiz.current.rotation.y = atual + (giroAlvo - atual) * s
      }
      const inclina = a === 'voar' ? -0.45 : a === 'dancar' ? Math.sin(t * 8) * 0.12 : a === 'chamar' ? 0.25 + Math.max(0, Math.sin(t * 3)) * 0.35 : 0
      raiz.current.rotation.x += (inclina - raiz.current.rotation.x) * s
    }
    if (cabeca.current) {
      const ox = olhar?.current.x ?? 0
      const oy = olhar?.current.y ?? 0
      const aceno = a === 'sim' ? Math.sin(t * 9) * 0.25 : 0
      const nega = a === 'nao' ? Math.sin(t * 9) * 0.35 : 0
      // a cabeça pende um pouco de lado, como na referência
      cabeca.current.rotation.y += (ox * 0.6 + nega - cabeca.current.rotation.y) * s
      cabeca.current.rotation.x += (-oy * 0.35 + aceno - cabeca.current.rotation.x) * s
      cabeca.current.rotation.z += ((a === 'parado' || a === 'chamar' ? 0.08 : 0) + Math.sin(t * 1.3) * 0.02 - cabeca.current.rotation.z) * s
    }
    if (corpo.current) corpo.current.rotation.z = Math.sin(t * 2.2 + 1) * 0.04
    // braços: o ombro gira o braço todo, o cotovelo dobra o antebraço, a mão gira no punho
    const alvoD =
      a === 'acenar' ? 2.5 + Math.sin(t * 10) * 0.35 : a === 'joinha' ? 2.2 : a === 'dancar' ? 1.4 + Math.sin(t * 8) * 0.6 : a === 'carregar' ? 1.6 : a === 'chamar' ? 0.35 : a === 'voar' ? 0.6 : a === 'surpreso' ? 0.9 : 0.15 + Math.sin(t * 2) * 0.04
    const alvoE = a === 'joinha' ? -2.2 : a === 'dancar' ? -1.4 - Math.sin(t * 8) * 0.6 : a === 'voar' || a === 'carregar' ? -0.6 : a === 'surpreso' ? -0.9 : -0.15 - Math.sin(t * 2) * 0.04
    if (bracoD.current) bracoD.current.rotation.z += (alvoD - bracoD.current.rotation.z) * s
    if (bracoE.current) bracoE.current.rotation.z += (alvoE - bracoE.current.rotation.z) * s
    // cotovelos: em repouso os antebraços ficam junto ao corpo (levemente para dentro); acenar dobra o direito e abana a mão
    const dobraD = a === 'acenar' ? 0.9 + Math.sin(t * 10) * 0.25 : a === 'joinha' ? 0.5 : a === 'carregar' ? 0.7 : a === 'surpreso' ? 0.55 : -0.22
    const dobraE = a === 'joinha' ? -0.5 : a === 'surpreso' ? -0.55 : a === 'voar' ? -0.2 : 0.22 + Math.sin(t * 2 + 1) * 0.03
    if (cotoveloD.current) cotoveloD.current.rotation.z += (dobraD - cotoveloD.current.rotation.z) * s
    if (cotoveloE.current) cotoveloE.current.rotation.z += (dobraE - cotoveloE.current.rotation.z) * s
    if (maoD.current) maoD.current.rotation.y += ((a === 'acenar' ? 0.4 + Math.sin(t * 10) * 0.5 : 0) - maoD.current.rotation.y) * s
    if (maoE.current) maoE.current.rotation.y += ((a === 'parado' || a === 'chamar' ? -0.5 : 0) - maoE.current.rotation.y) * s
    // piscar, e olhos "felizes" (achatados) no joinha e na dança
    proxPiscada.current -= dt
    let olhoY = a === 'joinha' || a === 'dancar' || a === 'carregar' ? 0.45 : a === 'surpreso' ? 1.35 : 1
    if (proxPiscada.current < 0) {
      olhoY = 0.1
      if (proxPiscada.current < -0.12) proxPiscada.current = 2 + Math.random() * 3
    }
    for (const o of [olhoE.current, olhoD.current]) if (o) o.scale.y += (olhoY - o.scale.y) * 0.5
    if (bulbo.current) bulbo.current.scale.setScalar(1 + Math.sin(t * 3.1) * 0.08)

    // propulsor: a força cresce no voo e no pulo; a chama respira, a luz azul sobre o corpo acompanha
    const forca = a === 'voar' ? 1.8 : a === 'pulo' || a === 'chamar' ? 1.35 : 1
    const respira = 0.92 + Math.sin(t * 31) * 0.05 + Math.sin(t * 17 + 2) * 0.04
    if (chama.current) chama.current.scale.set(1, 1.35 * forca * respira, 1)
    for (const mat of [T.chamaFora, T.chamaMiolo]) {
      mat.uniforms.uT!.value = t
      mat.uniforms.uForca!.value += (forca - mat.uniforms.uForca!.value) * 0.2
    }
    if (luzChama.current) luzChama.current.intensity = (1.4 + 1.1 * (forca - 1)) * respira * brilho
    if (faiscas.current) {
      for (let i = 0; i < N_FAISCAS; i++) {
        const f = sementes[i]!
        const vida = (f.fase + t * f.vel * 0.55 * forca) % 1
        aux.position.set(f.x * 0.07 * (0.4 + vida), -0.02 - vida * (0.45 + 0.25 * forca), f.z * 0.055 * (0.4 + vida))
        aux.scale.setScalar(Math.max(0.0001, (1 - vida) * f.tam))
        aux.updateMatrix()
        faiscas.current.setMatrixAt(i, aux.matrix)
      }
      faiscas.current.instanceMatrix.needsUpdate = true
    }
  })

  // olho de LED: oval vertical com linhas de varredura, sobre o vidro, e o brilho em volta
  const olho = (az: number, ref: typeof olhoE) => {
    const p = sobre(CABECA, az, 0.0, 0.03)
    return (
      <group ref={ref} position={p} rotation={[0, az * 0.92, 0]}>
        <mesh material={T.olho} scale={[0.072, 0.118, 0.012]}>
          <sphereGeometry args={[1, 24, 18]} />
        </mesh>
        <sprite material={T.aura} position={[0, 0, 0.02]} scale={[0.42, 0.5, 1]} />
      </group>
    )
  }

  // fone: um disco grosso de grafite, com aro claro, o anel azul aceso e a grade escura no meio
  const fone = (lado: 1 | -1) => (
    <group position={[lado * (CABECA.x - 0.02), 0.0, -0.02]} rotation={[0, 0, (-lado * Math.PI) / 2]}>
      <mesh material={T.grafite}>
        <cylinderGeometry args={[0.2, 0.21, 0.12, 48]} />
      </mesh>
      <mesh material={T.moldura} position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.175, 0.03, 14, 56]} />
      </mesh>
      <mesh material={T.ledAnel} position={[0, 0.072, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.128, 0.013, 10, 48]} />
      </mesh>
      <mesh material={T.grade} position={[0, 0.074, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.112, 40]} />
      </mesh>
    </group>
  )

  // a mão: palma escura e cinco dedos em dois segmentos, levemente fechados (como a da referência)
  const mao = (lado: 1 | -1, ref: typeof maoE) => (
    <group ref={ref} position={[0, -0.25, 0]} scale={1.3}>
      <mesh material={T.mao} position={[0, -0.05, 0]} scale={[0.075, 0.062, 0.035]}>
        <sphereGeometry args={[1, 20, 14]} />
      </mesh>
      {[-0.045, -0.015, 0.015, 0.045].map((x, k) => (
        <group key={k} position={[x, -0.1, 0.005]} rotation={[0.25, 0, x * -2.2]}>
          <mesh material={T.mao} position={[0, -0.028, 0]}>
            <capsuleGeometry args={[0.014, 0.036, 4, 10]} />
          </mesh>
          <group position={[0, -0.058, 0]} rotation={[0.5, 0, 0]}>
            <mesh material={T.mao} position={[0, -0.022, 0]}>
              <capsuleGeometry args={[0.012, 0.03, 4, 10]} />
            </mesh>
          </group>
        </group>
      ))}
      <group position={[lado * -0.07, -0.05, 0.02]} rotation={[0.3, 0, lado * -0.9]}>
        <mesh material={T.mao} position={[0, -0.03, 0]}>
          <capsuleGeometry args={[0.016, 0.04, 4, 10]} />
        </mesh>
      </group>
    </group>
  )

  // braço: junta do ombro com anel azul, ombreira clara, braço, cotovelo escuro, antebraço mais largo, punho e a mão
  const braco = (lado: 1 | -1, ref: typeof bracoE, cotovelo: typeof cotoveloE, refMao: typeof maoE) => (
    <group ref={ref} position={[lado * 0.5, -0.2, 0]}>
      <group scale={1.22}>
      <mesh material={T.grafite}>
        <sphereGeometry args={[0.1, 24, 18]} />
      </mesh>
      <mesh material={T.ledAnel} position={[lado * 0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.062, 0.012, 10, 36]} />
      </mesh>
      <mesh material={T.grafiteEscuro} position={[lado * 0.072, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.02, 24]} />
      </mesh>
      <mesh material={T.membro} position={[lado * 0.05, -0.02, 0]} scale={[1, 0.8, 0.95]}>
        <sphereGeometry args={[0.115, 28, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={T.membro} position={[0, -0.15, 0]}>
        <capsuleGeometry args={[0.07, 0.12, 8, 16]} />
      </mesh>
      <mesh material={T.grafiteEscuro} position={[0, -0.235, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.066, 0.014, 10, 28]} />
      </mesh>
      {/* o antebraço vem um pouco para a frente, como num braço relaxado */}
      <group ref={cotovelo} position={[0, -0.27, 0]} rotation={[-0.35, 0, 0]}>
        <mesh material={T.grafite}>
          <sphereGeometry args={[0.065, 20, 14]} />
        </mesh>
        <mesh material={T.membro} position={[0, -0.13, 0]} scale={[1.06, 1, 1]}>
          <capsuleGeometry args={[0.078, 0.12, 8, 16]} />
        </mesh>
        <mesh material={T.grafite} position={[0, -0.235, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.062, 0.018, 10, 28]} />
        </mesh>
        {mao(lado, refMao)}
      </group>
      </group>
    </group>
  )

  const nucleo = sobre(CORPO, 0.36, 0.18, 0.006)
  return (
    <group ref={raiz}>
      {/* cabeça: capacete claro, moldura em volta do visor preto, olhos, fones e antena */}
      <group ref={cabeca} position={[0, Y_CABECA, 0]}>
        <mesh material={T.casco} scale={[CABECA.x, CABECA.y, CABECA.z]}>
          <sphereGeometry args={[1, 72, 48]} />
        </mesh>
        <mesh geometry={T.geoMoldura} material={T.moldura} scale={[CABECA.x * 1.012, CABECA.y * 1.012, CABECA.z * 1.012]} />
        <mesh geometry={T.geoViseira} material={T.vidro} scale={[CABECA.x * 1.03, CABECA.y * 1.03, CABECA.z * 1.03]} />
        {olho(-0.27, olhoE)}
        {olho(0.27, olhoD)}
        {fone(-1)}
        {fone(1)}
        <mesh material={T.grafite} position={[0, CABECA.y - 0.01, 0]}>
          <cylinderGeometry args={[0.05, 0.08, 0.06, 32]} />
        </mesh>
        <mesh material={T.grafiteEscuro} position={[0, CABECA.y + 0.07, 0]}>
          <cylinderGeometry args={[0.022, 0.03, 0.1, 14]} />
        </mesh>
        <group ref={bulbo} position={[0, CABECA.y + 0.15, 0]}>
          <mesh material={T.led}>
            <sphereGeometry args={[0.05, 24, 18]} />
          </mesh>
          <mesh material={T.ledMiolo} position={[0.01, 0.012, 0.022]}>
            <sphereGeometry args={[0.018, 12, 10]} />
          </mesh>
          <sprite material={T.aura} scale={[0.4, 0.4, 1]} />
        </group>
      </group>
      {/* pescoço articulado: dois anéis de grafite entre a cabeça e o corpo */}
      <mesh material={T.grafite} position={[0, -0.02, 0]}>
        <cylinderGeometry args={[0.13, 0.15, 0.07, 32]} />
      </mesh>
      <mesh material={T.grafiteEscuro} position={[0, -0.075, 0]}>
        <cylinderGeometry args={[0.16, 0.17, 0.05, 32]} />
      </mesh>
      {/* corpo: casco com frestas, o núcleo aceso do lado do peito com o filete de luz, bocal e propulsor */}
      <group ref={corpo} position={[0, Y_CORPO, 0]}>
        <mesh material={T.cascoCorpo} scale={[CORPO.x, CORPO.y, CORPO.z]}>
          <sphereGeometry args={[1, 72, 48]} />
        </mesh>
        <group position={nucleo} rotation={[-0.18, 0.36, 0]}>
          <mesh material={T.grafite}>
            <torusGeometry args={[0.092, 0.03, 14, 48]} />
          </mesh>
          <mesh material={T.grafiteEscuro} position={[0, 0, -0.004]}>
            <circleGeometry args={[0.07, 32]} />
          </mesh>
          <mesh material={T.ledAnel} position={[0, 0, 0.006]}>
            <torusGeometry args={[0.058, 0.012, 10, 40]} />
          </mesh>
          <mesh material={T.ledMiolo} position={[0, 0, 0.008]} scale={[1, 1, 0.3]}>
            <sphereGeometry args={[0.026, 14, 10]} />
          </mesh>
          <sprite material={T.aura} position={[0, 0, 0.03]} scale={[0.36, 0.36, 1]} />
        </group>
        {/* o filete de luz que sai do núcleo para o meio do peito */}
        <mesh material={T.ledAnel} position={sobre(CORPO, 0.12, 0.2, 0.004)} rotation={[0, 0.12, 0.05]} scale={[1, 1, 0.3]}>
          <capsuleGeometry args={[0.006, 0.12, 4, 8]} />
        </mesh>
        <mesh geometry={T.geoBocal} material={T.grafite} position={[0, -CORPO.y + 0.02, 0]} />
        <mesh material={T.moldura} position={[0, -CORPO.y + 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.172, 0.022, 12, 56]} />
        </mesh>
        <mesh material={T.ledAnel} position={[0, -CORPO.y - 0.17, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.105, 0.012, 10, 48]} />
        </mesh>
        <sprite material={T.auraForte} position={[0, -CORPO.y - 0.22, 0.03]} scale={[0.45, 0.45, 1]} />
        <group ref={chama} position={[0, -CORPO.y - 0.19, 0]}>
          <mesh geometry={T.geoChama} material={T.chamaFora} scale={[1.3, 1.0, 1.3]} />
          <mesh geometry={T.geoChama} material={T.chamaMiolo} scale={[0.8, 0.8, 0.8]} />
        </group>
        <instancedMesh ref={faiscas} args={[undefined, undefined, N_FAISCAS]} material={T.faisca} position={[0, -CORPO.y - 0.2, 0]} frustumCulled={false}>
          <icosahedronGeometry args={[0.022, 0]} />
        </instancedMesh>
        <pointLight ref={luzChama} position={[0, -CORPO.y - 0.3, 0.15]} color={AZUL_VIVO} intensity={1.4} distance={1.4} decay={2} />
      </group>
      {/* braços articulados, girando pelo ombro, dobrando no cotovelo */}
      {braco(-1, bracoE, cotoveloE, maoE)}
      {braco(1, bracoD, cotoveloD, maoD)}
    </group>
  )
}
