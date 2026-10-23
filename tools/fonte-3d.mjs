// Converte TTF em typeface JSON (formato do FontLoader do three) para os símbolos 3D do topo.
// Mesma conversão do TTFLoader do three, sem depender de CDN. Uso: node tools/fonte-3d.mjs <entrada.ttf> <saida.json>
import fs from 'node:fs'
import opentype from 'opentype.js'

const [, , entrada, saida] = process.argv
const bytes = fs.readFileSync(entrada)
const font = opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
const round = Math.round
const scale = 100000 / ((font.unitsPerEm || 2048) * 72)
const glyphs = {}
const map = font.encoding.cmap.glyphIndexMap
for (const unicode of Object.keys(map)) {
  const glyph = font.glyphs.get(map[unicode])
  const token = { ha: round(glyph.advanceWidth * scale), x_min: round(glyph.xMin * scale), x_max: round(glyph.xMax * scale), o: '' }
  for (const c of glyph.path.commands) {
    token.o += (c.type.toLowerCase() === 'c' ? 'b' : c.type.toLowerCase()) + ' '
    if (c.x !== undefined) token.o += round(c.x * scale) + ' ' + round(c.y * scale) + ' '
    if (c.x1 !== undefined) token.o += round(c.x1 * scale) + ' ' + round(c.y1 * scale) + ' '
    if (c.x2 !== undefined) token.o += round(c.x2 * scale) + ' ' + round(c.y2 * scale) + ' '
  }
  glyphs[String.fromCodePoint(Number(unicode))] = token
}
fs.writeFileSync(saida, JSON.stringify({ glyphs, familyName: font.getEnglishName('fullName'), ascender: round(font.ascender * scale), descender: round(font.descender * scale), underlinePosition: font.tables.post.underlinePosition, underlineThickness: font.tables.post.underlineThickness, boundingBox: { xMin: font.tables.head.xMin, xMax: font.tables.head.xMax, yMin: font.tables.head.yMin, yMax: font.tables.head.yMax }, resolution: 1000 }))
console.log(saida, Object.keys(glyphs).join(''))
