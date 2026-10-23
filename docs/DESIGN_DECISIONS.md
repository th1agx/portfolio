# Decisões de design

## Estado do repositório (fase A)

- A árvore de trabalho foi apagada pelo Thiago antes desta rodada. O último commit tinha uma versão em Vite com a fita cassete; nada dela é reaproveitado além do logo (`public/brand`).
- Começa do zero, com a stack do briefing.
- Já existem em `src/`, ainda sem interface: tokens CSS, store da rolagem (`src/experience/store.ts`), geometria do percurso (`src/experience/cena/percurso.ts`) e dados de conteúdo. Esses arquivos serão revistos depois da aprovação; `src/content/icms.ts` será removido porque o seletor de ICMS saiu do conceito.

## O material verificado

Levantado nos repositórios públicos de `github.com/th1agx` em 2026-10-21.

| Fato | Fonte |
| --- | --- |
| Tributax é um motor de decisão tributária: recebe uma operação e devolve cada tributo com valor, base, fundamento legal e o rastro de regras aplicadas e descartadas | README e ADR-007 do Tributax |
| Regras ficam no banco como dados declarativos com fundamento legal; lei nova não exige deploy | ADR-004 |
| Regra não conferida volta marcada como `NEEDS_REVIEW`; regra não encontrada nunca vira imposto zero | README |
| Um agente de IA cria só rascunhos de regra; aprovar exige chave de administrador | README, ADR-012 |
| TypeScript estrito, NestJS, Drizzle, Postgres 16; 208 testes; 15 ADRs; servidor MCP | README, `docs/adr` |
| Tributax **não emite** notas fiscais | README |
| DevGuard: workflow para agentes de IA (mapear, especificar, planejar, construir, testar, revisar, entregar com evidência), com scripts Python e Node; licença MIT | README do devguard-skill |
| 3D Lab: estagiário de Tecnologia e Processos de 03/2026 a 06/2026; engenheiro de software júnior desde 06/2026; ERP interno, integrações via API, JavaScript, PHP, Laravel, Python, IA aplicada | README do perfil |
| Sistema de Gerenciamento de Produtos foi o desafio técnico da vaga de estágio na 3D Lab | README do repositório |
| English Learning Experience é o site do CEFF Education (aulas de inglês), em React, GSAP, Framer Motion e Lenis, organizado em MVC | README do repositório |
| FH5 Auto Drive foi escrito com Samuel Felix | README do repositório |
| Contato: thiagofsprofissional@gmail.com, linkedin.com/in/thiagofilipeantunes, github.com/th1agx | README do perfil |

**Não confirmado:** tempo de emissão de 2 a 5 minutos para 17 segundos e 10 mil notas por mês. Não aparece em nenhum repositório. Fica fora.

## Três conceitos (fase C)

### A. Percurso: a máquina que processa uma requisição

**Metáfora.** Uma requisição (uma bolinha lima) atravessa uma máquina física. Cada mecanismo é um trabalho do Thiago e decide algo sobre ela: uma regra escolhe o caminho, uma verificação segura a passagem, uma caixa de integração a distribui, ramais levam a outros projetos. Na saída, a máquina imprime o rastro do caminho.

**Ambiente.** Um estúdio claro: parede e chão de concreto quente, luz direcional de cima com sombras reais. A máquina em alumínio escovado e grafite, com peças em laranja só onde existe exceção.

**Como o 3D funciona.** Um mundo só, em tela cheia, atrás de todo o conteúdo. Uma câmera que acompanha a bolinha e muda de enquadramento por capítulo: ora a máquina à esquerda e o texto à direita, ora o contrário. Entre capítulos, a rampa atravessa a tela de um lado ao outro, e a bolinha cruza o espaço onde estava o texto.

**O que a rolagem muda.** A posição da bolinha no caminho, o estado de cada mecanismo (desvio, portão, prensa, impressora), o enquadramento da câmera e, em um capítulo, a atmosfera inteira (a câmera entra na caixa de integração e o interior escuro vira o capítulo).

**Conteúdo.** Texto real no DOM, composto na área livre de cada enquadramento. Nenhuma coluna fixa.

**Projetos sem cartões.** Cada projeto principal é um mecanismo. Os menores são ramais laterais; tocar o nome solta uma bolinha de aço naquele ramal.

**Fim.** A câmera recua e mostra a máquina inteira pela primeira vez. A impressora entrega o rastro da visita, com o contato no pé.

**Complexidade e riscos.** Média-alta. Geometria procedural, sem modelos baixados. Riscos: virar brinquedo (mitigado por mecanismos com função e texto técnico curto); custo de GPU no celular (renderização sob demanda, sombra única, enquadramento menor).

**Por que serve ao Thiago.** É a forma do trabalho dele: entrada, regra explícita, verificação, integração, saída que explica o caminho.

**Referências.** Igloo (metáfora única que decide o mundo; revelação final), Lusion (material, luz, um elemento que costura a página), Zentry (objeto que vira ambiente; capítulo com campo próprio; tudo reversível na rolagem).

### B. Módulos: as mesmas peças, sistemas diferentes

**Metáfora.** Um conjunto fixo de módulos físicos (como blocos de hardware, cada um com uma função: entrada, regra, teste, fila, conector, saída) que se reorganizam a cada capítulo. No começo estão soltos numa pilha que reage ao cursor. A rolagem monta com eles o motor do Tributax, depois o portão do DevGuard, depois o hub da 3D Lab. No fim, eles se alinham numa régua que forma o contato.

**Ambiente.** Fundo de campo de cor por capítulo, módulos em plástico fosco com uma face colorida por função.

**3D e rolagem.** A rolagem interpola a posição de cada módulo entre configurações. O cursor empurra módulos na pilha inicial.

**Conteúdo e projetos.** Texto ao lado de cada configuração; os projetos menores são configurações pequenas que o visitante monta ao tocar.

**Fim.** Os módulos formam uma régua com nome e contato.

**Complexidade e riscos.** Média. Risco alto de parecer "cubos aleatórios" (anti-pattern) se a função de cada módulo não for legível. Muito próximo da pilha de peças do Lusion e dos blocos do Igloo.

**Referências.** Igloo (peças que mudam de papel), Lusion (pilha física com cursor), Teenage Engineering (módulos com cor por função).

### C. Fio: um rastro contínuo

**Metáfora.** Um único cabo é o rastro de uma decisão. Ele nasce no nome do Thiago e desce pela página inteira: dá um nó onde há uma regra, se divide onde há um desvio, passa por anéis de verificação, se conecta a tomadas de outros sistemas e termina escrevendo o contato.

**Ambiente.** Página clara, cabo grosso em 3D com material emborrachado, sombra no fundo.

**3D e rolagem.** O cabo é desenhado progressivamente pela rolagem e a câmera acompanha a ponta. Quadros em perspectiva se abrem para cenas de projeto, com o cabo passando por dentro.

**Conteúdo e projetos.** O texto fica ao longo do cabo; cada projeto é um trecho com forma própria.

**Fim.** O cabo escreve o e-mail.

**Complexidade e riscos.** Média. Muito próximo do tubo azul do Lusion. Cabo e nós lembram "rede" e "conexões", a metáfora genérica de tecnologia que o briefing proíbe.

**Referências.** Lusion (tubo contínuo), Zentry (quadros que se abrem).

### Comparação

| Critério | A. Percurso | B. Módulos | C. Fio |
| --- | --- | --- | --- |
| Metáfora vem do trabalho do Thiago | Sim: decisão com rastro, verificação, integração | Em parte: composição de sistemas | Em parte: rastro, mas cabo é genérico |
| 3D estrutural (sem ele, a ideia some) | Sim | Sim | Sim |
| Distância das referências | Boa: nenhuma delas é uma máquina de percurso | Fraca: pilha do Lusion e blocos do Igloo | Fraca: tubo do Lusion |
| Clareza para quem não é técnico | Alta: dá para ver a bolinha sendo decidida | Média: precisa ler a função de cada módulo | Média |
| Interações com sentido | Soltar a requisição; escolher um ramal | Montar configurações | Poucas |
| Risco de anti-pattern | Brinquedo | Cubos aleatórios | Rede de conexões |
| Celular | Bom: a máquina é vertical como a tela | Médio | Bom |
| Custo técnico | Médio-alto | Médio | Médio |

**Escolha: A. Percurso.** É o único em que a forma do site é a forma do trabalho: uma entrada atravessa regras explícitas e sai com explicação. É também o mais distante das três referências principais, o que garante que o resultado seja próprio. B entra como princípio dentro de A: a primeira cena tem uma pequena pilha de bolinhas no funil que reage ao cursor, e a mesma bolinha de aço que fica no funil reaparece nos ramais.

**O teste central.** Sem o 3D, o site perde a ideia: o visitante não vê a regra escolhendo o caminho, o portão segurando a passagem, a integração distribuindo, nem o rastro sendo impresso. O texto sozinho vira um currículo.

## Progressão (fase D)

| Capítulo | Câmera | Mecanismo e estado | Texto (onde fica) | Interação |
| --- | --- | --- | --- | --- |
| Entrada | Três quartos, funil no alto à direita | Bolinhas de aço no funil com a lima por cima, reagindo ao cursor | Nome em display condensado na parede livre, embaixo à esquerda; uma frase | Botão "Soltar a requisição" ou rolar |
| Travessia | Acompanha a bolinha | Rampa cruza a tela da direita para a esquerda | Nenhum | Rolar |
| Tributax | Máquina à esquerda | A bolinha cai entre placas de regra, um desvio escolhe a calha; uma bandeja laranja ao lado recebe o caso sem regra conferida. Uma prensa carimba a bolinha (anel grafite que ela leva até o fim). A impressora começa a soltar a fita do rastro | À direita: problema, a decisão de engenharia, link | Nenhuma além de rolar |
| DevGuard | Máquina à direita | Portão fechado com três sensores (teste, prova de fumaça, revisão). Acendem com a rolagem; com os três acesos, o portão abre | À esquerda: a ideia em um parágrafo, link | Rolar |
| 3D Lab | A câmera entra na caixa de integração | O interior escuro vira o capítulo: dutos saem para as paredes e pulsos de luz correm por eles | Sobre a parede escura do interior, texto claro em primeira pessoa | Rolar |
| Desvios | Recua um pouco; espinha central com quatro ramais | Ramais com uma bolinha de aço cada | Nomes dos projetos ao lado dos ramais | Tocar um nome solta a bolinha daquele ramal e abre a descrição |
| Saída | Recua até mostrar a máquina inteira | A lima cai na bandeja; a fita termina na impressora | Recibo do percurso com contato | Escrever, LinkedIn, GitHub, soltar de novo |

**Rolagem e estado.** Uma única variável contínua (posição no percurso) é calculada a partir da rolagem nativa pelo ScrollTrigger. Bolinha, mecanismos e câmera são funções dessa variável. Subir a página desfaz exatamente o que a descida fez; recarregar no meio da página reconstrói o estado na hora.

## Excluído de propósito

- Seções de currículo, cartões, pílulas, números de seção.
- Calculadora de ICMS, seletor de estado, payloads, respostas de API, prints de documentação, listas de etapas do DevGuard.
- Texto dentro do canvas.
- Rolagem virtual, Lenis, física em tempo real no percurso (só a pilha inicial tem uma simulação leve).
- Pós-processamento pesado.
- O passado musical e a métrica não confirmada.

## Stack

| Peça | Versão | Por quê |
| --- | --- | --- |
| Next.js (App Router, export estático) | 16.4 | HTML real para todo o conteúdo; exporta arquivos estáticos |
| React | 19.3 | Requisito do Next e do R3F |
| TypeScript | 7.0 | Tipos do conteúdo e da cena |
| three + @react-three/fiber | 0.186 / 9.8 | Mundo 3D declarativo integrado ao React |
| @react-three/drei | 10.7 | `Environment` com `Lightformer` para reflexos de estúdio sem HDR |
| GSAP + ScrollTrigger + @gsap/react | 3.15 / 2.1 | Progresso de rolagem com limpeza automática |
| zustand | 5.0 | Store mínimo entre DOM e cena, lido no `useFrame` |
| Playwright | 1.64 | Testes de navegação e prints |

## Tipografia testada

Três pares foram renderizados em tamanho real sobre o fundo do projeto (nome a 112px, título a 40px, texto a 18px, nota a 14px):

- **Archivo** (eixo de largura): display a 62% de largura, peso 800; texto a 100%, peso 400. Firme, industrial, o nome cabe numa linha. **Escolhido.**
- Instrument Sans (75%, 700): parecido, mais macio, menos personalidade no texto.
- Funnel Display + Funnel Sans: arredondada e amigável demais para o assunto; o nome quebra em duas linhas.

Uma família, duas vozes pela largura.

## Decisões que não mudam sem justificativa concreta

1. A bolinha lima é a requisição e o único objeto lima da cena.
2. Texto nunca sobre mecanismo; sempre na área livre do enquadramento.
3. O recibo só mostra o que aconteceu na visita.
4. Um mundo, uma câmera, nenhum corte.
5. Nenhum número sem fonte.

## Taste-skill

- Sorteio (seed 714108180): "split stage". O princípio aproveitado é o da metade que muda conforme a seção; a divisão fixa em duas colunas foi abandonada por pedido do Thiago (o 3D tem de ser estrutural).
- Tipografia sorteada (Boska, depois Besley com Libre Franklin) substituída pelo teste acima.
- Paleta sorteada: proporções mantidas, cores tiradas do assunto.
- A regra da skill de animar a entrada de cada seção não se aplica: quem se move é a máquina.
