'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import s from './site.module.css'
import { iniciarLua } from '@/cena/lua'
import { arquivo } from '@/content/caminho'
import { agendar, sinalizar } from './fila'

gsap.registerPlugin(ScrollTrigger)

// Duas colunas: à esquerda o título e o parágrafo; à direita a vaga reservada para o painel que veio do
// topo pelo caminho curvo (ele pousa ali e fica parado enquanto o texto passa ao lado, sem cobrir nada).
// As linhas do título entram como no site do Lando (high-line-reveal): cada linha abre da esquerda para a
// direita enquanto um bloco azul por cima dela encolhe no sentido contrário. Embaixo, as camadas de como
// ele constrói (stack e arquitetura) acendem no vale lunar como faróis, que a câmera passa ao rolar.

// como eu construo, camada por camada (README do perfil e dos repositórios): a stack de cada uma e a regra de
// arquitetura que vale nela. Cada camada vira um farol no vale, que a câmera passa ao rolar.
const FAROIS = [
  { x: -1.6, z: -11, nome: 'ERP na 3D Lab', valor: 'JavaScript, PHP, Laravel e Python', lei: 'features fullstack e integrações via API' },
  { x: 1.7, z: -13.4, nome: 'Back-end', valor: 'Python, Node, NestJS e TypeScript', lei: 'regras como dados, cada decisão com rastro' },
  { x: -1.5, z: -15.8, nome: 'Dados', valor: 'Postgres, pgvector, Drizzle e Parquet', lei: 'versionado e sem olhar o futuro' },
  { x: 1.6, z: -18.2, nome: 'IA e agentes', valor: 'Python, LLMs, RAG, LangGraph e Ollama', lei: 'a IA propõe, o código determinístico decide' },
  { x: -1.7, z: -20.6, nome: 'Front-end', valor: 'Next.js, React 19, three.js e GSAP', lei: 'MVC e SOLID, views só apresentam' },
  { x: 1.5, z: -23, nome: 'Entrega', valor: 'Claude Code, Codex e DevGuard', lei: 'testes e evidência antes de dizer pronto' },
]

export function Ideia() {
  const secao = useRef<HTMLElement>(null)
  const lua = useRef<HTMLCanvasElement>(null)
  const rotulos = useRef<(HTMLDivElement | null)[]>([])

  // o fundo lunar (chão de pedra do orchestrated), no lugar do fundo branco, com os faróis das camadas
  useEffect(() => {
    const canvas = lua.current
    const el = secao.current
    if (!canvas || !el) return
    const farois = FAROIS.map((f, i) => ({ x: f.x, z: f.z, rotulo: rotulos.current[i]! })).filter((f) => f.rotulo)
    let parar: (() => void) | null = null
    // entra na fila de montagem depois do retrato e do robô (src/site/fila.ts); se a tela chegar perto do vale
    // antes disso, monta na hora
    const cancelar = agendar({
      nome: 'lua',
      // o vale é grande e começa onde o herói termina: vem antes do robô (que é pequeno) e, se o visitante começar
      // a rolar antes da vez dele, monta na hora (margem 0: o vale começa exatamente no fim da primeira tela)
      ordem: 1,
      el,
      // margem negativa: o vale começa colado no fim da primeira tela, e o IntersectionObserver conta elemento
      // encostado na borda como visível (com 0px montaria já no carregamento)
      margem: '-2% 0px',
      rodar: () => {
        const r = iniciarLua(canvas, el, arquivo(''), farois)
        parar = r.parar
        // a tela de abertura marca o vale como pronto (src/site/Abertura.tsx)
        r.pronta.then(() => sinalizar('lua'))
        // pronta = programa compilado e texturas na placa; se algo falhar, não segura a fila por mais de 6 s
        return Promise.race([r.pronta, new Promise<void>((ok) => setTimeout(ok, 6000))])
      },
    })
    return () => {
      cancelar()
      parar?.()
    }
  }, [])

  useEffect(() => {
    const el = secao.current
    if (!el) return
    const entrada = ScrollTrigger.create({ trigger: el, start: 'top 55%', onEnter: () => (el.dataset.visivel = '1'), onLeaveBack: () => (el.dataset.visivel = '0') })
    return () => {
      entrada.kill()
    }
  }, [])

  return (
    <section id="ideia" ref={secao} className={s.ideia} data-visivel="0" data-tema="lima">
      <div className={s.luaCamada} aria-hidden>
        <div className={s.luaPreso}>
          <canvas ref={lua} className={s.luaCanvas} />
          {FAROIS.map((f, i) => (
            <div key={f.nome} ref={(el) => void (rotulos.current[i] = el)} className={s.farol} style={{ opacity: 0 }}>
              <span className={s.farolNome}>{f.nome}</span>
              <span className={s.farolValor}>{f.valor}</span>
              <span className={s.farolLei}>{f.lei}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={s.ideiaTexto}>
      <h2 className={s.titulo}>
        <span className={s.tituloMascara}>
          <span className={`${s.tituloLinha} ${s.tituloLinha1}`}>
            Sistemas que
            <span className={s.ancoraTitulo} data-robo="sentar" aria-hidden />
          </span>
        </span>
        <span className={s.tituloMascara}>
          <span className={`${s.tituloLinha} ${s.tituloLinha2}`}>se explicam</span>
        </span>
      </h2>
      <div className={s.colunaTexto}>
        <p className={s.paragrafo}>
          Engenheiro de software na 3D Lab: ERP, integrações via API e agentes de IA em produção. Fora dela, o mesmo princípio — o
          Tributax devolve cada cálculo com a regra aplicada, as descartadas e o fundamento legal; o DevGuard só deixa agente de IA
          entregar com prova.
        </p>
        <p className={s.paragrafo}>
          Pelo vale, as camadas de como eu construo: a stack de cada uma e a regra de arquitetura que eu não quebro.
        </p>
        <span className={s.ancoraBotao} data-robo="joinha" aria-hidden />
      </div>
      </div>
      {/* mais dois pontos do robô no vale: ele acompanha a caminhada pelos faróis */}
      <span className={s.ancoraVale} style={{ top: '52%' }} data-robo="acenar" aria-hidden />
      <span className={s.ancoraVale} style={{ top: '76%' }} data-robo="sim" aria-hidden />
      {/* a vaga onde o painel do topo pousa depois de viajar pelo caminho curvo */}
      <div className={s.pouso} data-pouso aria-hidden />
    </section>
  )
}
