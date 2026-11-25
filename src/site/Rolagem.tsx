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
    // o menu pede para ir a uma posição (px da página); com rolagem nativa, o navegador suaviza
    const ir = (e: Event) => {
      const y = (e as CustomEvent<number>).detail
      window.scrollTo({ top: y, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      addEventListener('rolagem:ir', ir)
      return () => removeEventListener('rolagem:ir', ir)
    }
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
    const irLenis = (e: Event) => lenis.scrollTo((e as CustomEvent<number>).detail, { duration: 2.4, force: true, easing: (t) => 1 - Math.pow(1 - t, 4) })
    addEventListener('rolagem:ir', irLenis)
    return () => {
      removeEventListener('rolagem:ir', irLenis)
      removeEventListener('rolagem:parar', parar)
      removeEventListener('rolagem:seguir', seguir)
      gsap.ticker.remove(tique)
      lenis.destroy()
    }
  }, [])
  return null
}
