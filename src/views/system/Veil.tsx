import { AnimatePresence, motion } from 'motion/react'
import { useSite } from '../../global/store'
import { device } from '../../global/device'

/** O véu: cobre a tela de baixo para cima no salto longo e se recolhe para cima ao revelar. */
export function Veil() {
  const veil = useSite((s) => s.veil)
  return (
    <AnimatePresence>
      {veil && (
        <motion.div
          className="veil"
          aria-hidden
          initial={device.reducedMotion ? { opacity: 0 } : { clipPath: 'inset(100% 0 0 0)' }}
          animate={device.reducedMotion ? { opacity: 1 } : { clipPath: 'inset(0% 0 0 0)', transition: { duration: 0.45, ease: [0.7, 0, 0.84, 0] } }}
          exit={device.reducedMotion ? { opacity: 0 } : { clipPath: 'inset(0 0 100% 0)', transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }}
        />
      )}
    </AnimatePresence>
  )
}
