'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { gsap } from 'gsap'
import { Contato } from './Contato'
import s from './site.module.css'

gsap.registerPlugin(ScrollTrigger)

// O final do site é uma cena só, presa na tela do começo ao fim, para não haver borda de seção nenhuma:
//   1. a experiência, como a faixa horizontal do Lando (lida no código dele: a faixa anda para o lado de 0 a
//      -(largura da faixa - largura da tela), sem curva e com 1 s de atraso, o scrub: 1; cada "lugar, ano"
//      entra com o bloco lima quando chega a 95 % da tela; a imagem de cada item anda 4 rem dentro da moldura
//      enquanto ele atravessa; o fundo vai do verde-escuro ao branco ao longo da faixa). O fundo começa no
//      mesmo escuro em que os projetos terminam, então a troca de seção não tem borda; as linhas de relevo
//      do Lando aparecem conforme o fundo clareia.
//   2. o furo: no fim da faixa abre-se um buraco com aro lima no centro e a camada cresce em direção a ele
//      (a câmera mergulha). O robô guia para no centro do furo.
//   3. o túnel (Tunel.tsx), que já estava por baixo o tempo todo: o robô do túnel começa pequeno no centro
//      da boca, exatamente onde o guia entrou, e a câmera vai atrás dele.
//   4. a saída do túnel é luz branca; o contato aparece sobre ela, com o robô ainda acenando.

const Tunel = dynamic(() => import('@/cena/Tunel'), { ssr: false })

// datas e textos do README do perfil; o "lugar" de cada uma é o que o próprio texto diz
const ETAPAS = [
  { onde: 'Estácio, 2022–2024', ano: '22–24', titulo: 'Análise e Desenvolvimento de Sistemas', texto: 'Formação tecnóloga na Estácio.' },
  { onde: 'Graduação, 2025', ano: '25', titulo: 'Engenharia de Software', texto: 'Graduação em andamento, junto com o trabalho.' },
  { onde: '3D Lab, março de 2026', ano: '03.26', titulo: 'Estagiário na 3D Lab', texto: 'Entrei por um desafio técnico: um cadastro de produtos em JavaScript puro.' },
  { onde: '3D Lab, junho de 2026', ano: '06.26', titulo: 'Engenheiro de software júnior', texto: 'ERP, integrações via API e IA aplicada no dia a dia.' },
]

// o furo abre no centro da tela
const CENTRO = { x: 0.5, y: 0.52 }

// quanto da rolagem cada parte usa (em telas)
const ESTRADA = 5.6
const TUNEL = 14
const CONTATO = 1.2
const TOTAL = ESTRADA + TUNEL + CONTATO

const passo = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return k * k * (3 - 2 * k)
}
const ESCURO = [5, 5, 5]
const CLARO = [245, 245, 242]
const mistura = (k: number, a = 1) => `rgba(${ESCURO.map((v, i) => Math.round(v + (CLARO[i]! - v) * k)).join(',')},${a.toFixed(3)})`
const tinta = (k: number) => `rgb(${CLARO.map((v, i) => Math.round(v + ([5, 5, 5][i]! - v) * k)).join(',')})`

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
  const relevo = useRef<HTMLCanvasElement>(null)
  const ponta = useRef<HTMLSpanElement>(null)
  const contato = useRef<HTMLDivElement>(null)
  const tunel = useRef<HTMLDivElement>(null)
  const progressoTunel = useRef(0)
  const [tunelAtivo, setTunelAtivo] = useState(false)

  useEffect(() => {
    const el = secao.current
    const trilho = faixa.current
    if (!el || !trilho || !camada.current || !aro.current || !contato.current) return
    const raiz = document.documentElement
    let ligado = false
    const revelar = [...trilho.querySelectorAll<HTMLElement>('[data-revela]')]
    const anos = [...trilho.querySelectorAll<HTMLElement>('[data-ano]')]
    // o scrub: 1 do Lando: a faixa alcança a posição da rolagem com 1 s de atraso
    const andar = gsap.quickTo(trilho, 'x', { duration: 1, ease: 'power3' })
    const medir = () => {
      if (relevo.current) desenharRelevo(relevo.current)
    }
    medir()
    // cada texto e cartão entra com o bloco lima quando chega a 95 % da largura e 90 % da altura da tela
    // (uma vez só): os primeiros entram enquanto a seção ainda sobe, como os dois primeiros itens do Lando
    const revelarVisiveis = () => {
      const W = innerWidth
      const H = innerHeight
      let faltam = 0
      revelar.forEach((r) => {
        if (r.dataset.on === '1') return
        const b = r.getBoundingClientRect()
        if (b.left < W * 0.95 && b.top < H * 0.9 && b.top > -H) r.dataset.on = '1'
        else faltam++
      })
      // a faixa ainda anda depois da rolagem parar (o atraso de 1 s): confere a cada quadro até todos entrarem
      if (!faltam) gsap.ticker.remove(revelarVisiveis)
    }

    const aplicar = (P: number) => {
      // 1. a faixa da experiência
      const pe = Math.min(1, P / (ESTRADA / TOTAL))
      const W = innerWidth
      const H = innerHeight
      // em telas desde que a cena prendeu: o título só começa a entrar quando a fila dos projetos já saiu
      const telas = pe * ESTRADA
      const comeca = 0.15
      const anda = Math.min(1, Math.max(0, (telas - comeca) / 3.1))
      const distancia = Math.max(0, trilho.scrollWidth - W)
      andar(-distancia * anda)
      // o relevo do fundo anda para o lado oposto, a 25 % (contra-movimento: dá profundidade à faixa)
      if (relevo.current) relevo.current.style.transform = `translate3d(${(distancia * anda * 0.25 - W * 0.3).toFixed(1)}px, 0, 0)`
      // clara desde o começo: a seção dos projetos termina na página clara, com a pílula fechando
      const claro = 1
      camada.current!.style.backgroundColor = mistura(claro)
      camada.current!.style.color = tinta(claro)
      camada.current!.style.setProperty('--claro', claro.toFixed(3))
      // o ano anda 4 rem dentro da moldura enquanto o cartão atravessa a tela
      anos.forEach((a) => {
        const caixa = a.parentElement!.getBoundingClientRect()
        const k = Math.min(1, Math.max(0, 1 - caixa.left / W))
        a.style.transform = `translate3d(${(-2 + k * 4).toFixed(2)}rem, 0, 0)`
      })
      // o robô fica fora da tela durante a faixa (não passa por cima dos textos) e sobe até o centro quando o
      // furo vai abrir
      const vai = passo(comeca + 3.0, comeca + 3.4, telas)
      if (ponta.current) ponta.current.style.transform = `translate3d(${(W * CENTRO.x).toFixed(1)}px, ${(H * (1.25 + (CENTRO.y - 1.25) * vai)).toFixed(1)}px, 0)`

      // 2. o furo abre e a estrada cresce em direção a ele
      const abre = gsap.parseEase('power2.in')(Math.min(1, Math.max(0, (telas - (comeca + 3.3)) / (ESTRADA - comeca - 3.3))))
      const raio = abre * Math.hypot(W, H) * 0.62
      camada.current!.style.setProperty('--furo', `${raio.toFixed(1)}px`)
      camada.current!.style.transform = `scale(${1 + abre * 1.6})`
      camada.current!.style.visibility = abre >= 0.999 ? 'hidden' : 'visible'
      // o túnel só aparece quando o furo abre (antes disso, por baixo da cena, ainda se vê a seção anterior)
      tunel.current!.style.visibility = abre > 0 || P > ESTRADA / TOTAL ? 'visible' : 'hidden'
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
      // o cabeçalho volta a aparecer no contato
      if (pc > 0.15) raiz.dataset.final = '1'
      else delete raiz.dataset.final
    }
    aplicar(0)
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => aplicar(self.progress),
      onRefresh: (self) => (medir(), aplicar(self.progress)),
      onLeaveBack: () => delete raiz.dataset.tunel,
    })
    gsap.ticker.add(revelarVisiveis)
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
      gsap.ticker.remove(revelarVisiveis)
      delete raiz.dataset.tunel
      delete raiz.dataset.cena
      delete raiz.dataset.final
    }
  }, [])

  return (
    <section ref={secao} className={s.trajetoria} aria-labelledby="trajetoria-titulo" data-tema="claro" data-tema-de="top -40%" data-tema-ate="top -42%" style={{ height: `${(TOTAL + 1) * 100}svh` }}>
      <div className={s.trajetoriaFixo} data-robo-cena>
        <div ref={tunel} className={s.tunelFundo} aria-label="Animação: o robô voa por um túnel até o contato">
          <Tunel progresso={progressoTunel} ativo={tunelAtivo} />
        </div>
        <div ref={camada} className={s.estradaCamada} style={{ transformOrigin: `${CENTRO.x * 100}% ${CENTRO.y * 100}%`, ['--cx' as string]: `${CENTRO.x * 100}%`, ['--cy' as string]: `${CENTRO.y * 100}%` }}>
          <canvas ref={relevo} className={s.relevo} aria-hidden />
          <div ref={faixa} className={s.faixaExp}>
            <div className={s.expAbre}>
              <h2 id="trajetoria-titulo" className={s.expTitulo}>
                <span data-revela className={s.revela}>
                  Até
                </span>
                <span data-revela className={s.revela}>
                  aqui
                </span>
              </h2>
            </div>
            <ol className={s.expLista}>
              {ETAPAS.map((e, i) => (
                <li key={e.onde} className={s.expItem} data-i={i}>
                  <p className={s.expOnde}>
                    <span data-revela className={s.revela}>
                      {e.onde}
                    </span>
                  </p>
                  <div data-revela className={s.expCartao} aria-hidden>
                    <span data-ano className={s.expAno} style={{ '--n': e.ano.length } as React.CSSProperties}>
                      {e.ano}
                    </span>
                  </div>
                  <h3 className={s.expNome}>
                    <span data-revela className={s.revela}>
                      {e.titulo}
                    </span>
                  </h3>
                  <p className={s.expTexto}>
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
