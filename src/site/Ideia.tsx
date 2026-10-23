'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import s from './site.module.css'

gsap.registerPlugin(ScrollTrigger)

// O título em duas linhas, que sobem de dentro de uma máscara quando a seção entra; o parágrafo vem
// em seguida. A linha lima nasce no herói, atravessa o título e desce até a vista explodida,
// desenhada pela rolagem, com a bolinha (a requisição) na ponta.

export function Ideia() {
  const secao = useRef<HTMLElement>(null)
  const traco = useRef<SVGPathElement>(null)
  const ponta = useRef<SVGCircleElement>(null)

  useEffect(() => {
    const el = secao.current
    const path = traco.current
    const bola = ponta.current
    if (!el || !path || !bola) return
    const total = path.getTotalLength()
    path.style.strokeDasharray = `${total}`
    const aplicar = (p: number) => {
      path.style.strokeDashoffset = `${total * (1 - p)}`
      const pt = path.getPointAtLength(total * p)
      bola.setAttribute('cx', `${pt.x}`)
      bola.setAttribute('cy', `${pt.y}`)
      bola.style.opacity = p > 0.002 && p < 0.998 ? '1' : '0'
    }
    aplicar(0)
    const linha = ScrollTrigger.create({ trigger: el, start: 'top 90%', end: 'bottom 30%', scrub: true, onUpdate: (self) => aplicar(self.progress) })
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
          d="M 1180 -40 C 1180 160, 980 210, 760 240 S 300 330, 210 520 S 330 860, 560 900 S 820 1060, 640 1400"
          fill="none"
          stroke="var(--lime)"
          strokeWidth="30"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle ref={ponta} r="20" fill="var(--lime)" />
      </svg>
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
    </section>
  )
}
