import { Canvas } from '@react-three/fiber'
import { CoverChain } from './CoverChain'
import { device } from '../../global/device'
import type { Container } from '../../app/container'

/** O mundo: uma tela cheia que nunca desmonta. As rotas e o scroll mudam o estado dela, não a página. */
export function Scene({ container }: { container: Container }) {
  return (
    <Canvas className="scene" dpr={device.lowPower ? [1, 1.5] : [1, 2]} gl={{ antialias: false }} flat linear>
      <CoverChain container={container} />
    </Canvas>
  )
}
