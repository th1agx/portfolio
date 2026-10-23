import type { NextConfig } from 'next'

// No GitHub Pages o site fica em /portfolio: o workflow passa PAGES_BASE_PATH na hora do build.
const base = process.env.PAGES_BASE_PATH ?? ''

const config: NextConfig = {
  output: 'export',
  basePath: base,
  env: { NEXT_PUBLIC_BASE_PATH: base },
  images: { unoptimized: true },
  reactStrictMode: true,
  devIndicators: false,
}

export default config
