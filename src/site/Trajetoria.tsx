'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { gsap } from 'gsap'
import { Contato } from './Contato'
import { iniciarAteAqui, pintarCartao } from '@/cena/ateAqui'
import { vigiarContexto } from '@/cena/contexto'
import { iniciarPortal } from '@/cena/portalTunel'
import { bocaTela, chegadaContato, escalaDoRoboNaBoca, raioDaBocaNaTela } from '@/cena/trilhaTela'
import s from './site.module.css'
import { agendar, aguardar, sinalFeito, sinalizar } from './fila'
import { TEXTOS } from '@/content/textos'
import { useIdioma, useTextos } from '@/content/idioma'

gsap.registerPlugin(ScrollTrigger)

// O final do site é uma cena só, presa na tela do começo ao fim, para não haver borda de seção nenhuma:
//   1. "Até aqui": a trilha de luz em que os riscos dos projetos se juntaram desce pelo meio e passa entre os
//      cartões da trajetória, que se curvam com a rolagem (src/cena/ateAqui.ts).
//      A seção começa por cima do fim dos projetos (margem negativa), transparente: o fundo e a trilha
//      aparecem sobre a linha que já está lá, e a faixa sobe com 0,6 s de atraso (a velocidade curva os cartões).
//   2. o furo: a trilha termina no centro da tela; ali abre-se um buraco com aro azul e a camada cresce em direção a ele
//      (a câmera mergulha). O robô guia para no centro do furo.
//   3. o túnel (Tunel.tsx), que já estava por baixo o tempo todo: o robô do túnel começa pequeno no centro
//      da boca, exatamente onde o guia entrou, e a câmera vai atrás dele.
//   4. a saída do túnel é o escuro; o contato (a coluna de fios de luz e o vidro) aparece nele, com o robô ainda acenando.

const Tunel = dynamic(() => import('@/cena/Tunel'), { ssr: false })

// datas e textos do README do perfil; o "lugar" de cada uma é o que o próprio texto diz
// (os textos de cada etapa, nos dois idiomas, ficam em src/content/textos.ts)

// o furo abre no centro da tela
const CENTRO = { x: 0.5, y: 0.52 }
// px de deslocamento da âncora dos pés do robô guia, por unidade de escala, para o centro dele cair onde o robô do túnel aparece
const ANCORA_PES = 16.6

// quanto da rolagem cada parte usa (em telas)
const ESTRADA = 7.7
// telas de rolagem reservadas, no fim da estrada, para o furo abrir (eram 1,25: rolando rápido, a abertura mal aparecia)
const RESERVA_FURO = 2.75
const TUNEL = 14
const CONTATO = 3.6
const TOTAL = ESTRADA + TUNEL + CONTATO

// O buraco por onde o robô entra no túnel: um círculo recortado da camada da estrada (subcaminho para o evenodd). O buraco
// negro desenhado em volta dele está em src/cena/buracoNegro.ts
const circuloOco = (cx: number, cy: number, r: number) => 'M' + (cx - r).toFixed(1) + ' ' + cy.toFixed(1) + 'a' + r.toFixed(1) + ' ' + r.toFixed(1) + ' 0 1 0 ' + (2 * r).toFixed(1) + ' 0a' + r.toFixed(1) + ' ' + r.toFixed(1) + ' 0 1 0 ' + (-2 * r).toFixed(1) + ' 0Z'

const passo = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return k * k * (3 - 2 * k)
}

// linhas de relevo: curvas de nível de um ruído suave, desenhadas uma vez num canvas.
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
  const t = useTextos()
  const secao = useRef<HTMLElement>(null)
  const camada = useRef<HTMLDivElement>(null)
  const aro = useRef<HTMLCanvasElement>(null)
  const faixa = useRef<HTMLDivElement>(null)
  const tela = useRef<HTMLCanvasElement>(null)
  const ponta = useRef<HTMLSpanElement>(null)
  const contato = useRef<HTMLDivElement>(null)
  const tunel = useRef<HTMLDivElement>(null)
  const progressoTunel = useRef(0)
  const [tunelAtivo, setTunelAtivo] = useState(false)
  // o túnel e os cartões em WebGL só são criados quando o visitante chega perto (ou o navegador fica ocioso)
  const [montarTunel, setMontarTunel] = useState(false)

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
    const estado = { alfa: 0, centro: CENTRO, recolhe: 0, cartoes: 1 }
    let cena: ReturnType<typeof iniciarAteAqui> = null
    let soltarContexto: (() => void) | null = null
    const molduras = [...trilho.querySelectorAll<HTMLElement>('[data-cartao]')]
    // a fonte do site (Cabinet Grotesk 800 e 500) carregada antes de pintar os cartões
    // O túnel e os cartões entram na fila de montagem (src/site/fila.ts), um de cada vez, depois do retrato, do robô,
    // do vale e dos projetos; se a tela chegar perto da cena antes disso, montam na hora.
    const cancelarTunel = agendar({
      nome: 'tunel',
      ordem: 4,
      el,
      margem: '250% 0px',
      rodar: () => {
        setMontarTunel(true)
        return aguardar('tunel', 15000)
      },
    })
    const cancelarCartoes = agendar({
      nome: 'ate-aqui',
      ordem: 5,
      el,
      margem: '250% 0px',
      rodar: async () => {
        // a trilha começa na linha das Obras (src/cena/trilhaTela.ts): se a visita pulou direto até aqui, espera as Obras
        // montarem e publicarem essa linha (no máximo 12 s), senão a trilha nasce como uma reta
        if (!sinalFeito('obras')) await aguardar('obras', 12000)
        await Promise.all([document.fonts.load("800 100px 'Cabinet Grotesk'"), document.fonts.load("500 40px 'Cabinet Grotesk'")])
        if (!vivo || !tela.current) return
        const fonte = "'Cabinet Grotesk', sans-serif"
        // um cartão por vez, com uma pausa entre eles (pintar os quatro de uma vez prendia a thread por centenas de ms)
        const cartoes: { el: HTMLElement; imagem: HTMLCanvasElement }[] = []
        // os cartões são pintados uma vez, no idioma escolhido na abertura
        const etapas = TEXTOS[useIdioma.getState().idioma ?? 'pt'].trajetoria.etapas
        for (let i = 0; i < molduras.length; i++) {
          const e = etapas[i]!
          const largo = i % 2 === 0
          cartoes.push({ el: molduras[i]!, imagem: pintarCartao(largo ? 1600 : 1200, largo ? 1000 : 900, e.ano, e.casa, e.titulo, fonte) })
          await new Promise<void>((ok) => setTimeout(ok, 0))
          if (!vivo || !tela.current) return
        }
        cena = iniciarAteAqui(tela.current, trilho, cartoes, estado)
        // contexto WebGL perdido e devolvido pelo navegador: a trilha e os cartões são refeitos no mesmo canvas
        soltarContexto = vigiarContexto(tela.current, () => {
          if (!vivo || !tela.current) return
          soltarContexto?.()
      cena?.destruir()
          cena = iniciarAteAqui(tela.current, trilho, cartoes, estado)
          desenhando = false
        })
        // sem WebGL, as molduras mostram a imagem parada
        if (!cena) cartoes.forEach((c) => (c.el.style.backgroundImage = `url(${c.imagem.toDataURL('image/jpeg', 0.9)})`))
        else molduras.forEach((m) => (m.dataset.gl = '1'))
        // os cartões estão pintados: o menu (Cabecalho.tsx) sabe que trocar o idioma agora pede recarregar a página para pintá-los de novo
        sinalizar('ate-aqui')
      },
    })
    // Renderização sob demanda: o canvas dos cartões e da trilha só desenha enquanto o fundo desta cena está visível
    // (alfa > 0) e a camada não foi coberta pelo furo; ao sair, desenha um último quadro, que limpa o canvas. Antes,
    // ele limpava e lia o layout 60 vezes por segundo a página inteira, mesmo no topo e no contato.
    let desenhando = false
    const quadro = (t: number) => {
      if (!cena) return
      const quer = estado.alfa > 0.001 && camada.current!.style.visibility !== 'hidden'
      if (quer && !desenhando) cena.retomar()
      if (quer || desenhando) cena.desenhar(t * 1000)
      desenhando = quer
    }
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

    // a boca do túnel em volta do furo (src/cena/portalTunel.ts): criada só quando o furo começa a abrir, desenhado a cada
    // quadro enquanto aparece (o gás gira) e apagado quando o furo já cobre a tela
    const tinta = aro.current!
    let buraco: ReturnType<typeof iniciarPortal> = null
    let tentouBuraco = false
    let soltarBuracoCtx: (() => void) | null = null
    const bn = { W: 0, H: 0, R: 0, vis: 0, ultimo: 0, boca: 1 }
    const criarBuraco = () => {
      tentouBuraco = true
      buraco = iniciarPortal(tinta)
      if (buraco)
        soltarBuracoCtx = vigiarContexto(tinta, () => {
          buraco?.destruir()
          buraco = iniciarPortal(tinta)
        })
    }
    const quadroBuraco = (t: number) => {
      if (!buraco) return
      tinta.style.opacity = bn.vis > 0 ? '1' : '0'
      if (bn.vis > 0 || bn.ultimo > 0) buraco.desenhar(bn.W, bn.H, bn.W * CENTRO.x, bn.H * CENTRO.y, bn.R, bn.vis, t, bn.boca)
      bn.ultimo = bn.vis
    }
    gsap.ticker.add(quadroBuraco)

    // tudo o que depende de quanto o furo está aberto (`abre`, de 0 a 1): o recorte da camada, a escala dela, a boca do túnel em
    // volta, o robô guia na entrada e os marcadores do túnel
    const ab = { alvo: 0, atual: 0, P: 0, vai: 0, pt2: 0 }
    const aplicarAbre = (abre: number) => {
      const W = innerWidth
      const H = innerHeight
      const { P, vai, pt2 } = ab
      const raio = abre * Math.hypot(W, H) * 0.62
      // o buraco é um círculo recortado da camada; a boca do túnel desenhada em volta tem o raio que ele mostra na tela
      camada.current!.style.clipPath = raio > 0.5 ? `path(evenodd, 'M0 0H${W}V${H}H0Z${circuloOco(W * CENTRO.x, H * CENTRO.y, raio)}')` : 'none'
      bn.W = W
      bn.H = H
      bn.R = raio * (1 + abre * 1.6)
      bn.boca = bn.R > 1 ? Math.min(1, raioDaBocaNaTela(bn.R, H) / bn.R) : 1
      bn.vis = abre > 0 && abre < 0.97 ? Math.min(1, abre * 10) * (1 - passo(0.75, 0.97, abre)) : 0
      if (bn.vis > 0 && !tentouBuraco) criarBuraco()
      camada.current!.style.transform = `scale(${1 + abre * 1.6})`
      camada.current!.style.visibility = abre >= 0.999 ? 'hidden' : 'visible'
      tunel.current!.style.visibility = abre > 0 || P > ESTRADA / TOTAL ? 'visible' : 'hidden'
      // o robô do túnel tem o tamanho proporcional à altura da janela e o guia tem px fixos: a escala do guia na entrada segue
      // o raio do furo (a câmera do túnel se aproxima junto) e a altura da janela
      bocaTela.R = bn.R
      bocaTela.H = H
      const escalaRobo = 1 + (escalaDoRoboNaBoca(bn.R, H) - 1) * vai
      ponta.current?.setAttribute('data-robo-escala', escalaRobo.toFixed(3))
      // o centro do robô do túnel fica, em relação ao centro do furo, a uma distância proporcional ao tamanho dele; o guia é
      // ancorado pelos pés, então o deslocamento da âncora tem de crescer com a escala (16,6 px por unidade, medido na tela)
      if (ponta.current) ponta.current.style.transform = `translate3d(${(W * CENTRO.x).toFixed(1)}px, ${(H * (1.25 + (CENTRO.y - 1.25) * vai) + ANCORA_PES * escalaRobo * vai).toFixed(1)}px, 0)`
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
    }
    // o furo que se vê segue o alvo da rolagem: ~0,5 s para abrir, ~0,15 s para fechar
    const suavizarAbre = (_t: number, dtMs: number) => {
      const dif = ab.alvo - ab.atual
      if (dif === 0) return
      if (Math.abs(dif) < 0.0004) ab.atual = ab.alvo
      // abre devagar (0,5 s), mas fecha rápido: numa rolagem rápida para cima o furo ficava aberto por cima dos cartões por mais de 1 s
      else ab.atual += dif * (1 - Math.exp(-(dtMs / 1000) * (dif < 0 ? 7.0 : 2.0)))
      aplicarAbre(ab.atual)
    }
    gsap.ticker.add(suavizarAbre)

    const aplicar = (P: number, snap = false) => {
      // 1. "Até aqui"
      const pe = Math.min(1, P / (ESTRADA / TOTAL))
      const W = innerWidth
      const H = innerHeight
      const telas = pe * ESTRADA
      // o fundo e a trilha aparecem por cima do fim dos projetos (a linha deles está no mesmo lugar)
      // o fundo cobre as Obras logo (0,14 telas): enquanto ele é parcial, a linha das Obras aparece por baixo da trilha nova, em outro
      // lugar, e a linha saía em dobro
      estado.alfa = passo(0, 0.14, telas)
      // a trilha que vem das Obras é puxada para cima e some, em vez de descer entre os cartões
      estado.recolhe = passo(0.1, 1.2, telas)
      camada.current!.style.backgroundColor = `rgba(2, 3, 26, ${estado.alfa.toFixed(3)})`
      trilho.style.opacity = passo(0.05, 0.3, telas).toFixed(3)
      const comeca = 0.2
      const percurso = ESTRADA - comeca - RESERVA_FURO
      const anda = Math.min(1, Math.max(0, (telas - comeca) / percurso))
      const distancia = Math.max(0, trilho.scrollHeight - H)
      andar(-distancia * anda)
      // o robô fica fora da tela durante a trilha e sobe até o centro quando o furo vai abrir
      const fimTrilha = comeca + percurso
      // os cartões e os textos saem de cena quando o furo começa a abrir (o último, esticado pela velocidade da rolagem e
      // ampliado com a camada, virava uma fita branca no canto da tela)
      estado.cartoes = 1 - passo(fimTrilha - 0.1, fimTrilha + 0.3, telas)
      trilho.style.opacity = (passo(0.05, 0.3, telas) * estado.cartoes).toFixed(3)
      const vai = passo(fimTrilha - 0.3, fimTrilha + 0.1, telas)

      // 2. o furo abre onde a trilha termina e a camada cresce em direção a ele. O alvo vem da rolagem; o furo que se vê o
      // segue no tempo (suavizarAbre), então a abertura leva cerca de um segundo mesmo com rolagem rápida, e o fechamento também
      ab.alvo = gsap.parseEase('power1.inOut')(Math.min(1, Math.max(0, (telas - (fimTrilha + 0.05)) / (ESTRADA - fimTrilha - 0.05))))
      ab.P = P
      ab.vai = vai
      if (snap) ab.atual = ab.alvo
      // 3. o túnel (progresso da rolagem)
      ab.pt2 = Math.min(1, Math.max(0, (P - ESTRADA / TOTAL) / (TUNEL / TOTAL)))
      progressoTunel.current = ab.pt2
      aplicarAbre(ab.atual)

      // 4. a chegada ao contato, presa à rolagem (subir desfaz exatamente o que descer fez): começa 1,6 tela antes do fim do túnel,
      // quando o núcleo aparece à frente e o robô voa até ele; o túnel some enquanto a cena brota do núcleo; o vidro entra no fim
      const ch = Math.min(1, Math.max(0, (P - (ESTRADA + TUNEL - 2.2) / TOTAL) / ((2.2 + CONTATO * 0.9) / TOTAL)))
      chegadaContato.p = ch
      contato.current!.dataset.on = ch > 0.001 ? '1' : '0'
      tunel.current!.style.opacity = (1 - passo(0.4, 0.56, ch)).toFixed(3)
      if (ch > 0.55) raiz.dataset.final = '1'
      else delete raiz.dataset.final
    }
    aplicar(0, true)
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => aplicar(self.progress),
      onRefresh: (self) => {
        aplicar(self.progress, true)
        cena?.medir()
      },
      onLeaveBack: () => delete raiz.dataset.tunel,
    })
    gsap.ticker.add(revelarVisiveis)
    const perto = ScrollTrigger.create({
      trigger: el,
      start: () => `top+=${(ESTRADA - 3.0) * innerHeight} top`,
      end: 'bottom bottom',
      onToggle: (self) => setTunelAtivo(self.isActive),
    })
    const remedir = () => cena?.medir()
    addEventListener('resize', remedir)
    return () => {
      vivo = false
      cancelarTunel()
      cancelarCartoes()
      st.kill()
      perto.kill()
      gsap.ticker.remove(revelarVisiveis)
      gsap.ticker.remove(quadro)
      gsap.ticker.remove(quadroBuraco)
      gsap.ticker.remove(suavizarAbre)
      soltarBuracoCtx?.()
      buraco?.destruir()
      removeEventListener('resize', remedir)
      cena?.destruir()
      delete raiz.dataset.tunel
      delete raiz.dataset.cena
      delete raiz.dataset.final
    }
  }, [])

  return (
    <section ref={secao} id="trajetoria" className={s.trajetoria} aria-labelledby="trajetoria-titulo" data-tema="escuro" style={{ height: `${(TOTAL + 1) * 100}svh` }}>
      <div className={s.trajetoriaFixo} data-robo-cena>
        <div ref={tunel} className={s.tunelFundo} aria-label={t.trajetoria.tunel}>
          {montarTunel && <Tunel progresso={progressoTunel} ativo={tunelAtivo} />}
        </div>
        <div ref={camada} className={s.estradaCamada} style={{ transformOrigin: `${CENTRO.x * 100}% ${CENTRO.y * 100}%`, ['--cx' as string]: `${CENTRO.x * 100}%`, ['--cy' as string]: `${CENTRO.y * 100}%` }}>
          <canvas ref={tela} className={s.ateCanvas} aria-hidden />
          <div ref={faixa} className={s.ateFaixa}>
            <header className={s.ateTopo}>
              <h2 id="trajetoria-titulo" className={s.expTitulo}>
                <span data-revela className={s.revela}>
                  {t.trajetoria.titulo}
                </span>
              </h2>
              <p className={s.ateIntro}>
                <span data-revela className={s.revela}>
                  {t.trajetoria.intro}
                </span>
              </p>
            </header>
            {/* a chave dos itens é o índice: o texto muda com o idioma e o React recriaria os elementos que a cena WebGL já pegou */}
            <ol className={s.ateLista}>
              {t.trajetoria.etapas.map((e, i) => (
                <li key={i} className={s.ateItem} data-i={i}>
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
        <canvas ref={aro} className={s.buracoTela} aria-hidden />
        <div ref={contato} className={s.contatoCamada} data-on="0">
          <Contato />
        </div>
      </div>
    </section>
  )
}
