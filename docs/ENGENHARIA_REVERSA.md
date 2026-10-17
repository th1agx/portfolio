# Engenharia reversa das referências

Coleta feita em 17/10/2026 com REA (`analyze_web_bundle` via CDP num Chrome local), download dos bundles públicos e leitura estática do código minificado. Nada foi executado fora do navegador. Os IDs de evidência permitem reabrir cada análise.

Prioridade definida pelo Thiago: **Aengel, Silvia Malavasi, Hart e Lando Norris**. Yuya fica como referência secundária.

---

## Resumo em uma tabela

| Site | Base | Render 3D | Motion | Scroll | Rotas / transição | Evidência |
| --- | --- | --- | --- | --- | --- | --- |
| aengel.io | Next.js (Turbopack, App Router), React, CSS Modules | three/webgpu + R3F, nós TSL (BloomNode, GTAONode), KTX2, Draco, OGL num chunk | GSAP + ScrollTrigger + Flip + Observer | Lenis | rotas reais `/`, `/projects`, `/about`, `/contact` | `ev_d1c1fc75…` |
| silviamalavasi.com | Vite 8 (rolldown) + React, one-page | three + R3F + postprocessing (Bloom), GLB com Draco | GSAP + ScrollTrigger + ScrollSmoother + CustomEase | ScrollSmoother (`#smooth-content`) | sem rotas: âncoras `#hero`, `#incision`, `#harvest` | `ev_3746297a…` |
| madebyhart.com | WordPress, tema próprio `hart` | nenhum: canvas 2D e filtros SVG | JS puro, `requestAnimationFrame` | nativo | multipágina clássica | `ev_73882e0f…` |
| landonorris.com | Webflow (DOM e CMS) + bundle externo do estúdio OFF+BRAND | three + shaders próprios (simulação de fluido, helmet), OGL | GSAP 3.13 + SplitText + Flip + CustomEase | Lenis | Taxi.js (PJAX) com renderers por página | `ev_a250b962…` |
| yuyafilmstudio.dev | Vite, bundle único de 3,6 MB | three (WebGL) | Theatre.js | nativo | SPA | `ev_34b65fc7…` |

---

## Aengel

**Arquitetura**
- Next.js com Turbopack (chunks `turbopack-*.js`) e CSS Modules (`aboutSubtitles-module__haskPW__charGlyph`).
- Cada letra dos subtítulos vira um `span` próprio (151 ocorrências de `charGlyph` só na página de contato): o split de texto é feito no React, não com SplitText.
- Cena 3D por página: "Scene 1 - Landing", "Scene 2 - Projects", câmeras nomeadas (`LandingVolumetricCamera`, `AboutLoupeCamera`).
- Assets pesados versionados por pasta: `/models/scene1/*.glb`, `/textures/*.bc7.ktx2`, `/datas/scene1/camera.json`. A câmera percorre curvas exportadas como JSON (`catmullrom`, `centripetal`).
- Renderer WebGPU com fallback ("WebGPU Not Available").

**O que faz ele parecer autoral**
- Loader com etapas reais do pipeline: "Fetching assets", "Transcoding textures", "Compiling shaders", "Warming pipelines". O texto conta o que o código está fazendo de verdade.
- Interface mínima: logo, status "AVAILABLE" com ponto verde, ícone de áudio, menu de três pontos. Todo o peso visual está na luz.
- Instancing pesado (`instanced-cliff-rock`, `ArchLeavesBatch`) e dados de cena em JSON separado do código.

**Para levar**: loader honesto, câmera em curva definida por dados, cena separada da UI, split de texto feito no React.

---

## Silvia Malavasi

**Arquitetura**
- Entrada `index.js` decide o app pelo dispositivo: `matchMedia('(pointer: fine) and (hover: hover)')` carrega `App.js` (desktop com 3D); caso contrário, `MobileApp.js`. São dois apps, não um app responsivo.
- Chunks manuais: `react`, `gsap`, `three` separados; `Skull.js`, `PackageBox.js`, `BloomComposer.js` em import dinâmico.
- Uma curva de easing global registrada uma vez: `CustomEase.create('siteEase', 'M0,0 C0,0 0.22,1 1,1')`, espelhada no CSS como `--easing: cubic-bezier(0, 0, .22, 1)`.
- Tipografia fluida em "pontos": `--root-font-size: calc((1svh + 4svw + 16px) * .15)` e `--font-24pt: calc(var(--root-font-size) * .054 * 24)`. A escala inteira deriva de uma variável.
- Modelo `teschio.glb` (Draco) com malhas nomeadas em italiano (`Calotta`, `Mascella`, `Cervello`), animadas por GSAP.

**O que faz ele parecer autoral**
- Uma narrativa inteira: a página é uma "dissecação" da desenvolvedora. Ficha "classified", espécime, tipo sanguíneo CSS, mutação GSAP-THREE.JS, faixa de risco "scroll to start dissection".
- Vocabulário próprio usado em todos os componentes (`incision`, `harvest`, `hazard-end-dissection`, `brain-files`). O conceito chega até os nomes das classes.

**Para levar**: split App/MobileApp por capacidade do ponteiro, escala tipográfica derivada de uma variável, um easing com nome, e a metáfora levada até o vocabulário do código.

---

## Hart

**Arquitetura**
- WordPress com JS puro, sem nenhuma biblioteca. Um único `GlobalSiteController` com `cacheElements()` e `bindEvents()` que chama cerca de 20 handlers (`handlePixelTransitions`, `handleDarkRipple`, `handleLogoMarquees`, `handleProjectHeroes`…).
- Módulos ligados por atributo: `[data-gallery]`, `[data-pixel-transition]`, `[data-pixel-direction]`.
- Todo efeito tem um "modo econômico": `pointer: coarse`, `prefers-reduced-motion` ou `navigator.connection.saveData` desligam o efeito ou reduzem o custo.

**Técnicas observadas**
- **Transição em pixels**: canvas 2D por seção, 4 linhas de células (60 px no desktop, 40 no tablet, 24 no mobile), uma semente aleatória por célula, progresso ligado ao scroll, só desenha quando a seção está a 35% da viewport.
- **Ripple escuro**: filtro SVG `feTurbulence` + `feDisplacementMap` com `baseFrequency` e `scale` oscilando por seno no rAF.
- Fonte de display LCD (`Digital-7`) só no painel do aparelho.

**O que faz ele parecer autoral**
- A home é um objeto físico: uma TV antiga numa mesa de estúdio, e os projetos passam na tela. Um módulo de rack com display LED mostra o nome do projeto e um botão GO. A navegação é o aparelho.

**Para levar**: controller com ciclo de vida explícito, ligação por atributo, modo econômico em todo efeito, e navegação feita com um objeto real.

---

## Lando Norris

**Arquitetura**
- Webflow cuida do DOM e do CMS; um bundle externo de cerca de 1,4 MB (OFF+BRAND) cuida de tudo que se mexe.
- Roteamento PJAX com **Taxi.js**: `fetch` com header `X-Requested-With: Taxi`, `data-taxi-view` escolhe o renderer da página, ciclo `onEnter / onEnterCompleted / onLeave / onLeaveCompleted`.
- Cerca de 60 módulos ligados por atributo (`data-gl-track`, `data-rive-file`, `data-rive-state-machine`, `data-nav-theme`, `data-heroflip`, `data-oval-scroll`, `data-horizontal-section`, `data-marquee-scroll-direction-target`, `data-mouse-track`…). Cada módulo tem `init`/`destroy`/`onResize`.
- Lenis próprio (wheel normalizado com `wheelMultiplier`, `touchMultiplier`, `lerp`), GSAP 3.13 com SplitText e Flip.
- Rive (`@rive-app/canvas-lite` 2.26) para ícones e transições, ligado a ScrollTrigger (`data-rive-scrolltrigger-start`).
- 105 fragment shaders. Uniforms revelam uma **simulação de fluido** no cursor (`velocity`, `pressure`, `dt`, `CURSOR`, `DISTORT`) e transição de texturas (`tCurrentTexture`, `tNextTexture`, `uReveal`, `uHelmetTransition`, `uHoverReveal`).

**O que faz ele parecer autoral**
- O rosto dele com o capacete em wireframe por cima. Linhas topográficas que lembram pista. O lime da marca aparece só no botão da loja.

**Para levar**: roteador com renderer por página e ciclo de vida, registro de módulos por atributo, Rive dirigido pelo scroll, accent de marca restrito a uma ação.

---

## Padrões em comum (o que realmente importa)

- **Cada site é um mundo, não um layout.** Dissecação (Silvia), estúdio com TV (Hart), luz e mão (Aengel), capacete e pista (Lando). O conceito vem da pessoa.
- **Um controller por comportamento, com ciclo de vida.** `init`, `destroy`, `onResize`, `onFrame`. Em todos os quatro.
- **Um relógio só.** Lenis + GSAP ticker (Lando, Aengel) ou rAF único (Hart). Nada de vários loops concorrendo.
- **Degradação planejada.** Mobile não é o desktop encolhido: Silvia carrega outro app, Hart desliga efeitos por `pointer: coarse` e `saveData`.
- **Dados separados de código.** Câmera em JSON (Aengel), CMS (Lando, Hart).
- **Pouca cor, muita convicção.** Uma cor de marca, usada com disciplina.

---

## Sobre "trazer o código literalmente"

Os bundles foram baixados e lidos, e isso guiou cada decisão do plano. Colar esse código no seu projeto não é o caminho, por três motivos:

- **Direito autoral.** O código é dos autores (OFF+BRAND, Hart, Silvia, Aengel). Copiar trechos minificados para um portfólio público é infração e pode ser reconhecido por quem conhece os sites.
- **Manutenção.** É código minificado, sem nomes, preso ao DOM do Webflow ou do WordPress de cada um.
- **Autenticidade.** Um portfólio montado com pedaços de quatro sites é exatamente a cara de colagem que a gente quer evitar.

O que **pode** e vai entrar:
- Bibliotecas abertas que eles usam: Lenis (MIT), Taxi.js (MIT, como referência do ciclo de vida), three, R3F, GSAP (gratuito desde a 3.13), Rive runtime.
- Técnicas, que não pertencem a ninguém: transição em pixels por canvas, ripple com `feTurbulence`, simulação de fluido estável (Jos Stam, 1999), split por dispositivo, escala tipográfica derivada de uma variável, módulos por atributo, loader com etapas reais.
- Tudo reescrito do zero, com nomes nossos e ligado ao conceito do Thiago.
