'use client'

import { perfil } from '@/content/perfil'
import { Relogio } from './Relogio'
import s from './site.module.css'

// Saída do túnel: a luz vira a página. O fim é um convite direto — título grande, o e-mail como o maior
// link do site, os perfis e, no pé, onde eu estou e que horas são agora em Belo Horizonte.
export function Contato() {
  return (
    <section id="contato" className={s.contato}>
      <header className={s.contatoTopo}>
        <span className={s.contatoMeta}>Contato</span>
        <Relogio className={s.contatoMeta} />
        <a className={s.contatoVoltar} href="#topo">
          Voltar ao topo ↑
        </a>
      </header>
      <h2 className={s.contatoTitulo}>
        Bora fazer um
        <br />
        sistema que se explica?
      </h2>
      <a className={s.contatoEmail} href={`mailto:${perfil.email}`}>
        {perfil.email}
      </a>
      <p className={s.contatoLinks}>
        <a href={perfil.github}>
          GitHub <span aria-hidden>↗</span>
        </a>
        <a href={perfil.linkedin}>
          LinkedIn <span aria-hidden>↗</span>
        </a>
      </p>
      <footer className={s.contatoPe}>
        <span>© 2026 Thiago Antunes</span>
        <span>feito à mão com Next.js, Three.js e GSAP</span>
        <span>Belo Horizonte, MG — Brasil</span>
      </footer>
    </section>
  )
}
