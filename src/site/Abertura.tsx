'use client'

import { useEffect, useRef, useState } from 'react'
import { aguardar, sinalFeito, sinalizar } from './fila'
import { arquivo } from '@/content/caminho'
import { Motor, type Progresso, type Saida } from './aberturaMotor'
import { epoca } from './tempoGlobal'
import s from './abertura.module.css'

// Tela de abertura: um close extremo do olho robótico do retrato (o olho direito, azul, do rosto meio humano). A íris
// mecânica é desenhada na placa de vídeo (src/site/aberturaShader.ts) e calibra enquanto o site carrega por trás: o anel
// de células e a porcentagem do canto seguem as cenas de verdade (retrato e vale; src/site/fila.ts). Quando tudo está
// pronto, o diafragma foca, a câmera recua ancorada no olho até a foto estar no enquadramento do topo (com o mesmo relevo,
// o mesmo relógio das curvas de nível e a mesma composição do retrato), a luz da sala acende e a abertura se dissolve
// sobre o retrato de verdade, que já está desenhado por baixo.
//
// O desenho roda num Worker com OffscreenCanvas (src/site/aberturaMotor.ts): a animação continua a 60 quadros mesmo quando
// a thread principal está presa na hidratação e na montagem das cenas. Onde isso não existe, o mesmo motor roda na thread
// principal. Aqui só ficam o DOM (porcentagem, botão), o travamento da página e a escuta das cenas.
//
// Sem WebGL 2, com movimento reduzido ou com a página aberta no meio, a abertura não aparece.

const ETAPAS = [
  { sinal: 'retrato', peso: 0.5 },
  { sinal: 'lua', peso: 0.3 },
  { sinal: 'guia', peso: 0.2 },
]

type Ponte = {
  medir: (W: number, H: number, dpr: number) => void
  olhar: (x: number, y: number) => void
  clique: () => void
  pular: () => void
  progresso: (p: Progresso) => void
  parar: () => void
}

export function Abertura() {
  const raiz = useRef<HTMLDivElement>(null)
  const tela = useRef<HTMLCanvasElement>(null)
  const numero = useRef<HTMLSpanElement>(null)
  const regua = useRef<HTMLDivElement>(null)
  const [ativa, setAtiva] = useState(true)
  // 'worker' tenta o Worker; se ele não conseguir (sem OffscreenCanvas, sem WebGL 2 no Worker), 'principal' refaz com um
  // canvas novo (o antigo já foi entregue ao Worker) e roda o motor aqui. A chave troca o elemento do canvas
  const [modo, setModo] = useState<'worker' | 'principal'>('worker')
  const [chave, setChave] = useState(0)
  const reiniciando = useRef(false)
  // o aviso "abertura terminou" de uma desmontagem de verdade sai com uma folga; no modo estrito do React (desenvolvimento) o efeito é
  // desmontado e montado logo em seguida, e esse aviso adiantado liberava as cenas (e o glitch da foto) no começo da visita
  const avisoPendente = useRef(0)

  useEffect(() => {
    window.clearTimeout(avisoPendente.current)
    const el = raiz.current
    const cv = tela.current
    if (!el || !cv) return
    const html = document.documentElement
    let vivo = true
    let ponte: Ponte | null = null
    const encerrar = () => {
      sinalizar('abertura')
      if (vivo) setAtiva(false)
    }
    // página recarregada no meio (o topo nem está na tela) ou movimento reduzido: sem abertura
    if (scrollY > 40 || matchMedia('(prefers-reduced-motion: reduce)').matches) return encerrar()

    html.dataset.abertura = '1'
    html.dataset.aberturaVista = '1'
    el.dataset.vivo = '1'

    // ---- a página atrás não rola nem recebe foco enquanto a abertura está na tela ----
    const travar = (e: Event) => {
      if (e instanceof KeyboardEvent && !['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Spacebar'].includes(e.key)) return
      e.preventDefault()
      e.stopImmediatePropagation()
    }
    const eventos = ['wheel', 'touchmove', 'keydown'] as const
    for (const n of eventos) window.addEventListener(n, travar, { capture: true, passive: false })
    const irmaos = [...document.body.children].filter((c) => c !== el && !['SCRIPT', 'NOSCRIPT', 'LINK', 'STYLE'].includes(c.tagName))
    irmaos.forEach((c) => c.setAttribute('inert', ''))
    let solto = false
    const soltar = () => {
      if (solto) return
      solto = true
      for (const n of eventos) window.removeEventListener(n, travar, { capture: true })
      irmaos.forEach((c) => c.removeAttribute('inert'))
      delete html.dataset.abertura
    }

    // ---- a porcentagem: o número na fonte dos títulos e a régua de tiques que acende, como o anel de calibração da íris ----
    const tiques = [...(regua.current?.children ?? [])] as HTMLElement[]
    // o número dá glitch: a cada mudança ele embaralha os dígitos por um instante, com fatias deslocadas e a cor separada, e assenta
    // no valor real; parado, ainda falha de vez em quando. Com movimento reduzido, só troca o número
    const semGlitch = matchMedia('(prefers-reduced-motion: reduce)').matches
    let texto = '00'
    let glitchAte = 0
    let ultimoGlitch = 0
    let quadroGlitch = 0
    let soluco = 0
    const sorteia = () => String(Math.floor(Math.random() * 10))
    const pintar = (t: string) => {
      const n = numero.current
      if (!n) return
      n.textContent = t
      n.dataset.texto = t
    }
    const falhar = () => {
      const n = numero.current
      if (!n) return
      const agora = performance.now()
      if (agora >= glitchAte) {
        n.dataset.glitch = '0'
        pintar(texto)
        quadroGlitch = 0
        return
      }
      n.dataset.glitch = '1'
      // dígitos trocados por sorteio (cada um com chance de trocar), fatias e deslocamentos novos a cada quadro
      const alvoDigito = Math.floor(Math.random() * texto.length)
      pintar([...texto].map((c, i) => (i === alvoDigito && Math.random() < 0.7 ? sorteia() : c)).join(''))
      const a = Math.random() * 70
      const b = Math.random() * 70
      n.style.setProperty('--c1', `${a.toFixed(0)}%`)
      n.style.setProperty('--c2', `${(100 - a - 8 - Math.random() * 20).toFixed(0)}%`)
      n.style.setProperty('--c3', `${b.toFixed(0)}%`)
      n.style.setProperty('--c4', `${(100 - b - 6 - Math.random() * 25).toFixed(0)}%`)
      n.style.setProperty('--dx', `${((Math.random() - 0.5) * 6).toFixed(1)}px`)
      n.style.setProperty('--sk', `${((Math.random() - 0.5) * 8).toFixed(1)}deg`)
      quadroGlitch = requestAnimationFrame(falhar)
    }
    const glitch = (ms: number) => {
      if (semGlitch) return pintar(texto)
      glitchAte = Math.max(glitchAte, performance.now() + ms)
      if (!quadroGlitch) quadroGlitch = requestAnimationFrame(falhar)
    }
    // os soluços de quando o número está parado
    const solucar = () => {
      glitch(70 + Math.random() * 70)
      soluco = window.setTimeout(solucar, 1600 + Math.random() * 2200)
    }
    soluco = window.setTimeout(solucar, 1400)
    const pararGlitch = () => {
      window.clearTimeout(soluco)
      cancelAnimationFrame(quadroGlitch)
    }
    const mostrar = (v: number) => {
      const novo = String(v).padStart(2, '0')
      if (novo !== texto) {
        texto = novo
        const agora = performance.now()
        // o número muda quase a cada quadro: só falha ao cruzar um múltiplo de 10 e com 1 s de folga; nos outros quadros troca limpo
        if (v % 10 === 0 && agora - ultimoGlitch > 1000) {
          ultimoGlitch = agora
          glitch(130)
        } else if (glitchAte <= agora) pintar(texto)
      }
      const acesos = Math.round((v / 100) * tiques.length)
      tiques.forEach((t, k) => {
        t.dataset.on = k < acesos ? '1' : '0'
        t.dataset.ponta = k === acesos - 1 && v < 100 ? '1' : '0'
      })
    }

    // ---- o motor devolve o que mostrar em volta e a hora de sair ----
    const aoSaida = (m: Saida) => {
      if (!vivo) return
      if (m.tipo === 'diag') console.info(`[abertura] ${m.evento} em ${Math.round(m.epoca - performance.timeOrigin)} ms`)
      else if (m.tipo === 'carga') mostrar(m.valor)
      else if (m.tipo === 'flags') {
        el.dataset.carga = m.carga ? '1' : '0'
        el.dataset.pular = m.pular ? '1' : '0'
      } else if (m.tipo === 'sair') {
        // a câmera chegou ao enquadramento do topo e a sala acendeu: o retrato de verdade já está por baixo
        soltar()
        // o retrato entra sem a onda (src/cena/Retrato.tsx): a abertura já mostrou o rosto inteiro
        sinalizar('abertura')
        el.dataset.estado = 'saindo'
        window.setTimeout(() => {
          ponte?.parar()
          if (vivo) setAtiva(false)
        }, 750)
      } else if (m.tipo === 'erro') {
        console.warn('abertura:', m.motivo)
        ponte?.parar()
        if (modo === 'worker') {
          // o Worker não conseguiu (comum: sem WebGL em Worker): recomeça na thread principal, com um canvas novo
          reiniciando.current = true
          setChave((k) => k + 1)
          setModo('principal')
        } else {
          soltar()
          encerrar()
        }
      }
    }

    // ---- a ponte: Worker, ou o motor aqui mesmo ----
    const diag = location.search.includes('diag')
    if (diag) console.info(`[abertura] efeito começou em ${Math.round(performance.now())} ms (modo ${modo})`)
    let W = innerWidth
    let H = innerHeight
    const urls = { foto: new URL(arquivo('/retrato/humano.webp'), location.href).href, aura: new URL(arquivo('/retrato/aura.png'), location.href).href }
    if (modo === 'worker' && typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && 'transferControlToOffscreen' in cv) {
      try {
        const off = cv.transferControlToOffscreen()
        const w = new Worker(new URL('./abertura.worker.ts', import.meta.url), { type: 'module' })
        w.onmessage = (e: MessageEvent<Saida>) => aoSaida(e.data)
        w.onerror = () => aoSaida({ tipo: 'erro', motivo: 'o Worker falhou' })
        w.postMessage({ tipo: 'iniciar', canvas: off, urls, diag, W, H, dpr: devicePixelRatio || 1 }, [off])
        ponte = {
          medir: (a, b, c) => w.postMessage({ tipo: 'medir', W: a, H: b, dpr: c }),
          olhar: (x, y) => w.postMessage({ tipo: 'olhar', x, y }),
          clique: () => w.postMessage({ tipo: 'clique' }),
          pular: () => w.postMessage({ tipo: 'pular' }),
          progresso: (p) => w.postMessage({ tipo: 'progresso', p }),
          parar: () => {
            w.postMessage({ tipo: 'parar' })
            window.setTimeout(() => w.terminate(), 50)
          },
        }
      } catch (e) {
        // sai sem registrar a limpeza, então solta aqui o travamento da página (senão a roda do mouse fica presa para sempre)
        soltar()
        reiniciando.current = true
        // o canvas já foi entregue a um Worker (o modo estrito do React, em desenvolvimento, roda o efeito duas vezes): um
        // canvas novo resolve e o Worker segue. Outro erro (navegador recusou): segue na thread principal
        const jaEntregue = e instanceof DOMException && e.name === 'InvalidStateError'
        setChave((k) => k + 1)
        if (!jaEntregue) setModo('principal')
        return
      }
    } else {
      const m = new Motor(cv, urls, aoSaida, diag)
      m.medir(W, H, devicePixelRatio || 1)
      ponte = {
        medir: (a, b, c) => m.medir(a, b, c),
        olhar: (x, y) => m.olharPara(x, y),
        clique: () => m.tocar(),
        pular: () => m.pular(),
        progresso: (p) => m.progresso(p),
        parar: () => m.parar(),
      }
    }

    const aoRedimensionar = () => {
      W = innerWidth
      H = innerHeight
      ponte?.medir(W, H, devicePixelRatio || 1)
    }
    addEventListener('resize', aoRedimensionar)
    const mover = (e: PointerEvent) => ponte?.olhar((e.clientX / W - 0.5) * 2, -(e.clientY / H - 0.5) * 2)
    addEventListener('pointermove', mover, { passive: true })
    const tocar = () => ponte?.clique()
    cv.addEventListener('pointerdown', tocar)
    const botao = el.querySelector<HTMLButtonElement>('[data-pular]')
    const aoPular = () => ponte?.pular()
    botao?.addEventListener('click', aoPular)

    // ---- progresso real: cada cena pesa uma fatia; o motor avança devagar sobre a pendente até ela avisar ----
    let ultimaConclusao = epoca()
    const enviarProgresso = () => {
      const feitas = ETAPAS.filter((e) => sinalFeito(e.sinal))
      ponte?.progresso({
        pesoFeito: feitas.reduce((a, e) => a + e.peso, 0),
        pendente: ETAPAS.find((e) => !sinalFeito(e.sinal))?.peso ?? 0,
        todas: feitas.length === ETAPAS.length,
        ultimaConclusao,
      })
    }
    enviarProgresso()
    ETAPAS.forEach((e) =>
      aguardar(e.sinal, 20000).then(() => {
        if (!vivo || !sinalFeito(e.sinal)) return
        ultimaConclusao = epoca()
        enviarProgresso()
      }),
    )

    return () => {
      vivo = false
      pararGlitch()
      ponte?.parar()
      soltar()
      removeEventListener('resize', aoRedimensionar)
      removeEventListener('pointermove', mover)
      cv.removeEventListener('pointerdown', tocar)
      botao?.removeEventListener('click', aoPular)
      // trocar de modo (Worker -> thread principal) não é terminar: só sinaliza que a abertura acabou quando acabou de verdade
      if (reiniciando.current) reiniciando.current = false
      else avisoPendente.current = window.setTimeout(() => sinalizar('abertura'), 80)
    }
  }, [modo, chave])

  if (!ativa) return null

  return (
    // "Carregando 00 %" já vem no HTML: aparece no primeiro desenho, antes de o JavaScript e o shader ficarem prontos
    <div ref={raiz} className={s.raiz} data-abertura-raiz data-estado="carregando" data-carga="1" data-pular="0">
      <canvas key={chave} ref={tela} className={s.tela} aria-hidden />
      <p className="visually-hidden" role="status">
        Carregando o portfólio de Thiago Antunes
      </p>
      <div className={s.carga} aria-hidden>
        <div className={s.cargaTopo}>
          <span>Calibrando a íris</span>
        </div>
        <div className={s.cargaLinha}>
          <span ref={numero} className={s.cargaNumero} data-texto="00" data-glitch="0">
            00
          </span>
          <span className={s.cargaPct}>%</span>
        </div>
        <div ref={regua} className={s.cargaRegua}>
          {Array.from({ length: 36 }, (_, k) => (
            <i key={k} data-on="0" />
          ))}
        </div>
      </div>
      <button type="button" className={s.pular} data-pular>
        Pular abertura
      </button>
    </div>
  )
}
