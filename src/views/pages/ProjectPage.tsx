import { useEffect } from 'react'
import { motion } from 'motion/react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { useContainer } from '../../bindings/useContainer'
import { useSite } from '../../global/store'
import { duration, ease } from '../../global/motion'
import { device } from '../../global/device'
import { tracklist } from '../../models/content/pt'

/**
 * A faixa tocando: o texto do projeto sobe por cima da fita escurecida, sem sair do mundo.
 * Esc volta. "Próxima faixa" segue a ordem da fita e dá a volta (depois da última vem a primeira).
 */
export function ProjectPage() {
  const { slug = '' } = useParams()
  const { projects, scroll, audio } = useContainer()
  const navigate = useNavigate()
  const project = projects.bySlug(slug)

  useEffect(() => {
    if (!project) return
    useSite.getState().setActiveProject(project.slug)
    scroll.lock(true)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') navigate('/') }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); useSite.getState().setActiveProject(null); scroll.lock(false) }
  }, [project, scroll, navigate])

  if (!project) return <Navigate to="/" replace />
  const i = tracklist.findIndex((t) => t.slug === project.slug)
  const next = tracklist[(i + 1) % tracklist.length]
  const nextProject = projects.bySlug(next.slug)!
  const code = (k: number) => { const t = tracklist[k]; return `${t.side}${tracklist.slice(0, k + 1).filter((x) => x.side === t.side).length}` }

  const rise = (n: number) => ({
    initial: device.reducedMotion ? { opacity: 0 } : { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: duration.slow, ease: ease.settle, delay: 0.1 + n * 0.07 },
  })

  return (
    <motion.article key={project.slug} className="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: duration.base }}>
      <motion.p className="playing-code" {...rise(0)}>Lado {tracklist[i].side} · faixa {code(i)}</motion.p>
      <motion.h1 className="playing-name" {...rise(1)}>{project.name}</motion.h1>
      <motion.p className="playing-line" {...rise(2)}>{project.line}</motion.p>
      <div className="playing-body">{project.body.map((t, k) => <motion.p key={k} {...rise(3 + k)}>{t}</motion.p>)}</div>
      <motion.dl className="playing-facts" {...rise(4)}>
        {project.facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </motion.dl>
      <motion.p className="playing-stack" {...rise(5)}>{project.stack.join(', ')}</motion.p>
      <motion.p className="playing-links" {...rise(6)}>{project.links.map((l) => <a key={l.href} href={l.href} target="_blank" rel="noopener">{l.label}</a>)}</motion.p>
      <motion.nav className="playing-nav" {...rise(7)}>
        <Link to="/" className="playing-back">Voltar para a fita</Link>
        <Link to={`/projetos/${nextProject.slug}`} className="playing-next" onClick={() => audio.click(0.8)}>
          Próxima faixa: <strong>{nextProject.name}</strong>
        </Link>
      </motion.nav>
    </motion.article>
  )
}
