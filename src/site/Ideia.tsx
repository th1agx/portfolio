'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import s from './site.module.css'

gsap.registerPlugin(ScrollTrigger)

// Duas colunas: à esquerda o título e o parágrafo; à direita a vaga reservada para o painel que veio do
// topo pelo caminho curvo (ele pousa ali e fica parado enquanto o texto passa ao lado, sem cobrir nada).
// As linhas do título entram como no site do Lando (high-line-reveal): cada linha abre da esquerda para a
// direita enquanto um bloco lima por cima dela encolhe no sentido contrário. A linha lima é desenhada pela
// rolagem, com a bolinha (a requisição) na ponta.

export function Ideia() {
  const secao = useRef<HTMLElement>(null)
  const traco = useRef<SVGPathElement>(null)
  const ponta = useRef<SVGCircleElement>(null)

  useEffect(() => {
    const el = secao.current
    const path = traco.current
    const bola = ponta.current
    if (!el || !path || !bola) return
    // a linha tem espessura fixa na tela (non-scaling-stroke), então o tracejado é medido em pixels de tela,
    // e o desenho é esticado: mede o comprimento na tela, amostrando o caminho, para a ponta do traço e a
    // bolinha ficarem no mesmo ponto
    const total = path.getTotalLength()
    let amostras: { u: number; tela: number }[] = []
    let totalTela = 1
    const medir = () => {
      const m = path.getScreenCTM()
      if (!m) return
      const svgP = (path.ownerSVGElement as SVGSVGElement).createSVGPoint()
      let acum = 0
      let antes: DOMPoint | null = null
      amostras = []
      for (let i = 0; i <= 240; i++) {
        const q = path.getPointAtLength((total * i) / 240)
        svgP.x = q.x
        svgP.y = q.y
        const t = svgP.matrixTransform(m)
        if (antes) acum += Math.hypot(t.x - antes.x, t.y - antes.y)
        antes = t
        amostras.push({ u: i / 240, tela: acum })
      }
      totalTela = Math.max(1, acum)
      path.style.strokeDasharray = `${totalTela}`
    }
    const telaEm = (p: number) => {
      const i = Math.min(amostras.length - 1, Math.max(0, Math.round(p * 240)))
      return amostras[i]?.tela ?? 0
    }
    const aplicar = (p: number) => {
      path.style.strokeDashoffset = `${totalTela - telaEm(p)}`
      const pt = path.getPointAtLength(total * p)
      bola.setAttribute('cx', `${pt.x}`)
      bola.setAttribute('cy', `${pt.y}`)
      bola.style.opacity = p > 0.002 && p < 0.998 ? '1' : '0'
    }
    medir()
    aplicar(0)
    // a linha termina dentro da seção; a passagem para os projetos é a grade, que continua de uma para a outra
    const linha = ScrollTrigger.create({ trigger: el, start: 'top 90%', end: 'bottom bottom', scrub: true, onUpdate: (self) => aplicar(self.progress), onRefresh: (self) => (medir(), aplicar(self.progress)) })
    const entrada = ScrollTrigger.create({ trigger: el, start: 'top 55%', onEnter: () => (el.dataset.visivel = '1'), onLeaveBack: () => (el.dataset.visivel = '0') })
    return () => {
      linha.kill()
      entrada.kill()
    }
  }, [])

  return (
    <section id="ideia" ref={secao} className={s.ideia} data-visivel="0" data-tema="claro">
      <svg className={s.linha} viewBox="0 0 1440 1400" preserveAspectRatio="none" aria-hidden>
        <path
          ref={traco}
          d="M 1180 -40 C 1180 160, 980 210, 760 240 S 300 330, 210 520 S 330 860, 560 900 S 1000 940, 921 1105"
          fill="none"
          stroke="var(--azul)"
          strokeWidth="30"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle ref={ponta} r="20" fill="var(--azul)" />
      </svg>
      <div className={s.ideiaTexto}>
      <h2 className={s.titulo}>
        <span className={s.tituloMascara}>
          <span className={`${s.tituloLinha} ${s.tituloLinha1}`}>
            Sistemas que
            <span className={s.ancoraTitulo} data-robo="sentar" aria-hidden />
          </span>
        </span>
        <span className={s.tituloMascara}>
          <span className={`${s.tituloLinha} ${s.tituloLinha2}`}>se explicam</span>
        </span>
      </h2>
      <div className={s.colunaTexto}>
        <p className={s.paragrafo}>
          Trabalho na 3D Lab com o ERP da empresa, integrações via API e automação. Fora dele, escrevi o Tributax, um motor tributário em
          que cada resposta traz a regra aplicada e as descartadas, e o DevGuard, uma disciplina que obriga agentes de IA a provar o que
          entregam.
        </p>
        <span className={s.ancoraBotao} data-robo="joinha" aria-hidden />
      </div>
      </div>
      {/* a vaga onde o painel do topo pousa depois de viajar pelo caminho curvo */}
      <div className={s.pouso} data-pouso aria-hidden />
    </section>
  )
}
