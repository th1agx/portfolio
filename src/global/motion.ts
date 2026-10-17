// Durações e curvas nomeadas do site. Nenhuma animação usa um número que não esteja aqui.
export const duration = {
  fast: 0.16,
  base: 0.42,
  slow: 0.8,
  scene: 1.4,
} as const

export const ease = {
  settle: [0.16, 1, 0.3, 1] as const,
  cut: [0.7, 0, 0.84, 0] as const,
  travel: [0.65, 0, 0.35, 1] as const,
}

export const spring = {
  press: { type: 'spring', stiffness: 500, damping: 34, mass: 0.6 } as const,
  emblem: { type: 'spring', stiffness: 140, damping: 18, mass: 1 } as const,
}

export const cubic = (e: readonly number[]) => `cubic-bezier(${e.join(', ')})`
