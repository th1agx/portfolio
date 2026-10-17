import { create } from 'zustand'

/** Etapas reais do carregamento. O texto do loader é exatamente o que o código está fazendo. */
export type LoadStage = 'fonts' | 'printing' | 'compiling' | 'ready'

export const STAGE_LABEL: Record<LoadStage, string> = {
  fonts: 'Carregando as fontes do encarte',
  printing: 'Imprimindo o encarte',
  compiling: 'Compilando os shaders',
  ready: 'Pronto',
}

interface LoaderState {
  stage: LoadStage
  progress: number
  set: (stage: LoadStage, progress: number) => void
}

export const useLoader = create<LoaderState>((set) => ({
  stage: 'fonts',
  progress: 0,
  set: (stage, progress) => set({ stage, progress }),
}))
