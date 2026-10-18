import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { covers, type Cover } from '../../models/content/covers'
import { coverState, useSite } from '../../global/store'
import { device } from '../../global/device'
import { useLoader } from '../../global/loader'
import type { Container } from '../../app/container'

// Uma tela cheia desenhada por shader. A capa atual (A) preenche a tela; dentro do portal dela já aparece
// a próxima (B), exatamente como vai ficar quando a câmera terminar de atravessar. O zoom é contínuo.
// O shader trabalha direto em sRGB (sem conversão de cor), como uma impressão.
// Por cima, cada imagem é reimpressa nas tintas da capa: retícula, grão, tinta fora de registro.

const vertex = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`

const fragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uA, uB, uDA, uDB;
uniform float uHasDA, uHasDB, uAspA, uAspB, uScreen, uZoom, uTime, uInk, uParallax;
uniform vec4 uPortal;             // x, y, w, h na imagem A (origem em cima à esquerda)
uniform vec2 uPointer, uRes;
uniform vec3 uPalA[5];
uniform vec3 uPalB[5];

// recorte "cover": qual pedaço da imagem a tela mostra
vec2 coverSize(float asp){ return uScreen > asp ? vec2(1.0, asp / uScreen) : vec2(uScreen / asp, 1.0); }

float bayer(vec2 p){
  vec2 q = mod(floor(p), 4.0);
  float i = q.x + q.y * 4.0;
  float m[16]; m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
  for (int k = 0; k < 16; k++) if (float(k) == i) return m[k] / 16.0;
  return 0.0;
}
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

// reimprime a cor nas 5 tintas da capa, com retícula ordenada
vec3 inkify(vec3 c, vec3 pal[5], vec2 px){
  vec3 j = c + (bayer(px / 2.0) - 0.5) * 0.16;
  float best = 1e9; vec3 outc = pal[0];
  for (int k = 0; k < 5; k++){ vec3 d = j - pal[k]; float e = dot(d * vec3(0.3, 0.59, 0.11), d); if (e < best){ best = e; outc = pal[k]; } }
  return mix(c, outc, uInk);
}

vec3 sampleImg(sampler2D img, sampler2D dep, float hasDep, vec2 uv0, vec2 drift){
  // a matemática usa y para baixo (como a imagem); a textura do three tem y para cima
  vec2 uv = vec2(uv0.x, 1.0 - uv0.y);
  float d = hasDep > 0.5 ? texture2D(dep, uv).r : 0.5;
  vec2 o = (d - 0.5) * vec2(drift.x, -drift.y) * uParallax;
  // segunda passada de tinta levemente deslocada: o desregistro da risograph
  vec3 c = texture2D(img, clamp(uv + o, 0.0, 1.0)).rgb;
  float r2 = texture2D(img, clamp(uv + o + vec2(0.0018, -0.0012), 0.0, 1.0)).r;
  c.r = mix(c.r, r2, 0.6);
  return c;
}

void main(){
  vec2 sv = vec2(vUv.x, 1.0 - vUv.y);               // tela, com y para baixo como a imagem
  vec2 vs0 = coverSize(uAspA);                         // janela visível no começo
  // janela final: o maior retângulo com a proporção da tela que cabe dentro do portal
  float vh1 = min(uPortal.w, uPortal.z * uAspA / uScreen);
  vec2 vs1 = vec2(vh1 * uScreen / uAspA, vh1);
  vec2 pc = uPortal.xy + uPortal.zw * 0.5;
  float z = uZoom;
  float ez = z * z * (3.0 - 2.0 * z);
  vec2 center = mix(vec2(0.5), pc, ez);
  vec2 size = vs0 * pow(vs1 / vs0, vec2(z));         // zoom geométrico: velocidade constante na tela
  vec2 iuv = center + (sv - 0.5) * size;

  vec2 drift = uPointer * 0.02 + vec2(sin(uTime * 0.21), cos(uTime * 0.17)) * 0.004;
  vec2 px = vUv * uRes;
  vec3 col;
  bool inPortal = iuv.x > uPortal.x && iuv.x < uPortal.x + uPortal.z && iuv.y > uPortal.y && iuv.y < uPortal.y + uPortal.w;
  if (inPortal) {
    // como a tela vai ver B quando a viagem terminar
    vec2 bs = (iuv - pc) / vs1 + 0.5;
    vec2 buv = 0.5 + (bs - 0.5) * coverSize(uAspB);
    // fora do pedaço da imagem B que cabe no portal: espelha em vez de esticar, e escurece como o fundo de um vão
    vec2 over = max(vec2(0.0), max(-buv, buv - 1.0));
    vec2 m = 1.0 - abs(1.0 - mod(buv + 2.0, 2.0));
    col = inkify(sampleImg(uB, uDB, uHasDB, m, drift * 0.6), uPalB, px);
    col *= 1.0 - smoothstep(0.0, 0.12, max(over.x, over.y)) * 0.55;
  } else {
    col = inkify(sampleImg(uA, uDA, uHasDA, iuv, drift), uPalA, px);
  }
  // grão de papel
  float g = hash(px + floor(uTime * 12.0)) - 0.5;
  col += g * 0.07;
  gl_FragColor = vec4(col, 1.0);
}
`

const loader = new THREE.TextureLoader()

/** Capa que ainda não foi gerada: papel com o aviso, para o site funcionar enquanto as imagens não chegam. */
function placeholder(c: Cover) {
  const cv = document.createElement('canvas'); cv.width = 1600; cv.height = 1200
  const g = cv.getContext('2d')!
  g.fillStyle = c.inks[0]; g.fillRect(0, 0, 1600, 1200)
  const { x, y, w, h } = c.portal
  g.fillStyle = c.inks[1]; g.fillRect(x * 1600, y * 1200, w * 1600, h * 1200)
  g.lineWidth = 14; g.strokeStyle = c.inks[4]; g.strokeRect(x * 1600, y * 1200, w * 1600, h * 1200)
  g.fillStyle = c.inks[3]; g.font = '700 42px "Barlow Condensed", sans-serif'
  g.fillText(`capa pendente: public/capas/${c.slug}/capa.png`, 60, 1140)
  const t = new THREE.CanvasTexture(cv)
  return t
}

function loadTex(url: string) {
  return new Promise<THREE.Texture | null>((res) => loader.load(url, (t) => { t.anisotropy = 8; res(t) }, undefined, () => res(null)))
}

export function CoverChain({ container }: { container: Container }) {
  const { size, gl } = useThree()
  const textures = useRef<Array<{ img: THREE.Texture; depth: THREE.Texture | null; asp: number }>>([])
  const blank = useMemo(() => new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1), [])

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment, depthTest: false, depthWrite: false,
    uniforms: {
      uA: { value: blank }, uB: { value: blank }, uDA: { value: blank }, uDB: { value: blank },
      uHasDA: { value: 0 }, uHasDB: { value: 0 }, uAspA: { value: 4 / 3 }, uAspB: { value: 4 / 3 },
      uScreen: { value: 1 }, uZoom: { value: 0 }, uTime: { value: 0 }, uInk: { value: 0.42 }, uParallax: { value: device.reducedMotion ? 0 : 1 },
      uPortal: { value: new THREE.Vector4(0.34, 0.26, 0.32, 0.4) }, uPointer: { value: new THREE.Vector2() }, uRes: { value: new THREE.Vector2(1, 1) },
      uPalA: { value: Array.from({ length: 5 }, () => new THREE.Color()) }, uPalB: { value: Array.from({ length: 5 }, () => new THREE.Color()) },
    },
  }), [blank])

  // carrega todas as capas antes de entrar: é a etapa "Carregando as capas" do loader
  useEffect(() => {
    let alive = true
    useLoader.getState().set('covers', 0.4)
    Promise.all(covers.map(async (c, i) => {
      const [img, depth] = await Promise.all([loadTex(`/capas/${c.slug}/capa.png`), loadTex(`/capas/${c.slug}/depth.png`)])
      const tex = img ?? placeholder(c)
      const im = tex.image as { width: number; height: number }
      useLoader.getState().set('covers', 0.4 + (0.4 * (i + 1)) / covers.length)
      return { img: tex, depth, asp: im.width / im.height }
    })).then(async (list) => {
      if (!alive) return
      textures.current = list
      list.forEach((t) => gl.initTexture(t.img))
      useLoader.getState().set('compiling', 0.9)
      requestAnimationFrame(() => alive && useLoader.getState().set('ready', 1))
    })
    return () => { alive = false }
  }, [gl])

  useFrame((_, dt) => {
    const u = material.uniforms
    u.uScreen.value = size.width / size.height
    u.uRes.value.set(size.width, size.height)
    if (!device.reducedMotion) u.uTime.value += dt
    const ndc = container.pointer.ndc
    u.uPointer.value.lerp(new THREE.Vector2(ndc.x, -ndc.y), Math.min(1, dt * 3))
    const list = textures.current
    if (!list.length) return
    const s = coverState(useSite.getState().progress)
    const A = list[s.a], B = list[s.b], ca = covers[s.a], cb = covers[s.b]
    u.uA.value = A.img; u.uB.value = B.img
    u.uDA.value = A.depth ?? blank; u.uDB.value = B.depth ?? blank
    u.uHasDA.value = A.depth ? 1 : 0; u.uHasDB.value = B.depth ? 1 : 0
    u.uAspA.value = A.asp; u.uAspB.value = B.asp
    u.uPortal.value.set(ca.portal.x, ca.portal.y, ca.portal.w, ca.portal.h)
    u.uZoom.value = s.zoom
    ca.inks.forEach((h, k) => (u.uPalA.value[k] as THREE.Color).setStyle(h, THREE.NoColorSpace))
    cb.inks.forEach((h, k) => (u.uPalB.value[k] as THREE.Color).setStyle(h, THREE.NoColorSpace))
  })

  return (
    <mesh frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
