import type { Metadata, Viewport } from 'next'
import { Inter_Tight } from 'next/font/google'
import './globals.css'
import { arquivo } from '@/content/caminho'
import { SITE } from '@/content/site'

// a fonte do Ingrassia (a mais próxima da SF do Apple com licença para a web): textos e títulos do site todo;
// só o topo continua na Cabinet Grotesk
const inter = Inter_Tight({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-inter', display: 'swap' })

const titulo = 'Thiago Antunes, engenheiro de software'
const descricao = 'Sistemas de empresa, integrações e regras que mostram por que decidiram.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: titulo,
  description: descricao,
  applicationName: 'Thiago Antunes',
  authors: [{ name: 'Thiago Antunes', url: SITE.url }],
  alternates: { canonical: SITE.url },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
  openGraph: {
    type: 'website',
    url: SITE.url,
    siteName: 'Thiago Antunes',
    title: titulo,
    description: descricao,
    locale: 'pt_BR',
    images: [{ url: `${SITE.url}og.jpg`, width: 1200, height: 630, alt: 'Thiago Antunes, engenheiro de software: retrato metade humano, metade robô.' }],
  },
  twitter: { card: 'summary_large_image', title: titulo, description: descricao, images: [`${SITE.url}og.jpg`] },
  icons: { icon: arquivo('/brand/icone.png') },
}

export const viewport: Viewport = { themeColor: '#f5f5f2' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <head>
        {/* o GitHub Pages não deixa configurar headers: a CSP e a política de referrer vão por <meta>. Os scripts e estilos
            em linha são os que o próprio Next injeta; o resto só carrega do próprio site */}
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob:; worker-src 'self' blob:; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'"
        />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        {/* as três imagens do retrato começam a baixar junto com o HTML, sem esperar o JavaScript montar a cena
            (o three.js as pede com crossorigin anônimo, por isso o preload também) */}
        <link rel="preload" as="image" href={arquivo('/retrato/humano.webp')} type="image/webp" crossOrigin="anonymous" />
        <link rel="preload" as="image" href={arquivo('/retrato/robo.webp')} type="image/webp" crossOrigin="anonymous" />
        <link rel="preload" as="image" href={arquivo('/retrato/aura.png')} type="image/png" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  )
}
