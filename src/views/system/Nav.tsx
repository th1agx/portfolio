import { ANCHORS, useSite, type Anchor } from '../../global/store'
import { useContainer } from '../../bindings/useContainer'

/**
 * Navegação: três palavras e o som. Pular para longe passa pelo véu (cobre, teletransporta, revela);
 * para perto, a câmera simplesmente viaja. É a regra do Aengel.
 */
export function useJump() {
  const { scroll, audio } = useContainer()
  return (anchor: Anchor) => {
    const target = ANCHORS[anchor]
    const far = Math.abs(target - useSite.getState().progress) > 0.3
    if (!far) { scroll.toProgress(target); return }
    useSite.getState().setVeil(true)
    audio.click(0.6)
    window.setTimeout(() => {
      scroll.toProgress(target, true)
      window.setTimeout(() => useSite.getState().setVeil(false), 120)
    }, 480)
  }
}

export function Nav() {
  const jump = useJump()
  const muted = useSite((s) => s.muted)
  const entered = useSite((s) => s.entered)
  if (!entered) return null
  return (
    <header className="nav">
      <button className="nav-logo" onClick={() => jump('intro')} aria-label="Thiago Antunes, voltar ao começo da fita">
        <img src="/brand/logo-head.png" alt="" width={58} height={22} />
      </button>
      <nav aria-label="Principal">
        <button onClick={() => jump('cover')}>Capa</button>
        <button onClick={() => jump('tracklist')}>Faixas</button>
        <button onClick={() => jump('back')}>Verso</button>
        <button onClick={() => jump('sideA')}>Tocar</button>
        <button onClick={() => useSite.getState().setMuted(!muted)} aria-pressed={!muted}>{muted ? 'Som desligado' : 'Som ligado'}</button>
      </nav>
    </header>
  )
}
