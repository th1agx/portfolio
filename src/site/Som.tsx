'use client'

import { useEffect } from 'react'
import { useTextos } from '@/content/idioma'
import { calar, encerrar, retomar, tocando, tocar, useSom } from '@/som/controle'
import s from './som.module.css'

// A música de fundo (src/som/ambiente.ts). Som: não desenha nada; o navegador só deixa tocar depois de um gesto, então ela começa no
// primeiro clique ou toque (a escolha do idioma já serve) e para com a aba escondida. BotaoSom: o item do menu que liga e desliga.

const GESTOS = ['pointerup', 'touchend', 'keydown', 'click'] as const

export function Som() {
  useEffect(() => {
    useSom.getState().lembrar()
    const gesto = (e: Event) => {
      // o gesto no próprio botão é tratado pelo clique dele
      if (!useSom.getState().ligado || (e.target as Element | null)?.closest?.('[data-som]')) return
      if (!tocando()) tocar()
    }
    const aba = () => {
      if (document.visibilityState === 'hidden') calar()
      else if (useSom.getState().ligado) retomar()
    }
    GESTOS.forEach((g) => addEventListener(g, gesto, { capture: true, passive: true }))
    document.addEventListener('visibilitychange', aba)
    return () => {
      GESTOS.forEach((g) => removeEventListener(g, gesto, { capture: true }))
      document.removeEventListener('visibilitychange', aba)
      encerrar()
    }
  }, [])
  return null
}

export function BotaoSom() {
  const t = useTextos()
  const ligado = useSom((e) => e.ligado)
  const alternar = useSom((e) => e.alternar)
  const rotulo = ligado ? t.som.desligar : t.som.ligar
  return (
    <button type="button" className={s.botao} data-som data-ligado={ligado ? '1' : '0'} aria-pressed={ligado} aria-label={rotulo} title={rotulo} onClick={alternar}>
      <span className={s.barras} aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </span>
    </button>
  )
}
