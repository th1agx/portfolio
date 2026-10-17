// Converte uma fonte TTF no formato typeface JSON que o three.js (TextGeometry / drei Text3D) lê.
// Uso: node tools/make-typeface.mjs tools/Syncopate-Bold.ttf public/fonts/syncopate-bold.typeface.json
import opentype from 'opentype.js';
import { writeFileSync, readFileSync } from 'node:fs';

const [, , input = 'tools/Syncopate-Bold.ttf', output = 'public/fonts/syncopate-bold.typeface.json'] = process.argv;
const buf = readFileSync(input);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,-/:&+';

const glyphs = {};
for (const ch of chars) {
  const g = font.charToGlyph(ch);
  const cmds = g.path.commands;
  const o = [];
  for (const c of cmds) {
    if (c.type === 'M') o.push('m', round(c.x), round(c.y));
    else if (c.type === 'L') o.push('l', round(c.x), round(c.y));
    else if (c.type === 'Q') o.push('q', round(c.x), round(c.y), round(c.x1), round(c.y1));
    else if (c.type === 'C') o.push('b', round(c.x), round(c.y), round(c.x1), round(c.y1), round(c.x2), round(c.y2));
  }
  const bb = g.getBoundingBox();
  glyphs[ch] = { ha: round(g.advanceWidth), x_min: round(bb.x1), x_max: round(bb.x2), o: o.join(' ') };
}

function round(v) { return Math.round(v); }

const json = {
  glyphs,
  familyName: font.names.fontFamily?.en ?? 'Syncopate',
  ascender: round(font.ascender),
  descender: round(font.descender),
  underlinePosition: round(font.tables.post.underlinePosition),
  underlineThickness: round(font.tables.post.underlineThickness),
  boundingBox: { yMin: font.tables.head.yMin, xMin: font.tables.head.xMin, yMax: font.tables.head.yMax, xMax: font.tables.head.xMax },
  resolution: font.unitsPerEm,
  original_font_information: { format: 0, fontFamily: font.names.fontFamily?.en ?? '' },
  cssFontWeight: 'bold',
  cssFontStyle: 'normal',
};
writeFileSync(output, JSON.stringify(json));
console.log(`typeface: ${Object.keys(glyphs).length} glyphs -> ${output}`);
