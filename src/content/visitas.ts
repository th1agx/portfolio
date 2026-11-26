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
