'use client'

import { useEffect, useRef, useState } from 'react'
import { perfil } from '@/content/perfil'
import s from './site.module.css'

// Cabeçalho: assinatura TA à esquerda e um único botão de menu.
// O menu não abre um painel: a própria pílula se estica para a esquerda e os links aparecem dentro dela,
// um de cada vez. Esc ou clique fora fecham.
// As cores seguem as da seção que está embaixo (texto e botão
// trocam juntos com o fundo). Só aparece na primeira tela e no contato (o <html> recebe data-final); no meio
// do site sobe e some, para não passar por cima de nada.

const links = [
  { href: '#ideia', rotulo: 'Ideia' },
  { href: '#trabalho', rotulo: 'Trabalho' },
  { href: perfil.github, rotulo: 'GitHub' },
  { href: perfil.linkedin, rotulo: 'LinkedIn' },
  { href: `mailto:${perfil.email}`, rotulo: 'E-mail' },
]

export function Cabecalho() {
  const [aberto, setAberto] = useState(false)
  const raiz = useRef<HTMLElement>(null)
  const [oculto, setOculto] = useState(false)

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
    window.addEventListener('keydown', tecla)
    window.addEventListener('pointerdown', fora)
    return () => {
      window.removeEventListener('keydown', tecla)
      window.removeEventListener('pointerdown', fora)
    }
  }, [aberto])

  return (
    <header className={s.cabecalho} data-oculto={oculto && !aberto ? '1' : '0'}>
      <a className={s.assinatura} href="#topo" aria-label="Thiago Antunes, início">
        <span className={s.marcaTA} aria-hidden />
      </a>
      <nav ref={raiz} className={s.menu} data-aberto={aberto ? '1' : '0'} aria-label="Principal">
        <div className={s.menuLinks} id="menu-links" inert={!aberto}>
          <div>
            {links.map((l, i) => (
              <a key={l.href} href={l.href} onClick={() => setAberto(false)} style={{ '--i': links.length - i } as React.CSSProperties}>
                {l.rotulo}
              </a>
            ))}
          </div>
        </div>
        <button type="button" className={s.menuBotao} aria-expanded={aberto} aria-controls="menu-links" onClick={() => setAberto((a) => !a)}>
          <span className={s.menuIcone} aria-hidden />
          <span className="visually-hidden">{aberto ? 'Fechar menu' : 'Abrir menu'}</span>
        </button>
      </nav>
    </header>
  )
}
