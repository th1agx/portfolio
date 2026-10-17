import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { createBrowserRouter, RouterProvider, useLocation, useNavigate, useOutlet } from 'react-router'
import { ContainerContext } from '../bindings/useContainer'
import type { Container } from './container'
import { Scene } from '../views/scene/Scene'
import { Nav } from '../views/system/Nav'
import { Loader } from '../views/system/Loader'
import { Narration } from '../views/system/Narration'
import { Veil } from '../views/system/Veil'
import { Blackout } from '../views/system/Blackout'
import { Home } from '../views/pages/Home'
import { ProjectPage } from '../views/pages/ProjectPage'
import { useSite } from '../global/store'
import { useLoader } from '../global/loader'

/**
 * O mundo (cena + trilho de scroll) fica montado o tempo todo, como no Aengel.
 * A rota de projeto só põe a faixa tocando por cima dele.
 */
function Layout({ container }: { container: Container }) {
  const navigate = useNavigate()
  const location = useLocation()
  const outlet = useOutlet()
  const open = (slug: string) => { container.audio.click(1); navigate(`/projetos/${slug}`) }
  const playing = useSite((s) => s.activeProject)
  // o encarte é desenhado em canvas com as fontes do site: a cena só monta depois que elas chegam
  const [fontsReady, setFontsReady] = useState(false)
  useEffect(() => {
    useLoader.getState().set('fonts', 0.1)
    Promise.all(['800 40px "Barlow Condensed"', '400 40px "Gloria Hallelujah"'].map((f) => document.fonts.load(f)))
      .catch(() => undefined)
      .then(() => { useLoader.getState().set('printing', 0.35); setFontsReady(true) })
  }, [])
  return (
    <>
      {fontsReady && <Scene container={container} onOpenTrack={open} />}
      <div className={playing ? 'dim on' : 'dim'} aria-hidden />
      <Home />
      <Blackout />
      <Narration />
      <Nav />
      <AnimatePresence mode="wait">{outlet && <div key={location.pathname}>{outlet}</div>}</AnimatePresence>
      <Veil />
      <Loader />
    </>
  )
}

export function App({ container }: { container: Container }) {
  const router = useMemo(() => createBrowserRouter([
    {
      path: '/',
      element: <Layout container={container} />,
      children: [{ path: 'projetos/:slug', element: <ProjectPage /> }],
    },
  ]), [container])
  return (
    <ContainerContext.Provider value={container}>
      <RouterProvider router={router} />
    </ContainerContext.Provider>
  )
}
