// Projetos, com fatos tirados dos repositórios públicos (github.com/th1agx) e do perfil. Nada inventado.
import { arquivo } from '@/content/caminho'

export type Projeto = {
  id: string
  rotulo: string
  nome: string
  frase: string
  /** especificações em linhas rótulo—valor, sem lista com marcador */
  specs: { k: string; v: string }[]
  imagem?: { src: string; alt: string }
  links: { rotulo: string; href: string }[]
}

export const projetos: Projeto[] = [
  {
    id: 'tributax',
    rotulo: 'Projeto pessoal — 2026',
    nome: 'Tributax',
    frase: 'Motor tributário que devolve a regra aplicada, as regras que descartou e o fundamento legal de cada uma.',
    specs: [
      { k: 'Testes', v: '208 automatizados' },
      { k: 'ICMS', v: '27 unidades da federação' },
      { k: 'Decisões', v: '15 ADRs registradas' },
    ],
    imagem: { src: arquivo('/projetos/tributax.jpg'), alt: 'Documentação do Tributax, com o exemplo de uma venda interestadual e os tributos calculados.' },
    links: [
      { rotulo: 'Código', href: 'https://github.com/th1agx/Tributax-Motor-Tributario' },
      { rotulo: 'Documentação', href: 'https://tributax-api.onrender.com/' },
    ],
  },
  {
    id: 'devguard',
    rotulo: 'Skill para agentes de IA',
    nome: 'DevGuard',
    frase: 'Agente de IA só entrega depois de mapear, especificar, planejar, construir, testar e revisar o próprio trabalho.',
    specs: [
      { k: 'Etapas', v: 'seis, do mapa ao relatório' },
      { k: 'Agentes', v: 'Claude Code, Codex, Cursor' },
      { k: 'Licença', v: 'MIT, código aberto' },
    ],
    imagem: { src: arquivo('/projetos/devguard.jpg'), alt: 'Banner do DevGuard Skill com as etapas mapear, especificar, planejar, construir, testar e revisar.' },
    links: [{ rotulo: 'Código', href: 'https://github.com/th1agx/devguard-skill' }],
  },
  {
    id: 'erp',
    rotulo: '3D Lab — desde 2026',
    nome: 'ERP e integrações',
    frase: 'Módulos do ERP interno e integrações via API entre os sistemas da empresa, com IA no dia a dia do desenvolvimento.',
    specs: [
      { k: 'Função', v: 'engenheiro de software júnior' },
      { k: 'Período', v: 'estágio mar–jun 2026, efetivado em jun' },
      { k: 'Stack', v: 'JavaScript, PHP, Laravel, Python' },
    ],
    links: [],
  },
  {
    id: 'english',
    rotulo: 'Site para o CEFF Education',
    nome: 'English Learning',
    frase: 'Site das aulas de inglês do CEFF, que substituiu o PDF de apresentação usado com novos alunos.',
    specs: [
      { k: 'Feito em', v: 'React 19, GSAP, Framer Motion' },
      { k: 'Arquitetura', v: 'MVC' },
      { k: 'Publicado', v: 'GitHub Pages' },
    ],
    imagem: { src: arquivo('/projetos/english-0.jpg'), alt: 'Site do CEFF Education: Inglês do jeito certo.' },
    links: [
      { rotulo: 'Ver o site', href: 'https://th1agx.github.io/English-Learning-Experience/' },
      { rotulo: 'Código', href: 'https://github.com/th1agx/English-Learning-Experience' },
    ],
  },
]
