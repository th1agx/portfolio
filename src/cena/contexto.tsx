'use client'

import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { useThree } from '@react-three/fiber'

// O navegador pode tirar o contexto WebGL de um canvas (placa de vídeo reiniciada, muitas abas com WebGL, memória de
// vídeo acabando, aba esquecida por muito tempo) e devolvê-lo depois, vazio: sem isto o canvas ficava em branco (o fundo
// azul sem o mundo 3D) ou o robô saía todo preto, porque as texturas e o ambiente de luz se perdem. Aqui o contexto é
// aceito de volta e a cena é refeita do zero.

/** Vigia um canvas de WebGL puro: quando o contexto volta, chama `refazer`. Devolve quem para de vigiar */
export function vigiarContexto(canvas: HTMLCanvasElement, refazer: () => void): () => void {
  let t: number | undefined
  const perdeu = (e: Event) => e.preventDefault() // sem isto o navegador nunca devolve o contexto
  const voltou = () => {
    window.clearTimeout(t)
    t = window.setTimeout(refazer, 120)
  }
  canvas.addEventListener('webglcontextlost', perdeu)
  canvas.addEventListener('webglcontextrestored', voltou)
  return () => {
    window.clearTimeout(t)
    canvas.removeEventListener('webglcontextlost', perdeu)
    canvas.removeEventListener('webglcontextrestored', voltou)
  }
}

function Vigia({ aoVoltar }: { aoVoltar: () => void }) {
  const canvas = useThree((s) => s.gl.domElement)
  useEffect(() => vigiarContexto(canvas, aoVoltar), [canvas, aoVoltar])
  return null
}

/** Para um <Canvas> do R3F: `chave` vai no `key` do Canvas (muda quando o contexto volta, e a cena é montada de novo) e
 *  `filho` vai dentro dele */
export function useRecuperacao(): { chave: number; filho: ReactElement } {
  const [chave, setChave] = useState(0)
  const filho = useMemo(() => <Vigia aoVoltar={() => setChave((k) => k + 1)} />, [])
  return { chave, filho }
}
