// Projetos do README do perfil (github.com/th1agx), com as frases tiradas dos próprios repositórios. Nada inventado.
import { arquivo } from '@/content/caminho'

export type Projeto = {
  id: string
  nome: string
  /** o que é, em poucas palavras (vem do card do README) */
  tipo: string
  frase: string
  /** a explicação que abre ao clicar no projeto (tirada do README de cada repositório) */
  sobre: string[]
  pilha: string[]
  imagem: { src: string; alt: string }
  links: { rotulo: string; href: string }[]
}

export const projetos: Projeto[] = [
  {
    id: 'mneme',
    nome: 'MNEME',
    tipo: 'IA financeira híbrida',
    frase: 'Estuda o mercado, aprende com dados e mede cada decisão, combinando machine learning, LLM local e risco determinístico.',
    sobre: [
      'Uma IA financeira híbrida para Forex, ouro, cripto e operações de expiração fixa. A regra central: nenhuma estratégia é aceita sem prova medida em dados que ela nunca viu.',
      'Cada camada faz o que faz melhor e tem um limite claro: o machine learning estima probabilidade, volatilidade e regime; o LLM com RAG lê notícias e formula hipóteses, mas não define direção nem tamanho; o motor de risco impõe limites em código determinístico e não cede a nenhum outro módulo.',
      'Cada decisão pode ser reconstruída, auditada e comparada com o que aconteceu de fato. Hoje opera em simulado.',
    ],
    pilha: ['Python', 'LightGBM e XGBoost', 'LangGraph', 'Ollama', 'PostgreSQL e pgvector', 'Parquet'],
    imagem: { src: arquivo('/projetos/mneme.jpg'), alt: 'Ilustração de um painel da MNEME: velas de SOL/USDT, probabilidade do modelo, limites do motor de risco e sinais medidos.' },
    links: [
      { rotulo: 'Ao vivo', href: 'https://mneme-1b8.pages.dev/' },
      { rotulo: 'Código', href: 'https://github.com/th1agx/MNEME' },
    ],
  },
  {
    id: 'tributax',
    nome: 'Tributax',
    tipo: 'Motor de decisão tributária',
    frase: 'Um motor tributário em que cada resposta traz a regra aplicada, as descartadas e o fundamento legal.',
    sobre: [
      'Um motor tributário como serviço: você envia os dados de uma operação (quem emite, quem recebe, o que é, para onde vai) e recebe a carga tributária completa, com o valor de cada imposto, a base, a regra aplicada, o fundamento legal e por que as alternativas foram descartadas.',
      'As regras vivem no banco como dados, com vigência controlada. Toda decisão carrega um rastro auditável e o hash do conjunto de regras, e a incerteza normativa vira um aviso na resposta, nunca suposição silenciosa: regra não encontrada nunca vira imposto zero.',
      'Um agente de IA acompanha a legislação e só propõe rascunhos; quem aprova é uma pessoa. ICMS nas 27 UFs, DIFAL, PIS e Cofins, IPI, ISS, Simples Nacional e CBS e IBS. 208 testes verdes.',
    ],
    pilha: ['Node 22', 'NestJS', 'TypeScript strict', 'Drizzle', 'Postgres 16', 'MCP'],
    imagem: { src: arquivo('/projetos/tributax.jpg'), alt: 'A resposta do Tributax para um notebook vendido de MG para SP: ICMS, DIFAL, PIS, Cofins, CBS e IBS com valor e fundamento.' },
    links: [
      { rotulo: 'Documentação', href: 'https://tributax-api.onrender.com/docs' },
      { rotulo: 'Código', href: 'https://github.com/th1agx/Tributax-Motor-Tributario' },
    ],
  },
  {
    id: 'devguard',
    nome: 'DevGuard Skill',
    tipo: 'Disciplina para agentes de IA',
    frase: 'Agentes de IA só entregam depois de mapear, especificar, testar e revisar o próprio trabalho.',
    sobre: [
      'Uma skill de disciplina para agentes de desenvolvimento como Claude Code, Codex, Cursor e Gemini CLI. Agentes avançam rápido demais: inferem a arquitetura de poucos arquivos, pulam testes e entregam confiança sem evidência.',
      'O DevGuard impõe um caminho curto e repetível: mapear o projeto, escrever a especificação, planejar uma implementação pequena, construir a menor fatia útil, rodar testes, smoke e stress checks, revisar o diff e entregar com evidência.',
      'Funciona só com o SKILL.md no contexto; os scripts em Python e Node detectam a stack, mapeiam o projeto e produzem as provas.',
    ],
    pilha: ['Markdown', 'Python', 'Node.js', 'GitHub Actions'],
    imagem: { src: arquivo('/projetos/devguard.jpg'), alt: 'As etapas do DevGuard e um terminal com os scripts de mapa, testes, smoke e stress rodando.' },
    links: [{ rotulo: 'Código', href: 'https://github.com/th1agx/devguard-skill' }],
  },
  {
    id: 'forza',
    nome: 'Forza Auto Drive',
    tipo: 'Automação em Python',
    frase: 'Automação de corridas no Forza Horizon 5: aceleração, controle de tempo e reinício automático para farm contínuo de XP.',
    sobre: [
      'Automação em Python para as corridas do Forza Horizon 5: simula o teclado para acelerar sozinho, controla o tempo de cada corrida e reinicia a próxima, repetindo quantas vezes o usuário definir, para farm contínuo de XP num mapa específico.',
      'Feito em dupla com Samuel Felix, para estudo e prática de automação, controle de fluxo e modularização.',
    ],
    pilha: ['Python', 'PyAutoGUI'],
    imagem: { src: arquivo('/projetos/forza.jpg'), alt: 'Ilustração de uma corrida noturna com o XP acumulado e o trecho de PyAutoGUI que acelera sozinho.' },
    links: [{ rotulo: 'Código', href: 'https://github.com/th1agx/Python---Forza-Horizon-5-Auto-Drive-XP-Farm.' }],
  },
  {
    id: 'english',
    nome: 'English Learning',
    tipo: 'Interface com movimento',
    frase: 'O site das aulas de inglês do CEFF, que substituiu o PDF de apresentação usado com novos alunos.',
    sobre: [
      'O site das aulas particulares de inglês do CEFF Education, do A1 ao C2, online e presencial. Substituiu o PDF de apresentação usado com novos alunos e leva o interessado direto para a aula experimental gratuita pelo WhatsApp.',
      'A tela é um palco fixo: o site inteiro passa pela câmera num trilho movido pela rolagem, com entradas que se desfazem ao voltar, parallax em camadas e a faixa A1 a C2 cruzando a tela de lado. Sem imagens, por decisão do professor: tudo vem da tipografia, da cor e da composição.',
    ],
    pilha: ['React 19', 'Vite', 'GSAP e ScrollTrigger', 'Framer Motion', 'Lenis'],
    imagem: { src: arquivo('/projetos/english-0.jpg'), alt: 'Site do CEFF Education: Inglês do jeito certo.' },
    links: [
      { rotulo: 'Ver o site', href: 'https://th1agx.github.io/English-Learning-Experience/' },
      { rotulo: 'Código', href: 'https://github.com/th1agx/English-Learning-Experience' },
    ],
  },
  {
    id: 'portfolio',
    nome: 'Portfólio',
    tipo: 'thiagoantunes.com',
    frase: 'Este site: Next.js, three.js e GSAP, com o retrato que vira robô e as cenas presas à rolagem.',
    sobre: [
      'Este site. O topo é o retrato que vira robô onde o cursor passa, com um fluido simulado na GPU; depois vêm o vale lunar em raymarch, este mundo de projetos e a estrada da trajetória, tudo preso à rolagem.',
      'Cada cena foi estudada em sites de referência e refeita do zero: o retrato do Lando Norris, o vale do Orchestrated e esta página de trabalhos do Sztanki.',
    ],
    pilha: ['Next.js', 'React 19', 'three.js e React Three Fiber', 'GLSL', 'GSAP', 'Lenis'],
    imagem: { src: arquivo('/projetos/portfolio.jpg'), alt: 'O topo deste portfólio, com o retrato de Thiago revelando a versão robô.' },
    links: [{ rotulo: 'Código', href: 'https://github.com/th1agx/Portifolio_ThiagoAntunes' }],
  },
]

/** imagens de fundo da parede (as telas extras do English entram também) */
export const imagensDaParede = [
  ...projetos.map((p) => p.imagem.src),
  arquivo('/projetos/english-1.jpg'),
  arquivo('/projetos/english-2.jpg'),
  arquivo('/projetos/english-3.jpg'),
  arquivo('/projetos/english-4.jpg'),
]
