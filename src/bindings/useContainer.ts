import { createContext, useContext } from 'react'
import type { Container } from '../app/container'

export const ContainerContext = createContext<Container | null>(null)

/** Dá às views acesso aos controllers e repositórios, sem que elas saibam como são criados. */
export function useContainer() {
  const c = useContext(ContainerContext)
  if (!c) throw new Error('useContainer fora do ContainerContext')
  return c
}
