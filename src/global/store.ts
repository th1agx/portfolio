import { create } from 'zustand'

export type Axis = 'x' | 'y'
export type Page = 'home' | 'project'

interface SiteState {
  /** 0 → 1 ao longo do scroll da fita: abrir a caixa, puxar o encarte, desdobrar, virar */
  progress: number
  /** faixa sob o cursor na tracklist */
  hoverTrack: string | null
  /** projeto aberto (rota /projetos/:slug) */
  activeProject: string | null
  page: Page
  /** o visitante apertou play: libera o som e a experiência */
  entered: boolean
  muted: boolean
  /** véu cobrindo a tela durante saltos longos */
  veil: boolean
  transition: { axis: Axis; dir: 1 | -1 }
  setProgress: (p: number) => void
  setHoverTrack: (s: string | null) => void
  setActiveProject: (s: string | null) => void
  setPage: (p: Page) => void
  enter: () => void
  setMuted: (m: boolean) => void
  setVeil: (v: boolean) => void
  setTransition: (t: { axis: Axis; dir: 1 | -1 }) => void
}

export const useSite = create<SiteState>((set) => ({
  progress: 0,
  hoverTrack: null,
  activeProject: null,
  page: 'home',
  entered: false,
  muted: false,
  veil: false,
  transition: { axis: 'y', dir: 1 },
  setProgress: (progress) => set({ progress }),
  setHoverTrack: (hoverTrack) => set({ hoverTrack }),
  setActiveProject: (activeProject) => set({ activeProject }),
  setPage: (page) => set({ page }),
  enter: () => set({ entered: true }),
  setMuted: (muted) => set({ muted }),
  setVeil: (veil) => set({ veil }),
  setTransition: (transition) => set({ transition }),
}))

/**
 * Pontos da viagem no scroll, como as rotas-âncora do Aengel: cada nome é um lugar do mundo.
 * O número é a fração do scroll total onde a câmera repousa.
 *
 * Mesa → encarte (capa, lombada, faixas, verso) → toca-fitas → dentro da fita (Lado A)
 * → a fita vira (Lado B, embaixo da fita) → rebobinar.
 */
export const ANCHORS = {
  intro: 0,
  opened: 0.07,
  cover: 0.13,
  spine: 0.19,
  tracklist: 0.26,
  back: 0.33,
  player: 0.42,
  dive: 0.5,
  sideA: 0.6,
  flip: 0.72,
  sideB: 0.84,
  end: 1,
} as const
export type Anchor = keyof typeof ANCHORS

/** Trechos do scroll que pertencem a cada lugar. */
export const PLACES = {
  /** a mesa: encarte e toca-fitas */
  desk: [0, ANCHORS.dive] as const,
  /** dentro da fita: a pista de fita magnética, Lado A em cima e Lado B embaixo */
  road: [ANCHORS.dive, 0.95] as const,
}
