import gsap from 'gsap'
import type { Frameable, Lifecycle } from './Controller'

/** O relógio único do site. Lenis, ScrollTrigger e qualquer outro controller batem aqui. */
export class FrameController implements Lifecycle {
  private subscribers = new Set<Frameable>()
  private last = 0

  private tick = (time: number) => {
    const t = time * 1000
    const delta = this.last ? t - this.last : 16
    this.last = t
    this.subscribers.forEach((s) => s.onFrame(t, delta))
  }

  init() {
    gsap.ticker.add(this.tick)
    gsap.ticker.lagSmoothing(0)
  }

  add(subscriber: Frameable) {
    this.subscribers.add(subscriber)
    return () => this.subscribers.delete(subscriber)
  }

  destroy() {
    gsap.ticker.remove(this.tick)
    this.subscribers.clear()
  }
}
