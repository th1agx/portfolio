# Anti-patterns

Lista oficial do que não entra neste portfólio. Cada item diz o padrão, por que ele é ruim, como reconhecer e o que usar no lugar.

**Regra de interpretação.** Nem todo cartão, número, sombra ou hover é ruim por natureza. O critério é intenção. Para usar qualquer recurso desta lista, a decisão precisa estar registrada em `DESIGN_DECISIONS.md` com a função que ele cumpre e o motivo de melhorar o projeto. "Fica bonito" não é motivo.

Verificação automática: `node ~/.claude/skills/taste-skill/scripts/lint.mjs src` e `node ~/.claude/skills/taste-skill/scripts/inspect.mjs <url>`. Verificação humana: `QUALITY_CHECKLIST.md`.

## Visuais

| Padrão | Por que é ruim | Como reconhecer | No lugar |
| --- | --- | --- | --- |
| Gradiente roxo, azul ou multicolor como solução padrão | É a assinatura visual mais comum de página gerada; não diz nada sobre o assunto | `linear-gradient`, `radial-gradient`, `conic-gradient` em fundos, botões ou texto | Cor chapada da paleta. Profundidade só pela luz real do palco |
| Fundo escuro com manchas luminosas | Simula atmosfera sem ter uma ideia | Blobs desfocados, `filter: blur` em formas coloridas, halos | Palco claro com luz de estúdio e sombras de objetos que existem |
| Glassmorphism | Esconde falta de hierarquia atrás de transparência | `backdrop-filter`, fundos `rgba` brancos sobre imagem | Superfícies opacas com degrau de tom |
| Glow, neon, sombra colorida | Chama atenção para o efeito, não para o conteúdo | `box-shadow` colorido, `text-shadow`, emissivo exagerado no 3D | Nenhuma sombra na interface. Emissivo só nas lâmpadas do portão, que acendem com função |
| Texto em gradiente | Ilegível e datado | `background-clip: text` | Tinta chapada |
| Excesso de transparência, blur e camadas | Ruído visual | Mais de uma camada translúcida sobreposta | Uma camada, opaca |
| Emoji como ícone | Infantiliza e não é desenhado | Qualquer emoji na interface | Palavra ou seta tipográfica |
| Ilustração genérica | Não acrescenta significado | Pessoas sorrindo em vetor, laptops flutuando | Prints reais dos projetos, a máquina |
| Objeto 3D genérico para preencher | Tecnologia como enfeite | Esfera, globo, cubo, toro girando sem motivo | Cada peça da máquina é uma estação com função |
| Bolhas, orbes, partículas sem função | Decoração que finge profundidade | Sistemas de partículas, formas flutuantes | Nada. A bolinha é a única esfera e é a requisição |
| Bordas, divisores e sombras em tudo | Fragmenta a página | `border` ou `box-shadow` em quase todo bloco | Espaço e degrau de tom |
| Simetria por conveniência | Centralizar tudo é não decidir | Tudo `text-align: center` e `margin: auto` | Coluna alinhada à esquerda contra o palco |
| Decoração que compete com o conteúdo | O olho vai para o enfeite | Elementos sem conteúdo que chamam atenção | Remover |

## Layout

| Padrão | Por que é ruim | Como reconhecer | No lugar |
| --- | --- | --- | --- |
| Hero centralizado com título, subtítulo e dois botões | É o template padrão | Três elementos centralizados e dois CTAs lado a lado | Nome, uma frase e uma ação que solta a bolinha |
| Três cards idênticos | Iguala coisas que não são iguais | Grid de três colunas com ícone, título e texto | Cada estação com sua composição |
| Mesma composição em todas as seções | Monotonia | Seções trocáveis entre si | Lista de execução, lista ativa, carta, índice, recibo |
| Cards para tudo | Caixa vira estrutura | Fundo, borda e raio em cada informação | Texto direto na coluna |
| Caixas dentro de caixas | Hierarquia confusa | Cartão com cartão dentro | Uma superfície por vez |
| Bento grid por moda | Decoração de layout | Mosaico de cartões de tamanhos variados | Não usar |
| Seções numeradas como decoração | Falsa sofisticação | `01`, `02`, `SECTION 01` | Nomes reais das estações |
| Números gigantes sem função | Número vira ornamento | Algarismos enormes sem dado por trás | Números só quando são dados reais (R$ 420,00, 208 testes) e no tamanho do texto |
| Badges arredondadas de tecnologia | Lista de palavras sem contexto | Pílulas com React, Python, etc. | Tecnologia citada na frase que explica a decisão |
| Pílulas decorativas | Ruído | `border-radius: 999px` em rótulos | Não usar |
| Excesso de linhas finas | Grade de planilha | `hr`, bordas de 1px | Espaço |
| Parede de tecnologias | Não prova nada | Logos ou listas longas de stack | Tecnologia aparece onde foi usada |
| Assimetria aleatória | Finge intenção | Elementos deslocados sem regra | Uma divisão: papel e palco |
| Seções que só trocam de cor | Variação falsa | Mesmo layout com fundo diferente | Mudar a composição |

## Tipografia

| Padrão | Por que é ruim | Como reconhecer | No lugar |
| --- | --- | --- | --- |
| Inter, Roboto ou fonte de sistema por padrão | Não foi uma decisão | `font-family: Inter` sem justificativa | Archivo, escolhida num teste em tamanho real |
| Hierarquia só por título enorme | Página grita e não organiza | Tudo depende do display | Cinco passos tipográficos com papéis definidos |
| Quebras artificiais de título | Falso editorial | `<br>` em títulos para "ficar bonito" | Títulos curtos que cabem em duas linhas |
| Texto inteiro em caixa alta | Ilegível | `text-transform: uppercase` em parágrafos e rótulos | Caixa normal |
| Letras muito espaçadas em rótulos | Tique de template | `letter-spacing` acima de 0,05em | Tracking neutro |
| Muitas famílias | Incoerência | Mais de uma família de texto | Uma família, mono só em código |
| Mono como enfeite | Fantasia de "dev" | Mono em rótulos e navegação | Mono só dentro de `<pre>` e `<code>` reais |
| Palavra de destaque estilizada no título | Tique de IA | Uma palavra em itálico, cor ou serifa diferente | O texto carrega a ênfase |
| Texto de preenchimento e slogan vazio | Não comunica | Frases que servem a qualquer pessoa | Fatos verificáveis |
| Travessão longo (em dash) | Marca de texto gerado | O caractere "—" em qualquer texto visível | Ponto, vírgula, dois-pontos |

## Interação

| Padrão | Por que é ruim | Como reconhecer | No lugar |
| --- | --- | --- | --- |
| Animação de entrada em tudo | Atrasa a leitura | Todo bloco com fade ao entrar | Só a máquina se move |
| Fade-up repetido | Assinatura de template | Mesma animação em cada seção | Não usar |
| Hover com escala exagerada | Brinquedo | `scale(1.05)` ou mais | Mudança de peso, sublinhado ou tom |
| Botões que crescem, brilham ou mudam radicalmente | Ruído | Transições de cor fortes e brilhos | Escurecer levemente o lima |
| Movimento contínuo sem razão | Gasta CPU e atenção | Loops infinitos em repouso | Palco parado quando a bolinha para |
| Cursor customizado | Atrapalha a usabilidade | `cursor: none` com círculo seguindo | Cursor do sistema |
| Scroll hijacking | Tira o controle do visitante | Bibliotecas que interceptam a roda | Rolagem nativa |
| Rolagem horizontal obrigatória | Inacessível | Seções que só andam de lado | Não usar |
| Parallax em tudo | Enjoo e ruído | Camadas em velocidades diferentes em toda parte | A câmera do palco é o único movimento de profundidade |
| Animação que esconde conteúdo | Leitor fica esperando | Texto com `opacity: 0` até um gatilho | Conteúdo visível no HTML desde o início |
| Hover essencial em touch | Celular não tem hover | Informação só aparece no hover | Foco e toque fazem o mesmo que o hover |
| Ignorar `prefers-reduced-motion` | Acessibilidade | Nenhuma media query de movimento | Versão sem viagem para todo movimento |
| Navegação por `window.addEventListener('scroll')` improvisado | Frágil e caro | Listener de scroll controlando a experiência | ScrollTrigger com ciclo de vida limpo |

## Conteúdo

Frases proibidas (e suas equivalentes):

- "Building digital experiences" / "construindo experiências digitais"
- "Passionate developer" / "desenvolvedor apaixonado"
- "Turning ideas into reality" / "transformando ideias em realidade"
- "Crafting seamless experiences" / "criando experiências fluidas"
- "Where innovation meets creativity" / "onde inovação encontra criatividade"
- "Unlock the power of technology" / "desbloqueie o poder da tecnologia"
- "Pixel-perfect solutions" / "soluções perfeitas"
- "Welcome to my digital universe" / "bem-vindo ao meu universo digital"
- "Soluções inovadoras", "código limpo e escalável", "sempre aprendendo", "do conceito ao deploy", "foco em resultados", "transformação digital", "alto impacto", "next level", "elevar", "potencializar", "jornada"

| Padrão | Por que é ruim | No lugar |
| --- | --- | --- |
| Depoimento fictício | Mentira | Nenhum depoimento |
| Métrica sem fonte | Mentira provável | Só números que estão no repositório ou confirmados pelo Thiago |
| Cliente ou logo inventado | Mentira | Nenhum |
| Projeto sem contexto | Não prova nada | Problema, papel, decisão, resultado, limite |
| Competência em adjetivo | Vago | Decisão técnica concreta |
| Exagerar participação ou resultado | Mentira | Dizer o tamanho real do trabalho, inclusive o que é protótipo |
| Passado de produção musical | Decisão do Thiago: apresentar só engenharia | Fora do site |

## Específicos deste projeto

| Padrão | Por que | No lugar |
| --- | --- | --- |
| Texto que só aparece por cima de um modelo 3D de fundo | Já foi rejeitado pelo Thiago: o 3D vira papel de parede | A máquina faz o que o texto diz, no mesmo momento |
| Logo como elemento de herói | Rejeitado | Logo só no favicon e no cabeçalho |
| Circuitos, nós de rede, código verde, sala de controle, galáxia | Metáfora literal e genérica de "tecnologia" | Uma máquina física de decisão com peças de função clara |
| Métrica de 17 segundos e 10 mil notas | Ainda não confirmada no material disponível | Fora do site até o Thiago confirmar a fonte |
| Duas colunas com um canvas decorativo ao lado | Rejeitado pelo Thiago: o 3D vira enfeite | Cena em tela cheia; texto composto na área livre de cada enquadramento |
| Canvas que não muda enquanto o texto rola | O 3D não participa da história | Cada capítulo muda bolinha, mecanismo e câmera |
| Tributax como tutorial: calculadora, seletor de estado, tabela de impostos, payload, resposta da API, print do Swagger | O site é sobre o Thiago, não sobre o motor | O problema, a decisão de engenharia (regra explícita com rastro), um link |
| DevGuard como lista de seis etapas | Vira documentação colada | Um parágrafo com a ideia: só passa com evidência |
| Trechos de README na interface | Texto escrito para outro leitor | Texto curto escrito para quem visita: problema, abordagem, onde ver mais |
| Descrever o Tributax como emissor de notas | Falso: o repositório é um motor de decisão | "Decide e explica tributos" |
| Janela de terminal ou bloco de código decorativo | Fantasia de dev | Nada |
| Rolagem virtual (documento com a altura da tela) | Quebra a rolagem do navegador, o atalho de teclado e a acessibilidade | Rolagem nativa com ScrollTrigger |
