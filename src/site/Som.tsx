'use client'

import { useEffect, useRef, useState } from 'react'
import { useTextos } from '@/content/idioma'
import { criarAmbiente, type Ambiente } from '@/som/ambiente'
import s from './som.module.css'

// A música de fundo (src/som/ambiente.ts) e o botão que liga e desliga, no canto de baixo. O navegador só deixa tocar som depois de um
// gesto: ela começa no primeiro clique ou toque (a escolha do idioma já serve). Quem desliga continua desligado nas próximas visitas.
// Com a aba escondida, para.

const CHAVE = 'som'
const GESTOS = ['pointerup', 'touchend', 'keydown', 'click'] as const

export function Som() {
  const t = useTextos()
  const [ligado, setLigado] = useState(true)
  const querido = useRef(true)
  const ambiente = useRef<Ambiente | null>(null)
  const botao = useRef<HTMLButtonElement>(null)

  const tocar = () => {
    ambiente.current ??= criarAmbiente()
    ambiente.current?.ligar()
  }

  useEffect(() => {
    try {
      querido.current = localStorage.getItem(CHAVE) !== 'desligado'
    } catch {}
    setLigado(querido.current)

    const gesto = (e: Event) => {
      // o gesto no próprio botão é tratado pelo clique dele
      if (!querido.current || botao.current?.contains(e.target as Node)) return
      if (ambiente.current?.contexto.state !== 'running') tocar()
    }
    const aba = () => {
      if (document.visibilityState === 'hidden') ambiente.current?.desligar()
      else if (querido.current) ambiente.current?.ligar()
    }
    GESTOS.forEach((g) => addEventListener(g, gesto, { capture: true, passive: true }))
    document.addEventListener('visibilitychange', aba)
    return () => {
      GESTOS.forEach((g) => removeEventListener(g, gesto, { capture: true }))
      document.removeEventListener('visibilitychange', aba)
      ambiente.current?.destruir()
      ambiente.current = null
    }
  }, [])

  const alternar = () => {
    querido.current = !querido.current
    setLigado(querido.current)
    try {
      localStorage.setItem(CHAVE, querido.current ? 'ligado' : 'desligado')
    } catch {}
    if (querido.current) tocar()
    else ambiente.current?.desligar()
  }

  return (
    <button ref={botao} type="button" className={s.botao} data-ligado={ligado ? '1' : '0'} aria-pressed={ligado} aria-label={ligado ? t.som.desligar : t.som.ligar} title={ligado ? t.som.desligar : t.som.ligar} onClick={alternar}>
      <span className={s.barras} aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </span>
    </button>
  )
}
