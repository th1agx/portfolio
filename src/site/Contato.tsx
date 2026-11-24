'use client'

import { useTextos } from '@/content/idioma'
import { FiosContato } from './FiosContato'

// O fim do site: a coluna de partículas e o vidro curvo preso no mesmo mundo 3D (FiosContato).
export function Contato() {
  const t = useTextos()
  return (
    <section id="contato" className="contato-fim" aria-labelledby="contato-titulo">
      <h2 id="contato-titulo" className="visually-hidden">
        {t.contato.titulo}
      </h2>
      <FiosContato />
    </section>
  )
}
