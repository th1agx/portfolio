'use client'

import { useEffect } from 'react'
import { arquivo } from '@/content/caminho'

// Avisa o contador (src/app/api/visitas/route.ts) que o site foi aberto, uma vez por carregamento. Espera um pouco para não disputar a
// rede com as imagens do começo; se falhar, o site segue igual. Navegador controlado por automação não conta.
// Junto vão o site de onde a pessoa veio e a marca do link (?de=nome), para a lista de últimas visitas.

let contado = false

export function ContaVisita() {
  useEffect(() => {
    if (contado || navigator.webdriver) return
    const espera = window.setTimeout(() => {
      contado = true
      const corpo = JSON.stringify({ origem: document.referrer.slice(0, 300), de: new URLSearchParams(location.search).get('de')?.slice(0, 60) ?? '' })
      fetch(arquivo('/api/visitas'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corpo, keepalive: true }).catch(() => {})
    }, 2000)
    return () => window.clearTimeout(espera)
  }, [])
  return null
}
