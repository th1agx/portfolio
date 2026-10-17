import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { Tape } from './Tape'
import { CameraRig } from './CameraRig'
import { Dust } from './Dust'
import type { TrackRow } from './art'
import { tracklist } from '../../models/content/pt'
import { device } from '../../global/device'
import { useLoader } from '../../global/loader'
import type { Container } from '../../app/container'

/** Um mundo só, que nunca desmonta. As rotas mudam o estado dele, não a página. */
export function Scene({ container, onOpenTrack }: { container: Container; onOpenTrack: (slug: string) => void }) {
  return (
    <Canvas
      className="scene"
      dpr={device.lowPower ? [1, 1.5] : [1, 2]}
      shadows
      camera={{ position: [-0.5, 0.22, 2.25], fov: 34, near: 0.05, far: 60 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
    >
      <World container={container} onOpenTrack={onOpenTrack} />
    </Canvas>
  )
}

function World({ container, onOpenTrack }: { container: Container; onOpenTrack: (slug: string) => void }) {
  const rows = useMemo<TrackRow[]>(() => {
    let a = 0, b = 0
    return tracklist.map((t) => ({ side: t.side, code: t.side === 'A' ? `A${++a}` : `B${++b}`, project: container.projects.bySlug(t.slug)! }))
  }, [container])

  return (
    <>
      <color attach="background" args={['#0D0C11']} />
      <fog attach="fog" args={['#0D0C11', 4, 11]} />
      {/* uma luz quente de cima, como abajur sobre a mesa; o resto é penumbra */}
      <spotLight position={[0.9, 3.4, 3.4]} angle={0.95} penumbra={0.9} intensity={34} color="#FFE2B8" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
      <pointLight position={[2.4, 0.6, 2.2]} intensity={2.2} distance={5} color="#FFD9A8" />
      <ambientLight intensity={0.32} color="#8A86B8" />
      <directionalLight position={[-3, 1, -2]} intensity={0.6} color="#7C80D6" />
      <Tape rows={rows} onOpenTrack={onOpenTrack} />
      <Dust />
      <CameraRig container={container} />
      <Warmup />
    </>
  )
}

/** Compila todos os shaders antes de o visitante entrar, como o Aengel faz. */
function Warmup() {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    let alive = true
    useLoader.getState().set('compiling', 0.6)
    const run = async () => {
      try { await gl.compileAsync(scene, camera) } catch { gl.compile(scene, camera) }
      if (!alive) return
      gl.render(scene, camera)
      useLoader.getState().set('ready', 1)
    }
    requestAnimationFrame(() => { run() })
    return () => { alive = false }
  }, [gl, scene, camera])
  return null
}
