'use client'

import { useEffect, useRef } from 'react'
import s from './site.module.css'
import { criarSprites, type Sprites } from './ledSprite'

// O botão do menu: os dois olhos do robô, como na pergunta do idioma (EscolhaOlhos.tsx), num tamanho de botão. Cada olho é uma matriz de
// LEDs; parado, é a fenda inclinada do visor; ele olha para onde está o mouse, pisca de vez em quando e, com o mouse em cima ou o menu
// aberto, vira o sorriso de olhos (^ ^) e fica vermelho. Cada LED tem persistência (acende rápido, apaga devagar), então as expressões se transformam
// umas nas outras. Canvas 2D; só desenha enquanto o cabeçalho está à vista.

const COLUNAS = 13
const LINHAS = 7

const sm = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const aoSegmento = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
  const vx = bx - ax
  const vy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)))
  return Math.hypot(px - ax - vx * t, py - ay - vy * t)
}

export function OlhosMenu({ aberto, ativo }: { aberto: boolean; ativo: boolean }) {
  const tela = useRef<HTMLCanvasElement>(null)
  const sorrir = useRef(false)
  const emCima = useRef(false)
  sorrir.current = aberto

  useEffect(() => {
    const cv = tela.current
    const botao = cv?.parentElement
    const g = cv?.getContext('2d')
    if (!cv || !botao || !g || !ativo) return
    const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches
    let W = 0
    let H = 0
    let passo = 0
    // sem mudança nos LEDs não há o que redesenhar (e o canvas redimensionado volta vazio)
    let sujo = true
    // o LED pré-desenhado (ledSprite.ts), em azul e em vermelho: com o menu aberto os dois se misturam pelo alfa
    let azul: Sprites | null = null
    let rubro: Sprites | null = null
    const medir = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2)
      W = cv.clientWidth
      H = cv.clientHeight
      cv.width = Math.round(W * dpr)
      cv.height = Math.round(H * dpr)
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      sujo = true
      // os dois olhos e o vão entre eles ocupam a largura toda
      passo = Math.min(W / (COLUNAS * 2 + 4), H / (LINHAS + 1.5))
      azul = criarSprites(passo * 0.4, 2.4, 0.3, '70, 120, 255', '120, 165, 255', '235, 242, 255', 0.6, dpr)
      rubro = criarSprites(passo * 0.4, 2.4, 0.3, '255, 40, 50', '255, 85, 90', '255, 222, 222', 0.6, dpr)
    }
    medir()
    addEventListener('resize', medir)

    let alvo = { x: 0, y: 0 }
    const mover = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      const r = botao.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      alvo = {
        x: Math.max(-1, Math.min(1, (e.clientX - cx) / 320)),
        y: Math.max(-1, Math.min(1, (e.clientY - cy) / 240)),
      }
    }
    const entrou = () => (emCima.current = true)
    const saiu = () => (emCima.current = false)
    addEventListener('pointermove', mover, { passive: true })
    botao.addEventListener('pointerenter', entrou)
    botao.addEventListener('pointerleave', saiu)

    const leds = [new Float32Array(COLUNAS * LINHAS), new Float32Array(COLUNAS * LINHAS)]
    const olhar = { x: 0, y: 0 }
    let sorriso = 0
    // 0 = azul, 1 = vermelho: com o menu aberto os olhos ficam vermelhos
    let vermelho = 0
    let pisca = 0
    let proximaPisca = performance.now() + 1800
    let piscaInicio = -1
    let t0 = performance.now()
    let raf = 0

    const forma = (u: number, v: number, olho: -1 | 1) => {
      const cx = 0.5 + olhar.x * 0.2
      const cy = 0.5 + olhar.y * 0.24
      const x = u - cx
      const y = (v - cy) * (LINHAS / COLUNAS)
      const incl = 0.085 * olho * -1
      const meio = 0.36 * (1 - pisca * 0.85)
      // a grade é metade da dos olhos da pergunta: o traço fica o dobro de grosso para continuar sendo uns LEDs inteiros
      const dFenda = aoSegmento(x, y, -meio, incl * -1, meio, incl) - 0.06 * (1 - pisca)
      const arco = y + 0.13 - 1.1 * x * x
      const dSorriso = Math.max(Math.abs(arco) - 0.05, Math.abs(x) - 0.3)
      const d = dFenda * (1 - sorriso) + dSorriso * sorriso
      return 1 - sm(0.0, 0.07, d)
    }

    // sem mudança nos LEDs não há o que redesenhar; e 30 quadros por segundo bastam para uma matriz de LEDs (a thread principal do celular é curta)
    const quadro = (agora: number) => {
      if (agora - t0 < 28) {
        raf = requestAnimationFrame(quadro)
        return
      }
      const dt = Math.min(0.05, (agora - t0) / 1000)
      t0 = agora
      const quer = sorrir.current || emCima.current
      const k = 1 - Math.exp(-dt * 8)
      const ax = calmo ? 0 : emCima.current ? alvo.x * 0.5 : alvo.x
      const ay = calmo ? 0 : emCima.current ? alvo.y * 0.5 : alvo.y
      olhar.x += (ax - olhar.x) * k
      olhar.y += (ay - olhar.y) * k
      sorriso += ((quer ? 1 : 0) - sorriso) * (1 - Math.exp(-dt * 9))
      const antes = vermelho
      vermelho += ((sorrir.current ? 1 : 0) - vermelho) * (1 - Math.exp(-dt * 7))
      if (Math.abs(vermelho - antes) > 0.002) sujo = true
      if (!calmo) {
        if (agora > proximaPisca && piscaInicio < 0) piscaInicio = agora
        if (piscaInicio >= 0) {
          const p = (agora - piscaInicio) / 220
          pisca = p < 0.5 ? p * 2 : Math.max(0, 2 - p * 2)
          if (p >= 1) {
            piscaInicio = -1
            pisca = 0
            proximaPisca = agora + (Math.random() < 0.22 ? 180 : 2600 + Math.random() * 3400)
          }
        }
      }

      for (let o = 0; o < 2; o++) {
        const olho = o === 0 ? -1 : 1
        const m = leds[o]!
        for (let j = 0; j < LINHAS; j++)
          for (let i = 0; i < COLUNAS; i++) {
            const n = j * COLUNAS + i
            const quero = forma((i + 0.5) / COLUNAS, (j + 0.5) / LINHAS, olho as -1 | 1)
            const b = m[n]!
            const nv = b + (quero - b) * (1 - Math.exp(-dt * (quero > b ? 22 : 7)))
            if (Math.abs(nv - b) > 0.0015) sujo = true
            m[n] = nv
          }
      }
      if (sujo) {
        sujo = false
        g.clearRect(0, 0, W, H)
        const largura = COLUNAS * passo
        const altura = LINHAS * passo
        const vao = passo * 4
        const topo = H / 2 - altura / 2
        const x00 = W / 2 - vao / 2 - largura
        for (let o = 0; o < 2; o++) {
          const olho = o === 0 ? -1 : 1
          const x0 = o === 0 ? x00 : W / 2 + vao / 2
          const m = leds[o]!
          g.globalCompositeOperation = 'lighter'
          const d = azul!.meia * 2
          for (let j = 0; j < LINHAS; j++)
            for (let i = 0; i < COLUNAS; i++) {
              const b = m[j * COLUNAS + i]!
              if (b < 0.02) continue
              const px = x0 + (i + 0.5) * passo - azul!.meia
              const py = topo + (j + 0.5) * passo - azul!.meia
              for (const [sp, peso] of [
                [azul!, 1 - vermelho],
                [rubro!, vermelho],
              ] as const) {
                if (peso < 0.01) continue
                g.globalAlpha = b * peso
                g.drawImage(sp.corpo, px, py, d, d)
                if (b > 0.5) {
                  g.globalAlpha = (b - 0.5) * 2 * peso
                  g.drawImage(sp.miolo, px, py, d, d)
                }
              }
            }
          g.globalAlpha = 1
          g.globalCompositeOperation = 'source-over'
        }
      }
      if (cv.clientWidth !== W || cv.clientHeight !== H) medir()
      raf = requestAnimationFrame(quadro)
    }
    raf = requestAnimationFrame(quadro)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('resize', medir)
      removeEventListener('pointermove', mover)
      botao.removeEventListener('pointerenter', entrou)
      botao.removeEventListener('pointerleave', saiu)
    }
  }, [ativo])

  return <canvas ref={tela} className={s.menuOlhos} aria-hidden />
}
