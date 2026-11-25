// A cena do contato. Mistura as duas referências: a composição, as partículas, os clarões e a câmera vêm do sztanki; o núcleo, os
// tentáculos que saem dele, os feixes de fibras, a rampa de calor e o cursor vêm do jobhunt; o céu e todas as cores são as do site.
// REA completo das duas referências em docs/estudos/REA_CONTATO.md (só local). Resumo:
//  - do sztanki.com (página de contato): o céu de aurora, a coluna feita de PARTÍCULAS correndo por 600 linhas que nascem no chão,
//    serpenteiam até o centro, dobram numa curva e sobem; os clarões que correm por elas, a poeira que entra pelos lados, a câmera que
//    chega por um trilho e gira em volta da coluna com o mouse (até 0,3 rad). Os números de lá estão aqui, com o nome deles nos comentários;
//  - do jobhunt.asmcleod.com: as linhas finas dos fios por baixo das partículas, os sinais de luz que correm por elas e o cursor que
//    atravessa os fios e os afasta.
// Tudo reescrito do zero em WebGL2 puro (sem three). Um contexto só, criado quando o contato aparece e parado quando sai de cena.
// A câmera é exposta (camera()) para o vidro em HTML (Contato.tsx) ficar preso no mesmo mundo, como o CSS3DRenderer faz.

type V3 = [number, number, number]

const AMOSTRAS = 320 // pontos por linha (sztanki: _T = 320)

/* ---------- aleatório ---------- */
function gerador(a: number) {
  let t = a >>> 0
  return () => {
    t = (t + 1831565813) >>> 0
    let r = Math.imul(t ^ (t >>> 15), t | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const suave = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}
const cruz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const hex = (h: string): V3 => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]

/* ---------- as linhas (FiberParticles do sztanki, com os parâmetros da página de contato) ---------- */
const P = {
  semente: 11,
  perto: 400, // nearLines
  longe: 200, // farLines
  pertoMin: 16,
  pertoMax: 32,
  longeMin: 34,
  longeMax: 54,
  subida: 40, // riseHeight
  liftMin: 0.28,
  liftMax: 4,
  dobraMin: 3, // bendMin
  dobraMax: 9,
  serpente: 6, // meander
  ondas: 0.35, // meanderWaves
  serpIni: 20,
  serpFim: 50,
  fluxo: 2.2, // flowSpeed
  grao: 0.78,
  // as cores do site (azul vivo #0000f0, Deep Blue #000080, gelo #e8edf5), não as do sztanki
  cores: ['#c9d3ff', '#8b9cff', '#5566ff', '#2a35f0', '#1a1fb8'],
  acento: '#e8edf5',
  acentoParte: 0.06,
  clarões: 30,
  clarãoForça: 2,
  clarãoRaio: 1.6,
  clarãoVel: 2.5,
  clarãoVida: 8,
  clarãoColuna: 0.5,
  clarãoCor: '#c9d3ff',
}

type Linha = { pts: Float32Array; comp: number; cor: V3; brilho: number; peso: number; forte: boolean; tentaculo?: boolean }

function montarLinhas() {
  const rnd = gerador(P.semente * 7919)
  const faixa = (a: number, b: number) => a + (b - a) * rnd()
  const o = (r: number, ang: number, y: number): V3 => [Math.sin(ang) * r, y, Math.cos(ang) * r]
  // o serpentear no chão (wander): só entre serpIni e serpFim, com duas ondas em volta do centro
  const serpente = (n: number, s: number) => {
    const amp = Math.min(P.serpente / P.serpFim, 0.9 / 4.5)
    const k = suave(P.serpIni, P.serpFim, n)
    const w = (P.ondas * Math.PI * 2) / 10
    const a = P.semente * 1.7
    return amp * k * (Math.sin(3 * s + w * n + a) + 0.3 * Math.sin(5 * s - w * 1.6 * n + a * 2.3))
  }
  // risePath: chão → curva quadrática → subida reta
  const subida = (x0: number, z0: number) => {
    let lift = P.liftMin + (P.liftMax - P.liftMin) * Math.pow(rnd(), 1.4)
    const a = lift + faixa(P.dobraMin, P.dobraMax)
    const s = Math.atan2(x0, z0)
    const c = Math.hypot(x0, z0)
    const pts: V3[] = []
    for (let e = 0; e < 64; e++) {
      const t = 1 - e / 64
      const n = a + (c - a) * t
      pts.push(o(n, s + serpente(n, s), 0.03))
    }
    let chao = 0
    for (let e = 1; e < pts.length; e++) chao += Math.hypot(pts[e]![0] - pts[e - 1]![0], pts[e]![2] - pts[e - 1]![2])
    // converge no núcleo: a curva leva o fio até perto do centro, na altura do núcleo
    lift = faixa(0.12, 0.6)
    const f = faixa(0.7, 1.5)
    for (let e = 0; e <= 40; e++) {
      const t = e / 40
      const n = 1 - t
      pts.push(o(n * n * a + 2 * n * t * lift + t * t * lift, s, t * t * f + 0.03))
    }
    // e explode: um tentáculo do jobhunt sai do núcleo para o alto e para fora, guiado por ruído e por um giro em volta de um eixo
    // do quase vertical ao quase horizontal, com mais peso nos ângulos abertos: a copa se abre para os lados
    const th = 0.04 + 1.48 * Math.pow(rnd(), 0.6)
    const dir = norm([Math.sin(s) * Math.sin(th), Math.cos(th), Math.cos(s) * Math.sin(th)])
    const comp = faixa(8, 23)
    const sv = lerp(0.55, 1.25, rnd())
    const cg = lerp(0.18, 0.5, rnd())
    const off: V3 = [rnd() * 100, rnd() * 100, rnd() * 100]
    const ini = pts[pts.length - 1]!
    const q: V3 = [...ini]
    let p: V3 = [...dir]
    const cp: V3[] = [[...q]]
    for (let e = 1; e < 12; e++) {
      const t = e / 11
      const h: V3 = [ruido3(q[0] * 0.16 + off[0], q[1] * 0.16, q[2] * 0.16), ruido3(q[0] * 0.16, q[1] * 0.16 + off[1], q[2] * 0.16), ruido3(q[0] * 0.16, q[1] * 0.16, q[2] * 0.16 + off[2])]
      const g = norm(cruz(eixo, [q[0], q[1] - 1.1, q[2]]))
      const kh = sv * 0.55 * Math.min(1, t * 2.5)
      p = norm([p[0] + h[0] * kh + g[0] * cg * t + dir[0] * 0.35, p[1] + h[1] * kh + g[1] * cg * t + dir[1] * 0.35, p[2] + h[2] * kh + g[2] * cg * t + dir[2] * 0.35])
      const st = (comp / 11) * (e === 1 ? 0.6 : 1)
      q[0] += p[0] * st
      q[1] = Math.max(0.1, q[1] + p[1] * st)
      q[2] += p[2] * st
      cp.push([...q])
    }
    for (let k = 1; k <= 66; k++) {
      const fu = (k / 66) * 11
      const ai = Math.min(Math.floor(fu), 10)
      const t = fu - ai
      const P0 = cp[Math.max(0, ai - 1)]!
      const P1 = cp[ai]!
      const P2 = cp[ai + 1]!
      const P3 = cp[Math.min(11, ai + 2)]!
      pts.push([catmull(P0[0], P1[0], P2[0], P3[0], t), catmull(P0[1], P1[1], P2[1], P3[1], t), catmull(P0[2], P1[2], P2[2], P3[2], t)])
    }
    return { pts, chao }
  }
  // reamostra em AMOSTRAS pontos iguais; o 4º canal é o peso (mais luz no pé da coluna, some ao longe, entra suave)
  const reamostrar = (pts: V3[], chao: number) => {
    const acum = [0]
    for (let i = 1; i < pts.length; i++) acum.push(acum[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1], pts[i]![2] - pts[i - 1]![2]))
    const total = acum[acum.length - 1]!
    const out = new Float32Array(AMOSTRAS * 4)
    let j = 0
    for (let k = 0; k < AMOSTRAS; k++) {
      const d = (k / (AMOSTRAS - 1)) * total
      while (j < pts.length - 2 && acum[j + 1]! < d) j++
      const t = (d - acum[j]!) / Math.max(1e-6, acum[j + 1]! - acum[j]!)
      const a = pts[j]!
      const b = pts[j + 1]!
      const x = lerp(a[0], b[0], t)
      const y = lerp(a[1], b[1], t)
      const z = lerp(a[2], b[2], t)
      const r = Math.hypot(x, z)
      const peso = (1 + 1.3 * Math.exp(-y / 7) * Math.exp(-r / 5)) * (0.3 + 0.7 * Math.exp(-Math.max(r - 15, 0) / 35)) * suave(0, chao * 0.35, d) * (1 - suave(total * 0.8, total, d) * 0.9)
      out.set([x, y, z, peso], k * 4)
    }
    return { pts: out, comp: total }
  }
  const estilo = () => {
    const forte = rnd() < 0.2
    const paleta = forte ? P.cores.slice(0, 3) : P.cores.slice(1)
    return { brilho: forte ? faixa(0.8, 1.15) : faixa(0.2, 0.6), cor: hex(paleta[(rnd() * paleta.length) | 0]!), peso: forte ? 1.3 : 0.6 }
  }
  const anel = (n: number, rMin: number, rMax: number, k: number) => {
    const lista: Linha[] = []
    for (let i = 0; i < n; i++) {
      const ang = ((i + faixa(-0.35, 0.35)) / n) * Math.PI * 2
      const c = faixa(rMin, rMax)
      const st = estilo()
      const { pts, chao } = subida(Math.sin(ang) * c, Math.cos(ang) * c)
      const r = reamostrar(pts, chao)
      lista.push({ pts: r.pts, comp: r.comp, cor: st.cor, brilho: st.brilho * k, peso: st.peso, forte: st.peso > 1 })
    }
    return lista
  }
  // os tentáculos do jobhunt: saem do núcleo (o pé da coluna) para cima e para os lados, cada um guiado por ruído e por um giro em
  // volta de um eixo (o _b de lá: 12 pontos de controle, puxão radial .35, primeiro passo .6), avaliados em Catmull-Rom
  const ruido3 = (x: number, y: number, z: number) => {
    const h = (i: number, j: number, k: number) => {
      let q = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 1274126177)) | 0
      q = Math.imul(q ^ (q >>> 13), 1274126177)
      return (((q ^ (q >>> 16)) >>> 0) / 4294967295) * 2 - 1
    }
    const i = Math.floor(x)
    const j = Math.floor(y)
    const k = Math.floor(z)
    const fx = x - i
    const fy = y - j
    const fz = z - k
    const sx = fx * fx * (3 - 2 * fx)
    const sy = fy * fy * (3 - 2 * fy)
    const sz = fz * fz * (3 - 2 * fz)
    return lerp(lerp(lerp(h(i, j, k), h(i + 1, j, k), sx), lerp(h(i, j + 1, k), h(i + 1, j + 1, k), sx), sy), lerp(lerp(h(i, j, k + 1), h(i + 1, j, k + 1), sx), lerp(h(i, j + 1, k + 1), h(i + 1, j + 1, k + 1), sx), sy), sz)
  }
  const NUC: V3 = [0, 1.1, 0]
  const eixo = norm([0.18, 1, 0.12])
  const catmull = (a: number, b: number, c: number, d: number, t: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t)
  const tentaculos = (n: number) => {
    const lista: Linha[] = []
    for (let i = 0; i < n; i++) {
      const dir = norm([rnd() * 2 - 1, rnd() * 0.55 + 0.02, rnd() * 2 - 1])
      const comp = lerp(6, 11.5, Math.pow(rnd(), 0.8))
      const sv = lerp(0.55, 1.25, rnd())
      const cg = lerp(0.18, 0.5, rnd())
      const off: V3 = [rnd() * 100, rnd() * 100, rnd() * 100]
      const f: V3 = [NUC[0] + dir[0] * 0.39, NUC[1] + dir[1] * 0.39, NUC[2] + dir[2] * 0.39]
      let p: V3 = [...dir]
      const passo = comp / 11
      const cp: V3[] = [[...f]]
      for (let e = 1; e < 12; e++) {
        const t = e / 11
        const r = 0.16
        const h: V3 = [ruido3(f[0] * r + off[0], f[1] * r, f[2] * r), ruido3(f[0] * r, f[1] * r + off[1], f[2] * r), ruido3(f[0] * r, f[1] * r, f[2] * r + off[2])]
        const rel: V3 = [f[0] - NUC[0], f[1] - NUC[1], f[2] - NUC[2]]
        const g = norm(cruz(eixo, rel))
        const kh = sv * 0.55 * Math.min(1, t * 2.5)
        p = norm([p[0] + h[0] * kh + g[0] * cg * t + dir[0] * 0.35, p[1] + h[1] * kh + g[1] * cg * t + dir[1] * 0.35, p[2] + h[2] * kh + g[2] * cg * t + dir[2] * 0.35])
        const st = passo * (e === 1 ? 0.6 : 1)
        f[0] += p[0] * st
        f[1] = Math.max(0.05, f[1] + p[1] * st)
        f[2] += p[2] * st
        cp.push([...f])
      }
      const out = new Float32Array(AMOSTRAS * 4)
      let total = 0
      let ant: V3 | null = null
      for (let k = 0; k < AMOSTRAS; k++) {
        const u = k / (AMOSTRAS - 1)
        const fu = u * 11
        const a = Math.min(Math.floor(fu), 10)
        const t = fu - a
        const P0 = cp[Math.max(0, a - 1)]!
        const P1 = cp[a]!
        const P2 = cp[a + 1]!
        const P3 = cp[Math.min(11, a + 2)]!
        const q: V3 = [catmull(P0[0], P1[0], P2[0], P3[0], t), catmull(P0[1], P1[1], P2[1], P3[1], t), catmull(P0[2], P1[2], P2[2], P3[2], t)]
        if (ant) total += Math.hypot(q[0] - ant[0], q[1] - ant[1], q[2] - ant[2])
        ant = q
        const peso = suave(0, 0.06, u) * (1 - suave(0.72, 1, u) * 0.8) * 1.5
        out.set([q[0], q[1], q[2], peso], k * 4)
      }
      const st = estilo()
      lista.push({ pts: out, comp: total, cor: st.cor, brilho: lerp(0.35, 0.75, rnd()), peso: 0.2, forte: true, tentaculo: true })
    }
    return lista
  }
  return [...anel(P.perto, P.pertoMin, P.pertoMax, 1), ...anel(P.longe, P.longeMin, P.longeMax, 0.6), ...tentaculos(70)]
}

/* ---------- shaders ---------- */
const CABECA = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
uniform sampler2D uLinhas;   // AMOSTRAS x linhas: xyz + peso
uniform mat4 uVP;
uniform vec3 uCam;
uniform vec2 uRes;           // px de CSS
uniform vec2 uPtr;           // ponteiro em px de CSS (y para baixo)
uniform float uPtrR;
uniform float uPres;
uniform float uTempo;
uniform float uEntrada;      // 0 a 1: a cena chegando
uniform float uOnda;         // segundos desde o clique (negativo: nenhuma)
uniform float uOndaForca;
float hash(float n) { return fract(sin(n) * 43758.5453); }
vec4 amostra(int linha, float s) {
  float f = clamp(s, 0.0, 1.0) * ${(AMOSTRAS - 1).toFixed(1)};
  int i = int(floor(f));
  vec4 a = texelFetch(uLinhas, ivec2(i, linha), 0);
  vec4 b = texelFetch(uLinhas, ivec2(min(i + 1, ${AMOSTRAS - 1}), linha), 0);
  return mix(a, b, f - float(i));
}
// o cursor atravessa os fios (jobhunt): o que estiver perto do ponteiro na tela é afastado dele, no plano da tela
vec4 empurrar(vec4 clip, out float perto) {
  vec2 ndc = clip.xy / clip.w;
  vec2 tela = vec2((ndc.x * 0.5 + 0.5) * uRes.x, (0.5 - ndc.y * 0.5) * uRes.y);
  vec2 dv = tela - uPtr;
  float d = length(dv);
  perto = 0.0;
  if (uPres > 0.001 && d < uPtrR && d > 0.5 && clip.w > 0.0) {
    float q = 1.0 - d / uPtrR;
    perto = q * uPres;
    tela += dv / d * q * q * uPtrR * 0.32 * uPres;
    ndc = vec2(tela.x / uRes.x * 2.0 - 1.0, 1.0 - tela.y / uRes.y * 2.0);
    clip.xy = ndc * clip.w;
  }
  return clip;
}
// a onda do clique: um anel de luz que sai da coluna pelo chão
float onda(vec3 p) {
  if (uOnda < 0.0) return 0.0;
  float r = length(p.xz);
  return exp(-pow((r - uOnda * 16.0) / 2.6, 2.0)) * exp(-uOnda * 0.7) * uOndaForca;
}
`

// as partículas (o corpo da coluna)
const V_PART = `${CABECA}
uniform float uFluxo;
uniform float uProj;
in vec4 aP;   // linha, u0, velocidade (1/comprimento), tamanho (mundo)
in vec4 aC;   // cor, brilho
out vec3 vCor;
out float vA;
void main() {
  int linha = int(aP.x + 0.5);
  float s = fract(aP.y + uTempo * uFluxo * aP.z);
  vec4 p = amostra(linha, s);
  float perto;
  vec4 clip = empurrar(uVP * vec4(p.xyz, 1.0), perto);
  gl_Position = clip;
  float d = length(uCam - p.xyz);
  float px = aP.w * uProj / d;
  gl_PointSize = clamp(px, 1.0, 9.0);
  float h = hash(aP.y * 91.7 + aP.x * 0.137);
  float pisca = 1.0 + 0.3 * sin(uTempo * mix(1.0, 5.0, h) + h * 6.2831);
  float chega = smoothstep(0.0, 1.0, uEntrada * 1.7 - h * 0.7);
  vA = aC.w * p.w * smoothstep(0.0, 0.02, s) * pisca * chega * min(1.0, px) * (1.0 + onda(p.xyz) + perto * 0.8);
  vCor = aC.rgb;
}`
const F_PART = `#version 300 es
precision highp float;
in vec3 vCor;
in float vA;
out vec4 saida;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = exp(-r * r * 3.2) * (1.0 - smoothstep(0.75, 1.0, r)) * vA;
  if (a < 0.002) discard;
  vec3 c = vCor * a;
  saida = vec4(c, clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0));
}`

// os fios (jobhunt): cada fio forte é um feixe de fibras que saem juntas do pé da coluna e se abrem para a ponta, no chão, cada uma
// com o seu balanço; a cor é a rampa de calor do jobhunt pela distância ao núcleo, nas cores do site (gelo no pé da coluna, azul vivo,
// azul fundo ao longe); sinais de luz correm por eles e, na chegada, eles nascem do núcleo para fora com a frente brilhando
const V_LINHA = `${CABECA}
uniform float uOpac;
uniform float uPerto; // escurece os fios junto ao núcleo (1 = como está): na tela estreita eles se amontoam e a soma estoura em branco
in vec4 aL;   // linha, u, brilho, semente
in vec4 aH;   // direção da fibra no chão (x, z), abertura, é fibra (0 ou 1)
out vec3 vCor;
out float vA;
vec3 calor(float d) {
  vec3 c = vec3(0.91, 0.93, 0.96);
  c = mix(c, vec3(0.62, 0.68, 1.0), smoothstep(0.0, 0.08, d));
  c = mix(c, vec3(0.27, 0.33, 1.0), smoothstep(0.08, 0.25, d));
  c = mix(c, vec3(0.06, 0.09, 0.94), smoothstep(0.25, 0.55, d));
  c = mix(c, vec3(0.02, 0.02, 0.5), smoothstep(0.55, 1.0, d));
  return c;
}
void main() {
  int linha = int(aL.x + 0.5);
  vec4 p = amostra(linha, aL.y);
  float r = length(p.xz);
  if (aH.w > 1.5) {
    float abre = pow(smoothstep(0.0, 1.0, aL.y), 1.15) * aH.z * 0.32;
    vec2 bal = vec2(sin(uTempo * 0.31 + aL.w * 40.0 + aL.y * 2.3), cos(uTempo * 0.27 + aL.w * 31.0 + aL.y * 1.9));
    p.xz += (aH.xy + bal * 0.45) * abre;
    p.y += sin(uTempo * 0.23 + aL.w * 23.0 + aL.y * 2.7) * abre * 0.6;
  } else if (aH.w > 0.5) {
    float abre = smoothstep(3.0, 42.0, r) * aH.z;
    vec2 bal = vec2(sin(uTempo * 0.31 + aL.w * 40.0 + aL.y * 9.0), cos(uTempo * 0.27 + aL.w * 31.0 + aL.y * 7.0));
    p.xz += aH.xy * abre + bal * 0.25 * abre;
  }
  float perto;
  gl_Position = empurrar(uVP * vec4(p.xyz, 1.0), perto);
  // distância ao núcleo (o pé da coluna): pelo chão e, na subida, pela altura
  float dn = clamp((r + max(p.y - 0.5, 0.0) * 0.35) / 40.0, 0.0, 1.0);
  float quente = 1.0 + 0.7 * (1.0 - smoothstep(0.0, 0.3, dn));
  float x = fract(aL.y * 0.9 - uTempo * 0.045 * (0.7 + aL.w * 0.6) + aL.w * 7.0);
  float sinal = exp(-pow((x - 0.5) * 38.0, 2.0)) * 2.2 * step(0.55, aL.w);
  // nascimento: a frente sai do núcleo e corre pelo chão e coluna acima
  float pos = r + max(p.y, 0.0) * 0.9;
  float frente = uEntrada * 48.0;
  float chega = 1.0 - smoothstep(frente - 2.5, frente, pos);
  float brilhoFrente = uEntrada < 0.999 ? exp(-pow((frente - pos) / 1.6, 2.0)) * 2.4 : 0.0;
  float junto = mix(1.0, uPerto, 1.0 - smoothstep(0.0, 0.5, dn));
  vA = junto * uOpac * aL.z * p.w * (1.0 + sinal + onda(p.xyz) * 1.5 + perto * 2.0 + brilhoFrente) * chega * (aH.w > 0.5 ? 0.45 : 1.0);
  vCor = calor(dn) * quente;
}`
const F_LINHA = `#version 300 es
precision highp float;
in vec3 vCor;
in float vA;
out vec4 saida;
void main() { vec3 c = vCor * vA; saida = vec4(c, clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0)); }`

// clarões e poeira: pontos grandes e macios com posição já no mundo
const V_LUZ = `${CABECA}
uniform float uProj;
in vec4 aPos;  // xyz + tamanho (mundo)
in vec4 aCor;  // rgb + intensidade
out vec4 vCor;
void main() {
  float perto;
  gl_Position = empurrar(uVP * vec4(aPos.xyz, 1.0), perto);
  float d = length(uCam - aPos.xyz);
  float px = aPos.w * uProj / d;
  gl_PointSize = clamp(px, 1.0, 256.0);
  vCor = vec4(aCor.rgb, aCor.a * min(1.0, px));
}`
const F_LUZ = `#version 300 es
precision highp float;
in vec4 vCor;
out vec4 saida;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = exp(-r * r * 5.0) * (1.0 - smoothstep(0.8, 1.0, r)) * vCor.a;
  if (a < 0.002) discard;
  vec3 c = vCor.rgb * a;
  saida = vec4(c, clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0));
}`

// o céu (AuroraDome do sztanki): degradê, três manchas de luz, o horizonte e grão
const V_CEU = `#version 300 es
in vec2 aPos;
out vec2 vNdc;
void main() { vNdc = aPos; gl_Position = vec4(aPos, 0.0, 1.0); }`
const F_CEU = `#version 300 es
precision highp float;
uniform vec3 uDir; uniform vec3 uCima; uniform vec3 uFrente; uniform vec3 uNuc;
uniform float uTan; uniform float uAsp; uniform float uTempo; uniform float uEntrada; uniform float uCeuA;
in vec2 vNdc;
out vec4 saida;
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec3 d = normalize(uFrente + uDir * vNdc.x * uTan * uAsp + uCima * vNdc.y * uTan);
  vec3 preto = vec3(0.0196, 0.0196, 0.0314);
  vec3 deep = vec3(0.0, 0.0, 0.502);
  vec3 vivo = vec3(0.0, 0.0, 0.94);
  vec3 cor = preto;
  // o Deep Blue sobe do horizonte e some no alto; abaixo do horizonte o chão fica num azul mais fundo
  cor += deep * exp(-abs(d.y) / 0.2) * 0.5;
  cor += deep * smoothstep(0.02, -0.5, d.y) * 0.16;
  // o azul vivo em volta do núcleo (o pé da coluna) e um brilho gelo bem perto dele
  float k = 1.0 - dot(d, uNuc);
  cor += vivo * exp(-k / 0.03) * 0.38;
  cor += vec3(0.6, 0.66, 1.0) * exp(-k / 0.003) * 0.3;
  cor += (h2(gl_FragCoord.xy + fract(uTempo) * 61.0) - 0.5) * 0.012;
  saida = vec4(cor * uCeuA, uCeuA);
}`

/* ---------- matrizes ---------- */
function perspectiva(fov: number, asp: number, near: number, far: number) {
  const f = 1 / Math.tan(fov / 2)
  const o = new Float32Array(16)
  o[0] = f / asp
  o[5] = f
  o[10] = (far + near) / (near - far)
  o[11] = -1
  o[14] = (2 * far * near) / (near - far)
  return o
}
function mult(a: Float32Array, b: Float32Array) {
  const o = new Float32Array(16)
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r]! * b[c * 4]! + a[4 + r]! * b[c * 4 + 1]! + a[8 + r]! * b[c * 4 + 2]! + a[12 + r]! * b[c * 4 + 3]!
  return o
}
function olharPara(olho: V3, alvo: V3) {
  const f = norm([alvo[0] - olho[0], alvo[1] - olho[1], alvo[2] - olho[2]])
  const d = norm(cruz(f, [0, 1, 0]))
  const c = cruz(d, f)
  const V = new Float32Array([
    d[0], c[0], -f[0], 0,
    d[1], c[1], -f[1], 0,
    d[2], c[2], -f[2], 0,
    -(d[0] * olho[0] + d[1] * olho[1] + d[2] * olho[2]),
    -(c[0] * olho[0] + c[1] * olho[1] + c[2] * olho[2]),
    f[0] * olho[0] + f[1] * olho[1] + f[2] * olho[2],
    1,
  ])
  return { V, direita: d, cima: c, frente: f }
}

export type Camera = { V: Float32Array; fov: number; W: number; H: number }
export type OpcoesFios = { leve: boolean; calmo: boolean }

export function criarFios(canvas: HTMLCanvasElement, op: OpcoesFios) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' })
  if (!gl || gl.isContextLost()) return null
  const compilar = (tipo: number, src: string) => {
    const sh = gl.createShader(tipo)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.warn('fios:', gl.getShaderInfoLog(sh))
    return sh
  }
  const programa = (v: string, f: string, attrs: string[]) => {
    const p = gl.createProgram()!
    gl.attachShader(p, compilar(gl.VERTEX_SHADER, v))
    gl.attachShader(p, compilar(gl.FRAGMENT_SHADER, f))
    attrs.forEach((a, i) => gl.bindAttribLocation(p, i, a))
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.warn('fios:', gl.getProgramInfoLog(p))
      return null
    }
    return p
  }
  const pPart = programa(V_PART, F_PART, ['aP', 'aC'])
  const pLinha = programa(V_LINHA, F_LINHA, ['aL', 'aH'])
  const pLuz = programa(V_LUZ, F_LUZ, ['aPos', 'aCor'])
  const pCeu = programa(V_CEU, F_CEU, ['aPos'])
  if (!pPart || !pLinha || !pLuz || !pCeu) return null

  const linhas = montarLinhas()
  const NL = linhas.length

  // textura das linhas
  const dadosLinhas = new Float32Array(AMOSTRAS * NL * 4)
  linhas.forEach((l, i) => dadosLinhas.set(l.pts, i * AMOSTRAS * 4))
  const tex = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, tex)
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]] as const) gl.texParameteri(gl.TEXTURE_2D, k, v)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, AMOSTRAS, NL, 0, gl.RGBA, gl.FLOAT, dadosLinhas)

  // partículas: distribuídas pelas linhas na proporção comprimento × brilho × peso
  const rnd = gerador(4242)
  const faixa = (a: number, b: number) => a + (b - a) * rnd()
  const total = op.leve ? 150_000 : 240_000
  const partes = linhas.map((l) => l.comp * l.brilho * l.peso)
  const soma = partes.reduce((a, b) => a + b, 0)
  const aP = new Float32Array(total * 4)
  const aC = new Float32Array(total * 4)
  const acento = hex(P.acento)
  let n = 0
  linhas.forEach((l, i) => {
    const quantas = i === NL - 1 ? total - n : Math.round((total * partes[i]!) / soma)
    const fim = Math.min(n + quantas, total)
    for (; n < fim; n++) {
      const cor = rnd() < P.acentoParte ? acento : l.cor
      aP.set([i, rnd(), faixa(0.7, 1.3) / l.comp, faixa(0.035, 0.08) * P.grao], n * 4)
      aC.set([cor[0], cor[1], cor[2], faixa(0.5, 1) * l.brilho], n * 4)
    }
  })

  // linhas: pares de vértices ao longo de cada uma (no leve, uma amostra sim, outra não); os fios fortes levam um feixe de fibras
  const passo = 1
  const segs = Math.floor((AMOSTRAS - 1) / passo)
  const FIBRAS = op.leve ? 4 : 5
  const fitas = linhas.reduce((t, l) => t + 1 + (l.forte ? FIBRAS : 0), 0)
  const aL = new Float32Array(fitas * segs * 2 * 4)
  const aH = new Float32Array(fitas * segs * 2 * 4)
  let m = 0
  linhas.forEach((l, i) => {
    const sem = rnd()
    for (let h = 0; h <= (l.forte ? FIBRAS : 0); h++) {
      const ang = rnd() * Math.PI * 2
      const abre = h === 0 ? 0 : faixa(0.6, 3.2)
      for (let k = 0; k < segs; k++) {
        for (const j of [k * passo, Math.min((k + 1) * passo, AMOSTRAS - 1)]) {
          aL.set([i, j / (AMOSTRAS - 1), l.brilho, h === 0 ? sem : rnd() * 0.5], m * 4)
          aH.set([Math.cos(ang), Math.sin(ang), abre, h === 0 ? 0 : l.tentaculo ? 2 : 1], m * 4)
          m++
        }
      }
    }
  })

  // poeira (InflowParticles): 2000 pontos que entram pelos lados e sobem perto da coluna
  const POEIRA = op.leve ? 1500 : 2000
  const poeira = Array.from({ length: POEIRA }, () => ({ a: rnd() * Math.PI * 2, k: rnd(), v: faixa(0.6, 1.4), y: rnd(), tam: faixa(0.02, 0.05), cor: hex(['#e8edf5', '#9fb2ff', '#5a6dff', '#2f3cff'][(rnd() * 4) | 0]!) }))
  // clarões: correm por linhas sorteadas, mais fortes longe da coluna (flareColumn)
  const claroes = Array.from({ length: P.clarões }, () => ({ linha: (rnd() * NL) | 0, u: faixa(0.05, 0.45), idade: rnd() * P.clarãoVida, vida: P.clarãoVida * faixa(0.7, 1.3) }))
  const luz = new Float32Array((POEIRA + P.clarões + 2) * 4)
  const luzCor = new Float32Array((POEIRA + P.clarões + 2) * 4)
  const corClarao = hex(P.clarãoCor)

  const buffers: WebGLBuffer[] = []
  const buf = (dados: ArrayBufferView, uso: number = gl.STATIC_DRAW) => {
    const b = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, b)
    gl.bufferData(gl.ARRAY_BUFFER, dados, uso)
    buffers.push(b)
    return b
  }
  const vao = (partes: [WebGLBuffer, number][]) => {
    const v = gl.createVertexArray()!
    gl.bindVertexArray(v)
    partes.forEach(([b, n], i) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, b)
      gl.enableVertexAttribArray(i)
      gl.vertexAttribPointer(i, n, gl.FLOAT, false, 0, 0)
    })
    gl.bindVertexArray(null)
    return v
  }
  const vaoPart = vao([[buf(aP), 4], [buf(aC), 4]])
  const vaoLinha = vao([[buf(aL), 4], [buf(aH), 4]])
  const bufLuz = buf(luz, gl.DYNAMIC_DRAW)
  const bufLuzCor = buf(luzCor, gl.DYNAMIC_DRAW)
  const vaoLuz = vao([[bufLuz, 4], [bufLuzCor, 4]])
  const vaoCeu = vao([[buf(new Float32Array([-1, -1, 3, -1, -1, 3])), 2]])

  const locs = (p: WebGLProgram, nomes: string[]) => Object.fromEntries(nomes.map((k) => [k, gl.getUniformLocation(p, k)]))
  const comuns = ['uLinhas', 'uVP', 'uCam', 'uRes', 'uPtr', 'uPtrR', 'uPres', 'uTempo', 'uEntrada', 'uOnda', 'uOndaForca']
  const L = {
    part: locs(pPart, [...comuns, 'uFluxo', 'uProj']),
    linha: locs(pLinha, [...comuns, 'uOpac', 'uPerto']),
    luz: locs(pLuz, [...comuns, 'uProj']),
    ceu: locs(pCeu, ['uDir', 'uCima', 'uFrente', 'uNuc', 'uTan', 'uAsp', 'uTempo', 'uEntrada', 'uCeuA']),
  }

  let tempo = 0
  let entrada = 0
  let viagem = 0
  let nucleo = 0
  let ceuA = 0
  let yaw = 0
  let onda = -1
  let ondaForca = 0
  let pres = 0
  let alvoPres = 0
  let px = 0
  let py = 0
  let spx = 0
  let spy = 0
  let cam: Camera = { V: new Float32Array(16), fov: 1, W: 1, H: 1 }
  const fov = (50 * Math.PI) / 180

  return {
    ponteiro(x: number, y: number, dentro: boolean) {
      px = x
      py = y
      alvoPres = dentro ? 1 : 0
    },
    /** onda de luz pelo chão; forte no clique, fraca ao passar num botão */
    onda(forte: boolean) {
      if (onda >= 0 && onda < 0.4 && !forte) return
      onda = 0
      ondaForca = forte ? 1.6 : 0.6
    },
    reiniciar() {},
    /** a chegada (0 a 1, da rolagem): o núcleo aparece à frente; o céu cobre o túnel; os fios brotam do núcleo; a câmera se aproxima */
    chegada(c: number) {
      // o robô some até 0,38; só o núcleo pulsa no céu até 0,55 (uma pausa antes dos raios); aí os fios brotam
      nucleo = suave(0, 0.25, c)
      ceuA = suave(0.28, 0.5, c)
      entrada = suave(0.55, 0.92, c)
      viagem = suave(0.4, 1, c)
    },
    camera() {
      return cam
    },
    desenhar(dt: number, W: number, H: number) {
      if (gl.isContextLost() || W < 2 || H < 2) return
      dt = Math.min(dt, 0.05)
      tempo += dt
      if (onda >= 0) {
        onda += dt
        if (onda > 4) onda = -1
      }
      pres += (alvoPres - pres) * (1 - Math.exp(-6 * dt))
      spx += (px - spx) * (1 - Math.exp(-16 * dt))
      spy += (py - spy) * (1 - Math.exp(-16 * dt))
      const e = Math.min(window.devicePixelRatio || 1, op.leve ? 2 : 1.5)
      const w = Math.max(2, Math.round(W * e))
      const h = Math.max(2, Math.round(H * e))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }

      // câmera: chega pelo trilho (como a rolagem do sztanki, z 44 → 28) e gira em volta da coluna com o mouse (maxYaw 0,3, invertido)
      const asp = W / H
      const tanH = Math.tan(fov / 2)
      // em tela estreita, recua até caber o vidro (≈ 10,5 unidades de largura na altura do cartão)
      const perto = Math.max(26, 7 / (tanH * asp))
      const longe = perto + 90
      const ease = 1 - Math.pow(1 - viagem, 3)
      const dist = lerp(longe, perto, ease)
      const nx = clamp(px / W, 0, 1) * 2 - 1
      yaw += (-nx * 0.3 * pres - yaw) * (1 - Math.exp(-3 * dt))
      // no fim, a câmera mira um pouco acima do núcleo, quase na altura dele: a explosão fica no meio da tela
      const alvo: V3 = [0, lerp(1.1, 3.6, ease), 0]
      const olho: V3 = [Math.sin(yaw) * dist, lerp(1.1, 2.4, ease), Math.cos(yaw) * dist]
      const { V, direita, cima, frente } = olharPara(olho, alvo)
      const Pm = perspectiva(fov, asp, 0.3, 200)
      const VP = mult(Pm, V)
      cam = { V, fov, W, H }
      const proj = (H * e) / (2 * tanH)

      // clarões e poeira (posições na CPU)
      let k = 0
      for (const c of claroes) {
        c.idade += dt
        const l = linhas[c.linha]!
        c.u += ((P.clarãoVel * P.fluxo) / l.comp) * dt
        if (c.u >= 1 || c.idade > c.vida) {
          c.linha = (rnd() * NL) | 0
          c.u = faixa(0.05, 0.45)
          c.idade = 0
          c.vida = P.clarãoVida * faixa(0.7, 1.3)
        }
        const f = c.u * (AMOSTRAS - 1)
        const i = Math.floor(f)
        const t = f - i
        const a = i * 4
        const b = Math.min(i + 1, AMOSTRAS - 1) * 4
        const x = lerp(l.pts[a]!, l.pts[b]!, t)
        const y = lerp(l.pts[a + 1]!, l.pts[b + 1]!, t)
        const z = lerp(l.pts[a + 2]!, l.pts[b + 2]!, t)
        const vida = c.idade / c.vida
        const env = suave(0, 0.3, vida) * (1 - suave(0.6, 1, vida))
        const col = P.clarãoColuna + (1 - P.clarãoColuna) * suave(1, 8, Math.hypot(x, z))
        luz.set([x, y, z, P.clarãoRaio], k * 4)
        luzCor.set([corClarao[0], corClarao[1], corClarao[2], P.clarãoForça * env * col * 0.22 * entrada], k * 4)
        k++
      }
      const bate = 1 + Math.sin(tempo * 0.9) * 0.12 + (onda >= 0 ? Math.exp(-onda * 2.5) * ondaForca * 0.6 : 0)
      luz.set([0, 1.1, 0, 3.2 * bate], k * 4)
      luzCor.set([0.25, 0.3, 1, 0.4 * nucleo + 0.5 * nucleo * (1 - entrada)], k * 4)
      k++
      luz.set([0, 1.1, 0, 1.1 * bate], k * 4)
      luzCor.set([0.93, 0.95, 1, 0.6 * nucleo + 0.6 * nucleo * (1 - entrada)], k * 4)
      k++
      for (const p of poeira) {
        const q = (p.k + tempo * 0.03 * p.v) % 1
        const r = lerp(42, 7.5, q)
        const a = p.a + q * 0.7
        const y = p.y * 26 * (1 - q * 0.6) + q * q * 16
        luz.set([Math.sin(a) * r, y, Math.cos(a) * r, p.tam], k * 4)
        luzCor.set([p.cor[0], p.cor[1], p.cor[2], suave(0, 0.12, q) * (1 - suave(0.82, 1, q)) * 0.9 * entrada], k * 4)
        k++
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, bufLuz)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, luz)
      gl.bindBuffer(gl.ARRAY_BUFFER, bufLuzCor)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, luzCor)

      gl.viewport(0, 0, w, h)
      gl.disable(gl.BLEND)
      gl.useProgram(pCeu)
      gl.uniform3f(L.ceu.uDir!, direita[0], direita[1], direita[2])
      gl.uniform3f(L.ceu.uCima!, cima[0], cima[1], cima[2])
      gl.uniform3f(L.ceu.uFrente!, frente[0], frente[1], frente[2])
      const nuc = norm([-olho[0], 1.1 - olho[1], -olho[2]])
      gl.uniform3f(L.ceu.uNuc!, nuc[0], nuc[1], nuc[2])
      gl.uniform1f(L.ceu.uTan!, tanH)
      gl.uniform1f(L.ceu.uAsp!, asp)
      gl.uniform1f(L.ceu.uTempo!, tempo)
      gl.uniform1f(L.ceu.uEntrada!, entrada)
      gl.uniform1f(L.ceu.uCeuA!, ceuA)
      gl.bindVertexArray(vaoCeu)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      gl.enable(gl.BLEND)
      gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ONE)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      const usar = (p: WebGLProgram, l: Record<string, WebGLUniformLocation | null>) => {
        gl.useProgram(p)
        gl.uniform1i(l.uLinhas!, 0)
        gl.uniformMatrix4fv(l.uVP!, false, VP)
        gl.uniform3f(l.uCam!, olho[0], olho[1], olho[2])
        gl.uniform2f(l.uRes!, W, H)
        gl.uniform2f(l.uPtr!, spx, spy)
        gl.uniform1f(l.uPtrR!, Math.min(130, H * 0.15))
        gl.uniform1f(l.uPres!, op.calmo ? 0 : pres)
        gl.uniform1f(l.uTempo!, tempo)
        gl.uniform1f(l.uEntrada!, entrada)
        gl.uniform1f(l.uOnda!, onda)
        gl.uniform1f(l.uOndaForca!, ondaForca)
      }
      usar(pLinha, L.linha)
      gl.uniform1f(L.linha.uOpac!, 0.15)
      gl.uniform1f(L.linha.uPerto!, op.leve ? 0.4 : 0.5)
      gl.bindVertexArray(vaoLinha)
      gl.drawArrays(gl.LINES, 0, m)
      usar(pPart, L.part)
      gl.uniform1f(L.part.uFluxo!, op.calmo ? P.fluxo * 0.3 : P.fluxo)
      gl.uniform1f(L.part.uProj!, proj)
      gl.bindVertexArray(vaoPart)
      gl.drawArrays(gl.POINTS, 0, total)
      usar(pLuz, L.luz)
      gl.uniform1f(L.luz.uProj!, proj)
      gl.bindVertexArray(vaoLuz)
      gl.drawArrays(gl.POINTS, 0, k)
      gl.bindVertexArray(null)
    },
    destruir() {
      for (const p of [pPart, pLinha, pLuz, pCeu]) gl.deleteProgram(p)
      gl.deleteTexture(tex)
      for (const v of [vaoPart, vaoLinha, vaoLuz, vaoCeu]) gl.deleteVertexArray(v)
      for (const b of buffers) gl.deleteBuffer(b)
    },
  }
}
