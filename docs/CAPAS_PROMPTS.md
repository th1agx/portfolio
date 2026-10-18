# Capas: como gerar as imagens

Cada capa é uma ilustração que ocupa a tela inteira. O site entra nela com o scroll, como num cartoon, e atravessa um **portal** (janela, porta, tela, túnel) que leva à capa seguinte. A última leva de volta à primeira.

O texto (nome, títulos, números) é posto pelo site. **A imagem não deve ter nenhuma letra.**

---

## Como gerar

- **Ferramenta:** qualquer uma (Midjourney, Flux, Ideogram). Use o mesmo bloco de estilo em todas as capas, para que formem uma série.
- **Formato:** paisagem **4:3**, na maior resolução que a ferramenta der (pelo menos 2048 px de largura).
- **Portal no meio:** o portal de cada capa precisa ficar perto do **centro** e ocupar mais ou menos **um terço da largura**. É por ele que a câmera passa, e no celular a imagem é cortada nas laterais.
- **Gere de 4 a 8 variações por capa** e escolha a mais **estranha e imperfeita**, não a mais bonita. A versão mais lisa e simétrica é justamente a que tem cara de IA.
- **Não use nome de artista** no prompt. O estilo está descrito no bloco abaixo.

### Bloco de estilo (cole no começo de todo prompt)

```
risograph-printed cassette j-card illustration, 1990s underground zine art, hand-inked wobbly brush outlines with uneven line weight, flat spot-color fills, slightly crooked naive perspective, cluttered with small handmade details, a few soft airbrushed gradients, visible paper grain, ink misregistration, slightly grotesque and funny mood, no people, no characters, no faces, no text, no letters
```

### O que evitar (no campo "negative" ou `--no` do Midjourney)

```
people, person, character, face, hands, text, letters, words, logo, watermark, 3d render, glossy, plastic, photorealistic, smooth vector, clean lines, symmetry, bokeh, lens flare
```

No Midjourney, por exemplo:
`<bloco de estilo>, <cena da capa> --ar 4:3 --style raw --no people, character, face, text, letters, 3d render, glossy, symmetry`

---

## As oito capas

A ordem é a da fita. Cada capa tem o seu próprio conjunto de tintas, como cada capa do Febre90's tem a sua cor dominante. Depois o site reduz cada imagem a essas tintas.

| # | Pasta | Cena (cole depois do bloco de estilo) | Portal | Tintas |
| --- | --- | --- | --- | --- |
| 1 | `inicio` | a cramped bedroom desk at night, old CRT monitor glowing with lines of code, a portable cassette player, tangled cables, a lamp, posters on a tomato-red wall, a big window in the center of the wall showing a starry night sky | a janela no centro da parede | tomate, mostarda, azul-noite, creme, preto |
| 2 | `tributax` | an absurd tax office drowning in mountains of invoices and receipts, filing cabinets stacked crookedly, a giant rubber stamp hanging from the ceiling like a moon, a long corridor ending in an arched doorway in the center | a porta em arco no fim do corredor | amarelo, verde, rosa, creme, preto |
| 3 | `devguard` | a lonely checkpoint guard booth at night with a striped barrier, a searchlight beam, checklists and clipboards pinned everywhere, a rubber duck on the counter, the booth's large front window in the center | a janela da guarita | lilás, vermelho, amarelo, creme, preto |
| 4 | `english` | an empty old classroom, wooden desks, floating speech bubbles without text, a globe, a huge chalkboard covered in doodles in the center of the back wall | o quadro negro | verde, laranja, azul-céu, creme, preto |
| 5 | `ipito` | a tiny corner liquor and tobacco shop at night, shelves of oddly shaped bottles, a neon sign shape without letters, a cat-shaped bottle opener, the shop's glass door in the center | a porta de vidro | magenta, mostarda, turquesa, creme, preto |
| 6 | `fh5` | an empty race track at dusk, a race car driving itself with nobody inside, piles of tires, checkered flags, curbs, the track entering a tunnel mouth in the center | a boca do túnel | laranja, azul, amarelo, creme, preto |
| 7 | `3dlab` | a messy workshop where software is assembled like furniture, shelves of labeled boxes without text, a conveyor belt, blueprints on the wall, tools, a huge monitor in the center showing a blue screen | o monitor grande | vermelho, azul, amarelo, creme, preto |
| 8 | `contato` | a rainy street at night, a public phone booth glowing, a red mailbox, puddles reflecting lights, the phone booth's glass door in the center | o vidro da cabine | azul-noite, mostarda, vermelho, creme, preto |

O portal da capa 8 leva de volta à capa 1.


---

## Prompts prontos (copie e cole)

Cada prompt já tem o estilo, a cena, as cores e os parâmetros do Midjourney. Em outra ferramenta, apague a parte que começa em `--ar` e cole a lista que vem depois de `--no` no campo de negative prompt.

### 1. inicio

```
risograph-printed cassette j-card illustration, 1990s underground zine art, hand-inked wobbly brush outlines with uneven line weight, flat spot-color fills, slightly crooked naive perspective, cluttered with small handmade details, a few soft airbrushed gradients, visible paper grain, ink misregistration, slightly grotesque and funny mood, no people, no characters, no faces, no text, no letters, a cramped bedroom desk at night, old CRT monitor glowing with lines of code, a portable cassette player, tangled cables, a lamp, posters on a tomato-red wall, a big window in the center of the wall showing a starry night sky, limited palette of tomato red, mustard yellow, midnight blue, cream and black --ar 4:3 --style raw --no people, person, character, face, hands, text, letters, words, logo, watermark, 3d render, glossy, plastic, photorealistic, smooth vector, clean lines, symmetry, bokeh, lens flare
```

### 2. tributax

```
risograph-printed cassette j-card illustration, 1990s underground zine art, hand-inked wobbly brush outlines with uneven line weight, flat spot-color fills, slightly crooked naive perspective, cluttered with small handmade details, a few soft airbrushed gradients, visible paper grain, ink misregistration, slightly grotesque and funny mood, no people, no characters, no faces, no text, no letters, an absurd tax office drowning in mountains of invoices and receipts, filing cabinets stacked crookedly, a giant rubber stamp hanging from the ceiling like a moon, a long corridor ending in an arched doorway in the center, limited palette of lemon yellow, grass green, bubblegum pink, cream and black --ar 4:3 --style raw --no people, person, character, face, hands, text, letters, words, logo, watermark, 3d render, glossy, plastic, photorealistic, smooth vector, clean lines, symmetry, bokeh, lens flare
```

### 3. devguard

```
risograph-printed cassette j-card illustration, 1990s underground zine art, hand-inked wobbly brush outlines with uneven line weight, flat spot-color fills, slightly crooked naive perspective, cluttered with small handmade details, a few soft airbrushed gradients, visible paper grain, ink misregistration, slightly grotesque and funny mood, no people, no characters, no faces, no text, no letters, a lonely checkpoint guard booth at night with a striped barrier, a searchlight beam, checklists and clipboards pinned everywhere, a rubber duck on the counter, the booth's large front window in the center, limited palette of lavender, red, yellow, cream and black --ar 4:3 --style raw --no people, person, character, face, hands, text, letters, words, logo, watermark, 3d render, glossy, plastic, photorealistic, smooth vector, clean lines, symmetry, bokeh, lens flare
```

### 4. english

```
risograph-printed cassette j-card illustration, 1990s underground zine art, hand-inked wobbly brush outlines with uneven line weight, flat spot-color fills, slightly crooked naive perspective, cluttered with small handmade details, a few soft airbrushed gradients, visible paper grain, ink misregistration, slightly grotesque and funny mood, no people, no characters, no faces, no text, no letters, an empty old classroom, wooden desks, floating speech bubbles without text, a globe, a huge chalkboard covered in doodles in the center of the back wall, limited palette of bottle green, orange, sky blue, cream and black --ar 4:3 --style raw --no people, person, character, face, hands, text, letters, words, logo, watermark, 3d render, glossy, plastic, photorealistic, smooth vector, clean lines, symmetry, bokeh, lens flare
```

### 5. ipito

```
risograph-printed cassette j-card illustration, 1990s underground zine art, hand-inked wobbly brush outlines with uneven line weight, flat spot-color fills, slightly crooked naive perspective, cluttered with small handmade details, a few soft airbrushed gradients, visible paper grain, ink misregistration, slightly grotesque and funny mood, no people, no characters, no faces, no text, no letters, a tiny corner liquor and tobacco shop at night, shelves of oddly shaped bottles, a neon sign shape without letters, a cat-shaped bottle opener, the shop's glass door in the center, limited palette of magenta, mustard, turquoise, cream and black --ar 4:3 --style raw --no people, person, character, face, hands, text, letters, words, logo, watermark, 3d render, glossy, plastic, photorealistic, smooth vector, clean lines, symmetry, bokeh, lens flare
```

### 6. fh5

```
risograph-printed cassette j-card illustration, 1990s underground zine art, hand-inked wobbly brush outlines with uneven line weight, flat spot-color fills, slightly crooked naive perspective, cluttered with small handmade details, a few soft airbrushed gradients, visible paper grain, ink misregistration, slightly grotesque and funny mood, no people, no characters, no faces, no text, no letters, an empty race track at dusk, a race car driving itself with nobody inside, piles of tires, checkered flags, curbs, the track entering a tunnel mouth in the center, limited palette of orange, cobalt blue, yellow, cream and black --ar 4:3 --style raw --no people, person, character, face, hands, text, letters, words, logo, watermark, 3d render, glossy, plastic, photorealistic, smooth vector, clean lines, symmetry, bokeh, lens flare
```

### 7. 3dlab

```
risograph-printed cassette j-card illustration, 1990s underground zine art, hand-inked wobbly brush outlines with uneven line weight, flat spot-color fills, slightly crooked naive perspective, cluttered with small handmade details, a few soft airbrushed gradients, visible paper grain, ink misregistration, slightly grotesque and funny mood, no people, no characters, no faces, no text, no letters, a messy workshop where software is assembled like furniture, shelves of blank boxes, a conveyor belt, blueprints on the wall, tools, a huge monitor in the center showing a blue screen, limited palette of red, royal blue, yellow, cream and black --ar 4:3 --style raw --no people, person, character, face, hands, text, letters, words, logo, watermark, 3d render, glossy, plastic, photorealistic, smooth vector, clean lines, symmetry, bokeh, lens flare
```

### 8. contato

```
risograph-printed cassette j-card illustration, 1990s underground zine art, hand-inked wobbly brush outlines with uneven line weight, flat spot-color fills, slightly crooked naive perspective, cluttered with small handmade details, a few soft airbrushed gradients, visible paper grain, ink misregistration, slightly grotesque and funny mood, no people, no characters, no faces, no text, no letters, a rainy street at night, a public phone booth glowing, a red mailbox, puddles reflecting lights, the phone booth's glass door in the center, limited palette of midnight blue, mustard, red, cream and black --ar 4:3 --style raw --no people, person, character, face, hands, text, letters, words, logo, watermark, 3d render, glossy, plastic, photorealistic, smooth vector, clean lines, symmetry, bokeh, lens flare
```

---

## Onde colocar

Salve cada imagem escolhida como `public/capas/<pasta>/capa.png`, por exemplo `public/capas/tributax/capa.png`.

Depois me avise. Eu olho cada imagem e cuido do resto:
- marco o retângulo exato do portal;
- gero o **mapa de profundidade**, que faz a imagem ganhar volume enquanto a câmera entra;
- ajusto as tintas de cada capa.
