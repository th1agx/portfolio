'use client'

import { useEffect, useRef } from 'react'

// O cursor do site é um pequeno ser de luz, discreto: um núcleo que pulsa devagar, três filamentos curtos que flutuam como tentáculos de
// água-viva (cordas com atraso e ondulação: sobem de leve quando ele para e correm para trás quando ele se move), duas luzinhas que o
// orbitam e um pouco de pó de luz ao mover. Ele reage com calma: sobre algo clicável "percebe", é puxado uns pixels para o alvo e os
// filamentos se inclinam até ele; ao clicar se contrai e solta uma onda curta; parado há alguns segundos, dorme (a luz baixa).
// De propósito pequeno e de pouca luz para não competir com o robô nem com o conteúdo. Sobre o escuro a luz é somada (gelo e azul);
// no contato branco vira tinta azul-marinho. Um único canvas 2D, sem contexto WebGL novo. Só com mouse; no toque o cursor nativo nem
// existe. O robô, ao roubar o cursor, o esconde (html.cursor-roubado).

const ALVOS = 'a, button, summary, label, [role="button"], [data-mira]'
const NOS = 12
const SEG = 3.1
const FIOS = [
  { amp: 1.0, w: 2.1, ph: 0.2, c: 1.0, l: 1.9 },
  { amp: 0.9, w: 1.6, ph: 2.6, c: 0.75, l: 1.5 },
  { amp: 1.1, w: 2.5, ph: 4.4, c: 0.6, l: 1.2 },
]
const COMPANHEIROS = [
  { r: 9, v: 2.1, a: 0.4, k: 1.2 },
  { r: 13, v: -1.5, a: 3.1, k: 1.0 },
]
const MAX_PO = 24
const E = 1.35 // escala geral do ser

type Po = { x: number; y: number; vx: number; vy: number; t0: number; vida: number; s: number }
type No = { x: number; y: number }

export function Mira() {
  const raiz = useRef<HTMLDivElement>(null)
  const tela = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!matchMedia('(pointer: fine)').matches || !matchMedia('(hover: hover)').matches) return
    const el = raiz.current
    const cv = tela.current
    const ctx = cv?.getContext('2d')
    if (!el || !cv || !ctx) return
    const html = document.documentElement
    html.classList.add('mira-ativa')
    const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches

    let dpr = 1
    const medir = () => {
      dpr = Math.min(2, devicePixelRatio || 1)
      cv.width = Math.round(innerWidth * dpr)
      cv.height = Math.round(innerHeight * dpr)
    }
    medir()
    window.addEventListener('resize', medir)

    let x = -200
    let y = -200
    let cx = x
    let cy = y
    let ativo = false
    let alvoHover = 0
    let hover = 0
    let mov = 0
    let clique = 0
    let sono = 0
    let ultimoMov = performance.now()
    let alvoX = 0
    let alvoY = 0
    let magX = 0
    let magY = 0
    let alvoMagX = 0
    let alvoMagY = 0
    let t = 0
    let ultimo = performance.now()
    let id = 0
    let rgb = [232, 237, 245]
    let proxCor = 0
    let acumulaPo = 0
    const po: Po[] = []
    const ondas: { t0: number; x: number; y: number }[] = []
    const fios = FIOS.map((f) => ({ ...f, nos: Array.from({ length: NOS }, (): No => ({ x, y })) }))

    const mover = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return
      if (!ativo) {
        ativo = true
        cx = e.clientX
        cy = e.clientY
        for (const f of fios)
          for (const n of f.nos) {
            n.x = cx
            n.y = cy
          }
        el.dataset.ativo = '1'
      }
      x = e.clientX
      y = e.clientY
      ultimoMov = performance.now()
      const alvo = (e.target as Element | null)?.closest?.(ALVOS)
      alvoHover = alvo ? 1 : 0
      if (alvo) {
        const r = alvo.getBoundingClientRect()
        alvoX = r.left + r.width / 2
        alvoY = r.top + r.height / 2
        const dx = alvoX - x
        const dy = alvoY - y
        const d = Math.hypot(dx, dy) || 1
        const m = Math.min(6, d * 0.2)
        alvoMagX = (dx / d) * m
        alvoMagY = (dy / d) * m
      } else {
        alvoMagX = 0
        alvoMagY = 0
      }
    }
    const desceu = () => {
      clique = 1
      if (calmo) return
      ondas.push({ t0: t, x: cx + magX, y: cy + magY })
      for (let i = 0; i < 8 && po.length < MAX_PO; i++) {
        const a = Math.random() * Math.PI * 2
        const v = 40 + Math.random() * 90
        po.push({ x: cx + magX, y: cy + magY, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t0: t, vida: 0.4 + Math.random() * 0.4, s: 0.8 + Math.random() * 0.6 })
      }
    }
    const saiu = () => {
      ativo = false
      el.dataset.ativo = '0'
    }
    window.addEventListener('pointermove', mover, { passive: true })
    window.addEventListener('pointerdown', desceu, { passive: true })
    html.addEventListener('mouseleave', saiu)

    const quadro = (agora: number) => {
      id = requestAnimationFrame(quadro)
      const dt = Math.min(0.05, Math.max(0.001, (agora - ultimo) / 1000))
      ultimo = agora
      if (!ativo) return
      if (!calmo) t += dt
      if (agora > proxCor) {
        proxCor = agora + 160
        const m = getComputedStyle(el).color.match(/[\d.]+/g)
        if (m && m.length >= 3) rgb = [+m[0]!, +m[1]!, +m[2]!]
      }
      // texto claro = fundo escuro (soma luz); texto escuro = fundo branco (vira tinta)
      const escuro = rgb[0]! * 0.3 + rgb[1]! * 0.59 + rgb[2]! * 0.11 > 128

      const sN = 1 - Math.exp(-(calmo ? 80 : 32) * dt)
      const antesX = cx
      const antesY = cy
      cx += (x - cx) * sN
      cy += (y - cy) * sN
      const vx = (cx - antesX) / dt
      const vy = (cy - antesY) / dt
      const vel = Math.hypot(vx, vy)
      mov += (Math.min(1, vel / 1100) - mov) * (1 - Math.exp(-8 * dt))
      hover += (alvoHover - hover) * (1 - Math.exp(-9 * dt))
      clique = Math.max(0, clique - dt * 2.6)
      const parado = Math.min(1, Math.max(0, (agora - ultimoMov - 3200) / 2200))
      sono += (parado - sono) * (1 - Math.exp(-2 * dt))
      magX += (alvoMagX - magX) * (1 - Math.exp(-10 * dt))
      magY += (alvoMagY - magY) * (1 - Math.exp(-10 * dt))

      const deriva = calmo ? 0 : 1 - mov
      const bx = cx + magX + Math.sin(t * 0.9) * 1.4 * deriva
      const by = cy + magY + Math.cos(t * 0.7) * 1.6 * deriva - sono * 1.5
      const pulso = 1 + 0.12 * Math.sin(t * (5.4 - sono * 2.6)) * (1 - sono * 0.4) + clique * 0.45
      const vida = (1 - sono * 0.4) * (1 + hover * 0.2)

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, innerWidth, innerHeight)
      // o ser inteiro é ampliado em torno do próprio corpo
      ctx.setTransform(dpr * E, 0, 0, dpr * E, dpr * bx * (1 - E), dpr * by * (1 - E))
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalCompositeOperation = escuro ? 'lighter' : 'source-over'

      const cor = (c: 'a' | 'b', al: number) => {
        const a = al.toFixed(3)
        if (escuro) return c === 'a' ? `rgba(214,232,255,${a})` : `rgba(70,130,255,${a})`
        return c === 'a' ? `rgba(0,20,170,${a})` : `rgba(0,30,230,${a})`
      }

      // a luz em volta: duas camadas, curtas e baixas
      for (const [raio, c, al] of [
        [10, 'a', 0.38],
        [24, 'b', 0.2],
      ] as const) {
        const rr = raio * pulso * (1 + hover * 0.3) * (escuro ? 1 : 0.7)
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, rr)
        g.addColorStop(0, cor(c, al * vida))
        g.addColorStop(1, cor(c, 0))
        ctx.fillStyle = g
        ctx.fillRect(bx - rr, by - rr, rr * 2, rr * 2)
      }

      // os filamentos: cordas com atraso; parado, sobem de leve; em movimento, correm para trás
      const dirX = vel > 30 ? vx / vel : 0
      const dirY = vel > 30 ? vy / vel : 0
      for (const f of fios) {
        const n = f.nos
        n[0]!.x = bx
        n[0]!.y = by
        const seg = SEG * f.l * (1 + hover * 0.25) * (1 + mov * 0.2) * (1 - sono * 0.15)
        for (let j = 1; j < NOS; j++) {
          const p = n[j]!
          const q = n[j - 1]!
          const jt = j / NOS
          if (!calmo) {
            p.x += Math.sin(t * f.w + j * 0.55 + f.ph) * f.amp * jt * 60 * dt * 0.3
            p.y += Math.cos(t * f.w * 0.8 + j * 0.5 + f.ph * 1.3) * f.amp * jt * 60 * dt * 0.22
            p.y -= 20 * dt * jt * (1 - mov * 0.7)
          }
          if (hover > 0.01 && j > NOS * 0.35) {
            p.x += (alvoX - p.x) * hover * 1.4 * dt * jt
            p.y += (alvoY - p.y) * hover * 1.4 * dt * jt
          }
          let dx = p.x - q.x
          let dy = p.y - q.y
          const l = Math.hypot(dx, dy) || 1
          dx /= l
          dy /= l
          p.x = q.x + dx * seg
          p.y = q.y + dy * seg
        }
        for (let j = 1; j < NOS; j++) {
          const a = n[j - 1]!
          const b = n[j]!
          const jt = j / (NOS - 1)
          const forca = Math.pow(1 - jt, 1.4) * f.c * vida
          ctx.lineWidth = Math.max(0.3, 1.9 * f.c * Math.pow(1 - jt, 1.1))
          ctx.strokeStyle = jt < 0.45 ? cor('a', 0.6 * forca) : cor('b', 0.6 * forca)
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }

      // pó de luz: pouco, só ao mover
      if (!calmo && mov > 0.2) {
        acumulaPo += dt * 22 * mov
        while (acumulaPo >= 1 && po.length < MAX_PO) {
          acumulaPo -= 1
          po.push({ x: bx + (Math.random() - 0.5) * 4, y: by + (Math.random() - 0.5) * 4, vx: (Math.random() - 0.5) * 14 - dirX * 6, vy: (Math.random() - 0.5) * 14 - 8, t0: t, vida: 0.5 + Math.random() * 0.6, s: 0.7 + Math.random() * 0.6 })
        }
      }
      for (let i = po.length - 1; i >= 0; i--) {
        const p = po[i]!
        const k = (t - p.t0) / p.vida
        if (k >= 1) {
          po.splice(i, 1)
          continue
        }
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vx *= 1 - 1.6 * dt
        p.vy *= 1 - 1.6 * dt
        const al = 1 - k
        ctx.fillStyle = cor('b', 0.2 * al)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.s * 2.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = cor('a', 0.75 * al)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.s * 0.7, 0, Math.PI * 2)
        ctx.fill()
      }

      // duas luzinhas que o orbitam, mais perto quando ele percebe um alvo
      for (const c of COMPANHEIROS) {
        const th = c.a + t * c.v * (1 + hover * 0.6)
        const rr = c.r * (1 - hover * 0.25) * (1 + Math.sin(t * 1.7 + c.a) * 0.1)
        const px = bx + Math.cos(th) * rr - dirX * mov * 5
        const py = by + Math.sin(th) * rr * 0.8 - dirY * mov * 5
        ctx.fillStyle = cor('b', 0.22 * vida)
        ctx.beginPath()
        ctx.arc(px, py, c.k * 2.8, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = cor('a', 0.8 * vida)
        ctx.beginPath()
        ctx.arc(px, py, c.k * 0.8, 0, Math.PI * 2)
        ctx.fill()
      }

      // o coração do ser
      const rn = 4.6 * pulso * (1 + hover * 0.25)
      const nuc = ctx.createRadialGradient(bx, by, 0, bx, by, rn)
      nuc.addColorStop(0, escuro ? 'rgba(255,255,255,1)' : 'rgba(0,10,120,1)')
      nuc.addColorStop(0.5, cor('a', 0.9))
      nuc.addColorStop(1, cor('a', 0))
      ctx.fillStyle = nuc
      ctx.beginPath()
      ctx.arc(bx, by, rn, 0, Math.PI * 2)
      ctx.fill()

      // clique: uma onda curta e fina (fora da escala do corpo, centrada onde o clique aconteceu)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      for (let i = ondas.length - 1; i >= 0; i--) {
        const o = ondas[i]!
        const k = (t - o.t0) / 0.55
        if (k >= 1) {
          ondas.splice(i, 1)
          continue
        }
        const e = 1 - Math.pow(1 - k, 3)
        ctx.lineWidth = 1.2 * (1 - k) + 0.3
        ctx.strokeStyle = cor('a', (1 - k) * 0.6)
        ctx.beginPath()
        ctx.arc(o.x, o.y, (6 + e * 32) * E, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.globalCompositeOperation = 'source-over'
    }
    id = requestAnimationFrame(quadro)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('resize', medir)
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerdown', desceu)
      html.removeEventListener('mouseleave', saiu)
      html.classList.remove('mira-ativa')
    }
  }, [])

  return (
    <div ref={raiz} className="mira" data-ativo="0" aria-hidden>
      <canvas ref={tela} className="mira-tela" />
    </div>
  )
}
