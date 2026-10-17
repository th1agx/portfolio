import { useEffect, useState } from 'react'
import { ANCHORS, useSite } from '../../global/store'

// Uma frase por trecho da viagem, revelada letra a letra como legenda (o Aengel faz igual).
const LINES: Array<{ from: number; to: number; text: string }> = [
  { from: 0.0, to: ANCHORS.opened - 0.02, text: 'Engenheiro de software em Belo Horizonte.' },
  { from: ANCHORS.opened + 0.01, to: ANCHORS.cover - 0.02, text: 'Tudo o que eu faço cabe nessa fita.' },
  { from: ANCHORS.spine - 0.02, to: ANCHORS.spine + 0.03, text: 'Desde 2026 na 3D Lab, construindo o ERP por dentro.' },
  { from: ANCHORS.tracklist - 0.02, to: ANCHORS.tracklist + 0.04, text: 'Escolha uma faixa, ou continue para ouvir a fita inteira.' },
  { from: ANCHORS.back - 0.02, to: ANCHORS.back + 0.04, text: 'O verso diz onde me encontrar.' },
  { from: ANCHORS.player - 0.03, to: ANCHORS.player + 0.04, text: 'Agora, play.' },
  { from: ANCHORS.sideA - 0.05, to: ANCHORS.sideA + 0.03, text: 'Lado A.' },
  { from: ANCHORS.flip - 0.03, to: ANCHORS.flip + 0.03, text: 'Virando a fita.' },
  { from: ANCHORS.sideB - 0.06, to: ANCHORS.sideB + 0.02, text: 'Lado B.' },
]

export function Narration() {
  const progress = useSite((s) => s.progress)
  const entered = useSite((s) => s.entered)
  const line = LINES.find((l) => progress >= l.from && progress <= l.to)
  const [shown, setShown] = useState(0)

  useEffect(() => {
    setShown(0)
    if (!line) return
    let n = 0
    const id = window.setInterval(() => { n++; setShown(n); if (n >= line.text.length) window.clearInterval(id) }, 22)
    return () => window.clearInterval(id)
  }, [line])

  if (!entered || !line) return null
  return (
    <p className="narration" aria-live="polite">
      <span className="sr-only">{line.text}</span>
      {line.text.split('').map((ch, i) => (
        <span key={i} aria-hidden className={i < shown ? 'g on' : 'g'}>{ch}</span>
      ))}
    </p>
  )
}
