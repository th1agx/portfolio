'use client'

import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Fundo que muda sem corte: cada seção diz o seu tema (data-tema) e, na passagem de uma para a outra,
// as cores do fundo e do texto da página se misturam conforme a rolagem, nos dois sentidos.
// As seções não pintam o próprio fundo; quem pinta é o <html>, pelas variáveis --fundo e --tinta.
// Uma seção pode mudar quando a troca acontece (data-tema-de / data-tema-ate), por exemplo para trocar
// escondida, por baixo de uma animação que já cobre a tela.
//
// A cor é calculada a cada quadro a partir da posição da rolagem, e não com vários tweens no mesmo
// elemento: eles brigavam entre si e deixavam a cor errada ao rolar rápido ou recarregar no meio.

const TEMAS: Record<string, { fundo: string; tinta: string }> = {
  claro: { fundo: '#f5f5f2', tinta: '#121214' },
  escuro: { fundo: '#0c0d0f', tinta: '#ecebe6' },
  lima: { fundo: '#d7f452', tinta: '#121214' },
}

const tema = (nome?: string) => TEMAS[nome ?? 'claro'] ?? TEMAS.claro!

export function Temas() {
  useEffect(() => {
    const raiz = document.documentElement
    const secoes = [...document.querySelectorAll<HTMLElement>('[data-tema]')]
    if (!secoes.length) return
    // cada passagem é só um trecho de rolagem [start, end] em px, que o ScrollTrigger recalcula no resize
    const passagens = secoes.slice(1).map((el, i) => ({
      de: tema(secoes[i]!.dataset.tema),
      para: tema(el.dataset.tema),
      st: ScrollTrigger.create({ trigger: el, start: el.dataset.temaDe ?? 'top 85%', end: el.dataset.temaAte ?? 'top 25%' }),
    }))
    let ultimo = -1
    const aplicar = (forcar = false) => {
      const y = window.scrollY
      if (!forcar && y === ultimo) return
      ultimo = y
      let de = tema(secoes[0]!.dataset.tema)
      let para = de
      let k = 0
      for (const p of passagens) {
        if (y >= p.st.end) {
          de = para = p.para
          continue
        }
        if (y > p.st.start) {
          de = p.de
          para = p.para
          k = (y - p.st.start) / Math.max(1, p.st.end - p.st.start)
        }
        break
      }
      raiz.style.setProperty('--fundo', gsap.utils.interpolate(de.fundo, para.fundo, k))
      raiz.style.setProperty('--tinta', gsap.utils.interpolate(de.tinta, para.tinta, k))
    }
    const quadro = () => aplicar()
    const refresco = () => aplicar(true)
    gsap.ticker.add(quadro)
    ScrollTrigger.addEventListener('refresh', refresco)
    aplicar(true)
    return () => {
      gsap.ticker.remove(quadro)
      ScrollTrigger.removeEventListener('refresh', refresco)
      passagens.forEach((p) => p.st.kill())
    }
  }, [])
  return null
}
