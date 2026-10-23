'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { gsap } from 'gsap'
import { projetos } from '@/content/projetos'
import s from './site.module.css'

gsap.registerPlugin(ScrollTrigger)

// Projetos num palco só: a seção fica presa e a rolagem leva a câmera de um projeto ao outro (Palco.tsx).
// Cada projeto é um objeto que se monta diante da câmera; o texto entra pela esquerda enquanto ele monta
// e sai antes da viagem. O texto fica à esquerda e o objeto à direita: um nunca passa por cima do outro.
// O robô guia não aparece aqui (data-sem-robo): a cena é dos projetos.

const Palco = dynamic(() => import('@/cena/Palco'), { ssr: false })

export function Projetos() {
  const raiz = useRef<HTMLDivElement>(null)
  const progresso = useRef(0)
  const [ativo, setAtivo] = useState(false)

  useEffect(() => {
    const el = raiz.current
    if (!el) return
    const blocos = [...el.querySelectorAll<HTMLElement>('[data-projeto]')]
    const contador = el.querySelector<HTMLElement>('[data-contador]')
    const aplicar = (p: number) => {
      progresso.current = p
      el.style.setProperty('--p', p.toFixed(4))
      const f = Math.min(p * 4, 3.999)
      const i = Math.floor(f)
      const dentro = f - i
      blocos.forEach((b, j) => (b.dataset.on = j === i && dentro > 0.04 && dentro < 0.88 ? '1' : '0'))
      if (contador) contador.dataset.i = String(i)
      // no fim, a cena apaga (objetos, halo e índice somem): quando a seção solta da tela, o que sobe é
      // escuro sobre escuro, sem borda, e o anel lima do "Como eu trabalho" sobe sozinho até o centro
      const fim = gsap.utils.clamp(0, 1, (p - 0.94) / 0.045)
      el.style.setProperty('--fim', fim.toFixed(3))
      // e no começo ela acende depois de presa: a borda de cima do canvas nunca sobe visível pela tela
      el.style.setProperty('--ini', gsap.utils.clamp(0, 1, (p - 0.002) / 0.03).toFixed(3))
    }
    aplicar(0)
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => aplicar(self.progress),
      onRefresh: (self) => aplicar(self.progress),
    })
    // só desenha o 3D quando a seção está perto da tela
    const visto = ScrollTrigger.create({ trigger: el, start: 'top 150%', end: 'bottom -50%', onToggle: (self) => setAtivo(self.isActive) })
    return () => {
      st.kill()
      visto.kill()
    }
  }, [])

  return (
    <div ref={raiz} id="trabalho" className={s.projetos} data-tema="escuro" data-tema-de="top 150%" data-tema-ate="top 100%" data-sem-robo>
      <div className={s.projetosFixo}>
        <div className={s.palco}>
          <Palco progresso={progresso} ativo={ativo} />
        </div>
        <ol className={s.indice} data-contador data-i="0" aria-hidden>
          {projetos.map((p, i) => (
            <li key={p.id} style={{ '--i': i } as React.CSSProperties}>
              <span>0{i + 1}</span> {p.nome}
            </li>
          ))}
        </ol>
        {projetos.map((p) => (
          <section key={p.id} data-projeto data-on="0" className={s.projetoTexto} aria-labelledby={`projeto-${p.id}`}>
            <p className={s.projetoRotulo}>{p.rotulo}</p>
            <h3 id={`projeto-${p.id}`} className={s.projetoNome}>
              {p.nome}
            </h3>
            <p className={s.projetoFrase}>{p.frase}</p>
            <ul className={s.projetoFatos}>
              {p.fatos.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            {p.links.length > 0 && (
              <p className={s.projetoLinks}>
                {p.links.map((l) => (
                  <a key={l.href} href={l.href}>
                    {l.rotulo} ↗
                  </a>
                ))}
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
