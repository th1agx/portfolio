'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { projetosDe } from '@/content/projetos'
import { useIdiomaAtual, useTextos } from '@/content/idioma'
import s from './site.module.css'
import { agendar, aguardar } from './fila'
import { trilhaTela } from '@/cena/trilhaTela'

gsap.registerPlugin(ScrollTrigger)

// Trabalho: o mundo em profundidade (src/cena/Obras.tsx). A seção é alta e a cena fica
// presa à tela; a rolagem vira a posição da câmera no caminho entre as capas. No pé da tela, uma legenda de
// filme diz o projeto da vez em uma linha; clicar nela (ou na capa) abre o projeto com a explicação e os links.

const Obras = dynamic(() => import('@/cena/Obras'), { ssr: false })

const seta = (
  <svg viewBox="0 0 12 12" aria-hidden>
    <path d="M3 9 9 3M4 3h5v5" fill="none" stroke="currentColor" strokeWidth="1.6" />
  </svg>
)

export function Projetos() {
  const t = useTextos()
  const projetos = projetosDe(useIdiomaAtual())
  const raiz = useRef<HTMLElement>(null)
  const progresso = useRef(0)
  const entrada = useRef(0)
  const junta = useRef(0)
  const [ativo, setAtivo] = useState(-1)
  const [aberto, setAberto] = useState(-1)
  const [saindo, setSaindo] = useState(false)
  // a cena 3D só monta quando o visitante chega perto (ou o navegador fica ocioso), para o custo de compilar os
  // shaders e subir as texturas não cair no carregamento da página
  const [montar, setMontar] = useState(false)
  const fechar = useRef<HTMLButtonElement>(null)
  const voltarPara = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = raiz.current
    if (!el) return
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => (progresso.current = self.progress),
      onRefresh: (self) => (progresso.current = self.progress),
    })
    // a chegada: o vale embaixo ergue os olhos para o céu (src/cena/lua.ts) e os projetos já estão lá em cima,
    // descendo para o quadro conforme a câmera sobe; o céu deste mundo só cobre o do vale no fim
    const cena = el.querySelector<HTMLElement>('[data-obras-cena]')!
    const vinheta = el.querySelector<HTMLElement>('[data-obras-vinheta]')
    const legenda = el.querySelector<HTMLElement>('[data-obras-painel]')
    const p0 = (k: number) => Math.max(0, 1 - k * 4).toFixed(3)
    const chegar = (p: number) => {
      entrada.current = p
      // a cena só se mostra quando a câmera do vale já olha para o céu; dentro dela, primeiro as partículas e
      // depois as imagens (src/cena/Obras.tsx)
      cena.style.opacity = Math.min(1, Math.max(0, (p - 0.3) / 0.08)).toFixed(3)
      if (vinheta) vinheta.style.opacity = Math.max(0, (p - 0.6) / 0.4).toFixed(3)
      // a legenda só entra quando a câmera terminou de subir
      if (legenda) {
        legenda.style.opacity = Math.max(0, (p - 0.88) / 0.12).toFixed(3)
        legenda.style.visibility = p > 0.88 ? 'visible' : 'hidden'
      }
    }
    chegar(0)
    const entra = ScrollTrigger.create({ trigger: el, start: 'top top', end: () => `+=${innerHeight * 0.9}`, onUpdate: (self) => chegar(self.progress), onRefresh: (self) => chegar(self.progress) })
    // a saída: nada de apagar a luz. No último trecho, ainda presa, a câmera vira e olha o caminho percorrido,
    // com a trilha de luz acendendo por ele, e sobe até ver tudo de cima: o caminho vira a linha em pé que
    // continua como a trilha do "Até aqui" (Trajetoria)
    const sai = ScrollTrigger.create({
      trigger: el,
      start: 'bottom 280%',
      end: 'bottom 100%',
      onRefresh: (self) => (trilhaTela.junta = self.progress),
      onUpdate: (self) => {
        junta.current = self.progress
        trilhaTela.junta = self.progress
        if (legenda) legenda.style.opacity = p0(self.progress)
      },
    })
    // entra na fila de montagem depois do retrato, do robô e do vale (src/site/fila.ts); se a tela chegar perto
    // antes disso, monta na hora. Pronto = shaders compilados e texturas na placa (Precompilar)
    const cancelar = agendar({
      nome: 'obras',
      ordem: 3,
      el,
      margem: '250% 0px',
      rodar: () => {
        setMontar(true)
        return aguardar('obras', 15000)
      },
    })
    return () => {
      cancelar()
      st.kill()
      entra.kill()
      sai.kill()
    }
  }, [])

  const abrir = useCallback((i: number) => {
    const atual = document.activeElement as HTMLElement | null
    // trocar para o próximo projeto de dentro do aberto não muda para onde o foco volta ao fechar
    if (!atual?.closest('[role=dialog]')) voltarPara.current = atual
    setSaindo(false)
    setAberto(i)
  }, [])

  const fecharAgora = useCallback(() => {
    setSaindo(true)
    window.setTimeout(() => {
      setAberto(-1)
      setSaindo(false)
      voltarPara.current?.focus?.()
    }, 520)
  }, [])

  // aberto: a rolagem para, Esc fecha e o foco vai para o botão de fechar
  useEffect(() => {
    if (aberto < 0) return
    window.dispatchEvent(new Event('rolagem:parar'))
    document.documentElement.style.overflow = 'hidden'
    fechar.current?.focus()
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && fecharAgora()
    addEventListener('keydown', tecla)
    return () => {
      removeEventListener('keydown', tecla)
      document.documentElement.style.overflow = ''
      window.dispatchEvent(new Event('rolagem:seguir'))
    }
  }, [aberto, fecharAgora])

  const p = ativo >= 0 ? projetos[ativo] : null
  const q = aberto >= 0 ? projetos[aberto] : null

  return (
    <section ref={raiz} id="trabalho" className={s.obras} aria-labelledby="obras-titulo" data-tema="lima" data-sem-robo style={{ height: `${projetos.length * 120 + 160}svh` }}>
      <h2 id="obras-titulo" className="visually-hidden">
        {t.projetos.titulo}
      </h2>
      <div className={s.obrasPreso}>
        {/* tudo o que está preso à tela aparece e some junto: nenhuma borda da caixa fica à vista */}
        <div className={s.obrasCena} data-obras-cena>
          {montar && <Obras progresso={progresso} entrada={entrada} junta={junta} ativo={setAtivo} abrir={abrir} />}
          <div className={s.obrasVinheta} data-obras-vinheta aria-hidden />
          <div className={s.obrasPainel} data-obras-painel aria-live="polite">
            {p && (
              <button key={p.id} type="button" className={s.obrasLegenda} onClick={() => abrir(ativo)}>
                <b>{p.nome}</b>
                <span>{p.frase}</span>
              </button>
            )}
          </div>
        </div>
      </div>
      {/* para quem não vê a cena: a lista dos projetos com os links */}
      <ul className="visually-hidden">
        {projetos.map((x) => (
          <li key={x.id}>
            {x.nome}: {x.frase}{' '}
            {x.links.map((l) => (
              <a key={l.href} href={l.href}>
                {l.rotulo}
              </a>
            ))}
          </li>
        ))}
      </ul>
      {q &&
        createPortal(
          <div
            key={q.id}
            className={s.obraAberta}
            role="dialog"
            aria-modal="true"
            aria-labelledby="obra-aberta-nome"
            data-saindo={saindo ? '1' : '0'}
            data-lenis-prevent
          >
            <button ref={fechar} type="button" className={s.obraFechar} onClick={fecharAgora}>
              <span>{t.projetos.fechar}</span>
              <svg viewBox="0 0 12 12" aria-hidden>
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
            <h3 id="obra-aberta-nome" className={s.obraAbertaNome}>
              <span>{q.nome}</span>
            </h3>
            <div className={s.obraAbertaTopo}>
              <div className={s.obraAbertaLado}>
                <p className={s.obraAbertaFrase}>{q.frase}</p>
                <div className={s.obraAbertaLinks}>
                  {q.links.map((l) => (
                    <a key={l.href} className={s.obraAbertaLink} href={l.href} target="_blank" rel="noopener noreferrer">
                      {l.rotulo}
                      {seta}
                    </a>
                  ))}
                </div>
              </div>
              {/* a imagem chega como na cena (matriz de pontos) e fica limpa com o mouse em cima */}
              <figure className={s.obraAbertaFigura}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={q.imagem.src} alt={q.imagem.alt} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={q.imagem.src} alt="" aria-hidden className={s.obraAbertaMatriz} />
              </figure>
            </div>
            <div className={s.obraAbertaSobre}>
              {q.sobre.map((t) => (
                <p key={t.slice(0, 24)}>{t}</p>
              ))}
            </div>
            <ul className={s.obraAbertaPilha} aria-label={`${t.projetos.feitoCom} ${q.pilha.join(', ')}`}>
              {q.pilha.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <button type="button" className={s.obraProxima} onClick={() => abrir((aberto + 1) % projetos.length)}>
              <span>{t.projetos.proximo}</span>
              <b>{projetos[(aberto + 1) % projetos.length]!.nome}</b>
            </button>
          </div>,
          document.body,
        )}
    </section>
  )
}
