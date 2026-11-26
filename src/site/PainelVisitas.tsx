'use client'

import { useEffect, useRef, useState } from 'react'
import { arquivo } from '@/content/caminho'
import { gravarMarca, lerMarca, type Marca, type Numeros, type Visita } from '@/content/visitas'

// O painel do dono do site: abre pelo ponto final da frase do contato (FiosContato.tsx), pede a senha e mostra quantas pessoas e quantos
// acessos o site já teve, e de onde vieram as últimas visitas. A senha é conferida no servidor e não fica guardada na página: ao fechar, é esquecida.

const ERROS: Record<number, string> = {
  401: 'Senha incorreta.',
  429: 'Muitas tentativas. Espere 15 minutos.',
  503: 'O contador ainda não foi configurado na Vercel.',
}

const numero = (n: number) => n.toLocaleString('pt-BR')
const horario = (t: number) => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

/** "Belo Horizonte, MG"; fora do Brasil, com o nome do país */
const local = (v: Visita) => {
  let pais = ''
  if (v.pais && v.pais !== 'BR') {
    try {
      pais = new Intl.DisplayNames(['pt-BR'], { type: 'region' }).of(v.pais) ?? v.pais
    } catch {
      pais = v.pais
    }
  }
  return [v.cidade, v.regiao, pais].filter(Boolean).join(', ') || (v.pais === 'BR' ? 'Brasil' : 'Local desconhecido')
}

const veio = (v: Visita) => [v.de && `link "${v.de}"`, v.origem ? `veio de ${v.origem}` : !v.de && 'acesso direto'].filter(Boolean).join(' · ')

export function PainelVisitas({ aberto, fechar }: { aberto: boolean; fechar: () => void }) {
  const caixa = useRef<HTMLDialogElement>(null)
  const [senha, setSenha] = useState('')
  const [dados, setDados] = useState<Numeros | null>(null)
  const [erro, setErro] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [marca, setMarca] = useState<Marca>(null)

  useEffect(() => {
    const d = caixa.current
    if (!d) return
    if (aberto && !d.open) d.showModal()
    if (!aberto && d.open) d.close()
  }, [aberto])

  const sair = () => {
    setSenha('')
    setDados(null)
    setErro('')
    fechar()
  }

  const ver = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!senha || buscando) return
    setBuscando(true)
    setErro('')
    try {
      const r = await fetch(arquivo('/api/visitas'), { headers: { Authorization: `Bearer ${encodeURIComponent(senha)}` }, cache: 'no-store' })
      if (r.ok) {
        setDados((await r.json()) as Numeros)
        // senha certa: este aparelho é do dono e deixa de ser contado (a não ser que o dono já tenha pedido para contar)
        if (lerMarca() === null) gravarMarca('dono')
        setMarca(lerMarca())
      } else setErro(ERROS[r.status] ?? 'Não foi possível ler os números agora.')
    } catch {
      setErro('Sem conexão com o servidor.')
    }
    setBuscando(false)
  }

  const alternar = () => {
    const nova = marca === 'dono' ? 'contar' : 'dono'
    gravarMarca(nova)
    setMarca(lerMarca())
  }

  return (
    <dialog ref={caixa} className="visitas" aria-labelledby="visitas-titulo" onClose={sair} onClick={(e) => e.target === e.currentTarget && sair()} data-lenis-prevent>
      <div className="visitas-corpo">
        <h3 id="visitas-titulo">Visitas</h3>
        {dados ? (
          <>
            <dl className="visitas-numeros">
              <div>
                <dt>Pessoas</dt>
                <dd>{numero(dados.pessoas)}</dd>
              </div>
              <div>
                <dt>Acessos</dt>
                <dd>{numero(dados.acessos)}</dd>
              </div>
              <div>
                <dt>Pessoas hoje</dt>
                <dd>{numero(dados.hoje.pessoas)}</dd>
              </div>
              <div>
                <dt>Acessos hoje</dt>
                <dd>{numero(dados.hoje.acessos)}</dd>
              </div>
            </dl>
            <p className="visitas-nota">
              {dados.desde ? `Contando desde ${dados.desde.split('-').reverse().join('/')}. ` : 'Nenhuma visita contada ainda. '}
              Quem volta em outro dia conta de novo em "pessoas".
            </p>
            <div className="visitas-aparelho">
              <span>{marca === 'dono' ? 'Este aparelho não é mais contado.' : 'Este aparelho está sendo contado.'}</span>
              <button type="button" onClick={alternar}>
                {marca === 'dono' ? 'Voltar a contar' : 'Não contar'}
              </button>
            </div>
            {dados.ultimas.length > 0 && (
              <>
                <h4>Últimas visitas</h4>
                <ol className="visitas-lista" tabIndex={0}>
                  {dados.ultimas.map((v, i) => (
                    <li key={`${v.quando}-${i}`}>
                      <span className="visitas-quem">
                        <strong>{local(v)}</strong>
                        <time dateTime={new Date(v.quando).toISOString()}>{horario(v.quando)}</time>
                      </span>
                      <span>{veio(v)}</span>
                      <span>
                        {v.aparelho} · {v.navegador}
                      </span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </>
        ) : (
          <form onSubmit={ver}>
            <label htmlFor="visitas-senha">Senha</label>
            <input id="visitas-senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} autoFocus />
            <button type="submit" disabled={buscando || !senha}>
              {buscando ? 'Buscando…' : 'Ver números'}
            </button>
            <p className="visitas-erro" role="alert">
              {erro}
            </p>
          </form>
        )}
        <button type="button" className="visitas-fechar" onClick={sair}>
          Fechar
        </button>
      </div>
    </dialog>
  )
}
