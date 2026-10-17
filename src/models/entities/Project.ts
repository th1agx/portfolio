export type EmblemShape = 'stamp' | 'shield' | 'bubble' | 'bottle' | 'wheel'

export interface Project {
  slug: string
  name: string
  /** uma frase: o que o projeto faz, nas palavras de quem usa */
  line: string
  /** parágrafos da página de detalhe */
  body: string[]
  /** fatos verificáveis no repositório */
  facts: Array<[string, string]>
  stack: string[]
  links: Array<{ label: string; href: string }>
  /** forma do emblema cromado que representa o projeto na cena */
  emblem: EmblemShape
}
