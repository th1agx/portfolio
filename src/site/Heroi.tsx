'use client'

import { useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import s from './site.module.css'

gsap.registerPlugin(ScrollTrigger)

// Topo: o retrato em tela cheia (humano por cima, robô revelado pelo cursor), sem texto. Ao sair, o painel
// viaja pelo caminho curvo até a vaga na seção seguinte (ver o efeito abaixo). O robô guia começa aqui, pequeno.

const Retrato = dynamic(() => import('@/cena/Retrato'), { ssr: false })

export function Heroi() {
  const painel = useRef<HTMLDivElement>(null)
  const secao = useRef<HTMLElement>(null)
  const inteiro = useRef(0)
  useEffect(() => {
    const el = painel.current
    const assinatura = el?.querySelector<HTMLElement>('[data-assinatura]')
    const pouso = document.querySelector<HTMLElement>('[data-pouso]')
    const ideia = document.getElementById('ideia')
    if (!el || !assinatura || !pouso || !ideia) return
    type P = { x: number; y: number; w: number }
    // geometria medida sem transformação. Pontos da viagem: o painel
    // no topo, o centro da tela e a vaga reservada na seção seguinte. Depois de pousar, sobe junto com o título
    // e o texto da seção, como se fizesse parte dela.
    let g = { x0: 0, y0: 0, w0: 1, h0: 1, pouso: 1, saida: 2, pontos: [] as P[] }
    const medir = () => {
      el.style.transform = ''
      const r = el.getBoundingClientRect()
      const vw = innerWidth
      const vh = innerHeight
      // a vaga tem a mesma proporção do painel, para ele pousar sem distorcer
      pouso.style.height = `${(pouso.offsetWidth * r.height) / r.width}px`
      const y = window.scrollY
      const rp = pouso.getBoundingClientRect()
      const x0 = r.left + r.width / 2
      const y0 = r.top + y + r.height / 2
      g = {
        x0,
        y0,
        w0: r.width,
        h0: r.height,
        // pousa quando a vaga chega a 42% da altura da tela
        pouso: Math.max(1, rp.top + y + rp.height / 2 - vh * 0.42),
        // depois de pousar não fica preso: sobe junto com o título e o texto da seção (o vale fica livre para os
        // faróis dos dois lados)
        saida: Math.max(1, rp.top + y + rp.height / 2 - vh * 0.42),
        pontos: [
          { x: x0, y: y0, w: r.width },
          { x: vw * 0.58, y: vh * 0.5, w: r.width * 0.5 },
          { x: rp.left + rp.width / 2, y: vh * 0.42, w: rp.width },
        ],
      }
    }
    const cubica = (p0: number, p1: number, p2: number, p3: number, u: number) => {
      const v = 1 - u
      return v * v * v * p0 + 3 * v * v * u * p1 + 3 * v * u * u * p2 + u * u * u * p3
    }
    // o caminho em duas curvas, com os pontos de controle calculados a partir dos três pontos
    const caminho = (t: number): P => {
      const [A, B, C] = g.pontos as [P, P, P]
      if (t <= 0.5) {
        const u = t * 2
        const c1 = { x: A.x, y: A.y + (B.y - A.y) * 0.8 }
        const c2 = { x: B.x, y: B.y - Math.min(800, (B.y - A.y) * 0.3) }
        return { x: cubica(A.x, c1.x, c2.x, B.x, u), y: cubica(A.y, c1.y, c2.y, B.y, u), w: A.w + (B.w - A.w) * u }
      }
      const u = (t - 0.5) * 2
      const c1 = { x: B.x, y: B.y + Math.min(80, (C.y - B.y) * 0.3) }
      const c2 = { x: B.x + (C.x - B.x) * 0.6, y: C.y - (C.y - B.y) * 0.2 }
      return { x: cubica(B.x, c1.x, c2.x, C.x, u), y: cubica(B.y, c1.y, c2.y, C.y, u), w: B.w + (C.w - B.w) * u }
    }
    const suave = (x: number) => x * x * (3 - 2 * x)
    const aplicar = () => {
      const y = window.scrollY
      const viagem = suave(Math.min(1, Math.max(0, y / g.pouso)))
      const vaga = g.pontos[2]!
      // onde o painel deve estar na tela: no caminho, parado na vaga, ou subindo junto com o fim da seção
      const sobe = Math.max(0, y - g.saida)
      const p = viagem < 1 ? caminho(viagem) : { x: vaga.x, y: vaga.y - sobe, w: vaga.w }
      const escala = p.w / g.w0
      // o painel é preso à página; para ele estar no ponto p da tela, compensa a rolagem
      el.style.transform = `translate3d(${p.x - g.x0}px, ${p.y + y - g.y0}px, 0) scale(${escala})`
      // no topo ocupa a tela, sem canto; vira cartão de canto redondo ao encolher
      el.style.borderRadius = `${(18 * Math.min(1, viagem * 5)) / escala}px`
      // sem fundo no topo (só o recorte sobre a página); ao encolher ganha o Deep Blue do topo, como cartão
      el.style.backgroundColor = `rgba(0, 0, 128, ${Math.min(1, viagem * 4).toFixed(3)})`
      // a assinatura é escrita da esquerda para a direita durante a viagem e se apaga ao pousar:
      // marca nenhuma fica em cima do rosto
      const escreve = Math.min(1, Math.max(0, (viagem - 0.12) / 0.5))
      assinatura.style.clipPath = `inset(0 ${(100 - escreve * 100).toFixed(2)}% 0 0)`
      assinatura.style.opacity = `${1 - Math.min(1, Math.max(0, (viagem - 0.82) / 0.18))}`
    }
    medir()
    aplicar()
    const st = ScrollTrigger.create({ start: 0, end: 'max', onUpdate: aplicar, onRefresh: () => (medir(), aplicar()) })
    return () => {
      st.kill()
      el.style.transform = ''
    }
  }, [])

  return (
    <section id="topo" ref={secao} className={s.heroi} data-tema="lima">
      <h1 className="visually-hidden">Thiago Antunes, engenheiro de software</h1>
      {/* só o personagem, sem texto: o cursor revela o robô; o clique (ou toque) mostra o robô inteiro */}
      <div
        ref={painel}
        className={s.painel}
        data-retrato
        role="img"
        aria-label="Retrato de Thiago Antunes, metade humano e metade robô. O cursor revela a versão robô."
        onClick={() => gsap.to(inteiro, { current: inteiro.current > 0.5 ? 0 : 1, duration: 1.5, ease: 'expo.inOut', overwrite: true })}
      >
        <Retrato inteiro={inteiro} />
        <span className={s.assinaturaViagem} data-assinatura aria-hidden />
      </div>
      <span className={s.ancoraRobo} data-robo="chamar" data-robo-alvo="ideia" aria-hidden />
    </section>
  )
}
