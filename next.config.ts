import type { NextConfig } from 'next'

// O site é publicado na Vercel, na raiz de thiagoantunes.com. PAGES_BASE_PATH só serve se ele voltar a ser publicado numa
// subpasta (como no GitHub Pages, em /<nome do repositório>); sem ela, o caminho base é vazio.
const base = process.env.PAGES_BASE_PATH ?? ''

const config: NextConfig = {
  basePath: base,
  env: { NEXT_PUBLIC_BASE_PATH: base },
  images: { unoptimized: true },
  reactStrictMode: true,
  devIndicators: false,
}

export default config
