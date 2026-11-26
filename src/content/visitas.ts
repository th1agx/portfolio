// O que o contador de visitas guarda e devolve: usado pelo servidor (src/app/api/visitas) e pelo painel (src/site/PainelVisitas.tsx).

export type Visita = {
  quando: number // ms
  cidade: string
  regiao: string // sigla do estado
  pais: string // sigla de duas letras
  origem: string // o site de onde veio; vazio = direto
  de: string // a marca do link (?de=nome)
  aparelho: string
  navegador: string
}

export type Numeros = {
  pessoas: number
  acessos: number
  hoje: { pessoas: number; acessos: number }
  desde: string | null // AAAA-MM-DD
  ultimas: Visita[]
}

// A marca do aparelho do dono, guardada no navegador: 'dono' = não é contado; 'contar' = o dono pediu para voltar a contar este aparelho.
// É gravada quando a senha do painel está certa (PainelVisitas.tsx) e lida antes de contar (ContaVisita.tsx).
const CHAVE = 'visitas-aparelho'
export type Marca = 'dono' | 'contar' | null

export const lerMarca = (): Marca => {
  try {
    const v = localStorage.getItem(CHAVE)
    return v === 'dono' || v === 'contar' ? v : null
  } catch {
    return null
  }
}

export const gravarMarca = (marca: 'dono' | 'contar') => {
  try {
    localStorage.setItem(CHAVE, marca)
  } catch {}
}
