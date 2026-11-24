'use client'

import { useEffect, useRef, useState } from 'react'
import { perfil } from '@/content/perfil'
import { guardarParaRecarga, useIdioma, useTextos } from '@/content/idioma'
import { sinalFeito } from './fila'
import s from './site.module.css'

// Cabeçalho: a assinatura TA à esquerda e o botão do menu à direita. O botão é um círculo com dois traços inclinados, como os olhos de LED do
// robô; aberto, os traços giram e viram um ×. O menu abre para o lado: uma pílula azul-escura se estica do botão para a esquerda e os links
// sobem dentro dela, um de cada vez (o mais perto do botão primeiro); o da vez sobe um pouco.
// No celular a pílula vai até a margem e os itens que não cabem deslizam dentro dela.
// Esc ou clique fora fecham. As cores seguem as da seção que está embaixo. Só aparece na primeira tela e no contato (o <html> recebe
// data-final); no meio do site sobe e some, para não passar por cima de nada.

const ALVOS: Record<string, () => number> = {
  ideia: () => (document.getElementById('ideia')?.getBoundingClientRect().top ?? 0) + scrollY,
  trabalho: () => (document.getElementById('trabalho')?.getBoundingClientRect().top ?? 0) + scrollY,
  trajetoria: () => (document.getElementById('trajetoria')?.getBoundingClientRect().top ?? 0) + scrollY,
  // o contato é o fim da página: a coluna de fios aparece nos últimos metros
  contato: () => document.documentElement.scrollHeight - innerHeight,
}

export function Cabecalho() {
  const t = useTextos()
  const idioma = useIdioma((s) => s.idioma)
  const definir = useIdioma((s) => s.definir)
  const [aberto, setAberto] = useState(false)
  const [oculto, setOculto] = useState(false)
  const raiz = useRef<HTMLElement>(null)

  useEffect(() => {
    let raf = 0
    const ver = () => {
      const noFim = document.documentElement.dataset.final === '1'
      setOculto(window.scrollY > window.innerHeight * 0.5 && !noFim)
      raf = requestAnimationFrame(ver)
    }
    raf = requestAnimationFrame(ver)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (!aberto) return
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    const fora = (e: PointerEvent) => raiz.current && !raiz.current.contains(e.target as Node) && setAberto(false)
    addEventListener('keydown', tecla)
    addEventListener('pointerdown', fora)
    return () => {
      removeEventListener('keydown', tecla)
      removeEventListener('pointerdown', fora)
    }
  }, [aberto])

  const ir = (alvo: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    setAberto(false)
    window.dispatchEvent(new CustomEvent('rolagem:ir', { detail: Math.max(0, ALVOS[alvo]?.() ?? 0) }))
  }

  const trocar = (novo: 'pt' | 'en') => {
    if (novo === idioma) return
    definir(novo)
    // os cartões do "Até aqui" são imagens pintadas uma vez: se já foram pintados, recarrega para pintá-los de novo no idioma novo
    // (sem perguntar o idioma outra vez)
    if (sinalFeito('ate-aqui')) {
      guardarParaRecarga(novo)
      window.setTimeout(() => location.reload(), 250)
    }
  }

  // os itens, da esquerda para a direita; --i conta a partir do botão, para o mais perto entrar primeiro
  const itens: { chave: string; no: React.ReactNode }[] = [
    ...t.menu.secoes.map((sec) => ({
      chave: sec.alvo,
      no: (
        <a href={`#${sec.alvo}`} onClick={ir(sec.alvo)}>
          {sec.rotulo}
        </a>
      ),
    })),
    {
      chave: 'github',
      no: (
        <a href={perfil.github} target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
      ),
    },
    {
      chave: 'linkedin',
      no: (
        <a href={perfil.linkedin} target="_blank" rel="noopener noreferrer">
          LinkedIn
        </a>
      ),
    },
    {
      chave: 'idioma',
      no: (
        <span className={s.menuIdioma} role="group" aria-label={t.menu.idioma}>
          {(['pt', 'en'] as const).map((i) => (
            <button key={i} type="button" lang={i} aria-pressed={idioma === i} onClick={() => trocar(i)}>
              {i.toUpperCase()}
            </button>
          ))}
        </span>
      ),
    },
  ]

  return (
    <header ref={raiz} className={s.cabecalho} data-oculto={oculto && !aberto ? '1' : '0'}>
      <a className={s.assinatura} href="#topo" aria-label={t.inicio}>
        <span className={s.marcaTA} aria-hidden />
      </a>
      <nav className={s.menu} data-aberto={aberto ? '1' : '0'} aria-label={t.menu.nav}>
        <div className={s.menuGaveta}>
        <ul className={s.menuLinks} id="menu-links" inert={!aberto}>
          {itens.map((it, k) => (
            <li key={it.chave} style={{ '--i': itens.length - 1 - k } as React.CSSProperties}>
              <span className={s.menuMascara}>
                <span className={s.menuItem}>
                  {it.no}
                </span>
              </span>
            </li>
          ))}
        </ul>
        </div>
        <button type="button" className={s.menuBotao} aria-expanded={aberto} aria-controls="menu-links" onClick={() => setAberto((a) => !a)}>
          <span className={s.menuIcone} aria-hidden />
          <span className="visually-hidden">{aberto ? t.menu.fechar : t.menu.abrir}</span>
        </button>
      </nav>
    </header>
  )
}
