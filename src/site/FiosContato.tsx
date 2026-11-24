'use client'

import { useEffect, useRef } from 'react'
import { perfil } from '@/content/perfil'
import { chegadaContato } from '@/cena/trilhaTela'
import { useTextos } from '@/content/idioma'
import { IconeEmail, IconeGitHub, IconeLinkedIn } from './icones'

// O fim do site: a cena (src/cena/fiosContato.ts) e, no pé da tela, a legenda do contato, na mesma linguagem da legenda dos projetos
// (uma linha centrada como a de um filme, o nome em negrito e o texto mais claro), com os três links embaixo. Entra no fim da chegada
// (presa à rolagem) e gira um pouco com o mouse, junto com a cena.
// O módulo da cena só é baixado e o contexto WebGL só é criado quando o contato aparece (data-on da camada).

const LINKS = [
  { nome: 'E-mail', chave: 'email', href: `mailto:${perfil.email}`, Icone: IconeEmail },
  { nome: 'GitHub', chave: 'github', href: perfil.github, Icone: IconeGitHub },
  { nome: 'LinkedIn', chave: 'linkedin', href: perfil.linkedin, Icone: IconeLinkedIn },
]

export function FiosContato() {
  const t = useTextos()
  const tela = useRef<HTMLCanvasElement>(null)
  const hud = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cv = tela.current
    const hu = hud.current
    const camada = cv?.closest('[data-on]') as HTMLElement | null
    const secao = cv?.closest('section') as HTMLElement | null
    if (!cv || !hu || !camada || !secao) return

    const leve = matchMedia('(pointer: coarse)').matches || innerWidth < 700
    const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches

    type Cena = NonNullable<ReturnType<typeof import('@/cena/fiosContato').criarFios>>
    let modulo: typeof import('@/cena/fiosContato') | null = null
    let cena: Cena | null = null
    let ligado = false
    let vivo = true
    let id = 0
    let ultimo = 0
    let px = innerWidth / 2
    let py = innerHeight / 2
    let dentro = false
    let giro = 0

    const quadro = (agora: number) => {
      id = requestAnimationFrame(quadro)
      const dt = Math.min(0.05, (agora - ultimo) / 1000)
      ultimo = agora
      const r = cv.getBoundingClientRect()
      if (!cena) return
      const ch = chegadaContato.p
      cena.chegada(ch)
      cena.ponteiro(px - r.left, py - r.top, dentro)
      cena.desenhar(dt, r.width, r.height)
      // o contato entra no fim da chegada; as letras recomeçam cada vez que ele aparece
      const v = Math.min(1, Math.max(0, (ch - 0.88) / 0.1))
      hu.style.opacity = v.toFixed(3)
      hu.style.visibility = v > 0.01 ? 'visible' : 'hidden'
      if (v > 0.3 && secao.dataset.vivo !== '1') secao.dataset.vivo = '1'
      else if (v < 0.01 && secao.dataset.vivo === '1') secao.dataset.vivo = '0'
      // gira um pouco com o mouse, no mesmo sentido da câmera da cena
      const nx = r.width ? Math.min(1, Math.max(0, (px - r.left) / r.width)) * 2 - 1 : 0
      giro += ((calmo || !dentro ? 0 : nx) - giro) * (1 - Math.exp(-3 * dt))
      hu.style.setProperty('--giro', `${(-giro * 3).toFixed(2)}deg`)
      hu.style.setProperty('--desloca', `${(giro * 10).toFixed(1)}px`)
    }
    const parar = () => {
      cancelAnimationFrame(id)
      id = 0
    }
    const montar = () => {
      if (!modulo) return
      cena?.destruir()
      cena = modulo.criarFios(cv, { leve, calmo })
    }
    const ligar = async () => {
      if (ligado) return
      ligado = true
      if (!modulo) {
        modulo = await import('@/cena/fiosContato')
        if (!vivo) return
      }
      if (!ligado) return
      if (!cena) montar()
      if (!cena) return
      ultimo = performance.now()
      if (!id) id = requestAnimationFrame(quadro)
    }
    const desligar = () => {
      ligado = false
      secao.dataset.vivo = '0'
      parar()
    }

    const obs = new MutationObserver(() => (camada.dataset.on === '1' ? void ligar() : desligar()))
    obs.observe(camada, { attributes: true, attributeFilter: ['data-on'] })
    if (camada.dataset.on === '1') void ligar()

    const mover = (e: PointerEvent) => {
      px = e.clientX
      py = e.clientY
      dentro = e.pointerType === 'mouse' || e.pointerType === 'pen'
    }
    const saiu = () => {
      dentro = false
    }
    const clicou = (e: PointerEvent) => {
      if (!ligado || !cena) return
      if ((e.target as Element | null)?.closest?.('a, button')) return
      cena.onda(true)
    }
    // o texto do link se decodifica da esquerda para a direita, trocando as letras ainda não fixas por sinais, e assenta em 0,42 s
    const SINAIS = '#%&*+=<>/|01'
    const decodificando = new WeakMap<HTMLElement, number>()
    const decodificar = (el: HTMLElement) => {
      const alvo = el.dataset.texto ?? ''
      if (calmo || !alvo) return
      cancelAnimationFrame(decodificando.get(el) ?? 0)
      el.style.width = `${el.offsetWidth}px`
      const ini = performance.now()
      const passo = () => {
        const k = Math.min(1, (performance.now() - ini) / 420)
        const fixas = Math.floor(k * alvo.length)
        let t = alvo.slice(0, fixas)
        for (let i = fixas; i < alvo.length; i++) t += alvo[i] === ' ' ? ' ' : SINAIS[(Math.random() * SINAIS.length) | 0]
        el.textContent = t
        if (k < 1) decodificando.set(el, requestAnimationFrame(passo))
        else {
          el.textContent = alvo
          el.style.width = ''
        }
      }
      decodificando.set(el, requestAnimationFrame(passo))
    }
    const sinal = (e: Event) => {
      if (!ligado) return
      const link = (e.target as Element | null)?.closest?.('.legenda-link')
      const veio = (e as PointerEvent).relatedTarget as Node | null
      if (!link || (veio && link.contains(veio))) return
      cena?.onda(false)
      const texto = link.querySelector<HTMLElement>('.legenda-texto')
      if (texto) decodificar(texto)
    }
    const perdeu = (e: Event) => {
      e.preventDefault()
      parar()
    }
    const voltou = () => {
      if (!ligado || !modulo) return
      montar()
      if (cena) {
        ultimo = performance.now()
        if (!id) id = requestAnimationFrame(quadro)
      }
    }
    window.addEventListener('pointermove', mover, { passive: true })
    window.addEventListener('pointerdown', clicou, { passive: true })
    secao.addEventListener('pointerover', sinal)
    secao.addEventListener('focusin', sinal)
    document.documentElement.addEventListener('pointerleave', saiu)
    cv.addEventListener('webglcontextlost', perdeu)
    cv.addEventListener('webglcontextrestored', voltou)

    return () => {
      vivo = false
      obs.disconnect()
      parar()
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerdown', clicou)
      secao.removeEventListener('pointerover', sinal)
      secao.removeEventListener('focusin', sinal)
      document.documentElement.removeEventListener('pointerleave', saiu)
      cv.removeEventListener('webglcontextlost', perdeu)
      cv.removeEventListener('webglcontextrestored', voltou)
      cena?.destruir()
      cena = null
    }
  }, [])

  return (
    <>
      <canvas ref={tela} className="fios-tela" aria-hidden />
      {/* a legenda, como a dos projetos: no pé da tela, centrada, sobre uma vinheta suave */}
      <div ref={hud} className="legenda">
        <span className="legenda-vinheta" aria-hidden />
        <div className="legenda-painel">
          <p className="legenda-linha">
            <span>{t.contato.chamada}</span>
          </p>
          <p className="legenda-links">
            {LINKS.map(({ nome, href, Icone }) => (
              <a
                key={nome}
                className="legenda-link"
                href={href}
                target={href.startsWith('mailto:') ? undefined : '_blank'}
                rel="noopener noreferrer"
                aria-label={nome === 'E-mail' ? `${t.menu.email}: ${perfil.email}` : nome}
              >
                <span className="legenda-icone" aria-hidden>
                  <Icone />
                </span>
                <span className="legenda-texto" aria-hidden data-texto={nome === 'E-mail' ? perfil.email : nome}>
                  {nome === 'E-mail' ? perfil.email : nome}
                </span>
              </a>
            ))}
          </p>
        </div>
      </div>
    </>
  )
}
