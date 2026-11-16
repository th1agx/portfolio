import type { Metadata, Viewport } from 'next'
import { Inter_Tight } from 'next/font/google'
import './globals.css'
import { arquivo } from '@/content/caminho'

// a fonte do Ingrassia (a mais próxima da SF do Apple com licença para a web): textos e títulos do site todo;
// só o topo continua na Cabinet Grotesk
const inter = Inter_Tight({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: 'Thiago Antunes, engenheiro de software',
  description: 'Sistemas de empresa, integrações e regras que mostram por que decidiram.',
  icons: { icon: arquivo('/brand/favicon.svg') },
}

export const viewport: Viewport = { themeColor: '#f5f5f2' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
