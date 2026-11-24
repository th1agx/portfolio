<div align="center">

<a href="https://th1agx.github.io/portifolio/"><img src="docs/readme/banner.svg" alt="Thiago Antunes, engenheiro de software. O retrato meio humano, meio robô, com a trilha de luz e as curvas de nível do topo do site." width="100%"></a>

<br>

[![Ver o site](https://img.shields.io/badge/ver_o_site-th1agx.github.io%2Fportifolio-0000F0?style=for-the-badge&labelColor=000080)](https://th1agx.github.io/portifolio/)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Thiago_Filipe-0000F0?style=for-the-badge&labelColor=000080&logo=linkedin&logoColor=E8EDF5)](https://www.linkedin.com/in/thiagofilipeantunes)
[![Publicação](https://img.shields.io/github/actions/workflow/status/th1agx/portifolio/pages.yml?style=for-the-badge&label=pages&labelColor=000080&color=0000F0)](https://github.com/th1agx/portifolio/actions/workflows/pages.yml)

<br>

<img src="docs/readme/retrato.gif" alt="O cursor passa pelo rosto e uma mancha líquida revela a versão robô por baixo da foto." width="80%">

<sub>O topo do site: onde o cursor passa, uma tinta líquida simulada na placa de vídeo revela o robô por baixo do rosto.</sub>

</div>

<br>

Este é o portfólio de **Thiago Antunes**, engenheiro de software na 3D Lab, em Belo Horizonte. Não é uma página com seções empilhadas. É **um passeio só**, contado pela rolagem: começa num retrato meio humano, meio robô, desce por um vale lunar onde cada camada da stack é um farol aceso, sobe para o céu onde os projetos flutuam, olha para trás o caminho percorrido e mergulha num túnel até o contato.

O site defende uma ideia: **sistemas que se explicam**. É a mesma regra dos projetos: o Tributax devolve cada cálculo com a regra aplicada e o fundamento legal, a MNEME não aceita estratégia sem prova em dados que nunca viu, e o DevGuard só deixa um agente de IA entregar com evidência. Por isso cada parte do site também mostra o próprio mecanismo: nada de vídeo pronto, tudo é desenhado ao vivo e reage à rolagem e ao cursor.

<img src="docs/readme/divisor.svg" width="100%" alt="">

<img src="docs/readme/titulo-ideia.svg" width="100%" alt="A ideia">

**Uma câmera, um mundo, uma linha de luz.** Cada seção nasce do que a anterior deixou na tela. Não há corte reto entre partes, nem fade de "apagar a luz":

- o azul do topo vira o céu do vale;
- a câmera do vale ergue os olhos e os projetos já estão lá em cima;
- os riscos de velocidade se dissolvem nas partículas da matriz;
- no fim dos projetos, a câmera vira e olha o caminho que percorreu; esse caminho, visto de cima, vira a trilha que guia pela trajetória;
- a trilha termina no centro da tela, onde o túnel abre.

**O conteúdo é real.** As camadas do vale, os projetos e as datas da trajetória vêm do README do perfil e dos repositórios. Os textos dizem o que cada coisa faz, sem adjetivo vazio.

**O robô é o guia.** Um robô modelado no código (sem arquivo 3D pronto) acompanha a leitura: senta nos títulos, acena nos faróis, voa em arco de um cartão para o outro e é ele quem entra no túnel.

<img src="docs/readme/divisor.svg" width="100%" alt="">

<img src="docs/readme/titulo-passeio.svg" width="100%" alt="O passeio">

<table>
<tr>
<td width="50%" valign="top">
<img src="docs/readme/abertura.gif" width="100%" alt="A tela de abertura: a íris mecânica do olho robótico calibrando enquanto o site carrega.">

**Abertura.** Um close no olho robótico do retrato. A íris mecânica é desenhada inteira num shader, num Worker com `OffscreenCanvas`, e o anel de calibração segue o carregamento real das cenas. Quando tudo está pronto, o diafragma foca e a câmera recua até o enquadramento do topo.
</td>
<td width="50%" valign="top">
<img src="docs/readme/vale.gif" width="100%" alt="O vale lunar em raymarch, com faróis de luz que mostram cada camada da stack.">

**Vale lunar.** Um terreno em raymarch (WebGL 2 puro) iluminado pela lua, com estrelas e o cursor como lanterna. Cada farol é uma camada de como o Thiago constrói (ERP, back-end, dados, IA e agentes, front-end, entrega), com a stack e a regra de arquitetura presas ao alto da coluna de luz.
</td>
</tr>
<tr>
<td width="50%" valign="top">
<img src="docs/readme/salto.gif" width="100%" alt="A câmera do vale olha para o céu, os riscos de luz se dissolvem e os projetos aparecem.">

**O salto.** A câmera ergue os olhos e as estrelas viram riscos de velocidade. Uma frente de luz vem do fundo do espaço e a matriz de pontos nasce atrás dela. Só depois chegam as imagens dos projetos.
</td>
<td width="50%" valign="top">
<img src="docs/readme/projetos.gif" width="100%" alt="O mundo dos projetos: capas em profundidade, parede de imagens, grade de pontos e riscos.">

**Projetos.** Um mundo em profundidade no modelo do sztanki.com/work: capas em matriz de pontos, parede de imagens azuladas e chuva de pontos. A câmera para diante de cada capa. Clicar abre o projeto em cúpula, com a explicação tirada do README, a stack e o link.
</td>
</tr>
<tr>
<td width="50%" valign="top">
<img src="docs/readme/ate-aqui.gif" width="100%" alt="A trilha de luz passando pelos cartões da trajetória, que curvam com a rolagem.">

**Até aqui.** A mesma linha de luz da vista de cima continua e passa por cada cartão da trajetória: Estácio, Engenharia de Software, estágio e cargo de júnior na 3D Lab. Os cartões são desenhados em WebGL e se deformam como na galeria do orchestrated.nl: esticam com a velocidade, abrem em sino no pé da tela e ganham um brilho furta-cor.
</td>
<td width="50%" valign="top">
<img src="docs/readme/tunel.gif" width="100%" alt="O robô voando pelo túnel: costelas de luz, parede de símbolos de código, portais e riscos de velocidade.">

**Túnel e contato.** O robô mergulha num túnel em cinco trechos (costelas que acendem quando ele passa, parede de símbolos de código, uma sala aberta, portais que giram e um trecho em velocidade), e a saída é luz branca. Ali estão o e-mail e os perfis.
</td>
</tr>
</table>

<img src="docs/readme/divisor.svg" width="100%" alt="">

<img src="docs/readme/titulo-stack.svg" width="100%" alt="Stack">

| Camada | O quê | Para quê |
|---|---|---|
| Base | **Next.js 16** (exportação estática), **React 19**, **TypeScript** | páginas estáticas no GitHub Pages, sem servidor |
| 3D | **three.js 0.186**, **React Three Fiber 9**, **drei**, **postprocessing** | o mundo dos projetos, o túnel, o robô e o retrato |
| Shaders | **GLSL** escrito à mão e **WebGL 2 puro** | o vale em raymarch, os cartões do "Até aqui", a íris da abertura, o fluido do retrato |
| Movimento | **GSAP 3** com **ScrollTrigger**, **Lenis** | a rolagem suave e tudo o que anda preso a ela |
| Fora da thread principal | **Web Worker** + **OffscreenCanvas** | a abertura continua a 60 quadros enquanto a página monta |
| Tipografia | **Cabinet Grotesk** (400, 500, 800) | a mesma fonte no site e nas imagens deste README |
| Ferramentas | **ESLint**, **Playwright** | lint e a conferência visual de cada mudança, rolando o site de verdade |
| Publicação | **GitHub Actions** → **GitHub Pages** | cada push na `main` vira o site no ar |

<details>
<summary><b>Paleta</b></summary>

<br>

| Cor | Hex | Uso |
|---|---|---|
| Deep Blue | `#000080` | áreas grandes: o topo, o céu do vale, o projeto aberto |
| Azul vivo | `#0000F0` | linhas, blocos dos títulos, botões; onde o Deep Blue some sobre o escuro |
| Black | `#050505` | fundo |
| Ice White | `#E8EDF5` | texto principal, a trilha de luz |
| Cool Gray | `#A5A9B4` | texto secundário |

</details>

<img src="docs/readme/divisor.svg" width="100%" alt="">

<img src="docs/readme/titulo-arquitetura.svg" width="100%" alt="Arquitetura">

```
src/
├── app/                              layout, página, tokens de design, fontes, robots e sitemap
├── site/                             as seções (DOM) e quem rege a página
│   ├── Heroi, Ideia, Projetos,       as seções, na ordem do passeio
│   │   Trajetoria, Contato
│   ├── Abertura + aberturaMotor      a íris de carregamento,
│   │   + abertura.worker             desenhada num Worker
│   ├── Rolagem, Temas,               rolagem suave, cor da página,
│   │   Cabecalho, GuiaRobo           menu e robô guia
│   └── fila, tempoGlobal, projecao   montagem das cenas, relógio comum, recorte 3D
├── cena/                             tudo o que é desenhado na placa de vídeo
│   ├── Retrato + fluido              retrato do topo e o fluido que revela o robô
│   ├── lua                           o vale lunar (WebGL 2 puro, raymarch)
│   ├── Obras                         o mundo dos projetos (R3F)
│   ├── ateAqui + trilhaTela          os cartões e a trilha do "Até aqui"
│   ├── Tunel + portalTunel           o túnel e a boca dele na página
│   ├── RoboAgente + Guia             o robô (modelado no código) e o guia
│   └── Precompilar + contexto        shaders prontos antes da hora, contexto WebGL de volta
└── content/                          perfil, projetos e endereço: o conteúdo, separado de quem o mostra
```

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#000080", "primaryTextColor": "#E8EDF5", "primaryBorderColor": "#0000F0", "lineColor": "#8FB0FF", "secondaryColor": "#02031A", "tertiaryColor": "#050505", "fontFamily": "Inter, sans-serif"}}}%%
flowchart LR
    R["Rolagem<br/>Lenis + ScrollTrigger"] --> S["Seções<br/>Heroi · Ideia · Projetos · Trajetoria"]
    S --> T["Temas<br/>cor do html"]
    F["fila<br/>monta uma cena por vez,<br/>quando o visitante para"] --> C["Cenas WebGL<br/>Retrato · lua · Obras · ateAqui · Tunel"]
    C --> P["Precompilar<br/>shaders e texturas<br/>antes de aparecer"]
    P -- "pronta" --> F
    C -. "contexto perdido" .-> X["contexto<br/>refaz a cena"]
    O["Obras<br/>vista de cima"] -- "trilhaTela<br/>onde a linha está" --> A["ateAqui<br/>a linha continua"]
    W["Worker<br/>íris da abertura"] -- "tempoGlobal" --> RT["Retrato<br/>mesma fase"]
```

**Decisões que seguram o desempenho:**

- **Uma cena pesada por vez.** O retrato é a única cena que aparece logo. As outras (vale, projetos, túnel, cartões) entram numa fila e só montam quando o visitante para de mexer, para a compilação de shaders nunca cair no meio de uma animação. Se ele chegar perto de uma cena antes, ela passa na frente (`src/site/fila.ts`).
- **Nada compila na hora de aparecer.** O three.js só compila um material na primeira vez que ele é desenhado, e isso travava a rolagem por até 1 s. Por isso os shaders compilam em paralelo (`KHR_parallel_shader_compile`) e as texturas sobem uma por vez, logo depois de a cena montar (`src/cena/Precompilar.tsx`).
- **A abertura fora da thread principal.** A íris roda num Worker com `OffscreenCanvas`, então continua fluida enquanto o React hidrata e as cenas montam. Um relógio comum (`tempoGlobal`) garante que o último quadro dela e o primeiro do retrato estejam na mesma fase.
- **Contexto WebGL perdido não vira tela branca.** Se o navegador tirar a placa de vídeo do canvas (muitas abas, memória acabando), a cena é refeita do zero quando o contexto volta (`src/cena/contexto.tsx`).
- **Nitidez de verdade.** As cenas desenham na densidade real da tela, até 2x, e os pontos são medidos em pixels do aparelho. O vale só baixa a resolução se cair abaixo de 30 quadros por segundo, e no máximo até 75%.
- **Cenas que conversam sem acoplamento.** Quando uma passagem precisa casar duas cenas, uma escreve num objeto pequeno e a outra lê. É assim que a linha dos projetos vista de cima continua no "Até aqui" no mesmo ponto da tela e com a mesma espessura (`src/cena/trilhaTela.ts`).
- **A cor da página não briga com a rolagem.** O fundo e o texto são calculados a cada quadro pela posição da rolagem, a partir do tema de cada seção (`data-tema`), em vez de vários tweens no mesmo elemento (`src/site/Temas.tsx`).

**Acessibilidade:**
- com movimento reduzido, a rolagem fica nativa e a abertura não aparece;
- há um link para pular direto ao conteúdo;
- os títulos e os projetos têm versão em texto para leitores de tela, com os mesmos links das capas;
- o projeto aberto é um diálogo de verdade: fecha com Esc e devolve o foco ao lugar de onde veio.

<img src="docs/readme/divisor.svg" width="100%" alt="">

<img src="docs/readme/titulo-referencias.svg" width="100%" alt="Referências">

Cada parte partiu de um site de referência, **estudado no código** (bundles baixados e lidos, medidas tiradas com o site rodando) e **refeito do zero**: os mecanismos foram reimplementados, nada foi copiado.

| Referência | O que veio dela |
|---|---|
| [landonorris.com](https://landonorris.com) | o retrato que revela outra versão onde o cursor passa, o cartão que viaja do topo para a seção seguinte, a entrada dos títulos com o bloco que encolhe, a borda curva entre seções |
| [sztanki.com/work](https://www.sztanki.com/work/) | o mundo dos projetos: a grade de 3 × 2 células, o caminho da câmera, a parede de imagens até 400 de fundura, as linhas de pontos |
| [orchestrated.nl](https://orchestrated.nl) | o chão de pedra com a lanterna do cursor, que virou o vale, e a deformação dos cartões da galeria, que virou o "Até aqui" |
| [lusion.co](https://lusion.co) | a base de medidas, espaçamentos e escala tipográfica dos tokens de design |
| [zentry.com](https://zentry.com) | o recorte de um quadro projetado em 3D, com cantos arredondados |

As anotações de cada estudo estão em [`docs/`](docs/): [engenharia reversa](docs/ENGENHARIA_REVERSA.md), [mecanismos das referências](docs/REFERENCIAS_MECANISMOS.md), [sistema de design](docs/DESIGN_SYSTEM.md) e [decisões de design](docs/DESIGN_DECISIONS.md).

<img src="docs/readme/divisor.svg" width="100%" alt="">

<img src="docs/readme/titulo-rodar.svg" width="100%" alt="Rodar e publicar">

Para rodar no seu computador (Node 22 ou mais novo):

```bash
npm install
```

```bash
npm run dev
```

O site abre em `http://localhost:3000`. Para gerar a versão estática que vai para o ar:

```bash
npm run build
```

```bash
npm start
```

**Publicação.** Cada push na `main` roda o workflow [`pages.yml`](.github/workflows/pages.yml): `npm ci`, `next build` com `output: 'export'` e o envio da pasta `out` para o GitHub Pages. O caminho base vem do nome do repositório (`/${{ github.event.repository.name }}`), então o site continua funcionando se o repositório for renomeado.

**As imagens deste README** são geradas pelo próprio projeto:
- os títulos e o banner animados saem de [`tools/readme-svg.py`](tools/readme-svg.py), com a fonte do site embutida;
- os GIFs saem de [`tools/readme-gif.py`](tools/readme-gif.py), a partir de quadros do site publicado capturados rolando com o mouse.

<img src="docs/readme/divisor.svg" width="100%" alt="">

<div align="center">

<img src="docs/readme/contato.gif" width="60%" alt="A saída do túnel em luz branca, com o e-mail e os perfis.">

**[thiagofsprofissional@gmail.com](mailto:thiagofsprofissional@gmail.com)** · [GitHub](https://github.com/th1agx) · [LinkedIn](https://www.linkedin.com/in/thiagofilipeantunes)

<sub>Textura do vale: Rocks Ground 02, do Poly Haven (CC0). Fonte: Cabinet Grotesk, da Indian Type Foundry (Fontshare).</sub>

</div>
