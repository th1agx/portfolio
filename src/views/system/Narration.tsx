import { useEffect, useState } from 'react'
import { ANCHORS, useSite } from '../../global/store'

// Uma frase por trecho da viagem, revelada letra a letra como legenda (o Aengel faz igual).
const LINES: Array<{ from: number; to: number; text: string }> = [
  { from: 0.0, to: ANCHORS.opened - 0.02, text: 'Engenheiro de software em Belo Horizonte.' },
  { from: ANCHORS.opened + 0.02, to: ANCHORS.cover - 0.04, text: 'Tudo o que eu faço cabe nessa fita.' },
  { from: ANCHORS.spine - 0.04, to: ANCHORS.spine + 0.06, text: 'Desde 2026 na 3D Lab, construindo o ERP por dentro.' },
  { from: ANCHORS.tracklist - 0.05, to: ANCHORS.tracklist + 0.08, text: 'Escolha uma faixa.' },
  { from: ANCHORS.back - 0.05, to: ANCHORS.back + 0.07, text: 'O verso diz onde me encontrar.' },
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
