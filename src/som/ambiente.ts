// A música de fundo do site: uma melodia calma sobre pads, sintetizada na hora com a Web Audio (nenhum arquivo para baixar, nenhum
// direito autoral). Quatro acordes de 8 segundos (Lá menor com nona, Fá com sétima, Dó com nona, Sol) e uma melodia de duas frases,
// que se repete a cada 64 segundos. Tudo passa por uma reverberação longa, para soar espaçado.

export type Ambiente = {
  contexto: AudioContext
  ligar: () => void
  desligar: () => void
  destruir: () => void
}

const VOLUME = 0.55
const ACORDE = 8 // segundos por acorde
// notas em número MIDI (69 = o Lá de 440 Hz): o baixo e as quatro vozes do pad
const ACORDES = [
  { baixo: 45, vozes: [57, 60, 64, 71] }, // Am9
  { baixo: 41, vozes: [53, 57, 60, 64] }, // Fmaj7
  { baixo: 48, vozes: [55, 59, 62, 64] }, // Cmaj9
  { baixo: 43, vozes: [55, 59, 62, 69] }, // G(add9)
]
// a melodia: [começo em segundos, nota, duração]
const MELODIA: [number, number, number][] = [
  [0, 76, 3],
  [3, 71, 1.5],
  [4.5, 72, 3.5],
  [8, 69, 3],
  [11, 72, 1.5],
  [12.5, 76, 3.5],
  [16, 79, 3],
  [19, 76, 1.5],
  [20.5, 74, 3.5],
  [24, 74, 2],
  [26, 71, 2],
  [28, 69, 4],
  [32, 81, 3],
  [35, 79, 1.5],
  [36.5, 76, 3.5],
  [40, 77, 3],
  [43, 76, 1.5],
  [44.5, 72, 3.5],
  [48, 74, 2],
  [50, 76, 2],
  [52, 79, 4],
  [56, 74, 3],
  [59, 71, 1.5],
  [60.5, 69, 3.5],
]
const VOLTA = ACORDES.length * 2 * ACORDE // 64 s: a progressão duas vezes, uma frase em cada

const hz = (nota: number) => 440 * Math.pow(2, (nota - 69) / 12)

/** a resposta de uma sala enorme: ruído que vai se apagando, diferente em cada ouvido */
function sala(ctx: AudioContext, segundos: number) {
  const n = Math.floor(ctx.sampleRate * segundos)
  const b = ctx.createBuffer(2, n, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c)
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2)
  }
  return b
}

export function criarAmbiente(): Ambiente | null {
  if (typeof AudioContext === 'undefined') return null
  const ctx = new AudioContext()
  const volume = ctx.createGain()
  volume.gain.value = 0
  const limite = ctx.createDynamicsCompressor()
  volume.connect(limite).connect(ctx.destination)

  const reverb = ctx.createConvolver()
  reverb.buffer = sala(ctx, 5)
  const cauda = ctx.createGain()
  cauda.gain.value = 0.55
  reverb.connect(cauda).connect(volume)

  // os pads: ondas ricas filtradas bem baixo, com o filtro respirando devagar
  const pads = ctx.createGain()
  const filtro = ctx.createBiquadFilter()
  filtro.type = 'lowpass'
  filtro.frequency.value = 850
  filtro.Q.value = 0.4
  const respiro = ctx.createOscillator()
  respiro.frequency.value = 0.045
  const quanto = ctx.createGain()
  quanto.gain.value = 300
  respiro.connect(quanto).connect(filtro.frequency)
  respiro.start()
  pads.connect(filtro)
  filtro.connect(volume)
  filtro.connect(reverb)

  // a melodia: seca, na sala e num eco que volta mais escuro a cada vez
  const melodia = ctx.createGain()
  const eco = ctx.createDelay(2)
  eco.delayTime.value = 0.75
  const volta = ctx.createGain()
  volta.gain.value = 0.34
  const escuro = ctx.createBiquadFilter()
  escuro.type = 'lowpass'
  escuro.frequency.value = 2200
  melodia.connect(volume)
  melodia.connect(reverb)
  melodia.connect(eco)
  eco.connect(escuro).connect(volta).connect(eco)
  escuro.connect(reverb)

  /** uma voz: oscilador com subida, sustentação e queda, num lado do estéreo */
  const voz = (destino: AudioNode, tipo: OscillatorType, freq: number, quando: number, sobe: number, dura: number, cai: number, pico: number, lado = 0, desafina = 0) => {
    const o = ctx.createOscillator()
    o.type = tipo
    o.frequency.value = freq
    o.detune.value = desafina
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, quando)
    g.gain.linearRampToValueAtTime(pico, quando + sobe)
    g.gain.setValueAtTime(pico, quando + Math.max(sobe, dura))
    g.gain.exponentialRampToValueAtTime(0.0001, quando + Math.max(sobe, dura) + cai)
    const p = ctx.createStereoPanner()
    p.pan.value = lado
    o.connect(g).connect(p).connect(destino)
    o.start(quando)
    o.stop(quando + Math.max(sobe, dura) + cai + 0.05)
  }

  const tocarAcorde = (i: number, quando: number) => {
    const a = ACORDES[i % ACORDES.length]!
    voz(pads, 'sine', hz(a.baixo), quando, 2.5, ACORDE, 3.5, 0.16)
    voz(pads, 'triangle', hz(a.baixo + 12), quando, 3, ACORDE, 3.5, 0.05)
    a.vozes.forEach((nota, k) => {
      const lado = (k / (a.vozes.length - 1)) * 1.2 - 0.6
      voz(pads, 'sawtooth', hz(nota), quando, 3.2, ACORDE, 4, 0.022, lado, -7)
      voz(pads, 'sawtooth', hz(nota), quando, 3.2, ACORDE, 4, 0.022, -lado, 7)
    })
  }

  const tocarNota = (nota: number, quando: number, dura: number) => {
    voz(melodia, 'sine', hz(nota), quando, 0.14, dura * 0.5, dura + 1.4, 0.13, -0.12)
    voz(melodia, 'triangle', hz(nota), quando, 0.2, dura * 0.4, dura + 0.8, 0.035, 0.12, 5)
    voz(melodia, 'sine', hz(nota + 12), quando, 0.05, 0.1, 1.6, 0.025, 0.2)
  }

  // o relógio: agenda com folga o que vem nos próximos segundos. Com o contexto suspenso o tempo dele para, e a música continua de onde
  // estava
  const inicio = ctx.currentTime + 0.15
  let acorde = 0
  let nota = 0
  const agendar = () => {
    const ate = ctx.currentTime + 1.5
    while (inicio + acorde * ACORDE < ate) tocarAcorde(acorde, inicio + acorde++ * ACORDE)
    for (;;) {
      const [t, n, d] = MELODIA[nota % MELODIA.length]!
      const quando = inicio + Math.floor(nota / MELODIA.length) * VOLTA + t
      if (quando >= ate) break
      tocarNota(n, quando, d)
      nota++
    }
  }
  agendar()
  const relogio = window.setInterval(agendar, 250)

  let tocando = false
  let parada = 0

  return {
    contexto: ctx,
    ligar() {
      window.clearTimeout(parada)
      void ctx.resume()
      if (tocando) return
      tocando = true
      volume.gain.setTargetAtTime(VOLUME, ctx.currentTime, 1.2) // entra aos poucos
    },
    desligar() {
      if (!tocando) return
      tocando = false
      volume.gain.setTargetAtTime(0, ctx.currentTime, 0.18)
      parada = window.setTimeout(() => void ctx.suspend(), 900)
    },
    destruir() {
      window.clearInterval(relogio)
      window.clearTimeout(parada)
      void ctx.close()
    },
  }
}
