'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { caminhoDoQuadro } from './projecao'
import s from './site.module.css'

gsap.registerPlugin(ScrollTrigger)

// Duas faixas inclinadas com as palavras do trabalho, andando em sentidos opostos com a rolagem.
// A saída é a entrada dos projetos, presa à rolagem:
//   1. a faixa lima é arrancada pela lateral, girando
//   2. as palavras da faixa escura se recolhem, cada uma encolhendo e sumindo, do centro para as pontas
//   3. a faixa escura vira um quadro em 3D (o mesmo recorte projetado do Zentry): ele se inclina em direção à
//      câmera, ganha cantos arredondados e cresce até passar das bordas da tela. Nenhuma borda reta varre a tela.
//   4. no escuro, um anel lima pulsa no centro e se abre: é ali que o primeiro projeto começa
// O fundo da página troca para escuro por baixo do quadro, então nada aparece cinza no meio.

const PALAVRAS = ['ERP', 'APIs', 'Integrações', 'Regras como dados', 'Testes', 'Rastro de decisão', 'Automação']

function Linha({ inverso = false, refFaixa }: { inverso?: boolean; refFaixa?: React.Ref<HTMLDivElement> }) {
  const itens = [...PALAVRAS, ...PALAVRAS, ...PALAVRAS]
  return (
    <div ref={refFaixa} className={`${s.faixa} ${inverso ? s.faixaEscura : s.faixaLima}`}>
      <div className={s.faixaTrilho} data-inverso={inverso ? '1' : '0'}>
        {itens.map((p, i) => (
          <span key={i} data-palavra-faixa>
            {p}
            <span className={s.faixaJunta} aria-hidden />
          </span>
        ))}
      </div>
    </div>
  )
}

export function Faixa() {
  const raiz = useRef<HTMLDivElement>(null)
  const lima = useRef<HTMLDivElement>(null)
  const escura = useRef<HTMLDivElement>(null)
  const lamina = useRef<HTMLDivElement>(null)
  const anel = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = raiz.current
    if (!el || !lima.current || !escura.current || !lamina.current || !anel.current) return
    // o quadro começa exatamente sobre a faixa escura (mesma altura e inclinação) e termina maior que a tela
    const q = { t: 0 }
    let base = { cy: 0, h: 0 }
    const medir = () => {
      // a faixa fica dentro do contêiner preso, que é o offsetParent dela
      const f = escura.current!
      base = { cy: f.offsetTop + f.offsetHeight / 2, h: f.offsetHeight * 1.05 }
    }
    const desenhar = () => {
      const W = innerWidth
      const H = innerHeight
      const t = q.t
      const arco = Math.sin(t * Math.PI)
      lamina.current!.style.clipPath = caminhoDoQuadro({
        cx: W / 2,
        cy: base.cy + (H / 2 - base.cy) * t,
        w: W * (1.05 + 0.3 * t),
        h: base.h + (H * 1.4 - base.h) * t * t,
        rx: -0.55 * arco,
        ry: 0.3 * arco,
        rz: (1.8 * Math.PI) / 180 * (1 - t) - 0.09 * arco,
        raio: 0.01 + 70 * arco,
      })
    }
    medir()
    desenhar()

    const ctx = gsap.context(() => {
      el.querySelectorAll<HTMLElement>('[data-inverso]').forEach((t) => {
        gsap.fromTo(
          t,
          { xPercent: t.dataset.inverso === '1' ? -33 : 0 },
          { xPercent: t.dataset.inverso === '1' ? -8 : -40, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom bottom', scrub: 0.6 } },
        )
      })
      const palavras = gsap.utils.toArray<HTMLElement>('[data-palavra-faixa]', escura.current!)
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.6, onRefresh: () => (medir(), desenhar()) },
      })
      // 1. a lima é arrancada
      tl.to(lima.current, { xPercent: 8, yPercent: -900, rotate: -7, ease: 'power3.in', duration: 0.3 }, 0.12)
      // 2. as palavras da escura se recolhem do centro para as pontas
      tl.to(
        palavras,
        { scale: 0.55, opacity: 0, yPercent: () => gsap.utils.random(-30, 30), filter: 'blur(6px)', ease: 'power2.in', duration: 0.18, stagger: { each: 0.0018, from: 'center' } },
        0.34,
      )
      // 3. o quadro vira para a câmera e cresce
      tl.to(q, { t: 1, ease: 'power2.inOut', duration: 0.36, onUpdate: desenhar }, 0.4)
      // 4. o anel lima pulsa e se abre no escuro
      tl.fromTo(anel.current, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, ease: 'back.out(3)', duration: 0.07 }, 0.8)
      tl.to(anel.current, { scale: 16, opacity: 0, borderWidth: 0.5, ease: 'power2.in', duration: 0.12 }, 0.88)
    }, el)
    addEventListener('resize', medir)
    return () => {
      removeEventListener('resize', medir)
      ctx.revert()
    }
  }, [])

  return (
    <div ref={raiz} className={s.faixas} aria-label={PALAVRAS.join(', ')} data-tema="claro">
      <div className={s.faixasFixo}>
        <div ref={lamina} className={s.lamina} aria-hidden />
        <span className={s.ancoraFaixa} data-robo="dancar" aria-hidden />
        <Linha refFaixa={lima} />
        <Linha inverso refFaixa={escura} />
        <span ref={anel} className={s.anelFaixa} aria-hidden />
      </div>
    </div>
  )
}
