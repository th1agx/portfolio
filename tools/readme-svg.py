# Gera as imagens animadas do README (docs/readme/*.svg) no tema do site: o fundo do espaço, as estrelas que
# piscam, a trilha de luz e a fonte do site (Cabinet Grotesk) embutida, porque o GitHub mostra o SVG como
# imagem e não carrega fontes de fora. Tudo é CSS e SMIL dentro do SVG: sem script, que o GitHub bloqueia.
#
#   python3 tools/readme-svg.py
import base64
import math
import random
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / 'docs' / 'readme'
SAIDA.mkdir(parents=True, exist_ok=True)

FUNDO = '#02031a'
AZUL = '#000080'
VIVO = '#0000f0'
GELO = '#e8edf5'
CINZA = '#a5a9b4'


def fonte(peso: int) -> str:
    dados = (RAIZ / 'src' / 'app' / 'fontes' / f'cabinet-grotesk-{peso}.woff2').read_bytes()
    b64 = base64.b64encode(dados).decode()
    return f"@font-face{{font-family:'Cabinet';font-weight:{peso};src:url(data:font/woff2;base64,{b64}) format('woff2');}}"


def estrelas(n: int, w: int, h: int, semente: int) -> str:
    rnd = random.Random(semente)
    pontos = []
    for i in range(n):
        x = rnd.uniform(0, w)
        y = rnd.uniform(0, h)
        r = rnd.choice([0.6, 0.8, 1.0, 1.0, 1.3, 1.8])
        dur = rnd.uniform(2.2, 5.5)
        atraso = rnd.uniform(0, 5)
        cor = GELO if rnd.random() > 0.35 else '#8fb0ff'
        pontos.append(f'<circle class="e" cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{cor}" style="animation-duration:{dur:.2f}s;animation-delay:-{atraso:.2f}s"/>')
    return ''.join(pontos)


def caminho_trilha(w: int, h: int) -> str:
    # a trilha do site: desce serpenteando, como a linha que liga os cartões do "Até aqui"
    pts = [(w * 0.62, -20), (w * 0.7, h * 0.18), (w * 0.56, h * 0.42), (w * 0.74, h * 0.66), (w * 0.64, h * 0.88), (w * 0.7, h + 20)]
    d = f'M{pts[0][0]:.1f},{pts[0][1]:.1f}'
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        my = (y0 + y1) / 2
        d += f' C{x0:.1f},{my:.1f} {x1:.1f},{my:.1f} {x1:.1f},{y1:.1f}'
    return d


ESTILO_BASE = f"""
.e{{animation-name:pisca;animation-iteration-count:infinite;animation-timing-function:ease-in-out}}
@keyframes pisca{{0%,100%{{opacity:.25}}50%{{opacity:1}}}}
"""


def png_b64(im) -> str:
    import io
    buf = io.BytesIO()
    im.save(buf, 'PNG', optimize=True)
    return base64.b64encode(buf.getvalue()).decode()


def jpg_b64(im, q=82) -> str:
    import io
    buf = io.BytesIO()
    im.convert('RGB').save(buf, 'JPEG', quality=q, optimize=True, progressive=True)
    return base64.b64encode(buf.getvalue()).decode()


def retrato(largura: int):
    """humano, robô e as curvas de nível do retrato do topo, já com os ombros dissolvidos (como o shader do site)"""
    from PIL import Image, ImageFilter
    pasta = RAIZ / 'public' / 'retrato'
    h = int(largura * 1448 / 1086)
    humano = Image.open(pasta / 'humano.webp').convert('RGBA').resize((largura, h), Image.LANCZOS)
    robo = Image.open(pasta / 'robo.webp').convert('RGBA').resize((largura, h), Image.LANCZOS)
    # o corpo some nas laterais e na borda de baixo (smoothstep do Retrato.tsx)
    def suave(a, b, x):
        k = min(1.0, max(0.0, (x - a) / (b - a)))
        return k * k * (3 - 2 * k)
    mascara = Image.new('L', (largura, h))
    px = mascara.load()
    for y in range(h):
        fy = 1 - y / h
        for x in range(largura):
            fx = x / largura
            v = suave(0.02, 0.22, fx) * suave(0.98, 0.78, fx) * suave(0.0, 0.22, fy)
            px[x, y] = int(255 * v)
    for im in (humano, robo):
        a = im.getchannel('A')
        from PIL import ImageChops
        im.putalpha(ImageChops.multiply(a, mascara))
    # curvas de nível: cortes da silhueta desfocada (aura.png) em vários níveis, cada um vira um traço fino
    aura = Image.open(pasta / 'aura.png').convert('L').resize((largura, h), Image.LANCZOS).filter(ImageFilter.GaussianBlur(2))
    aneis = []
    for nivel in [2, 5, 9, 15, 23, 34, 50, 72]:
        b = aura.point(lambda v, n=nivel: 255 if v > n else 0)
        borda = b.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.MaxFilter(3))
        borda = ImageChops.multiply(borda, mascara.point(lambda v: min(255, v * 2)))
        traco = Image.new('RGBA', (largura, h), (232, 237, 245, 0))
        traco.putalpha(borda.point(lambda v: int(v * 0.75)))
        aneis.append(traco)
    return humano, robo, aneis, h


def banner() -> None:
    w, h = 1280, 560
    larg = 420
    humano, robo, aneis, alt = retrato(larg)
    rx, ry = 790, h - alt + 10
    # a trilha passa no vão entre o nome e o retrato
    pts = [(735, -20), (760, h * 0.2), (712, h * 0.45), (758, h * 0.7), (722, h * 0.9), (745, h + 20)]
    trilha = f'M{pts[0][0]:.1f},{pts[0][1]:.1f}' + ''.join(f' C{x0:.1f},{(y0 + y1) / 2:.1f} {x1:.1f},{(y0 + y1) / 2:.1f} {x1:.1f},{y1:.1f}' for (x0, y0), (x1, y1) in zip(pts, pts[1:]))
    # a mancha que revela o robô: bolhas que passeiam pelo rosto e se fundem (desfoque + corte de alfa)
    bolhas = []
    rnd = random.Random(3)
    for i in range(5):
        cxs = ';'.join(f'{rx + larg * rnd.uniform(0.25, 0.78):.0f}' for _ in range(5))
        cys = ';'.join(f'{ry + alt * rnd.uniform(0.16, 0.62):.0f}' for _ in range(5))
        rs = ';'.join(f'{rnd.uniform(16, 42):.0f}' for _ in range(5))
        dur = rnd.uniform(9, 14)
        bolhas.append(f'<circle fill="#fff"><animate attributeName="cx" values="{cxs};{cxs.split(";")[0]}" dur="{dur:.1f}s" repeatCount="indefinite" calcMode="spline" keySplines="{";".join([".45 0 .55 1"]*5)}"/><animate attributeName="cy" values="{cys};{cys.split(";")[0]}" dur="{dur:.1f}s" repeatCount="indefinite" calcMode="spline" keySplines="{";".join([".45 0 .55 1"]*5)}"/><animate attributeName="r" values="{rs};{rs.split(";")[0]}" dur="{dur*0.8:.1f}s" repeatCount="indefinite"/></circle>')
    aneis_svg = ''.join(f'<image class="anel" style="animation-delay:-{i*0.42:.2f}s" href="data:image/png;base64,{png_b64(a)}" x="{rx}" y="{ry}" width="{larg}" height="{alt}"/>' for i, a in enumerate(aneis))
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{w}" height="{h}" viewBox="0 0 {w} {h}">
<defs>
<style>{fonte(800)}{fonte(500)}{ESTILO_BASE}
.titulo{{font-family:'Cabinet',sans-serif;font-weight:800;letter-spacing:-0.035em;fill:{GELO}}}
.sub{{font-family:'Cabinet',sans-serif;font-weight:500;fill:#c9d2ff}}
.linha1,.linha2{{clip-path:inset(0 100% 0 0);animation:abre 1s cubic-bezier(.215,.61,.355,1) .2s forwards}}
.linha2{{animation-delay:.38s}}
.bloco1,.bloco2{{transform-box:fill-box;transform-origin:right center;animation:encolhe .8s cubic-bezier(.455,.03,.515,.955) .65s forwards}}
.bloco2{{animation-delay:.83s}}
.sub{{opacity:0;animation:sobe 1s ease 1.1s forwards}}
.foto{{opacity:0;animation:surge 1.6s cubic-bezier(.19,1,.22,1) .1s forwards}}
.anel{{animation:onda 3.4s ease-in-out infinite}}
@keyframes abre{{to{{clip-path:inset(0 -2% 0 0)}}}}
@keyframes encolhe{{to{{transform:scaleX(0)}}}}
@keyframes sobe{{from{{opacity:0;transform:translateY(10px)}}to{{opacity:1;transform:none}}}}
@keyframes surge{{from{{opacity:0;transform:translateY(40px)}}to{{opacity:1;transform:none}}}}
@keyframes onda{{0%,100%{{opacity:.15}}50%{{opacity:.9}}}}
.trilha{{stroke-dasharray:1500;stroke-dashoffset:1500;animation:desenha 3.4s cubic-bezier(.65,0,.35,1) .5s forwards}}
@keyframes desenha{{to{{stroke-dashoffset:0}}}}
</style>
<filter id="liquido" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="16"/><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -10"/></filter>
<filter id="brilho" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>
<mask id="revela" maskUnits="userSpaceOnUse" x="0" y="0" width="{w}" height="{h}"><g filter="url(#liquido)">{''.join(bolhas)}</g></mask>
<clipPath id="canto"><rect width="{w}" height="{h}" rx="22"/></clipPath>
</defs>
<g clip-path="url(#canto)">
<rect width="{w}" height="{h}" fill="{AZUL}"/>
{estrelas(70, w, h, 7)}
<path d="{trilha}" fill="none" stroke="#5b7dff" stroke-width="14" opacity=".35" filter="url(#brilho)" class="trilha"/>
<path d="{trilha}" fill="none" stroke="{GELO}" stroke-width="2.4" stroke-linecap="round" class="trilha" id="t"/>
<circle r="5" fill="#fff"><animateMotion dur="6s" repeatCount="indefinite" begin="3.9s"><mpath href="#t"/></animateMotion></circle>
<g class="foto">
{aneis_svg}
<image href="data:image/png;base64,{png_b64(humano)}" x="{rx}" y="{ry}" width="{larg}" height="{alt}"/>
<image href="data:image/png;base64,{png_b64(robo)}" x="{rx}" y="{ry}" width="{larg}" height="{alt}" mask="url(#revela)"/>
</g>
<g transform="translate(72 0)">
<g class="linha1"><text class="titulo" x="0" y="232" font-size="116">Thiago</text><rect class="bloco1" x="-4" y="136" width="330" height="116" fill="{VIVO}"/></g>
<g class="linha2"><text class="titulo" x="0" y="348" font-size="116">Antunes</text><rect class="bloco2" x="-4" y="252" width="414" height="116" fill="{VIVO}"/></g>
<text class="sub" x="2" y="404" font-size="25">Engenheiro de software · sistemas que se explicam</text>
</g>
</g>
</svg>"""
    (SAIDA / 'banner.svg').write_text(svg)


def divisor() -> None:
    w, h = 1280, 48
    d = f'M0,{h/2} C{w*0.25},{h*0.15} {w*0.35},{h*0.85} {w*0.5},{h/2} S{w*0.8},{h*0.15} {w},{h/2}'
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">
<defs><filter id="b" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="4"/></filter>
<linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="{GELO}" stop-opacity="0"/><stop offset=".15" stop-color="{GELO}" stop-opacity=".75"/><stop offset=".85" stop-color="{GELO}" stop-opacity=".75"/><stop offset="1" stop-color="{GELO}" stop-opacity="0"/></linearGradient></defs>
<path d="{d}" fill="none" stroke="#3d6dff" stroke-width="8" opacity=".35" filter="url(#b)"/>
<path id="d" d="{d}" fill="none" stroke="url(#g)" stroke-width="1.6"/>
<circle r="3.5" fill="#fff"><animateMotion dur="4.5s" repeatCount="indefinite"><mpath href="#d"/></animateMotion></circle>
<circle r="12" fill="#8fb0ff" opacity=".5" filter="url(#b)"><animateMotion dur="4.5s" repeatCount="indefinite"><mpath href="#d"/></animateMotion></circle>
</svg>"""
    (SAIDA / 'divisor.svg').write_text(svg)


QUADROS = RAIZ / '.playwright-mcp' / 'gif'


def titulo(nome: str, texto: str, apoio: str, quadro: int, recorte_y: int) -> None:
    # o título de cada parte: uma janela para a cena real dessa parte do site (um quadro do passeio), andando
    # devagar, com o nome entrando com o bloco azul como os títulos do site e um farol aceso à esquerda
    from PIL import Image
    w, h = 960, 200
    img = Image.open(QUADROS / f'p2-{quadro:03d}.jpg')
    cena = img.crop((0, recorte_y, 960, recorte_y + 240))
    largura_bloco = int(len(texto) * 25.5 + 14)
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">
<defs><style>{fonte(800)}{fonte(500)}
.cena{{animation:passeia 16s ease-in-out infinite alternate}}
@keyframes passeia{{from{{transform:translate(0,-6px) scale(1.02)}}to{{transform:translate(-36px,-34px) scale(1.08)}}}}
.t{{font-family:'Cabinet',sans-serif;font-weight:800;letter-spacing:-0.03em;fill:{GELO}}}
.r{{clip-path:inset(0 100% 0 0);animation:abre .9s cubic-bezier(.215,.61,.355,1) .2s forwards}}
.b{{transform-box:fill-box;transform-origin:right center;animation:encolhe .7s cubic-bezier(.455,.03,.515,.955) .55s forwards}}
.a{{font-family:'Cabinet',sans-serif;font-weight:500;fill:#c9d2ff;opacity:0;animation:sobe .9s ease .9s forwards}}
.f{{animation:acende 2.6s ease-in-out infinite}}
@keyframes abre{{to{{clip-path:inset(0 -3% 0 0)}}}}
@keyframes encolhe{{to{{transform:scaleX(0)}}}}
@keyframes sobe{{from{{opacity:0;transform:translateY(8px)}}to{{opacity:1;transform:none}}}}
@keyframes acende{{0%,100%{{opacity:.5}}50%{{opacity:1}}}}
</style>
<linearGradient id="v" x1="0" x2="1"><stop offset="0" stop-color="{FUNDO}" stop-opacity=".96"/><stop offset=".42" stop-color="{FUNDO}" stop-opacity=".72"/><stop offset=".7" stop-color="{FUNDO}" stop-opacity=".1"/><stop offset="1" stop-color="{FUNDO}" stop-opacity="0"/></linearGradient>
<filter id="bb" x="-200%" y="-50%" width="500%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
<linearGradient id="c" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="{GELO}" stop-opacity="0"/><stop offset=".3" stop-color="{GELO}"/><stop offset="1" stop-color="{GELO}" stop-opacity=".1"/></linearGradient>
<clipPath id="k"><rect width="{w}" height="{h}" rx="18"/></clipPath></defs>
<g clip-path="url(#k)">
<rect width="{w}" height="{h}" fill="{FUNDO}"/>
<image class="cena" href="data:image/jpeg;base64,{jpg_b64(cena)}" x="0" y="0" width="1000" height="250"/>
<rect width="{w}" height="{h}" fill="url(#v)"/>
<g class="f"><rect x="38" y="36" width="10" height="128" fill="#3d6dff" opacity=".4" filter="url(#bb)"/><rect x="42" y="38" width="2.4" height="128" fill="url(#c)"/><circle cx="43.2" cy="40" r="3.8" fill="#fff"/></g>
<g class="r"><text class="t" x="72" y="112" font-size="56">{texto}</text><rect class="b" x="68" y="62" width="{largura_bloco}" height="62" fill="{VIVO}"/></g>
<text class="a" x="74" y="148" font-size="19">{apoio}</text>
</g></svg>"""
    (SAIDA / f'titulo-{nome}.svg').write_text(svg)


banner()
divisor()
for nome, texto, apoio, quadro, y in [
    ('ideia', 'A ideia', 'um passeio só, do retrato ao contato', 32, 40),
    ('passeio', 'O passeio', 'cada seção e a passagem para a próxima', 40, 150),
    ('stack', 'Stack', 'o que roda por baixo', 72, 180),
    ('arquitetura', 'Arquitetura', 'como as cenas montam, conversam e se recuperam', 126, 180),
    ('referencias', 'Referências', 'estudadas no código, refeitas do zero', 86, 0),
    ('rodar', 'Rodar e publicar', 'do npm install ao GitHub Pages', 186, 180),
]:
    titulo(nome, texto, apoio, quadro, y)
print('ok:', sorted(p.name for p in SAIDA.glob('*.svg')))
