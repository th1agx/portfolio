import { isFrameable, type Lifecycle } from './Controller'
import type { FrameController } from './FrameController'

/** Inicia controllers em ordem, liga os que precisam de frame ao relógio, destrói na ordem inversa. */
export class ControllerRegistry {
  private items: Lifecycle[] = []
  private unsubs: Array<() => void> = []

  constructor(private frame: FrameController) {}

  register(...controllers: Lifecycle[]) {
    this.items.push(...controllers)
    return this
  }

  start() {
    this.frame.init()
    for (const c of this.items) {
      c.init()
      if (isFrameable(c)) this.unsubs.push(this.frame.add(c) as () => void)
    }
  }

  stop() {
    this.unsubs.forEach((u) => u())
    ;[...this.items].reverse().forEach((c) => c.destroy())
    this.frame.destroy()
  }
}
