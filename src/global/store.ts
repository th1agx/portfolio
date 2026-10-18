import { create } from 'zustand'
import { covers } from '../models/content/covers'

interface SiteState {
  /** 0 → 1 ao longo de todo o scroll: cada capa ocupa um trecho igual */
  progress: number
  /** projeto aberto (rota /projetos/:slug) */
  activeProject: string | null
  /** o visitante apertou play: libera o som e a experiência */
  entered: boolean
  muted: boolean
  /** véu cobrindo a tela durante saltos longos */
  veil: boolean
  setProgress: (p: number) => void
  setActiveProject: (s: string | null) => void
  enter: () => void
  setMuted: (m: boolean) => void
  setVeil: (v: boolean) => void
}

export const useSite = create<SiteState>((set) => ({
  progress: 0,
  activeProject: null,
  entered: false,
  muted: false,
  veil: false,
  setProgress: (progress) => set({ progress }),
  setActiveProject: (activeProject) => set({ activeProject }),
  enter: () => set({ entered: true }),
  setMuted: (muted) => set({ muted }),
  setVeil: (veil) => set({ veil }),
}))

const smooth = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t) }

/**
 * Onde a viagem está: qual capa (a), qual vem pelo portal (b) e quanto a câmera já entrou (zoom).
 * Primeiros 40% do trecho: a câmera se aproxima devagar. Resto: atravessa o portal.
 */
export function coverState(p: number) {
  const n = covers.length
  const x = Math.min(0.99999, Math.max(0, p)) * n
  const a = Math.floor(x), local = x - a
  const zoom = 0.06 * smooth(0, 0.4, local) + 0.94 * smooth(0.4, 1, local)
  return { a, b: (a + 1) % n, local, zoom, shown: local > 0.82 ? (a + 1) % n : a }
}

/** Fração do scroll em que a capa i aparece inteira. */
export const coverAnchor = (i: number) => i / covers.length
