import { coverAnchor, coverState, useSite } from '../../global/store'
import { covers } from '../../models/content/covers'
import { useContainer } from '../../bindings/useContainer'

/**
 * Pular para uma capa. Perto: a câmera atravessa os portais no caminho. Longe: o véu cobre,
 * teletransporta e revela, como no Aengel.
 */
export function useJump() {
  const { scroll, audio } = useContainer()
  return (i: number) => {
    const from = coverState(useSite.getState().progress).shown
    const target = coverAnchor(i)
    if (Math.abs(i - from) <= 1) { scroll.toProgress(target); return }
    useSite.getState().setVeil(true)
    audio.click(0.6)
    window.setTimeout(() => {
      scroll.toProgress(target, true)
      window.setTimeout(() => useSite.getState().setVeil(false), 120)
    }, 480)
  }
}

const idx = (slug: string) => covers.findIndex((c) => c.slug === slug)

export function Nav() {
  const jump = useJump()
  const muted = useSite((s) => s.muted)
  const entered = useSite((s) => s.entered)
  if (!entered) return null
  return (
    <nav className="nav" aria-label="Principal">
      <button onClick={() => jump(0)}>Início</button>
      <button onClick={() => jump(idx('tributax'))}>Faixas</button>
      <button onClick={() => jump(idx('contato'))}>Contato</button>
      <button onClick={() => useSite.getState().setMuted(!muted)} aria-pressed={!muted}>{muted ? 'Som desligado' : 'Som ligado'}</button>
    </nav>
  )
}
