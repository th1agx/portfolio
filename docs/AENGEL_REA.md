# aengel.io por dentro (REA)

Engenharia reversa estática do site do Arthur Engel, feita em 17/10/2026. Nenhum código dele foi executado fora do navegador e nada aqui é cópia: é a leitura de como ele funciona, para guiar a nossa implementação.

---

## Como foi feito

- **Coleta:** os 82 arquivos JavaScript públicos de `/_next/static/chunks/`, seguindo as referências de chunk dentro do próprio bundle até não aparecer arquivo novo (3,9 MB). Ele **não publica source maps** (`.map` responde 404).
- **REA:** `rea-agents@6.5.0 analyze-javascript-application`, Evidence `ev_4ccab6adc280222a24bac8b404f28394012f50d5b9405ec4febb6310780dc61c`.
  - **Resultado:** 79 arquivos, 1.142.263 nós de AST, 0 falhas de parse, 127 achados, grafo semântico com 100 mil nós e 137 mil relações.
  - **Detalhe de ambiente:** o analisador compila um helper em Swift. Com o SDK do macOS 27 o compilador quebra; rodando com `SDKROOT=.../MacOSX26.5.sdk` funciona.
- **Leitura:** os 17 chunks autorais (cerca de 65 mil linhas) formatados com js-beautify e lidos por subsistema. As referências abaixo são `chunk:linha` na versão formatada.

---

## Stack

| Peça | O que é | Onde |
| --- | --- | --- |
| Framework | Next.js com Turbopack, App Router | `turbopack-*.js`, rotas `/`, `/projects`, `/projects/:slug`, `/about`, `/contact`, `/lite` |
| 3D | three.js **WebGPU** (`three/webgpu`) com materiais em nós TSL | `0ll2ufjqsem1..js` (632 KB): `WebGPURenderer`, `BloomNode`, `GTAONode` |
| Ponte React | React Three Fiber | `useFrame`, `useThree` em todos os chunks de cena |
| Estado | zustand, 23 stores | lista abaixo |
| Scroll | Lenis com `lerp: 0.125`, mais o evento `virtual-scroll` para ler a intenção do usuário | `01ay6y4_-9myt.js:321` |
| Animação | GSAP (tweens nos uniforms e na câmera), `useGSAP`, ScrollTrigger | `1502ibkr~cu.4.js` |
| Relógio | `useTempus` (o rAF único da darkroom, o mesmo autor do Lenis) e `useRafChannel` | 16 usos |
| Texturas | KTX2 com compressão BC7 e um Web Worker transcodificador | `0r-swaq_yw~6x.js`, Worker em `new Worker(this.workerSourceURL)` |
| Modelos | GLB com Draco, decodificado em Worker | `gltf-draco` |
| Áudio | Web Audio próprio: barramentos, loops, duck, mute | `nav.js:560-1100` |
| Tipos | Manrope e League Spartan | strings no chunk de cenas |

---

## A ideia central: um mundo só, e as rotas são lugares nele

Esta é a decisão de arquitetura que faz o site parecer um filme.

- **Não existe troca de página.** O `navigateTo` faz `history.pushState` e chama `useNavigationStore.getState().request(rota, origem)` (`01n9.x1x734yf.js:733`). O canvas nunca desmonta.
- **Cada rota é um estado do mundo**, não um componente (`nav.js:145-235`):

```text
LANDING  { scene: "landing",  path: "/",         stargateOpen: 0, interiorReveal: 0, contactHandoffProgress: 0, resolveOffset: () => 0 }
PROJECTS { scene: "projects", path: "/projects", stargateOpen: 1, stargateClose: 1, resolveOffset: anchor("scene2", 0) }
ABOUT    { scene: "about",    path: "/about",    ...,            resolveOffset: aboutSettleScroll }
CONTACT  { scene: "contact",  path: "/contact",  contactHandoffProgress: 1, contactHandRevealProgress: 1 }
interiorRoute(i) { scene: "projectInterior", path: `/projects/${slug}`, interiorStatus: "interior", isScrollLocked: true }
```

- **A página é um scroll longo.** Cada rota sabe o seu ponto nele (`resolveOffset`, por âncoras como `{ section: "scene2", frac: 0 }`). Ir para "/about" é rolar até a âncora do About, enquanto parâmetros como `stargateOpen` levam o mundo ao estado certo.
- **O store de navegação** tem `route`, `origin`, `phase` (`idle` ou `transitioning`), `pendingRoute` e `nonce`:
  - `request(rota, origem)`: com origem `scroll` ou `stoneEntry` só atualiza a rota, porque o próprio scroll já está levando até lá. Com origem `navbar` ou `deeplink` entra em `transitioning` e agenda a rota pendente.
  - `settle(rota)` volta para `idle` quando a câmera chega.
- **Roteamento reverso:** `resolveRoute(pathname)` converte a URL em estado do mundo, então um link direto para `/projects/cgtrader` abre o mundo já no interior daquele projeto.

**Para nós:** a mesma separação. A URL é um ponteiro, e o mundo 3D é a única cena.

---

## Transições

- **Véu (veil):** quando a navegação é por clique (salto longo), um véu cobre a tela, o scroll é teletransportado para a âncora e o véu revela a cena nova.
  - Store `useVeilTransitionStore` com `isVeilCycleInFlight`, e um canal `veilChannel.coverRevealPhase` lido pelo shader (`00o~3wxtljh6z.js:915`).
  - O áudio acompanha: `veilAudioCover()` abaixa a trilha e toca `uiVeil`; `veilAudioReveal()` sobe de volta em 1,2 s.
- **Ímã de portal (commit glide):** entre Landing e Projects o scroll não é livre (`01ay6y4_-9myt.js:2490-2560`).
  - **Ida:** ao cruzar uma linha (`PORTAL_COMMIT_ANCHOR`) na direção certa, o Lenis assume e desliza sozinho até o alvo (`PROJECTS_SETTLE_ANCHOR`). A duração fica entre um mínimo e um máximo, com tolerância de chegada (`landEps`) e histerese para rearmar.
  - **Volta:** o mesmo mecanismo em sentido inverso.
  - **Intenção:** a direção vem do evento `virtual-scroll` do Lenis (`deltaY > 0 ? 1 : -1`), não da posição.
- **Entrada no interior de um projeto:** `interiorStatus` passa por `exterior`, `entering`, `interior` e `exiting`. Ao entrar, um uniform vai de 0 a 1 em 1,25 s com `power2.out` (`1502ibkr~cu.4.js:8320`). O interior tem scroll próprio (`useInteriorScrollStore`), separado do scroll da página.

---

## Carregamento (o loader honesto)

O texto do loader é o progresso real do pipeline (`1502ibkr~cu.4.js:9960-10040` e `:900`):

| Progresso | Etapa | O que o código faz |
| --- | --- | --- |
| 0,05 | Preparing scenes | espera cada cena marcar suas tarefas como prontas (`useSceneReadinessStore`, `isSceneReady`) |
| 0,05 a 0,10 | warming compute | `flushAsync` dos pipelines de compute shader (partículas) |
| 0,10 a 0,94 | Compiling shaders | percorre todos os objetos da cena e compila cada pipeline antes de mostrar, em lotes de até 24 por frame, informando o progresso a cada objeto |
| 0,94 | Finalizing | renderiza uma vez o pós-processamento |
| 1,00 | Ready | libera o botão "Enter the experience" |

- **Watchdog:** se uma cena não fica pronta em 30 s (pausando enquanto a aba está oculta), registra a falha com a lista das cenas que travaram.
- **Telemetria:** cada etapa vira `setTelemetryStage("warmup: ...")`.
- **Por que importa:** compilar tudo antes elimina o engasgo do primeiro scroll. É por isso que o site dele não trava ao entrar em cena nova.

---

## Cenas e câmeras

- **Cenas:** `landing`, `projects`, `projectInterior`, `about` e `contact`, cada uma com câmera própria (`LandingCamera`, `ProjectsCamera`, `ProjectInteriorCamera`, `AboutCamera`, `ContactCamera`, além de `LandingVolumetricCamera` e `AboutLoupeCamera`).
- **Só a cena ativa trabalha:** `useIsSceneActive("projectInterior")` e `useActiveScenesStore` (`scenesInPlay`) ligam e desligam cada cena.
- **Câmera em curva:** caminhos `CatmullRomCurve3`, centrípetos ou com tensão baixa (`tension: .05`), lidos de `/datas/scene1/camera.json` e amostrados por progresso (`useCurvedCamera`). A partícula da landing usa uma curva gerada por senos com 480 pontos reamostrados (`1502ibkr~cu.4.js:1020-1060`).
- **Tremor da landing:** a câmera treme com uma soma de senos em frequências incomuns (29,1 / 17,6 / 31,2 / 23,7 Hz), com amplitude ligada a um valor de "terremoto". O loop de som `sfxLandingQuake` liga quando esse valor passa de 0,03 (`1502ibkr~cu.4.js:2676-2700`).
- **"Alavancas" de entrada:** `registerLandingEntryLever("camera" | "drift", objeto)`. A animação de entrada recebe os objetos e os anima de fora, sem conhecer as cenas.

---

## Renderização

- **Materiais:** `meshStandardNodeMaterial`, `meshBasicNodeMaterial` e `spriteNodeMaterial`, com lógica escrita em TSL. Aparecem nomes de funções de shader como `ssFbm`, `ssCombN`, `stoneShape`, `waterGlow`, `vDuneParticleVis` e `vidLum` (luminância do vídeo usada na luz).
- **Compute:** partículas líquidas (`liquideParticle`, `liquid-particles`), poeira por cena (`landing-dust`, `about-dust`, `contact-dust`) e atributos `aPack0` e `aPosArrival` para animar milhares de pontos na GPU.
- **Instancing:** rochas, raízes e folhas (`instanced-cliff-rock`, `ArchLeavesBatch`), com posições vindas de JSON (`rocksData`, `treesData`).
- **Vídeo dos projetos:** cada projeto tem um vídeo carregado como textura (`useVideoTexture`), recarregado ao trocar de projeto.
- **Pós-processamento:** Bloom e GTAO (oclusão ambiente) em nós, mais `useTemporalFiltering`.
- **Degradação:** `useGraphicsSupportStore`, `useForceNoWebGPUStore`, `useLowPerfStore` (desliga custo quando o frame pesa) e a versão `/lite`, sem WebGL, para aparelhos fracos.

---

## Áudio

- **Motor próprio em Web Audio** (`nav.js:560-1100`), com barramentos (`sfx`), loops contínuos (beds), ducking e mute.
- **Cada som é um "slot" configurado:** `gain`, `maxVoices`, `throttleMs`, `pitchVarCents` e `gainVar`, para nunca soar repetido. Exemplos: `sfxStoneHover` em loop, `sfxProjectSwitch` com throttle de 120 ms e 40 cents de variação, `sfxPortal`, `sfxAboutBeam`.
- **Regras de quando tocar:**
  - som de efeito não toca antes do loader sair, nem durante uma transição;
  - com `prefers-reduced-motion`, o som começa mudo;
  - a preferência de mute fica salva em `localStorage`.

---

## Interação

- **Teclado no interior do projeto:** setas para cima e para baixo rolam o conteúdo; esquerda e direita (ou PageUp e PageDown) trocam de projeto; Home e End vão ao início e ao fim; Escape sai (`1502ibkr~cu.4.js:8300-8370`).
- **Ponteiro:** `useCanvasPointer` e `startPointerDrag` para arrastar, além do hover na pedra com som em loop.
- **Legendas:** cada caractere é um `<span>` próprio (`aboutSubtitles-module__charGlyph`), animado letra a letra.
- **Ferramenta interna:** `DevHud` e `createDevHudBridge`, um painel de debug com profiler, stats e forçar variante (`useProfilerStore`, `useStatsStore`, `useVariantStore`).

---

## Stores (23)

`useProjectStore`, `useNavigationStore`, `useExperienceReadyStore`, `useProfilerStore`, `useLowPerfStore`, `useResizeGateStore`, `useVariantStore`, `useLoaderProgressStore`, `useInteriorScrollStore`, `useActiveScenesStore`, `useScrollLockStore`, `useSceneRevealStore`, `useLoupeStore`, `useStatsStore`, `useVeilTransitionStore`, `useSceneReadinessStore`, `useGraphicsSupportStore`, `useForceNoWebGPUStore`, `useFatalErrorStore`, `useDebugStore`, `useAudioStore`.

Cada responsabilidade tem o seu store pequeno. Nenhum store "global" sabe de tudo.

---

## O que levamos para o portfólio do Thiago

O padrão, não o conteúdo. Nada de pedra, arco, vitória-régia, mão ou borboleta dele, e nenhum shader ou modelo dele.

1. **Um mundo só.** Canvas persistente; rotas como estados do mundo com âncora de scroll; store de navegação com `request` e `settle`, fases e origem.
2. **Véu** para saltos longos e **ímã** entre zonas vizinhas (deslize automático depois de cruzar uma linha, com histerese).
3. **Loader honesto:** prontidão por cena, aquecimento de compute, compilação de shaders com progresso real, watchdog.
4. **Câmera em curva** por cena, com dados em JSON e "alavancas" para a animação de entrada.
5. **Ativação por cena:** só a cena em jogo calcula.
6. **Áudio com slots** e variação, mudo por padrão com reduced motion, preso às fases do loader e da navegação.
7. **Interior de projeto** com scroll próprio e teclado completo.
8. **Degradação planejada:** WebGPU, depois WebGL, depois uma versão lite.
9. **Stores pequenos por responsabilidade**, combinando com o MVC do [ARQUITETURA.md](ARQUITETURA.md).
