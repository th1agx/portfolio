'use client'

import { useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import s from './site.module.css'

gsap.registerPlugin(ScrollTrigger)

// Topo: o painel escuro com o aglomerado de símbolos de código atrás do texto pesado. Ao sair, o painel
// encolhe e arredonda; a rolagem espalha as peças (na cena). O robô guia começa aqui, pequeno, sobre a régua.

const Simbolos = dynamic(() => import('@/cena/Simbolos'), { ssr: false })

function Palavras({ texto, inicio = 0 }: { texto: string; inicio?: number }) {
  return (
    <>
      {texto.split(' ').map((p, i) => (
        <span key={i}>
          <span className={s.palavraMascara}>
            <span className={s.palavra} style={{ '--i': i + inicio } as React.CSSProperties}>
              {p}
            </span>
          </span>{' '}
        </span>
      ))}
    </>
  )
}

export function Heroi() {
  const painel = useRef<HTMLDivElement>(null)
  const secao = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!painel.current || !secao.current) return
    const tw = gsap.to(painel.current, {
      scale: 0.9,
      borderRadius: '3vw',
      yPercent: 6,
      ease: 'none',
      scrollTrigger: { trigger: secao.current, start: 'top top', end: 'bottom top', scrub: true },
    })
    return () => {
      tw.scrollTrigger?.kill()
      tw.kill()
    }
  }, [])

  return (
    <section id="topo" ref={secao} className={s.heroi} data-tema="claro">
      <div ref={painel} className={s.painel} aria-label="Símbolos de código soltos. Passe o cursor para empurrar e clique para trocar a cor.">
        <Simbolos />
        <div className={s.painelTexto}>
          <p className={s.painelSobre}>
            <Palavras texto="Thiago Antunes, engenheiro de software" />
          </p>
          <h1 className={s.manchete}>
            <span className="visually-hidden">Thiago Antunes. </span>
            <span className={s.mancheteLinha}>
              <Palavras texto="Conecto" inicio={4} />
            </span>
            <span className={s.mancheteLinha}>
              <Palavras texto="sistemas." inicio={5} />
            </span>
          </h1>
          <p className={s.painelNota}>
            <Palavras texto="ERP, integrações via API e regras fiscais que explicam a própria decisão." inicio={7} />
          </p>
          <p className={s.painelDica}>Passe o cursor nas peças. Clique para trocar a cor.</p>
        </div>
      </div>
      <span className={s.ancoraRobo} data-robo="chamar" data-robo-alvo="ideia" aria-hidden />
    </section>
  )
}
