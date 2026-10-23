'use client'

import dynamic from 'next/dynamic'

// Carrega o robô guia só no navegador, depois do primeiro desenho.
const Guia = dynamic(() => import('@/cena/Guia'), { ssr: false })

export function GuiaRobo() {
  return <Guia />
}
