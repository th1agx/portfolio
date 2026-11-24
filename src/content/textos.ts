// Todos os textos da interface, nos dois idiomas. Os projetos (o que cada um é) ficam em projetos.ts.

export type Idioma = 'pt' | 'en'

const pt = {
  pular: 'Pular para o conteúdo',
  inicio: 'Thiago Antunes, início',
  abertura: {
    carregando: 'Carregando o portfólio de Thiago Antunes',
    calibrando: 'Calibrando a íris',
    pular: 'Pular abertura',
  },
  escolha: {
    rotulo: 'Idioma · Language',
    pergunta: 'Em que idioma você prefere ver o site?',
    opcoes: { pt: 'Português', en: 'English' },
    nota: { pt: 'Brasil', en: 'International' },
  },
  menu: {
    abrir: 'Abrir menu',
    fechar: 'Fechar menu',
    nav: 'Principal',
    secoes: [
      { alvo: 'ideia', rotulo: 'Ideia', nota: 'Como eu construo' },
      { alvo: 'trabalho', rotulo: 'Trabalho', nota: 'Projetos' },
      { alvo: 'trajetoria', rotulo: 'Até aqui', nota: 'Trajetória' },
      { alvo: 'contato', rotulo: 'Contato', nota: 'Escreva' },
    ],
    idioma: 'Idioma',
    email: 'E-mail',
  },
  heroi: {
    titulo: 'Thiago Antunes, engenheiro de software',
    retrato: 'Retrato de Thiago Antunes, metade humano e metade robô. O cursor revela a versão robô.',
  },
  ideia: {
    linha1: 'Sistemas que',
    linha2: 'se explicam',
    p1: 'Engenheiro de software na 3D Lab: ERP, integrações via API e agentes de IA em produção. Fora dela, o mesmo princípio — o Tributax devolve cada cálculo com a regra aplicada, as descartadas e o fundamento legal; o DevGuard só deixa agente de IA entregar com prova.',
    p2: 'Pelo vale, as camadas de como eu construo: a stack de cada uma e a regra de arquitetura que eu não quebro.',
    farois: [
      { nome: 'ERP na 3D Lab', valor: 'JavaScript, PHP, Laravel e Python', lei: 'features fullstack e integrações via API' },
      { nome: 'Back-end', valor: 'Python, Node, NestJS e TypeScript', lei: 'regras como dados, cada decisão com rastro' },
      { nome: 'Dados', valor: 'Postgres, pgvector, Drizzle e Parquet', lei: 'versionado e sem olhar o futuro' },
      { nome: 'IA e agentes', valor: 'Python, LLMs, RAG, LangGraph e Ollama', lei: 'a IA propõe, o código determinístico decide' },
      { nome: 'Front-end', valor: 'Next.js, React 19, three.js e GSAP', lei: 'MVC e SOLID, views só apresentam' },
      { nome: 'Entrega', valor: 'Claude Code, Codex e DevGuard', lei: 'testes e evidência antes de dizer pronto' },
    ],
  },
  projetos: {
    titulo: 'Projetos',
    fechar: 'Fechar',
    proximo: 'Próximo projeto',
    feitoCom: 'Feito com',
  },
  trajetoria: {
    titulo: 'Até aqui',
    intro: 'Da primeira formação ao ERP e à IA na 3D Lab, sempre estudando junto com o trabalho.',
    tunel: 'Animação: o robô voa por um túnel até o contato',
    etapas: [
      { onde: 'Estácio, 2022–2024', ano: '22–24', casa: 'Estácio', titulo: 'Análise e Desenvolvimento de Sistemas', texto: 'Formação tecnóloga na Estácio.' },
      { onde: 'Graduação, 2025', ano: '25', casa: 'Estácio', titulo: 'Engenharia de Software', texto: 'Graduação em andamento, junto com o trabalho.' },
      { onde: '3D Lab, março de 2026', ano: '03.26', casa: '3D Lab', titulo: 'Estagiário na 3D Lab', texto: 'Entrei por um desafio técnico: um cadastro de produtos em JavaScript puro.' },
      { onde: '3D Lab, junho de 2026', ano: '06.26', casa: '3D Lab', titulo: 'Engenheiro de software júnior', texto: 'ERP, integrações via API e IA aplicada no dia a dia.' },
    ],
  },
  contato: {
    titulo: 'Contato',
    chamada: 'Se quiser conversar sobre um sistema, escreva.',
  },
  guia: 'Robô guia. Clique para ele reagir.',
  doc: {
    titulo: 'Thiago Antunes, engenheiro de software',
    descricao: 'Sistemas de empresa, integrações e regras que mostram por que decidiram.',
  },
}

export type Textos = typeof pt

const en: Textos = {
  pular: 'Skip to content',
  inicio: 'Thiago Antunes, home',
  abertura: {
    carregando: "Loading Thiago Antunes's portfolio",
    calibrando: 'Calibrating the iris',
    pular: 'Skip intro',
  },
  escolha: {
    rotulo: 'Idioma · Language',
    pergunta: 'Which language do you prefer for the site?',
    opcoes: { pt: 'Português', en: 'English' },
    nota: { pt: 'Brasil', en: 'International' },
  },
  menu: {
    abrir: 'Open menu',
    fechar: 'Close menu',
    nav: 'Main',
    secoes: [
      { alvo: 'ideia', rotulo: 'Idea', nota: 'How I build' },
      { alvo: 'trabalho', rotulo: 'Work', nota: 'Projects' },
      { alvo: 'trajetoria', rotulo: 'So far', nota: 'Journey' },
      { alvo: 'contato', rotulo: 'Contact', nota: 'Say hello' },
    ],
    idioma: 'Language',
    email: 'Email',
  },
  heroi: {
    titulo: 'Thiago Antunes, software engineer',
    retrato: 'Portrait of Thiago Antunes, half human and half robot. The cursor reveals the robot version.',
  },
  ideia: {
    linha1: 'Systems that',
    linha2: 'explain themselves',
    p1: 'Software engineer at 3D Lab: ERP, API integrations and AI agents in production. Outside it, the same principle — Tributax returns every calculation with the rule applied, the ones discarded and the legal basis; DevGuard only lets an AI agent deliver with proof.',
    p2: 'Across the valley, the layers of how I build: the stack of each one and the architecture rule I never break.',
    farois: [
      { nome: 'ERP at 3D Lab', valor: 'JavaScript, PHP, Laravel and Python', lei: 'full-stack features and API integrations' },
      { nome: 'Back-end', valor: 'Python, Node, NestJS and TypeScript', lei: 'rules as data, every decision leaves a trail' },
      { nome: 'Data', valor: 'Postgres, pgvector, Drizzle and Parquet', lei: 'versioned and never peeking at the future' },
      { nome: 'AI and agents', valor: 'Python, LLMs, RAG, LangGraph and Ollama', lei: 'AI proposes, deterministic code decides' },
      { nome: 'Front-end', valor: 'Next.js, React 19, three.js and GSAP', lei: 'MVC and SOLID, views only present' },
      { nome: 'Delivery', valor: 'Claude Code, Codex and DevGuard', lei: 'tests and evidence before saying done' },
    ],
  },
  projetos: {
    titulo: 'Projects',
    fechar: 'Close',
    proximo: 'Next project',
    feitoCom: 'Built with',
  },
  trajetoria: {
    titulo: 'So far',
    intro: 'From the first degree to ERP and AI at 3D Lab, always studying alongside the work.',
    tunel: 'Animation: the robot flies through a tunnel to the contact',
    etapas: [
      { onde: 'Estácio, 2022–2024', ano: '22–24', casa: 'Estácio', titulo: 'Systems Analysis and Development', texto: 'Technologist degree at Estácio.' },
      { onde: 'Degree, 2025', ano: '25', casa: 'Estácio', titulo: 'Software Engineering', texto: 'Degree in progress, alongside work.' },
      { onde: '3D Lab, March 2026', ano: '03.26', casa: '3D Lab', titulo: 'Intern at 3D Lab', texto: 'I joined through a technical challenge: a product catalog in plain JavaScript.' },
      { onde: '3D Lab, June 2026', ano: '06.26', casa: '3D Lab', titulo: 'Junior software engineer', texto: 'ERP, API integrations and applied AI, every day.' },
    ],
  },
  contato: {
    titulo: 'Contact',
    chamada: "If you'd like to talk about a system, write to me.",
  },
  guia: 'Guide robot. Click to make it react.',
  doc: {
    titulo: 'Thiago Antunes, software engineer',
    descricao: 'Business systems, integrations and rules that show why they decided.',
  },
}

export const TEXTOS: Record<Idioma, Textos> = { pt, en }
