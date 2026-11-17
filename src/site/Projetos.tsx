'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { EasePack } from 'gsap/EasePack'
import { projetos } from '@/content/projetos'
import s from './site.module.css'

gsap.registerPlugin(ScrollTrigger, EasePack)

// A apresentação dos projetos do wodniack.dev (lida no JS e no CSS dele; ver docs/ENGENHARIA_REVERSA.md),
// com os números dele:
//   1. o portal: a página tem uma pílula recortada (a "régua", 80 % da altura) com uma grade em volta; pela
//      pílula se vê a cena escura com a palavra CÓDIGO na vertical, uma letra embaixo da outra;
//   2. presa à rolagem (scrub 1, de "top 25%" a "bottom 75%"), a pílula cresce até engolir a tela (power4.in),
//      a cena vai de 0,75 a 1 de escala, a grade de pontos se junta e cada letra se abre numa fileira curva de
//      cópias de si mesma, que corre como letreiro (cada fileira na sua velocidade);
//   3. os prints dos projetos atravessam a cena da direita para a esquerda, um depois do outro (no dele, um a
//      cada 0,25 com slow(0.15, 0.6); aqui, com seis trabalhos, mais espaçados e devagar no meio): entram girados e afundados, passam retos pelo centro e saem girados para o outro
//      lado; algumas letras passam na frente deles;
//   4. no fim, tudo volta e a saída é pela pílula.
// Cada print tem a legenda do projeto embaixo e leva ao link dele. O robô guia não aparece aqui.

const PALAVRA = ['C', 'Ó', 'D', 'I', 'G', 'O']

type Link = { rotulo: string; href: string }
type Cartao = { chave: string; nome: string; frase: string; links: Link[]; imagem?: string; alt?: string; palavras?: string[] }

const CARTOES: Cartao[] = projetos.flatMap((p): Cartao[] => {
  const base = { nome: p.nome, frase: p.frase, links: p.links }
  if (p.telas) return [0, 2, 4].map((i) => ({ ...base, chave: `${p.id}-${i}`, imagem: p.telas![i], alt: p.imagem?.alt }))
  if (p.imagem) return [{ ...base, chave: p.id, imagem: p.imagem.src, alt: p.imagem.alt }]
  return [{ ...base, chave: p.id, palavras: p.palavras }]
})

// a lente gravitacional (a da Gargantua): um ponto de massa no centro desvia a luz das letras. Para cada pixel
// a uma distância θ do centro, a luz vem de θ − θE²/θ (a equação da lente de ponto), com o raio de Einstein θE.
// O mapa de deslocamento guarda esse desvio (vermelho = x, verde = y, 0,5 = parado) e o feDisplacementMap aplica.
// Longe do centro o desvio some suavemente, para as bordas da tela não se mexerem.
function mapaDaLente(W: number, H: number, raioEinstein: number, escala: number) {
  const f = 4
  const w = Math.ceil(W / f)
  const h = Math.ceil(H / f)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(w, h)
  const cx = W / 2
  const cy = H / 2
  const longe = Math.min(W, H) * 0.75
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const dx = i * f - cx
      const dy = j * f - cy
      const r = Math.max(1, Math.hypot(dx, dy))
      const t = Math.min(1, Math.max(0, (r - longe * 0.6) / (longe * 0.4)))
      const some = 1 - t * t * (3 - 2 * t)
      // limitado a metade da distância ao centro: a luz nunca vem do lado oposto, então o centro só aumenta e
      // nunca vira um buraco
      const desvio = Math.min(r * 0.5, (raioEinstein * raioEinstein) / r) * some
      const k = (j * w + i) * 4
      img.data[k] = Math.round(255 * Math.min(1, Math.max(0, 0.5 - ((dx / r) * desvio) / escala)))
      img.data[k + 1] = Math.round(255 * Math.min(1, Math.max(0, 0.5 - ((dy / r) * desvio) / escala)))
      img.data[k + 2] = 128
      img.data[k + 3] = 255
    }
  ctx.putImageData(img, 0, 0)
  return c.toDataURL()
}

export function Projetos() {
  const raiz = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = raiz.current
    if (!el) return
    const conteiner = el.querySelector<HTMLElement>('[data-conteiner]')!
    const cena = el.querySelector<HTMLElement>('[data-cena]')!
    const letrasAtras = el.querySelector<HTMLElement>('[data-letras-atras]')!
    const letrasFrente = el.querySelector<HTMLElement>('[data-letras-frente]')!
    const lente = el.querySelector<SVGFEImageElement>('[data-lente-mapa]')!
    const desvio = el.querySelector<SVGFEDisplacementMapElement>('[data-lente-desvio]')!
    const titulo = el.querySelector<HTMLElement>('[data-titulo]')!
    const canvas = el.querySelector<HTMLCanvasElement>('[data-canvas]')!
    const ctx = canvas.getContext('2d')!
    const mascara = el.querySelector<HTMLElement>('[data-mascara]')!
    const svg = mascara.querySelector('svg')!
    const caminhoFora = svg.querySelector<SVGPathElement>('[data-fora]')!
    const caminhoGrade = svg.querySelector<SVGPathElement>('[data-grade]')!
    const contornos = [...svg.querySelectorAll<SVGPathElement>('[data-contorno]')]
    const regua = el.querySelector<HTMLElement>('[data-regua]')!
    const trabalhos = [...el.querySelectorAll<HTMLElement>('[data-trabalho]')]

    const estado = { estado: 0, pontos: 0, animacao: 0, escalaMaxima: 1 }
    const prog = trabalhos.map(() => ({ v: 1 }))
    type Fantasma = { el: HTMLSpanElement }
    const letras: { el: HTMLElement; freq: number; total: number; fantasmas: Fantasma[] }[] = []
    let pontos: { x: number; y: number; dx: number; dy: number }[] = []
    let W = innerWidth
    let H = innerHeight
    let velocidade = 1
    let tl: gsap.core.Timeline | null = null

    const medida = { w: 0, h: 0, x: 0, y: 0, pw: 0, ph: 0 }
    const pilula = (x: number, y: number, pw: number, ph: number) => {
      const r = pw / 2
      return `M ${x} ${y + r} A ${r} ${r} 0 0 1 ${x + pw} ${y + r} L ${x + pw} ${y + ph - r} A ${r} ${r} 0 0 1 ${x} ${y + ph - r} Z`
    }
    // a máscara: a tela inteira menos a pílula (evenodd), uma segunda pílula 16 px para dentro e a grade de
    // 12 colunas e linhas a cada 10 % da altura, recortada para fora da pílula
    const montarMascara = () => {
      const w = mascara.clientWidth
      const h = mascara.clientHeight
      svg.setAttribute('width', String(w))
      svg.setAttribute('height', String(h))
      // a régua fica no contêiner fixo (a tela inteira): a posição dela já é a posição na tela
      Object.assign(medida, { w, h, x: regua.offsetLeft, y: regua.offsetTop, pw: regua.offsetWidth, ph: regua.offsetHeight })
      estado.escalaMaxima = W / (medida.pw / 2)
      const { x, y, pw, ph } = medida
      const caixa = `M -1 -2 L ${w + 2} -2 L ${w + 2} ${h + 2} L -1 ${h + 2} Z`
      const fora = `${caixa} ${pilula(x, y, pw, ph)}`
      caminhoFora.setAttribute('d', fora)
      // o contorno duplo do dele: a pílula e outra 16 px para dentro, as duas com o mesmo centro
      const d = W > 767 ? 16 : 8
      contornos[0]!.setAttribute('d', pilula(x, y, pw, ph))
      contornos[1]!.setAttribute('d', pilula(x + d, y + d, pw - 2 * d, ph - 2 * d))
      // a grade: 12 colunas (8 no celular) e uma linha a cada 10 % da altura, a mesma de "Sistemas que se
      // explicam" (site.module.css, .ideia::before), então ela continua de uma seção para a outra sem borda
      const colunas = W > 767 ? 12 : 8
      let g = ''
      for (let i = 1; i < colunas; i++) g += `M ${(w / colunas) * i} 0 L ${(w / colunas) * i} ${h} `
      for (let j = 0; j < 10; j++) g += `M 0 ${h * 0.1 * j} L ${w} ${h * 0.1 * j} `
      caminhoGrade.setAttribute('d', g)
      caminhoGrade.style.clipPath = `path(evenodd, '${fora}')`
    }

    // cada letra de CÓDIGO vira uma fileira de cópias: round(largura ÷ largura da letra × 0,75) + 2
    const montarLetras = () => {
      letras.forEach((l) => l.fantasmas.forEach((f) => f.el.remove()))
      letras.length = 0
      const cx = cena.getBoundingClientRect()
      titulo.querySelectorAll<HTMLElement>('[data-letra]').forEach((letra, linha) => {
        const r = letra.getBoundingClientRect()
        const total = Math.round((W / r.width) * (W > 767 ? 0.75 : 0.5)) + 2
        const fantasmas: Fantasma[] = []
        for (let i = 0; i < total; i++) {
          const f = document.createElement('span')
          f.className = s.letraCena!
          f.dataset.linha = String(linha)
          f.textContent = letra.textContent
          f.dataset.letra = letra.textContent ?? ''
          f.style.top = `${r.top - cx.top}px`
          f.style.left = `${r.left - cx.left}px`
          f.style.setProperty('--iy', String(((linha + 1) / (PALAVRA.length + 1) - 0.5) * 2))
          // algumas cópias passam na frente dos prints, as outras atrás (o z-index 3 / 1 do dele, em duas camadas)
          const frente = linha !== 1 && linha !== 2 && (linha + PALAVRA.length + i) % 5 === 0
          ;(frente ? letrasFrente : letrasAtras).appendChild(f)
          fantasmas.push({ el: f })
        }
        letras.push({ el: letra, freq: 1 + Math.random(), total, fantasmas })
      })
    }

    const montarPontos = () => {
      canvas.width = W
      canvas.height = H
      pontos = []
      const passo = 24
      const cols = Math.ceil((W * 1.2) / passo)
      const lins = Math.ceil((H * 1.2) / passo)
      const ox = (W - cols * passo) * 0.5
      const oy = (H - lins * passo) * 0.5
      for (let i = 0; i < cols; i++)
        for (let j = 0; j < lins; j++) {
          const x = i * passo + ox
          const y = j * passo + oy
          pontos.push({ x, y, dx: W * 0.5 - x, dy: H * 0.5 - y })
        }
    }

    const montarTrabalhos = () => {
      trabalhos.forEach((t, i) => {
        t.style.setProperty('--tamanho', String(0.5 + Math.random() * 0.5))
        t.style.setProperty('--y', String((0.5 + Math.random() * 0.5) * (i % 2 ? -1 : 1)))
      })
    }

    // a linha do tempo, igual à dele
    const montarLinha = () => {
      tl?.kill()
      tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 25%', end: 'bottom 75%', scrub: 1 } })
      tl.fromTo(mascara, { scale: 1 }, { scale: estado.escalaMaxima, duration: 0.75, ease: 'power4.in' }, 0)
        .fromTo(cena, { scale: 0.75 }, { scale: 1, duration: 0.75, ease: 'power3.in' }, 0)
        .fromTo(conteiner, { clipPath: 'inset(0 1rem)' }, { clipPath: 'inset(0 0rem)', duration: 0.75, ease: 'power3.in' }, 0)
        .fromTo(estado, { pontos: 0 }, { pontos: 1, duration: 1, ease: 'power4.inOut' }, 0)
        .fromTo(estado, { estado: 0 }, { estado: 1, duration: 0.75, ease: 'power4.in' }, 0)
        // no dele são 20 trabalhos (0,5 de duração, 0,25 entre um e outro, slow(0.15, 0.6)) e sempre há algum na
        // tela; aqui são seis, então cada um fica mais tempo atravessando e devagar no meio, mais espaçados
        .fromTo(prog, { v: 1 }, { v: -1, duration: 1.1, ease: 'slow(0.5, 0.45)', stagger: 0.5 }, 0.75)
      tl.fromTo(estado, { animacao: 0 }, { animacao: 1e4, duration: tl.totalDuration(), ease: 'power1.out' }, 0.75)
        .fromTo(estado, { estado: 1 }, { estado: 0, duration: 0.75, ease: 'power4.inOut', immediateRender: false }, '-=1')
        .fromTo(mascara, { scale: estado.escalaMaxima }, { scale: 1, duration: 0.75, ease: 'power4.inOut', immediateRender: false }, '-=1')
        .fromTo(cena, { scale: 1 }, { scale: 0.75, duration: 0.75, ease: 'power3.inOut', immediateRender: false }, '-=1')
        .fromTo(conteiner, { clipPath: 'inset(0 0rem)' }, { clipPath: 'inset(0 1rem)', duration: 0.75, ease: 'power3.inOut', immediateRender: false }, '-=1')
        .fromTo(estado, { pontos: 1 }, { pontos: 0, duration: 1, ease: 'power4.inOut' }, '-=1')
    }

    // a lente: raio de Einstein de 11 % da menor medida da tela, curvatura leve; a força acompanha o estado
    // (só dentro da cena)
    let forcaLente = 0
    const montarLente = () => {
      const raio = Math.min(W, H) * 0.11
      forcaLente = raio * 2
      lente.setAttribute('href', mapaDaLente(W, H, raio, forcaLente))
      lente.setAttribute('width', String(W))
      lente.setAttribute('height', String(H))
      const filtro = lente.parentElement!
      filtro.setAttribute('width', String(W))
      filtro.setAttribute('height', String(H))
    }

    const montar = () => {
      W = innerWidth
      H = innerHeight
      montarLente()
      // meia tela por trabalho no dele; aqui cada trabalho fica mais tempo na tela, então 100lvh cada
      el.style.setProperty('--altura', `${Math.max(400, trabalhos.length * 100)}lvh`)
      velocidade = Math.hypot(W, H) * 4
      montarMascara()
      montarPontos()
      montarLetras()
      montarTrabalhos()
      montarLinha()
    }

    let ultimo = ''
    let animacaoAntes = 0
    let riscoSuave = 0
    const quadro = () => {
      // o scroll-progress dele: −1 entrando, 0 com a seção presa, 1 saindo (a pílula de dentro só se desloca na
      // entrada e na saída; presa, fica centrada)
      const r = el.getBoundingClientRect()
      const topo = Math.min(1, Math.max(0, r.top / H))
      const fundo = Math.min(1, Math.max(0, r.bottom / H))
      el.style.setProperty('--rolagem', (-topo + (1 - fundo)).toFixed(4))
      cena.style.setProperty('--estado', estado.estado.toFixed(4))
      desvio.setAttribute('scale', (forcaLente * estado.estado).toFixed(1))
      // as fileiras correm: cada cópia anda pela fileira e volta ao começo
      letras.forEach((l) => {
        const n = velocidade * l.freq
        l.fantasmas.forEach((f, a) => {
          const p = (((estado.animacao % n) / n + a / l.total) % 1) / 0.7 - 0.15
          f.el.style.setProperty('--progresso', p.toFixed(4))
        })
      })
      trabalhos.forEach((t, i) => {
        const v = prog[i]!.v
        t.style.setProperty('--progresso', v.toFixed(4))
        t.dataset.on = v > -1 && v < 1 ? '1' : '0'
      })
      // a grade de pontos se junta para o centro e corre para a esquerda com o letreiro; quanto mais rápido o
      // letreiro anda, mais cada ponto se estica num risco que aponta para fora do centro (o tempo esticando)
      const veloz = Math.min(1, Math.abs(estado.animacao - animacaoAntes) / 40)
      animacaoAntes = estado.animacao
      riscoSuave += (veloz - riscoSuave) * 0.12
      const chave = `${estado.pontos.toFixed(2)}|${estado.animacao.toFixed(1)}|${riscoSuave.toFixed(2)}`
      if (chave !== ultimo) {
        ultimo = chave
        ctx.clearRect(0, 0, W, H)
        ctx.beginPath()
        const fluxo = (estado.animacao * -0.05) % 24
        const risco = riscoSuave * 0.06
        pontos.forEach((p) => {
          const x = p.x + p.dx * (1 - estado.pontos) * 0.2 + fluxo
          const y = p.y + p.dy * (1 - estado.pontos) * 0.2
          if (risco < 0.004) ctx.rect(x, y, 0.5, 0.5)
          else {
            ctx.moveTo(x, y)
            ctx.lineTo(x - (W / 2 - x) * risco, y - (H / 2 - y) * risco)
          }
        })
        ctx.stroke()
      }
    }

    ctx.strokeStyle = 'rgba(40, 40, 255, 0.6)'
    montar()
    const redimensionar = () => {
      montar()
      ctx.strokeStyle = 'rgba(40, 40, 255, 0.6)'
    }
    addEventListener('resize', redimensionar)
    // só anima enquanto a seção está na tela
    const visto = ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom top', onToggle: (self) => (self.isActive ? gsap.ticker.add(quadro) : gsap.ticker.remove(quadro)) })
    return () => {
      tl?.kill()
      visto.kill()
      gsap.ticker.remove(quadro)
      removeEventListener('resize', redimensionar)
      letras.forEach((l) => l.fantasmas.forEach((f) => f.el.remove()))
    }
  }, [])

  return (
    <section ref={raiz} id="trabalho" className={s.codigo} aria-labelledby="codigo-titulo" data-sem-robo>
      <div className={s.codigoMascaraFora} aria-hidden>
        <div className={s.codigoMascara} data-mascara>
          <svg className={s.codigoMascaraSvg}>
            <path className={s.codigoFora} data-fora />
            <path className={s.codigoGrade} data-grade />
            <path className={s.codigoContorno} data-contorno />
            <path className={`${s.codigoContorno} ${s.codigoContornoDentro}`} data-contorno />
          </svg>
        </div>
      </div>
      <div className={s.codigoFora2}>
        <div className={s.codigoDentroFixo} data-conteiner>
          <div className={s.codigoRegua} data-regua aria-hidden />
          <h2 id="codigo-titulo" className={s.codigoTitulo} data-titulo aria-label="Projetos">
            <span className={s.codigoTituloLetras} aria-hidden>
              {PALAVRA.map((l, i) => (
                <span key={i} data-letra>
                  {l}
                </span>
              ))}
            </span>
          </h2>
          <div className={s.codigoCena} data-cena>
            <div className={s.codigoLetras} data-letras-atras aria-hidden />
            {CARTOES.map((c) => (
              <div key={c.chave} className={s.codigoTrabalho} data-trabalho data-on="0">
                <div className={s.codigoCorpo}>
                  {c.imagem ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className={s.codigoImagem} src={c.imagem} alt={c.alt ?? c.nome} decoding="async" />
                  ) : (
                    <span className={s.codigoPalavras}>
                      {c.palavras?.map((p) => (
                        <span key={p}>{p}</span>
                      ))}
                    </span>
                  )}
                  <span className={s.codigoLegenda}>
                    <span>{c.nome}</span>
                    {c.links[0] && <span>{c.links[0].rotulo} ↗</span>}
                  </span>
                  {/* no hover: o print sobe, e aparecem a frase do projeto e os links */}
                  <span className={s.codigoDetalhe}>
                    <span className={s.codigoDetalheDentro}>
                      <span className={s.codigoFrase}>{c.frase}</span>
                      {c.links.length > 0 && (
                        <span className={s.codigoLinks}>
                          {c.links.map((l) => (
                            <a key={l.href} className={s.codigoLink} href={l.href} target="_blank" rel="noreferrer">
                              <span className={s.codigoLinkIcone} aria-hidden>
                                ↗
                              </span>
                              {l.rotulo}
                            </a>
                          ))}
                        </span>
                      )}
                    </span>
                  </span>
                </div>
              </div>
            ))}
            <div className={`${s.codigoLetras} ${s.codigoLetrasFrente}`} data-letras-frente aria-hidden />
          </div>
          <canvas className={s.codigoPontos} data-canvas aria-hidden />
          <svg className={s.codigoFiltros} aria-hidden>
            <filter id="lente-codigo" x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feImage data-lente-mapa x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="mapa" />
              <feDisplacementMap data-lente-desvio in="SourceGraphic" in2="mapa" scale="0" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </svg>
        </div>
      </div>
    </section>
  )
}
