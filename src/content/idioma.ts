'use client'

import { create } from 'zustand'
import { TEXTOS, type Idioma, type Textos } from './textos'

// O idioma do site. A abertura pergunta antes de tudo, em toda visita (src/site/Abertura.tsx); até lá é null e o site mostra português
// por baixo. O menu permite trocar a qualquer hora; quando a troca precisa recarregar a página, o idioma novo passa para a próxima carga
// (guardarParaRecarga) e é usado uma vez, sem perguntar de novo.

const CHAVE = 'idioma'

type Estado = { idioma: Idioma | null; definir: (i: Idioma) => void }

export const useIdioma = create<Estado>((set) => ({
  idioma: null,
  definir: (idioma) => set({ idioma }),
}))

/** a troca de idioma pelo menu que recarrega a página: o idioma novo vale para a próxima carga, uma vez */
export const guardarParaRecarga = (idioma: Idioma) => {
  try {
    sessionStorage.setItem(CHAVE, idioma)
  } catch {}
}

/** o idioma que uma troca pelo menu deixou para esta carga (lido uma vez e apagado: a visita seguinte pergunta de novo) */
export const idiomaGuardado = (): Idioma | null => {
  try {
    const v = sessionStorage.getItem(CHAVE)
    sessionStorage.removeItem(CHAVE)
    return v === 'pt' || v === 'en' ? v : null
  } catch {
    return null
  }
}

/** o idioma que o navegador do visitante prefere, para vir pré-selecionado na pergunta */
export const idiomaDoNavegador = (): Idioma => (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('pt') ? 'pt' : 'en')

/** os textos do idioma atual (português enquanto a pergunta não foi respondida) */
export const useTextos = (): Textos => TEXTOS[useIdioma((s) => s.idioma) ?? 'pt']
export const useIdiomaAtual = (): Idioma => useIdioma((s) => s.idioma) ?? 'pt'
