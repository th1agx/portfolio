// Gera as imagens do README no tema do site: o banner animado (docs/readme/banner.svg) e o diagrama da arquitetura
// (docs/readme/arquitetura.svg). A fonte do site (Cabinet Grotesk) e o retrato vão embutidos, porque o GitHub mostra o SVG como
// imagem e não carrega nada de fora. Tudo é CSS e SMIL dentro do SVG: sem script, que o GitHub bloqueia.
//
//   node tools/readme-svg.mjs        (usa o `sharp`, que já vem com o Next)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const SAIDA = join(RAIZ, 'docs', 'readme')
mkdirSync(SAIDA, { recursive: true })

const FUNDO = '#02031a'
const AZUL = '#000080'
const VIVO = '#0000f0'
const GELO = '#e8edf5'
const CLARO = '#8fb0ff'

const fonte = (peso) => {
  const b64 = readFileSync(join(RAIZ, 'src', 'app', 'fontes', `cabinet-grotesk-${peso}.woff2`)).toString('base64')
  return `@font-face{font-family:'Cabinet';font-weight:${peso};src:url(data:font/woff2;base64,${b64}) format('woff2');}`
}

// gerador pseudoaleatório com semente (para o banner sair igual a cada execução)
const sorteio = (semente) => {
  let a = semente >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const estrelas = (n, w, h, semente) => {
  const r = sorteio(semente)
  let s = ''
  for (let i = 0; i < n; i++) {
    const x = r() * w
    const y = r() * h
    const raio = [0.6, 0.8, 1.0, 1.0, 1.3, 1.8][Math.floor(r() * 6)]
    const dur = 2.2 + r() * 3.3
    const atraso = r() * 5
    const cor = r() > 0.35 ? GELO : CLARO
    s += `<circle class="e" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${raio}" fill="${cor}" style="animation-duration:${dur.toFixed(2)}s;animation-delay:-${atraso.toFixed(2)}s"/>`
  }
  return s
}

// ---------- curvas de nível: o relevo do fundo do site, em marching squares sobre um ruído suave ----------
const ruido = (semente) => {
  const r = sorteio(semente)
  const tabela = Array.from({ length: 256 * 256 }, () => r())
  const v = (i, j) => tabela[((j & 255) << 8) | (i & 255)]
  const suave = (t) => t * t * (3 - 2 * t)
  const base = (x, y) => {
    const i = Math.floor(x)
    const j = Math.floor(y)
    const fx = suave(x - i)
    const fy = suave(y - j)
    return (v(i, j) * (1 - fx) + v(i + 1, j) * fx) * (1 - fy) + (v(i, j + 1) * (1 - fx) + v(i + 1, j + 1) * fx) * fy
  }
  return (x, y) => base(x, y) * 0.55 + base(x * 2.1 + 7, y * 2.1 + 3) * 0.3 + base(x * 4.3 + 11, y * 4.3 + 5) * 0.15
}

function curvasDeNivel(w, h, niveis, semente) {
  const f = ruido(semente)
  const celula = 7
  const cols = Math.ceil(w / celula) + 1
  const lins = Math.ceil(h / celula) + 1
  const campo = []
  for (let j = 0; j < lins; j++) {
    const linha = []
    for (let i = 0; i < cols; i++) {
      // o relevo sobe para o lado do retrato: as curvas se apertam em volta dele
      const x = i * celula
      const y = j * celula
      const dx = (x - w * 0.74) / w
      const dy = (y - h * 0.55) / h
      const morro = Math.exp(-(dx * dx * 5.5 + dy * dy * 3.2))
      linha.push(f(x * 0.0042, y * 0.0042) * 0.62 + morro * 0.5)
    }
    campo.push(linha)
  }
  return niveis.map((nivel) => {
    let d = ''
    const cruza = (a, b) => (nivel - a) / (b - a)
    for (let j = 0; j < lins - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const a = campo[j][i]
        const b = campo[j][i + 1]
        const c = campo[j + 1][i + 1]
        const dd = campo[j + 1][i]
        const x = i * celula
        const y = j * celula
        const caso = (a > nivel ? 8 : 0) | (b > nivel ? 4 : 0) | (c > nivel ? 2 : 0) | (dd > nivel ? 1 : 0)
        if (caso === 0 || caso === 15) continue
        const topo = [x + cruza(a, b) * celula, y]
        const dir = [x + celula, y + cruza(b, c) * celula]
        const base = [x + cruza(dd, c) * celula, y + celula]
        const esq = [x, y + cruza(a, dd) * celula]
        const seg = (p, q) => {
          d += `M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`
        }
        switch (caso) {
          case 1: case 14: seg(esq, base); break
          case 2: case 13: seg(base, dir); break
          case 3: case 12: seg(esq, dir); break
          case 4: case 11: seg(topo, dir); break
          case 5: seg(topo, esq); seg(base, dir); break
          case 6: case 9: seg(topo, base); break
          case 7: case 8: seg(topo, esq); break
          case 10: seg(topo, dir); seg(esq, base); break
        }
      }
    }
    return d
  })
}

// ---------- o retrato: humano, robô e as curvas de nível, com os ombros dissolvidos como no shader do site ----------
const suavizar = (a, b, x) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return k * k * (3 - 2 * k)
}

const png = async (rgba, w, h, paleta = false) => (await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).png(paleta ? { compressionLevel: 9, palette: true, colours: 16 } : { compressionLevel: 9 }).toBuffer()).toString('base64')

async function retrato(largura) {
  const alt = Math.round((largura * 1448) / 1086)
  const pasta = join(RAIZ, 'public', 'retrato')
  const pixels = (arquivo) => sharp(join(pasta, arquivo)).resize(largura, alt, { fit: 'fill' }).ensureAlpha().raw().toBuffer()
  const mascara = new Uint8Array(largura * alt)
  for (let y = 0; y < alt; y++) {
    const fy = 1 - y / alt
    for (let x = 0; x < largura; x++) {
      const fx = x / largura
      mascara[y * largura + x] = Math.round(255 * suavizar(0.02, 0.22, fx) * suavizar(0.98, 0.78, fx) * suavizar(0.0, 0.22, fy))
    }
  }
  const comMascara = async (arquivo) => {
    const p = await pixels(arquivo)
    for (let i = 0; i < largura * alt; i++) p[i * 4 + 3] = Math.round((p[i * 4 + 3] * mascara[i]) / 255)
    return p
  }
  const humano = await comMascara('humano.webp')
  const robo = await comMascara('robo.webp')
  // curvas de nível: cortes da silhueta desfocada (aura.png) em vários níveis, cada um vira um traço fino
  const aura = await sharp(join(pasta, 'aura.png')).resize(largura, alt, { fit: 'fill' }).greyscale().blur(2).raw().toBuffer()
  const aneis = []
  for (const nivel of [2, 5, 9, 15, 23, 34, 50, 72]) {
    const corte = new Uint8Array(largura * alt)
    for (let i = 0; i < largura * alt; i++) corte[i] = aura[i] > nivel ? 1 : 0
    const borda = new Uint8Array(largura * alt)
    for (let y = 1; y < alt - 1; y++)
      for (let x = 1; x < largura - 1; x++) {
        const i = y * largura + x
        if (corte[i] !== corte[i - 1] || corte[i] !== corte[i + 1] || corte[i] !== corte[i - largura] || corte[i] !== corte[i + largura]) borda[i] = 1
      }
    const grossa = new Uint8Array(largura * alt)
    for (let y = 1; y < alt - 1; y++)
      for (let x = 1; x < largura - 1; x++) {
        const i = y * largura + x
        if (borda[i] || borda[i - 1] || borda[i + 1] || borda[i - largura] || borda[i + largura]) grossa[i] = 1
      }
    const traco = new Uint8Array(largura * alt * 4)
    for (let i = 0; i < largura * alt; i++) {
      traco[i * 4] = 232
      traco[i * 4 + 1] = 237
      traco[i * 4 + 2] = 245
      traco[i * 4 + 3] = grossa[i] ? Math.round(Math.min(255, mascara[i] * 2) * 0.75) : 0
    }
    aneis.push(traco)
  }
  return { humano, robo, aneis, largura, alt }
}

async function banner() {
  const w = 1280
  const h = 560
  const larg = 420
  const r = await retrato(larg)
  const rx = 790
  const ry = h - r.alt + 10
  const alt = r.alt
  // a mancha que revela o robô: bolhas que passeiam pelo rosto e se fundem (desfoque + corte de alfa)
  const sort = sorteio(3)
  const em = (a, b) => a + sort() * (b - a)
  const bolhas = []
  for (let i = 0; i < 5; i++) {
    const cxs = Array.from({ length: 5 }, () => (rx + larg * em(0.25, 0.78)).toFixed(0))
    const cys = Array.from({ length: 5 }, () => (ry + alt * em(0.16, 0.62)).toFixed(0))
    const rs = Array.from({ length: 5 }, () => em(16, 42).toFixed(0))
    const dur = em(9, 14)
    const splines = Array(5).fill('.45 0 .55 1').join(';')
    bolhas.push(
      `<circle fill="#fff"><animate attributeName="cx" values="${cxs.join(';')};${cxs[0]}" dur="${dur.toFixed(1)}s" repeatCount="indefinite" calcMode="spline" keySplines="${splines}"/><animate attributeName="cy" values="${cys.join(';')};${cys[0]}" dur="${dur.toFixed(1)}s" repeatCount="indefinite" calcMode="spline" keySplines="${splines}"/><animate attributeName="r" values="${rs.join(';')};${rs[0]}" dur="${(dur * 0.8).toFixed(1)}s" repeatCount="indefinite"/></circle>`,
    )
  }
  let aneisSvg = ''
  for (let i = 0; i < r.aneis.length; i++) aneisSvg += `<image class="anel" style="animation-delay:-${(i * 0.42).toFixed(2)}s" href="data:image/png;base64,${await png(r.aneis[i], larg, alt, true)}" x="${rx}" y="${ry}" width="${larg}" height="${alt}"/>`
  const webp = async (rgba) => (await sharp(rgba, { raw: { width: larg, height: alt, channels: 4 } }).webp({ quality: 90, alphaQuality: 92 }).toBuffer()).toString('base64')
  const humanoB64 = await webp(r.humano)
  const roboB64 = await webp(r.robo)

  // o relevo do fundo: 15 curvas de nível, a cada quarta mais clara; cada uma respira em um tempo (a onda corre pelo relevo)
  const niveis = Array.from({ length: 15 }, (_, i) => 0.2 + i * 0.037)
  const curvas = curvasDeNivel(w, h, niveis, 11)
  const relevo = curvas
    .map((d, i) => `<path class="nivel" d="${d}" fill="none" stroke="${i % 4 === 0 ? '#c9d6ff' : CLARO}" stroke-width="${i % 4 === 0 ? 1.15 : 0.8}" style="animation-delay:-${(i * 0.55).toFixed(2)}s;animation-duration:${(7 + (i % 3)).toFixed(1)}s"/>`)
    .join('')
  // matriz de pontos, como a dos projetos (só no terço de baixo e à esquerda, onde o fundo estava vazio)
  let pontos = ''
  for (let y = 18; y < h; y += 26) for (let x = 18; x < w; x += 26) pontos += `<rect x="${x}" y="${y}" width="1.6" height="1.6"/>`
  // riscos de velocidade, como os dos projetos: finos, na diagonal, passando devagar
  const sr = sorteio(21)
  let riscos = ''
  for (let i = 0; i < 16; i++) {
    const x = sr() * w
    const y = sr() * h
    const c = 60 + sr() * 150
    riscos += `<line class="risco" x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x + c * 0.62).toFixed(0)}" y2="${(y - c * 0.78).toFixed(0)}" style="animation-duration:${(5 + sr() * 5).toFixed(1)}s;animation-delay:-${(sr() * 8).toFixed(1)}s"/>`
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
<style>${fonte(800)}${fonte(500)}
.e{animation-name:pisca;animation-iteration-count:infinite;animation-timing-function:ease-in-out}
@keyframes pisca{0%,100%{opacity:.25}50%{opacity:1}}
.titulo{font-family:'Cabinet',sans-serif;font-weight:800;letter-spacing:-0.035em;fill:${GELO}}
.sub{font-family:'Cabinet',sans-serif;font-weight:500;fill:#c9d2ff}
.linha1,.linha2{clip-path:inset(0 100% 0 0);animation:abre 1s cubic-bezier(.215,.61,.355,1) .2s forwards}
.linha2{animation-delay:.38s}
.bloco1,.bloco2{transform-box:fill-box;transform-origin:right center;animation:encolhe .8s cubic-bezier(.455,.03,.515,.955) .65s forwards}
.bloco2{animation-delay:.83s}
.sub{opacity:0;animation:sobe 1s ease 1.1s forwards}
.foto{opacity:0;animation:surge 1.6s cubic-bezier(.19,1,.22,1) .1s forwards}
.anel{animation:onda 3.4s ease-in-out infinite}
.nivel{opacity:.1;animation:respira 8s ease-in-out infinite}
.risco{stroke:#c9d6ff;stroke-width:1;stroke-linecap:round;opacity:0;animation:passa 6s linear infinite}
@keyframes abre{to{clip-path:inset(0 -2% 0 0)}}
@keyframes encolhe{to{transform:scaleX(0)}}
@keyframes sobe{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes surge{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}
@keyframes onda{0%,100%{opacity:.15}50%{opacity:.9}}
@keyframes respira{0%,100%{opacity:.07}50%{opacity:.34}}
@keyframes passa{0%{opacity:0;transform:translate(0,0)}15%{opacity:.5}60%{opacity:.35}100%{opacity:0;transform:translate(70px,-88px)}}
</style>
<filter id="liquido" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="16"/><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -10"/></filter>
<mask id="revela" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}"><g filter="url(#liquido)">${bolhas.join('')}</g></mask>
<clipPath id="canto"><rect width="${w}" height="${h}" rx="22"/></clipPath>
<radialGradient id="luzRetrato" cx="${((rx + larg * 0.52) / w).toFixed(3)}" cy="${((ry + alt * 0.4) / h).toFixed(3)}" r="0.52" gradientTransform="translate(${(rx + larg * 0.52) / w} ${(ry + alt * 0.4) / h}) scale(1 0.62) translate(-${(rx + larg * 0.52) / w} -${(ry + alt * 0.4) / h})">
<stop offset="0" stop-color="#3a3aff" stop-opacity=".62"/><stop offset=".35" stop-color="#1010d8" stop-opacity=".32"/><stop offset="1" stop-color="${AZUL}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="vinheta" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#00004a" stop-opacity="0"/><stop offset="1" stop-color="#00003a" stop-opacity=".85"/></radialGradient>
<linearGradient id="piso" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#00003a" stop-opacity="0"/><stop offset="1" stop-color="#00002e" stop-opacity=".7"/></linearGradient>
</defs>
<g clip-path="url(#canto)">
<rect width="${w}" height="${h}" fill="${AZUL}"/>
<rect width="${w}" height="${h}" fill="url(#luzRetrato)"/>
<g fill="#9fb4ff" opacity=".16">${pontos}</g>
<g>${relevo}</g>
<rect width="${w}" height="${h}" fill="url(#vinheta)"/>
<rect y="${h * 0.62}" width="${w}" height="${h * 0.38}" fill="url(#piso)"/>
${estrelas(80, w, h, 7)}
<g>${riscos}</g>
<g class="foto">
${aneisSvg}
<image href="data:image/webp;base64,${humanoB64}" x="${rx}" y="${ry}" width="${larg}" height="${alt}"/>
<image href="data:image/webp;base64,${roboB64}" x="${rx}" y="${ry}" width="${larg}" height="${alt}" mask="url(#revela)"/>
</g>
<g transform="translate(72 0)">
<g class="linha1"><text class="titulo" x="0" y="232" font-size="116">Thiago</text><rect class="bloco1" x="-4" y="136" width="330" height="116" fill="${VIVO}"/></g>
<g class="linha2"><text class="titulo" x="0" y="348" font-size="116">Antunes</text><rect class="bloco2" x="-4" y="252" width="414" height="116" fill="${VIVO}"/></g>
<text class="sub" x="2" y="404" font-size="25">Engenheiro de software</text>
</g>
</g>
</svg>`
  writeFileSync(join(SAIDA, 'banner.svg'), svg)
}

// ---------- o diagrama da arquitetura ----------
function arquitetura() {
  const W = 1200
  const H = 780
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  let defs = ''
  let corpo = ''
  const faixa = (y, alto, titulo) => {
    corpo += `<rect x="30" y="${y}" width="${W - 60}" height="${alto}" rx="18" fill="#000080" fill-opacity=".16" stroke="#8fb0ff" stroke-opacity=".22"/>`
    corpo += `<text class="rotulo" x="56" y="${y + 34}">${esc(titulo)}</text>`
  }
  const cartao = (x, y, w, h, titulo, linhas) => {
    corpo += `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="url(#cartao)" stroke="${VIVO}" stroke-width="1.5"/>`
    corpo += `<rect x="${x}" y="${y + 14}" width="5" height="${h - 28}" rx="2.5" fill="${VIVO}"/>`
    const total = 1 + linhas.length
    const topo = y + h / 2 - (total * 22) / 2 + 17
    corpo += `<text class="t" x="${x + 24}" y="${topo}">${esc(titulo)}</text>`
    linhas.forEach((l, i) => (corpo += `<text class="s" x="${x + 24}" y="${topo + 24 + i * 21}">${esc(l)}</text>`))
    corpo += `</g>`
  }
  let n = 0
  // seta: caminho, com a ponta e o fluxo de pontos correndo por cima
  const seta = (d, { tracejada = false, rotulo, rx, ry } = {}) => {
    const id = `c${n++}`
    corpo += `<path id="${id}" d="${d}" fill="none" stroke="${CLARO}" stroke-opacity=".55" stroke-width="2" ${tracejada ? 'stroke-dasharray="3 6"' : ''} marker-end="url(#ponta)"/>`
    if (!tracejada) corpo += `<path d="${d}" fill="none" stroke="#dfe6ff" stroke-width="2.4" stroke-linecap="round" class="fluxo"/>`
    if (rotulo) {
      const larg = rotulo.length * 7.4 + 22
      corpo += `<rect x="${rx - larg / 2}" y="${ry - 14}" width="${larg}" height="26" rx="13" fill="${FUNDO}" stroke="#8fb0ff" stroke-opacity=".35"/><text class="r" x="${rx}" y="${ry + 4}" text-anchor="middle">${esc(rotulo)}</text>`
    }
  }

  // faixa 1: a página
  faixa(36, 160, 'A PÁGINA · DOM')
  const c1 = [90, 450, 810]
  cartao(c1[0], 78, 290, 92, 'Rolagem', ['Lenis + ScrollTrigger'])
  cartao(c1[1], 78, 290, 92, 'Seções', ['Heroi · Ideia · Projetos', 'Trajetoria'])
  cartao(c1[2], 78, 290, 92, 'Temas', ['a cor do html acompanha', 'a rolagem, quadro a quadro'])
  seta(`M${c1[0] + 290} 124 L${c1[1] - 6} 124`)
  seta(`M${c1[1] + 290} 124 L${c1[2] - 6} 124`)

  // faixa 2: as cenas
  faixa(222, 270, 'AS CENAS · PLACA DE VÍDEO')
  cartao(c1[0], 312, 290, 112, 'Fila', ['monta uma cena por vez,', 'quando o visitante para'])
  cartao(c1[1], 312, 290, 112, 'Cenas WebGL', ['Retrato · lua · Obras', 'ateAqui · Tunel'])
  cartao(c1[2], 312, 290, 112, 'Precompilar', ['shaders e texturas prontos', 'antes de aparecer'])
  seta(`M${c1[0] + 290} 368 L${c1[1] - 6} 368`)
  seta(`M${c1[1] + 290} 368 L${c1[2] - 6} 368`)
  // a volta: pronta -> fila
  seta(`M${c1[2] + 145} 430 C${c1[2] + 145} 486 ${c1[0] + 145} 486 ${c1[0] + 145} 430`, { rotulo: 'pronta', rx: 600, ry: 470 })
  // contexto perdido: a cena se refaz
  corpo += `<rect x="${c1[1] + 20}" y="248" width="250" height="38" rx="19" fill="${FUNDO}" stroke="#8fb0ff" stroke-opacity=".45" stroke-dasharray="3 5"/><text class="r" x="${c1[1] + 145}" y="272" text-anchor="middle">contexto perdido → a cena se refaz</text>`
  seta(`M${c1[1] + 145} 288 L${c1[1] + 145} 306`, { tracejada: true })

  // faixa 3: cenas que conversam, sem acoplamento
  faixa(518, 232, 'CENAS QUE CONVERSAM · SEM ACOPLAMENTO')
  const par = (x, y, a, b, rotulo, detalhe) => {
    cartao(x, y, 200, 74, a[0], [a[1]])
    cartao(x + 340, y, 200, 74, b[0], [b[1]])
    seta(`M${x + 200} ${y + 37} L${x + 334} ${y + 37}`, { rotulo, rx: x + 270, ry: y + 37 })
    corpo += `<text class="d" x="${x + 270}" y="${y + 70}" text-anchor="middle">${esc(detalhe)}</text>`
  }
  par(70, 566, ['Obras', 'vista de cima'], ['ateAqui', 'a linha continua'], 'trilhaTela', 'onde a linha está')
  par(590, 566, ['Worker', 'íris da abertura'], ['Retrato', 'mesma fase'], 'tempoGlobal', 'o mesmo relógio')
  par(70, 662, ['Página', 'raio do furo'], ['Tunel', 'câmera na boca'], 'bocaTela', 'a borda é a boca')
  par(590, 662, ['Tunel', 'onde o robô está'], ['Guia', 'robô por baixo'], 'roboBoca', 'troca sem salto')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
<style>${fonte(800)}${fonte(500)}
.rotulo{font-family:'Cabinet',sans-serif;font-weight:800;font-size:14px;letter-spacing:.14em;fill:${CLARO}}
.t{font-family:'Cabinet',sans-serif;font-weight:800;font-size:22px;letter-spacing:-.01em;fill:${GELO}}
.s{font-family:'Cabinet',sans-serif;font-weight:500;font-size:15px;fill:#c9d2ff}
.r{font-family:'Cabinet',sans-serif;font-weight:800;font-size:13px;fill:#dfe6ff}
.d{font-family:'Cabinet',sans-serif;font-weight:500;font-size:13px;fill:${CLARO};opacity:.85}
.fluxo{stroke-dasharray:2 14;animation:corre 1.3s linear infinite}
@keyframes corre{to{stroke-dashoffset:-16}}
</style>
<linearGradient id="cartao" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0a0aa8"/><stop offset="1" stop-color="#02031f"/></linearGradient>
<linearGradient id="fundoGeral" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03043a"/><stop offset="1" stop-color="${FUNDO}"/></linearGradient>
<marker id="ponta" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1.5 L10 6 L1 10.5 Z" fill="${CLARO}"/></marker>
<clipPath id="canto"><rect width="${W}" height="${H}" rx="22"/></clipPath>
</defs>
<g clip-path="url(#canto)">
<rect width="${W}" height="${H}" fill="url(#fundoGeral)"/>
${corpo}
</g>
</svg>`
  writeFileSync(join(SAIDA, 'arquitetura.svg'), svg)
}

await banner()
arquitetura()
console.log('ok: docs/readme/banner.svg e docs/readme/arquitetura.svg')
