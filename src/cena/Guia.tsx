'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useRecuperacao } from './contexto'
import { Environment, Lightformer } from '@react-three/drei'
import { BufferGeometry, DoubleSide, Group, HalfFloatType, Mesh, MeshBasicMaterial, OrthographicCamera, PerspectiveCamera, PlaneGeometry, PMREMGenerator, Scene, WebGLCubeRenderTarget, type Material, type WebGLRenderTarget } from 'three'
import { RoboAgente, type AcaoRobo } from './RoboAgente'
import { sinalizar } from '@/site/fila'

// O robô guia: pequeno, numa camada transparente por cima da página. Ele voa de um ponto marcado no
// conteúdo (elementos com data-robo) para o próximo conforme a rolagem e, ao chegar, faz a ação daquele
// ponto. É interativo: o mouse por cima o assusta, cada clique dá uma reação diferente, e o ponto pode
// ter um destino (data-robo-alvo) para onde o clique rola a página. No topo, ele convida a descer
// mergulhando e soltando setas lima, sem texto.
// Uma vez por visita ele rouba o cursor: voa até a seta, carrega ela pela tela e devolve acenando.

const ACOES: Record<string, AcaoRobo> = {
  acenar: 'acenar',
  sentar: 'parado',
  joinha: 'joinha',
  dancar: 'dancar',
  sim: 'sim',
  nao: 'nao',
  parado: 'parado',
  voar: 'voar',
  chamar: 'chamar',
}
const REACOES: AcaoRobo[] = ['pulo', 'giro', 'dancar', 'acenar', 'joinha']

type Ancora = { el: HTMLElement; acao: string; escala: number; alvo?: string }
type Interacao = {
  hover: boolean
  cliques: number
  reacao: { nome: AcaoRobo; ate: number } | null
  ponteiro: { x: number; y: number; perto: number }
  roubo: { fase: 0 | 1 | 2 | 3; inicio: number; feito: boolean }
  ancoraAtual: Ancora | null
}
type Dom = { alvo: HTMLButtonElement | null; balao: HTMLDivElement | null; cursor: HTMLDivElement | null }
// o que o robô diz ao renderizador: está na tela neste quadro / estava no anterior
type Desenho = { visivel: boolean; anterior: boolean }

const ALTURA = 72 // altura do robô na tela, em px, com escala 1

function Robo({ ancoras, inter, dom, desenho }: { ancoras: { current: Ancora[] }; inter: { current: Interacao }; dom: { current: Dom }; desenho: { current: Desenho } }) {
  const grupo = useRef<Group>(null)
  const acao = useRef<AcaoRobo>('acenar')
  const olhar = useRef({ x: 0, y: 0 })
  const pos = useRef({ x: -200, y: 0 })
  const escala = useRef(1)
  const inclina = useRef(0)
  // troca de âncora dentro de uma cena presa (de um cartão para o outro): um voo em arco, não um salto
  const vooPreso = useRef({ el: null as HTMLElement | null, inicio: -10, x: 0, y: 0 })
  // entrada e saída das áreas sem robô (os projetos): um voo com tempo e arco, não uma perseguição que parece teletransporte
  const vooFolga = useRef({ antes: false, inicio: -10, x: 0, y: 0 })

  const inicio = useRef(performance.now() / 1000)
  useFrame((_, dt) => {
    const lista = ancoras.current
    const g = grupo.current
    if (!g || lista.length === 0) return
    // um relógio só (o mesmo do clique), em segundos
    const agora = performance.now() / 1000
    const vw = window.innerWidth
    const vh = window.innerHeight
    const rol = window.scrollY
    const it = inter.current

    // 1. onde a rolagem quer o robô (entre duas âncoras)
    const pontos = lista.map((a) => {
      const r = a.el.getBoundingClientRect()
      return { x: r.left, y: r.top, chegada: r.top + rol - vh * 0.6, a }
    })
    let i = 0
    while (i < pontos.length - 1 && rol >= pontos[i + 1]!.chegada) i++
    // âncoras dentro de uma cena presa (data-robo-preso): enquanto a cena ocupa a tela, o robô segue a âncora
    // direto, porque a posição dela no documento não diz nada (ela anda com a cena, não com a página)
    // com várias âncoras na mesma cena (os cartões do "Até aqui"), vale a visível mais perto do meio da tela
    const presos = pontos.filter((p) => {
      if (p.a.el.dataset.roboPreso === undefined) return false
      const c = p.a.el.closest('[data-robo-cena]')?.getBoundingClientRect()
      return !!c && c.top <= 1 && c.bottom >= vh - 1
    })
    const visiveis = presos.filter((p) => p.y > vh * 0.12 && p.y < vh * 0.88)
    const preso = (visiveis.length ? visiveis : presos).sort((a, b) => Math.abs(a.y - vh * 0.45) - Math.abs(b.y - vh * 0.45))[0]
    const A = preso ?? pontos[i]!
    const B = preso ?? pontos[Math.min(i + 1, pontos.length - 1)]!
    const t = B === A ? 0 : Math.min(1, Math.max(0, (rol - A.chegada) / (B.chegada - A.chegada)))
    const k = Math.min(1, Math.max(0, (t - 0.25) / 0.5))
    const viagem = k * k * (3 - 2 * k)
    const voando = k > 0 && k < 1
    let alvoX = A.x + (B.x - A.x) * viagem
    let alvoY = A.y + (B.y - A.y) * viagem
    const ancora = (t < 0.5 ? A : B).a
    it.ancoraAtual = voando ? null : ancora
    let proxima: AcaoRobo = voando ? 'voar' : (ACOES[ancora.acao] ?? 'parado')
    let emVoo = false
    const vp = vooPreso.current
    if (preso) {
      if (vp.el !== preso.a.el) {
        if (vp.el) {
          vp.inicio = agora
          vp.x = pos.current.x
          vp.y = pos.current.y
        }
        vp.el = preso.a.el
      }
      const u = Math.min(1, (agora - vp.inicio) / 1.1)
      if (u < 1) {
        const e = u * u * (3 - 2 * u)
        alvoX = vp.x + (preso.x - vp.x) * e
        alvoY = vp.y + (preso.y - vp.y) * e - Math.sin(Math.PI * u) * 110
        proxima = 'voar'
        emVoo = true
        it.ancoraAtual = null
      }
    } else vp.el = null

    // 2. o roubo do cursor sobrepõe tudo
    const r = it.roubo
    const tam = (ALTURA * escala.current) / 2
    if (r.fase === 1) {
      alvoX = it.ponteiro.x - tam * 0.9
      alvoY = it.ponteiro.y + tam * 1.1
      proxima = 'voar'
      if (agora - r.inicio > 0.7) {
        r.fase = 2
        r.inicio = agora
        document.documentElement.classList.add('cursor-roubado')
      }
    } else if (r.fase === 2) {
      const tt = agora - r.inicio
      alvoX = vw * 0.5 + vw * 0.32 * Math.sin(tt * 1.6)
      alvoY = vh * 0.55 + vh * 0.22 * Math.sin(tt * 2.7)
      proxima = 'carregar'
      if (tt > 2.8) {
        r.fase = 3
        r.inicio = agora
      }
    } else if (r.fase === 3) {
      alvoX = it.ponteiro.x - tam * 0.9
      alvoY = it.ponteiro.y + tam * 1.1
      proxima = 'voar'
      if (agora - r.inicio > 0.7) {
        r.fase = 0
        r.feito = true
        document.documentElement.classList.remove('cursor-roubado')
        it.reacao = { nome: 'acenar', ate: agora + 1.6 }
        try {
          sessionStorage.setItem('robo-roubou', '1')
        } catch {}
      }
    } else if (it.reacao && agora < it.reacao.ate) proxima = it.reacao.nome
    else if (it.hover && !voando) proxima = 'surpreso'

    // 3. dispara o roubo: mouse parado perto do robô por um tempo, ou três cliques nele
    const centroX = pos.current.x
    const centroY = pos.current.y - tam
    const dist = Math.hypot(it.ponteiro.x - centroX, it.ponteiro.y - centroY)
    it.ponteiro.perto = dist < 200 && !voando ? it.ponteiro.perto + dt : 0
    const podeRoubar = r.fase === 0 && !r.feito && !document.documentElement.dataset.tunel && agora - inicio.current > 4 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && window.matchMedia('(pointer: fine)').matches
    // ?roubar na URL força o roubo, só para conferir a animação
    const forcar = r.fase === 0 && !r.feito && agora - inicio.current > 3 && location.search.includes('roubar')
    if (forcar || (podeRoubar && (it.ponteiro.perto > 1.4 || it.cliques >= 3))) {
      r.fase = 1
      r.inicio = agora
    }

    // em áreas marcadas com data-sem-robo (os projetos) ele sai voando pelo canto e volta depois
    const folga = !r.fase && [...document.querySelectorAll('[data-sem-robo]')].some((el) => {
      const rr = el.getBoundingClientRect()
      return rr.top < vh * 0.5 && rr.bottom > vh * 0.5
    })
    if (folga) {
      alvoX = vw + 160
      alvoY = -120
      proxima = 'voar'
    }
    // 3b. ao entrar ou sair da área sem robô, ele faz um voo de 1,6 s em arco, saindo de onde está e chegando ao destino
    // (que continua a andar com a rolagem). Vale nos dois sentidos: descendo ele sai pelo canto, subindo ele volta
    const vf = vooFolga.current
    if (folga !== vf.antes) {
      vf.antes = folga
      vf.inicio = agora
      vf.x = pos.current.x
      vf.y = pos.current.y
    }
    const uf = Math.min(1, (agora - vf.inicio) / 1.6)
    if (uf < 1 && !r.fase) {
      const e = uf * uf * (3 - 2 * uf)
      alvoX = vf.x + (alvoX - vf.x) * e
      alvoY = vf.y + (alvoY - vf.y) * e - Math.sin(Math.PI * uf) * 90
      proxima = 'voar'
      emVoo = true
      it.ancoraAtual = null
    }

    // 4. movimento suave até o alvo
    const s = 1 - Math.exp(-(r.fase ? 6 : emVoo ? 16 : 9) * dt)
    pos.current.x += (alvoX - pos.current.x) * s
    pos.current.y += (alvoY - pos.current.y) * s
    // a escala é lida da âncora a cada quadro: uma seção pode mudá-la com a rolagem (a estrada encolhe o robô no furo)
    const ea = Number(A.a.el.dataset.roboEscala ?? A.a.escala)
    const eb = Number(B.a.el.dataset.roboEscala ?? B.a.escala)
    escala.current += (ea + (eb - ea) * viagem - escala.current) * s
    const indoPara = r.fase || emVoo ? Math.sign(alvoX - pos.current.x) : Math.sign(B.x - A.x)
    inclina.current += ((voando || r.fase || emVoo ? indoPara * -0.35 : 0) - inclina.current) * s
    acao.current = proxima

    // olha para o cursor
    olhar.current.x = Math.max(-1, Math.min(1, (it.ponteiro.x - centroX) / 360))
    olhar.current.y = Math.max(-1, Math.min(1, (it.ponteiro.y - centroY) / 360))

    const tamanho = (ALTURA * escala.current) / 2
    g.scale.setScalar(tamanho)
    g.position.set(pos.current.x, -(pos.current.y - tamanho), 0)
    g.rotation.set(0, 0.25, inclina.current)
    const visivel = pos.current.y > -vh * 0.5 && pos.current.y < vh * 1.4 && !document.documentElement.dataset.tunel && (!folga || uf < 1)
    g.visible = visivel
    desenho.current.visivel = visivel

    // 5. DOM que acompanha o robô: área clicável, balão de fala e o cursor carregado
    const d = dom.current
    if (d.alvo) {
      d.alvo.style.transform = `translate3d(${pos.current.x - tamanho * 0.8}px, ${pos.current.y - tamanho * 2.1}px, 0)`
      d.alvo.style.width = `${tamanho * 1.6}px`
      d.alvo.style.height = `${tamanho * 2.2}px`
      d.alvo.style.display = visivel ? 'block' : 'none'
    }
    if (d.balao) {
      // o convite para descer: setas lima caindo logo abaixo do robô, sem texto
      const convida = !voando && !r.fase && ancora.acao === 'chamar'
      d.balao.dataset.on = convida && visivel ? '1' : '0'
      d.balao.style.transform = `translate3d(${pos.current.x - 12}px, ${pos.current.y + 4}px, 0)`
    }
    if (d.cursor) {
      d.cursor.dataset.on = r.fase === 2 || (r.fase === 3 && agora - r.inicio < 0.6) ? '1' : '0'
      d.cursor.style.transform = `translate3d(${pos.current.x + tamanho * 0.95}px, ${pos.current.y - tamanho * 1.55}px, 0)`
    }
  })

  return (
    <group ref={grupo}>
      <RoboAgente acao={acao} olhar={olhar} />
    </group>
  )
}

// Renderização sob demanda: a lógica do robô (posição, ações, DOM) segue rodando a cada quadro, mas a placa de
// vídeo só desenha quando ele está na tela. Ao sumir (projetos, túnel, fora do quadro), desenha um último quadro
// vazio para limpar o canvas. Voltou a aparecer, o próximo quadro já desenha (a decisão é do mesmo quadro).
function Renderizador({ desenho }: { desenho: { current: Desenho } }) {
  useFrame(({ gl, scene, camera }) => {
    const d = desenho.current
    if (d.visivel || d.anterior) gl.render(scene, camera)
    d.anterior = d.visivel
  }, 1)
  return null
}

// Compila os shaders do robô em paralelo (compileAsync) antes do primeiro quadro; o canvas só começa a desenhar
// quando termina, e a fila (src/site/fila.ts) só segue para a próxima cena depois disso.
function Aquecer({ aoPronto }: { aoPronto: () => void }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const get = useThree((s) => s.get)
  useEffect(() => {
    let vivo = true
    // a câmera é a ortográfica da CameraTela (o efeito dela roda antes deste): o three.js põe o tipo de câmera
    // na chave do programa, então compilar com a câmera padrão faria o primeiro quadro compilar tudo de novo
    gl.compileAsync(scene, get().camera)
      .catch(() => {})
      .then(() => vivo && aoPronto())
    return () => {
      vivo = false
    }
  }, [gl, scene, get, aoPronto])
  return null
}

// O Environment do drei desenha o cubemap de luz de forma síncrona assim que monta, e o shader dos Lightformers
// levava ~0,7 s para compilar com a thread principal parada esperando. Aqui esse mesmo shader (mesmo material, mesmo
// tipo de render target, mesma câmera: o three.js põe tudo isso na chave do programa) compila em paralelo ANTES de o
// Environment existir; quando termina, o cubemap sai em milissegundos.
function PreLuz({ aoPronto }: { aoPronto: () => void }) {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    let vivo = true
    const cena = new Scene()
    const material = new MeshBasicMaterial({ toneMapped: false, side: DoubleSide })
    const malha = new Mesh(new PlaneGeometry(1, 1), material)
    cena.add(malha)
    const alvo = new WebGLCubeRenderTarget(4)
    alvo.texture.type = HalfFloatType
    const antes = gl.getRenderTarget()
    gl.setRenderTarget(alvo)
    const pedidos: Promise<unknown>[] = [gl.compileAsync(cena, new PerspectiveCamera(90, 1, 0.1, 1000))]
    // O que de fato travava era o pré-filtro do ambiente (PMREM): na primeira vez que um material usa o cubemap, o
    // three.js converte-o com dois shaders (CubemapToCubeUV e a convolução GGX) e espera o driver compilar. Aqui os
    // mesmos shaders compilam em paralelo antes (o PMREMGenerator interno do renderer reaproveita o programa do cache).
    // Usa campos internos do three.js (versão fixa no package-lock); se mudarem, só deixa de adiantar e volta ao
    // comportamento de antes.
    let gerador: { dispose: () => void } | null = null
    try {
      const g = new PMREMGenerator(gl) as unknown as {
        compileCubemapShader: () => void
        _setSize: (n: number) => void
        _allocateTargets: () => WebGLRenderTarget
        _ggxMaterial: Material | null
        dispose: () => void
      }
      gerador = g
      g._setSize(128)
      const rt = g._allocateTargets() // cria os materiais da convolução
      g.compileCubemapShader()
      if (g._ggxMaterial) {
        const plana = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
        gl.setRenderTarget(rt)
        pedidos.push(gl.compileAsync(new Mesh(new BufferGeometry(), g._ggxMaterial), plana))
      }
      rt.dispose()
    } catch {
      /* sem adiantar */
    }
    gl.setRenderTarget(antes)
    Promise.all(pedidos)
      .catch(() => {})
      .then(() => {
        malha.geometry.dispose()
        alvo.dispose()
        if (vivo) aoPronto()
      })
    return () => {
      vivo = false
      // os materiais do gerador seguram o programa no cache enquanto o robô monta; só saem junto com a cena
      const g = gerador
      if (g) setTimeout(() => g.dispose(), 30000)
    }
  }, [gl, aoPronto])
  return null
}

function CameraTela() {
  const { size, set } = useThree()
  const camera = useMemo(() => new OrthographicCamera(0, 1, 0, -1, -2000, 2000), [])
  useEffect(() => {
    camera.left = 0
    camera.right = size.width
    camera.top = 0
    camera.bottom = -size.height
    camera.position.set(0, 0, 1000)
    camera.updateProjectionMatrix()
    set({ camera })
  }, [camera, size, set])
  return null
}

export default function Guia() {
  const ancoras = useRef<Ancora[]>([])
  const inter = useRef<Interacao>({
    hover: false,
    cliques: 0,
    reacao: null,
    ponteiro: { x: -999, y: -999, perto: 0 },
    roubo: { fase: 0, inicio: 0, feito: false },
    ancoraAtual: null,
  })
  const dom = useRef<Dom>({ alvo: null, balao: null, cursor: null })
  const desenho = useRef<Desenho>({ visivel: false, anterior: false })
  const [pronto, setPronto] = useState(false)
  const [luzOk, setLuzOk] = useState(false)
  const aoLuz = useCallback(() => setLuzOk(true), [])
  const aoPronto = useCallback(() => {
    setPronto(true)
    sinalizar('guia')
  }, [])

  useEffect(() => {
    const ler = () => {
      ancoras.current = [...document.querySelectorAll<HTMLElement>('[data-robo]')].map((el) => ({
        el,
        acao: el.dataset.robo!,
        escala: Number(el.dataset.roboEscala ?? 1),
        alvo: el.dataset.roboAlvo,
      }))
    }
    ler()
    const mo = new MutationObserver(ler)
    mo.observe(document.body, { childList: true, subtree: true })
    try {
      inter.current.roubo.feito = sessionStorage.getItem('robo-roubou') === '1'
    } catch {}
    const mover = (e: PointerEvent) => {
      inter.current.ponteiro.x = e.clientX
      inter.current.ponteiro.y = e.clientY
    }
    // qualquer tecla devolve o cursor na hora
    const tecla = () => {
      const r = inter.current.roubo
      if (r.fase) {
        r.fase = 0
        r.feito = true
        document.documentElement.classList.remove('cursor-roubado')
      }
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('keydown', tecla)
    return () => {
      mo.disconnect()
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('keydown', tecla)
      document.documentElement.classList.remove('cursor-roubado')
    }
  }, [])

  const clicar = () => {
    const it = inter.current
    it.cliques++
    it.reacao = { nome: REACOES[(it.cliques - 1) % REACOES.length]!, ate: performance.now() / 1000 + 1.4 }
    const alvo = it.ancoraAtual?.alvo
    if (alvo) document.getElementById(alvo)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const rec = useRecuperacao()
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 40, pointerEvents: 'none' }} aria-hidden>
        <Canvas key={rec.chave} dpr={[1, 2]} frameloop={pronto ? 'always' : 'never'} gl={{ antialias: true, alpha: true }} style={{ pointerEvents: 'none' }}>
          {rec.filho}
          <CameraTela />
          <Renderizador desenho={desenho} />
          <PreLuz aoPronto={aoLuz} />
          <hemisphereLight args={['#ffffff', '#9a9a92', 1.2]} />
          <directionalLight position={[300, 600, 800]} intensity={2} />
          {/* o ambiente e o robô só montam com o shader da luz já compilado (PreLuz); o Aquecer compila o robô */}
          {luzOk && (
            <>
              <Environment resolution={128} frames={1}>
                <Lightformer form="rect" intensity={2.5} position={[-2, 4, 5]} scale={[6, 4, 1]} />
                <Lightformer form="rect" intensity={1} position={[4, 0, 3]} scale={[3, 6, 1]} />
              </Environment>
              <Aquecer aoPronto={aoPronto} />
              <Robo ancoras={ancoras} inter={inter} dom={dom} desenho={desenho} />
            </>
          )}
        </Canvas>
      </div>
      <button
        type="button"
        className="robo-alvo"
        aria-label="Robô guia. Clique para ele reagir."
        ref={(el) => void (dom.current.alvo = el)}
        onPointerEnter={() => (inter.current.hover = true)}
        onPointerLeave={() => (inter.current.hover = false)}
        onClick={clicar}
      />
      <div className="robo-convite" data-on="0" ref={(el) => void (dom.current.balao = el)} aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <div className="robo-cursor" data-on="0" ref={(el) => void (dom.current.cursor = el)} aria-hidden>
        <svg viewBox="0 0 24 24" width="26" height="26">
          <path d="M4 2 L4 20 L9 15 L12.5 22 L15.5 20.6 L12 13.6 L19 13.6 Z" fill="#050505" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
    </>
  )
}
