'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { useRecuperacao } from './contexto'
import { Color, LinearFilter, ShaderMaterial, SRGBColorSpace, TextureLoader, type Mesh } from 'three'
import { Fluido } from './fluido'
import { gsap } from 'gsap'
import { arquivo } from '@/content/caminho'
import { aguardar, sinalizar } from '@/site/fila'
import { tempoGlobal } from '@/site/tempoGlobal'

// O topo: o Thiago recortado, sem fundo, sobre a página
// clara, num plano com relevo que gira de leve com o mouse. O cursor deixa uma mancha que revela, por baixo, a
// versão robô (também recortada, e maior que a cabeça). A mancha some sozinha; com o
// mouse parado, um cursor invisível passeia pelo rosto. Números tirados do código deles:
// giro 0,075 rad com o mouse amortecido, rastro com perda de 4 % por quadro a 60 quadros por segundo, pincel de
// 18 células numa grade de 10 % da tela, borda dura em 0,1, entrada de baixo para cima em 1,1 s.

const FOTO = 1086 / 1448 // largura ÷ altura das duas imagens (alinhadas)
const GIRO = 0.075
const FOLGA = 1.08

const vertice = /* glsl */ `
  uniform float uAspecto;
  uniform vec3 uFoto; // centro x no painel, altura da foto, base da foto (y) no painel
  uniform float uRelevo;
  varying vec2 vPainel;
  varying vec2 vFoto;

  // relevo inventado a partir da pose: cabeça como uma cúpula e o tronco mais baixo
  float relevo(vec2 f) {
    vec2 c = (f - vec2(0.5, 0.71)) / vec2(0.25, 0.27);
    float cabeca = sqrt(max(0.0, 1.0 - dot(c, c)));
    vec2 t = (f - vec2(0.5, 0.0)) / vec2(0.62, 0.46);
    float tronco = sqrt(max(0.0, 1.0 - dot(t, t))) * 0.55;
    vec2 p = (f - vec2(0.5, 0.47)) / vec2(0.11, 0.12);
    float pescoco = sqrt(max(0.0, 1.0 - dot(p, p))) * 0.7;
    return max(max(cabeca, tronco), pescoco);
  }

  void main() {
    // o plano é 8 % maior que a vista (folga para o giro): desconta para o enquadramento bater com a tela
    vPainel = (uv - 0.5) * ${FOLGA.toFixed(3)} + 0.5;
    vec2 q = vec2(vPainel.x * uAspecto, vPainel.y);
    vFoto = vec2((q.x - uFoto.x) / (uFoto.y * ${FOTO.toFixed(5)}) + 0.5, (q.y - uFoto.z) / uFoto.y);
    vec3 p = position;
    p.z += relevo(clamp(vFoto, 0.0, 1.0)) * uRelevo;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

const fragmento = /* glsl */ `
  uniform sampler2D tHumano;
  uniform sampler2D tRobo;
  uniform sampler2D tAura;
  uniform sampler2D tRastro;
  uniform float uRevela;
  uniform float uInteiro;
  uniform float uTempo;
  uniform vec3 uMancha;
  uniform vec3 uAzul;
  uniform vec3 uLinha;
  varying vec2 vPainel;
  varying vec2 vFoto;

  float ruido(vec2 p) {
    return sin(p.x * 13.0 + uTempo * 1.3) * sin(p.y * 11.0 - uTempo * 0.9) * 0.5
         + sin(p.x * 29.0 - p.y * 23.0 + uTempo * 2.1) * 0.25;
  }

  void main() {
    // entrada: o recorte sobe de baixo para cima com uma borda que ondula
    vec2 f = vFoto;
    f.y -= (1.0 - uRevela) * 0.12;
    float frente = uRevela * 1.25 - 0.1 + sin(vPainel.x * 3.14159) * 0.06;
    float aparece = smoothstep(frente, frente - 0.04, vPainel.y);

    // os ombros não terminam no corte da foto: o corpo se dissolve nas laterais e na borda de baixo da tela
    float dentro = step(0.0, f.x) * step(f.x, 1.0) * step(0.0, f.y) * step(f.y, 1.0);
    float dissolve = smoothstep(0.02, 0.22, f.x) * smoothstep(0.98, 0.78, f.x) * smoothstep(0.0, 0.2, vPainel.y) * smoothstep(0.0, 0.16, f.y) * dentro;
    vec4 humano = texture2D(tHumano, f) * dissolve;
    vec4 robo = texture2D(tRobo, f) * dissolve;

    // tinta do fluido: borda dura, torcida por um ruído para ficar líquida
    float d = texture2D(tRastro, vPainel + vec2(ruido(vPainel * 2.0), ruido(vPainel.yx * 2.3)) * 0.004).r;
    float mancha = step(0.16, d);

    // o robô inteiro, subindo em onda
    float onda = f.y + sin(f.x * 3.14159) * sin(uInteiro * 3.14159) * 0.2;
    float mascara = max(mancha, step(1.0 - onda, uInteiro));

    vec4 cor = mix(humano, robo, mascara);
    // costura elétrica onde a tinta acaba, só sobre o corpo: um fio azul e um brilho logo para dentro
    float fio = (1.0 - smoothstep(0.0, fwidth(d) * 1.6, abs(d - 0.16))) * cor.a * (1.0 - step(0.5, uInteiro));
    float brilho = mancha * (1.0 - smoothstep(0.16, 0.23, d)) * cor.a;
    cor.rgb += uAzul * (fio * 1.3 + brilho * 0.35);

    // em volta do corpo: curvas de nível que seguem a silhueta e se afastam devagar; o fluido as entorta
    float a = texture2D(tAura, clamp(f, 0.0, 1.0)).r * dentro * dissolve;
    float k = a * 9.0 - uTempo * 0.22 + d * 1.2;
    float dk = min(fract(k), 1.0 - fract(k));
    float linha = 1.0 - smoothstep(0.0, fwidth(k) * 1.3, dk);
    float faixa = smoothstep(0.012, 0.1, a) * (1.0 - smoothstep(0.6, 0.9, a));
    float fora = 1.0 - cor.a;
    vec3 corLinha = mix(uLinha, uAzul, clamp(d * 2.0, 0.0, 1.0));
    float aLinha = linha * faixa * fora * 0.5;
    // halo azul bem leve colado ao corpo
    float halo = smoothstep(0.3, 0.8, a) * fora * 0.035;
    // fora do corpo, a tinta aparece de leve no fundo (manchas claras em volta da cabeça)
    float aFundo = 0.55 * mancha * fora;

    vec3 rgb = cor.rgb * cor.a;
    float alfa = cor.a;
    rgb = rgb * (1.0 - halo) + uAzul * halo;               alfa = alfa + halo * (1.0 - alfa);
    rgb = rgb * (1.0 - aFundo) + uMancha * aFundo;         alfa = alfa + aFundo * (1.0 - alfa);
    rgb = rgb * (1.0 - aLinha) + corLinha * aLinha;        alfa = alfa + aLinha * (1.0 - alfa);
    gl_FragColor = vec4(rgb / max(alfa, 0.0001), alfa * aparece);
    #include <colorspace_fragment>
  }
`

function Plano({ alvo, inteiro, aoPronto, aoPrimeiroQuadro, pronto }: { alvo: { current: HTMLDivElement | null }; inteiro: { current: number }; aoPronto: () => void; aoPrimeiroQuadro: () => void; pronto: boolean }) {
  const { size, viewport, gl, scene, camera } = useThree()
  const malha = useRef<Mesh>(null)
  const [humano, robo, aura] = useLoader(TextureLoader, [arquivo('/retrato/humano.webp'), arquivo('/retrato/robo.webp'), arquivo('/retrato/aura.png')])
  for (const t of [humano!, robo!]) {
    t.colorSpace = SRGBColorSpace
    t.minFilter = LinearFilter
    t.generateMipmaps = false
  }

  // o fluido que revela o robô (grade de 10 % da tela, perda de 4 % por passo)
  const fluido = useMemo(() => new Fluido(gl, { resolucao: 0.12, perdaVelocidade: 0.96, perdaTinta: 0.965, raio: 0.0016, iteracoes: 6 }), [gl])
  useEffect(() => () => fluido.dispose(), [fluido])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vertice,
        fragmentShader: fragmento,
        uniforms: {
          tHumano: { value: humano },
          tRobo: { value: robo },
          tAura: { value: aura },
          tRastro: { value: fluido.textura },
          uAspecto: { value: 1 },
          uFoto: { value: [0.5, 1, 0] },
          uRelevo: { value: 0 },
          uRevela: { value: 0 },
          uInteiro: { value: 0 },
          uTempo: { value: 0 },
          uMancha: { value: new Color('#e4e6ec') },
          uAzul: { value: new Color('#0000f0') },
          uLinha: { value: new Color('#a5a9b4') },
        },
        transparent: true,
        depthWrite: false,
      }),
    [humano, robo, aura, fluido],
  )

  // estado do cursor (coordenadas de 0 a 1 no painel, y para cima)
  const cursor = useRef({ x: 0.5, y: 0.5, px: 0.5, py: 0.5, dentro: false, movido: 0, mexendo: true, inicio: performance.now(), ocioso: -1 })
  const giro = useRef({ x: 0, y: 0 })

  // Antes do primeiro quadro, os shaders do retrato e do fluido compilam em paralelo (compileAsync): a thread
  // principal fica livre e o retrato desenha de uma vez, em vez de o navegador travar esperando o driver.
  // Só então o canvas começa a renderizar (aoPronto) e a animação de entrada começa a contar.
  useEffect(() => {
    let vivo = true
    Promise.all([gl.compileAsync(scene, camera), fluido.compilar()])
      .catch(() => {})
      .then(() => vivo && aoPronto())
    return () => {
      vivo = false
    }
  }, [gl, scene, camera, fluido, material, aoPronto])

  const reveladoUmaVez = useRef(false)
  useEffect(() => {
    const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reveladoUmaVez.current) material.uniforms.uRevela!.value = reduzir ? 1 : 0
    // a animação de entrada começa quando o canvas já desenha E a tela de abertura começou a abrir (o retrato sobe
    // enquanto o furo cresce; src/site/Abertura.tsx). Sem abertura, o sinal já vem na hora
    if (pronto && !reveladoUmaVez.current) {
      reveladoUmaVez.current = true
      if (!reduzir) {
        if (document.documentElement.dataset.aberturaVista === '1') {
          // A tela de abertura termina mostrando o rosto inteiro no mesmo enquadramento e se dissolve por cima do retrato:
          // ele já espera aqui embaixo, revelado (sem a onda de entrada, que seria uma segunda "carga" da foto), com o
          // mesmo relevo e o mesmo relógio das curvas de nível. O passeio do cursor invisível só começa quando ela sai
          material.uniforms.uRevela!.value = 1
          aguardar('abertura', 20000).then(() => {
            const c = cursor.current
            c.inicio = performance.now()
            c.movido = 0
            c.ocioso = -1
          })
        } else {
          // sem abertura (página aberta no meio, sem WebGL 2...): a entrada de sempre
          aguardar('abertura', 20000).then(() => gsap.to(material.uniforms.uRevela!, { value: 1, duration: 1.1, ease: 'power3.out', delay: 0.25 }))
        }
      }
    }
    const mover = (e: PointerEvent) => {
      // com a abertura na tela o cursor não pinta tinta por baixo dela
      if (document.documentElement.dataset.abertura === '1') return
      const el = alvo.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const c = cursor.current
      c.x = (e.clientX - r.left) / r.width
      c.y = 1 - (e.clientY - r.top) / r.height
      c.dentro = c.x >= 0 && c.x <= 1 && c.y >= 0 && c.y <= 1
      c.movido = performance.now()
      c.mexendo = true
    }
    window.addEventListener('pointermove', mover, { passive: true })
    return () => window.removeEventListener('pointermove', mover)
  }, [alvo, material, pronto])

  // tamanho: o plano cobre a vista com folga para o giro; a foto fica no meio
  useEffect(() => {
    const aspecto = size.width / size.height
    // a cabeça (do cabelo ao queixo, 41 % da foto) ocupa 48 % da altura da tela e o cabelo começa a 11 % do
    // topo; o peito é cortado pela borda de baixo (um pouco menos que 58 %, a pedido)
    // em tela estreita, a cabeça (orelha a orelha, 46,5 % da largura da foto) não passa de 72 % da largura
    const alturaFoto = Math.min(0.48 / 0.41, (0.72 * aspecto) / (0.465 * FOTO))
    // a foto nunca termina acima da borda de baixo da tela
    const base = Math.min(0, 1 - 0.11 - alturaFoto * (1 - 95 / 1448))
    material.uniforms.uAspecto!.value = aspecto
    material.uniforms.uFoto!.value = [aspecto * 0.5, alturaFoto, base]
    material.uniforms.uRelevo!.value = viewport.height * 0.25 * 0.35
    fluido.tamanho(size.width, size.height)
    malha.current?.scale.set(viewport.width * FOLGA, viewport.height * FOLGA, 1)
  }, [size, viewport, material, fluido])

  const passo = (agora: number, dt: number) => {
    const k = cursor.current
    // parado há 3 s (3,5 s ao abrir): um cursor invisível faz o passeio UMA vez — ida em 2,5 s,
    // pausa, volta — e descansa até o mouse se mexer de novo (antes repetia em loop e cansava)
    const parado = agora - (k.movido || k.inicio) > (k.movido ? 3000 : 3500)
    let x = k.x
    let y = k.y
    let forca = 0
    if (parado || !k.dentro) {
      // o passeio começa do zero cada vez que o mouse para; no fim do ciclo, para de vez
      if (k.ocioso < 0) k.ocioso = agora
      const t = Math.min(9.5, (agora - k.ocioso) / 1000)
      const ida = Math.min(1, t / 2.5)
      const volta = t > 4 ? Math.min(1, (t - 4) / 2.5) : 0
      const px = ida - volta
      const ease = px < 0.5 ? 2 * px * px : 1 - Math.pow(-2 * px + 2, 2) / 2
      const ix = -Math.cos(ease * Math.PI * 4) * 0.75
      const iy = Math.cos(px * Math.PI) * 0.5
      // em volta do rosto: mesmo centro e largura usados no relevo
      const [centro, alturaFoto, base] = material.uniforms.uFoto!.value as number[]
      const aspecto = material.uniforms.uAspecto!.value as number
      x = (centro! + ix * 0.19 * alturaFoto!) / aspecto
      y = base! + (0.7 + iy * 0.2) * alturaFoto!
      const anda = t < 2.5 || (t > 4 && t < 6.5)
      forca = anda ? 0.55 : 0
    } else {
      // voltando do passeio automático: começa do cursor, sem ligar com a última posição do passeio
      if (k.ocioso >= 0) {
        k.px = k.x
        k.py = k.y
      }
      k.ocioso = -1
      const v = Math.hypot(k.x - k.px, k.y - k.py)
      // qualquer movimento revela com força; parado, só o que já foi pintado
      forca = v > 0.0004 ? Math.min(1, 0.6 + v * 40) : 0
    }
    // o cursor empurra e pinta o fluido ao longo do trecho percorrido (em passos curtos, sem buracos)
    if (forca > 0.01) {
      const dx = x - k.px
      const dy = y - k.py
      const n = Math.min(8, Math.max(1, Math.ceil(Math.hypot(dx * size.width, dy * size.height) / 24)))
      for (let i = 1; i <= n; i++) fluido.pingar(k.px + (dx * i) / n, k.py + (dy * i) / n, dx / n, dy / n, forca * 0.7)
    }
    fluido.passo(dt)
    material.uniforms.tRastro!.value = fluido.textura
    k.px = x
    k.py = y
  }

  const primeiroQuadro = useRef(false)
  useFrame((estado, delta) => {
    // o primeiro quadro do retrato está na tela: libera o resto da página para montar (src/site/fila.ts)
    if (!primeiroQuadro.current) {
      primeiroQuadro.current = true
      aoPrimeiroQuadro()
      requestAnimationFrame(() => requestAnimationFrame(() => sinalizar('retrato')))
    }
    passo(performance.now(), Math.min(delta, 1 / 30))
    // o mesmo relógio da tela de abertura (src/site/tempoGlobal.ts): as curvas de nível têm a mesma fase nos dois
    material.uniforms.uTempo!.value = tempoGlobal()
    material.uniforms.uInteiro!.value = inteiro.current
    // giro amortecido seguindo o mouse (−1 a 1 a partir do centro do painel)
    const k = cursor.current
    const alvoX = k.dentro ? (k.x - 0.5) * 2 : 0
    const alvoY = k.dentro ? (k.y - 0.5) * 2 : 0
    const a = 1 - Math.exp(-0.025 * delta * 1000)
    giro.current.x += (alvoX - giro.current.x) * a
    giro.current.y += (alvoY - giro.current.y) * a
    if (malha.current) {
      malha.current.rotation.y = giro.current.x * GIRO
      malha.current.rotation.x = -giro.current.y * GIRO * (size.width > 768 ? 1 : 0)
    }
  })

  return (
    <mesh ref={malha} material={material}>
      <planeGeometry args={[1, 1, 128, 128]} />
    </mesh>
  )
}

export default function RetratoCena({ inteiro }: { inteiro: { current: number } }) {
  const raiz = useRef<HTMLDivElement>(null)
  const [visivel, setVisivel] = useState(true)
  // o canvas só começa a desenhar com os shaders já compilados (ver Plano)
  const [pronto, setPronto] = useState(false)
  const aoPronto = useCallback(() => setPronto(true), [])
  // Com a tela de abertura por cima (src/site/Abertura.tsx), o retrato desenha só o primeiro quadro e espera: por baixo dela
  // ninguém o vê, e deixá-lo rodando gastava a placa de vídeo e acumulava tinta do passeio do cursor, que aparecia de uma vez
  // na troca. Quando a abertura sai, ele retoma com a tinta limpa
  const rec = useRecuperacao()
  const [segurar, setSegurar] = useState(false)
  const aoPrimeiroQuadro = useCallback(() => {
    if (document.documentElement.dataset.abertura !== '1') return
    setSegurar(true)
    aguardar('abertura', 20000).then(() => setSegurar(false))
  }, [])
  useEffect(() => {
    const el = raiz.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisivel(!!e?.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={raiz} style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        key={rec.chave}
        // o painel viaja encolhendo (transform): o tamanho vem do elemento, não da caixa já encolhida
        resize={{ offsetSize: true }}
        frameloop={visivel && pronto && !segurar ? 'always' : 'never'}
        dpr={[1, 1.75]}
        camera={{ fov: 30, position: [0, 0, 10], near: 1, far: 40 }}
        gl={{ antialias: true, alpha: true, premultipliedAlpha: true }}
      >
        {rec.filho}
        <Plano alvo={raiz} inteiro={inteiro} aoPronto={aoPronto} aoPrimeiroQuadro={aoPrimeiroQuadro} pronto={pronto} />
      </Canvas>
    </div>
  )
}
