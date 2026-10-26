import type { Metadata, Viewport } from 'next'
import './globals.css'
import { arquivo } from '@/content/caminho'

export const metadata: Metadata = {
  title: 'Thiago Antunes, engenheiro de software',
  description: 'ERP, integrações via API e um motor tributário que explica cada decisão. Feito à mão, em Belo Horizonte.',
  icons: { icon: arquivo('/brand/favicon.svg') },
}

export const viewport: Viewport = { themeColor: '#f5f5f2' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
