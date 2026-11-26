import { create } from 'zustand'
import { criarAmbiente, type Ambiente } from './ambiente'

// O estado da música, um só para o site: quem escuta os gestos (src/site/Som.tsx) e o botão dentro do menu usam o mesmo. Quem desliga
// continua desligado nas próximas visitas.

const CHAVE = 'som'
let ambiente: Ambiente | null = null

export const tocar = () => {
  ambiente ??= criarAmbiente()
  ambiente?.ligar()
}
export const calar = () => ambiente?.desligar()
/** volta a tocar o que já tinha começado (sem gesto, não cria nada) */
export const retomar = () => ambiente?.ligar()
export const tocando = () => ambiente?.contexto.state === 'running'
export const encerrar = () => {
  ambiente?.destruir()
  ambiente = null
}

type Estado = {
  /** o visitante quer música (vale mesmo antes de o navegador deixar tocar) */
  ligado: boolean
  /** lê a escolha de visitas anteriores */
  lembrar: () => void
  alternar: () => void
}

export const useSom = create<Estado>((set, get) => ({
  ligado: true,
  lembrar: () => {
    try {
      set({ ligado: localStorage.getItem(CHAVE) !== 'desligado' })
    } catch {}
  },
  alternar: () => {
    const ligado = !get().ligado
    set({ ligado })
    try {
      localStorage.setItem(CHAVE, ligado ? 'ligado' : 'desligado')
    } catch {}
    if (ligado) tocar()
    else calar()
  },
}))
