'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { gsap } from 'gsap'
import { Contato } from './Contato'
import s from './site.module.css'

gsap.registerPlugin(ScrollTrigger)

// O final do site é uma cena só, presa na tela do começo ao fim, para não haver borda de seção nenhuma:
//   1. a estrada: a rolagem desenha uma estrada lima que serpenteia e termina no centro da tela. As datas
//      reais (README do perfil) viram pinos com o ano; o texto da estação atual fica num painel fixo no
//      alto à direita, então nenhum texto encosta em outro. O robô guia anda na ponta.
//   2. o furo: onde a estrada termina, abre-se um buraco com aro lima e a camada da estrada cresce em direção
//      a ele (a câmera mergulha). O robô guia para no centro do furo.
//   3. o túnel (Tunel.tsx), que já estava por baixo o tempo todo: o robô do túnel começa pequeno no centro
//      da boca, exatamente onde o guia entrou, e a câmera vai atrás dele.
//   4. a saída do túnel é luz branca; o contato aparece sobre ela, com o robô ainda acenando.

const Tunel = dynamic(() => import('@/cena/Tunel'), { ssr: false })

const ETAPAS = [
  { quando: '2022–2024', titulo: 'Análise e Desenvolvimento de Sistemas', texto: 'Formação tecnóloga na Estácio.', em: 0.14, lado: 'direita' },
  { quando: '2025', titulo: 'Engenharia de Software', texto: 'Graduação em andamento, junto com o trabalho.', em: 0.36, lado: 'direita' },
  { quando: 'Mar 2026', titulo: 'Estagiário na 3D Lab', texto: 'Entrei por um desafio técnico: um cadastro de produtos em JavaScript puro.', em: 0.6, lado: 'esquerda' },
  { quando: 'Jun 2026', titulo: 'Engenheiro de software júnior', texto: 'ERP, integrações via API e IA aplicada no dia a dia.', em: 0.82, lado: 'direita' },
]

// termina no centro do desenho (720, 470): é ali que o furo abre
const CAMINHO = 'M -60 380 C 240 320, 330 600, 600 540 S 960 330, 1160 450 S 1180 790, 860 760 S 470 700, 560 560 S 700 440, 720 470'
const CENTRO = { x: 720 / 1440, y: 470 / 900 }

// quanto da rolagem cada parte usa (em telas)
const ESTRADA = 3.6
const TUNEL = 14
const CONTATO = 1.2
const TOTAL = ESTRADA + TUNEL + CONTATO

export function Trajetoria() {
  const secao = useRef<HTMLElement>(null)
  const camada = useRef<HTMLDivElement>(null)
  const aro = useRef<HTMLDivElement>(null)
  const estrada = useRef<SVGPathElement>(null)
  const ponta = useRef<HTMLSpanElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const estacoes = useRef<(HTMLDivElement | null)[]>([])
  const paineis = useRef<(HTMLDivElement | null)[]>([])
  const contato = useRef<HTMLDivElement>(null)
  const tunel = useRef<HTMLDivElement>(null)
  const progressoTunel = useRef(0)
  const [tunelAtivo, setTunelAtivo] = useState(false)

  useEffect(() => {
    const el = secao.current
    const path = estrada.current
    if (!el || !path || !svg.current || !camada.current || !aro.current || !contato.current) return
    const raiz = document.documentElement
    const total = path.getTotalLength()
    path.style.strokeDasharray = `${total}`
    const pontos = ETAPAS.map((e) => path.getPointAtLength(total * e.em))
    let ligado = false

    const aplicar = (P: number) => {
      // 1. estrada
      const pe = Math.min(1, P / (ESTRADA / TOTAL))
      const desenho = Math.min(1, pe / 0.64)
      path.style.strokeDashoffset = `${total * (1 - desenho)}`
      const W = innerWidth
      const H = innerHeight
      const sx = W / 1440
      const sy = H / 900
      pontos.forEach((pt, i) => {
        const e = estacoes.current[i]
        if (e) e.style.transform = `translate3d(${pt.x * sx}px, ${pt.y * sy}px, 0)`
      })
      const pt = path.getPointAtLength(total * desenho)
      if (ponta.current) ponta.current.style.transform = `translate3d(${pt.x * sx}px, ${pt.y * sy}px, 0)`
      let atual = -1
      estacoes.current.forEach((e, i) => {
        const chegou = desenho >= ETAPAS[i]!.em
        if (chegou) atual = i
        if (e) e.dataset.on = chegou ? '1' : '0'
      })
      paineis.current.forEach((pn, i) => {
        if (pn) pn.dataset.estado = pe > 0.8 ? 'passou' : i === atual ? 'atual' : i < atual ? 'passou' : 'vem'
      })

      // 2. o furo abre e a estrada cresce em direção a ele
      const abre = gsap.parseEase('power2.in')(Math.max(0, (pe - 0.82) / 0.18))
      const raio = abre * Math.hypot(W, H) * 0.62
      camada.current!.style.setProperty('--furo', `${raio.toFixed(1)}px`)
      camada.current!.style.transform = `scale(${1 + abre * 1.6})`
      camada.current!.style.visibility = abre >= 0.999 ? 'hidden' : 'visible'
      // o túnel só aparece quando o furo abre (antes disso, por baixo da cena, ainda se vê a seção anterior)
      tunel.current!.style.visibility = abre > 0 || P > ESTRADA / TOTAL ? 'visible' : 'hidden'
      // entrada: a cena chega por cima do fim do "Como eu trabalho" como um círculo que nasce no começo da
      // estrada, à esquerda, e cresce até cobrir a tela (a seção sobrepõe a última tela da anterior)
      const entra = gsap.parseEase('power2.inOut')(Math.min(1, P / (1 / TOTAL)))
      camada.current!.style.clipPath = entra >= 1 ? 'none' : `circle(${(entra * 150).toFixed(2)}% at 0% 42%)`
      aro.current!.style.transform = `translate(-50%, -50%) scale(${(raio * 2) / 100})`
      aro.current!.style.opacity = abre > 0 && abre < 0.98 ? '1' : '0'
      // o robô guia para no centro do furo, do mesmo tamanho que o robô do túnel tem no primeiro quadro
      ponta.current?.setAttribute('data-robo-escala', (1 + abre * 0.15).toFixed(3))

      // 3. o túnel
      const pt2 = Math.min(1, Math.max(0, (P - ESTRADA / TOTAL) / (TUNEL / TOTAL)))
      progressoTunel.current = pt2
      // a troca de robô acontece com o furo ainda pequeno, os dois no mesmo ponto e do mesmo tamanho
      const dentro = abre > 0.2
      if (dentro !== ligado) {
        ligado = dentro
        if (dentro) raiz.dataset.tunel = '1'
        else delete raiz.dataset.tunel
      }

      // cabeçalho claro enquanto a cena está escura (do furo até perto da saída branca)
      const escura = abre > 0.3 && pt2 < 0.9
      if ((raiz.dataset.cena === 'escura') !== escura) {
        if (escura) raiz.dataset.cena = 'escura'
        else delete raiz.dataset.cena
      }

      // 4. o contato sobre a luz branca
      const pc = Math.max(0, (P - (ESTRADA + TUNEL) / TOTAL) / (CONTATO / TOTAL))
      contato.current!.dataset.on = pc > 0.15 ? '1' : '0'
    }
    aplicar(0)
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => aplicar(self.progress),
      onRefresh: (self) => aplicar(self.progress),
      onLeaveBack: () => delete raiz.dataset.tunel,
    })
    // o túnel só desenha quando a estrada está perto do fim
    const perto = ScrollTrigger.create({
      trigger: el,
      start: () => `top+=${(ESTRADA - 1.5) * innerHeight} top`,
      end: 'bottom bottom',
      onToggle: (self) => setTunelAtivo(self.isActive),
    })
    return () => {
      st.kill()
      perto.kill()
      delete raiz.dataset.tunel
      delete raiz.dataset.cena
    }
  }, [])

  return (
    <section ref={secao} className={s.trajetoria} aria-labelledby="trajetoria-titulo" data-tema="claro" data-tema-de="top -100%" data-tema-ate="top -102%" style={{ height: `${(TOTAL + 1) * 100}svh` }}>
      <div className={s.trajetoriaFixo} data-robo-cena>
        <div ref={tunel} className={s.tunelFundo} aria-label="Animação: o robô voa por um túnel até o contato">
          <Tunel progresso={progressoTunel} ativo={tunelAtivo} />
        </div>
        <div ref={camada} className={s.estradaCamada} style={{ transformOrigin: `${CENTRO.x * 100}% ${CENTRO.y * 100}%`, ['--cx' as string]: `${CENTRO.x * 100}%`, ['--cy' as string]: `${CENTRO.y * 100}%` }}>
          <h2 id="trajetoria-titulo" className={s.trajetoriaTitulo}>
            Até aqui
          </h2>
          <svg ref={svg} className={s.estrada} viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden>
            <path d={CAMINHO} className={s.estradaFundo} vectorEffect="non-scaling-stroke" />
            <path ref={estrada} d={CAMINHO} className={s.estradaLima} vectorEffect="non-scaling-stroke" />
          </svg>
          <span ref={ponta} className={s.pontaEstrada} data-robo="voar" data-robo-preso aria-hidden />
          <ol className={s.estacoes}>
            {ETAPAS.map((e, i) => (
              <li key={e.quando}>
                <div
                  ref={(el) => {
                    estacoes.current[i] = el
                  }}
                  className={s.estacao}
                  data-lado={e.lado}
                  data-on="0"
                >
                  <span className={s.estacaoPino} aria-hidden />
                  <span className={s.estacaoChip} aria-hidden>
                    {e.quando}
                  </span>
                </div>
                <div
                  ref={(el) => {
                    paineis.current[i] = el
                  }}
                  className={s.estacaoPainel}
                  data-estado="vem"
                >
                  {/* cada linha sobe dentro da própria máscara; o ano rola dígito a dígito */}
                  <span className={s.linhaPainel} style={{ '--k': 0 } as React.CSSProperties}>
                    <span className={s.estacaoAno} aria-label={e.quando}>
                      {[...e.quando].map((c, j) => (
                        <span key={j} aria-hidden style={{ '--c': j } as React.CSSProperties}>
                          {c === ' ' ? '\u00a0' : c}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className={s.linhaPainel} style={{ '--k': 1 } as React.CSSProperties}>
                    <strong>{e.titulo}</strong>
                  </span>
                  <span className={s.linhaPainel} style={{ '--k': 2 } as React.CSSProperties}>
                    <span>{e.texto}</span>
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div ref={aro} className={s.furoAro} style={{ left: `${CENTRO.x * 100}%`, top: `${CENTRO.y * 100}%` }} aria-hidden />
        <div ref={contato} className={s.contatoCamada} data-on="0">
          <Contato />
        </div>
      </div>
    </section>
  )
}
