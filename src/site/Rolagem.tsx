'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Rolagem com inércia sobre a rolagem nativa do navegador (Lenis), para não
// quebrar teclado, âncoras e leitores de tela. O ScrollTrigger é atualizado pelo mesmo relógio do GSAP.
// Com movimento reduzido, a rolagem fica nativa e sem suavização.

export function Rolagem() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 })
    lenis.on('scroll', ScrollTrigger.update)
    const tique = (t: number) => lenis.raf(t * 1000)
    gsap.ticker.add(tique)
    gsap.ticker.lagSmoothing(0)
    // um projeto aberto por cima da página para a rolagem até fechar
    const parar = () => lenis.stop()
    const seguir = () => lenis.start()
    addEventListener('rolagem:parar', parar)
    addEventListener('rolagem:seguir', seguir)
    return () => {
      removeEventListener('rolagem:parar', parar)
      removeEventListener('rolagem:seguir', seguir)
      gsap.ticker.remove(tique)
      lenis.destroy()
    }
  }, [])
  return null
}
