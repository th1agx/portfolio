'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Group, OrthographicCamera } from 'three'
import { RoboAgente, type AcaoRobo } from './RoboAgente'

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

const ALTURA = 72 // altura do robô na tela, em px, com escala 1

function Robo({ ancoras, inter, dom }: { ancoras: { current: Ancora[] }; inter: { current: Interacao }; dom: { current: Dom } }) {
  const grupo = useRef<Group>(null)
  const acao = useRef<AcaoRobo>('acenar')
  const olhar = useRef({ x: 0, y: 0 })
  const pos = useRef({ x: -200, y: 0 })
  const escala = useRef(1)
  const inclina = useRef(0)

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
    const preso = pontos.find((p) => {
      if (p.a.el.dataset.roboPreso === undefined) return false
      const c = p.a.el.closest('[data-robo-cena]')?.getBoundingClientRect()
      return !!c && c.top <= 1 && c.bottom >= vh - 1
    })
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

    // 4. movimento suave até o alvo
    const s = 1 - Math.exp(-(r.fase ? 6 : 9) * dt)
    pos.current.x += (alvoX - pos.current.x) * s
    pos.current.y += (alvoY - pos.current.y) * s
    // a escala é lida da âncora a cada quadro: uma seção pode mudá-la com a rolagem (a estrada encolhe o robô no furo)
    const ea = Number(A.a.el.dataset.roboEscala ?? A.a.escala)
    const eb = Number(B.a.el.dataset.roboEscala ?? B.a.escala)
    escala.current += (ea + (eb - ea) * viagem - escala.current) * s
    const indoPara = r.fase ? Math.sign(alvoX - pos.current.x) : Math.sign(B.x - A.x)
    inclina.current += ((voando || r.fase ? indoPara * -0.35 : 0) - inclina.current) * s
    acao.current = proxima

    // olha para o cursor
    olhar.current.x = Math.max(-1, Math.min(1, (it.ponteiro.x - centroX) / 360))
    olhar.current.y = Math.max(-1, Math.min(1, (it.ponteiro.y - centroY) / 360))

    const tamanho = (ALTURA * escala.current) / 2
    g.scale.setScalar(tamanho)
    g.position.set(pos.current.x, -(pos.current.y - tamanho), 0)
    g.rotation.set(0, 0.25, inclina.current)
    const visivel = pos.current.y > -vh * 0.5 && pos.current.y < vh * 1.4 && !document.documentElement.dataset.tunel && !folga
    g.visible = visivel

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

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 40, pointerEvents: 'none' }} aria-hidden>
        <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true }} style={{ pointerEvents: 'none' }}>
          <CameraTela />
          <hemisphereLight args={['#ffffff', '#9a9a92', 1.2]} />
          <directionalLight position={[300, 600, 800]} intensity={2} />
          <Environment resolution={128} frames={1}>
            <Lightformer form="rect" intensity={2.5} position={[-2, 4, 5]} scale={[6, 4, 1]} />
            <Lightformer form="rect" intensity={1} position={[4, 0, 3]} scale={[3, 6, 1]} />
          </Environment>
          <Robo ancoras={ancoras} inter={inter} dom={dom} />
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
          <path d="M4 2 L4 20 L9 15 L12.5 22 L15.5 20.6 L12 13.6 L19 13.6 Z" fill="#121214" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
    </>
  )
}
