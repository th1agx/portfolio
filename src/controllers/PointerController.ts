import type { Lifecycle } from './Controller'

/** Posição do ponteiro normalizada (-1 a 1), lida pela cena 3D sem re-render do React. */
export class PointerController implements Lifecycle {
  readonly ndc = { x: 0, y: 0, active: false }

  private onMove = (e: PointerEvent) => {
    this.ndc.x = (e.clientX / window.innerWidth) * 2 - 1
    this.ndc.y = -(e.clientY / window.innerHeight) * 2 + 1
    this.ndc.active = true
  }

  private onLeave = () => {
    this.ndc.active = false
  }

  init() {
    window.addEventListener('pointermove', this.onMove, { passive: true })
    document.addEventListener('pointerleave', this.onLeave)
  }

  destroy() {
    window.removeEventListener('pointermove', this.onMove)
    document.removeEventListener('pointerleave', this.onLeave)
  }
}
