import { Motor, type Progresso, type Saida } from './aberturaMotor'

// O Worker da tela de abertura: recebe o OffscreenCanvas e roda o motor aqui, fora da thread principal. A thread principal só
// manda o que mudou (tamanho, cursor, cenas prontas) e recebe o que mostrar em volta (porcentagem, botão, hora de sair).

type Entrada =
  | { tipo: 'iniciar'; canvas: OffscreenCanvas; urls: { foto: string; aura: string }; diag?: boolean; W: number; H: number; dpr: number }
  | { tipo: 'medir'; W: number; H: number; dpr: number }
  | { tipo: 'olhar'; x: number; y: number }
  | { tipo: 'clique' }
  | { tipo: 'pular' }
  | { tipo: 'progresso'; p: Progresso }
  | { tipo: 'parar' }

let motor: Motor | null = null
const responder = (m: Saida) => (self as unknown as Worker).postMessage(m)

self.onmessage = (e: MessageEvent<Entrada>) => {
  const m = e.data
  switch (m.tipo) {
    case 'iniciar':
      motor = new Motor(m.canvas, m.urls, responder, m.diag)
      motor.medir(m.W, m.H, m.dpr)
      break
    case 'medir':
      motor?.medir(m.W, m.H, m.dpr)
      break
    case 'olhar':
      motor?.olharPara(m.x, m.y)
      break
    case 'clique':
      motor?.tocar()
      break
    case 'pular':
      motor?.pular()
      break
    case 'progresso':
      motor?.progresso(m.p)
      break
    case 'parar':
      motor?.parar()
      motor = null
      break
  }
}
