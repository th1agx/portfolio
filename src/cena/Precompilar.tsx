'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { HalfFloatType, WebGLRenderTarget, type Material, type Object3D, type Texture } from 'three'
import { sinalizar } from '@/site/fila'

// O three.js só compila o shader de um material e só envia a textura para a placa na primeira vez que o
// objeto é desenhado. Como cada projeto e cada trecho do túnel ficam escondidos até a vez deles, isso caía no
// meio da rolagem (travadas de 0,4 a 1 s, medidas). Aqui, logo depois de a cena montar com TUDO dentro (inclusive
// as imagens dos projetos, que chegam por último), os shaders compilam em paralelo (compileAsync usa
// KHR_parallel_shader_compile), as texturas são enviadas uma por vez, com uma pausa entre elas para a página
// continuar respondendo, e um quadro é desenhado fora da tela. No fim, avisa a fila (src/site/fila.ts).
const pausa = () => new Promise<void>((ok) => setTimeout(ok, 0))

export function Precompilar({ nome, post = false }: { nome: string; post?: boolean }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const advance = useThree((s) => s.advance)

  useEffect(() => {
    let vivo = true
    const id = requestAnimationFrame(async () => {
      const escondidos: Object3D[] = []
      const texturas = new Set<Texture>()
      scene.traverse((o) => {
        if (!o.visible) {
          escondidos.push(o)
          o.visible = true
        }
        const m = (o as Object3D & { material?: Material | Material[] }).material
        for (const mat of Array.isArray(m) ? m : m ? [m] : []) {
          for (const v of Object.values(mat)) if (v && (v as Texture).isTexture) texturas.add(v as Texture)
        }
      })
      try {
        const pedidos: Promise<unknown>[] = [gl.compileAsync(scene, camera)]
        // Com pós-processamento (bloom), a cena é desenhada dentro de um render target, e o three.js põe isso na
        // chave do programa: sem compilar também nesse modo, os shaders de verdade só compilavam no primeiro quadro
        // visível (travada na rolagem). Qualquer render target com a mesma configuração dá a mesma chave.
        if (post) {
          const alvo = new WebGLRenderTarget(4, 4, { type: HalfFloatType })
          const antes = gl.getRenderTarget()
          gl.setRenderTarget(alvo)
          pedidos.push(gl.compileAsync(scene, camera))
          gl.setRenderTarget(antes)
          Promise.all(pedidos).finally(() => alvo.dispose())
        }
        await Promise.all(pedidos)
        for (const t of texturas) {
          if (!vivo) break
          gl.initTexture(t)
          await pausa()
        }
        // um quadro com TUDO visível (inclusive o que está escondido até a vez dele): sobe a geometria para a placa
        // e passa pelo pós-processamento. Fora da tela, mesmo com a cena parada (frameloop 'never'). Só depois cada
        // objeto volta ao estado em que estava.
        if (vivo) advance(performance.now())
      } finally {
        escondidos.forEach((o) => (o.visible = false))
      }
      sinalizar(nome)
    })
    return () => {
      vivo = false
      cancelAnimationFrame(id)
    }
  }, [gl, scene, camera, advance, nome, post])

  return null
}
