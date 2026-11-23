import {
  HalfFloatType,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  WebGLRenderTarget,
  type IUniform,
  type Texture,
  type WebGLRenderer,
} from 'three'

// Fluido na placa de vídeo, como o do topo do landonorris.com (lá: advecção, força do mouse, viscosidade e
// pressão numa grade de 10 % da tela). Aqui a versão enxuta do mesmo modelo de "stable fluids": a velocidade
// é transportada por ela mesma, o mouse empurra (força) e pinta (tinta), a pressão tira a divergência para o
// fluido girar em vez de só se espalhar, e tudo perde força a cada passo. A tinta é o que revela o robô.

const vert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const vizinhos = /* glsl */ `
  uniform vec2 uTexel;
  varying vec2 vUv;
  vec2 L() { return vUv - vec2(uTexel.x, 0.0); }
  vec2 R() { return vUv + vec2(uTexel.x, 0.0); }
  vec2 B() { return vUv - vec2(0.0, uTexel.y); }
  vec2 T() { return vUv + vec2(0.0, uTexel.y); }
`

const transporte = /* glsl */ `
  uniform sampler2D uVel;
  uniform sampler2D uFonte;
  uniform vec2 uTexel;
  uniform float uDt;
  uniform float uPerda;
  varying vec2 vUv;
  void main() {
    vec2 de = vUv - uDt * texture2D(uVel, vUv).xy * uTexel;
    gl_FragColor = uPerda * texture2D(uFonte, de);
  }
`

const pingo = /* glsl */ `
  uniform sampler2D uFonte;
  uniform vec2 uPonto;
  uniform vec3 uValor;
  uniform float uRaio;
  uniform float uAspecto;
  uniform float uTeto;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - uPonto;
    p.x *= uAspecto;
    vec3 s = exp(-dot(p, p) / uRaio) * uValor;
    gl_FragColor = vec4(min(texture2D(uFonte, vUv).xyz + s, vec3(uTeto)), 1.0);
  }
`

const divergencia = /* glsl */ `
  uniform sampler2D uVel;
  ${vizinhos}
  void main() {
    float l = texture2D(uVel, L()).x;
    float r = texture2D(uVel, R()).x;
    float b = texture2D(uVel, B()).y;
    float t = texture2D(uVel, T()).y;
    gl_FragColor = vec4(0.5 * (r - l + t - b), 0.0, 0.0, 1.0);
  }
`

const pressao = /* glsl */ `
  uniform sampler2D uPressao;
  uniform sampler2D uDiv;
  ${vizinhos}
  void main() {
    float l = texture2D(uPressao, L()).x;
    float r = texture2D(uPressao, R()).x;
    float b = texture2D(uPressao, B()).x;
    float t = texture2D(uPressao, T()).x;
    float d = texture2D(uDiv, vUv).x;
    gl_FragColor = vec4((l + r + b + t - d) * 0.25, 0.0, 0.0, 1.0);
  }
`

const gradiente = /* glsl */ `
  uniform sampler2D uPressao;
  uniform sampler2D uVel;
  ${vizinhos}
  void main() {
    float l = texture2D(uPressao, L()).x;
    float r = texture2D(uPressao, R()).x;
    float b = texture2D(uPressao, B()).x;
    float t = texture2D(uPressao, T()).x;
    vec2 v = texture2D(uVel, vUv).xy - vec2(r - l, t - b);
    gl_FragColor = vec4(v, 0.0, 1.0);
  }
`

const escala = /* glsl */ `
  uniform sampler2D uFonte;
  uniform float uFator;
  varying vec2 vUv;
  void main() { gl_FragColor = texture2D(uFonte, vUv) * uFator; }
`

type U = Record<string, IUniform>

class Duplo {
  ler: WebGLRenderTarget
  escrever: WebGLRenderTarget
  constructor(w: number, h: number) {
    this.ler = alvo(w, h)
    this.escrever = alvo(w, h)
  }
  trocar() {
    ;[this.ler, this.escrever] = [this.escrever, this.ler]
  }
  tamanho(w: number, h: number) {
    this.ler.setSize(w, h)
    this.escrever.setSize(w, h)
  }
  dispose() {
    this.ler.dispose()
    this.escrever.dispose()
  }
}

function alvo(w: number, h: number) {
  return new WebGLRenderTarget(w, h, {
    type: HalfFloatType,
    format: RGBAFormat,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  })
}

export type OpcoesFluido = {
  resolucao: number // fração da tela (o Lando usa 0,1)
  perdaVelocidade: number // por passo a 60 quadros por segundo
  perdaTinta: number
  raio: number // do pingo, em uv² com a proporção corrigida
  iteracoes: number
}

export class Fluido {
  private cena = new Scene()
  private camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private quadro = new Mesh(new PlaneGeometry(2, 2))
  private materiais: Record<string, ShaderMaterial> = {}
  private vel: Duplo
  private tinta: Duplo
  private press: Duplo
  private div: WebGLRenderTarget
  private w = 1
  private h = 1
  private aspecto = 1

  constructor(
    private gl: WebGLRenderer,
    private op: OpcoesFluido,
  ) {
    this.cena.add(this.quadro)
    this.quadro.frustumCulled = false
    const m = (frag: string, u: U) => new ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: u, depthTest: false, depthWrite: false })
    const t = () => ({ value: [1, 1] })
    this.materiais.transporte = m(transporte, { uVel: { value: null }, uFonte: { value: null }, uTexel: t(), uDt: { value: 0 }, uPerda: { value: 1 } })
    this.materiais.pingo = m(pingo, { uFonte: { value: null }, uPonto: { value: [0, 0] }, uValor: { value: [0, 0, 0] }, uRaio: { value: 0.002 }, uAspecto: { value: 1 }, uTeto: { value: 1e4 } })
    this.materiais.divergencia = m(divergencia, { uVel: { value: null }, uTexel: t() })
    this.materiais.pressao = m(pressao, { uPressao: { value: null }, uDiv: { value: null }, uTexel: t() })
    this.materiais.gradiente = m(gradiente, { uPressao: { value: null }, uVel: { value: null }, uTexel: t() })
    this.materiais.escala = m(escala, { uFonte: { value: null }, uFator: { value: 0.8 } })
    this.vel = new Duplo(1, 1)
    this.tinta = new Duplo(1, 1)
    this.press = new Duplo(1, 1)
    this.div = alvo(1, 1)
  }

  get textura(): Texture {
    return this.tinta.ler.texture
  }

  /**
   * Compila os shaders do fluido em paralelo (sem travar a thread principal) antes do primeiro quadro. Eles rodam
   * dentro de render targets, e o three.js põe isso na chave do programa: por isso a compilação é pedida com um
   * render target ativo, para o programa pronto ser o mesmo que o desenho vai usar.
   */
  compilar(): Promise<void> {
    const antes = this.gl.getRenderTarget()
    this.gl.setRenderTarget(this.vel.ler)
    const pedidos = Object.values(this.materiais).map((m) => {
      this.quadro.material = m
      return this.gl.compileAsync(this.cena, this.camera)
    })
    this.gl.setRenderTarget(antes)
    return Promise.all(pedidos).then(() => undefined)
  }

  tamanho(larguraTela: number, alturaTela: number) {
    this.w = Math.max(16, Math.round(larguraTela * this.op.resolucao))
    this.h = Math.max(16, Math.round(alturaTela * this.op.resolucao))
    this.aspecto = larguraTela / alturaTela
    for (const d of [this.vel, this.tinta, this.press]) d.tamanho(this.w, this.h)
    this.div.setSize(this.w, this.h)
    for (const k of ['transporte', 'divergencia', 'pressao', 'gradiente']) this.materiais[k]!.uniforms.uTexel!.value = [1 / this.w, 1 / this.h]
    this.limpar()
  }

  private desenhar(mat: ShaderMaterial, destino: WebGLRenderTarget) {
    this.quadro.material = mat
    this.gl.setRenderTarget(destino)
    this.gl.render(this.cena, this.camera)
  }

  private limpar() {
    const antes = this.gl.getRenderTarget()
    for (const d of [this.vel, this.tinta, this.press]) {
      for (const rt of [d.ler, d.escrever]) {
        this.gl.setRenderTarget(rt)
        this.gl.clear()
      }
    }
    this.gl.setRenderTarget(antes)
  }

  /** x, y em 0..1 (y para cima); dx, dy: quanto o cursor andou neste quadro, em 0..1; tinta: quanto pinta */
  pingar(x: number, y: number, dx: number, dy: number, tinta: number) {
    const antes = this.gl.getRenderTarget()
    const p = this.materiais.pingo!
    p.uniforms.uPonto!.value = [x, y]
    p.uniforms.uAspecto!.value = this.aspecto
    p.uniforms.uRaio!.value = this.op.raio
    // força em células por segundo: o deslocamento do cursor vira velocidade do fluido
    p.uniforms.uValor!.value = [dx * this.w * 60 * 1.4, dy * this.h * 60 * 1.4, 0]
    p.uniforms.uTeto!.value = 1e4
    p.uniforms.uFonte!.value = this.vel.ler.texture
    this.desenhar(p, this.vel.escrever)
    this.vel.trocar()
    p.uniforms.uRaio!.value = this.op.raio * 0.8
    p.uniforms.uValor!.value = [tinta, tinta, tinta]
    p.uniforms.uTeto!.value = 1.6
    p.uniforms.uFonte!.value = this.tinta.ler.texture
    this.desenhar(p, this.tinta.escrever)
    this.tinta.trocar()
    this.gl.setRenderTarget(antes)
  }

  passo(dt: number) {
    const antes = this.gl.getRenderTarget()
    const n = dt * 60
    const m = this.materiais
    // tira a divergência: o fluido gira e escorre em vez de só inchar
    m.divergencia!.uniforms.uVel!.value = this.vel.ler.texture
    this.desenhar(m.divergencia!, this.div)
    m.escala!.uniforms.uFonte!.value = this.press.ler.texture
    m.escala!.uniforms.uFator!.value = 0.8
    this.desenhar(m.escala!, this.press.escrever)
    this.press.trocar()
    m.pressao!.uniforms.uDiv!.value = this.div.texture
    for (let i = 0; i < this.op.iteracoes; i++) {
      m.pressao!.uniforms.uPressao!.value = this.press.ler.texture
      this.desenhar(m.pressao!, this.press.escrever)
      this.press.trocar()
    }
    m.gradiente!.uniforms.uPressao!.value = this.press.ler.texture
    m.gradiente!.uniforms.uVel!.value = this.vel.ler.texture
    this.desenhar(m.gradiente!, this.vel.escrever)
    this.vel.trocar()
    // transporta a velocidade e a tinta, perdendo força
    const tr = m.transporte!
    tr.uniforms.uDt!.value = dt
    tr.uniforms.uVel!.value = this.vel.ler.texture
    tr.uniforms.uFonte!.value = this.vel.ler.texture
    tr.uniforms.uPerda!.value = Math.pow(this.op.perdaVelocidade, n)
    this.desenhar(tr, this.vel.escrever)
    this.vel.trocar()
    tr.uniforms.uVel!.value = this.vel.ler.texture
    tr.uniforms.uFonte!.value = this.tinta.ler.texture
    tr.uniforms.uPerda!.value = Math.pow(this.op.perdaTinta, n)
    this.desenhar(tr, this.tinta.escrever)
    this.tinta.trocar()
    this.gl.setRenderTarget(antes)
  }

  dispose() {
    for (const d of [this.vel, this.tinta, this.press]) d.dispose()
    this.div.dispose()
    Object.values(this.materiais).forEach((m) => m.dispose())
    this.quadro.geometry.dispose()
  }
}
