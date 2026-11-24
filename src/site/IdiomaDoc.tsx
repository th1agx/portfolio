'use client'

import { useEffect } from 'react'
import { useIdioma, useTextos } from '@/content/idioma'

// Mantém o documento no idioma escolhido: <html lang>, título da aba e descrição.
export function IdiomaDoc() {
  const idioma = useIdioma((s) => s.idioma)
  const t = useTextos()
  useEffect(() => {
    if (!idioma) return
    document.documentElement.lang = idioma === 'en' ? 'en' : 'pt-BR'
    const aplicar = () => {
      if (document.title !== t.doc.titulo) document.title = t.doc.titulo
      document.querySelector('meta[name="description"]')?.setAttribute('content', t.doc.descricao)
    }
    aplicar()
    // o Next reescreve o título (em português) ao hidratar: quem vem depois dele é este observador
    const obs = new MutationObserver(aplicar)
    obs.observe(document.head, { childList: true, subtree: true, characterData: true })
    return () => obs.disconnect()
  }, [idioma, t])
  return null
}
