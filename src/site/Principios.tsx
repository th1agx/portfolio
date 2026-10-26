'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { caminhoDoQuadro, suave } from './projecao'
import s from './site.module.css'

gsap.registerPlugin(ScrollTrigger)

// Como eu trabalho: quatro decisões reais do Tributax, cada uma registrada num ADR do repositório.
// Cada decisão é uma afirmação em uma linha: número em mono, afirmação grande, explicação direta e
// uma linha de código real como detalhe. Sem cartão flutuando: a linha é uma entrada de manifesto,
// separada por fio, e a afirmação sobe por uma máscara conforme a rolagem.
// A entrada: o escuro dos projetos vira um quadro que se inclina em 3D, encolhe revelando o lima e cai.

const DECISOES = [
  {
    id: 'zero',
    titulo: 'Sem regra, sem resposta',
    adr: 'honestidade fiscal',
    texto: 'Quando o motor não encontra a regra, devolve NO_RULE_FOUND. Imposto zero seria um chute com cara de resposta — e o chute iria para a nota de alguém.',
    detalhe: 'resposta.status === "NO_RULE_FOUND"',
    robo: 'nao',
  },
  {
    id: 'ia',
    titulo: 'IA sugere, pessoa aprova',
    adr: 'ADR-012',
    texto: 'A IA lê a legislação e propõe regras novas, mas não aprova nenhuma. A rota que publica regra só aceita admin — a trava está no código, não no combinado.',
    detalhe: 'POST /v1/rules → 403 sem sessão admin',
    robo: 'joinha',
  },
  {
    id: 'dado',
    titulo: 'Regra é linha de tabela',
    adr: 'ADR-004 · ADR-005',
    texto: 'Regra tributária mora no Postgres, com vigência. A lei mudou, entra uma linha nova. Duas regras valendo ao mesmo tempo, vence a mais específica.',
    detalhe: 'icms_interestadual · SP → MG · 12% · [início, fim)',
    robo: 'sim',
  },
  {
    id: 'trace',
    titulo: 'Toda resposta explica o porquê',
    adr: 'ADR-007',
    texto: 'Cada resposta guarda a regra aplicada, as que ficaram de fora e o fundamento legal, item por item. O registro só cresce, nunca é reescrito.',
    detalhe: 'trace: [aplicada, descartada[], fundamento]',
    robo: 'acenar',
  },
]

export function Principios() {
  const secao = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = secao.current
    if (!el) return
    const ctx = gsap.context(() => {
      // o quadro escuro: tela cheia, inclina, encolhe e cai
      const quadro = el.querySelector<HTMLElement>('[data-moldura]')!
      const estado = { p: 0 }
      const desenhar = () => {
        const W = innerWidth
        const H = innerHeight
        const p = estado.p
        const t = suave(0, 0.62, p)
        const f = suave(0.5, 1, p)
        quadro.style.visibility = p >= 0.999 ? 'hidden' : 'visible'
        quadro.style.clipPath = caminhoDoQuadro({
          cx: W / 2 + f * W * 0.12,
          cy: H / 2 + f * H * 1.05,
          w: W * (1.2 - 0.82 * t),
          h: H * (1.2 - 0.76 * t),
          rx: 0.38 * t,
          ry: -0.52 * t + f * 0.3,
          rz: -0.1 * t - f * 0.35,
          raio: 2 + 34 * t,
        })
      }
      desenhar()
      const intro = el.querySelector('[data-intro]')
      gsap.to(estado, { p: 1, ease: 'none', onUpdate: desenhar, scrollTrigger: { trigger: intro, start: 'top top', end: 'bottom bottom', scrub: 0.5, onRefresh: desenhar } })
      // o título cresce de trás do quadro
      gsap.fromTo('[data-titulo-principios]', { scale: 0.7, rotate: -4 }, { scale: 1, rotate: 0, ease: 'power2.out', scrollTrigger: { trigger: intro, start: 'top top', end: 'center center', scrub: 0.5 } })

      // cada decisão: a afirmação sobe pela máscara e o fio da linha se desenha, na rolagem
      el.querySelectorAll<HTMLElement>('[data-decisao]').forEach((d) => {
        gsap.fromTo(
          d.querySelector('[data-codigo]'),
          { yPercent: 110 },
          { yPercent: 0, ease: 'power3.out', scrollTrigger: { trigger: d, start: 'top 88%', end: 'top 48%', scrub: 0.6 } },
        )
        gsap.fromTo(
          d.querySelectorAll('[data-sobe]'),
          { y: 26, opacity: 0 },
          { y: 0, opacity: 1, ease: 'power2.out', stagger: 0.08, scrollTrigger: { trigger: d, start: 'top 82%', end: 'top 52%', scrub: 0.6 } },
        )
      })
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={secao} className={s.principios} aria-labelledby="principios-titulo" data-tema="lima" data-tema-de="top 2%" data-tema-ate="top -1%">
      <div className={s.principiosIntro} data-intro>
        <div className={s.principiosIntroFixo}>
          <h2 id="principios-titulo" className={s.principiosTitulo} data-titulo-principios>
            Decisões que
            <br />
            eu defendo
          </h2>
          <div className={s.molduraQuadro} data-moldura aria-hidden>
            <span className={s.molduraAnel} />
          </div>
        </div>
      </div>
      <p className={s.decisoesAbertura}>Quatro escolhas do Tributax, o motor tributário que eu escrevi. Cada uma está no código e num registro de decisão no repositório.</p>
      <ol className={s.decisoes}>
        {DECISOES.map(({ id, titulo, adr, texto, detalhe, robo }, i) => (
          <li key={id} className={s.decisao} data-decisao>
            <span className={s.decisaoNum} data-sobe>
              {`0${i + 1}`}
            </span>
            <div className={s.decisaoCorpo}>
              <h3 className={s.decisaoTituloMascara}>
                <span className={s.decisaoTitulo} data-codigo>
                  {titulo}
                </span>
              </h3>
              <p className={s.decisaoFrase} data-sobe>
                {texto}
              </p>
              <p className={s.decisaoDetalhe} data-sobe>
                <code>{detalhe}</code>
              </p>
              <span className={s.ancoraDecisao} data-robo={robo} aria-hidden />
            </div>
            <span className={s.decisaoAdr} data-sobe>
              {adr}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
