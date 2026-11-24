// Projetos do README do perfil (github.com/th1agx), com as frases tiradas dos próprios repositórios. Nada inventado.
import { arquivo } from '@/content/caminho'
import type { Idioma } from './textos'

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
      'Cada cena é desenhada ao vivo, sem vídeo pronto: o retrato e o fluido que revela o robô, o vale em raymarch, este mundo de projetos e a trilha que guia até o túnel.',
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

// A versão em inglês: só o que muda de texto (nomes, imagens e endereços são os mesmos).
type Traducao = Partial<Pick<Projeto, 'tipo' | 'frase' | 'sobre' | 'pilha'>> & { alt: string; rotulos?: string[] }

const emIngles: Record<string, Traducao> = {
  mneme: {
    tipo: 'Hybrid financial AI',
    frase: 'It studies the market, learns from data and measures every decision, combining machine learning, a local LLM and deterministic risk.',
    sobre: [
      'A hybrid financial AI for Forex, gold, crypto and fixed-expiry trades. The core rule: no strategy is accepted without proof measured on data it has never seen.',
      'Each layer does what it does best and has a clear limit: machine learning estimates probability, volatility and regime; the LLM with RAG reads the news and forms hypotheses, but sets neither direction nor size; the risk engine enforces limits in deterministic code and yields to no other module.',
      'Every decision can be reconstructed, audited and compared with what actually happened. It currently runs in simulation.',
    ],
    pilha: ['Python', 'LightGBM and XGBoost', 'LangGraph', 'Ollama', 'PostgreSQL and pgvector', 'Parquet'],
    alt: 'Illustration of a MNEME dashboard: SOL/USDT candles, model probability, risk engine limits and measured signals.',
    rotulos: ['Live', 'Code'],
  },
  tributax: {
    tipo: 'Tax decision engine',
    frase: 'A tax engine where every answer comes with the rule applied, the ones discarded and the legal basis.',
    sobre: [
      'A tax engine as a service: you send the data of an operation (who issues, who receives, what it is, where it goes) and get back the full tax burden, with the amount of each tax, the base, the rule applied, the legal basis and why the alternatives were discarded.',
      'The rules live in the database as data, with controlled validity. Every decision carries an auditable trail and the hash of the rule set, and legal uncertainty becomes a warning in the answer, never a silent assumption: a rule that is not found never becomes zero tax.',
      'An AI agent follows the legislation and only proposes drafts; a person approves. ICMS in all 27 states, DIFAL, PIS and Cofins, IPI, ISS, Simples Nacional and CBS and IBS. 208 passing tests.',
    ],
    alt: 'Tributax answer for a laptop sold from MG to SP: ICMS, DIFAL, PIS, Cofins, CBS and IBS with amount and legal basis.',
    rotulos: ['Documentation', 'Code'],
  },
  devguard: {
    tipo: 'Discipline for AI agents',
    frase: 'AI agents only deliver after mapping, specifying, testing and reviewing their own work.',
    sobre: [
      'A discipline skill for development agents such as Claude Code, Codex, Cursor and Gemini CLI. Agents move too fast: they infer the architecture from a few files, skip tests and deliver confidence without evidence.',
      'DevGuard imposes a short, repeatable path: map the project, write the specification, plan a small implementation, build the smallest useful slice, run tests, smoke and stress checks, review the diff and deliver with evidence.',
      'It works with just SKILL.md in context; the Python and Node scripts detect the stack, map the project and produce the proof.',
    ],
    alt: 'The DevGuard steps and a terminal running the map, test, smoke and stress scripts.',
    rotulos: ['Code'],
  },
  forza: {
    tipo: 'Python automation',
    frase: 'Race automation for Forza Horizon 5: acceleration, timing and automatic restart for continuous XP farming.',
    sobre: [
      'Python automation for Forza Horizon 5 races: it simulates the keyboard to accelerate by itself, times each race and starts the next one, repeating as many times as the user sets, to farm XP continuously on a specific map.',
      'Built as a pair with Samuel Felix, to study and practice automation, flow control and modularization.',
    ],
    alt: 'Illustration of a night race with the accumulated XP and the PyAutoGUI snippet that accelerates by itself.',
    rotulos: ['Code'],
  },
  english: {
    tipo: 'Interface in motion',
    frase: 'The website for the CEFF English classes, which replaced the PDF presentation used with new students.',
    sobre: [
      'The website for the private English classes at CEFF Education, from A1 to C2, online and in person. It replaced the PDF presentation used with new students and takes the interested visitor straight to the free trial class on WhatsApp.',
      'The screen is a fixed stage: the whole site passes through the camera on a track driven by scrolling, with entrances that undo when you scroll back, layered parallax and the A1 to C2 strip crossing the screen sideways. No images, by the teacher’s decision: everything comes from typography, color and composition.',
    ],
    alt: 'CEFF Education website: English the right way.',
    rotulos: ['See the site', 'Code'],
  },
  portfolio: {
    tipo: 'thiagoantunes.com',
    frase: 'This site: Next.js, three.js and GSAP, with the portrait that turns into a robot and scenes tied to scrolling.',
    sobre: [
      'This site. The top is the portrait that turns into a robot where the cursor passes, with a fluid simulated on the GPU; then come the raymarched lunar valley, this world of projects and the journey road, all tied to scrolling.',
      'Every scene is drawn live, with no pre-rendered video: the portrait and the fluid that reveals the robot, the raymarched valley, this world of projects and the trail that leads to the tunnel.',
    ],
    alt: "The top of this portfolio, with Thiago's portrait revealing the robot version.",
    rotulos: ['Code'],
  },
}

/** os projetos no idioma pedido */
export function projetosDe(idioma: Idioma): Projeto[] {
  if (idioma === 'pt') return projetos
  return projetos.map((p) => {
    const t = emIngles[p.id]
    if (!t) return p
    return {
      ...p,
      tipo: t.tipo ?? p.tipo,
      frase: t.frase ?? p.frase,
      sobre: t.sobre ?? p.sobre,
      pilha: t.pilha ?? p.pilha,
      imagem: { ...p.imagem, alt: t.alt },
      links: p.links.map((l, i) => ({ ...l, rotulo: t.rotulos?.[i] ?? l.rotulo })),
    }
  })
}
