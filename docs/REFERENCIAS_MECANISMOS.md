# Mecanismos das referências, lidos no código

Tirado dos scripts baixados (estudo local, nada copiado para o projeto) e de prints rolando cada site.
Para cada parte do portfólio, qual mecanismo serve de base. Lapidar a versão publicada, uma parte por vez.

## Lando Norris (landonorris.com, estúdio OFF+BRAND; Webflow + Lenis + GSAP + Three + Rive)

- **Cabeçalho por seção** (`data-nav-theme`): cada seção diz se o menu fica claro ou escuro; o botão
  (hambúrguer feito em Rive) troca de cor com a seção.
- **Texto com bloco de cor que varre** (`data-anim-high` → `.high-line-reveal`): cada linha começa recortada
  (`clip-path: inset(0 100% 0 0)`) e abre para a direita em 0,6 s (`power2.out`); um bloco lima por cima da
  linha encolhe (`scaleX 1→0`, origem à direita) começando na metade; 0,15 s entre linhas. Dispara uma vez
  ao entrar (`top 90%`).
- **Títulos que abrem em elipse** (`data-oval-scroll`): cada linha num recorte `ellipse(20% 0% at 50% 0%)`
  que cresce até `ellipse(100% 120%)` em 1,5 s (`power2.inOut`); a linha e as letras descem de `-40%` a `0`,
  letras em sequência a partir do centro.
- **Imagem que se revela em elipse** (`data-img-highlight`): recorte `ellipse(120% 0% at 50% 0%)` até
  `ellipse(120% 120%)` e uma elipse lima que sai por baixo; borda sempre curva.
- **Passagem de seção em elipse** (`data-exe-visor`): o bloco seguinte é revelado por
  `ellipse(70% 0% at 50% 0%)` até `ellipse(70% 100%)`, preso à rolagem (`scrub`). Nunca uma linha reta.
- **O objeto que viaja entre seções** (`data-heroflip` + `data-gl="helmet-scroll"`): o capacete 3D (e a foto
  do topo) segue um caminho curvo (`motionPath`, bézier) por três posições marcadas no layout (`pos1`,
  `pos2`, `pos3`), mudando de tamanho entre elas, preso à rolagem; troca de imagem conforme avança. A seção
  seguinte recebe o objeto que veio de cima.
- **Cena 3D presa ao layout** (`helmet-scroll`): a cena é renderizada numa textura e desenhada num plano que
  acompanha um elemento da página; bordas esfumadas no shader (`smoothstep` em x e y).
- **On track / Off track** (`data-otot-section`): duas fotos vêm das laterais (`x ±20rem → 0`) e duas colunas
  de texto se encontram no meio, presas à rolagem.
- **Letras que rolam no hover** (`data-anim="text-hover"`): cada letra sobe `-100%`, 0,02 s entre elas.

## Ingrassia (ingrassiadaniel.it; Next.js + three.js + Lenis)

- Um único sistema de partículas com cinco estágios (`uMorph` … `uMorph5`): globo, Itália, anel
  (`uRingMix`), espiral, forma de onda, e por fim o contorno do cartão do projeto (`uOutlineRect`,
  `uWorkSlide`). O cursor mexe nos pontos (`uPointer`, `uTurbulence`).

## Emotion (emotion-agency.com; Nuxt 3 + GSAP + Three)

- Projetos num carrossel curvo em WebGL com reflexo no chão; fluido no cursor (`tFluid`); vinheta, saturação e
  matiz no pós-processamento.

## Já estudados antes (bundles/ e docs/LUSION_REA.md)

- Lusion: pilha de objetos com física (gravidade ao centro, empurrão do cursor), túnel do astronauta.
- Zentry: quadro projetado em 3D que se abre (`useCssClipMask`, `Frame`), cartões com números grandes.

## Onde cada mecanismo entra no portfólio (proposta, uma parte por vez)

| Parte do portfólio | Mecanismo de base |
| --- | --- |
| Cabeçalho | `data-nav-theme` do Lando: cor por seção; aparece no começo e no fim |
| Textos de seção | bloco lima que varre (`high-line-reveal`) e títulos em elipse (`oval-scroll`) |
| Passagens entre seções | elipse presa à rolagem (`exe-visor`) e o objeto que viaja (`heroflip`) |
| Topo → seção seguinte | a pilha de símbolos 3D viaja pelo caminho curvo até a próxima seção (`heroflip`) |
| Projetos | duas metades que se encontram (`otot`) e revelação em elipse das imagens |
