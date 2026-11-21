// "Até aqui": a trilha de luz e os cartões da trajetória, num canvas WebGL fixo por trás do texto.
//
// Os cartões seguem a galeria de trabalhos do orchestrated.nl (CasesGallery, lida no código deles): cada
// imagem é desenhada no lugar da sua moldura na página e o vértice a deforma com a rolagem —
//   - esticar: a borda que vai na frente fica presa e a de trás atrasa, mais no meio que nos cantos
//     (força 0,09, arco 0,45, aperto 0,16, velocidade cheia 3200 px/s, ataque 0,06 s e soltura 0,3 s);
//   - sino: na faixa de baixo da tela (45 % da altura, curva 3) as laterais se abrem, pouco devagar e
//     muito numa rolagem rápida (0,35 → 3,1), com uma onda lenta descendo (0,25);
//   - fluxo: uma onda que sobe pelo cartão, com amplitude da velocidade (0,035 da altura, 3,55 ondas);
//   - óleo: na mesma faixa, o furta-cor de película fina (0,58) — aqui puxado para o azul da marca.
// A trilha é a linha de luz em que os riscos dos projetos se juntaram: desce pelo meio, passa entre os
// cartões e termina no centro da tela, onde o túnel abre. O ponto mais claro corre por ela junto com a
// rolagem. Por trás, a mesma matriz de pontos do mundo dos projetos.

import { trilhaTela } from './trilhaTela'

export type CartaoTrilha = { el: HTMLElement; imagem: HTMLCanvasElement }

const vertCartao = `#version 300 es
in vec2 aUv;
uniform vec4 uRect;      // esquerda, topo, largura, altura (px CSS, y para baixo)
uniform vec2 uVista;
uniform float uEsticar;  // com sinal: > 0 rolando para baixo
uniform float uAtividade;
uniform float uTempo;
uniform float uFase;
out vec2 vUv;
out float vZona;
out float vTelaX;
out float vSombra;
void main() {
  vec2 uv = aUv;
  vUv = uv;
  float yTopo = 1.0 - uv.y;
  float s = abs(uEsticar);
  float dir = uEsticar < 0.0 ? -1.0 : 1.0;
  float rabo = uEsticar < 0.0 ? 1.0 - yTopo : yTopo;
  float px = uRect.x + uv.x * uRect.z;
  float py = uRect.y + yTopo * uRect.w;
  py += dir * s * uRect.w * rabo * (1.0 + 0.45 * sin(uv.x * 3.14159265));
  px += (0.5 - uv.x) * uRect.z * 0.16 * s * rabo * rabo;
  float f = py / uVista.y;
  float z = clamp((f - (1.0 - 0.45)) / 0.45, 0.0, 1.0);
  float zona = pow(z * z * (3.0 - 2.0 * z), 3.0);
  vSombra = 0.0;
  if (zona > 0.001) {
    float forca = uAtividade * zona;
    float arg = yTopo * 3.55 * 6.2831 + uFase;
    py += 0.035 * forca * uRect.w * sin(arg);
    px += 0.035 * 0.35 * forca * uRect.w * sin(arg * 0.7 + uv.x * 3.1416 + uFase * 0.3);
    vSombra = 0.22 * forca * cos(arg);
  }
  float organico = 1.0 + 0.25 * sin(f * 6.0 - uTempo * 0.8 + (uv.x - 0.5) * 2.2);
  float sino = 0.2 * mix(0.35, 3.1, uAtividade);
  px += (uv.x - 0.5) * uRect.z * sino * zona * organico;
  vZona = zona;
  vTelaX = px / uVista.x;
  gl_Position = vec4(px / uVista.x * 2.0 - 1.0, 1.0 - py / uVista.y * 2.0, 0.0, 1.0);
}`

const fragCartao = `#version 300 es
precision highp float;
uniform sampler2D uImagem;
uniform float uTempo;
uniform float uAlfa;
in vec2 vUv;
in float vZona;
in float vTelaX;
in float vSombra;
out vec4 saida;
float onda(float x, float t) { return sin(x * 4.2 + t * 1.3) * 0.55 + sin(x * 9.7 - t * 2.0) * 0.3 + sin(x * 17.0 + t * 0.7) * 0.15; }
vec3 giraMatiz(vec3 c, float h) {
  const vec3 k = vec3(0.57735);
  float ca = cos(h), sa = sin(h);
  return c * ca + cross(k, c) * sa + k * dot(k, c) * (1.0 - ca);
}
void main() {
  vec3 cor = texture(uImagem, vec2(vUv.x, 1.0 - vUv.y)).rgb;
  if (vZona > 0.001) {
    float ripple = onda(vTelaX * 1.6 + 0.7, uTempo * 1.3);
    float t = vZona * 1.4 + ripple * 0.35 + uTempo * 0.08;
    // película fina puxada para a marca: azul vivo, ciano e violeta no lugar do arco-íris inteiro
    vec3 irid = 0.5 + 0.5 * cos(6.2831 * (t + vec3(0.55, 0.42, 0.0)));
    irid = mix(irid, vec3(0.25, 0.35, 1.0), 0.35);
    float oleo = vZona * 0.58;
    cor = giraMatiz(cor, oleo * 0.7 * sin(t * 2.0));
    cor = mix(cor, cor * (0.7 + 0.6 * irid) + irid * 0.03, oleo);
  }
  cor *= 1.0 + vSombra;
  saida = vec4(cor * uAlfa, uAlfa);
}`

// a trilha: uma faixa de triângulos com o núcleo fino e um halo largo; o ponto da vez corre por ela
const vertTrilha = `#version 300 es
in vec2 aPos;     // px CSS na tela
in float aLado;   // -1 .. 1 através da faixa
in float aAo;     // 0 .. 1 ao longo da trilha
uniform vec2 uVista;
out float vLado;
out float vAo;
out float vY;
void main() {
  vLado = aLado;
  vAo = aAo;
  vY = aPos.y / uVista.y;
  gl_Position = vec4(aPos.x / uVista.x * 2.0 - 1.0, 1.0 - aPos.y / uVista.y * 2.0, 0.0, 1.0);
}`

const fragTrilha = `#version 300 es
precision highp float;
uniform float uLargura;   // meia largura da faixa, px
uniform float uMeia;      // meia largura do núcleo, px (a mesma do tubo 3D dos projetos)
uniform float uDpr;
uniform float uCabeca;    // onde está o ponto claro, 0 .. 1 ao longo
uniform float uAlfa;
uniform float uTempo;
in float vLado;
in float vAo;
in float vY;
out vec4 saida;
void main() {
  float d = abs(vLado) * uLargura;           // px do eixo
  // a mesma espessura e cor da linha 3D dos projetos vista de cima: núcleo branco de ~5 px e brilho azul
  float nucleo = 1.0 - smoothstep(uMeia - 0.6, uMeia + 0.6, d);
  float borda = 1.0 - smoothstep(0.55, 1.0, abs(vLado));
  float halo = (exp(-d * d / 160.0) * 0.35 + exp(-d / 26.0) * 0.12) * borda;
  // o trecho perto do ponto da vez brilha mais; pulsos finos correm pela linha
  float perto = exp(-pow((vAo - uCabeca) * 9.0, 2.0));
  float a = (nucleo + halo * 0.8) * (0.9 + 0.35 * perto);
  vec3 cor = mix(vec3(0.35, 0.5, 1.0), vec3(0.92, 0.96, 1.0), nucleo);
  saida = vec4(cor * a * uAlfa, 0.0);
}`

// matriz de fundo: pontos duros em grade, que andam a 35 % da rolagem (profundidade)
const vertPontos = `#version 300 es
in vec2 aPos;
uniform vec2 uVista;
uniform float uDesloca;
uniform float uDpr;
uniform float uTempo;
out float vA;
float h1(float n) { return fract(sin(n * 78.233) * 43758.5453); }
void main() {
  vec2 p = aPos;
  p.y = mod(p.y - uDesloca, uVista.y + 40.0) - 20.0;
  float col = floor(aPos.x / 22.0);
  float h = h1(col);
  float cab = fract(h * 13.0 + uTempo * (0.03 + h * 0.05));
  float d = fract(cab - p.y / uVista.y);
  vA = 0.16 + exp(-d * 9.0) * step(0.7, h) * 0.8;
  gl_PointSize = 1.4 * uDpr;
  gl_Position = vec4(p.x / uVista.x * 2.0 - 1.0, 1.0 - p.y / uVista.y * 2.0, 0.0, 1.0);
}`

const fragPontos = `#version 300 es
precision highp float;
uniform float uAlfa;
in float vA;
out vec4 saida;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float a = (1.0 - smoothstep(0.55, 1.0, length(q))) * vA * uAlfa;
  saida = vec4(vec3(0.5, 0.65, 1.0) * a, 0.0);
}`

export function iniciarAteAqui(canvas: HTMLCanvasElement, faixa: HTMLElement, cartoes: CartaoTrilha[], estado: { alfa: number; centro: { x: number; y: number } }) {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true })
  if (!gl || gl.isContextLost()) return null
  const compilar = (v: string, f: string) => {
    const p = gl.createProgram()!
    for (const [tipo, src] of [[gl.VERTEX_SHADER, v], [gl.FRAGMENT_SHADER, f]] as const) {
      const sh = gl.createShader(tipo)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(sh))
      gl.attachShader(p, sh)
      gl.deleteShader(sh)
    }
    gl.linkProgram(p)
    return p
  }
  const pCartao = compilar(vertCartao, fragCartao)
  const pTrilha = compilar(vertTrilha, fragTrilha)
  const pPontos = compilar(vertPontos, fragPontos)
  const u = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n)

  // malha de cada cartão: 40 × 40 vértices (o sino e a onda precisam de linhas para curvar)
  const N = 40
  const uvs: number[] = []
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const a = [i / N, j / N]
      const b = [(i + 1) / N, j / N]
      const c = [(i + 1) / N, (j + 1) / N]
      const d = [i / N, (j + 1) / N]
      uvs.push(...a, ...b, ...c, ...a, ...c, ...d)
    }
  const vaoCartao = gl.createVertexArray()
  gl.bindVertexArray(vaoCartao)
  const bufUv = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, bufUv)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW)
  const aUv = gl.getAttribLocation(pCartao, 'aUv')
  gl.enableVertexAttribArray(aUv)
  gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0)
  const nCartao = uvs.length / 2

  const texturas = cartoes.map((c) => {
    const t = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c.imagem)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return t
  })

  // trilha
  const vaoTrilha = gl.createVertexArray()
  const bufTrilha = gl.createBuffer()
  gl.bindVertexArray(vaoTrilha)
  gl.bindBuffer(gl.ARRAY_BUFFER, bufTrilha)
  const stride = 4 * 4
  for (const [nome, n, off] of [['aPos', 2, 0], ['aLado', 1, 8], ['aAo', 1, 12]] as const) {
    const loc = gl.getAttribLocation(pTrilha, nome)
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, n, gl.FLOAT, false, stride, off)
  }

  // pontos
  const vaoPontos = gl.createVertexArray()
  const bufPontos = gl.createBuffer()
  gl.bindVertexArray(vaoPontos)
  gl.bindBuffer(gl.ARRAY_BUFFER, bufPontos)
  const aPosP = gl.getAttribLocation(pPontos, 'aPos')
  gl.enableVertexAttribArray(aPosP)
  gl.vertexAttribPointer(aPosP, 2, gl.FLOAT, false, 0, 0)
  let nPontos = 0
  gl.bindVertexArray(null)

  let W = 1
  let H = 1
  let dpr = 1
  // o caminho da trilha em coordenadas da faixa (px, y a partir do topo dela), refeito ao medir
  let caminho: { x: number; y: number }[] = []
  let comprimento = 1
  const medir = () => {
    dpr = Math.min(devicePixelRatio, 2)
    W = canvas.clientWidth
    H = canvas.clientHeight
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    // pontos: uma grade de 22 px, um pouco além da tela para o mod não piscar na borda
    const pts: number[] = []
    for (let x = 11; x < W; x += 22) for (let y = -20; y < H + 20; y += 22) pts.push(x, y)
    nPontos = pts.length / 2
    gl.bindBuffer(gl.ARRAY_BUFFER, bufPontos)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pts), gl.STATIC_DRAW)
    // pontos de passagem dos cartões (no meio de cada um: a linha entra pela borda de cima e sai pela de
    // baixo) e o fim, no centro da tela quando a faixa chega ao fim
    const topo = faixa.getBoundingClientRect().top
    marcosCartoes = cartoes.map((c) => {
      const r = c.el.getBoundingClientRect()
      return { x: r.left + r.width * 0.5, y: r.top - topo + r.height * 0.5 }
    })
    const fim = faixa.scrollHeight - H + H * estado.centro.y
    marcosFim = [{ x: W * estado.centro.x, y: fim - H * 0.3 }, { x: W * estado.centro.x, y: fim }]
    montar()
  }
  // o começo da linha: onde a trilha dos projetos ficou na tela (vista de cima), convertido para a faixa;
  // sem ela (a página aberta já aqui), uma linha reta pelo meio
  let marcosCartoes: { x: number; y: number }[] = []
  let marcosFim: { x: number; y: number }[] = []
  let inicio: { x: number; y: number }[] = []
  let versaoLida = -1
  let congelada = false
  const montar = () => {
    const comeco = inicio.length >= 2 ? inicio : [{ x: W * 0.5, y: -H * 1.2 }, { x: W * 0.5, y: H * 0.35 }]
    const marcos = [...comeco, ...marcosCartoes, ...marcosFim]
    // curva suave (Catmull-Rom) amostrada a cada ~6 px
    caminho = []
    for (let k = 0; k < marcos.length - 1; k++) {
      const p0 = marcos[Math.max(0, k - 1)]!
      const p1 = marcos[k]!
      const p2 = marcos[k + 1]!
      const p3 = marcos[Math.min(marcos.length - 1, k + 2)]!
      const passos = Math.max(2, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 6))
      for (let s = 0; s < passos; s++) {
        const t = s / passos
        const t2 = t * t
        const t3 = t2 * t
        const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
        caminho.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) })
      }
    }
    caminho.push(marcos[marcos.length - 1]!)
    comprimento = 0
    for (let i = 1; i < caminho.length; i++) comprimento += Math.hypot(caminho[i]!.x - caminho[i - 1]!.x, caminho[i]!.y - caminho[i - 1]!.y)
  }
  medir()

  let ultimo = performance.now()
  let yAntes = 0
  let esticar = 0
  let atividade = 0
  let fase = 0
  const meiaLargura = 34
  const dados = new Float32Array(1)
  let buf = dados

  const desenhar = (agora: number) => {
    const dt = Math.min(0.05, Math.max(1 / 240, (agora - ultimo) / 1000))
    ultimo = agora
    const tempo = (agora / 1000) % 1000
    const topo = faixa.getBoundingClientRect().top
    // o começo da trilha: enquanto o fundo desta cena ainda não cobriu a dos projetos, segue a linha deles
    // (as duas coincidem na troca); quando cobre, a forma congela e só anda com a faixa. Voltando para os
    // projetos (fundo some), ela solta de novo
    if (estado.alfa < 0.02) congelada = false
    if (!congelada && trilhaTela.versao !== versaoLida && trilhaTela.pontos.length >= 2) {
      versaoLida = trilhaTela.versao
      const pts = trilhaTela.pontos
      const poucos: { x: number; y: number }[] = []
      // exatamente a linha de lá, na mesma ordem (do começo do caminho, no alto, até a câmera, embaixo):
      // só os pontos a mais de 14 px do anterior
      for (const p of pts) {
        const u = poucos[poucos.length - 1]
        if (!u || Math.hypot(p.x - u.x, p.y - topo - u.y) > 14) poucos.push({ x: p.x, y: p.y - topo })
      }
      inicio = poucos
      montar()
    }
    if (estado.alfa > 0.7) congelada = true
    // velocidade da faixa (px/s) com o ataque e a soltura do orchestrated
    const v = (yAntes - topo) / dt
    yAntes = topo
    const alvo = Math.max(-1, Math.min(1, v / 3200))
    const k = 1 - Math.exp(-dt / (Math.abs(alvo) > Math.abs(esticar) ? 0.06 : 0.3))
    esticar += (alvo - esticar) * k
    atividade += (Math.abs(alvo) - atividade) * k
    fase += (Math.abs(v) / H) * 1.4 * dt * 6.2831

    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    if (estado.alfa <= 0.001) return
    gl.enable(gl.BLEND)

    // 1. matriz de pontos
    gl.blendFunc(gl.ONE, gl.ONE)
    gl.useProgram(pPontos)
    gl.bindVertexArray(vaoPontos)
    gl.uniform2f(u(pPontos, 'uVista'), W, H)
    gl.uniform1f(u(pPontos, 'uDesloca'), -topo * 0.35)
    gl.uniform1f(u(pPontos, 'uDpr'), dpr)
    gl.uniform1f(u(pPontos, 'uTempo'), tempo)
    gl.uniform1f(u(pPontos, 'uAlfa'), estado.alfa)
    gl.drawArrays(gl.POINTS, 0, nPontos)

    // 2. a trilha, na tela (só os trechos visíveis)
    const vis: number[] = []
    let ao = 0
    let cabeca = 0
    let melhor = 1e9
    const tam = caminho.length
    // o trecho contínuo que passa pela tela (sem pular pontos: a faixa de triângulos não pode ter buraco)
    let i0 = -1
    let i1 = -1
    for (let i = 0; i < tam; i++) {
      const y = caminho[i]!.y + topo
      if (y > -160 && y < H + 160) {
        if (i0 < 0) i0 = i
        i1 = i
      }
    }
    for (let i = 0; i < tam; i++) {
      const p = caminho[i]!
      if (i > 0) ao += Math.hypot(p.x - caminho[i - 1]!.x, p.y - caminho[i - 1]!.y)
      const y = p.y + topo
      // o ponto da vez: onde a trilha cruza o meio da altura da tela
      const dm = Math.abs(y - H * estado.centro.y)
      if (dm < melhor) {
        melhor = dm
        cabeca = ao / comprimento
      }
      if (i < i0 || i > i1) continue
      const a = caminho[Math.max(0, i - 1)]!
      const b = caminho[Math.min(tam - 1, i + 1)]!
      let nx = -(b.y - a.y)
      let ny = b.x - a.x
      const l = Math.hypot(nx, ny) || 1
      nx /= l
      ny /= l
      const t = ao / comprimento
      vis.push(p.x + nx * meiaLargura, y + ny * meiaLargura, -1, t, p.x - nx * meiaLargura, y - ny * meiaLargura, 1, t)
    }
    if (vis.length >= 16) {
      if (buf.length < vis.length) buf = new Float32Array(vis.length * 2)
      buf.set(vis)
      gl.useProgram(pTrilha)
      gl.bindVertexArray(vaoTrilha)
      gl.bindBuffer(gl.ARRAY_BUFFER, bufTrilha)
      gl.bufferData(gl.ARRAY_BUFFER, buf.subarray(0, vis.length), gl.DYNAMIC_DRAW)
      gl.uniform2f(u(pTrilha, 'uVista'), W, H)
      gl.uniform1f(u(pTrilha, 'uLargura'), meiaLargura)
      gl.uniform1f(u(pTrilha, 'uMeia'), Math.min(8, Math.max(1.5, trilhaTela.meia)))
      gl.uniform1f(u(pTrilha, 'uDpr'), dpr)
      gl.uniform1f(u(pTrilha, 'uCabeca'), cabeca)
      gl.uniform1f(u(pTrilha, 'uAlfa'), estado.alfa)
      gl.uniform1f(u(pTrilha, 'uTempo'), tempo)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, vis.length / 4)
    }

    // 3. os cartões, por cima da trilha
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.useProgram(pCartao)
    gl.bindVertexArray(vaoCartao)
    gl.uniform2f(u(pCartao, 'uVista'), W, H)
    gl.uniform1f(u(pCartao, 'uEsticar'), esticar * 0.07)
    gl.uniform1f(u(pCartao, 'uAtividade'), atividade)
    gl.uniform1f(u(pCartao, 'uTempo'), tempo)
    gl.uniform1f(u(pCartao, 'uFase'), fase)
    gl.uniform1f(u(pCartao, 'uAlfa'), Math.min(1, estado.alfa))
    gl.activeTexture(gl.TEXTURE0)
    gl.uniform1i(u(pCartao, 'uImagem'), 0)
    cartoes.forEach((c, i) => {
      const r = c.el.getBoundingClientRect()
      if (r.bottom < -H * 0.5 || r.top > H * 1.2) return
      gl.bindTexture(gl.TEXTURE_2D, texturas[i]!)
      gl.uniform4f(u(pCartao, 'uRect'), r.left, r.top, r.width, r.height)
      gl.drawArrays(gl.TRIANGLES, 0, nCartao)
    })
    gl.bindVertexArray(null)
  }

  return {
    medir,
    desenhar,
    destruir: () => {
      texturas.forEach((t) => gl.deleteTexture(t))
      ;[bufUv, bufTrilha, bufPontos].forEach((b) => gl.deleteBuffer(b))
      ;[pCartao, pTrilha, pPontos].forEach((p) => gl.deleteProgram(p))
    },
  }
}

/** a imagem de um cartão: fundo branco gelo, o ano enorme em Deep Blue, onde no alto e o título embaixo */
export function pintarCartao(largura: number, altura: number, ano: string, onde: string, titulo: string, fonte: string) {
  const c = document.createElement('canvas')
  c.width = largura
  c.height = altura
  const g = c.getContext('2d')!
  g.fillStyle = '#e8edf5'
  g.fillRect(0, 0, largura, altura)
  const m = largura * 0.055
  g.fillStyle = '#000080'
  g.textBaseline = 'alphabetic'
  // o ano ocupa a largura: mede e ajusta
  let tam = altura * 0.62
  g.font = `800 ${tam}px ${fonte}`
  const w = g.measureText(ano).width
  tam *= Math.min(1, (largura - m * 2) / w)
  g.font = `800 ${tam}px ${fonte}`
  g.textAlign = 'center'
  ;(g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${(-tam * 0.05).toFixed(1)}px`
  g.fillText(ano, largura / 2, altura * 0.5 + tam * 0.36)
  ;(g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '0px'
  g.textAlign = 'left'
  g.font = `800 ${Math.round(altura * 0.05)}px ${fonte}`
  g.fillText(onde, m, m + altura * 0.05)
  g.fillStyle = 'rgba(0, 0, 128, 0.72)'
  g.font = `500 ${Math.round(altura * 0.042)}px ${fonte}`
  g.fillText(titulo, m, altura - m)
  return c
}
