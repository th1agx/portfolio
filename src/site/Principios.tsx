'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { caminhoDoQuadro, suave } from './projecao'
import s from './site.module.css'

gsap.registerPlugin(ScrollTrigger)

// Decisões que eu defendo: no lugar de valores genéricos, quatro escolhas reais do Tributax, cada uma
// registrada num ADR do repositório (README, seção "Por que é diferente"). Cada decisão vem com um pedaço
// do sistema que a mostra funcionando, montado pela rolagem: a resposta que recusa chutar zero, o fluxo em
// que a IA não consegue aprovar regra, a regra que sai do if e vira linha de tabela, o trace que explica.
// Os valores dentro dos artefatos são ilustrativos; os nomes (NO_RULE_FOUND, AI_SUGGESTED, trace,
// reviewReason, /v1/rules) são os do código.
// A entrada: o escuro dos projetos vira um quadro que se inclina em 3D, encolhe revelando o lima e cai.

// cada passo de um artefato acende quando o progresso da rolagem daquela decisão passa do valor dele
const P = (v: number) => ({ 'data-passo': v }) as Record<string, number>

function ArtefatoZero() {
  return (
    <div className={s.artefato} aria-hidden>
      <p className={s.artefatoRotulo}>resposta.json</p>
      <pre className={s.codigo}>
        <span {...P(0.05)} className={s.linhaCodigo}>{'{'}</span>
        <span {...P(0.12)} className={s.linhaCodigo}>
          {'  '}<i className={s.chave}>&quot;itemId&quot;</i>: <i className={s.texto}>&quot;item-1&quot;</i>,
        </span>
        <span {...P(0.2)} className={s.linhaCodigo}>
          {'  '}<i className={s.chave}>&quot;tributo&quot;</i>: <i className={s.texto}>&quot;ICMS&quot;</i>,
        </span>
        <span {...P(0.3)} className={s.linhaCodigo}>
          {'  '}<i className={s.chave}>&quot;valor&quot;</i>: <b className={s.chute} {...P(0.5)}>0.00</b> <b className={s.nulo} {...P(0.6)}>null</b>,
        </span>
        <span {...P(0.68)} className={s.linhaCodigo}>
          {'  '}<i className={s.chave}>&quot;status&quot;</i>: <i className={s.destaque}>&quot;NO_RULE_FOUND&quot;</i>,
        </span>
        <span {...P(0.78)} className={s.linhaCodigo}>
          {'  '}<i className={s.chave}>&quot;reviewReason&quot;</i>: <i className={s.texto}>&quot;…&quot;</i>
        </span>
        <span {...P(0.84)} className={s.linhaCodigo}>{'}'}</span>
      </pre>
    </div>
  )
}

function ArtefatoAprovacao() {
  return (
    <div className={s.artefato} aria-hidden>
      <p className={s.artefatoRotulo}>regras · fluxo de aprovação</p>
      <div className={s.fluxo}>
        <svg className={s.fluxoAtalho} viewBox="0 0 300 80" preserveAspectRatio="none">
          <path {...P(0.25)} d="M 40 76 C 80 4, 220 4, 260 76" pathLength="1" />
        </svg>
        <span className={s.cadeado} {...P(0.42)}>
          bloqueado
        </span>
        <div className={s.etapa} {...P(0.08)}>
          <small>IA</small>
          <strong>AI_SUGGESTED</strong>
          <span>rascunho</span>
        </div>
        <span className={s.seta} {...P(0.58)} />
        <div className={s.etapa} {...P(0.62)}>
          <small>pessoa</small>
          <strong>/v1/rules</strong>
          <span>só admin</span>
        </div>
        <span className={s.seta} {...P(0.74)} />
        <div className={`${s.etapa} ${s.etapaFim}`} {...P(0.8)}>
          <small>catálogo</small>
          <strong>regra vigente</strong>
          <span>aprovada</span>
        </div>
      </div>
    </div>
  )
}

function ArtefatoTabela() {
  return (
    <div className={s.artefato} aria-hidden>
      <p className={s.artefatoRotulo}>antes · depois</p>
      <pre className={`${s.codigo} ${s.codigoVelho}`} {...P(0.45)}>
        <span {...P(0.05)} className={s.linhaCodigo}>if (uf === &apos;SP&apos; &amp;&amp; destino === &apos;MG&apos;) {'{'}</span>
        <span {...P(0.12)} className={s.linhaCodigo}>{'  '}if (data &lt; mudancaDaLei) aliquota = …</span>
        <span {...P(0.19)} className={s.linhaCodigo}>{'  '}else if (produto.ncm …) aliquota = …</span>
        <span {...P(0.26)} className={s.linhaCodigo}>{'}'} else if (…) {'{'} … {'}'}</span>
      </pre>
      <div className={s.tabela} {...P(0.55)}>
        <div className={s.tabelaCabeca}>
          <span>regra</span>
          <span>operação</span>
          <span>alíquota</span>
          <span>vigência</span>
        </div>
        <div className={s.tabelaLinha} {...P(0.66)}>
          <span>icms_interestadual</span>
          <span>SP → MG</span>
          <span>12%</span>
          <span>[início, fim)</span>
        </div>
        <p className={s.tabelaNota} {...P(0.8)}>
          constraint: vigências da mesma regra não se sobrepõem
        </p>
      </div>
    </div>
  )
}

function ArtefatoTrace() {
  return (
    <div className={s.artefato} aria-hidden>
      <p className={s.artefatoRotulo}>trace · item-1 · ICMS</p>
      <ol className={s.trace}>
        <li {...P(0.12)}>
          <b className={s.ok}>aplicada</b> regra mais específica para a operação
        </li>
        <li {...P(0.32)}>
          <b className={s.fora}>descartada</b> regra geral da UF, menos específica
        </li>
        <li {...P(0.52)}>
          <b className={s.lei}>fundamento</b> dispositivo legal da regra aplicada
        </li>
      </ol>
      <span className={s.carimboTrace} {...P(0.72)}>
        append-only
      </span>
    </div>
  )
}

const DECISOES = [
  {
    id: 'zero',
    codigo: 'NO_RULE_FOUND',
    adr: 'honestidade fiscal',
    texto: 'Quando o motor não encontra a regra, ele diz que não encontrou. Devolver imposto zero seria um chute com cara de resposta, e o chute chegaria na nota de alguém.',
    Artefato: ArtefatoZero,
    robo: 'nao',
  },
  {
    id: 'ia',
    codigo: 'AI_SUGGESTED',
    adr: 'ADR-012',
    texto: 'Uma IA lê a legislação e propõe regras novas, mas não aprova nenhuma. A rota que publica regra só aceita admin. Isso é uma trava no código, não um combinado.',
    Artefato: ArtefatoAprovacao,
    robo: 'joinha',
  },
  {
    id: 'dado',
    codigo: 'regra = linha',
    adr: 'ADR-004 · ADR-005',
    texto: 'Regra tributária mora no Postgres, com vigência. Quando a lei muda, entra uma linha nova na tabela. Quando duas regras servem, vence a mais específica.',
    Artefato: ArtefatoTabela,
    robo: 'sim',
  },
  {
    id: 'trace',
    codigo: 'trace',
    adr: 'ADR-007',
    texto: 'Toda resposta guarda por que decidiu: a regra aplicada, as que ficaram de fora e o fundamento, item por item. O registro só cresce, nunca é reescrito.',
    Artefato: ArtefatoTrace,
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

      // cada decisão: o nome em código sobe pela máscara e o artefato se monta passo a passo
      el.querySelectorAll<HTMLElement>('[data-decisao]').forEach((d) => {
        const passos = [...d.querySelectorAll<HTMLElement>('[data-passo]')]
        const limites = passos.map((p) => Number(p.dataset.passo))
        ScrollTrigger.create({
          trigger: d,
          start: 'top 78%',
          end: 'center 38%',
          onUpdate: (self) => passos.forEach((p, i) => (p.dataset.on = self.progress >= limites[i]! ? '1' : '0')),
          onRefresh: (self) => passos.forEach((p, i) => (p.dataset.on = self.progress >= limites[i]! ? '1' : '0')),
        })
        gsap.fromTo(
          d.querySelector('[data-codigo]'),
          { yPercent: 105 },
          { yPercent: 0, ease: 'power3.out', scrollTrigger: { trigger: d, start: 'top 85%', end: 'top 45%', scrub: 0.6 } },
        )
        gsap.fromTo(
          d.querySelector('[data-artefato]'),
          { y: 140, rotate: d.dataset.lado === 'direita' ? 4 : -4 },
          { y: 0, rotate: d.dataset.lado === 'direita' ? 1.2 : -1.2, ease: 'power3.out', scrollTrigger: { trigger: d, start: 'top 95%', end: 'top 40%', scrub: 0.6 } },
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
      <p className={s.decisoesAbertura}>
        Quatro escolhas do Tributax, o motor tributário que eu escrevi. Cada uma está no código e num registro de decisão no repositório.
      </p>
      <ol className={s.decisoes}>
        {DECISOES.map(({ id, codigo, adr, texto, Artefato, robo }, i) => (
          <li key={id} className={s.decisao} data-decisao data-lado={i % 2 ? 'direita' : 'esquerda'}>
            <div className={s.decisaoTexto}>
              <p className={s.decisaoAdr}>
                0{i + 1} · {adr}
              </p>
              <h3 className={s.decisaoCodigoMascara}>
                <span className={s.decisaoCodigo} data-codigo>
                  {codigo}
                </span>
              </h3>
              <p className={s.decisaoFrase}>{texto}</p>
              <span className={s.ancoraDecisao} data-robo={robo} aria-hidden />
            </div>
            <div className={s.decisaoArtefato} data-artefato>
              <Artefato />
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
