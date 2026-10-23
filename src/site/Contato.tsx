import { perfil } from '@/content/perfil'
import s from './site.module.css'

// Saída do túnel: a luz vira a página (fica dentro da cena final, em Trajetoria.tsx). A marca TA grande, o e-mail como o maior link do site e os perfis.
export function Contato() {
  return (
    <section id="contato" className={s.contato}>
      <span className={s.contatoMarca} aria-hidden />
      <p className={s.contatoChamada}>Se quiser conversar sobre um sistema, escreva.</p>
      <a className={s.contatoEmail} href={`mailto:${perfil.email}`}>
        {perfil.email}
      </a>
      <p className={s.contatoLinks}>
        <a href={perfil.github}>GitHub</a>
        <a href={perfil.linkedin}>LinkedIn</a>
      </p>
    </section>
  )
}
