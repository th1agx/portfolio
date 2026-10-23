# Análise das referências

Estudo feito em 2026-10-21.

## Método e limites

- **Navegação real.** Cada site foi aberto num Chrome headless (sem janela) pelo Playwright, com GPU via Metal, em três modos: desktop 1440 × 900, celular 390 × 844 com toque e agente de iPhone, e desktop com `prefers-reduced-motion: reduce`. No desktop a rolagem foi feita com a roda do mouse (900px por passo, 2,2s de espera), com print a cada passo e um movimento de cursor no primeiro quadro. Os mesmos sites também foram vistos no navegador embutido do app.
- **Inspeção.** O REA (`inspect_web_page`) leu de forma passiva o DOM, a árvore de acessibilidade, os scripts e os recursos de Lusion, Igloo e Zentry. Os bundles públicos de Lusion (`hoisted.CUO_IjfL.js`), Igloo (`App3D-d68cb154.js`) e os componentes `Intro` e `Frame` do Zentry foram baixados e lidos com busca textual. Nada foi executado fora do navegador e nada foi copiado para o projeto.
- **Limitações.** Lusion e Igloo usam rolagem virtual (o documento tem a altura da tela e a roda move uma variável interna). No celular, `scrollBy` não avança essas páginas, então os prints de celular desses dois mostram só o primeiro quadro; o comportamento de toque não foi verificado. Alguns vídeos dos cartões do Zentry não carregaram no headless e aparecem vazios. Não li o motor do Igloo além de contagens de termos, e não afirmo nada sobre shaders específicos.

Prints e folhas de contato ficaram fora do repositório, na pasta temporária da sessão.

---

## Zentry (zentry.com): referência principal

### O que se vê

1. **Carregamento:** tela cheia em violeta chapado, sem logo nem barra.
2. **Primeiro quadro:** fundo preto. Uma flor iridescente em malha de arame ocupa o centro. "REDEFINE" fica no canto superior esquerdo e "REALITY" no canto inferior direito, em display condensado ultra-pesado (fonte própria, ZentryScreamer), com um parágrafo curto em Roboto Mono embaixo do primeiro.
3. **Rolagem:** o fundo inverte para lavanda (`rgb(223,223,242)`). Uma frase centralizada em display e, abaixo, um quadro escuro inclinado em perspectiva, com cantos arredondados. Continuando, o quadro se endireita e cresce até ocupar a tela inteira: o que era um objeto vira o ambiente (uma esfera violeta sobre uma mão em malha).
4. **Produtos:** cartões grandes com vídeo, um por produto, em duas colunas.
5. **Lista fixa:** três itens empilhados à esquerda, com o ativo em tinta cheia e os outros apagados, enquanto o título fica parado.
6. **Manifesto:** uma frase enorme centralizada, com pequenos quadrados inseridos entre as palavras como glifos.
7. **Números:** inversão para preto. Números gigantes em blocos de cor (24B+, 970GB+, 100M+), lista de parceiros e um fechamento com imagens inclinadas.

### Como é feito (observado)

- Nuxt, com cada parte em um componente (`Hero`, `Intro`, `Frame`, `FrameCover`, `InkTrapText`, `PageTransition`).
- A rolagem é nativa, suavizada por **Lenis** (`html.lenis.lenis-smooth`). O documento tem 14.155px no desktop, cerca de 16 telas.
- **O quadro em perspectiva não é WebGL.** O componente `Frame` calcula posição, rotação e escala de um retângulo em 3D, projeta os quatro cantos com distância focal de 800px e aplica o resultado como `clip-path: path(...)` num `div`, com uma borda em SVG desenhada pelo mesmo caminho. O progresso vem de um `ScrollTrigger` (`useBaseScrollTrigger`).
- Há dois canvas de tela cheia (vídeo e efeitos) e oito vídeos MP4/WebM.

### Princípios visuais

- Contraste radical de escala: display gigante condensado contra texto mono minúsculo.
- Campos de cor inteiros mudam por capítulo (violeta, preto, lavanda, preto). A mudança é estrutural, não decorativa.
- Composição em cantos opostos no primeiro quadro: tipografia nas extremidades e o objeto no centro.

### Princípios de interação e movimento

- **Um objeto vira o ambiente.** O quadro inclinado cresce até a tela inteira; o espectador entra nele sem corte.
- Tudo é ligado à rolagem (scrub), sem gatilhos de tempo. Subir a página desfaz exatamente o que a descida fez.
- Listas fixas com item ativo trocam o conteúdo sem trocar a composição.

### Celular

A mesma narrativa empilhada numa coluna. O quadro vira um contorno inclinado de largura total e o display continua grande, em duas ou três linhas.

### Movimento reduzido

Nenhuma diferença visível nos prints: o site não parece tratar `prefers-reduced-motion`.

### O que o torna memorável

A sensação de câmera contínua sem WebGL pesado, só com projeção de um retângulo, e a tipografia que funciona como cenário.

### O que levar

- O objeto que vira o ambiente, como transição entre capítulos.
- Capítulos com campo de cor próprio quando o assunto muda de natureza.
- Tudo amarrado à rolagem e reversível.

### O que não copiar

O display ultra-pesado em caixa alta, frases de manifesto gigantes, a paleta violeta e lavanda, os números enormes em blocos, a flor e a mão em malha, o quadro arredondado inclinado como estética.

---

## Lusion (lusion.co): referência principal

### O que se vê

1. **Carregamento:** tela preta com um contador numérico real no canto ("049") e uma barra curta no centro.
2. **Primeiro quadro:** página quase branca. Logo e uma frase curta no topo. Um painel grande de cantos arredondados mostra uma pilha densa de peças plásticas em cruz (azul, branco, preto) sob luz de estúdio, com reflexos e sombras de contato.
3. **Cursor:** passar o cursor empurra as peças. Os prints antes e depois do movimento mostram as peças em posições diferentes.
4. **Rolagem:** o painel sobe e sai. Surge "Bold Ideas, Brought to Life" em grotesca grande e um tubo azul grosso em 3D, que entra pela esquerda, cruza o título, desce entre os blocos e liga o texto a um vídeo em duotone azul.
5. **Reel:** o vídeo cresce até a largura total com "PLAY REEL" sobreposto e troca de cena enquanto se rola.
6. **Trabalhos:** grade de duas colunas com imagens que entortam em WebGL conforme a velocidade da rolagem.

### Como é feito (observado)

- Astro com um bundle de 1,25 MB contendo Three.js r158 e um motor próprio: cerca de 100 `ShaderMaterial`/`RawShaderMaterial`, `MeshStandardMaterial` e `MeshPhysicalMaterial`, mapas de sombra, bloom e SMAA.
- **Rolagem virtual.** O documento tem 900px de altura; a roda move uma variável interna suavizada por `lerp`. É sequestro de rolagem, embora suave.
- Um canvas fixo de tela cheia por trás do DOM. Texto e links estão no DOM e são acessíveis.
- Recursos: `home.webp` com `home_depth.webp` (imagem com mapa de profundidade), `matcap.exr`, texturas de um astronauta e um `desktop.mp4`.
- Nenhuma menção a `prefers-reduced-motion` no bundle. Nenhuma biblioteca de física conhecida: as colisões do herói são código próprio.

### Princípios visuais

- Material e luz tratados como fotografia de produto: plástico com reflexo, sombras de contato, profundidade de campo.
- O 3D em painel emoldurado dentro de uma página clara, o que dá escala e deixa o texto respirar.
- Uma cor de assinatura (azul) que aparece no objeto, no tubo e no duotone das imagens.

### Princípios de interação e movimento

- **Um elemento contínuo atravessa a diagramação.** O tubo azul passa por cima e por trás do texto e conecta os blocos: o 3D não fica ao lado do conteúdo, ele costura o conteúdo.
- Resposta física ao cursor: a cena reage a quem está olhando.
- O painel do reel cresce até a largura total: mesma ideia do objeto que vira ambiente.

### Celular

O mesmo painel com a pilha de peças, reenquadrado na vertical, e o texto acima. A rolagem virtual não respondeu a `scrollBy`.

### Movimento reduzido

Nenhuma diferença visível.

### O que o torna memorável

A qualidade física dos objetos e o tubo que liga as partes da página.

### O que levar

- Material, luz e sombra como direção de arte.
- Um elemento físico contínuo que costura texto e cena.
- Uma resposta sutil ao cursor no primeiro quadro.
- Um carregamento honesto, com progresso real.

### O que não copiar

A pilha de peças em cruz, o tubo azul, as imagens que entortam, a paleta azul, branca e preta, o "PLAY REEL" e a rolagem virtual.

---

## Igloo Inc. (igloo.inc): referência principal

### O que se vê

1. **Carregamento:** cinza azulado com uma pequena barra de texto.
2. **Primeiro quadro:** montanha nevada sob neblina. Blocos de gelo flutuam numerados e se encaixam até formar um iglu. Textos em mono pequena nos cantos (copyright, manifesto) e "Scroll down to discover" embaixo.
3. **Rolagem:** a câmera avança, a neblina cobre a cena e aparecem blocos de gelo com as empresas do portfólio congeladas dentro, com rótulos tipo HUD presos ao objeto e texto que embaralha antes de se fixar.
4. **Portal:** os mesmos blocos se reorganizam num anel com núcleo luminoso. A câmera atravessa o anel.
5. **Fim:** um personagem feito de partículas sobre um pedestal circular, e os links (LinkedIn, X) presos no chão como interface da cena.

### Como é feito (observado)

- **O site inteiro é um canvas.** A árvore de acessibilidade tem 13 nós e nenhum texto útil; títulos, links e rótulos são desenhados em WebGL (a fonte IBM Plex Mono é carregada como textura KTX2).
- Malhas comprimidas em Draco (`igloo.drc`, `mountain.drc`, `shattered_ring2.drc`, `ceilingsmoke.drc`), cerca de 30 texturas KTX2 (ruído, nuvens, gelo), bloom, sombras.
- Rolagem virtual pela roda, com `lerp`. Nenhum tratamento de `prefers-reduced-motion` encontrado.

### Princípios visuais

- **Um material governa o mundo:** gelo. Paleta inteira derivada dele (cinza azulado, branco, luz fria).
- A metáfora vem do nome (iglu) e vira estrutura: blocos que constroem e guardam.
- Profundidade por neblina e luz, não por cor.

### Princípios de interação e movimento

- Uma única viagem de câmera, contínua, do começo ao fim.
- **As mesmas peças mudam de significado:** os blocos do iglu viram o anel do portal.
- A informação fica presa aos objetos (rótulos ancorados no 3D), não em seções separadas.

### Celular

A mesma cena reenquadrada na vertical, com os textos nos cantos. A rolagem virtual não respondeu a `scrollBy`.

### Movimento reduzido

Nenhuma diferença visível.

### O que o torna memorável

O visitante reconhece o site por uma imagem: o iglu de blocos.

### O que levar

- Uma metáfora tirada do próprio trabalho, que decide material, cor e movimento.
- Peças que reaparecem com outro papel.
- Uma revelação final que mostra o todo.

### O que não copiar

Gelo, neblina, iglu, partículas, anel luminoso, texto que embaralha, rótulos tipo HUD e, acima de tudo, o conteúdo preso no canvas sem acessibilidade.

---

## Síntese das três

**Em comum**

- Uma ideia física única, reconhecível em uma imagem (o quadro que vira mundo, o tubo e a pilha de peças, o iglu).
- Continuidade sem cortes: uma câmera ou um elemento atravessa todos os momentos.
- A cena ocupa a tela inteira e o texto é composto em volta dela, nas áreas livres de cada enquadramento, nunca numa coluna ao lado de uma caixa.
- Fundos de campo claro com momentos escuros (Lusion e Zentry) ou uma única atmosfera (Igloo).
- Todas tratam a rolagem como linha do tempo.

**Onde divergem**

| | Zentry | Lusion | Igloo |
| --- | --- | --- | --- |
| Onde mora o 3D | Simulado em CSS (projeção de retângulo) e vídeo | WebGL por trás de um DOM real | Tudo em WebGL |
| Rolagem | Nativa com Lenis | Virtual | Virtual |
| Acessibilidade | Boa (DOM) | Boa (DOM) | Nula |
| Papel do texto | Cenário | Conteúdo ao lado da cena | Rótulo no objeto |

**Como combinar sem copiar**

1. Uma metáfora física tirada do trabalho do Thiago, que decide material, cor e movimento (Igloo).
2. Um mundo 3D em tela cheia com texto real no DOM, composto nas áreas livres de cada enquadramento, e um elemento físico que costura texto e cena (Lusion).
3. Rolagem nativa e reversível, com pelo menos um momento em que um objeto vira o ambiente (Zentry).
4. Movimento reduzido tratado de verdade, algo que nenhuma das três faz.

---

## Referências secundárias

**Apple Vision Pro.** Primeiro quadro com produto e nome em grande, um único botão. Depois, uma frase central por tela e a demonstração em imagem de tela cheia: cada capacidade aparece sozinha, com o texto ao lado da prova. Princípio: uma capacidade por vez, com a demonstração no mesmo quadro da explicação.

**Stripe.** Fragmentos de interface reais e animados (telefone com pagamento, gráfico de uso) explicam o produto. Títulos em sentença, com a segunda metade em cor mais clara. Princípio: precisão e prova concreta; o gradiente e os globos de partículas ficam de fora.

**Teenage Engineering.** Fotografia em preto e branco da loja, tipografia minúscula e contida nos cantos, produtos fotografados como objetos sob luz dura. Princípio: personalidade por consistência, cor usada com função.

## Implicações para este projeto

| Decisão | De onde vem |
| --- | --- |
| Mundo 3D em tela cheia, com texto composto nas áreas livres de cada enquadramento | Síntese das três |
| Uma máquina física cuja forma é a forma do trabalho do Thiago | Igloo |
| A trilha da bolinha cruza o espaço do texto e liga os capítulos | Lusion |
| A câmera entra na caixa de integração e o interior vira o capítulo seguinte | Zentry |
| Capítulo escuro quando o assunto muda de natureza (dentro da integração) | Zentry |
| Revelação final da máquina inteira | Igloo |
| Resposta sutil ao cursor no primeiro quadro | Lusion |
| Carregamento com progresso real | Lusion |
| Rolagem nativa, reversível, sem Lenis | Zentry (nativa) e briefing |
| Movimento reduzido tratado | Nenhuma das três; obrigação do briefing |
| Uma capacidade por vez | Apple |
| Cor por função | Teenage Engineering |
