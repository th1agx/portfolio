import { AnimatePresence, motion } from 'motion/react'
import { STAGE_LABEL, useLoader } from '../../global/loader'
import { useSite } from '../../global/store'
import { useContainer } from '../../bindings/useContainer'
import { duration, ease } from '../../global/motion'

/** Tela de entrada: mostra a etapa real do carregamento e, quando tudo compilou, o play. */
export function Loader() {
  const { stage, progress } = useLoader()
  const entered = useSite((s) => s.entered)
  const { audio } = useContainer()
  const ready = stage === 'ready'

  const play = () => {
    audio.enable()
    useSite.getState().enter()
  }

  return (
    <AnimatePresence>
      {!entered && (
        <motion.div className="loader" exit={{ opacity: 0, transition: { duration: duration.slow, ease: ease.cut } }}>
          <p className="loader-name">Thiago Antunes</p>
          <p className="loader-stage" aria-live="polite">{STAGE_LABEL[stage]}</p>
          <div className="loader-bar" aria-hidden><motion.span animate={{ scaleX: progress }} transition={{ duration: duration.base, ease: ease.settle }} /></div>
          <button className="loader-play" onClick={play} disabled={!ready}>
            {ready ? 'Aperte play' : 'Rebobinando'}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
