import { Cabecalho } from '@/site/Cabecalho'
import { Faixa } from '@/site/Faixa'
import { Heroi } from '@/site/Heroi'
import { GuiaRobo } from '@/site/GuiaRobo'
import { Ideia } from '@/site/Ideia'
import { Principios } from '@/site/Principios'
import { Projetos } from '@/site/Projetos'
import { Rolagem } from '@/site/Rolagem'
import { Temas } from '@/site/Temas'
import { Trajetoria } from '@/site/Trajetoria'

// Ordem: topo com os símbolos, título com a linha lima, faixas, projetos num palco 3D, como eu trabalho
// e, numa cena só (Trajetoria), a estrada, o mergulho no túnel e o contato na saída.

export default function Page() {
  return (
    <>
      <a className="pular" href="#ideia">
        Pular para o conteúdo
      </a>
      <Rolagem />
      <Temas />
      <Cabecalho />
      <GuiaRobo />
      <main>
        <Heroi />
        <Ideia />
        <Faixa />
        <Projetos />
        <Principios />
        <Trajetoria />
      </main>
    </>
  )
}
