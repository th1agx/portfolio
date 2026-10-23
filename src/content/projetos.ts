// Projetos, com fatos tirados dos repositórios públicos (github.com/th1agx) e do perfil. Nada inventado.

export type Projeto = {
  id: string
  rotulo: string
  nome: string
  frase: string
  fatos: string[]
  imagem?: { src: string; alt: string }
  palavras?: string[]
  telas?: string[]
  /** inclinação de partida da janela (rx, ry, rz), diferente para cada projeto */
  inclinacao: [number, number, number]
  links: { rotulo: string; href: string }[]
  escuro: boolean
}

export const projetos: Projeto[] = [
  {
    id: 'tributax',
    rotulo: 'Projeto pessoal, 2026',
    nome: 'Tributax',
    frase: 'Um motor tributário em que cada resposta traz a regra aplicada, as descartadas e o fundamento legal.',
    fatos: ['208 testes automatizados', 'ICMS nas 27 unidades da federação', '15 decisões de arquitetura registradas'],
    imagem: { src: '/projetos/tributax.jpg', alt: 'Documentação do Tributax, com o exemplo de uma venda interestadual e os tributos calculados.' },
    links: [
      { rotulo: 'Código', href: 'https://github.com/th1agx/Tributax-Motor-Tributario' },
      { rotulo: 'Documentação', href: 'https://tributax-api.onrender.com/' },
    ],
    escuro: true,
    inclinacao: [0.35, -0.55, 0.06],
  },
  {
    id: 'devguard',
    rotulo: 'Skill para agentes de IA',
    nome: 'DevGuard',
    frase: 'Agentes de IA só entregam depois de mapear, especificar, testar e revisar o próprio trabalho.',
    fatos: ['Seis etapas, do mapa ao relatório', 'Funciona com Claude Code, Codex e Cursor', 'Código aberto, licença MIT'],
    imagem: { src: '/projetos/devguard.jpg', alt: 'Banner do DevGuard Skill com as etapas mapear, especificar, planejar, construir, testar e revisar.' },
    links: [{ rotulo: 'Código', href: 'https://github.com/th1agx/devguard-skill' }],
    escuro: false,
    inclinacao: [-0.3, 0.6, -0.08],
  },
  {
    id: 'erp',
    rotulo: '3D Lab, desde 2026',
    nome: 'ERP e integrações',
    frase: 'Módulos do ERP interno e integrações via API entre os sistemas da empresa, com IA no dia a dia do desenvolvimento.',
    fatos: ['Estagiário de março a junho de 2026', 'Engenheiro de software júnior desde junho', 'JavaScript, PHP, Laravel e Python'],
    palavras: ['ERP', 'APIs', 'Integrações', 'Automação', 'Laravel', 'Python', 'IA aplicada'],
    links: [],
    escuro: true,
    inclinacao: [0.55, 0.15, 0.1],
  },
  {
    id: 'english',
    rotulo: 'Site para o CEFF Education',
    nome: 'English Learning',
    frase: 'O site das aulas de inglês do CEFF, que substituiu o PDF de apresentação usado com novos alunos.',
    fatos: ['React 19, GSAP e Framer Motion', 'Organizado em MVC', 'Publicado no GitHub Pages'],
    imagem: { src: '/projetos/english-0.jpg', alt: 'Site do CEFF Education: Inglês do jeito certo.' },
    telas: ['/projetos/english-0.jpg', '/projetos/english-1.jpg', '/projetos/english-2.jpg', '/projetos/english-3.jpg', '/projetos/english-4.jpg'],
    links: [
      { rotulo: 'Ver o site', href: 'https://th1agx.github.io/English-Learning-Experience/' },
      { rotulo: 'Código', href: 'https://github.com/th1agx/English-Learning-Experience' },
    ],
    escuro: false,
    inclinacao: [-0.25, -0.45, -0.12],
  },
]
