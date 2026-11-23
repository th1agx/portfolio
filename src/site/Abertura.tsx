'use client'

import { useEffect, useRef, useState } from 'react'
import { aguardar, sinalFeito, sinalizar } from './fila'
import { arquivo } from '@/content/caminho'
import { FRAGMENTO, VERTICE } from './aberturaShader'
import s from './abertura.module.css'

// Tela de abertura: um close extremo do olho robótico do retrato (o olho direito, azul, do rosto meio humano). A íris
// mecânica é desenhada na placa de vídeo (src/site/aberturaShader.ts) e calibra enquanto o site carrega por trás: o anel
// de células e a porcentagem do canto seguem as cenas de verdade (retrato, vale, robô guia; src/site/fila.ts). Quando
// tudo está pronto, o diafragma foca, a câmera recua ancorada no olho até a foto estar no enquadramento do topo, a luz da
// sala acende (o Deep Blue do topo) e a abertura se dissolve sobre o retrato de verdade, que já está desenhado por baixo.
//
// WebGL 2 puro (sem three.js), um programa só, compilado em paralelo; o contexto é liberado no fim. Sem WebGL 2, com
// movimento reduzido ou com a página aberta no meio, a abertura não aparece.

const FOTO = 1086 / 1448
// o olho robótico na foto humano.webp, medido nos pixels: centro do reflexo da pupila e raio do disco azul da íris
const OLHO = { u: 643.1 / 1086, v: 429.9 / 1448, r: 22 / 1448 }
const ETAPAS = [
  { sinal: 'retrato', peso: 0.62 },
  { sinal: 'lua', peso: 0.38 },
]
// roteiro, em segundos: a mira aparece, o olho liga, o anel calibra; carregado (e passado o mínimo), foca, recua e a
// sala acende. Nunca prende o visitante por mais que o teto
const ROT = { hud: 0.25, liga: 1.0, cal: 1.25, minimo: 3.4, teto: 7, recuo: 0.5, sala: 1.45 }
const UNIFORMS = ['uRes', 'uDpr', 'uT', 'uZ', 'uE', 'uEr', 'uR', 'uFoto', 'uAura', 'uOlhar', 'uHud', 'uLiga', 'uCal', 'uProg', 'uPupila', 'uFlash', 'uSala', 'uIris', 'uPerto'] as const

const cl = (x: number) => Math.min(1, Math.max(0, x))
const sm = (a: number, b: number, x: number) => {
  const k = cl((x - a) / (b - a))
  return k * k * (3 - 2 * k)
}
const io = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

export function Abertura() {
  const raiz = useRef<HTMLDivElement>(null)
  const tela = useRef<HTMLCanvasElement>(null)
  const numero = useRef<HTMLDivElement>(null)
  const [ativa, setAtiva] = useState(true)

  useEffect(() => {
    const el = raiz.current
    const cv = tela.current
    if (!el || !cv) return
    const html = document.documentElement
    let vivo = true
    const encerrar = () => {
      sinalizar('abertura')
      if (vivo) setAtiva(false)
    }
    // página recarregada no meio (o topo nem está na tela) ou movimento reduzido: sem abertura
    if (scrollY > 40 || matchMedia('(prefers-reduced-motion: reduce)').matches) return encerrar()
    const gl = cv.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' })
    if (!gl) return encerrar()

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

    // ---- o programa: compila em paralelo (KHR_parallel_shader_compile) e só é consultado quando o driver terminou ----
    const paralela = gl.getExtension('KHR_parallel_shader_compile')
    const prog = gl.createProgram()!
    const shaders: WebGLShader[] = []
    for (const [tipo, src] of [[gl.VERTEX_SHADER, VERTICE], [gl.FRAGMENT_SHADER, FRAGMENTO]] as const) {
      const sh = gl.createShader(tipo)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      gl.attachShader(prog, sh)
      shaders.push(sh)
    }
    gl.bindAttribLocation(prog, 0, 'p')
    gl.linkProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    type Locais = Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>
    let U: Locais | null = null

    // ---- a foto do rosto (a mesma do topo; o <link rel=preload> do layout já a trouxe) ----
    // (a foto e a silhueta de onde saem as curvas de nível; o <link rel=preload> do layout já as trouxe)
    const tex = gl.createTexture()
    const texAura = gl.createTexture()
    let carregadas = 0
    const fotoPronta = () => carregadas >= 2
    const subir = (t: WebGLTexture | null, unidade: number, url: string) => {
      const im = new Image()
      im.crossOrigin = 'anonymous'
      im.decoding = 'async'
      im.onload = () => {
        if (!vivo) return
        gl.activeTexture(gl.TEXTURE0 + unidade)
        gl.bindTexture(gl.TEXTURE_2D, t)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im)
        gl.generateMipmap(gl.TEXTURE_2D)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        carregadas++
      }
      im.onerror = () => carregadas++
      im.src = arquivo(url)
    }
    subir(tex, 0, '/retrato/humano.webp')
    subir(texAura, 1, '/retrato/aura.png')

    // ---- enquadramento: o mesmo do retrato do site (src/cena/Retrato.tsx) ----
    let W = 1, H = 1, dpr = 1
    let R = { x: 0, y: 0, w: 1, h: 1 }
    let E: [number, number] = [0, 0]
    let Er = 1
    const medir = () => {
      W = innerWidth
      H = innerHeight
      dpr = Math.min(1.5, devicePixelRatio || 1)
      cv.width = Math.round(W * dpr)
      cv.height = Math.round(H * dpr)
      gl.viewport(0, 0, cv.width, cv.height)
      const asp = W / H
      const alt = Math.min(0.48 / 0.41, (0.72 * asp) / (0.465 * FOTO))
      const base = Math.min(0, 1 - 0.11 - alt * (1 - 95 / 1448))
      const h = alt * H
      const w = h * FOTO
      R = { x: W / 2 - w / 2, y: H * (1 - base) - h, w, h }
      E = [R.x + OLHO.u * R.w, R.y + OLHO.v * R.h]
      Er = OLHO.r * R.h
    }
    medir()
    addEventListener('resize', medir)

    // ---- olhar (as camadas da íris seguem o cursor), clique (a pupila contrai) e o botão de pular ----
    const olhar = { x: 0, y: 0, tx: 0, ty: 0, ultimo: -1e9 }
    const mover = (e: PointerEvent) => {
      olhar.tx = (e.clientX / W - 0.5) * 2
      olhar.ty = -(e.clientY / H - 0.5) * 2
      olhar.ultimo = performance.now()
    }
    addEventListener('pointermove', mover, { passive: true })
    let clique = -1e9
    const tocar = () => (clique = performance.now())
    cv.addEventListener('pointerdown', tocar)
    let pular = false
    const botao = el.querySelector<HTMLButtonElement>('[data-pular]')
    const aoPular = () => (pular = true)
    botao?.addEventListener('click', aoPular)

    // ---- a porcentagem: três colunas de dígitos que rolam ----
    const colunas = [...(numero.current?.querySelectorAll<HTMLElement>('[data-digito]') ?? [])]
    let mostrado = -1
    const mostrar = (v: number) => {
      if (v === mostrado) return
      mostrado = v
      const t = String(v).padStart(3, '0')
      colunas.forEach((c, k) => {
        const tira = c.firstElementChild as HTMLElement | null
        if (tira) tira.style.translate = `0 ${-Number(t[k]) * 1.2}em`
        c.hidden = k === 0 && v < 100
      })
    }

    // ---- progresso real: cada cena pesa uma fatia; enquanto a próxima não avisa, avança devagar sobre ela ----
    let pesoFeito = 0
    let ultimaConclusao = performance.now()
    ETAPAS.forEach((e) =>
      aguardar(e.sinal, 20000).then(() => {
        if (!vivo || !sinalFeito(e.sinal)) return
        pesoFeito += e.peso
        ultimaConclusao = performance.now()
      }),
    )

    let t0 = 0 // começa quando o programa compilou
    let carga = 0
    let travado = 0 // instante (s) em que o carregamento terminou: dali o roteiro segue sozinho
    let saindo = false
    let id = 0
    const aplicar = (n: (typeof UNIFORMS)[number], ...v: number[]) => {
      const l = U?.[n]
      if (!l) return
      if (v.length === 1) gl.uniform1f(l, v[0]!)
      else if (v.length === 2) gl.uniform2f(l, v[0]!, v[1]!)
      else gl.uniform4f(l, v[0]!, v[1]!, v[2]!, v[3]!)
    }

    const quadro = (agora: number) => {
      if (!vivo) return
      id = requestAnimationFrame(quadro)
      if (!U) {
        if (paralela && !gl.getProgramParameter(prog, paralela.COMPLETION_STATUS_KHR)) return
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
          console.error(shaders.map((sh) => gl.getShaderInfoLog(sh)).join('\n'), gl.getProgramInfoLog(prog))
          cancelAnimationFrame(id)
          soltar()
          return encerrar()
        }
        gl.useProgram(prog)
        const locais = Object.fromEntries(UNIFORMS.map((n) => [n, gl.getUniformLocation(prog, n)])) as Locais
        U = locais
        gl.uniform1i(locais.uFoto, 0)
        gl.uniform1i(locais.uAura, 1)
        t0 = agora
      }
      const sec = (agora - t0) / 1000
      const todas = ETAPAS.every((e) => sinalFeito(e.sinal))
      const pendente = ETAPAS.find((e) => !sinalFeito(e.sinal))?.peso ?? 0
      const avanco = pendente * 0.8 * (1 - Math.exp(-(agora - ultimaConclusao) / 1600))
      const alvo = todas ? 1 : Math.min(0.96, pesoFeito + avanco)
      // a calibração só começa a contar depois que o olho ligou
      if (sec > ROT.cal) carga += (alvo - carga) * 0.06
      const pronto = (todas && carga > 0.985 && sec >= ROT.minimo && fotoPronta()) || sec >= ROT.teto || pular
      if (pronto && !travado) {
        travado = sec
        carga = 1
      }
      const f = travado ? sec - travado : -1

      olhar.x += (olhar.tx - olhar.x) * 0.06
      olhar.y += (olhar.ty - olhar.y) * 0.06
      if (agora - olhar.ultimo > 2500) {
        olhar.tx = Math.sin(agora / 1700) * 0.5
        olhar.ty = Math.sin(agora / 2300) * 0.3
      }
      if (f > 0) {
        olhar.tx *= 0.9
        olhar.ty *= 0.9
      }

      const hud = sm(ROT.hud, ROT.hud + 1.0, sec) * (f < 0 ? 1 : 1 - sm(ROT.recuo, ROT.recuo + 0.8, f))
      const liga = sec < ROT.liga ? 0 : sec < ROT.liga + 0.4 ? (Math.sin((sec - ROT.liga) * 55) > 0 ? 0.4 + (sec - ROT.liga) * 1.5 : 0.08) : 1
      const cal = sm(ROT.cal, ROT.cal + 1.1, sec)
      const cliq = Math.exp(-(agora - clique) / 260)
      let pup = 0.09 + 0.1 * sm(ROT.liga, ROT.liga + 0.9, sec) + 0.012 * Math.sin(sec * 1.7) - 0.06 * cliq
      if (f >= 0) pup = pup - 0.08 * sm(0, 0.4, f) + 0.05 * sm(0.5, 1.2, f)
      const flash = f >= 0 ? Math.exp(-Math.max(0, f - 0.45) * 6) * sm(0.38, 0.45, f) : 0
      // recuo: do close extremo ao enquadramento do topo, em escala logarítmica; de perto, a íris nunca encosta na borda
      const folga = Math.min(E[0], W - E[0], E[1], H - E[1]) * 0.82
      const Z0 = Math.min(60, Math.min(Math.min(W, H) * 0.34, folga) / Er)
      const kz = f < 0 ? 0 : io(cl((f - ROT.recuo) / (ROT.sala + 0.6 - ROT.recuo)))
      const z = Math.exp(Math.log(Z0) * (1 - kz)) * (1 + 0.03 * Math.sin(sec * 0.6) * (1 - kz))
      const sala = f < 0 ? 0 : sm(ROT.sala - 0.4, ROT.sala + 0.8, f)
      const perto = sm(1.15, 3.5, z)

      el.dataset.carga = f < 0 || f < ROT.recuo ? '1' : '0'
      el.dataset.pular = sec > 1.2 && (f < 0 || f < ROT.recuo) ? '1' : '0'
      mostrar(Math.round(carga * 100))

      aplicar('uRes', cv.width, cv.height)
      aplicar('uDpr', dpr)
      aplicar('uT', sec)
      aplicar('uZ', z)
      aplicar('uE', E[0], E[1])
      aplicar('uEr', Er)
      aplicar('uR', R.x, R.y, R.w, R.h)
      aplicar('uOlhar', olhar.x, olhar.y)
      aplicar('uHud', hud)
      aplicar('uLiga', liga)
      aplicar('uCal', cal)
      aplicar('uProg', carga)
      aplicar('uPupila', Math.max(0.03, pup))
      aplicar('uFlash', flash)
      aplicar('uSala', sala)
      aplicar('uIris', 1)
      aplicar('uPerto', perto)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, texAura)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      // a câmera chegou ao enquadramento do topo e a sala acendeu: o retrato de verdade já está por baixo
      if (f > ROT.sala + 0.7 && !saindo) {
        saindo = true
        soltar()
        // o retrato entra sem a onda (src/cena/Retrato.tsx): a abertura já mostrou o rosto inteiro
        sinalizar('abertura')
        el.dataset.estado = 'saindo'
        window.setTimeout(() => {
          cancelAnimationFrame(id)
          gl.getExtension('WEBGL_lose_context')?.loseContext()
          if (vivo) setAtiva(false)
        }, 750)
      }
    }
    id = requestAnimationFrame(quadro)

    return () => {
      vivo = false
      cancelAnimationFrame(id)
      soltar()
      removeEventListener('resize', medir)
      removeEventListener('pointermove', mover)
      cv.removeEventListener('pointerdown', tocar)
      botao?.removeEventListener('click', aoPular)
      sinalizar('abertura')
    }
  }, [])

  if (!ativa) return null

  return (
    // "Carregando 00 %" já vem no HTML: aparece no primeiro desenho, antes de o JavaScript e o shader ficarem prontos
    <div ref={raiz} className={s.raiz} data-abertura-raiz data-estado="carregando" data-carga="1" data-pular="0">
      <canvas ref={tela} className={s.tela} aria-hidden />
      <p className="visually-hidden" role="status">
        Carregando o portfólio de Thiago Antunes
      </p>
      <div className={s.carga} aria-hidden>
        <span>Carregando</span>
        <div ref={numero} className={s.numero}>
          {[0, 1, 2].map((k) => (
            <div key={k} className={s.digito} data-digito hidden={k === 0}>
              <i>
                {Array.from({ length: 10 }, (_, n) => (
                  <b key={n}>{n}</b>
                ))}
              </i>
            </div>
          ))}
          <small>%</small>
        </div>
      </div>
      <button type="button" className={s.pular} data-pular-botao data-pular>
        Pular abertura
      </button>
    </div>
  )
}
