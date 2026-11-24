// Fundo lunar da seção "Sistemas que se explicam":
// um vale de pedras em perspectiva, a lua no alto à esquerda iluminando de cima, névoa azul no fundo, o céu
// estrelado (com uma estrela cadente de vez em quando) e o cursor como uma lanterna rente ao chão. O terreno é percorrido
// por raio (raymarch) sobre um campo de altura: a forma do vale, as pedras grandes e o relevo fino vêm da
// textura de pedra. O céu começa no Deep Blue do topo do site, para a passagem não ter corte.
// Textura: Rocks Ground 02, do Poly Haven (CC0).

const vertTela = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

const camera = /* glsl */ `
uniform vec3 uCam;
uniform vec2 uOlhar;       // guinada e arfagem (rad)
uniform float uFoco;       // 1 / tan(fov/2)
uniform vec2 uVista;
mat3 base() {
  float cy = cos(uOlhar.x), sy = sin(uOlhar.x), cp = cos(uOlhar.y), sp = sin(uOlhar.y);
  vec3 f = normalize(vec3(sy * cp, sp, -cy * cp));
  vec3 r = normalize(cross(f, vec3(0.0, 1.0, 0.0)));
  vec3 u = cross(r, f);
  return mat3(r, u, f);
}
`

const fragTela = `#version 300 es
precision highp float;
uniform sampler2D uCor;
uniform sampler2D uAltura;
uniform vec2 uRes;
uniform vec2 uLuz;         // cursor, px (y para baixo)
uniform float uLuzLigada;
uniform float uPresenca;
uniform float uTempo;
uniform vec3 uTopo;        // o Deep Blue do topo do site
uniform vec4 uFarol[6];    // faróis do vale: x, z, força, -
uniform float uSalto;      // a passagem para os projetos: olhar para o céu e saltar
${camera}
out vec4 saida;

const vec3 LUA_DIR = normalize(vec3(-0.5, 0.1, -0.86));
const vec3 NEVOA = vec3(0.05, 0.08, 0.2);

float pedra(vec2 p, float lod) { return textureLod(uAltura, p, lod).r; }

// altura do chão: o vale (sobe dos lados e lá no fundo), pedras grandes e o relevo fino da textura
float chao(vec2 xz, float lod) {
  float lado = smoothstep(0.6, 7.0, abs(xz.x + sin(xz.y * 0.18) * 1.3));
  float vale = lado * lado * 2.6 + smoothstep(-6.0, -30.0, xz.y) * 1.2;
  float grande = pedra(xz * 0.06 + vec2(0.31, 0.17), lod + 2.0);
  float fino = pedra(xz * 0.22, lod);
  return vale + grande * 0.9 + fino * 0.28;
}

vec2 ruido2(vec2 p) {
  p = fract(p * vec2(5.3983, 5.4427));
  p += dot(p.yx, p.xy + vec2(21.5351, 14.3137));
  return fract(vec2(p.x * p.y * 95.4337, p.x * p.y * 97.597));
}

vec3 hash32(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yxz + 33.33);
  return fract((q.xxy + q.yzz) * q.zyx);
}

vec3 raio(vec2 px) {
  vec2 ndc = vec2(px.x / uVista.x * 2.0 - 1.0, 1.0 - px.y / uVista.y * 2.0);
  ndc.x *= uVista.x / uVista.y;
  return normalize(base() * vec3(ndc, uFoco));
}

// céu estrelado: três camadas presas à direção do olhar (giram com a cabeça), núcleo do tamanho de um pixel
// e halo só nas mais fortes; cada uma pisca no seu ritmo
vec3 estrelas(vec3 rd, float pxAng) {
  vec2 a = vec2(atan(rd.x, -rd.z), asin(clamp(rd.y, -1.0, 1.0)));
  vec3 soma = vec3(0.0);
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float K = 46.0 - fk * 14.0;                // células por radiano: as camadas de trás são mais densas
    vec2 g = a * K;
    vec2 c = floor(g);
    vec3 h = hash32(c + fk * 37.17);
    float dens = 0.34;
    if (h.z > dens) continue;
    vec2 centro = c + 0.15 + 0.7 * h.xy;
    float dpx = length(g - centro) / K / pxAng;  // distância em pixels do canvas
    float forca = pow(1.0 - h.z / dens, 2.2) * (0.35 + fk * 0.45);
    float pisca = 0.7 + 0.3 * sin(uTempo * (0.8 + h.x * 2.6) + h.y * 40.0);
    float r = 0.55 + forca * 0.9;
    float nucleo = exp(-dpx * dpx / (r * r));
    float halo = exp(-dpx * 0.42) * 0.05 * forca * forca;
    vec3 tom = mix(vec3(0.72, 0.82, 1.0), vec3(1.0, 0.97, 0.92), h.x);
    soma += tom * (nucleo + halo) * forca * pisca * 1.6;
  }
  return soma;
}

// estrela cadente: um risco curto a cada ~9 s, num ponto e ângulo sorteados
vec3 cadente(vec2 px) {
  float periodo = 9.0;
  float n = floor(uTempo / periodo);
  float u = fract(uTempo / periodo) / 0.085;
  if (u > 1.0) return vec3(0.0);
  vec3 h = hash32(vec2(n, 7.0));
  vec2 dir = normalize(vec2(-0.75 - h.z * 0.5, 0.42));
  vec2 ini = vec2(uVista.x * (0.35 + 0.55 * h.x), uVista.y * (0.03 + 0.2 * h.y));
  vec2 cabeca = ini + dir * u * uVista.x * 0.32;
  float L = uVista.x * 0.11;
  vec2 q = px - (cabeca - dir * L);
  float ao = clamp(dot(q, dir) / L, 0.0, 1.0);
  float lado = length(q - dir * ao * L);
  float vida = sin(u * 3.14159);
  return vec3(0.8, 0.88, 1.0) * ao * ao * exp(-lado * lado * 1.2) * vida * 1.4;
}

// o salto para os projetos: riscos de luz que fogem do ponto de fuga, cada um num raio sorteado; ficam
// mais longos e mais rápidos conforme o salto avança (as estrelas esticando, como na entrada em dobra)
vec3 dobra(vec2 px) {
  vec2 c = uVista * vec2(0.5, 0.44);
  vec2 d = px - c;
  float dist = length(d);
  float r = dist / length(uVista * 0.5);
  float a = atan(d.y, d.x) / 6.28318 + 0.5;
  vec3 soma = vec3(0.0);
  for (int k = 0; k < 2; k++) {
    float N = 260.0 + float(k) * 190.0;
    float cel = floor(a * N);
    vec3 h = hash32(vec2(cel, 3.0 + float(k) * 11.0));
    if (h.z > 0.55) continue;
    float lado = abs(fract(a * N) - 0.5) * 6.28318 / N * dist;
    float cab = fract(h.x + uTempo * (0.15 + h.y * 0.3) * (0.3 + uSalto * 2.2));
    float comp = 0.03 + uSalto * uSalto * (0.25 + h.y * 0.35);
    float ao = smoothstep(cab - comp, cab, r) * step(r, cab);
    float largura = 0.5 + r * 1.4;
    soma += vec3(0.72, 0.84, 1.0) * exp(-lado * lado / (largura * largura)) * ao * ao * smoothstep(0.03, 0.2, r) * (0.6 + h.y);
  }
  return soma * uSalto;
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uRes * uVista;
  vec3 rd = raio(px);
  vec3 ro = uCam;
  // ângulo coberto por um pixel do canvas: é o que escolhe o nível de detalhe da textura (nítida perto,
  // sem cintilar longe)
  float pxAng = 2.0 / (uFoco * uRes.y);

  // céu: do Deep Blue no alto para a névoa no horizonte
  float alto = clamp(rd.y * 2.2 + 0.05, 0.0, 1.0);
  vec3 ceu = mix(NEVOA * 1.6, uTopo, smoothstep(0.0, 0.85, alto));

  // raymarch sobre o campo de altura, com refinamento por bisseção no ponto de contato (sem degraus)
  float t = 0.2;
  float tAnt = t;
  bool bateu = false;
  for (int i = 0; i < 170; i++) {
    vec3 p = ro + rd * t;
    float lod = log2(max(1.0, t * pxAng * 450.0));
    float d = p.y - chao(p.xz, lod);
    if (d < 0.0012 * t) { bateu = true; break; }
    tAnt = t;
    t += max(0.008, d * 0.4);
    if (t > 46.0) break;
  }
  if (bateu) {
    for (int j = 0; j < 6; j++) {
      float tm = 0.5 * (tAnt + t);
      vec3 pm = ro + rd * tm;
      if (pm.y - chao(pm.xz, log2(max(1.0, tm * pxAng * 450.0))) < 0.0) t = tm; else tAnt = tm;
    }
  }

  vec3 col = ceu;
  if (bateu) {
    vec3 p = ro + rd * t;
    float pegada = t * pxAng;                   // tamanho de um pixel no chão
    float lodN = log2(max(1.0, pegada * 450.0));
    float e = max(0.006, pegada * 1.2);
    vec3 n = normalize(vec3(chao(p.xz - vec2(e, 0.0), lodN) - chao(p.xz + vec2(e, 0.0), lodN), 2.0 * e,
                            chao(p.xz - vec2(0.0, e), lodN) - chao(p.xz + vec2(0.0, e), lodN)));
    float rasante = max(0.25, abs(dot(n, rd)));
    float lodC = max(0.0, log2(pegada * 0.22 * 1536.0 / rasante) - 0.4);
    vec3 cor = textureLod(uCor, p.xz * 0.22, lodC).rgb;
    float fresta = textureLod(uAltura, p.xz * 0.22, lodC + 0.4).r;
    float ao = mix(0.22, 1.0, fresta);
    // lua de cima, céu azul de ambiente, e um contraluz fraco vindo do fundo do vale
    float dif = max(dot(n, LUA_DIR), 0.0);
    vec3 luz = vec3(0.62, 0.72, 1.0) * dif * 1.2;
    luz += vec3(0.1, 0.16, 0.36) * (0.4 + 0.6 * n.y) * ao;
    luz += vec3(0.25, 0.22, 0.4) * pow(max(dot(n, vec3(0.0, 0.3, 1.0)), 0.0), 2.0) * 0.25;
    // brilho de borda: as arestas viradas para a lua acendem, como pedra polida pelo luar
    luz += vec3(0.5, 0.6, 1.0) * pow(1.0 - max(dot(n, -rd), 0.0), 4.0) * dif * 0.6;
    // lanterna do cursor: um ponto rente ao chão, no prolongamento do mouse
    if (uLuzLigada > 0.001) {
      vec3 rl = raio(uLuz);
      float tl = (0.9 - ro.y) / min(rl.y, -0.02);
      vec3 lp = ro + rl * clamp(tl, 0.5, 14.0);
      lp.y = chao(lp.xz, 2.0) + 0.55;
      vec3 L = lp - p;
      float dist = length(L);
      float at = 1.0 / (1.0 + dist * dist * 1.6);
      luz += vec3(0.85, 0.9, 1.0) * max(dot(n, L / dist), 0.0) * at * 2.4 * uLuzLigada;
    }
    for (int k = 0; k < 6; k++) {
      vec4 f = uFarol[k];
      if (f.z < 0.001) continue;
      vec3 L = vec3(f.x, 1.2, f.y) - p;
      float dist = length(L);
      luz += vec3(0.55, 0.68, 1.0) * max(dot(n, L / dist), 0.0) / (1.0 + dist * dist * 2.2) * 1.6 * f.z;
    }
    col = cor * cor * luz * 2.3 * ao;
    col = 1.0 - exp(-col * 1.7);
    float nev = 1.0 - exp(-t * 0.05);
    col = mix(col, NEVOA * 1.3, nev);
  }

  // o alto do quadro termina exatamente no Deep Blue do topo: a seção nasce do azul, sem linha de corte
  float sobe = px.y / uVista.y;
  col = mix(col, uTopo, smoothstep(0.3, 0.0, sobe) * (bateu ? 0.0 : 1.0));
  // a lua, o halo e as estrelas por cima do céu (as estrelas somem na névoa do horizonte e perto da lua)
  if (!bateu) {
    float lua = dot(rd, LUA_DIR);
    float horizonte = smoothstep(-0.02, 0.16, rd.y);
    col += estrelas(rd, pxAng) * horizonte * (1.0 - smoothstep(0.985, 0.999, lua));
    col += cadente(px) * horizonte;
    col += vec3(0.85, 0.9, 1.0) * smoothstep(0.99955, 0.99975, lua);
    col += vec3(0.35, 0.5, 1.0) * (pow(max(lua, 0.0), 900.0) * 0.6 + pow(max(lua, 0.0), 40.0) * 0.12);
  }

  // faróis: colunas de luz finas plantadas no vale (uma por tributo da resposta do Tributax), com o ponto
  // aceso no alto; a pedra na frente esconde a coluna, e a luz de cada uma clareia o chão em volta
  for (int k = 0; k < 6; k++) {
    vec4 f = uFarol[k];
    if (f.z < 0.001) continue;
    vec2 dxz = f.xy - ro.xz;
    float s = dot(dxz, rd.xz) / max(dot(rd.xz, rd.xz), 1e-5);
    if (s < 0.3 || (bateu && s > t)) continue;
    float y = ro.y + rd.y * s;
    float dh = length(ro.xz + rd.xz * s - f.xy);
    float w = max(0.012, s * pxAng * 1.1);
    float corpo = smoothstep(-0.4, 0.3, y) * (1.0 - smoothstep(1.6, 2.05, y));
    float coluna = exp(-dh * dh / (w * w)) * corpo * 0.9 + exp(-dh / (w * 7.0)) * corpo * 0.07;
    vec3 topo = vec3(f.x, 2.05, f.y) - ro;
    float ang = length(cross(normalize(topo), rd)) / pxAng / max(1.0, length(topo) * 0.12);
    float ponto = exp(-ang * ang / 5.0) + exp(-ang * 0.25) * 0.12;
    col += vec3(0.78, 0.86, 1.0) * (coluna + ponto) * f.z;
  }

  // no salto o céu puxa para o azul do mundo dos projetos e as estrelas viram riscos
  if (uSalto > 0.001) {
    col = mix(col, vec3(0.035, 0.06, 0.2), uSalto * uSalto * 0.6);
    // os riscos crescem com a subida e se dissolvem quando as partículas dos projetos chegam
    col += dobra(px) * 1.1 * (1.0 - smoothstep(0.5, 0.85, uSalto));
  }

  vec2 gr = ruido2(gl_FragCoord.xy + vec2(1000.5 + uTempo));
  col += (gr.x + gr.y - 1.0) * (1.5 / 255.0);
  saida = vec4(mix(uTopo, col, uPresenca), 1.0);
}`

/** um farol do vale: onde fica no chão (x, z) e o rótulo HTML que acompanha o alto dele na tela */
export type Farol = { x: number; z: number; rotulo: HTMLElement }

export function iniciarLua(canvas: HTMLCanvasElement, secao: HTMLElement, base: string, farois: Farol[] = []) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false })
  if (!gl || gl.isContextLost()) return { parar: () => {}, pronta: Promise.resolve() }
  // O shader do terreno é pesado e o driver leva de 0,3 a 0,5 s para compilar. Perguntar o resultado logo depois
  // de compilar (getShaderParameter, getAttribLocation...) faz a thread principal esperar. Aqui a compilação
  // roda em paralelo (KHR_parallel_shader_compile) e só se pergunta quando o driver já terminou (ver `quadro`).
  const paralela = gl.getExtension('KHR_parallel_shader_compile')
  const shaders: WebGLShader[] = []
  const compilar = (v: string, f: string) => {
    const p = gl.createProgram()!
    for (const [tipo, src] of [[gl.VERTEX_SHADER, v], [gl.FRAGMENT_SHADER, f]] as const) {
      const s = gl.createShader(tipo)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      shaders.push(s)
      gl.attachShader(p, s)
    }
    // a posição do vértice fica na entrada 0 sem precisar perguntar à placa depois
    gl.bindAttribLocation(p, 0, 'aPos')
    gl.linkProgram(p)
    return p
  }
  const tela = compilar(vertTela, fragTela)

  const vaoTela = gl.createVertexArray()
  gl.bindVertexArray(vaoTela)
  const bufTela = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, bufTela)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  gl.bindVertexArray(null)

  // a localização de cada uniform é pedida à placa uma vez só (antes, ~12 consultas por quadro)
  const locais = new Map<string, WebGLUniformLocation | null>()
  const ut = (n: string) => {
    let l = locais.get(n)
    if (l === undefined) locais.set(n, (l = gl.getUniformLocation(tela, n)))
    return l
  }

  let vivo = true
  let carregadas = 0
  const texturas: WebGLTexture[] = []
  const textura = (unidade: number, url: string) => {
    const t = gl.createTexture()!
    texturas.push(t)
    const subir = (img: TexImageSource) => {
      if (!vivo) return
      gl.activeTexture(gl.TEXTURE0 + unidade)
      gl.bindTexture(gl.TEXTURE_2D, t)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
      gl.generateMipmap(gl.TEXTURE_2D)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
      carregadas++
      if ('close' in img) img.close()
    }
    // o decode do WebP de 1536 px na thread principal custava ~0,5 s num computador fraco: o createImageBitmap
    // decodifica fora dela. Sem ele (ou se falhar), cai no <img> de antes
    const comImagem = () => {
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => subir(img)
      img.src = url
    }
    if (typeof createImageBitmap !== 'function') return comImagem()
    fetch(url)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((b) => createImageBitmap(b))
      .then(subir, comImagem)
  }
  textura(0, `${base}/lua/pedra-cor.webp`)
  textura(1, `${base}/lua/pedra-altura.webp`)

  const toque = matchMedia('(pointer: coarse)').matches
  const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches
  const luz = { x: innerWidth / 2, y: innerHeight * 0.75, tx: innerWidth / 2, ty: innerHeight * 0.75, on: 0, alvo: 0 }
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 }
  const mover = (e: PointerEvent) => {
    mouse.x = (e.clientX / innerWidth - 0.5) * 2
    mouse.y = (e.clientY / innerHeight - 0.5) * 2
    if (e.pointerType !== 'mouse') return
    if (luz.alvo === 0 && luz.on < 0.01) {
      luz.x = e.clientX
      luz.y = e.clientY
    }
    luz.tx = e.clientX
    luz.ty = e.clientY
    luz.alvo = 1
  }
  const sair = () => (luz.alvo = 0)
  addEventListener('pointermove', mover, { passive: true })
  document.documentElement.addEventListener('pointerleave', sair)

  // Renderização sob demanda: (1) fora da área do vale (a camada vai uma tela além da seção) o laço não faz nada;
  // (2) com tudo parado (sem rolagem, mouse ou toque há 1,5 s) o vale desenha 30 quadros por segundo em vez de 60:
  // só o cintilar das estrelas e o grão se mexem, e a 30 quadros não se vê diferença. Qualquer gesto volta a 60 na
  // hora, e a estrela cadente (um risco rápido) sempre sai a 60.
  let atividade = performance.now()
  const acordar = () => (atividade = performance.now())
  const gestos = ['scroll', 'pointermove', 'pointerdown', 'wheel', 'touchstart', 'touchmove', 'keydown', 'resize'] as const
  for (const e of gestos) addEventListener(e, acordar, { passive: true })
  let perto = true
  const io = new IntersectionObserver(([e]) => (perto = !!e?.isIntersecting), { rootMargin: '130% 0px 130% 0px' })
  io.observe(secao)
  // a estrela cadente do shader: um risco curto a cada 9 s (ver `cadente`), ativo no começo de cada período
  const cadenteAtiva = (tempo: number) => (tempo / 9) % 1 < 0.09

  let W = 1
  let H = 1
  // o terreno é caro (raymarch): desenha na densidade da tela até 2x (1,5x no celular) e, se o aparelho não
  // aguentar 30 quadros por segundo, baixa a resolução aos poucos até 75% dela
  const teto = Math.min(devicePixelRatio, innerWidth < 768 ? 1.5 : 2)
  let escala = teto
  const tamanho = () => {
    W = canvas.clientWidth
    H = canvas.clientHeight
    canvas.width = Math.max(1, Math.round(W * escala))
    canvas.height = Math.max(1, Math.round(H * escala))
    gl.viewport(0, 0, canvas.width, canvas.height)
  }
  tamanho()
  addEventListener('resize', tamanho)

  const topo = [0, 0, 128 / 255]
  let presenca = 0
  const mostra = farois.map(() => 0)
  let ultimo = performance.now()
  let id = 0
  let media = 1 / 60
  let contados = 0
  const suave = (a: number, b: number, x: number) => {
    const k = Math.min(1, Math.max(0, (x - a) / (b - a)))
    return k * k * (3 - 2 * k)
  }
  const foco = 1 / Math.tan((52 * Math.PI) / 360)
  // o programa só é usado depois que o driver terminou de compilar; só então se pergunta pelos erros e pelos
  // uniforms (perguntar antes faria a thread esperar)
  let programaPronto = false
  let avisou = false
  let resolverPronta = () => {}
  const pronta = new Promise<void>((ok) => (resolverPronta = ok))
  const finalizar = () => {
    for (const s of shaders) if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s))
    if (!gl.getProgramParameter(tela, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(tela))
    gl.useProgram(tela)
    gl.uniform1i(ut('uCor'), 0)
    gl.uniform1i(ut('uAltura'), 1)
  }
  const quadro = (agora: number) => {
    id = requestAnimationFrame(quadro)
    if (!programaPronto) {
      if (paralela && !gl.getProgramParameter(tela, paralela.COMPLETION_STATUS_KHR)) return
      finalizar()
      programaPronto = true
    }
    if (!avisou && carregadas >= 2) {
      avisou = true
      resolverPronta()
    }
    if (!perto) {
      // longe do vale: nada a desenhar
      canvas.style.visibility = 'hidden'
      presenca = 0
      farois.forEach((fa, k) => {
        if ((mostra[k] ?? 0) !== 0) {
          mostra[k] = 0
          fa.rotulo.style.opacity = '0'
        }
      })
      ultimo = agora
      return
    }
    const quieto = canvas.style.visibility === 'visible' && agora - atividade > 1500 && !cadenteAtiva((agora / 1000) % 1000)
    if (quieto && agora - ultimo < 29) return
    const dt = Math.min(0.1, Math.max(1 / 240, (agora - ultimo) / 1000))
    ultimo = agora
    // o medidor de desempenho só conta quadros a 60 (parado, a 30, ele baixaria a resolução sem motivo)
    if (!quieto && canvas.style.visibility === 'visible' && document.visibilityState === 'visible') {
      media += (dt - media) * 0.05
      if (++contados > 90 && media > 1 / 30 && escala > teto * 0.75) {
        escala = Math.max(teto * 0.75, escala * 0.9)
        tamanho()
        contados = 0
        media = 1 / 60
      }
    }
    const r = secao.getBoundingClientRect()
    const vh = innerHeight
    // a camada vai uma tela além da seção: o vale só some depois que os projetos já cobriram a tela
    const alvo = carregadas < 2 ? 0 : suave(0.0, 0.9, (vh - r.top) / vh) * suave(-1.2, -0.98, r.bottom / vh)
    presenca += (alvo - presenca) * (1 - Math.exp(-dt / 0.25))
    if (presenca < 0.0005 && alvo === 0) {
      canvas.style.visibility = 'hidden'
      return
    }
    canvas.style.visibility = 'visible'
    if (toque) {
      const e = -r.top / vh
      luz.tx = W * (0.5 + 0.28 * Math.sin(1.3 * e))
      luz.ty = vh * (0.72 + 0.12 * Math.cos(0.9 * e))
      luz.alvo = 1
    }
    const g = 1 - Math.exp(-dt / 0.14)
    luz.x += (luz.tx - luz.x) * g
    luz.y += (luz.ty - luz.y) * g
    luz.on += (luz.alvo - luz.on) * (1 - Math.exp(-dt / 0.35))
    const m = 1 - Math.exp(-dt / 0.6)
    mouse.sx += (mouse.x - mouse.sx) * m
    mouse.sy += (mouse.y - mouse.sy) * m
    // a rolagem leva a câmera vale adentro; o mouse vira a cabeça um pouco
    const a = Math.max(0, (vh - r.top) / vh)
    // até a seção encostar no topo anda devagar; dentro dela o passo acelera, passando pelos faróis
    // a passagem para os projetos: quando a seção termina, a câmera ergue os olhos para o céu e salta
    const salto = suave(0, -0.9, r.bottom / vh)
    const sobeOlhar = reduzir ? 0 : salto * salto * (3 - 2 * salto)
    const anda = reduzir ? 0 : Math.min(a, 1) * 2.2 + Math.max(0, a - 1 - salto * 0.9) * 5.5 + sobeOlhar * 3
    const cam = [0.2, 1.75 + sobeOlhar * 1.2, 4 - anda]
    const olhar = [reduzir ? 0 : mouse.sx * 0.06 * (1 - sobeOlhar), -0.16 + sobeOlhar * 0.95 - (reduzir ? 0 : mouse.sy * 0.03)]
    const tempo = (agora / 1000) % 1000

    gl.disable(gl.BLEND)
    gl.useProgram(tela)
    gl.bindVertexArray(vaoTela)
    gl.uniform2f(ut('uRes'), canvas.width, canvas.height)
    gl.uniform2f(ut('uVista'), W, H)
    gl.uniform3fv(ut('uCam'), cam)
    gl.uniform2fv(ut('uOlhar'), olhar)
    gl.uniform1f(ut('uFoco'), foco)
    gl.uniform2f(ut('uLuz'), luz.x, luz.y)
    gl.uniform1f(ut('uLuzLigada'), luz.on)
    gl.uniform1f(ut('uPresenca'), presenca)
    gl.uniform1f(ut('uTempo'), tempo)
    gl.uniform3fv(ut('uTopo'), topo)
    gl.uniform1f(ut('uSalto'), salto)
    // cada farol acende ao se aproximar e o texto da camada fica preso ao alto da coluna, em perspectiva, sempre
    // do mesmo lado dela (o lado de dentro do vale): farol à esquerda tem o texto à direita, e vice-versa.
    // O texto entra e sai devagar; se dois se encostam, o mais distante espera
    const dados = new Float32Array(24)
    const cy = Math.cos(olhar[0]!), sy = Math.sin(olhar[0]!), cp = Math.cos(olhar[1]!), sp = Math.sin(olhar[1]!)
    const f = [sy * cp, sp, -cy * cp]
    const rl = Math.hypot(f[2]!, f[0]!)
    const rr = [-f[2]! / rl, 0, f[0]! / rl]
    const uu = [rr[1]! * f[2]! - rr[2]! * f[1]!, rr[2]! * f[0]! - rr[0]! * f[2]!, rr[0]! * f[1]! - rr[1]! * f[0]!]
    // em tela estreita os faróis chegam perto do meio do vale, para caberem no quadro
    const aperta = Math.max(0.25, Math.min(1, W / H / 1.5))
    const alvos = farois.map(() => 0)
    const caixas: ([number, number, number, number, number] | null)[] = farois.map(() => null)
    farois.forEach((fa, k) => {
      const fx = fa.x * aperta
      const v = [fx - cam[0]!, 1.45 - cam[1]!, fa.z - cam[2]!]
      const z = v[0]! * f[0]! + v[1]! * f[1]! + v[2]! * f[2]!
      const acende = suave(9, 6.5, Math.hypot(v[0]!, v[2]!)) * presenca
      dados.set([fx, fa.z, acende, 0], k * 4)
      if (z < 0.3) return
      const x = v[0]! * rr[0]! + v[1]! * rr[1]! + v[2]! * rr[2]!
      const y = v[0]! * uu[0]! + v[1]! * uu[1]! + v[2]! * uu[2]!
      const sx = ((x / z) * foco * (H / W) + 1) * 0.5 * W
      const syy = (1 - (y / z) * foco) * 0.5 * H
      const tam = Math.min(1.1, Math.max(0.5, 4.2 / z))
      const esquerda = fa.x > 0
      fa.rotulo.dataset.lado = esquerda ? 'e' : 'd'
      const sobe = (1 - (mostra[k] ?? 0)) * 18
      fa.rotulo.style.transform = `translate3d(${sx.toFixed(1)}px, ${(syy + sobe).toFixed(1)}px, 0) scale(${tam.toFixed(3)}) translate(${esquerda ? '-100%' : '0'}, -100%)`
      const w = fa.rotulo.offsetWidth * tam
      const h = fa.rotulo.offsetHeight * tam
      alvos[k] = acende * (1 - suave(0, 0.2, salto)) * suave(2.0, 3.6, z) * (1 - suave(6.5, 8.0, z)) * suave(-0.05, 0.04, (esquerda ? sx - w : sx) / W) * (1 - suave(0.96, 1.05, (esquerda ? sx : sx + w) / W))
      caixas[k] = esquerda ? [sx - w, syy - h, sx, syy, z] : [sx, syy - h, sx + w, syy, z]
    })
    // dois textos que se encostariam: o do farol mais perto fica, o outro espera
    farois.forEach((_, a) => {
      const A = caixas[a]
      if (!A || alvos[a]! < 0.05) return
      farois.forEach((_, b) => {
        const B = caixas[b]
        if (b === a || !B || alvos[b]! < 0.05) return
        const toca = A[0] < B[2] + 24 && B[0] < A[2] + 24 && A[1] < B[3] + 12 && B[1] < A[3] + 12
        if (toca && A[4] > B[4]) alvos[a] = 0
      })
    })
    const ritmo = 1 - Math.exp(-dt / 0.4)
    farois.forEach((fa, k) => {
      mostra[k] = (mostra[k] ?? 0) + (alvos[k]! - (mostra[k] ?? 0)) * ritmo
      fa.rotulo.style.opacity = mostra[k]!.toFixed(3)
    })
    gl.uniform4fv(ut('uFarol[0]'), dados)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    gl.bindVertexArray(null)
  }
  id = requestAnimationFrame(quadro)

  const parar = () => {
    vivo = false
    cancelAnimationFrame(id)
    io.disconnect()
    for (const e of gestos) removeEventListener(e, acordar)
    removeEventListener('pointermove', mover)
    removeEventListener('resize', tamanho)
    document.documentElement.removeEventListener('pointerleave', sair)
    // não derruba o contexto: no modo estrito do React o canvas é montado de novo
    texturas.forEach((t) => gl.deleteTexture(t))
    gl.deleteBuffer(bufTela)
    gl.deleteProgram(tela)
  }
  return { parar, pronta }
}
