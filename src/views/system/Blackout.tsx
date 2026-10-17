import { useSite, ANCHORS, PLACES } from '../../global/store'

const bump = (p: number, at: number, width: number) => Math.max(0, 1 - Math.abs(p - at) / width)

/**
 * O escuro da janela da fita. Quando a câmera encosta nela, a tela escurece e o corte para dentro
 * da fita acontece no escuro; o mesmo na volta para a mesa. Um corte escondido, como em cinema.
 */
export function Blackout() {
  const p = useSite((s) => s.progress)
  const o = Math.min(1, Math.max(bump(p, ANCHORS.dive, 0.03), bump(p, PLACES.road[1], 0.025)) * 1.4)
  return <div className="blackout" style={{ opacity: o }} aria-hidden />
}
