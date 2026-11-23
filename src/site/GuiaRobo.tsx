'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { agendar, aguardar } from './fila'

// O robô guia entra depois do retrato do topo (fila de montagem em src/site/fila.ts): primeiro o retrato
// desenha, só então o robô é carregado, compila os shaders em paralelo e aparece voando até o ponto dele.
const Guia = dynamic(() => import('@/cena/Guia'), { ssr: false })

export function GuiaRobo() {
  const [montar, setMontar] = useState(false)
  useEffect(
    () =>
      agendar({
        nome: 'guia',
        ordem: 2,
        rodar: () => {
          setMontar(true)
          return aguardar('guia')
        },
      }),
    [],
  )
  return montar ? <Guia /> : null
}
