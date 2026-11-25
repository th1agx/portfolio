'use client'

import { useEffect, useRef } from 'react'
import s from './abertura.module.css'
import { criarSprites, type Sprites } from './ledSprite'

// Os olhos do robô do topo, como um visor de LEDs: cada olho é uma matriz de pontos (a mesma linguagem de matriz do site) e a expressão é
// desenhada pelos pontos que acendem. Parado, é a fenda inclinada do visor de public/retrato/robo.webp; ela anda dentro da matriz seguindo
// o mouse, pisca apagando de fora para dentro e, sobre uma opção, vira um sorriso de olhos (^ ^) voltado para ela. Cada LED tem
// persistência (acende rápido, apaga devagar), então as expressões se transformam umas nas outras em vez de trocar. Canvas 2D: aparece na hora.

type Lado = 'pt' | 'en' | ''

const COLUNAS = 26
const LINHAS = 11

const sm = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** distância do ponto (px, py) ao segmento de (ax, ay) a (bx, by) */
const aoSegmento = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
  const vx = bx - ax
  const vy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)))
  return Math.hypot(px - ax - vx * t, py - ay - vy * t)
}

export default function EscolhaOlhos({ lado }: { lado: { current: Lado } }) {
  const tela = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = tela.current
    const g = cv?.getContext('2d')
    if (!cv || !g) return
    const parado = matchMedia('(prefers-reduced-motion: reduce)').matches
    let W = 0
    let H = 0
    let passo = 0
    // sem mudança nos LEDs não há o que redesenhar (e o canvas redimensionado volta vazio)
    let sujo = true
    let sprites: Sprites | null = null
    const medir = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2)
      W = cv.clientWidth
      H = cv.clientHeight
      cv.width = Math.round(W * dpr)
      cv.height = Math.round(H * dpr)
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      sujo = true
      // o tamanho de cada LED: os dois olhos juntos ocupam ~52% da largura (no máximo 780 px)
      passo = Math.min(W * 0.52, 780) / (COLUNAS * 2 + 6)
      // o LED pré-desenhado (ledSprite.ts): halo azul, corpo azul vivo e o miolo quase branco
      sprites = criarSprites(passo * 0.36, 2.6, 0.22, '42, 107, 255', '60, 115, 255', '225, 236, 255', 0.55, dpr)
    }
    medir()
    addEventListener('resize', medir)

    let alvo = { x: 0, y: 0 }
    const mover = (e: PointerEvent) => {
      const alcance = Math.max(innerWidth, innerHeight) * 0.42
      alvo = {
        x: Math.max(-1, Math.min(1, (e.clientX - innerWidth / 2) / alcance)),
        y: Math.max(-1, Math.min(1, (e.clientY - innerHeight / 2) / alcance)),
      }
    }
    addEventListener('pointermove', mover, { passive: true })

    // o brilho atual de cada LED dos dois olhos
    const leds = [new Float32Array(COLUNAS * LINHAS), new Float32Array(COLUNAS * LINHAS)]
    const olhar = { x: 0, y: 0 }
    let sorriso = 0
    let pisca = 0
    let proximaPisca = performance.now() + 2400
    let piscaInicio = -1
    let t0 = performance.now()
    let raf = 0

    /** o quanto o LED (u, v) do olho deve acender, com u e v de 0 a 1 dentro da matriz; lado: -1 esquerdo, 1 direito */
    const forma = (u: number, v: number, olho: -1 | 1) => {
      // o centro da forma anda dentro da matriz para onde o robô olha
      const cx = 0.5 + olhar.x * 0.2
      const cy = 0.5 + olhar.y * 0.22
      const x = u - cx
      const y = (v - cy) * (LINHAS / COLUNAS)
      // a fenda do visor: inclinada para o centro do rosto (o olho esquerdo desce para a direita, o direito para a esquerda)
      const incl = 0.085 * olho * -1
      const meio = 0.34 * (1 - pisca * 0.85)
      const dFenda = aoSegmento(x, y, -meio, incl * -1, meio, incl) - 0.03 * (1 - pisca)
      // o sorriso de olhos: um arco virado para cima
      const arco = y + 0.13 - 1.1 * x * x
      const dSorriso = Math.max(Math.abs(arco) - 0.028, Math.abs(x) - 0.3)
      const d = dFenda * (1 - sorriso) + dSorriso * sorriso
      return 1 - sm(0.0, 0.035, d)
    }

    // sem mudança nos LEDs não há o que redesenhar; e 30 quadros por segundo bastam para uma matriz de LEDs (a thread principal do celular é curta)
    const quadro = (agora: number) => {
      if (agora - t0 < 28) {
        raf = requestAnimationFrame(quadro)
        return
      }
      const dt = Math.min(0.05, (agora - t0) / 1000)
      t0 = agora
      const l = lado.current
      const alvoX = l === 'pt' ? -0.85 : l === 'en' ? 0.85 : alvo.x
      const alvoY = l ? 0.15 : alvo.y
      const k = 1 - Math.exp(-dt * 7)
      olhar.x += (alvoX - olhar.x) * k
      olhar.y += (alvoY - olhar.y) * k
      sorriso += ((l ? 1 : 0) - sorriso) * (1 - Math.exp(-dt * 6))
      // a piscada: fecha e abre em 220 ms; às vezes duas seguidas
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

      for (let o = 0; o < 2; o++) {
        const olho = o === 0 ? -1 : 1
        const m = leds[o]!
        for (let j = 0; j < LINHAS; j++)
          for (let i = 0; i < COLUNAS; i++) {
            const n = j * COLUNAS + i
            const quer = forma((i + 0.5) / COLUNAS, (j + 0.5) / LINHAS, olho as -1 | 1)
            // persistência do LED: acende rápido, apaga devagar
            const b = m[n]!
            const nv = b + (quer - b) * (1 - Math.exp(-dt * (quer > b ? 22 : 7)))
            if (Math.abs(nv - b) > 0.0015) sujo = true
            m[n] = nv
          }
      }
      if (sujo) {
        sujo = false
        g.clearRect(0, 0, W, H)
        const largura = COLUNAS * passo
        const altura = LINHAS * passo
        const vao = passo * 6
        const topo = H * 0.46 - altura / 2
        for (let o = 0; o < 2; o++) {
          const olho = o === 0 ? -1 : 1
          const x0 = W / 2 + (olho === -1 ? -vao / 2 - largura : vao / 2)
          const m = leds[o]!
          // só os LEDs acesos, com o brilho somado
          g.globalCompositeOperation = 'lighter'
          const sp = sprites!
          const d = sp.meia * 2
          for (let j = 0; j < LINHAS; j++)
            for (let i = 0; i < COLUNAS; i++) {
              const b = m[j * COLUNAS + i]!
              if (b < 0.02) continue
              const px = x0 + (i + 0.5) * passo - sp.meia
              const py = topo + (j + 0.5) * passo - sp.meia
              g.globalAlpha = b
              g.drawImage(sp.corpo, px, py, d, d)
              if (b > 0.6) {
                g.globalAlpha = (b - 0.6) * 2
                g.drawImage(sp.miolo, px, py, d, d)
              }
            }
          g.globalAlpha = 1
          g.globalCompositeOperation = 'source-over'
        }
      }
      // a tela mudou de tamanho (a barra de rolagem some, a janela muda): o canvas acompanha
      if (cv.clientWidth !== W || cv.clientHeight !== H) medir()
      if (!parado) raf = requestAnimationFrame(quadro)
    }
    raf = requestAnimationFrame(quadro)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('pointermove', mover)
      removeEventListener('resize', medir)
    }
  }, [lado])

  return <canvas ref={tela} className={s.olhosTela} aria-hidden />
}
