import { useEffect, useRef } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useSite } from '../../global/store'
import { useContainer } from '../../bindings/useContainer'
import { covers } from '../../models/content/covers'
import { person } from '../../models/content/pt'

/**
 * O trilho de scroll que conduz a câmera pelas capas. No fim, a última capa já mostrou a primeira
 * pelo portal: o scroll volta ao topo sem corte visível e a fita recomeça.
 */
export function Home() {
  const track = useRef<HTMLDivElement>(null)
  const { scroll } = useContainer()
  const entered = useSite((s) => s.entered)

  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: track.current, start: 'top top', end: 'bottom bottom',
      onUpdate: (s) => {
        if (s.progress >= 0.9995 && s.direction > 0) { scroll.toProgress(0, true); useSite.getState().setProgress(0); return }
        useSite.getState().setProgress(s.progress)
      },
    })
    return () => st.kill()
  }, [scroll])

  useEffect(() => { scroll.lock(!entered) }, [entered, scroll])

  return (
    <main>
      <div ref={track} className="track" style={{ height: `${covers.length * 150 + 100}vh` }} />
      <section className="sr-only" aria-label="Conteúdo">
        <p>{person.role}. {person.line}</p>
        <ol>{covers.map((c) => <li key={c.slug}>{c.project ? <a href={`/projetos/${c.project}`}>{c.title}</a> : c.title}: {c.sub}</li>)}</ol>
        <p><a href={person.links.github}>GitHub</a> <a href={person.links.linkedin}>LinkedIn</a></p>
      </section>
    </main>
  )
}
