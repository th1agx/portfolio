import { useEffect, useState, type ReactNode } from 'react'
import { covers } from '../../models/content/covers'
import { coverState, useSite } from '../../global/store'
import { device } from '../../global/device'

/**
 * O encarte em volta da capa: a faixa de créditos, a lombada com o nome e o número de catálogo.
 * O título manuscrito da capa em cena se reescreve letra por letra quando a câmera atravessa o portal.
 */
export function JCard({ children, onOpenProject }: { children: ReactNode; onOpenProject: (slug: string) => void }) {
  const progress = useSite((s) => s.progress)
  const entered = useSite((s) => s.entered)
  const { shown, local } = coverState(progress)
  const cover = covers[shown]
  const [lit, setLit] = useState(0)

  useEffect(() => {
    setLit(0)
    let n = 0
    const id = window.setInterval(() => { n++; setLit(n); if (n >= cover.title.length) window.clearInterval(id) }, device.reducedMotion ? 1 : 45)
    return () => window.clearInterval(id)
  }, [cover.title])

  // o texto de baixo só fica enquanto a capa está parada, não durante a travessia
  const resting = local < 0.42 || local > 0.9

  return (
    <div className="jcard">
      <aside className="jc-credits" aria-hidden>
        <svg className="jc-mark" viewBox="0 0 60 60"><rect x="6" y="12" width="48" height="36" rx="6" fill="var(--paper)" stroke="var(--line)" strokeWidth="4" /><circle cx="21" cy="30" r="7" fill="none" stroke="var(--line)" strokeWidth="3.5" /><circle cx="39" cy="30" r="7" fill="none" stroke="var(--line)" strokeWidth="3.5" /></svg>
        <p className="jc-rot">Engenheiro de software · 3D Lab · Belo Horizonte<br />Python · TypeScript · PHP · Laravel · Nest · IA<br />Gravado em 2026 · Escrito e programado por Thiago</p>
      </aside>
      <div className="jc-band" style={{ backgroundColor: cover.band }} aria-hidden>
        <div className="jc-label"><img src="/brand/logo-head.png" alt="" /></div>
        <div className="jc-name"><span>THIAGO ANTUNES</span></div>
        <div className="jc-cat"><b key={cover.cat}>{cover.cat}</b></div>
      </div>
      <div className="jc-cover">
        {children}
        {entered && (
          <>
            <h1 className="jc-title" aria-label={cover.title}>
              {[...cover.title].map((ch, i) => <span key={`${cover.slug}-${i}`} aria-hidden className={i < lit ? 'g on' : 'g'}>{ch === ' ' ? ' ' : ch}</span>)}
            </h1>
            <div className={resting ? 'jc-foot on' : 'jc-foot'}>
              <p className="jc-sub">{cover.sub}</p>
              {cover.project && <button className="jc-open" onClick={() => onOpenProject(cover.project!)}>ouvir a faixa</button>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
