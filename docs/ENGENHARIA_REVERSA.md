# Engenharia reversa das referências (medida, 24/10/2026)

Como foi feito: REA (`analyze_web_bundle`) em cada site aberto num Chrome headless; leitura dos bundles baixados
(contagem de `ease`, `duration`, `stagger`, `start`/`end`/`scrub` do ScrollTrigger e opções do Lenis); medição em
execução (curva da rolagem depois de um giro de roda de 100 px, quadros por segundo rolando) e uma sequência de
quadros a cada 300 px de rolagem, em 1440×900. As sequências ficam em `scratchpad/refs/<site>/folha*.jpg`.

## Stack

| Site | Base | Rolagem | Animação | 3D |
| --- | --- | --- | --- | --- |
| Lando Norris (OFF+BRAND) | Webflow + jQuery | Lenis, `lerp 0.1`, `wheelMultiplier 1` | GSAP + ScrollTrigger (19 gatilhos), Rive (assinatura, menu) | three r174 + pós-processamento |
| Zentry | Nuxt (Vue) | Lenis (modo `duration`) | GSAP, quadro projetado próprio (`useCssClipMask`) | three r163, Spline no topo |
| Ingrassia | Next.js (Turbopack) + React | Lenis, `lerp 0.1` | transições próprias em shader | three r185, um sistema de partículas |
| Lusion | Astro | rolagem virtual própria (a página tem 900 px; o conteúdo é movido por transform) | motor próprio, sem GSAP | three r158, planos WebGL presos ao DOM |
| Igloo | Vite + app 3D | rolagem virtual própria | GSAP sem ScrollTrigger: a rolagem só alimenta a câmera | three r165, profundidade de campo, névoa, FXAA |
| Emotion | Nuxt 3 | Lenis, `lerp 0.1` | GSAP + ScrollTrigger (10) | three, carrossel curvo |

## Métricas

**Rolagem (tempo para assentar depois de um giro de 100 px):**

| Site | 50 % | 90 % | 99 % |
| --- | --- | --- | --- |
| Lando | 204 ms | 493 ms | 813 ms |
| Ingrassia | 203 ms | 470 ms | 786 ms |
| Zentry | 159 ms | 282 ms | 441 ms |
| Meu site (Lenis `lerp 0.09`, `wheelMultiplier 0.9`) | sem medida útil: o primeiro quadro só saiu em 1,9 s | | |

**Quadros por segundo rolando, 6 trechos de 700 px (quadros em 1 s / pior quadro):**

- Lando: 39/91 ms, 41/69, 46/59, 61/22, 61/19, 61/19.
- Lusion: 25/52, 28/48, 32/46, 49/45, 61/19, 61/18.
- Meu site (dev): 42/48, **18/482**, 52/171, **18/589**, 36/262, 61/19.

O pior quadro deles nunca passa de ~90 ms. O meu trava meio segundo em dois trechos (montagem das cenas e
compilação de shader no meio da rolagem). Parte do "não é suave" vem daí, antes mesmo do desenho da transição.
Falta medir no build de produção.

**Curvas e tempos mais usados no código deles:**

- Lando: `power2.out` (36×), `power2.inOut` (15), `expo.inOut` (12), `power3.out` (10). Durações 0,5 s, 0,6 s
  e 2 s. Stagger de 0,015 a 0,03 s. Gatilhos `top bottom → bottom top` com `scrub: true` (26×). Entrada de texto
  em `top 90%`. CSS: `cubic-bezier(.19,1,.22,1)`.
- Zentry: `power4.out` (10×), `power3.out` (7). Durações de 1,4 s a 1,6 s. Stagger de 0,1 a 0,12 s.
- Igloo: `none` (37×, a rolagem manda), `sine.out` (22), `power2.inOut`. Durações longas: 2 s, 3 s e 7,5 s.
- Emotion: `power2.out` (44×), `power2.inOut` (26), `back.out(1.7)` em detalhes. CSS
  `cubic-bezier(.16,1,.3,1)` em 0,4 s.

**Regra comum:** tudo o que muda a cena está preso à rolagem (`scrub`), sem disparo por tempo. O que dispara por
tempo é só texto e detalhe (0,5 a 0,6 s, `power2.out`). Nenhum deles troca de cena por corte, fade ou janela que
"entra": a cena seguinte nasce de algo que já está na tela.

## As transições, como cada uma funciona (lidas nos quadros e no código)

1. **Lando: o objeto que viaja.** A foto ou o capacete segue uma curva bézier entre três posições marcadas no
   layout, mudando de tamanho, presa à rolagem. A seção de baixo recebe o objeto.
2. **Lando: o fundo que muda de cor aos poucos.** Na galeria (quadros 06 a 14), o fundo vai do verde-oliva
   escuro ao cinza e ao creme ao longo de umas três telas de rolagem. As fotos estão em profundidades diferentes
   (paralaxe), e as linhas de relevo ficam por trás. Não existe corte entre o escuro e o claro.
3. **Lando: On track / Off track e o crescimento até a tela cheia.** O capacete e o rosto entram pelas laterais
   até o texto do meio (`x ±20rem → 0`) e depois crescem até encher a tela. A imagem vira o fundo da seção
   seguinte ("Helmets hall of fame"), escura.
4. **Lando: a borda curva.** A seção seguinte sobe com a borda em elipse (`ellipse(70% 0%) → ellipse(70% 100%)`,
   presa à rolagem), e uma imagem fica por cima da borda, metade em cada seção.
5. **Lando: o rodapé.** Um brilho lima sobe por baixo, e o painel escuro tem uma aba curva no alto. A assinatura
   é desenhada.
6. **Zentry: o quadro inclinado.** O roxo aparece dentro de um quadro em perspectiva no meio da página clara
   (quadros 03 a 11). O quadro endireita e cresce até a borda da tela, e a seção seguinte sobe por cima dele.
   Curva `power4.out` em 1,4 a 1,6 s na entrada, depois presa à rolagem.
7. **Lusion: a miniatura que vira o vídeo.** Uma imagem pequena ao lado do título (quadros 03 e 04) viaja e cresce
   até virar o quadro do reel, com as marcas "+" do grid nos cantos. A linha azul passa entre as seções.
8. **Lusion: os trabalhos.** É uma grade de imagens grandes e claras, com o nome grande embaixo. Cada imagem é um
   plano WebGL preso ao DOM, e o conteúdo dela se desloca levemente dentro da moldura enquanto rola.
9. **Igloo: a névoa.** O iglu se monta com blocos que caem. A névoa sobe e a câmera desce através dela (quadros
   04 a 06). Cada projeto é um cristal que sai da névoa, gira e volta para ela. É um mundo só, e o que separa uma
   parte da outra é a profundidade.
10. **Ingrassia: o anel e os cartões.** Um anel de pontos gira no centro do campo de estrelas. Os projetos chegam
    como cartões vindos da direita, numa fila horizontal movida pela rolagem vertical (quadros 14 a 23), e a borda
    de cada cartão ondula com a velocidade.

## wodniack.dev: a apresentação dos projetos (medida em 03/11/2026)

**Stack:** Astro, GSAP 3.12.5 com ScrollTrigger e EasePack, Lenis. Não usa WebGL: a cena é feita com DOM e CSS
3D, mais um canvas 2D com uma grade de pontos. Um script só (`hoisted.BvNyQ0G_.js`, 196 KB) e um CSS
(`index.MJ9FiCyD.css`). Quadros em `scratchpad/refs/wodniack/folha*.jpg`.

**Como a seção funciona (`.s-work`, classe `vc` no JS):**

1. **Altura:** `número de trabalhos × 50lvh`, ou seja, meia tela de rolagem por projeto. Tudo fica preso
   (`position: sticky`).
2. **O portal:** uma máscara SVG cobre a tela com a cor da página e tem um furo em forma de pílula, a "régua"
   (`.s__ruler`): largura de `min(16,67 %, 19,625rem)` no desktop, 33 % ou 50 % em telas menores, altura de
   80lvh, a 10lvh do topo. Uma segunda pílula, 16 px para dentro, se desloca `scroll-progress × 48px` (paralaxe
   da borda). Fora da pílula, linhas de grade em 12 colunas e linhas a cada 10 % da altura. Pela pílula se vê
   a cena escura, com a palavra WORK escrita na vertical, uma letra embaixo da outra.
3. **A linha do tempo** fica presa à rolagem (`scrub: 1`), de `top 25%` a `bottom 75%`:
   - de 0 a 0,75: a máscara cresce de 1 até `largura da tela ÷ meia largura da pílula`, com `power4.in` (a
     pílula engole a tela e você entra por ela). A cena vai de 0,75 a 1 de escala (`power3.in`), o recorte do
     contêiner vai de `inset(0 1rem)` a 0, os pontos do canvas se juntam (`power4.inOut`, duração 1) e
     `--state` vai de 0 a 1 (`power4.in`), o que abre as letras em fileiras;
   - a partir de 0,75: cada trabalho tem um atributo `progress` que vai de 1 a −1 (`slow(0.15, 0.6)`, 0,25
     entre um e outro), e as letras correm como letreiro (`animationProgress` de 0 a 10 000, `power1.out`);
   - no fim, tudo volta: estado, máscara e escala retornam (`power4.inOut`) e você sai pela pílula.
4. **As letras:** cada letra de WORK é clonada `round(largura da tela ÷ largura da letra × 0,75) + 2` vezes
   numa fileira. Cada fileira tem velocidade própria (`hypot(largura, altura) × 4 × freq`, com freq sorteada
   entre 1 e 2). No CSS, `--head = (progress − 0,5) × −2` e a transformação é
   `rotateY(head × −10deg × state) translate3d(head × 50vw × state, iy × 50 % × head² × state, 0)`. As fileiras
   se curvam numa parábola e parecem a parede de um cilindro. Cada letra tem uma sombra (`:before`) e algumas
   ficam na frente dos trabalhos (`z-index 3`), passando por cima deles. A perspectiva da cena é 40rem.
5. **Os trabalhos:** cada um é um vídeo (`a-work`) com tamanho sorteado entre 0,5 e 1 e altura sorteada,
   alternando acima e abaixo do centro. O CSS é `rotateY(progress × −20deg) translate3d(progress × (50vw + 100 %)
   − 50 %, y × 50 % − 50 %, progress² × −5rem) scale(size)`. Cada um entra pela direita, girado e afundado,
   passa reto pelo centro e sai pela esquerda girado para o outro lado. O vídeo só toca enquanto está na tela.
6. **A fonte** das letras é `min(18.75rem, 25lvh)`, com quatro letras ocupando a altura toda.

## landonorris.com: o rosto no topo (medido em 16/11/2026)

Lido no bundle `lando-by-OFF+BRAND.05.js` (three + GSAP) e em quadros do topo com o cursor passando, em 1440×900.
Quadros em `scratchpad/refs/lando/folha-hero.jpg`.

1. **O rosto é um plano com relevo, não um modelo 3D.** Um `PlaneGeometry(1, 1, 128, 128)` com a foto, um mapa de
   profundidade (`displacementScale 0.25`), alfa, normal e rugosidade. Ele gira com o mouse:
   `rotation.y = mouse.x × 0.075` e `rotation.x = −mouse.y × 0.075`, com o mouse amortecido (`damp`, 0.025).
2. **O cursor revela o capacete com um fluido.** Uma simulação de fluido (advecção BFECC, `dissipation 0.96`,
   `mouse_force 50`, `cursor_size 18`, resolução 0.1 da tela, `dt 0.014`, 60 passos por segundo) gera uma textura de
   velocidade. No shader do rosto, `step(0.1, 1 − efeito)` vira uma máscara de borda dura, e onde ela é 1 a cor
   troca da foto para a textura do capacete. O rastro segue o cursor, se espalha como tinta na água e some sozinho.
3. **Sem mouse, o efeito toca sozinho.** Depois de 2 s parado (2,5 s ao abrir a página), um cursor falso percorre
   `x = −cos(p × 4π) × 0.75`, `y = cos(p × π) × 0.5`, com p de 0 a 1 em 2,5 s, ida e volta, com 3 s de pausa.
4. **Ao passar no selo do capacete** (`data-gl-helmet="hover"`), o capacete inteiro entra de baixo para cima com uma
   onda (`y + sin(x × π) × sin(t × π) × 0.2`), 1,5 s, `expo.inOut`; sai em 1 s.
5. **Entrada da página:** `uReveal` de 0 a 1 em 1,1 s, de baixo para cima. O fundo são curvas de nível de ruído
   (as mesmas linhas de relevo que já usamos na Experiência).
6. **Na rolagem,** o topo fica preso (`sticky`), a foto encolhe num cartão e a seção escura de baixo sobe com o
   letreiro grande e a assinatura desenhada.
