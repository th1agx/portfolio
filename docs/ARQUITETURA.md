# Arquitetura

MVC no front-end, com SOLID aplicado de forma prática. A estrutura junta o que funcionou nas referências: o `GlobalSiteController` do Hart, os módulos com ciclo de vida do Lando, o split por dispositivo da Silvia e a separação cena/dados do Aengel.

---

## Stack

| Camada | Escolha | Por quê |
| --- | --- | --- |
| Build | Vite 7 + TypeScript estrito | O que a Silvia usa; site estático, sem servidor |
| UI | React 19 | Mesmo do seu portfólio anterior e de Silvia/Aengel |
| Movimento | `motion` (Framer Motion, import `motion/react`) | Pedido seu. Transições laterais e verticais com `AnimatePresence`, `useScroll`, molas |
| Scroll | Lenis | Usado por Lando e Aengel. Ligado ao relógio do motion, nunca um rAF próprio |
| Roteamento | React Router 7 (data router) | Rotas reais, como Aengel. A transição fica no nosso `TransitionController`, como os renderers do Taxi |
| 3D | three + @react-three/fiber + drei | Silvia e Aengel. Chunk separado, só em `pointer: fine` |
| 3D | Uma `InstancedMesh` de cubos com alvos de forma gerados em código (texto amostrado em canvas, grafo, grade, nuvem). Blender headless só se um capítulo pedir uma peça modelada | O campo de cubos é o personagem da história, não um modelo de fundo |
| Vídeo | Remotion | Vídeo de Open Graph e o fallback do celular sem WebGL, renderizados a partir das mesmas formas |
| Estado global | zustand | Pequeno, sem provider, fácil de ler fora do React (controllers) |
| Animação vetorial (opcional) | Rive | Os check marks do capítulo Testar, se o SVG não bastar |
| Testes | Vitest (controllers e models) + Playwright (fluxos e screenshots) | Controllers são TS puro, testáveis sem DOM |

---

## Camadas

```
            ┌────────────────────────────────────────────┐
            │  app/        composição, rotas, providers  │  ← liga tudo (composition root)
            └───────────────┬────────────────────────────┘
                            │ injeta
      ┌─────────────────────┼──────────────────────────┐
      ▼                     ▼                          ▼
  models/              controllers/                 views/
  dados e regras       comportamento, ciclo de      React, só desenha
  (sem React, sem DOM)  vida, eventos globais       e chama bindings
      ▲                     ▲                          │
      │                     │        bindings/         │
      └─────── global/ ─────┴──── hooks que ligam ◄────┘
           store, eventos,       controllers às views
           tokens, config
```

**Regra de dependência**: `views` conhecem `bindings`; `bindings` conhecem `controllers` e `global`; `controllers` conhecem `models` e `global`; `models` não conhecem ninguém. Nenhuma seta volta.

---

## Árvore de pastas

```
src/
├── main.tsx                         entrada: decide DesktopApp ou TouchApp (padrão Silvia)
├── app/
│   ├── container.ts                 composition root: instancia controllers e repositórios
│   ├── router.tsx                   rotas + metadados de eixo (x | y)
│   ├── DesktopApp.tsx               com o campo de cubos completo
│   ├── TouchApp.tsx                 1.200 cubos, sem pós-processamento
│   └── providers/
│       ├── ContainerProvider.tsx    expõe o container para os bindings
│       └── I18nProvider.tsx
│
├── global/
│   ├── store.ts                     zustand: capítulo ativo, progresso, versão (loop), idioma, direção da transição
│   ├── events.ts                    EventBus tipado (chapter:enter, chapter:leave, tax:select, loop:release, route:leave)
│   ├── motion.ts                    durações e curvas nomeadas (DESIGN.md §7)
│   ├── device.ts                    pointer fine/coarse, reduced motion, saveData (padrão Hart)
│   └── config.ts                    URLs, flags, versão do conteúdo
│
├── models/
│   ├── entities/
│   │   ├── Project.ts               slug, título, ano, fato, stack, links, mídia
│   │   ├── Chapter.ts               verbo, forma do campo, eixo, surpresa
│   │   ├── Role.ts                  cargo, lugar, período, o que fez
│   │   └── TaxDecision.ts           um tributo da resposta real do Tributax e seu trace
│   ├── repositories/
│   │   ├── ProjectRepository.ts     interface
│   │   ├── StaticProjectRepository.ts lê content/*.ts
│   │   └── GitHubSnapshot.ts        script de build grava github.json (estrelas, linguagem, push)
│   ├── services/
│   │   ├── Sequence.ts              ordem dos projetos, próximo/anterior com wrap (o infinito mora aqui)
│   │   └── Duration.ts              "06/2026 – hoje" → texto e duração em meses
│   └── content/
│       ├── pt.ts
│       ├── en.ts
│       └── github.json              gerado
│
├── controllers/
│   ├── Controller.ts                interfaces base (abaixo)
│   ├── ControllerRegistry.ts        registra, inicia, destrói em ordem
│   ├── FrameController.ts           o relógio único (motion frameloop); todos assinam
│   ├── ScrollController.ts          Lenis, ligado ao FrameController
│   ├── TransitionController.ts      decide eixo e sentido entre rotas (x/y, +1/-1)
│   ├── StoryController.ts           mede cada capítulo, publica capítulo ativo e progresso local
│   ├── FieldController.ts           gera as formas-alvo dos cubos e decide a mistura por progresso
│   ├── TrackController.ts           trilhos laterais: converte scroll vertical em X, foco por teclado
│   ├── TaxController.ts             seleção de tributo da coisa viva
│   ├── LoopController.ts            fim da história: volta ao topo e incrementa a versão
│   ├── PreloadController.ts         etapas reais de carregamento (padrão Aengel)
│   ├── SceneController.ts           ciclo de vida da cena 3D, qualidade adaptativa
│
├── bindings/
│   ├── useController.ts             pega um controller do container pelo token
│   ├── useChapter.ts                progresso local do capítulo como motion value
│   ├── useTrack.ts                  trilho lateral pronto (ref + x)
│   ├── usePageTransition.ts         variants x/y prontas para AnimatePresence
│   ├── useTax.ts                    tributo ativo + handlers
│   └── useReveal.ts                 entrada por partes com stagger em swing
│
├── views/
│   ├── pages/                       Story (/), Project (/projetos/:slug)
│   ├── chapters/                    Entender, Desenhar, Implementar, Integrar, Testar, Documentar, Evoluir
│   ├── scene/                       Field.tsx (InstancedMesh), shapes/*.ts (lazy)
│   ├── system/                      Nav, Preloader, PageFrame (o wrapper animado)
│   └── primitives/                  Button, CodeBlock, Media, SplitLines, Counter
│
└── styles/
    ├── tokens.css                   tudo do DESIGN.md
    ├── base.css
    └── *.module.css                 CSS Modules por componente (padrão Aengel)

tools/
├── remotion/                        vídeo de Open Graph e fallback sem WebGL
└── snapshot-github.ts               gera models/content/github.json
```

---

## Contratos dos controllers

```ts
// controllers/Controller.ts
export interface Lifecycle {
  init(): void | Promise<void>
  destroy(): void
}
export interface Frameable { onFrame(time: number, delta: number): void }
export interface Resizable { onResize(viewport: Viewport): void }

export type ControllerToken<T> = symbol & { __type?: T }
```

Cada controller implementa só o que usa (ISP). O `ControllerRegistry` checa se ele é `Frameable` ou `Resizable` e assina no `FrameController` ou no resize global. Ninguém chama `requestAnimationFrame` ou `addEventListener('resize')` por conta própria.

---

## SOLID, aplicado

- **S, responsabilidade única.** `FieldController` só calcula formas e misturas. Quem desenha é `views/scene/Field`. Quem decide o próximo projeto é `models/services/Sequence`.
- **O, aberto para extensão.** Novo comportamento é um controller novo registrado no `container.ts`. Nada existente muda. Igual aos módulos `data-*` do Lando e os `handle*` do Hart, mas tipado.
- **L, substituição.** Qualquer `ProjectRepository` (estático hoje, CMS amanhã) serve. O `TouchApp` troca `SceneController` por `NullSceneController` sem que nenhuma view perceba.
- **I, interfaces pequenas.** `Lifecycle`, `Frameable`, `Resizable` separadas.
- **D, inversão de dependência.** Views pedem `useController(TOKENS.story)`, nunca `new StoryController()`. Quem cria é o `container.ts`.

---

## Ligações (como um scroll percorre o sistema)

Exemplo: o visitante rola do Entender para o Desenhar.

1. `ScrollController` (Lenis) avança; o `FrameController` dispara um frame só.
2. `StoryController` mede os capítulos e publica `{ chapter: 'desenhar', progress: 0.12 }` no store e `chapter:enter` no EventBus.
3. `FieldController` recebe o progresso e mistura a forma "pilha" com a forma "grafo" (o peso é o progresso, passado por `ease.settle`).
4. `views/scene/Field` só lê os buffers prontos e envia para a GPU.
5. `TrackController` converte o resto do scroll do capítulo em X: o trilho do Desenhar começa a andar para o lado.
6. `views/chapters/Desenhar` usa `useChapter` para desenhar as arestas SVG (`pathLength` ligado ao mesmo progresso).

## Transições laterais e verticais

As rotas carregam o eixo:

```ts
// app/router.tsx
{ path: '/',            handle: { chapter: 0 } }
{ path: '/projetos/:slug', handle: { chapter: 1, project: true } }
```

`TransitionController.resolve(from, to)`:
- história → projeto, e volta → eixo **y** (o projeto sobe sobre a história);
- projeto → projeto → eixo **x**, sentido pela posição no `Sequence`, com wrap (do último para o primeiro é +1).

`views/system/PageFrame` envolve cada página num `motion.div` com `AnimatePresence mode="popLayout"` e `custom={direction}`. Saída e entrada duram `base`, com `ease.travel`. Com reduced motion, só opacidade em `fast`.

---

## Infinito

- **Histórico de versões** (Evoluir): trilho lateral com `wrap` sobre um offset contínuo, 3 cópias virtuais recicladas.
- **Página de projeto**: "Próximo projeto" sempre adiante pelo `Sequence`, em loop, entrando pela lateral.
- **Fim da história**: "Lançar a próxima versão" rola ao topo com Lenis e o `LoopController` incrementa a versão; o hero passa a dizer v2, v3...
