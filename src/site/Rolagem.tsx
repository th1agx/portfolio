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
  // A altura que o visitante enxerga agora. As cenas fixas eram de 100svh (a menor altura possível); no iPhone a barra do navegador
  // some ao rolar, a tela cresce e sobrava uma faixa lisa embaixo de cada cena (vale, túnel). --tela acompanha window.innerHeight, que
  // é a altura visível, com uma espera curta para não redimensionar as cenas a cada quadro da animação da barra.
  useEffect(() => {
    const raiz = document.documentElement
    let ultimo = 0
    let espera = 0
    const aplicar = () => {
      const h = Math.round(window.innerHeight)
      if (Math.abs(h - ultimo) <= 1) return
      ultimo = h
      raiz.style.setProperty('--tela', `${h}px`)
    }
    const agendar = () => {
      window.clearTimeout(espera)
      espera = window.setTimeout(aplicar, 120)
    }
    aplicar()
    addEventListener('resize', agendar)
    window.visualViewport?.addEventListener('resize', agendar)
    return () => {
      window.clearTimeout(espera)
      removeEventListener('resize', agendar)
      window.visualViewport?.removeEventListener('resize', agendar)
    }
  }, [])

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
