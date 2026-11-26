import { createHash, timingSafeEqual } from 'node:crypto'

// O contador de visitas. É a única parte do site que roda no servidor (o resto é gerado no build).
//   POST /api/visitas   soma a visita de quem abriu o site (src/site/ContaVisita.tsx)
//   GET  /api/visitas   devolve os números, só com a senha (src/site/PainelVisitas.tsx)
//
// Os números ficam num Redis da Upstash, ligado ao projeto pela Vercel. Variáveis de ambiente:
//   KV_REST_API_URL e KV_REST_API_TOKEN (ou UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN): criadas pela integração
//   VISITAS_SENHA: a senha do painel, escolhida por quem administra o site
//   VISITAS_LOCAL: qualquer valor faz contar também fora da produção (só para testar na máquina)
//
// "Pessoas": quantos navegadores diferentes vieram em cada dia, somados. Nada de cookie nem de dado pessoal guardado: o endereço e o
// navegador viram um resumo embaralhado com o dia e um segredo do servidor, que não dá para desfazer e é apagado em dois dias.

export const dynamic = 'force-dynamic'

const DOIS_DIAS = 172800
const TENTATIVAS = 10 // senhas erradas por endereço antes de bloquear por 15 minutos
const ROBOS = /bot|crawl|spider|slurp|lighthouse|headless|pagespeed|preview|monitor|curl|wget|python-requests/i

const banco = () => {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? { url, token } : null
}

async function redis(b: { url: string; token: string }, comandos: (string | number)[][]) {
  const r = await fetch(`${b.url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${b.token}` },
    body: JSON.stringify(comandos),
    cache: 'no-store',
  })
  if (!r.ok) throw new Error(`redis respondeu ${r.status}`)
  const respostas = (await r.json()) as { result?: unknown; error?: string }[]
  const erro = respostas.find((x) => x.error)
  if (erro) throw new Error(erro.error)
  return respostas.map((x) => x.result)
}

const resumo = (texto: string) => createHash('sha256').update(texto).digest()
/** o dia no horário de Brasília, AAAA-MM-DD */
const hoje = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
const endereco = (pedido: Request) => pedido.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || pedido.headers.get('x-real-ip') || 'desconhecido'
const resposta = (status: number, corpo?: unknown) =>
  new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { 'Cache-Control': 'no-store', ...(corpo === undefined ? {} : { 'Content-Type': 'application/json' }) },
  })

export async function POST(pedido: Request) {
  // deploys de teste e a máquina local não contam; robôs e pedidos vindos de outro site também não
  if (process.env.VERCEL_ENV !== 'production' && !process.env.VISITAS_LOCAL) return resposta(204)
  const navegador = pedido.headers.get('user-agent') ?? ''
  const origem = pedido.headers.get('sec-fetch-site')
  if (!navegador || ROBOS.test(navegador) || (origem && origem !== 'same-origin')) return resposta(204)
  const b = banco()
  if (!b) return resposta(503)
  try {
    const dia = hoje()
    const quem = resumo(`${dia}|${endereco(pedido)}|${navegador}|${b.token}`).toString('hex').slice(0, 32)
    const [nova] = await redis(b, [
      ['SADD', `visitas:quem:${dia}`, quem],
      ['EXPIRE', `visitas:quem:${dia}`, DOIS_DIAS],
      ['INCR', 'visitas:acessos'],
      ['INCR', `visitas:acessos:${dia}`],
      ['EXPIRE', `visitas:acessos:${dia}`, DOIS_DIAS],
      ['SETNX', 'visitas:desde', dia],
    ])
    if (nova === 1) await redis(b, [['INCR', 'visitas:pessoas']])
    return resposta(204)
  } catch (e) {
    console.error('visitas: não foi possível contar', e)
    return resposta(502)
  }
}

export async function GET(pedido: Request) {
  const b = banco()
  const senha = process.env.VISITAS_SENHA
  if (!b || !senha) return resposta(503, { erro: 'sem-configuracao' })
  try {
    const falhas = `visitas:falhas:${resumo(`${endereco(pedido)}|${b.token}`).toString('hex').slice(0, 32)}`
    const [quantas] = await redis(b, [['GET', falhas]])
    if (Number(quantas ?? 0) >= TENTATIVAS) return resposta(429, { erro: 'muitas-tentativas' })
    // a senha vem codificada no cabeçalho (cabeçalho não aceita acento); a comparação leva sempre o mesmo tempo
    let dada = ''
    try {
      dada = decodeURIComponent(pedido.headers.get('authorization')?.replace(/^Bearer /, '') ?? '')
    } catch {}
    if (!timingSafeEqual(resumo(dada), resumo(senha))) {
      await redis(b, [
        ['INCR', falhas],
        ['EXPIRE', falhas, 900],
      ])
      return resposta(401, { erro: 'senha' })
    }
    const dia = hoje()
    const [pessoas, acessos, pessoasHoje, acessosHoje, desde] = await redis(b, [
      ['GET', 'visitas:pessoas'],
      ['GET', 'visitas:acessos'],
      ['SCARD', `visitas:quem:${dia}`],
      ['GET', `visitas:acessos:${dia}`],
      ['GET', 'visitas:desde'],
    ])
    return resposta(200, {
      pessoas: Number(pessoas ?? 0),
      acessos: Number(acessos ?? 0),
      hoje: { pessoas: Number(pessoasHoje ?? 0), acessos: Number(acessosHoje ?? 0) },
      desde: typeof desde === 'string' ? desde : null,
    })
  } catch (e) {
    console.error('visitas: não foi possível ler', e)
    return resposta(502, { erro: 'banco' })
  }
}
