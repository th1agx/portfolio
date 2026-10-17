# DESIGN

A fonte da verdade visual do portfólio do Thiago Antunes. Arquivos irmãos: [ANTI_PATTERNS.md](ANTI_PATTERNS.md), [docs/AENGEL_REA.md](docs/AENGEL_REA.md) (a referência por dentro), [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

---

## 1. A ideia

**O site é uma fita cassete num quarto escuro.** O scroll abre a caixa de acrílico, puxa o encarte e o desdobra painel por painel enquanto a câmera passeia por ele:

| Ponto da viagem | Âncora | O que se vê |
| --- | --- | --- |
| Entrada | `intro` (0) | A fita fechada sob a luz do abajur, capa visível pelo acrílico |
| Abrir | `opened` (0,14) | A tampa cai, o encarte sai de dentro da caixa |
| Capa | `cover` (0,28) | Quem ele é: o nome manuscrito, engenheiro de software |
| Lombada | `spine` (0,42) | O nome na vertical, como na estante, e os créditos |
| Faixas | `tracklist` (0,62) | Os projetos como Lado A e Lado B. Clicar numa faixa toca a faixa |
| Verso | `back` (0,84) | GitHub e LinkedIn |
| Fim | `end` (1) | O encarte inteiro aberto ao lado da fita, e "Rebobinar a fita" |

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
