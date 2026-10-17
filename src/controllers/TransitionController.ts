import type { Lifecycle } from './Controller'
import type { Sequence } from '../models/services/Sequence'
import { useSite } from '../global/store'

/**
 * Decide o eixo e o sentido da troca de página.
 * Projeto para projeto: lateral, pelo lado da sequência (com volta infinita).
 * Início e projeto: vertical.
 */
export class TransitionController implements Lifecycle {
  constructor(private sequence: Sequence) {}

  init() {}

  resolve(from: string, to: string) {
    const a = slugOf(from)
    const b = slugOf(to)
    if (a && b) {
      const dir = this.sequence.next(a) === b ? 1 : this.sequence.prev(a) === b ? -1 : 1
      useSite.getState().setTransition({ axis: 'x', dir })
    } else {
      useSite.getState().setTransition({ axis: 'y', dir: b ? 1 : -1 })
    }
  }

  destroy() {}
}

const slugOf = (path: string) => path.match(/^\/projetos\/([^/]+)/)?.[1] ?? null
