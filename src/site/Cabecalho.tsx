'use client'

import { useEffect, useRef, useState } from 'react'
import { perfil } from '@/content/perfil'
import { Relogio } from './Relogio'
import s from './site.module.css'

// Cabeçalho: assinatura TA à esquerda, hora de Belo Horizonte no centro e um único botão de menu.
// O menu não abre um painel: a própria pílula se estica para a esquerda e os links aparecem dentro dela,
// um de cada vez. Esc ou clique fora fecham.
// Rolando para baixo, a assinatura e a hora sobem e somem (para não passar por cima do conteúdo);
// rolando para cima, voltam. O botão do menu fica sempre.

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
    let ultimo = window.scrollY
    const rolar = () => {
      const y = window.scrollY
      if (Math.abs(y - ultimo) < 6) return
      setOculto(y > ultimo && y > 160)
      ultimo = y
    }
    window.addEventListener('scroll', rolar, { passive: true })
    return () => window.removeEventListener('scroll', rolar)
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
        <span>Thiago Antunes</span>
      </a>
      <Relogio className={s.relogio} />
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
