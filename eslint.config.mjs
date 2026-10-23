import next from 'eslint-config-next'

export default [
  { ignores: ['.next/**', 'out/**', 'node_modules/**', '.taste-skill/**', 'reference/**', 'test-results/**', 'playwright-report/**'] },
  ...next,
]
