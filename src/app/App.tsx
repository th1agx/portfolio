import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { createBrowserRouter, RouterProvider, useLocation, useNavigate, useOutlet } from 'react-router'
import { ContainerContext } from '../bindings/useContainer'
import type { Container } from './container'
import { Scene } from '../views/scene/Scene'
import { JCard } from '../views/system/JCard'
import { Nav } from '../views/system/Nav'
import { Loader } from '../views/system/Loader'
import { Veil } from '../views/system/Veil'
import { Home } from '../views/pages/Home'
import { ProjectPage } from '../views/pages/ProjectPage'
import { useSite } from '../global/store'
import { useLoader } from '../global/loader'

/**
 * O encarte com a capa viva fica montado o tempo todo, como o mundo do Aengel.
 * A rota de projeto só põe a faixa tocando por cima dele.
 */
function Layout({ container }: { container: Container }) {
  const navigate = useNavigate()
  const location = useLocation()
  const outlet = useOutlet()
  const open = (slug: string) => { container.audio.click(1); navigate(`/projetos/${slug}`) }
  const playing = useSite((s) => s.activeProject)
  const [fontsReady, setFontsReady] = useState(false)
  useEffect(() => {
    useLoader.getState().set('fonts', 0.1)
    Promise.all(['800 40px "Barlow Condensed"', '400 40px "Gloria Hallelujah"'].map((f) => document.fonts.load(f)))
      .catch(() => undefined)
      .then(() => setFontsReady(true))
  }, [])
  return (
    <>
      <JCard onOpenProject={open}>{fontsReady && <Scene container={container} />}</JCard>
      <div className={playing ? 'dim on' : 'dim'} aria-hidden />
      <Home />
      <Nav />
      <AnimatePresence mode="wait">{outlet && <div key={location.pathname}>{outlet}</div>}</AnimatePresence>
      <Veil />
      <Loader />
    </>
  )
}

export function App({ container }: { container: Container }) {
  const router = useMemo(() => createBrowserRouter([
    { path: '/', element: <Layout container={container} />, children: [{ path: 'projetos/:slug', element: <ProjectPage /> }] },
  ]), [container])
  return (
    <ContainerContext.Provider value={container}>
      <RouterProvider router={router} />
    </ContainerContext.Provider>
  )
}
