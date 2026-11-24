'use client'

import { useTextos } from '@/content/idioma'

export function PularLink() {
  const t = useTextos()
  return (
    <a className="pular" href="#ideia">
      {t.pular}
    </a>
  )
}
