'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { gsap } from 'gsap'
import { Contato } from './Contato'
import { iniciarAteAqui, pintarCartao } from '@/cena/ateAqui'
import s from './site.module.css'

gsap.registerPlugin(ScrollTrigger)

// O final do site é uma cena só, presa na tela do começo ao fim, para não haver borda de seção nenhuma:
//   1. "Até aqui": a trilha de luz em que os riscos dos projetos se juntaram desce pelo meio e passa entre os
//      cartões da trajetória, que se curvam com a rolagem como a galeria do orchestrated (src/cena/ateAqui.ts).
//      A seção começa por cima do fim dos projetos (margem negativa), transparente: o fundo e a trilha
//      aparecem sobre a linha que já está lá, e a faixa sobe com 0,6 s de atraso (a velocidade curva os cartões).
//   2. o furo: a trilha termina no centro da tela; ali abre-se um buraco com aro azul e a camada cresce em direção a ele
//      (a câmera mergulha). O robô guia para no centro do furo.
//   3. o túnel (Tunel.tsx), que já estava por baixo o tempo todo: o robô do túnel começa pequeno no centro
//      da boca, exatamente onde o guia entrou, e a câmera vai atrás dele.
//   4. a saída do túnel é luz branca; o contato aparece sobre ela, com o robô ainda acenando.

const Tunel = dynamic(() => import('@/cena/Tunel'), { ssr: false })

// datas e textos do README do perfil; o "lugar" de cada uma é o que o próprio texto diz
const ETAPAS = [
  { onde: 'Estácio, 2022–2024', casa: 'Estácio', ano: '22–24', titulo: 'Análise e Desenvolvimento de Sistemas', texto: 'Formação tecnóloga na Estácio.' },
  { onde: 'Graduação, 2025', casa: 'Estácio', ano: '25', titulo: 'Engenharia de Software', texto: 'Graduação em andamento, junto com o trabalho.' },
  { onde: '3D Lab, março de 2026', casa: '3D Lab', ano: '03.26', titulo: 'Estagiário na 3D Lab', texto: 'Entrei por um desafio técnico: um cadastro de produtos em JavaScript puro.' },
  { onde: '3D Lab, junho de 2026', casa: '3D Lab', ano: '06.26', titulo: 'Engenheiro de software júnior', texto: 'ERP, integrações via API e IA aplicada no dia a dia.' },
]

// o furo abre no centro da tela
const CENTRO = { x: 0.5, y: 0.52 }

// quanto da rolagem cada parte usa (em telas)
const ESTRADA = 6.2
const TUNEL = 14
const CONTATO = 1.2
const TOTAL = ESTRADA + TUNEL + CONTATO

const passo = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return k * k * (3 - 2 * k)
}

// linhas de relevo (as do fundo do Lando): curvas de nível de um ruído suave, desenhadas uma vez num canvas.
// A cor vem de quem chama: escura sobre fundo claro, clara sobre o fundo azul do topo
export function desenharRelevo(c: HTMLCanvasElement, cor = 'rgba(5,5,5,0.09)') {
  const w = (c.width = c.offsetWidth)
  const h = (c.height = c.offsetHeight)
  const ctx = c.getContext('2d')
  if (!ctx || !w || !h) return
  const passoGrade = 14
  const cols = Math.ceil(w / passoGrade) + 1
  const lins = Math.ceil(h / passoGrade) + 1
  const ruido = (x: number, y: number) =>
    Math.sin(x * 0.0021 + Math.sin(y * 0.0017) * 2.1) + Math.sin(y * 0.0026 + Math.cos(x * 0.0013) * 1.7) + Math.sin((x + y) * 0.0011) * 0.8
  const v = new Float32Array(cols * lins)
  for (let j = 0; j < lins; j++) for (let i = 0; i < cols; i++) v[j * cols + i] = ruido(i * passoGrade, j * passoGrade)
  ctx.strokeStyle = cor
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let nivel = -2.4; nivel <= 2.4; nivel += 0.4) {
    for (let j = 0; j < lins - 1; j++)
      for (let i = 0; i < cols - 1; i++) {
        const a = v[j * cols + i]! - nivel
        const b = v[j * cols + i + 1]! - nivel
        const cc = v[(j + 1) * cols + i + 1]! - nivel
        const d = v[(j + 1) * cols + i]! - nivel
        const x = i * passoGrade
        const y = j * passoGrade
        const pts: [number, number][] = []
        if (a * b < 0) pts.push([x + (a / (a - b)) * passoGrade, y])
        if (b * cc < 0) pts.push([x + passoGrade, y + (b / (b - cc)) * passoGrade])
        if (cc * d < 0) pts.push([x + (1 - cc / (cc - d)) * passoGrade, y + passoGrade])
        if (d * a < 0) pts.push([x, y + (1 - d / (d - a)) * passoGrade])
        if (pts.length >= 2) {
          ctx.moveTo(pts[0]![0], pts[0]![1])
          ctx.lineTo(pts[1]![0], pts[1]![1])
        }
      }
  }
  ctx.stroke()
}

export function Trajetoria() {
  const secao = useRef<HTMLElement>(null)
  const camada = useRef<HTMLDivElement>(null)
  const aro = useRef<HTMLDivElement>(null)
  const faixa = useRef<HTMLDivElement>(null)
  const tela = useRef<HTMLCanvasElement>(null)
  const ponta = useRef<HTMLSpanElement>(null)
  const contato = useRef<HTMLDivElement>(null)
  const tunel = useRef<HTMLDivElement>(null)
  const progressoTunel = useRef(0)
  const [tunelAtivo, setTunelAtivo] = useState(false)

  useEffect(() => {
    const el = secao.current
    const trilho = faixa.current
    if (!el || !trilho || !camada.current || !aro.current || !contato.current || !tela.current) return
    const raiz = document.documentElement
    let ligado = false
    let vivo = true
    const revelar = [...trilho.querySelectorAll<HTMLElement>('[data-revela]')]
    // a faixa alcança a posição da rolagem com 0,6 s de atraso: é essa velocidade que estica os cartões
    const andar = gsap.quickTo(trilho, 'y', { duration: 0.6, ease: 'power3' })
    // o canvas da trilha e dos cartões (src/cena/ateAqui.ts); os cartões são pintados com a fonte do site
    const estado = { alfa: 0, centro: CENTRO }
    let cena: ReturnType<typeof iniciarAteAqui> = null
    const molduras = [...trilho.querySelectorAll<HTMLElement>('[data-cartao]')]
    // a fonte do site (Cabinet Grotesk 800 e 500) carregada antes de pintar os cartões
    Promise.all([document.fonts.load("800 100px 'Cabinet Grotesk'"), document.fonts.load("500 40px 'Cabinet Grotesk'")]).then(() => {
      if (!vivo || !tela.current) return
      const fonte = "'Cabinet Grotesk', sans-serif"
      const cartoes = molduras.map((m, i) => {
        const e = ETAPAS[i]!
        const largo = i % 2 === 0
        return { el: m, imagem: pintarCartao(largo ? 1600 : 1200, largo ? 1000 : 900, e.ano, e.casa, e.titulo, fonte) }
      })
      cena = iniciarAteAqui(tela.current, trilho, cartoes, estado)
      // sem WebGL, as molduras mostram a imagem parada
      if (!cena) cartoes.forEach((c) => (c.el.style.backgroundImage = `url(${c.imagem.toDataURL('image/jpeg', 0.9)})`))
      else molduras.forEach((m) => (m.dataset.gl = '1'))
    })
    const quadro = (t: number) => cena?.desenhar(t * 1000)
    gsap.ticker.add(quadro)
    // cada texto entra com o bloco azul quando chega a 90 % da altura da tela (uma vez só)
    const revelarVisiveis = () => {
      const H = innerHeight
      let faltam = 0
      revelar.forEach((r) => {
        if (r.dataset.on === '1') return
        const b = r.getBoundingClientRect()
        if (b.top < H * 0.9 && b.bottom > 0 && estado.alfa > 0.5) r.dataset.on = '1'
        else faltam++
      })
      if (!faltam) gsap.ticker.remove(revelarVisiveis)
    }

    const aplicar = (P: number) => {
      // 1. "Até aqui"
      const pe = Math.min(1, P / (ESTRADA / TOTAL))
      const W = innerWidth
      const H = innerHeight
      const telas = pe * ESTRADA
      // o fundo e a trilha aparecem por cima do fim dos projetos (a linha deles está no mesmo lugar)
      estado.alfa = passo(0, 0.3, telas)
      camada.current!.style.backgroundColor = `rgba(2, 3, 26, ${estado.alfa.toFixed(3)})`
      trilho.style.opacity = passo(0.05, 0.3, telas).toFixed(3)
      const comeca = 0.2
      const percurso = ESTRADA - comeca - 1.25
      const anda = Math.min(1, Math.max(0, (telas - comeca) / percurso))
      const distancia = Math.max(0, trilho.scrollHeight - H)
      andar(-distancia * anda)
      // o robô fica fora da tela durante a trilha e sobe até o centro quando o furo vai abrir
      const fimTrilha = comeca + percurso
      const vai = passo(fimTrilha - 0.3, fimTrilha + 0.1, telas)
      if (ponta.current) ponta.current.style.transform = `translate3d(${(W * CENTRO.x).toFixed(1)}px, ${(H * (1.25 + (CENTRO.y - 1.25) * vai)).toFixed(1)}px, 0)`

      // 2. o furo abre onde a trilha termina e a camada cresce em direção a ele
      const abre = gsap.parseEase('power2.in')(Math.min(1, Math.max(0, (telas - (fimTrilha + 0.05)) / (ESTRADA - fimTrilha - 0.05))))
      const raio = abre * Math.hypot(W, H) * 0.62
      camada.current!.style.setProperty('--furo', `${raio.toFixed(1)}px`)
      camada.current!.style.transform = `scale(${1 + abre * 1.6})`
      camada.current!.style.visibility = abre >= 0.999 ? 'hidden' : 'visible'
      tunel.current!.style.visibility = abre > 0 || P > ESTRADA / TOTAL ? 'visible' : 'hidden'
      aro.current!.style.transform = `translate(-50%, -50%) scale(${(raio * 2) / 100})`
      aro.current!.style.opacity = abre > 0 && abre < 0.98 ? '1' : '0'
      ponta.current?.setAttribute('data-robo-escala', (1 + abre * 0.15).toFixed(3))
      // (a caixa do robô 3D inclui a antena e a chama; o guia de escala 1 mede 72 px sem elas: daí o 1,15)

      // 3. o túnel
      const pt2 = Math.min(1, Math.max(0, (P - ESTRADA / TOTAL) / (TUNEL / TOTAL)))
      progressoTunel.current = pt2
      const dentro = abre > 0.2
      if (dentro !== ligado) {
        ligado = dentro
        if (dentro) raiz.dataset.tunel = '1'
        else delete raiz.dataset.tunel
      }
      const escura = abre > 0.3 && pt2 < 0.9
      if ((raiz.dataset.cena === 'escura') !== escura) {
        if (escura) raiz.dataset.cena = 'escura'
        else delete raiz.dataset.cena
      }

      // 4. o contato sobre a luz branca
      const pc = Math.max(0, (P - (ESTRADA + TUNEL) / TOTAL) / (CONTATO / TOTAL))
      contato.current!.dataset.on = pc > 0.15 ? '1' : '0'
      if (pc > 0.15) raiz.dataset.final = '1'
      else delete raiz.dataset.final
    }
    aplicar(0)
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => aplicar(self.progress),
      onRefresh: (self) => {
        aplicar(self.progress)
        cena?.medir()
      },
      onLeaveBack: () => delete raiz.dataset.tunel,
    })
    gsap.ticker.add(revelarVisiveis)
    const perto = ScrollTrigger.create({
      trigger: el,
      start: () => `top+=${(ESTRADA - 1.5) * innerHeight} top`,
      end: 'bottom bottom',
      onToggle: (self) => setTunelAtivo(self.isActive),
    })
    const remedir = () => cena?.medir()
    addEventListener('resize', remedir)
    return () => {
      vivo = false
      st.kill()
      perto.kill()
      gsap.ticker.remove(revelarVisiveis)
      gsap.ticker.remove(quadro)
      removeEventListener('resize', remedir)
      cena?.destruir()
      delete raiz.dataset.tunel
      delete raiz.dataset.cena
      delete raiz.dataset.final
    }
  }, [])

  return (
    <section ref={secao} className={s.trajetoria} aria-labelledby="trajetoria-titulo" data-tema="escuro" style={{ height: `${(TOTAL + 1) * 100}svh` }}>
      <div className={s.trajetoriaFixo} data-robo-cena>
        <div ref={tunel} className={s.tunelFundo} aria-label="Animação: o robô voa por um túnel até o contato">
          <Tunel progresso={progressoTunel} ativo={tunelAtivo} />
        </div>
        <div ref={camada} className={s.estradaCamada} style={{ transformOrigin: `${CENTRO.x * 100}% ${CENTRO.y * 100}%`, ['--cx' as string]: `${CENTRO.x * 100}%`, ['--cy' as string]: `${CENTRO.y * 100}%` }}>
          <canvas ref={tela} className={s.ateCanvas} aria-hidden />
          <div ref={faixa} className={s.ateFaixa}>
            <header className={s.ateTopo}>
              <h2 id="trajetoria-titulo" className={s.expTitulo}>
                <span data-revela className={s.revela}>
                  Até aqui
                </span>
              </h2>
              <p className={s.ateIntro}>
                <span data-revela className={s.revela}>
                  Da primeira formação ao ERP e à IA na 3D Lab, sempre estudando junto com o trabalho.
                </span>
              </p>
            </header>
            <ol className={s.ateLista}>
              {ETAPAS.map((e, i) => (
                <li key={e.onde} className={s.ateItem} data-i={i}>
                  <div data-cartao className={s.ateCartao} role="img" aria-label={`${e.ano}: ${e.titulo}`}>
                    {/* o robô senta no canto de cada cartão, cada vez com um gesto */}
                    <span className={s.ateRobo} data-robo={['sentar', 'joinha', 'acenar', 'dancar'][i]} data-robo-preso aria-hidden />
                  </div>
                  <p className={s.ateLegenda}>
                    <span data-revela className={s.revela}>
                      <b>{e.onde}</b> — {e.titulo}
                    </span>
                  </p>
                  <p className={s.ateTexto}>
                    <span data-revela className={s.revela}>
                      {e.texto}
                    </span>
                  </p>
                </li>
              ))}
            </ol>
          </div>
          <span ref={ponta} className={s.pontaEstrada} data-robo="voar" data-robo-preso aria-hidden />
        </div>
        <div ref={aro} className={s.furoAro} style={{ left: `${CENTRO.x * 100}%`, top: `${CENTRO.y * 100}%` }} aria-hidden />
        <div ref={contato} className={s.contatoCamada} data-on="0">
          <Contato />
        </div>
      </div>
    </section>
  )
}
