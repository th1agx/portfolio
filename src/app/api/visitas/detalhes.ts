// Traduz os dados técnicos de um pedido no que o painel mostra. Nada aqui identifica uma pessoa.

const limpo = (texto: string, tamanho: number) =>
  texto
    .replace(/[^\p{L}\p{N} _.\-']/gu, '')
    .trim()
    .slice(0, tamanho)

/** a cidade, o estado e o país aproximados, que a Vercel manda no cabeçalho (a cidade vem codificada) */
export const localDe = (cabecalhos: Headers) => {
  let cidade = cabecalhos.get('x-vercel-ip-city') ?? ''
  try {
    cidade = decodeURIComponent(cidade)
  } catch {}
  return {
    cidade: limpo(cidade, 60),
    regiao: limpo(cabecalhos.get('x-vercel-ip-country-region') ?? '', 3),
    pais: limpo(cabecalhos.get('x-vercel-ip-country') ?? '', 2),
  }
}

/** a marca do link: thiagoantunes.com/?de=nome */
export const marcaDe = (valor: unknown) => (typeof valor === 'string' ? limpo(valor, 40) : '')

const CONHECIDOS: [RegExp, string][] = [
  [/(^|\.)linkedin\.com$|(^|\.)lnkd\.in$|com\.linkedin\./, 'LinkedIn'],
  [/(^|\.)github\.(com|io)$/, 'GitHub'],
  [/(^|\.)google\.[a-z.]+$|com\.google\./, 'Google'],
  [/(^|\.)bing\.com$/, 'Bing'],
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)facebook\.com$/, 'Facebook'],
  [/(^|\.)whatsapp\.com$|(^|\.)wa\.me$|com\.whatsapp/, 'WhatsApp'],
  [/^t\.co$|(^|\.)x\.com$|(^|\.)twitter\.com$/, 'X'],
]

/** o nome do site de onde a pessoa veio; vazio quando abriu direto ou veio do próprio site */
export const origemDe = (valor: unknown, proprio: string | null) => {
  if (typeof valor !== 'string' || !valor) return ''
  try {
    const host = new URL(valor).hostname.toLowerCase()
    if (!host || host === proprio?.split(':')[0]) return ''
    return CONHECIDOS.find(([padrao]) => padrao.test(host))?.[1] ?? limpo(host, 60)
  } catch {
    return ''
  }
}

export const aparelhoDe = (agente: string) =>
  /iPad|Tablet|Android(?!.*Mobile)/i.test(agente) ? 'Tablet' : /Mobi|iPhone|Android/i.test(agente) ? 'Celular' : 'Computador'

// a ordem importa: quase todo navegador também se apresenta como Chrome ou Safari
const NAVEGADORES: [RegExp, string][] = [
  [/LinkedInApp/i, 'App do LinkedIn'],
  [/Instagram/i, 'App do Instagram'],
  [/FBAN|FBAV/, 'App do Facebook'],
  [/Edg(e|A|iOS)?\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/SamsungBrowser/, 'Samsung Internet'],
  [/Firefox|FxiOS/, 'Firefox'],
  [/Chrome|CriOS/, 'Chrome'],
  [/Safari/, 'Safari'],
]

export const navegadorDe = (agente: string) => NAVEGADORES.find(([padrao]) => padrao.test(agente))?.[1] ?? 'Outro navegador'
