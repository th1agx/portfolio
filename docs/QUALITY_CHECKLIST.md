# Checklist de qualidade

Rodar antes de considerar qualquer etapa concluída. Marcar só o que foi verificado de fato, com o comando ou a tela usada.

## Automático

- [ ] `npm run lint` sem erros
- [ ] `npm run typecheck` sem erros
- [ ] `npm run build` gera `out/` sem avisos de erro
- [ ] `npm test` (Playwright) passa
- [ ] `node ~/.claude/skills/taste-skill/scripts/lint.mjs src` sem FAIL
- [ ] `node ~/.claude/skills/taste-skill/scripts/inspect.mjs http://localhost:3000` sem FAIL; cada WARN justificado abaixo
- [ ] Nenhum travessão longo (—) em `src/` (`grep -rn "—" src`)

## Consistência com os documentos

- [ ] Nenhum item de `ANTI_PATTERNS.md` presente na tela
- [ ] Cores, tipos, espaços e durações vêm dos tokens de `DESIGN_SYSTEM.md`
- [ ] Nenhum token criado e não usado
- [ ] Decisões fixas de `DESIGN_DECISIONS.md` respeitadas

## Conteúdo

- [ ] Todo fato tem fonte no repositório ou no perfil do GitHub
- [ ] Nenhuma métrica, cliente, depoimento ou logo inventado
- [ ] Links de contato e de projetos abrem o destino certo
- [ ] Nome e profissão legíveis no primeiro segundo

## Funcionalidade

- [ ] A bolinha chega a cada mecanismo quando o texto do capítulo está à vista
- [ ] O texto nunca fica sobre um mecanismo em nenhum enquadramento
- [ ] Subir a página desfaz o estado exatamente; recarregar no meio reconstrói o estado
- [ ] Os três sensores do DevGuard acendem e o portão abre com a rolagem
- [ ] A câmera entra na caixa de integração e o capítulo escuro é legível
- [ ] Tocar um projeto nos Desvios solta a bolinha daquele ramal e abre a descrição
- [ ] O recibo mostra hora real, ramais abertos e tempo real da visita
- [ ] Teste central: sem o 3D, o site perde a ideia
- [ ] Âncoras do cabeçalho levam à estação certa
- [ ] Console do navegador sem erros

## Responsividade

- [ ] 1440 × 900
- [ ] 1280 × 800
- [ ] 768 × 1024
- [ ] 390 × 844
- [ ] Nenhuma rolagem horizontal em nenhuma largura

## Acessibilidade

- [ ] Navegação completa só com teclado, foco sempre visível
- [ ] Link de pular para o conteúdo
- [ ] Canvas com `aria-hidden`
- [ ] Contraste ≥ 4,5:1 em todo texto
- [ ] `prefers-reduced-motion`: sem viagem da bolinha, sem transição longa
- [ ] Sem WebGL: página completa e legível

## Desempenho

- [ ] Palco carregado depois do primeiro desenho
- [ ] Palco parado (sem frames) quando a rolagem para
- [ ] JS inicial sem o palco medido e anotado
- [ ] Sem vazamento: ScrollTriggers e listeners limpos ao desmontar

## Teste criativo

- [ ] Pode ser confundido com um template comprado?
- [ ] Funcionaria igual com o nome de outro dev?
- [ ] As partes pertencem ao mesmo universo?
- [ ] Os projetos estão na narrativa ou só listados?
- [ ] O movimento tem significado?
- [ ] A navegação é clara?
- [ ] A identidade profissional está clara sem estrutura de currículo?
- [ ] É interessante com os efeitos desligados?
