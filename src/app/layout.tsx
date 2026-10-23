import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Thiago Antunes, engenheiro de software',
  description: 'Sistemas de empresa, integrações e regras que mostram por que decidiram.',
  icons: { icon: '/brand/favicon.svg' },
}

export const viewport: Viewport = { themeColor: '#f5f5f2' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
