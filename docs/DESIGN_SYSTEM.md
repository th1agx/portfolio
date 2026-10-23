# Design system

Fonte de verdade visual e de comportamento. Os valores abaixo existem em `src/app/tokens.css` e em `src/experience/scene/materials.ts`. Se um valor mudar, muda nos dois lugares e aqui.

## Conceito visual

**Percurso.** Uma requisição entra no topo de uma máquina. Cada peça da máquina é um trabalho real do Thiago e decide alguma coisa sobre ela. Rolar a página é a gravidade: a bolinha desce, atravessa as estações e, na saída, a máquina imprime o rastro do caminho, com o contato do Thiago no pé do papel.

O mundo 3D ocupa a tela inteira o tempo todo. A câmera acompanha a bolinha e muda de enquadramento por capítulo; o texto real (DOM) é composto na área livre de cada enquadramento, sobre a parede do estúdio. Um capítulo (3D Lab) acontece dentro da caixa de integração, no escuro.

## Princípios

1. **Toda peça decide alguma coisa.** Nada no palco é decorativo. Se uma forma não representa uma regra, uma verificação, uma integração ou uma saída, ela não existe.
2. **Cor é função.** Cada cor diz o que a coisa faz, como as teclas de um instrumento.
3. **O texto explica o que o palco mostra.** A estação e o parágrafo que a explica aparecem juntos.
4. **O rastro é verdadeiro.** O recibo final só imprime o que aconteceu nesta visita.
5. **Sem WebGL, ainda é um portfólio completo.** Todo conteúdo profissional está no HTML.

## Paleta

| Token | Valor | Papel | Contraste |
| --- | --- | --- | --- |
| `--paper` | `#E6E3DE` | Fundo da página sem WebGL, recibo, rodapé | base |
| `--paper-2` | `#DAD6D0` | Degrau de tom para superfícies (recibo sobre a parede) | |
| `--stage` | `#CDC9C2` | Parede e chão do estúdio (cor de fundo da cena) | |
| `--ink` | `#191917` | Todo texto corrido, títulos | 13,8:1 no papel; 10,7:1 na parede |
| `--muted` | `#57534E` | Texto secundário, legendas | 6,0:1 no papel; 4,6:1 na parede |
| `--dark` | `#121214` | Interior da caixa de integração (capítulo 3D Lab) | |
| `--on-dark` | `#E6E3DE` | Texto no capítulo escuro | 15,6:1 |
| `--lime` | `#D7F452` | A requisição (a bolinha) e a única ação primária. Sempre com `--ink` por cima | 14,2:1 com tinta |
| `--signal` | `#F2541B` | Revisão necessária, desvio, rejeição. Só no palco e como preenchimento com `--ink` | nunca como texto |
| alumínio | `#B9BCBE`, metalness 0,85, roughness 0,32 | Estrutura da máquina | 3D |
| grafite | `#26262A`, roughness 0,55 | Regras (placas, portões) | 3D |

Proporção: papel e palco ocupam quase tudo. Lima aparece em dois lugares por tela no máximo: a bolinha e a ação. Laranja aparece só quando algo precisa de revisão.

Proibido: gradientes, roxo, azul elétrico, brilho, neon, fundo preto absoluto.

## Tipografia

Uma família: **Archivo** (variável em peso e largura, auto-hospedada por `next/font`). Escolhida num teste em tamanho real contra Instrument Sans e Funnel (ver `DESIGN_DECISIONS.md`). Duas vozes pela largura: condensada e pesada para nome e títulos, largura normal para leitura. Não há monoespaçada no site.

| Passo | Token | Tamanho | Largura e peso | Entrelinha | Uso |
| --- | --- | --- | --- | --- | --- |
| Pequeno | `--step-small` | 14 a 15px | 100%, 450 | 1,45 | Notas, links de projeto, rodapé do recibo |
| Corpo | `--step-body` | 17 a 19px | 100%, 400 | 1,55 | Texto corrido, em `--ink` |
| Destaque | `--step-lead` | 21 a 26px | 100%, 500 | 1,35 | Frase de abertura de cada capítulo, valores do recibo |
| Título | `--step-head` | 36 a 64px | 62%, 800 | 0,98 | Título de capítulo |
| Nome | `--step-display` | 64 a 168px | 62%, 800 | 0,9 | Só o nome, na entrada e no fim |

Tracking: display -0,035em, título -0,02em, corpo 0. Números com `font-variant-numeric: tabular-nums` no recibo e nas tabelas. Caixa alta: nunca em blocos. Medida: 46 a 62 caracteres.

## Espaço

Escala: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192px (`--s-1` a `--s-11`).

- Margem lateral: 32px no desktop, 20px no celular.
- Cada capítulo tem a altura de que a câmera precisa (entre 160 e 240svh); o texto ocupa a parte do meio dessa altura.
- Blocos de texto com no máximo 30rem de largura útil.

## Grid e composição

- **Desktop (≥ 960px):** canvas fixo em tela cheia, atrás do conteúdo. Grade de 12 colunas. Em cada capítulo a câmera põe a máquina num lado (colunas 1 a 6 ou 7 a 12) e o texto ocupa o outro, sobre a parede livre. Os lados alternam; a rampa entre capítulos cruza a tela.
- **Tablet (600 a 959px):** mesma lógica, máquina mais estreita (colunas 1 a 5 ou 8 a 12).
- **Celular (< 600px):** o canvas ocupa os 46% de cima da tela, fixo, com a máquina enquadrada mais perto. O texto corre embaixo sobre o papel. Não há região vazia: cada capítulo tem só a altura do texto mais o tempo da animação.
- O recibo do fim é a única superfície (papel sobre a parede), porque é um objeto impresso.

## Bordas, raios, superfícies, profundidade

- Raio: **0** em tudo que é interface. A bolinha é a única coisa redonda.
- Bordas: nenhuma linha decorativa. Separação por degrau de tom (`--paper` para `--paper-2`).
- Sombras: nenhuma na interface. No palco, sombras reais de uma luz direcional sobre a parede, porque ali existe matéria.
- Profundidade: só no palco. A interface é plana.

## Imagens

- A cena é a imagem do site. Não há prints de documentação, payloads nem banners de README.
- Nenhuma foto de banco, nenhuma ilustração genérica.

## Ícones

Nenhum conjunto de ícones. Setas tipográficas (→ ↗) só em links externos. Nada de emoji.

## Motion

| Tipo | Duração | Curva | Quando |
| --- | --- | --- | --- |
| Micro | 160ms | `cubic-bezier(.2,.7,.1,1)` | Hover, foco, pressão |
| Conteúdo | 360ms | `cubic-bezier(.2,.7,.1,1)` | Linha ativa, troca de UF, abrir descrição |
| Estrutura | 900ms | `cubic-bezier(.7,0,.2,1)` | Papel se recolhendo na saída |
| Palco | amortecimento exponencial, λ = 6 | — | Bolinha e câmera seguindo o scroll |

Regras:
- O movimento principal é um só: a bolinha descendo. Todo o resto responde a ela.
- O texto não tem animação de entrada. Quem se mexe é a máquina.
- Nada se mexe sozinho em repouso. O palco renderiza sob demanda e para quando a bolinha para.
- `prefers-reduced-motion`: a bolinha vai direto para a estação da seção visível, sem rolar, e a câmera troca de enquadramento sem viagem.

## Scroll

- Rolagem nativa. Sem Lenis, sem sequestro, sem rolagem horizontal.
- GSAP ScrollTrigger mede o progresso de cada estação e escreve um número num store. O palco lê esse número no `useFrame`.
- Links do cabeçalho são âncoras comuns.

## Componentes interativos e estados

- **Ação primária:** retângulo cheio em `--lime`, texto `--ink`, peso 600, 48px de altura mínima. Hover escurece o lima (`#C6E33F`). Pressão desloca 1px para baixo. Foco: anel de 3px em `--ink` com 3px de afastamento.
- **Links:** sublinhados, espessura 1px, afastamento 0,2em. Hover engrossa para 2px.
- **Nome de projeto nos Desvios:** botão sem caixa, display condensado a 36px. Ativo em `--ink`, os outros em `--muted`. Ativar (clique, toque, Enter) solta a bolinha do ramal e abre a descrição embaixo.
- **Cursor no funil:** só no primeiro capítulo, as bolinhas se afastam do ponteiro. Sem cursor próprio.
- **Desabilitado:** `--muted` com cursor padrão. Não há botões desabilitados hoje.
- Alvos de toque com no mínimo 44px.

## Responsividade

Duas composições (ver Grid). A máquina é a mesma; muda o enquadramento da câmera. No celular a câmera fica mais perto e centralizada, e a travessia lateral entre capítulos é mais curta.

## Materiais e luz

| Material | Cor | Parâmetros | Função |
| --- | --- | --- | --- |
| Alumínio escovado | `#B9BCBE` | metalness 0,85, roughness 0,32 | Estrutura, trilhos, suportes |
| Grafite | `#26262A` | metalness 0,2, roughness 0,55 | Regras: placas, portão, desvio |
| Lima laqueado | `#D7F452` | clearcoat 1, roughness 0,25 | A requisição |
| Laranja sinal | `#F2541B` | roughness 0,5 | Exceção: bandeja de revisão |
| Aço | `#8E9296` | metalness 1, roughness 0,2 | Bolinhas dos ramais e do funil |
| Papel térmico | `#F4F1EA` | roughness 0,9 | Fita do rastro |
| Concreto | `--stage` | roughness 0,95 | Parede e chão |

Luz: uma direcional quente de cima e da esquerda (sombras de 1024px, seguindo a câmera), uma hemisférica fria fraca de preenchimento, e um `Environment` com três `Lightformer` retangulares para os reflexos do metal. No capítulo escuro, a direcional some e só os pulsos e uma luz de recorte iluminam os dutos.

## Acessibilidade

- O canvas é `aria-hidden`. Tudo que ele mostra está dito no texto.
- Ordem de leitura = ordem do DOM = ordem do percurso.
- Contraste mínimo 4,5:1 para todo texto.
- O recibo é uma lista de definição (`<dl>`), legível por leitor de tela.
- Foco visível em todos os controles. Link para pular para o conteúdo.

## Performance

- A cena é carregada depois do primeiro desenho, com `next/dynamic` e `ssr: false`. Enquanto carrega, a parede já tem a cor final e o nome já está legível: nunca há tela em branco.
- Geometria procedural, sem modelos baixados, sem texturas.
- `dpr` entre 1 e 1,75. Sombra única de 1024px.
- `frameloop="demand"`: só desenha quando algo mudou.
- Metas: LCP < 2,0s, CLS < 0,05, JS inicial abaixo de 130 KB comprimido sem o palco.

## WebGL e fallback

- Sem WebGL: a cena não monta e o texto ocupa uma coluna central sobre o papel, com o recibo funcionando.
- Erro na inicialização: uma error boundary desmonta o palco e mantém a página.
- Aparelho fraco (memória ≤ 4 GB ou `hardwareConcurrency` ≤ 4): sem sombras e `dpr` 1.

## Critérios de qualidade visual

- Cada tela tem uma coisa dominante.
- Nenhum texto sobre a máquina.
- O palco sempre mostra a estação que o texto explica.
- Sem cartões, pílulas, números de seção, rótulos em caixa alta, gradientes, brilhos ou linhas finas.
