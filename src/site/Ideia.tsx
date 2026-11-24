'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import s from './site.module.css'
import { iniciarLua } from '@/cena/lua'
import { vigiarContexto } from '@/cena/contexto'
import { arquivo } from '@/content/caminho'
import { agendar, sinalizar } from './fila'
import { useTextos } from '@/content/idioma'

gsap.registerPlugin(ScrollTrigger)

// Duas colunas: à esquerda o título e o parágrafo; à direita a vaga reservada para o painel que veio do
// topo pelo caminho curvo (ele pousa ali e fica parado enquanto o texto passa ao lado, sem cobrir nada).
// As linhas do título entram assim: cada linha abre da esquerda para a
// direita enquanto um bloco azul por cima dela encolhe no sentido contrário. Embaixo, as camadas de como
// ele constrói (stack e arquitetura) acendem no vale lunar como faróis, que a câmera passa ao rolar.

// como eu construo, camada por camada (README do perfil e dos repositórios): a stack de cada uma e a regra de
// arquitetura que vale nela. Cada camada vira um farol no vale, que a câmera passa ao rolar.
// (os textos de cada farol, nos dois idiomas, ficam em src/content/textos.ts; aqui só o lugar dele no vale)
const FAROIS = [
  { x: -1.6, z: -11 },
  { x: 1.7, z: -13.4 },
  { x: -1.5, z: -15.8 },
  { x: 1.6, z: -18.2 },
  { x: -1.7, z: -20.6 },
  { x: 1.5, z: -23 },
]

export function Ideia() {
  const t = useTextos()
  const secao = useRef<HTMLElement>(null)
  const lua = useRef<HTMLCanvasElement>(null)
  const rotulos = useRef<(HTMLDivElement | null)[]>([])

  // o fundo lunar (chão de pedra em raymarch), no lugar do fundo branco, com os faróis das camadas
  useEffect(() => {
    const canvas = lua.current
    const el = secao.current
    if (!canvas || !el) return
    const farois = FAROIS.map((f, i) => ({ x: f.x, z: f.z, rotulo: rotulos.current[i]! })).filter((f) => f.rotulo)
    let parar: (() => void) | null = null
    let soltarContexto: (() => void) | null = null
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
        // contexto WebGL perdido e devolvido pelo navegador: o vale é montado de novo no mesmo canvas
        soltarContexto = vigiarContexto(canvas, () => {
          parar?.()
          parar = iniciarLua(canvas, el, arquivo(''), farois).parar
        })
        // a tela de abertura marca o vale como pronto (src/site/Abertura.tsx)
        r.pronta.then(() => sinalizar('lua'))
        // pronta = programa compilado e texturas na placa; se algo falhar, não segura a fila por mais de 6 s
        return Promise.race([r.pronta, new Promise<void>((ok) => setTimeout(ok, 6000))])
      },
    })
    return () => {
      cancelar()
      soltarContexto?.()
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
            <div key={i} ref={(el) => void (rotulos.current[i] = el)} className={s.farol} style={{ opacity: 0 }}>
              <span className={s.farolNome}>{t.ideia.farois[i]!.nome}</span>
              <span className={s.farolValor}>{t.ideia.farois[i]!.valor}</span>
              <span className={s.farolLei}>{t.ideia.farois[i]!.lei}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={s.ideiaTexto}>
      <h2 className={s.titulo}>
        <span className={s.tituloMascara}>
          <span className={`${s.tituloLinha} ${s.tituloLinha1}`}>
            {t.ideia.linha1}
            <span className={s.ancoraTitulo} data-robo="sentar" aria-hidden />
          </span>
        </span>
        <span className={s.tituloMascara}>
          <span className={`${s.tituloLinha} ${s.tituloLinha2}`}>{t.ideia.linha2}</span>
        </span>
      </h2>
      <div className={s.colunaTexto}>
        <p className={s.paragrafo}>
          {t.ideia.p1}
        </p>
        <p className={s.paragrafo}>
          {t.ideia.p2}
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
