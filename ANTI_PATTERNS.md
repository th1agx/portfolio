# ANTI_PATTERNS

O que deixa um site com cara de IA, e o que fazemos no lugar. Vale para layout, código, texto e movimento. Cada item tem um "em vez disso", porque tirar sem pôr nada deixa a página vazia, e página vazia também tem cara de IA.

Regra de bolso: **se dá para trocar o nome do Thiago pelo de outra pessoa e o elemento continua fazendo sentido, ele não entra.**

---

## Texto

**Travessão (—) em frase de efeito**
- Não: "Código limpo — resultados reais."
- Em vez disso: ponto final, vírgula ou dois pontos. "Thiago Antunes, engenheiro de software em Belo Horizonte."

**Mini título acima do título (eyebrow)**
- Não: `SOBRE MIM` pequeno em caixa alta com espaçamento largo, e embaixo o título.
- Em vez disso: a informação vai no próprio título ou some.

**Frases de LinkedIn genéricas**
- Não: "apaixonado por tecnologia", "transformando ideias em realidade", "soluções inovadoras", "pixel perfect", "elevar", "jornada", "sinergia", "experiências digitais", "Olá, eu sou".
- Em vez disso: o fato. "Escrevo os módulos do ERP da 3D Lab." "O Tributax calcula o imposto de uma NFS-e."

**Trios de adjetivos e listas de três por reflexo**
- Não: "Rápido. Seguro. Escalável."
- Em vez disso: uma afirmação com prova.

**Números inventados**
- Não: "+50 projetos", "100% satisfação", "3 anos de experiência" arredondado para cima.
- Em vez disso: os números reais do GitHub e do currículo, ou nenhum.

**Depoimentos, logos de clientes e prêmios que não existem**
- Nunca. Prova é só o que dá para verificar.

**Emoji em interface**
- Nem no README do site entra emoji como ícone de seção.

---

## Layout

**Hero centralizado com título, subtítulo cinza e dois botões**
- Em vez disso: o nome em display gigante que vira cubos no primeiro scroll (DESIGN.md §3, Entender).

**Cards opacos de qualquer tipo** (caixa com fundo sólido segurando título, texto e botão, em grade ou sozinha)
- Em vez disso: conteúdo direto sobre o campo, separado por espaço ou por um degrau de tom do fundo inteiro.

**Linha de três cards com ícone em cima**
- Em vez disso: o blueprint da seção. Nunca uma grade de cards iguais.

**Sequência padrão hero, sobre, skills, projetos, contato**
- Em vez disso: os sete verbos do método dele, nessa ordem (DESIGN.md §3).

**Seção que só aparece com fade, com um modelo 3D parado no fundo**
- Em vez disso: a ordem do argumento. Cada seção existe porque prova uma coisa.

**Grade de logos de tecnologias (ícones do React, Node, Python...)**
- Em vez disso: a tecnologia aparece dentro da faixa onde foi usada. "Python, FastAPI, deploy no Render" na linha do Tributax.

**Barras de progresso de skill ("Python 90%")**
- Nunca. Não mede nada.

**Linha do tempo vertical com bolinhas**
- Em vez disso: o capítulo Documentar: a página vira papel e a experiência vira documento.

**Numeração decorativa 01 / 02 / 03**
- Em vez disso: posição, tamanho ou um `<ol>` de verdade quando a ordem importa. **Nenhuma numeração de página ou de capítulo** ("01 / 07", "Capítulo 3", contador de progresso com número). Os verbos são o índice.

**Linhas finas, caixas com borda de 1px, grades e cruzinhas de "blueprint"**
- Em vez disso: espaço, ou um degrau de tom (`--bg` para `--surface`).

**Duas seções vizinhas com o mesmo layout**
- Em vez disso: cada seção com composição própria.

---

## Visual

**Degradê**: nem de fundo, nem em botão, nem em texto.
- Em vez disso: cor chapada ou foto real.

**Blobs, orbs, "aurora", glow neon atrás do título**
- Em vez disso: a luz vem da cena de cubos.

**Glassmorphism, `backdrop-filter: blur`, navbar em pílula flutuante**
- Em vez disso: navegação sem barra, texto direto sobre o fundo.

**Sombra em coisa parada**
- Em vez disso: degrau de tom. Sombra só em menu aberto ou diálogo.

**Roxo, índigo, ou creme com terracota**: a paleta padrão de assistente.
- Em vez disso: preto, tinta clara, papel no Documentar, lime só na ação.

**Raio de 12 a 16 px em tudo**
- Em vez disso: quina reta. Um único raio (8 px) no cartão de contato.

**Fonte monoespaçada como "estilo dev"** e etiquetas `// comentário` decorativas
- Em vez disso: as duas fontes do DESIGN.md. Monoespaçada só dentro de `<pre>` com código real (o JSON do Tributax).

**Palavra de destaque no título** (uma palavra em itálico, serifa ou cor diferente)
- Em vez disso: uma fonte, uma cor. As palavras carregam a ênfase.

**Cursor customizado com bolinha que segue o mouse** sem motivo
- Em vez disso: cursor do sistema. Sempre.

**Imagem de banco de pessoa sorrindo no notebook, ilustração 3D genérica de "dev"**
- Nunca. Interface real, BH real, Thiago real.

**Logo como protagonista**
- Em vez disso: a logo TA aparece só no favicon e na navegação.

**Copiar a estética de uma referência inteira**
- O lime + preto é da assinatura dele, mas a Silvia também usa lime em fundo escuro. Para não virar cópia: nada de faixa de risco, ficha "classified", HUD de espécime. Nosso mundo é engenharia de sistemas, não laboratório.

---

## Movimento

**Fade-up igual em todo bloco**
- Em vez disso: entrada por partes (título, texto, imagem) com stagger e curvas nomeadas (DESIGN.md §7).

**Animação que segura o conteúdo** (texto invisível até o JS carregar)
- Em vez disso: conteúdo visível no HTML, animação é camada por cima.

**Scroll sequestrado** (a roda do mouse não rola a página)
- Em vez disso: `position: sticky` e scroll nativo suavizado pelo Lenis.

**Pin longo demais** (mais de 3 telas com a mesma coisa parada)
- Em vez disso: no máximo 3 telas por pin, cada tela com conteúdo novo.

**Parallax em tudo, tilt 3D em card, texto que embaralha (scramble) em todo título**
- Em vez disso: uma surpresa por capítulo, cada uma ligada ao verbo do capítulo.

**Preloader com porcentagem falsa**
- Em vez disso: etapas reais do carregamento ("Carregando fontes", "Calculando o primeiro tributo", "Montando a cena"), como no Aengel. Se carregar em menos de 600 ms, nem aparece.

**Durações aleatórias** (0.3 aqui, 0.5 ali, 0.8 lá)
- Em vez disso: só as quatro durações do DESIGN.md (`fast`, `base`, `slow`, `scene`).

**Marquee infinito com a lista de skills**
- Em vez disso: o infinito do site é o rolo de faixas e o loop "Próxima faixa".

---

## Código

**Componente gigante que faz tudo**: um `Home.tsx` de 800 linhas.
- Em vez disso: view burra, controller com a lógica, model com os dados (docs/ARQUITETURA.md).

**`useEffect` com `addEventListener` espalhado em cada componente**
- Em vez disso: um controller dono de cada evento global, ligado por `useController`.

**Vários `requestAnimationFrame` concorrendo**
- Em vez disso: um relógio só (`FrameController`), todo mundo assina nele.

**Texto do site dentro do JSX**
- Em vez disso: conteúdo em `models/content/pt.ts` e `en.ts`.

**Classe utilitária gerada sem critério** (`mt-[37px]`, `text-[#a3a3a3]`)
- Em vez disso: só tokens do DESIGN.md.

**Biblioteca de componentes pronta** (shadcn, Magic UI, React Bits) para as partes visíveis
- Em vez disso: componentes nossos. Bibliotecas só para infraestrutura (motion, Lenis, three, zustand).

**Comentário que narra o óbvio** (`// incrementa o contador`)
- Em vez disso: comentário só onde a decisão não é óbvia.

---

## Checklist antes de cada entrega

- [ ] Nenhum travessão em texto do site
- [ ] Nenhum eyebrow, nenhuma etiqueta minúscula em caixa alta
- [ ] Nenhum degradê, glow, blur ou sombra parada
- [ ] Todo título em até duas linhas em 1440, 768 e 390 px
- [ ] Accent em no máximo dois elementos por tela
- [ ] Todo texto é verificável no GitHub ou no currículo
- [ ] Toda duração é um token do DESIGN.md
- [ ] Nenhuma numeração de página, nenhum card opaco
- [ ] Logo só no favicon e na navegação
- [ ] `node ~/.claude/skills/taste-skill/scripts/lint.mjs src` sem FAIL
- [ ] `node ~/.claude/skills/taste-skill/scripts/inspect.mjs http://localhost:5173` sem FAIL
- [ ] Teste do concorrente: trocar o nome e ver se ainda faz sentido. Se fizer, refazer.
