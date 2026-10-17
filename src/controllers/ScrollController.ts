import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { Frameable, Lifecycle } from './Controller'
import { device } from '../global/device'

gsap.registerPlugin(ScrollTrigger)

/** Scroll nativo suavizado pelo Lenis, ligado ao relógio único e ao ScrollTrigger. */
export class ScrollController implements Lifecycle, Frameable {
  private lenis: Lenis | null = null

  init() {
    if (device.reducedMotion) return
    this.lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 })
    this.lenis.on('scroll', ScrollTrigger.update)
  }

  onFrame(time: number) {
    this.lenis?.raf(time)
  }

  to(target: number | string | HTMLElement, immediate = false) {
    if (this.lenis) this.lenis.scrollTo(target, { immediate, duration: 1.2 })
    else if (typeof target === 'number') window.scrollTo({ top: target })
  }

  /** Pula para uma fração do scroll total (0 a 1). */
  toProgress(p: number, immediate = false) {
    const max = document.documentElement.scrollHeight - window.innerHeight
    this.to(Math.round(max * p), immediate)
  }

  /** Trava e destrava o scroll (com uma faixa aberta por cima da fita). */
  lock(locked: boolean) {
    if (locked) this.lenis?.stop()
    else this.lenis?.start()
    document.documentElement.style.overflow = locked ? 'hidden' : ''
  }

  destroy() {
    this.lenis?.destroy()
    this.lenis = null
  }
}
