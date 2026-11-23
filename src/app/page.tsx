import { perfil } from '@/content/perfil'
import { SITE } from '@/content/site'
import { Cabecalho } from '@/site/Cabecalho'
import { Heroi } from '@/site/Heroi'
import { GuiaRobo } from '@/site/GuiaRobo'
import { Ideia } from '@/site/Ideia'
import { Projetos } from '@/site/Projetos'
import { Rolagem } from '@/site/Rolagem'
import { Temas } from '@/site/Temas'
import { Trajetoria } from '@/site/Trajetoria'

// Ordem: topo com os símbolos, título com a linha lima, projetos num palco 3D e, numa cena só (Trajetoria),
// a constelação de partículas, a estrada, o mergulho no túnel e o contato na saída.

// dados estruturados (schema.org): quem é a pessoa e onde está na web; tudo vem de src/content/perfil.ts
const dadosEstruturados = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Person',
      '@id': `${SITE.url}#thiago`,
      name: perfil.nome,
      jobTitle: perfil.papel,
      url: SITE.url,
      image: `${SITE.url}og.jpg`,
      address: { '@type': 'PostalAddress', addressLocality: perfil.cidade, addressCountry: 'BR' },
      sameAs: [perfil.github, perfil.linkedin],
    },
    { '@type': 'WebSite', '@id': `${SITE.url}#site`, url: SITE.url, name: 'Thiago Antunes', inLanguage: 'pt-BR', author: { '@id': `${SITE.url}#thiago` } },
  ],
}

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosEstruturados).replace(/</g, '\\u003c') }} />
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
        <Projetos />
        <Trajetoria />
      </main>
    </>
  )
}
