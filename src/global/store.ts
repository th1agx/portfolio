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
 * Pontos da viagem no scroll, como as rotas-âncora do Aengel: cada nome é um lugar da fita.
 * O número é a fração do scroll total onde a câmera repousa.
 */
export const ANCHORS = {
  intro: 0,
  opened: 0.14,
  cover: 0.28,
  spine: 0.42,
  tracklist: 0.62,
  back: 0.84,
  end: 1,
} as const
export type Anchor = keyof typeof ANCHORS
