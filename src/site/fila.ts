// Fila de montagem das cenas pesadas (WebGL). O retrato do topo é a única cena que precisa aparecer logo; o resto
// (robô guia, vale lunar, projetos, túnel, cartões do "Até aqui") entra depois, uma de cada vez, e só quando o
// visitante não está mexendo no mouse nem rolando, para a compilação de shaders e o envio de texturas não
// caírem no meio de uma animação.
//
// Ordem: o retrato desenha o primeiro quadro (sinal 'retrato') -> espera a animação de entrada acabar ->
// cada tarefa, na ordem, espera um momento ocioso e roda; a próxima só começa quando a anterior avisa que está
// pronta (sinal com o nome dela). Se o visitante chega perto de uma cena (a tela chega a `margem` dela), a cena
// passa na frente da fila e monta na hora: o custo é o mesmo de antes, nunca pior.

type Sinal = { p: Promise<void>; ok: () => void }
const sinais = new Map<string, Sinal>()
const sinal = (nome: string): Sinal => {
  let s = sinais.get(nome)
  if (!s) {
    let ok = () => {}
    const p = new Promise<void>((r) => (ok = r))
    s = { p, ok }
    sinais.set(nome, s)
  }
  return s
}

/** a cena `nome` terminou de preparar (shaders compilados, texturas na placa) */
export const sinalizar = (nome: string) => sinal(nome).ok()
/** espera o sinal de `nome`; se ele nunca vier (WebGL indisponível, erro), solta depois de `limite` ms */
export const aguardar = (nome: string, limite = 8000) =>
  Promise.race([sinal(nome).p, new Promise<void>((r) => setTimeout(r, limite))])

// último gesto do visitante (mouse, toque, rolagem, teclado): a fila só roda trabalho pesado quando ele para
let ultimoGesto = 0
let ouvindo = false
const ouvir = () => {
  if (ouvindo || typeof window === 'undefined') return
  ouvindo = true
  const marca = () => (ultimoGesto = performance.now())
  for (const e of ['pointermove', 'pointerdown', 'wheel', 'touchstart', 'touchmove', 'keydown', 'scroll'])
    window.addEventListener(e, marca, { passive: true, capture: true })
}

type Janela = Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }

/** resolve quando o navegador está ocioso e o visitante parou de mexer há `quieto` ms (no máximo `teto` ms de espera) */
const momentoOcioso = (quieto = 700, teto = 20000) =>
  new Promise<void>((ok) => {
    const inicio = performance.now()
    const ric = (window as Janela).requestIdleCallback
    const tentar = () => {
      const parado = performance.now() - ultimoGesto
      if (parado < quieto && performance.now() - inicio < teto) return void setTimeout(tentar, quieto - parado)
      if (ric) ric(() => ok(), { timeout: 1500 })
      else setTimeout(ok, 50)
    }
    tentar()
  })

type Tarefa = { nome: string; ordem: number; rodar: () => Promise<void>; iniciada: boolean }
const pendentes: Tarefa[] = []
let liberado = false
let ocupado = false
let armado = false

const proxima = () => {
  if (!liberado || ocupado) return
  pendentes.sort((a, b) => a.ordem - b.ordem)
  const t = pendentes.find((x) => !x.iniciada)
  if (!t) return
  ocupado = true
  momentoOcioso()
    // a compilação de shaders agora roda em paralelo (sem prender a thread principal), então a próxima cena não
    // precisa esperar esta terminar: começa até 900 ms depois do início dela, o que escalona os trechos
    // síncronos (montar componentes, enviar texturas) sem atrasar o robô e o vale
    .then(() => (t.iniciada ? undefined : Promise.race([executar(t), new Promise<void>((ok) => setTimeout(ok, 900))])))
    .catch(() => {})
    .finally(() => {
      ocupado = false
      proxima()
    })
}

const executar = (t: Tarefa) => {
  t.iniciada = true
  return Promise.resolve()
    .then(t.rodar)
    .catch((e) => console.warn(`cena ${t.nome}:`, e))
}

const armar = () => {
  if (armado) return
  armado = true
  ouvir()
  // libera depois do primeiro quadro do retrato e da animação de entrada dele (1,35 s); se o retrato não vier
  // (sem WebGL, erro), libera de qualquer jeito depois de 7 s
  aguardar('retrato', 7000).then(() => {
    setTimeout(() => {
      liberado = true
      proxima()
    }, 1500)
  })
}

type Opcoes = {
  nome: string
  /** menor roda primeiro */
  ordem: number
  /** monta e prepara a cena; resolve quando ela está pronta para desenhar sem travar */
  rodar: () => Promise<void>
  /** se a tela chegar perto deste elemento, a cena monta na hora, na frente da fila */
  el?: Element | null
  margem?: string
}

/** agenda uma cena; devolve a função que cancela */
export function agendar({ nome, ordem, rodar, el, margem = '250% 0px' }: Opcoes): () => void {
  armar()
  const t: Tarefa = { nome, ordem, rodar, iniciada: false }
  pendentes.push(t)
  let io: IntersectionObserver | null = null
  if (el) {
    io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting && !t.iniciada) {
        io?.disconnect()
        void executar(t)
      }
    }, { rootMargin: margem })
    io.observe(el)
  }
  proxima()
  return () => {
    t.iniciada = true // não roda mais
    io?.disconnect()
    const i = pendentes.indexOf(t)
    if (i >= 0) pendentes.splice(i, 1)
  }
}
