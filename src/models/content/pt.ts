import type { Project } from '../entities/Project'

// Todo texto aqui vem do GitHub do Thiago (README do perfil e dos repositórios). Nada inventado.

export const person = {
  name: 'Thiago Antunes',
  role: 'Engenheiro de software',
  line: 'Escrevo sistemas que explicam o que decidiram.',
  links: {
    github: 'https://github.com/th1agx',
    linkedin: 'https://www.linkedin.com/in/thiagofilipeantunes',
    email: 'thiagofsprofissional@gmail.com',
  },
}

export const projects: Project[] = [
  {
    slug: 'tributax',
    name: 'Tributax',
    line: 'Recebe uma operação comercial e devolve cada imposto com valor, base, lei e motivo.',
    body: [
      'Um motor tributário como serviço. Do MEI que emite uma NFS-e à empresa que integra por API, uma requisição volta com tributos, alíquotas, bases, CFOP e CST, fundamentos legais e o rastro completo da decisão.',
      'As regras vivem no banco como dados, não como if espalhado pelo código. Quando a regra ainda não foi conferida contra a fonte, a resposta diz isso em vez de supor.',
      'Uma IA lê o Diário Oficial e propõe regras novas. Nenhuma entra sem um humano aprovar.',
    ],
    facts: [
      ['Notebook de R$ 3.500, MG para SP', 'ICMS 12%: R$ 420,00'],
      ['DIFAL, base dupla, LC 190/2022', 'R$ 256,10'],
      ['Testes', '208 verdes'],
      ['ICMS', '27 de 27 UFs'],
    ],
    stack: ['Node 22', 'NestJS', 'Drizzle', 'Postgres 16', 'pgvector', 'MCP'],
    links: [
      { label: 'Código', href: 'https://github.com/th1agx/Tributax-Motor-Tributario' },
      { label: 'API', href: 'https://tributax-api.onrender.com/docs' },
    ],
    emblem: 'stamp',
  },
  {
    slug: 'devguard',
    name: 'DevGuard',
    line: 'Disciplina de desenvolvimento para agentes de IA, com entrega só por evidência.',
    body: [
      'Uma skill para agentes de IA que trabalham em código: especificação antes de implementar, plano, testes, smoke test, stress test, e entrega baseada no que foi provado.',
    ],
    facts: [['Método', 'SDD, plano, testes, evidência']],
    stack: ['Python', 'Agentes de IA'],
    links: [{ label: 'Código', href: 'https://github.com/th1agx/devguard-skill' }],
    emblem: 'shield',
  },
  {
    slug: 'english',
    name: 'English Learning',
    line: 'Plataforma que apresenta trilhas personalizadas de aprendizado de inglês.',
    body: ['Uma experiência digital para apresentar caminhos de estudo de inglês de forma personalizada. Publicada no GitHub Pages.'],
    facts: [['Status', 'Publicado']],
    stack: ['JavaScript', 'HTML', 'CSS'],
    links: [
      { label: 'Abrir', href: 'https://th1agx.github.io/English-Learning-Experience/' },
      { label: 'Código', href: 'https://github.com/th1agx/English-Learning-Experience' },
    ],
    emblem: 'bubble',
  },
  {
    slug: 'ipito',
    name: 'IPITO',
    line: 'Marketplace brasileiro para adegas, tabacarias e lojas de acessórios.',
    body: ['Em construção. Um marketplace focado em adegas, tabacarias e lojas de acessórios.'],
    facts: [['Status', 'Em construção']],
    stack: ['Em definição'],
    links: [{ label: 'Repositório', href: 'https://github.com/th1agx/ipito-the-marketplace' }],
    emblem: 'bottle',
  },
  {
    slug: 'fh5',
    name: 'FH5 Auto Drive',
    line: 'Python que dirige sozinho no Forza Horizon 5 e acumula XP.',
    body: ['Automação em Python que simula o teclado para conduzir o carro em trajetos contínuos no Forza Horizon 5.'],
    facts: [['Linguagem', 'Python']],
    stack: ['Python'],
    links: [{ label: 'Código', href: 'https://github.com/th1agx/Python---Forza-Horizon-5-Auto-Drive-XP-Farm.' }],
    emblem: 'wheel',
  },
]

/** A ordem da fita: Lado A e Lado B. O código (A1, B2) é o que uma fita de verdade imprime na tracklist. */
export const tracklist: Array<{ side: 'A' | 'B'; slug: string }> = [
  { side: 'A', slug: 'tributax' },
  { side: 'A', slug: 'devguard' },
  { side: 'A', slug: 'english' },
  { side: 'B', slug: 'ipito' },
  { side: 'B', slug: 'fh5' },
]
