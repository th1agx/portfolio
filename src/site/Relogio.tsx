'use client'

import { useEffect, useState } from 'react'

// Hora local de Belo Horizonte, ao vivo: um detalhe verdadeiro sobre onde o Thiago está.
const formato = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

export function Relogio({ className }: { className?: string }) {
  const [agora, setAgora] = useState<string | null>(null)
  useEffect(() => {
    const atualizar = () => setAgora(formato.format(new Date()))
    atualizar()
    const id = window.setInterval(atualizar, 15000)
    return () => window.clearInterval(id)
  }, [])
  return (
    <span className={className}>
      Belo Horizonte <time suppressHydrationWarning>{agora ?? '--:--'}</time>
    </span>
  )
}
