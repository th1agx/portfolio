# Monta os GIFs do README a partir dos quadros capturados do site publicado (.playwright-mcp/gif/, rolando com a
# roda do mouse em 960x600, reduzidos a 640x400). Cada GIF é um trecho do passeio; paleta própria por GIF para o azul não virar faixas.
#
#   python3 tools/readme-gif.py
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
QUADROS = RAIZ / '.playwright-mcp' / 'gif'
SAIDA = RAIZ / 'docs' / 'readme'

TRECHOS = {
    'abertura': ('abertura', range(0, 40, 2), 200),
    'retrato': ('retrato', range(0, 36), 110),
    'vale': ('p2', range(6, 36, 2), 240),
    'salto': ('p2', range(28, 46), 150),
    'projetos': ('p2', range(38, 72, 2), 240),
    'ate-aqui': ('p2', range(70, 108), 140),
    'tunel': ('p2', range(108, 204, 3), 170),
    'contato': ('p2', range(196, 216), 150),
}

for nome, (prefixo, faixa, dur) in TRECHOS.items():
    arquivos = [QUADROS / f'{prefixo}-{i:03d}.{ "png" if prefixo != "p2" else "jpg"}' for i in faixa]
    arquivos = [a for a in arquivos if a.exists()]
    quadros = [Image.open(a).convert('RGB').resize((640, 400), Image.LANCZOS) for a in arquivos]
    # uma paleta só para o trecho todo (tirada de uma colagem de quadros), sem pontilhado: o azul liso comprime bem
    amostra = Image.new('RGB', (640, 400 * min(6, len(quadros))))
    for k, q in enumerate(quadros[:: max(1, len(quadros) // 6)][:6]):
        amostra.paste(q, (0, 400 * k))
    paleta = amostra.quantize(colors=112, method=Image.Quantize.MEDIANCUT)
    gif = [q.quantize(palette=paleta, dither=Image.Dither.NONE) for q in quadros]
    destino = SAIDA / f'{nome}.gif'
    gif[0].save(destino, save_all=True, append_images=gif[1:], duration=dur, loop=0, optimize=True, disposal=1)
    print(f'{nome}: {len(gif)} quadros, {destino.stat().st_size / 1e6:.2f} MB')
