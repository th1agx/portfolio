// Gera as capas dos projetos em inglês (public/projetos/<id>-en.jpg) a partir das capas em português.
//
// Cada texto em português vira um retângulo da cor do fundo (a média dos pixels do contorno dele) com o texto em inglês por cima, na mesma
// posição e no mesmo tamanho, desenhado pelo Chrome com a fonte do site. O resto da imagem (gráficos, painéis) fica igual.
//   node tools/capas-en.mjs            gera todas
//   node tools/capas-en.mjs tributax   gera só uma
//
// As capas do English Learning são capturas do site real do CEFF, que é em português: ficam como estão. A do Portfólio não tem texto.
import { chromium } from 'playwright-core'
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const capasDir = path.join(raiz, 'public', 'projetos')
const fonteSans = fs.readFileSync(path.join(raiz, 'tools', 'fontes', 'inter-tight.woff2')).toString('base64')

// x, y, w, h: o retângulo que cobre o texto antigo (px da imagem de 2048 × 1536); t: o texto novo (aceita HTML para trechos de outra cor);
// s: tamanho; p: peso; c: cor ('auto' pega a cor do pixel mais contrastante do texto antigo); a: alinhamento (l, c, r); m: família
// (sans ou mono); l: espaçamento entre letras (em); dx: recuo do texto (à esquerda; no alinhamento à direita, à direita);
// raw: HTML solto por cima (para refazer um traço que o retângulo cortou)
const C = 'auto'
const PAINEL = (x, y, w, t, o = {}) => ({ x, y, w, h: 36, t, s: 25, p: 400, c: C, l: 0.01, dx: 8, ...o })
const CAPAS = {
  tributax: [
    { x: 60, y: 70, w: 1180, h: 100, t: 'How much tax is on this sale?', s: 77, p: 700, c: '#eceefa', l: -0.02, dx: 17 },
    { x: 60, y: 173, w: 1340, h: 44, t: 'Laptop priced R$ 3,500, from MG to SP, to the final consumer. Each tax with its amount, rule and law.', s: 30, p: 400, c: '#a3a9c0', l: 0.006, dx: 17 },
    { x: 780, y: 256, w: 190, h: 40, t: 'Tax', s: 22, p: 500, c: '#a0a6bd', l: 0.012, dx: 9 },
    { x: 970, y: 256, w: 150, h: 40, t: 'Result', s: 22, p: 500, c: '#a0a6bd', l: 0.012, dx: 8 },
    { x: 1124, y: 256, w: 150, h: 40, t: 'Amount', s: 22, p: 500, c: '#a0a6bd', l: 0.012, dx: 7 },
    { x: 1446, y: 256, w: 300, h: 40, t: 'Legal basis', s: 22, p: 500, c: '#a0a6bd', l: 0.012, dx: 7 },
    { x: 1446, y: 503, w: 300, h: 44, t: 'Law 10.637/02', s: 27, p: 430, c: '#f4f6ff', l: 0.012, dx: 7 },
    { x: 1446, y: 589, w: 300, h: 44, t: 'Law 10.833/03', s: 27, p: 430, c: '#f4f6ff', l: 0.012, dx: 7 },
    { x: 1104, y: 872, w: 288, h: 36, t: 'trace of every tax', s: 22, p: 400, c: '#b0b5cc', l: 0.012, a: 'c' },
  ],
  mneme: [
    // a barra do topo
    { x: 1540, y: 44, w: 124, h: 52, t: '+2.84%', s: 27, p: 500, c: C, dx: 8 },
    { x: 1676, y: 44, w: 330, h: 52, t: 'regime: uptrend', s: 26, p: 400, c: C, dx: 6 },
    // os dois cartões de cima
    { x: 1498, y: 179, w: 360, h: 36, t: 'Upside probability (LightGBM)', s: 21, p: 500, c: C, l: 0.01, dx: 8 },
    { x: 1498, y: 218, w: 320, h: 74, t: '0.64', s: 53, p: 700, c: C, l: -0.01, dx: 8 },
    { x: 1498, y: 383, w: 300, h: 34, t: 'Estimated volatility', s: 21, p: 500, c: C, l: 0.01, dx: 8 },
    { x: 1498, y: 420, w: 320, h: 74, t: '1.9%', s: 53, p: 700, c: C, l: -0.01, dx: 8 },
    // limites do motor de risco
    PAINEL(1498, 634, 420, 'Risk per trade'),
    PAINEL(1498, 680, 420, 'Max daily loss'),
    PAINEL(1498, 724, 420, 'Open exposure'),
    PAINEL(1498, 770, 420, 'Mode'),
    PAINEL(1856, 634, 106, '0.5%', { a: 'r', dx: 6 }),
    PAINEL(1856, 680, 106, '2.0%', { a: 'r', dx: 6 }),
    PAINEL(1856, 724, 106, '1 of 3', { a: 'r', dx: 6 }),
    PAINEL(1812, 770, 150, 'simulated', { a: 'r', dx: 6 }),
    // sinais medidos
    { x: 1498, y: 884, w: 300, h: 36, t: 'Measured signals', s: 21, p: 500, c: C, l: 0.01, dx: 8 },
    PAINEL(1498, 932, 300, 'Buy 182.40'),
    PAINEL(1498, 978, 300, 'Sell 186.10'),
    PAINEL(1498, 1024, 300, 'Buy 179.95'),
    PAINEL(1498, 1070, 300, 'Buy 184.20'),
    PAINEL(1836, 932, 126, '+1.2%', { a: 'r', dx: 6 }),
    PAINEL(1836, 978, 126, '+0.7%', { a: 'r', dx: 6 }),
    PAINEL(1836, 1024, 126, '−0.4%', { a: 'r', dx: 6 }),
    PAINEL(1836, 1070, 126, '+0.9%', { a: 'r', dx: 6 }),
  ],
  devguard: [
    // as etapas
    ...[
      ['Map', 90],
      ['Specify', 410],
      ['Plan', 730],
      ['Build', 1050],
      ['Test', 1370],
      ['Review', 1690],
    ].map(([t, x]) => ({ x, y: 128, w: 270, h: 44, t, s: 33, p: 700, c: C, l: -0.005, dx: 5 })),
    // o terminal (a fonte original é monoespaçada de 0,6 em por letra; a Consolas tem 0,55, o espaçamento completa)
    { x: 108, y: 417, w: 1100, h: 36, t: 'map saved to .devguard/map.md (148 files, 12 modules)', s: 27, p: 400, c: C, m: 'mono', l: 0.05, dx: 7, a: 'l' },
    { x: 205, y: 463, w: 760, h: 40, t: '.devguard/specs/period-filter.md', s: 27, p: 400, c: C, m: 'mono', l: 0.05, dx: 7 },
    { x: 205, y: 509, w: 760, h: 40, t: '3 steps · scope: src/reports/*', s: 27, p: 400, c: C, m: 'mono', l: 0.05, dx: 7 },
    { x: 140, y: 600, w: 600, h: 40, t: '42 unit tests passed', s: 27, p: 400, c: C, m: 'mono', l: 0.05, dx: 7 },
    { x: 140, y: 692, w: 860, h: 40, t: 'GET /reports?from=2026-01-01    200   38 ms', s: 27, p: 400, c: C, m: 'mono', l: 0.05, dx: 7 },
    { x: 140, y: 737, w: 860, h: 40, t: 'GET /reports?to=2026-02-01      200   41 ms', s: 27, p: 400, c: C, m: 'mono', l: 0.05, dx: 7 },
    { x: 140, y: 829, w: 900, h: 40, t: 'p95 112 ms · 0 errors in 1,500 requests', s: 27, p: 400, c: C, m: 'mono', l: 0.05, dx: 7 },
    { x: 225, y: 874, w: 900, h: 40, t: 'diff: 4 files, +86 -12, nothing out of scope', s: 27, p: 400, c: C, m: 'mono', l: 0.05, dx: 7 },
    { x: 110, y: 920, w: 1100, h: 40, t: '<span style="color:#5bd6a0">delivered with evidence:</span> .devguard/reports/period-filter.md', s: 27, p: 400, c: '#d3d7ec', m: 'mono', l: 0.05, dx: 6 },
  ],
  forza: [
    { x: 82, y: 178, w: 480, h: 44, t: 'race 37 of 60 · automatic restart', s: 26, p: 400, c: C, l: 0.01, dx: 8 },
    { x: 1700, y: 76, w: 262, h: 40, t: 'race time', s: 24, p: 400, c: C, a: 'r', dx: 5 },
    { x: 1740, y: 112, w: 222, h: 70, t: '02:14.6', s: 58, p: 700, c: C, l: -0.01, a: 'r', dx: 5 },
    {
      x: 1530,
      y: 1408,
      w: 432,
      h: 42,
      t: 'km/h · automatic throttle',
      s: 30,
      p: 400,
      c: '#b0b5c3',
      l: 0.005,
      a: 'r',
      dx: 5,
      // o retângulo cobria a borda azul da estrada (que passa por trás do texto): por baixo dele o fundo é refeito, painel à esquerda da
      // borda, preto à direita, com a borda por cima
      bg: 'transparent',
      antes:
        '<svg style="position:absolute;left:0;top:0" width="2048" height="1536"><polygon points="1530,1404 1803,1404 1858,1456 1530,1456" fill="rgb(10,15,37)"/><polygon points="1803,1404 1962,1404 1962,1456 1858,1456" fill="rgb(0,1,3)"/><line x1="1795.5" y1="1400" x2="1860" y2="1461" stroke="#4a7ff0" stroke-width="3.6"/></svg>',
    },
    { x: 118, y: 1302, w: 330, h: 34, t: 'time.sleep(duration)', s: 24, p: 400, c: C, m: 'mono', l: 0.06, dx: 7 },
    { x: 118, y: 1380, w: 330, h: 34, t: 'restart_race()', s: 24, p: 400, c: C, m: 'mono', l: 0.06, dx: 7 },
  ],
}

// a média dos pixels do contorno do retângulo (1 px por fora): a cor do fundo ali
const contorno = (px, W, x, y, w, h) => {
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  const ponto = (i, j) => {
    if (i < 0 || j < 0 || i >= W) return
    const k = (j * W + i) * 3
    r += px[k]
    g += px[k + 1]
    b += px[k + 2]
    n++
  }
  for (let i = x - 1; i <= x + w; i++) {
    ponto(i, y - 1)
    ponto(i, y + h)
  }
  for (let j = y; j < y + h; j++) {
    ponto(x - 1, j)
    ponto(x + w, j)
  }
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)]
}
// a cor do texto antigo: o pixel do retângulo que mais se afasta do fundo
const corDoTexto = (px, W, x, y, w, h, fundo) => {
  let melhor = 0
  let cor = [255, 255, 255]
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) {
      const k = (j * W + i) * 3
      const d = Math.abs(px[k] - fundo[0]) + Math.abs(px[k + 1] - fundo[1]) + Math.abs(px[k + 2] - fundo[2])
      if (d > melhor) {
        melhor = d
        cor = [px[k], px[k + 1], px[k + 2]]
      }
    }
  return `rgb(${cor.join(',')})`
}

const quais = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CAPAS)
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch())
for (const id of quais) {
  const itens = CAPAS[id]
  if (!itens) throw new Error(`capa desconhecida: ${id}`)
  const origem = path.join(capasDir, `${id}.jpg`)
  const { data, info } = await sharp(origem).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const cobertas = itens
    .map((it) => {
      const fundo = contorno(data, info.width, it.x, it.y, it.w, it.h)
      const cor = it.c === 'auto' ? corDoTexto(data, info.width, it.x, it.y, it.w, it.h, fundo) : it.c
      const just = it.a === 'c' ? 'center' : it.a === 'r' ? 'flex-end' : 'flex-start'
      const fam = it.m === 'mono' ? "'Consolas', 'Courier New', monospace" : "'Inter Tight', sans-serif"
      const recuo = it.a === 'r' ? `padding-right:${it.dx ?? 0}px` : `padding-left:${it.dx ?? 0}px`
      return `${it.antes ?? ''}<div style="position:absolute;left:${it.x}px;top:${it.y}px;width:${it.w}px;height:${it.h}px;background:${it.bg ?? `rgb(${fundo.join(',')})`};display:flex;align-items:center;justify-content:${just};white-space:pre;overflow:hidden;font-family:${fam};font-size:${it.s}px;font-weight:${it.p};color:${cor};letter-spacing:${it.l ?? 0}em;${recuo};box-sizing:border-box">${it.t}</div>${it.raw ?? ''}`
    })
    .join('\n')
  const html = `<!doctype html><meta charset="utf-8"><style>@font-face{font-family:'Inter Tight';src:url(data:font/woff2;base64,${fonteSans}) format('woff2');font-weight:100 900}body{margin:0;background:#000}#c{position:relative;width:${info.width}px;height:${info.height}px}img{display:block}</style><div id="c"><img src="data:image/jpeg;base64,${fs.readFileSync(origem).toString('base64')}">${cobertas}</div>`
  const tmp = path.join(os.tmpdir(), `capa-${id}.html`)
  fs.writeFileSync(tmp, html)
  const page = await browser.newPage({ viewport: { width: info.width, height: info.height }, deviceScaleFactor: 1 })
  await page.goto('file:///' + tmp.replace(/\\/g, '/'))
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
  const destino = path.join(capasDir, `${id}-en.jpg`)
  const png = await page.locator('#c').screenshot({ type: 'png' })
  await sharp(png).jpeg({ quality: 92, mozjpeg: true }).toFile(destino)
  await page.close()
  console.log('gerada', path.relative(raiz, destino))
}
await browser.close()
