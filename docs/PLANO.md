# Plano de implementação

Seis fases. Cada uma termina com algo que roda e que dá para olhar, e passa pelo checklist do [ANTI_PATTERNS.md](../ANTI_PATTERNS.md) antes da próxima.

---

## Pendências do Thiago

- **Fotos suas** (3 a 5) para o capítulo Documentar. Sem elas, o capítulo fica só com texto e interfaces reais.
- **Figma**: não há MCP do Figma conectado nesta sessão. Se conectar, sincronizo tokens e telas.

---

## Fase 1. Fundação

- Vite + React 19 + TypeScript estrito, Vitest, Playwright.
- Dependências: `motion`, `lenis`, `three`, `@react-three/fiber`, `zustand`, `react-router`.
- `styles/tokens.css` com tudo do DESIGN.md.
- `global/`, `controllers/Controller.ts`, `ControllerRegistry`, `FrameController`, `ScrollController`, `container.ts`.
- Split DesktopApp / TouchApp.

**Pronto quando**: página abre com fontes, tokens, Lenis e um frame loop único; testes de `Sequence` e `TransitionController` verdes.

## Fase 2. Conteúdo

- `content/pt.ts` com o texto real dos sete capítulos, do Tributax (resposta e trace do README), da 3D Lab e dos projetos.
- `tools/snapshot-github.ts` gera `github.json` no build.
- Capturas das interfaces reais com Playwright.

**Pronto quando**: a história inteira lê do começo ao fim como texto puro, sem movimento.

## Fase 3. Página parada

- Cada capítulo com a composição final, desktop e celular, sem animação.
- Gate do taste-skill: `lint.mjs` e `inspect.mjs` em 1440, 768 e 390, três rodadas de crítica.

## Fase 4. O campo de cubos

- `FieldController` com as formas: nome amostrado do DOM, pilha, grafo, grade da nota, pacotes, nuvem de estresse, folha.
- `views/scene/Field`: uma `InstancedMesh`, mistura de formas por progresso, iluminação simples, qualidade adaptativa.
- Sincronia DOM ↔ cubos no Entender (as letras viram cubos no lugar exato).

**Pronto quando**: os sete estados do campo seguem o scroll a 60 fps.

## Fase 5. Surpresas, trilhos e transições

- Entender: troca letras → cubos → pilha → palavras do mundo real.
- Desenhar: arestas com `pathLength`, trilho lateral.
- Implementar: JSON digitado pelo scroll, "envio", tabela contando, seletor de tributo com `layoutId`.
- Integrar: trilho lateral seguindo o pacote.
- Testar: esteira de miniaturas com smoke test, stress test com tremor e assentamento.
- Documentar: troca do campo para papel.
- Evoluir: histórico infinito, contato, loop com versão.
- Rotas `/projetos/:slug` com transição lateral e vertical, "próximo projeto" em loop.
- Reduced motion em tudo.

## Fase 6. Acabamento

- Vídeo de Open Graph com Remotion.
- SEO, sitemap, favicon da logo.
- Lighthouse ≥ 90 / 100, teclado e leitor de tela.
- Deploy em `thiagoantunes.com`.

---

## Skills por fase

| Fase | Skills |
| --- | --- |
| 1 | design-dna (tokens), output-skill, cast (thesis e auditoria) |
| 2 | taste-skill (copy), reverse-engineer-anything (consulta) |
| 3 | taste-skill (gate e crítica), redesign-skill, soft-skill, minimalist-skill (consulta) |
| 4 | react-three-fiber, threejs-fundamentals, threejs-geometry, threejs-shaders, threejs-animation, web3d-integration-patterns |
| 5 | motion-framer, motion-design, gsap-scrolltrigger (padrões de pin), locomotive-scroll (padrões de Lenis), barba-js (padrões de transição), rive-interactive (se usado) |
| 6 | remotion-motion-graphics, taste-skill inspect final, security-review |

Skills que não entram, e por quê: Babylon.js, PlayCanvas, A-Frame, PixiJS e Spline são motores alternativos ao three; misturar dois motores 3D duplicaria o peso sem ganho. Brandkit e imagegen geram imagens, e esta sessão não tem ferramenta de geração de imagem.
