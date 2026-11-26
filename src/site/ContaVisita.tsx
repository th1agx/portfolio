'use client'

import { useEffect } from 'react'
import { arquivo } from '@/content/caminho'

// Avisa o contador (src/app/api/visitas/route.ts) que o site foi aberto, uma vez por carregamento. Espera um pouco para não disputar a
// rede com as imagens do começo; se falhar, o site segue igual. Navegador controlado por automação não conta.

let contado = false

export function ContaVisita() {
  useEffect(() => {
    if (contado || navigator.webdriver) return
    const espera = window.setTimeout(() => {
      contado = true
      fetch(arquivo('/api/visitas'), { method: 'POST', keepalive: true }).catch(() => {})
    }, 2000)
    return () => window.clearTimeout(espera)
  }, [])
  return null
}
