'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { Material, Object3D, Texture } from 'three'

// O three.js só compila o shader de um material e só envia a textura para a placa na primeira vez que o
// objeto é desenhado. Como cada projeto e cada trecho do túnel ficam escondidos até a vez deles, isso caía no
// meio da rolagem (travadas de 0,5 a 1,5 s, medidas no build). Aqui, logo depois de a cena montar, tudo é
// mostrado por um instante, compilado em paralelo (compileAsync usa KHR_parallel_shader_compile), as texturas
// são enviadas, cada objeto volta ao estado em que estava e um quadro é desenhado.
export function Precompilar() {
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
        await gl.compileAsync(scene, camera)
        if (vivo) texturas.forEach((t) => gl.initTexture(t))
      } finally {
        escondidos.forEach((o) => (o.visible = false))
      }
      // o pós-processamento (bloom, vinheta) compila os próprios shaders no primeiro quadro: desenha um agora,
      // ainda fora da tela, mesmo quando a cena está parada (frameloop 'never')
      if (vivo) advance(performance.now())
    })
    return () => {
      vivo = false
      cancelAnimationFrame(id)
    }
  }, [gl, scene, camera, advance])

  return null
}
