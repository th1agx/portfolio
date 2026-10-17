import { useEffect, useRef } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useSite } from '../../global/store'
import { useContainer } from '../../bindings/useContainer'
import { person, tracklist } from '../../models/content/pt'

/**
 * A home é só o trilho de scroll que conduz a câmera pela fita. O conteúdo está impresso no encarte 3D;
 * aqui fica a versão em texto, para leitores de tela e buscadores.
 */
export function Home() {
  const track = useRef<HTMLDivElement>(null)
  const { projects, audio, scroll } = useContainer()
  const entered = useSite((s) => s.entered)
  const progress = useSite((s) => s.progress)

  useEffect(() => {
    const st = ScrollTrigger.create({ trigger: track.current, start: 'top top', end: 'bottom bottom', onUpdate: (s) => useSite.getState().setProgress(s.progress) })
    return () => st.kill()
  }, [])

  useEffect(() => { scroll.lock(!entered) }, [entered, scroll])

  const rewind = () => {
    audio.rewind()
    useSite.getState().setVeil(true)
    window.setTimeout(() => { scroll.toProgress(0, true); window.setTimeout(() => useSite.getState().setVeil(false), 120) }, 520)
  }

  return (
    <main>
      <div ref={track} className="track" />
      <section className="sr-only" aria-label="Conteúdo da fita">
        <h1>{person.name}</h1>
        <p>{person.role}. {person.line}</p>
        <h2>Faixas</h2>
        <ol>{tracklist.map((t) => { const p = projects.bySlug(t.slug)!; return <li key={p.slug}><a href={`/projetos/${p.slug}`}>{p.name}</a>: {p.line}</li> })}</ol>
        <p><a href={person.links.github}>GitHub</a> <a href={person.links.linkedin}>LinkedIn</a></p>
      </section>
      {entered && progress > 0.97 && <button className="rewind" onClick={rewind}>Rebobinar a fita</button>}
    </main>
  )
}
