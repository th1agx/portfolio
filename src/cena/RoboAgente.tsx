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

// O robô agente, desenhado aqui em vez de usar um modelo pronto: flutua (sem pernas). Casco de cerâmica branca acetinada
// com frestas de painel embutidas, viseira de vidro que acompanha a curva da cabeça com os olhos de LED por baixo,
// orelhas com anel de luz, antena, placa no peito com o núcleo aceso, braços articulados e um propulsor de plasma
// (shader) com bocal metálico, faíscas e luz azul sobre o corpo. Altura total: 2 unidades (de -1 a 1).
// A ação vem por referência (sem re-render): parado, acenar, sim, joinha, dancar, voar, olhar.

export type AcaoRobo = 'parado' | 'acenar' | 'sim' | 'joinha' | 'dancar' | 'voar' | 'nao' | 'pulo' | 'giro' | 'surpreso' | 'carregar' | 'chamar'

const AZUL = '#0000f0' // azul vivo da logo
const AZUL_VIVO = '#2a4dff'
const AZUL_CLARO = '#b9c6ff'

// semieixos da cabeça e do corpo (esferas achatadas): tudo o que "cola" na superfície usa estas medidas
const CABECA = { x: 0.61, y: 0.46, z: 0.49 }
const CORPO = { x: 0.496, y: 0.44, z: 0.44 }

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

// ---------- texturas procedurais (sem arquivos): brilho radial e frestas dos painéis ----------
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

/** casco com frestas: a mesma imagem serve de cor e de relevo (a fresta é escura, então afunda). u: volta da esfera, v: de cima a baixo */
function texturaCasco(verticais: number[], horizontais: number[]) {
  const W = 1024
  const H = 512
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = '#f2f4f8'
  g.fillRect(0, 0, W, H)
  const linha = (x0: number, y0: number, x1: number, y1: number) => {
    // sombra suave em volta (oclusão), depois a fresta fina e uma borda clara do outro lado
    g.strokeStyle = 'rgba(70,78,100,0.16)'
    g.lineWidth = 11
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke()
    g.strokeStyle = 'rgba(40,46,64,0.9)'
    g.lineWidth = 2.6
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke()
    g.strokeStyle = 'rgba(255,255,255,0.9)'
    g.lineWidth = 1.2
    g.beginPath(); g.moveTo(x0 + 2.6, y0 + 2.6); g.lineTo(x1 + 2.6, y1 + 2.6); g.stroke()
  }
  for (const u of verticais) {
    const x = u * W
    linha(x, 0, x, H)
    if (u === 0) linha(W, 0, W, H) // a emenda da textura
  }
  for (const v of horizontais) linha(0, v * H, W, v * H)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
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
  // a ponta balança de lado, mais forte quanto mais longe do bocal
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
uniform float uNucleo; // 0: halo largo e macio; 1: miolo estreito e quente
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
  float H = vUv.y; // 0 no bocal, 1 na ponta
  float ang = vUv.x * 6.2831853;
  // ruído sem emenda em volta do eixo, correndo para baixo
  vec3 q = vec3(cos(ang) * 1.3, sin(ang) * 1.3, H * 3.4 - uT * (5.5 + uForca * 2.5));
  float r = n3(q) * 0.55 + n3(q * 2.1 + 7.0) * 0.3 + n3(q * 4.3 + 3.0) * 0.15;
  // o centro (de frente para a câmera) é mais denso que a borda
  float ndv = abs(dot(normalize(vN), normalize(vV)));
  float dens = pow(ndv, mix(1.1, 2.4, uNucleo));
  // a língua: o ruído empurra onde a chama acaba; o miolo é mais curto
  float corte = H + (r - 0.5) * 0.75 + uNucleo * 0.22;
  float a = dens * (1.0 - smoothstep(0.5, 1.0, corte)) * smoothstep(0.0, 0.05, H);
  a *= 0.72 + 0.28 * r;
  float quente = clamp(dens * 1.2 - corte * 0.85 + 0.2 + uNucleo * 0.25, 0.0, 1.0);
  vec3 c = mix(uA, uB, smoothstep(0.0, 0.5, quente));
  c = mix(c, uC, smoothstep(0.5, 1.0, quente));
  gl_FragColor = vec4(c * (1.3 + uForca * 0.5), a * mix(0.55, 1.0, uNucleo));
}`

const N_FAISCAS = 14

export function RoboAgente({ acao, olhar, brilho = 1 }: { acao: { current: AcaoRobo }; olhar?: { current: { x: number; y: number } }; brilho?: number }) {
  const T = useMemo(() => {
    // as texturas e geometrias só existem no navegador (esta cena só é carregada lá)
    const brilhoTex = texturaBrilho()
    const mapaCabeca = texturaCasco([0, 0.5], [0.17, 0.83])
    const mapaCorpo = texturaCasco([0, 0.5], [0.24, 0.78])
    const comRelevo = { bumpScale: 1.6, envMapIntensity: 1.1 }
    return {
      brilhoTex,
      casco: new MeshPhysicalMaterial({ color: '#ffffff', map: mapaCabeca, bumpMap: mapaCabeca, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1, ...comRelevo }),
      cascoCorpo: new MeshPhysicalMaterial({ color: '#ffffff', map: mapaCorpo, bumpMap: mapaCorpo, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1, ...comRelevo }),
      membro: new MeshPhysicalMaterial({ color: '#f2f4f8', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.1 }),
      vidro: new MeshPhysicalMaterial({ color: '#04050b', roughness: 0.03, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.8 }),
      grafite: new MeshStandardMaterial({ color: '#2b2e38', metalness: 0.85, roughness: 0.32, envMapIntensity: 1.2 }),
      grafiteEscuro: new MeshStandardMaterial({ color: '#15171d', metalness: 0.7, roughness: 0.45 }),
      led: new MeshBasicMaterial({ color: new Color(AZUL_VIVO).multiplyScalar(1.7 * brilho), toneMapped: false }),
      ledMiolo: new MeshBasicMaterial({ color: new Color(AZUL_CLARO).multiplyScalar(1.15 * brilho), toneMapped: false }),
      ledAnel: new MeshBasicMaterial({ color: new Color(AZUL_VIVO).multiplyScalar(1.5 * brilho), toneMapped: false }),
      aura: new SpriteMaterial({ map: brilhoTex, color: AZUL_VIVO, blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 * Math.min(1.4, brilho), toneMapped: false }),
      auraForte: new SpriteMaterial({ map: brilhoTex, color: AZUL_CLARO, blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5 * Math.min(1.4, brilho), toneMapped: false }),
      faisca: new MeshBasicMaterial({ color: new Color(AZUL_CLARO).multiplyScalar(1.4), toneMapped: false, transparent: true, blending: AdditiveBlending, depthWrite: false }),
      // geometrias: cascas de vidro que acompanham a curva da cabeça e do peito, e o bocal do propulsor
      geoViseira: new SphereGeometry(1, 64, 32, Math.PI / 2 - 0.98, 1.96, Math.PI / 2 - 0.62, 1.1),
      geoPeito: new SphereGeometry(1, 48, 24, Math.PI / 2 - 0.5, 1.0, Math.PI / 2 - 0.5, 0.82),
      geoBocal: new LatheGeometry(
        [new Vector2(0.0, 0.035), new Vector2(0.085, 0.035), new Vector2(0.105, 0.0), new Vector2(0.125, -0.045), new Vector2(0.15, -0.1), new Vector2(0.135, -0.108), new Vector2(0.11, -0.075), new Vector2(0.0, -0.05)],
        40,
      ),
      // a língua de fogo: do bocal (raio 0,095) afinando em gota até a ponta, 0,36 de comprimento
      geoChama: new LatheGeometry(
        Array.from({ length: 28 }, (_, k) => {
          const t = k / 27
          return new Vector2(0.095 * Math.pow(1 - t, 0.85) * (1 + 0.38 * Math.sin(t * Math.PI)), -t * 0.36)
        }),
        24,
      ),
      chamaFora: new ShaderMaterial({
        uniforms: { uT: { value: 0 }, uForca: { value: 1 }, uNucleo: { value: 0 }, uA: { value: new Color(AZUL) }, uB: { value: new Color(AZUL_VIVO) }, uC: { value: new Color('#9db4ff') } },
        vertexShader: vertChama,
        fragmentShader: fragChama,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        toneMapped: false,
      }),
      chamaMiolo: new ShaderMaterial({
        uniforms: { uT: { value: 0 }, uForca: { value: 1 }, uNucleo: { value: 1 }, uA: { value: new Color(AZUL_VIVO) }, uB: { value: new Color('#8aa6ff') }, uC: { value: new Color('#f2f6ff') } },
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
  const olhoE = useRef<Group>(null)
  const olhoD = useRef<Group>(null)
  const chama = useRef<Group>(null)
  const faiscas = useRef<InstancedMesh>(null)
  const luzChama = useRef<PointLight>(null)
  const bulbo = useRef<Group>(null)
  const proxPiscada = useRef(1.5)
  // cada faísca tem a sua fase, velocidade e desvio
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
    // a bolinha da antena pulsa devagar
    if (bulbo.current) bulbo.current.scale.setScalar(1 + Math.sin(t * 3.1) * 0.08)

    // propulsor: a força cresce no voo e no pulo; a chama respira, a luz azul sobre o corpo acompanha
    const forca = a === 'voar' ? 1.8 : a === 'pulo' || a === 'chamar' ? 1.35 : 1
    const respira = 0.92 + Math.sin(t * 31) * 0.05 + Math.sin(t * 17 + 2) * 0.04
    if (chama.current) chama.current.scale.set(1.35, 1.7 * forca * respira, 1.35)
    for (const mat of [T.chamaFora, T.chamaMiolo]) {
      mat.uniforms.uT!.value = t
      mat.uniforms.uForca!.value += (forca - 1 - mat.uniforms.uForca!.value + 1) * 0.2
    }
    if (luzChama.current) luzChama.current.intensity = (1.6 + 1.2 * (forca - 1)) * respira * brilho
    if (faiscas.current) {
      for (let i = 0; i < N_FAISCAS; i++) {
        const f = sementes[i]!
        const vida = (f.fase + t * f.vel * 0.55 * forca) % 1
        // saem do bocal e caem abrindo um pouco, encolhendo até sumir
        aux.position.set(f.x * 0.075 * (0.4 + vida), -0.02 - vida * (0.5 + 0.25 * forca), f.z * 0.06 * (0.4 + vida))
        aux.scale.setScalar(Math.max(0.0001, (1 - vida) * f.tam))
        aux.updateMatrix()
        faiscas.current.setMatrixAt(i, aux.matrix)
      }
      faiscas.current.instanceMatrix.needsUpdate = true
    }
  })

  // olhos de LED: um retângulo de pontas redondas sobre o vidro, com o miolo claro e o brilho em volta
  const olho = (az: number, ref: typeof olhoE) => {
    const p = sobre(CABECA, az, 0.02, 0.024)
    return (
      <group ref={ref} position={p} rotation={[-0.02, az * 0.9, 0]}>
        <mesh material={T.led} scale={[1, 1, 0.25]}>
          <capsuleGeometry args={[0.062, 0.12, 8, 18]} />
        </mesh>
        <mesh material={T.ledMiolo} position={[0, 0.012, 0.014]} scale={[1, 1, 0.2]}>
          <capsuleGeometry args={[0.026, 0.1, 6, 12]} />
        </mesh>
        <sprite material={T.aura} position={[0, 0, 0.03]} scale={[0.5, 0.5, 1]} />
      </group>
    )
  }

  // braço articulado: ombro de grafite, braço, cotovelo, antebraço e a mão
  const braco = (lado: 1 | -1, ref: typeof bracoE) => (
    <group ref={ref} position={[lado * 0.62, -0.25, 0]}>
      <mesh material={T.grafite}>
        <sphereGeometry args={[0.1, 24, 18]} />
      </mesh>
      <mesh material={T.membro} position={[0, -0.16, 0]}>
        <capsuleGeometry args={[0.085, 0.14, 8, 16]} />
      </mesh>
      <mesh material={T.grafite} position={[0, -0.3, 0]}>
        <sphereGeometry args={[0.075, 20, 14]} />
      </mesh>
      <group position={[0, -0.3, 0]} rotation={[0, 0, lado * 0.12]}>
        <mesh material={T.membro} position={[0, -0.13, 0]}>
          <capsuleGeometry args={[0.092, 0.1, 8, 16]} />
        </mesh>
        <mesh material={T.grafiteEscuro} position={[0, -0.215, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.085, 0.014, 10, 28]} />
        </mesh>
        {/* a mão: luva arredondada com o polegar */}
        <mesh material={T.membro} position={[0, -0.285, 0]} scale={[1, 1.05, 0.9]}>
          <sphereGeometry args={[0.1, 28, 20]} />
        </mesh>
        <mesh material={T.membro} position={[lado * 0.085, -0.255, 0.02]} rotation={[0, 0, lado * -0.6]}>
          <capsuleGeometry args={[0.032, 0.05, 6, 10]} />
        </mesh>
      </group>
    </group>
  )

  const peito = sobre(CORPO, 0, 0.14, 0.012)
  return (
    <group ref={raiz}>
      {/* cabeça: esfera achatada, viseira de vidro que a acompanha, orelhas com anel de luz, antena */}
      <group ref={cabeca} position={[0, 0.42, 0]}>
        <mesh material={T.casco} scale={[CABECA.x, CABECA.y, CABECA.z]}>
          <sphereGeometry args={[1, 72, 48]} />
        </mesh>
        <mesh geometry={T.geoViseira} material={T.vidro} scale={[CABECA.x * 1.014, CABECA.y * 1.014, CABECA.z * 1.014]} />
        {olho(-0.37, olhoE)}
        {olho(0.37, olhoD)}
        {[-1, 1].map((lado) => (
          <group key={lado} position={[lado * (CABECA.x - 0.005), -0.03, -0.02]} rotation={[0, 0, (-lado * Math.PI) / 2]}>
            <mesh material={T.grafite}>
              <cylinderGeometry args={[0.15, 0.15, 0.1, 40]} />
            </mesh>
            <mesh material={T.ledAnel} position={[0, 0.052, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.1, 0.0125, 10, 40]} />
            </mesh>
            <mesh material={T.grafiteEscuro} position={[0, 0.052, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.088, 32]} />
            </mesh>
          </group>
        ))}
        {/* antena: base, haste e a bolinha acesa com brilho */}
        <mesh material={T.grafite} position={[0, CABECA.y - 0.005, 0]}>
          <cylinderGeometry args={[0.06, 0.085, 0.07, 32]} />
        </mesh>
        <mesh material={T.grafiteEscuro} position={[0, CABECA.y + 0.1, 0]}>
          <cylinderGeometry args={[0.014, 0.02, 0.16, 12]} />
        </mesh>
        <group ref={bulbo} position={[0, CABECA.y + 0.2, 0]}>
          <mesh material={T.led}>
            <sphereGeometry args={[0.058, 24, 18]} />
          </mesh>
          <mesh material={T.ledMiolo} position={[0.012, 0.014, 0.025]}>
            <sphereGeometry args={[0.02, 12, 10]} />
          </mesh>
          <sprite material={T.aura} scale={[0.42, 0.42, 1]} />
        </group>
      </group>
      {/* colar do pescoço, na junção da cabeça com o corpo */}
      <mesh material={T.grafite} position={[0, -0.005, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.86, 1]}>
        <torusGeometry args={[0.2, 0.034, 14, 48]} />
      </mesh>
      {/* corpo em ovo: casco com frestas, placa de vidro no peito com o núcleo, cinta, bocal e propulsor */}
      <group ref={corpo} position={[0, -0.42, 0]}>
        <mesh material={T.cascoCorpo} scale={[CORPO.x, CORPO.y, CORPO.z]}>
          <sphereGeometry args={[1, 72, 48]} />
        </mesh>
        <group position={peito} rotation={[-0.14, 0, 0]}>
          <mesh material={T.vidro} position={[0, 0, -0.016]} scale={[1, 1, 0.12]}>
            <sphereGeometry args={[0.17, 40, 20]} />
          </mesh>
          <mesh material={T.grafite} rotation={[0, 0, 0]} position={[0, 0, 0.0]}>
            <torusGeometry args={[0.17, 0.011, 10, 56]} />
          </mesh>
          <mesh material={T.ledAnel}>
            <torusGeometry args={[0.1, 0.0125, 10, 48]} />
          </mesh>
          <mesh material={T.ledAnel} position={[0, 0, 0.002]} scale={[1, 1, 0.4]}>
            <sphereGeometry args={[0.044, 20, 14]} />
          </mesh>
          <mesh material={T.ledMiolo} position={[0, 0, 0.012]} scale={[1, 1, 0.4]}>
            <sphereGeometry args={[0.02, 14, 10]} />
          </mesh>
          <sprite material={T.aura} position={[0, 0, 0.03]} scale={[0.46, 0.46, 1]} />
        </group>
        <mesh material={T.grafiteEscuro} position={[0, 0.07, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.07, 0.985, 1]}>
          <torusGeometry args={[0.455, 0.018, 12, 64]} />
        </mesh>
        <mesh geometry={T.geoBocal} material={T.grafite} position={[0, -CORPO.y + 0.02, 0]} />
        <sprite material={T.auraForte} position={[0, -CORPO.y - 0.1, 0.03]} scale={[0.5, 0.5, 1]} />
        {/* o plasma: halo largo e miolo quente, as faíscas, e a luz azul que cai sobre o corpo */}
        <group ref={chama} position={[0, -CORPO.y - 0.1, 0]}>
          <mesh geometry={T.geoChama} material={T.chamaFora} scale={[1.45, 1.05, 1.45]} />
          <mesh geometry={T.geoChama} material={T.chamaMiolo} scale={[0.85, 0.82, 0.85]} />
        </group>
        <instancedMesh ref={faiscas} args={[undefined, undefined, N_FAISCAS]} material={T.faisca} position={[0, -CORPO.y - 0.12, 0]} frustumCulled={false}>
          <icosahedronGeometry args={[0.024, 0]} />
        </instancedMesh>
        <pointLight ref={luzChama} position={[0, -CORPO.y - 0.2, 0.15]} color={AZUL_VIVO} intensity={1.6} distance={1.4} decay={2} />
      </group>
      {/* braços articulados, girando pelo ombro */}
      {braco(-1, bracoE)}
      {braco(1, bracoD)}
    </group>
  )
}
