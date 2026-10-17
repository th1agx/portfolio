# DESIGN

A fonte da verdade visual do portfólio do Thiago Antunes. Arquivos irmãos: [ANTI_PATTERNS.md](ANTI_PATTERNS.md), [docs/AENGEL_REA.md](docs/AENGEL_REA.md) (a referência por dentro), [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

---

## 1. A ideia

**O site é uma fita cassete num quarto escuro.** O scroll abre a caixa de acrílico, puxa o encarte e o desdobra painel por painel enquanto a câmera passeia por ele:

| Lugar | Âncora | O que se vê |
| --- | --- | --- |
| Mesa | `intro` (0) | A fita fechada sob o abajur, capa visível pelo acrílico |
| Mesa | `opened` (0,07) | A tampa cai, o encarte sai de dentro da caixa |
| Encarte | `cover` (0,13) | Quem ele é: o nome manuscrito, engenheiro de software |
| Encarte | `spine` (0,19) | O nome na vertical, como na estante |
| Encarte | `tracklist` (0,26) | Lado A e Lado B. Clicar numa faixa toca a faixa |
| Encarte | `back` (0,33) | GitHub e LinkedIn |
| Toca-fitas | `player` (0,42) | A fita sai da caixa num arco, encaixa no toca-fitas tomate, a tampa fecha, o play afunda |
| Mergulho | `dive` (0,50) | A câmera encosta na janela da fita; o corte para dentro acontece no escuro |
| Dentro da fita | `sideA` (0,60) | A fita magnética vira uma pista entre carretéis gigantes; as páginas do Lado A em pé na beira, cada uma com a sua luz |
| A virada | `flip` (0,72) | A câmera gira 180° em torno da fita e a luz passa de quente a fria |
| Dentro da fita | `sideB` (0,84) | Embaixo da fita, as páginas do Lado B |
| Mesa | `end` (1) | De volta à mesa, vista de longe, e "Rebobinar a fita" |

Cada passagem tem uma transição diferente: deslize do encarte, dobradiças, arco até o toca-fitas, corte no escuro, giro da virada, rebobinada com véu.

A experiência segue o Aengel (ver docs/AENGEL_REA.md): **um mundo só** que nunca desmonta, rotas como lugares desse mundo, câmera em curva entre repousos, loader com as etapas reais, véu nos saltos longos, som que só começa no play.

**Sem personagens.** A arte do encarte é tipografia, meio-tom e formas da própria fita (carretéis, fita, estrelas de capa).

---

## 2. Cor: três tintas de risograph

| Token | Valor | Uso |
| --- | --- | --- |
| `--room` | `#0D0C11` | O quarto escuro, fundo de tudo |
| `--paper` | `#F2E8CF` | O papel do encarte e o texto claro |
| `--mustard` | `#F2B630` | Tinta 1: o nome, os destaques, o hover das faixas |
| `--tomato` | `#E0453A` | Tinta 2: a lombada, "Lado A / Lado B", o véu |
| `--navy` | `#1E1F5C` | Tinta 3: a capa e o verso |
| `--line` | `#1A1414` | O traço |

Nenhuma outra cor. A impressão leva grão de papel e desregistro leve (a segunda passada da tinta deslocada).

---

## 3. Tipo

- **Barlow Condensed 800:** a tipografia condensada das capas; títulos, lombada, navegação.
- **Gloria Hallelujah:** a letra manuscrita do título na capa, das descrições das faixas e das legendas.
- **Barlow:** texto de leitura na página da faixa.

---

## 4. Movimento

- Câmera: Catmull-Rom centrípeta entre os repousos, com desaceleração perto de cada âncora e amortecimento exponencial (`1 - e^(-5·dt)`).
- Dobradiças do encarte: cada painel abre quando a câmera chega perto dele (smoothstep em janelas do scroll).
- Legendas: letra a letra, 22 ms por caractere.
- Véu: cobre de baixo para cima em 450 ms (`cut`) e revela para cima em 600 ms (`settle`).
- Reduced motion: a câmera chega sem amortecimento, o véu vira troca de opacidade, a poeira para, o som começa mudo.

---

## 5. Proibido aqui

Cards, pílulas e etiquetas de UI; personagens; cor fora das três tintas; e-mail exposto; texto ou gimmick "anos 2000". Ver ANTI_PATTERNS.md.
