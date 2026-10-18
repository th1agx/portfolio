// As capas da fita, na ordem. A última leva de volta à primeira.
// Imagens em public/capas/<slug>/capa.png (ver docs/CAPAS_PROMPTS.md); profundidade opcional em depth.png.

export interface Cover {
  slug: string
  /** título manuscrito sobre a capa */
  title: string
  /** uma frase, nas palavras do Thiago */
  sub: string
  /** número de catálogo na lombada */
  cat: string
  /** cor da faixa com o nome */
  band: string
  /** as 5 tintas a que a imagem é reduzida: fundo, tinta 1, tinta 2, papel, traço */
  inks: [string, string, string, string, string]
  /** retângulo do portal na imagem (0 a 1, origem no canto superior esquerdo) */
  portal: { x: number; y: number; w: number; h: number }
  /** projeto aberto ao clicar na capa */
  project?: string
}

const PAPER = '#F2E8CF', LINE = '#1A1414'
const centered = { x: 0.34, y: 0.26, w: 0.32, h: 0.4 }

export const covers: Cover[] = [
  { slug: 'inicio', title: 'Thiago Antunes', sub: 'Engenheiro de software na 3D Lab. Escrevo sistemas que explicam o que decidiram.', cat: 'TA-001', band: PAPER,
    inks: ['#1E1F5C', '#E0453A', '#F2B630', PAPER, LINE], portal: centered },
  { slug: 'tributax', title: 'Tributax', sub: 'Recebe uma operação e devolve cada imposto com valor, lei e motivo. 208 testes verdes.', cat: 'TA-002', band: '#F5D547',
    inks: ['#2F8F5B', '#F5D547', '#F08BB0', PAPER, LINE], portal: centered, project: 'tributax' },
  { slug: 'devguard', title: 'DevGuard', sub: 'Disciplina para agentes de IA: especificação, testes e entrega só com evidência.', cat: 'TA-003', band: '#B9A3E8',
    inks: ['#5B4B9A', '#B9A3E8', '#E0453A', PAPER, LINE], portal: centered, project: 'devguard' },
  { slug: 'english', title: 'English Learning', sub: 'Trilhas personalizadas para aprender inglês. Publicado no GitHub Pages.', cat: 'TA-004', band: '#F28C38',
    inks: ['#2E6B4F', '#F28C38', '#7EC8E3', PAPER, LINE], portal: centered, project: 'english' },
  { slug: 'ipito', title: 'IPITO', sub: 'Marketplace para adegas, tabacarias e lojas de acessórios. Em construção.', cat: 'TA-005', band: '#2BB3A8',
    inks: ['#1D1A3A', '#D63C86', '#2BB3A8', PAPER, LINE], portal: centered, project: 'ipito' },
  { slug: 'fh5', title: 'FH5 Auto Drive', sub: 'Python que dirige sozinho no Forza Horizon 5 e acumula XP.', cat: 'TA-006', band: '#F2752E',
    inks: ['#22378C', '#F2752E', '#F5D547', PAPER, LINE], portal: centered, project: 'fh5' },
  { slug: '3dlab', title: '3D Lab', sub: 'Engenheiro de Software Jr desde 06/2026. Módulos do ERP, do banco à tela.', cat: 'TA-007', band: '#E0453A',
    inks: ['#1E3A8A', '#E0453A', '#F2B630', PAPER, LINE], portal: centered },
  { slug: 'contato', title: 'Lado de fora', sub: 'github.com/th1agx · linkedin.com/in/thiagofilipeantunes', cat: 'TA-008', band: '#F2B630',
    inks: ['#141747', '#F2B630', '#E0453A', PAPER, LINE], portal: centered },
]
