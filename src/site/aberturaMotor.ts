import { FRAGMENTO, VERTICE } from './aberturaShader'
import { epoca, tempoGlobal } from './tempoGlobal'

// O motor da tela de abertura (src/site/Abertura.tsx): compila o shader da íris, carrega a foto, conduz o roteiro e desenha.
// Não toca em DOM nem em React: roda num Worker com OffscreenCanvas (a animação não depende mais da thread principal, que
// fica presa na hidratação e na montagem das cenas) ou, onde isso não existe, na própria thread principal, com a mesma API.

const FOTO = 1086 / 1448
// o olho robótico na foto humano.webp, medido nos pixels: centro do reflexo da pupila e raio do disco azul da íris
const OLHO = { u: 643.1 / 1086, v: 429.9 / 1448, r: 22 / 1448 }
// roteiro, em segundos: a mira aparece, o olho liga, o anel calibra; carregado (e passado o mínimo), foca, recua e a sala
// acende. Nunca prende o visitante por mais que o teto
const ROT = { hud: 0.25, liga: 1.0, cal: 1.25, minimo: 3.4, teto: 7, recuo: 0.5, sala: 1.45 }
const UNIFORMS = ['uRes', 'uDpr', 'uT', 'uZ', 'uE', 'uEr', 'uR', 'uFoto', 'uAura', 'uOlhar', 'uHud', 'uLiga', 'uCal', 'uProg', 'uPupila', 'uFlash', 'uSala', 'uIris', 'uPerto', 'uFase', 'uGlitch', 'uSemente'] as const
type Locais = Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>

const cl = (x: number) => Math.min(1, Math.max(0, x))
const sm = (a: number, b: number, x: number) => {
  const k = cl((x - a) / (b - a))
  return k * k * (3 - 2 * k)
}
const io = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
// o relevo do rosto no retrato do topo (a mesma conta do vertex shader de src/cena/Retrato.tsx e do shader da abertura)
const RELEVO = 0.4689
const relevoFoto = (u: number, v: number) => {
  const cx = (u - 0.5) / 0.25
  const cy = (v - 0.71) / 0.27
  const cabeca = Math.sqrt(Math.max(0, 1 - (cx * cx + cy * cy)))
  const tx = (u - 0.5) / 0.62
  const ty = v / 0.46
  const tronco = Math.sqrt(Math.max(0, 1 - (tx * tx + ty * ty))) * 0.55
  const px = (u - 0.5) / 0.11
  const py = (v - 0.47) / 0.12
  const pescoco = Math.sqrt(Math.max(0, 1 - (px * px + py * py))) * 0.7
  return Math.max(cabeca, tronco, pescoco)
}

export type Saida =
  | { tipo: 'carga'; valor: number }
  | { tipo: 'flags'; carga: boolean; pular: boolean }
  | { tipo: 'sair' }
  | { tipo: 'erro'; motivo: string }
  // medição (só com ?diag na URL): instante absoluto (ms) de cada marco do motor
  | { tipo: 'diag'; evento: string; epoca: number }

export type Progresso = {
  /** soma dos pesos das cenas que já avisaram */
  pesoFeito: number
  /** peso da próxima cena pendente (0 se não há) */
  pendente: number
  /** todas as cenas avisaram */
  todas: boolean
  /** instante absoluto (ms, ver epoca()) em que a última cena avisou */
  ultimaConclusao: number
}

type Frame = (cb: (t: number) => void) => number
const pedirQuadro: Frame = typeof requestAnimationFrame === 'function' ? (cb) => requestAnimationFrame(cb) : (cb) => setTimeout(() => cb(performance.now()), 16) as unknown as number
const cancelarQuadro = (id: number) => (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(id) : clearTimeout(id))

export class Motor {
  private gl: WebGL2RenderingContext | null
  private vivo = true
  private id = 0
  private U: Locais | null = null
  private prog: WebGLProgram | null = null
  private shaders: WebGLShader[] = []
  private paralela: { COMPLETION_STATUS_KHR: number } | null = null
  private tex: WebGLTexture | null = null
  private texAura: WebGLTexture | null = null
  private carregadas = 0
  // enquadramento
  private W = 1
  private H = 1
  private dpr = 1
  private escala = 1 // escala de resolução adaptativa (1 = a densidade da tela, até o teto)
  private R = { x: 0, y: 0, w: 1, h: 1 }
  private E: [number, number] = [0, 0]
  private Er = 1
  // entrada
  private olhar = { x: 0, y: 0, tx: 0, ty: 0, ultimo: -1e9 }
  private clique = -1e9
  private pularPedido = false
  private prog_: Progresso = { pesoFeito: 0, pendente: 0, todas: false, ultimaConclusao: epoca() }
  // roteiro
  private t0 = 0
  private carga = 0
  private travado = 0
  private saindo = false
  private mostrado = -1
  private flags = { carga: true, pular: false }
  private medias = { acum: 0, n: 0 }
  private escalaInicial = false

  constructor(
    private canvas: HTMLCanvasElement | OffscreenCanvas,
    private urls: { foto: string; aura: string },
    private saida: (m: Saida) => void,
    private diag = false,
  ) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' }) as WebGL2RenderingContext | null
    this.gl = gl
    this.marco('motor-criado')
    if (!gl) {
      this.vivo = false
      saida({ tipo: 'erro', motivo: 'sem-webgl2' })
      return
    }
    // O programa compila em paralelo (KHR_parallel_shader_compile) e só é consultado quando o driver terminou
    this.paralela = gl.getExtension('KHR_parallel_shader_compile')
    const prog = gl.createProgram()!
    for (const [tipo, src] of [[gl.VERTEX_SHADER, VERTICE], [gl.FRAGMENT_SHADER, FRAGMENTO]] as const) {
      const sh = gl.createShader(tipo)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      gl.attachShader(prog, sh)
      this.shaders.push(sh)
    }
    gl.bindAttribLocation(prog, 0, 'p')
    gl.linkProgram(prog)
    this.prog = prog
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    // a foto e a silhueta de onde saem as curvas de nível (decodificadas fora da thread de desenho)
    this.tex = gl.createTexture()
    this.texAura = gl.createTexture()
    this.subir(this.tex, 0, urls.foto)
    this.subir(this.texAura, 1, urls.aura)
    this.id = pedirQuadro((t) => this.quadro(t))
  }

  private subir(t: WebGLTexture | null, unidade: number, url: string) {
    const gl = this.gl!
    fetch(url)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((b) => createImageBitmap(b, { premultiplyAlpha: 'none' }))
      .then((im) => {
        if (!this.vivo) return im.close()
        gl.activeTexture(gl.TEXTURE0 + unidade)
        gl.bindTexture(gl.TEXTURE_2D, t)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im)
        gl.generateMipmap(gl.TEXTURE_2D)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        im.close()
        this.carregadas++
      })
      .catch(() => this.carregadas++)
  }

  // ---------- entrada (vem da thread principal, por mensagem ou chamada direta) ----------
  medir(W: number, H: number, dprTela: number) {
    this.W = W
    this.H = H
    this.dpr = Math.min(1.5, dprTela || 1)
    this.aplicarTamanho()
  }
  private aplicarTamanho() {
    const gl = this.gl
    if (!gl) return
    // tela com muitos pixels (4K, HiDPI grande): já começa mais baixo, o custo do shader é por pixel
    if (!this.escalaInicial) {
      this.escalaInicial = true
      const px = this.W * this.H * this.dpr * this.dpr
      if (px > 3.2e6) this.escala = Math.max(0.6, Math.sqrt(3.2e6 / px))
    }
    const d = this.dpr * this.escala
    this.canvas.width = Math.max(1, Math.round(this.W * d))
    this.canvas.height = Math.max(1, Math.round(this.H * d))
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    // o enquadramento do retrato do site (src/cena/Retrato.tsx)
    const { W, H } = this
    const asp = W / H
    const alt = Math.min(0.48 / 0.41, (0.72 * asp) / (0.465 * FOTO))
    const base = Math.min(0, 1 - 0.11 - alt * (1 - 95 / 1448))
    const h = alt * H
    const w = h * FOTO
    this.R = { x: W / 2 - w / 2, y: H * (1 - base) - h, w, h }
    // o herói empurra o rosto para a câmera pelo relevo (perspectiva: fov 30, câmera a 10): o olho cai um pouco mais longe
    // do centro e maior que na foto plana. A íris desenhada tem de cair onde o olho estará no herói
    const planoX = this.R.x + OLHO.u * this.R.w
    const planoY = this.R.y + OLHO.v * this.R.h
    const z = relevoFoto(OLHO.u, 1 - OLHO.v) * RELEVO
    const s = 10 / (10 - z)
    this.E = [W / 2 + (planoX - W / 2) * s, H / 2 + (planoY - H / 2) * s]
    this.Er = OLHO.r * this.R.h * s
  }
  olharPara(x: number, y: number) {
    this.olhar.tx = x
    this.olhar.ty = y
    this.olhar.ultimo = performance.now()
  }
  tocar() {
    this.clique = performance.now()
  }
  pular() {
    this.pularPedido = true
  }
  progresso(p: Progresso) {
    this.prog_ = p
  }

  // ---------- o laço ----------
  // as rajadas de glitch do olho (em segundos do relógio da abertura)
  private proxGlitch = 1.1
  private fimGlitch = 0

  private aplicar(n: (typeof UNIFORMS)[number], ...v: number[]) {
    const l = this.U?.[n]
    const gl = this.gl
    if (!l || !gl) return
    if (v.length === 1) gl.uniform1f(l, v[0]!)
    else if (v.length === 2) gl.uniform2f(l, v[0]!, v[1]!)
    else gl.uniform4f(l, v[0]!, v[1]!, v[2]!, v[3]!)
  }

  private anterior = 0
  private primeiro = false
  private marco(evento: string) {
    if (this.diag) this.saida({ tipo: 'diag', evento, epoca: epoca() })
  }
  private quadro(agora: number) {
    if (!this.vivo) return
    this.id = pedirQuadro((t) => this.quadro(t))
    const gl = this.gl!
    if (!this.U) {
      if (this.paralela && !gl.getProgramParameter(this.prog!, this.paralela.COMPLETION_STATUS_KHR)) return
      if (!gl.getProgramParameter(this.prog!, gl.LINK_STATUS)) {
        const log = this.shaders.map((sh) => gl.getShaderInfoLog(sh)).join('\n') + gl.getProgramInfoLog(this.prog!)
        this.saida({ tipo: 'erro', motivo: log })
        this.parar()
        return
      }
      gl.useProgram(this.prog!)
      const locais = Object.fromEntries(UNIFORMS.map((n) => [n, gl.getUniformLocation(this.prog!, n)])) as Locais
      this.U = locais
      this.marco('programa-pronto')
      gl.uniform1i(locais.uFoto, 0)
      gl.uniform1i(locais.uAura, 1)
      this.t0 = agora
      this.anterior = agora
    }
    const dtQuadro = agora - this.anterior
    this.anterior = agora
    this.adaptarResolucao(dtQuadro)

    const sec = (agora - this.t0) / 1000
    const P = this.prog_
    const avanco = P.pendente * 0.8 * (1 - Math.exp(-(epoca() - P.ultimaConclusao) / 1600))
    const alvo = P.todas ? 1 : Math.min(0.96, P.pesoFeito + avanco)
    // a calibração só começa a contar depois que o olho ligou
    if (sec > ROT.cal) this.carga += (alvo - this.carga) * 0.06
    const pronto = (P.todas && this.carga > 0.985 && sec >= ROT.minimo && this.carregadas >= 2) || sec >= ROT.teto || this.pularPedido
    if (pronto && !this.travado) {
      this.travado = sec
      this.carga = 1
    }
    const f = this.travado ? sec - this.travado : -1

    const o = this.olhar
    o.x += (o.tx - o.x) * 0.06
    o.y += (o.ty - o.y) * 0.06
    if (agora - o.ultimo > 2500) {
      o.tx = Math.sin(agora / 1700) * 0.5
      o.ty = Math.sin(agora / 2300) * 0.3
    }
    if (f > 0) {
      o.tx *= 0.9
      o.ty *= 0.9
    }

    const hud = sm(ROT.hud, ROT.hud + 1.0, sec) * (f < 0 ? 1 : 1 - sm(ROT.recuo, ROT.recuo + 0.8, f))
    const liga = sec < ROT.liga ? 0 : sec < ROT.liga + 0.4 ? (Math.sin((sec - ROT.liga) * 55) > 0 ? 0.4 + (sec - ROT.liga) * 1.5 : 0.08) : 1
    const cal = sm(ROT.cal, ROT.cal + 1.1, sec)
    const cliq = Math.exp(-(agora - this.clique) / 260)
    let pup = 0.09 + 0.1 * sm(ROT.liga, ROT.liga + 0.9, sec) + 0.012 * Math.sin(sec * 1.7) - 0.06 * cliq
    if (f >= 0) pup = pup - 0.08 * sm(0, 0.4, f) + 0.05 * sm(0.5, 1.2, f)
    const flash = f >= 0 ? Math.exp(-Math.max(0, f - 0.45) * 6) * sm(0.38, 0.45, f) : 0
    // recuo: do close extremo ao enquadramento do topo, em escala logarítmica; de perto, a íris nunca encosta na borda
    const { W, H, E, Er } = this
    const folga = Math.min(E[0], W - E[0], E[1], H - E[1]) * 0.82
    const Z0 = Math.min(60, Math.min(Math.min(W, H) * 0.34, folga) / Er)
    const kz = f < 0 ? 0 : io(cl((f - ROT.recuo) / (ROT.sala + 0.6 - ROT.recuo)))
    const z = Math.exp(Math.log(Z0) * (1 - kz)) * (1 + 0.03 * Math.sin(sec * 0.6) * (1 - kz))
    const sala = f < 0 ? 0 : sm(ROT.sala - 0.4, ROT.sala + 0.8, f)
    const perto = sm(1.15, 3.5, z)

    // o que a thread principal mostra em volta (a porcentagem, o botão de pular), só quando muda
    const flags = { carga: f < 0 || f < ROT.recuo, pular: sec > 1.2 && (f < 0 || f < ROT.recuo) }
    if (flags.carga !== this.flags.carga || flags.pular !== this.flags.pular) {
      this.flags = flags
      this.saida({ tipo: 'flags', ...flags })
    }
    const pct = Math.round(this.carga * 100)
    if (pct !== this.mostrado) {
      this.mostrado = pct
      this.saida({ tipo: 'carga', valor: pct })
    }

    this.aplicar('uRes', this.canvas.width, this.canvas.height)
    this.aplicar('uDpr', this.dpr * this.escala)
    this.aplicar('uT', sec)
    this.aplicar('uFase', tempoGlobal())
    this.aplicar('uZ', z)
    this.aplicar('uE', E[0], E[1])
    this.aplicar('uEr', Er)
    this.aplicar('uR', this.R.x, this.R.y, this.R.w, this.R.h)
    this.aplicar('uOlhar', o.x, o.y)
    this.aplicar('uHud', hud)
    this.aplicar('uLiga', liga)
    this.aplicar('uCal', cal)
    this.aplicar('uProg', this.carga)
    this.aplicar('uPupila', Math.max(0.03, pup))
    this.aplicar('uFlash', flash)
    this.aplicar('uSala', sala)
    this.aplicar('uIris', 1)
    this.aplicar('uPerto', perto)
    // o olho falha de vez em quando: rajadas curtas de glitch, sorteadas; nunca quando a sala acende (a imagem final tem de ser a do retrato)
    if (sec > this.proxGlitch) {
      this.fimGlitch = sec + 0.08 + Math.random() * 0.16
      this.proxGlitch = sec + 0.9 + Math.random() * 1.9
    }
    this.aplicar('uGlitch', sec < this.fimGlitch && sala < 0.01 ? 0.55 + Math.random() * 0.45 : 0)
    this.aplicar('uSemente', Math.random() * 1000)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.tex)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.texAura)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    if (!this.primeiro) {
      this.primeiro = true
      this.marco('primeiro-quadro')
    }

    // a câmera chegou ao enquadramento do topo e a sala acendeu: o retrato de verdade já está por baixo
    if (f > ROT.sala + 0.7 && !this.saindo) {
      this.saindo = true
      this.saida({ tipo: 'sair' })
    }
  }

  // Resolução adaptativa: em tela de alta densidade ou GPU fraca o shader (pesado) não chega a 60 quadros. Se a média dos
  // últimos ~30 quadros passa de 21 ms (menos de ~47 por segundo), baixa a resolução interna em passos de 18 %, até 50 % da original. Só no
  // começo e no meio do roteiro: no fim, a imagem tem de estar nítida para a troca com o herói
  private adaptarResolucao(dt: number) {
    if (this.saindo || this.travado || dt <= 0 || dt > 250) return
    const m = this.medias
    m.acum += dt
    m.n++
    if (m.n < 30) return
    const media = m.acum / m.n
    m.acum = 0
    m.n = 0
    if (media > 21 && this.escala > 0.5) {
      this.escala = Math.max(0.5, this.escala * 0.82)
      this.aplicarTamanho()
    }
  }

  parar() {
    this.vivo = false
    cancelarQuadro(this.id)
    const gl = this.gl
    if (!gl) return
    try {
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    } catch {
      /* contexto já perdido */
    }
    this.gl = null
  }
}
