// A paisagem sonora do site, sintetizada na hora com a Web Audio (nenhum arquivo para baixar, nenhum direito autoral): espaço profundo.
// Não há compasso nem acordes que entram juntos. Seis vozes ficam soando o tempo todo e deslizam, uma de cada vez, de um acorde aberto de Mi menor
// para outro (Mi menor, Dó com sétima maior, Lá menor, Si menor); cada uma respira e se move no estéreo no seu próprio ritmo, então a combinação não se
// repete. Por cima: um sinal distante, uma voz só que escorrega entre notas e dá voltas em torno de quem ouve; estilhaços agudos, como
// estrelas; um vento afinado; um grave que pulsa devagar. De tempos em tempos, uma segunda melodia: um solo de senoide, que repete um
// motivo mais acima e resolve numa nota longa com vibrato. Tudo se perde numa reverberação enorme e num eco que salta de um lado ao outro.

export type Ambiente = {
  contexto: AudioContext
  ligar: () => void
  desligar: () => void
  destruir: () => void
}

const VOLUME = 0.14
const SECAO = 47 // segundos em cada harmonia
// Tudo em Mi menor (número MIDI: 69 = o Lá de 440 Hz): a fundamental, que o grave toca uma oitava abaixo, e as seis vozes
const HARMONIAS = [
  { raiz: 40, vozes: [47, 54, 55, 57, 62, 66] }, // Mi menor com nona e décima primeira
  { raiz: 48, vozes: [48, 52, 54, 55, 59, 64] }, // Dó com sétima maior e quarta aumentada
  { raiz: 45, vozes: [48, 52, 55, 59, 62, 64] }, // Lá menor com nona e décima primeira
  { raiz: 47, vozes: [47, 50, 52, 54, 57, 62] }, // Si menor com sétima e quarta
]
const MENOR = [0, 2, 3, 5, 7, 8, 10] // a escala de Mi menor, para as duas melodias
const MI = 64

const hz = (nota: number) => 440 * Math.pow(2, (nota - 69) / 12)
const entre = (a: number, b: number) => a + Math.random() * (b - a)
const um = <T,>(lista: T[]) => lista[(Math.random() * lista.length) | 0]!

/**
 * a resposta de um espaço imenso: ruído diferente em cada ouvido, que cai 60 dB ao longo de `segundos` e vai ficando mais escuro. Sai com
 * energia 1, para a quantidade de reverberação ser a dos ganhos daqui, e não a do navegador
 */
function vazio(ctx: AudioContext, segundos: number) {
  const n = Math.floor(ctx.sampleRate * segundos)
  const atraso = Math.floor(ctx.sampleRate * 0.08)
  const b = ctx.createBuffer(2, n, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c)
    let suave = 0
    let energia = 0
    for (let i = atraso; i < n; i++) {
      const t = (i - atraso) / (n - atraso)
      const abre = 0.5 * Math.pow(1 - t, 2) + 0.035
      suave += (Math.random() * 2 - 1 - suave) * abre
      const entra = Math.min(1, (i - atraso) / (ctx.sampleRate * 0.25))
      d[i] = suave * Math.exp(-6.9 * t) * entra
      energia += d[i]! * d[i]!
    }
    const k = 1 / Math.sqrt(energia)
    for (let i = 0; i < n; i++) d[i]! *= k
  }
  return b
}

export function criarAmbiente(): Ambiente | null {
  if (typeof AudioContext === 'undefined') return null
  const ctx = new AudioContext()
  // sem compressor: o do navegador compensa o volume sozinho e deixaria a música mais alta do que o pedido aqui
  const volume = ctx.createGain()
  volume.gain.value = 0
  volume.connect(ctx.destination)

  const ganho = (v: number) => {
    const g = ctx.createGain()
    g.gain.value = v
    return g
  }
  const oscilador = (tipo: OscillatorType, freq: number) => {
    const o = ctx.createOscillator()
    o.type = tipo
    o.frequency.value = freq
    o.start()
    return o
  }
  /** um movimento lento: soma ao parâmetro uma onda de `periodo` segundos e `quanto` de amplitude */
  const mover = (param: AudioParam, periodo: number, quanto: number) => oscilador('sine', 1 / periodo).connect(ganho(quanto)).connect(param)

  const reverb = ctx.createConvolver()
  reverb.normalize = false
  reverb.buffer = vazio(ctx, 10)
  reverb.connect(volume)

  // o eco que salta de um ouvido ao outro, cada volta mais escura
  const eco = ganho(1)
  const juntar = ctx.createChannelMerger(2)
  const lados = [0.83, 1.19].map((tempo) => {
    const atraso = ctx.createDelay(2)
    atraso.delayTime.value = tempo
    const escuro = ctx.createBiquadFilter()
    escuro.type = 'lowpass'
    escuro.frequency.value = 1900
    atraso.connect(escuro)
    return { atraso, escuro }
  })
  eco.connect(lados[0]!.atraso)
  lados[0]!.escuro.connect(ganho(0.5)).connect(lados[1]!.atraso)
  lados[1]!.escuro.connect(ganho(0.5)).connect(lados[0]!.atraso)
  lados.forEach((l, i) => l.escuro.connect(juntar, 0, i))
  juntar.connect(volume)
  juntar.connect(reverb)

  /** um canal: quanto vai direto, quanto para a reverberação e quanto para o eco */
  const canal = (seco: number, molhado: number, saltos = 0) => {
    const entrada = ganho(1)
    entrada.connect(ganho(seco)).connect(volume)
    entrada.connect(ganho(molhado)).connect(reverb)
    if (saltos) entrada.connect(ganho(saltos)).connect(eco)
    return entrada
  }

  const primeira = HARMONIAS[0]!

  // as vozes que nunca param: duas ondas quase iguais (batem devagar), um filtro que abre e fecha, volume e posição próprios
  const nuvem = canal(0.35, 0.85)
  const vozes = primeira.vozes.map((notaDaVoz, i) => {
    const f = hz(notaDaVoz)
    const ondas = [oscilador('triangle', f), oscilador('sawtooth', f)]
    ondas[0]!.detune.value = -5 - i
    ondas[1]!.detune.value = 6 + i * 0.7
    const filtro = ctx.createBiquadFilter()
    filtro.type = 'lowpass'
    filtro.Q.value = 2.5
    filtro.frequency.value = f * 2.2
    mover(filtro.frequency, [31, 41, 23, 53, 37, 29][i]!, f * 1.1)
    const nivel = 0.017 - i * 0.0014
    const g = ganho(nivel)
    mover(g.gain, [19, 27, 17, 33, 21, 25][i]!, nivel * 0.85)
    const p = ctx.createStereoPanner()
    p.pan.value = 0
    mover(p.pan, [43, 29, 61, 35, 49, 39][i]!, 0.9)
    ondas[0]!.connect(filtro)
    ondas[1]!.connect(ganho(0.3)).connect(filtro)
    filtro.connect(g).connect(p).connect(nuvem)
    return ondas
  })

  // o grave: duas senoides com um décimo de hertz entre elas, o pulso lento de algo muito grande
  const grave = canal(0.9, 0.15)
  const fundo = [oscilador('sine', hz(primeira.raiz - 12)), oscilador('sine', hz(primeira.raiz - 12) + 0.11)]
  fundo.forEach((o) => o.connect(ganho(0.045)).connect(grave))

  // o vento: ruído por um filtro estreito, afinado na harmonia, que sobe e desce devagar
  const ruido = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate)
  const amostras = ruido.getChannelData(0)
  for (let i = 0; i < amostras.length; i++) amostras[i] = Math.random() * 2 - 1
  const fonte = ctx.createBufferSource()
  fonte.buffer = ruido
  fonte.loop = true
  const assobio = ctx.createBiquadFilter()
  assobio.type = 'bandpass'
  assobio.Q.value = 28
  assobio.frequency.value = hz(primeira.vozes[0]! + 24)
  mover(assobio.frequency, 26, 60)
  const sopro = ganho(0.05)
  mover(sopro.gain, 34, 0.045)
  fonte.connect(assobio).connect(sopro).connect(canal(0.1, 1))
  fonte.start()

  // o sinal distante: uma voz só, com vibrato, que escorrega de nota em nota enquanto dá voltas em torno de quem ouve
  const sinal = oscilador('sine', hz(MI + 12))
  const harmonico = oscilador('sine', hz(MI + 12) * 2.003)
  const vibrato = oscilador('sine', 4.6)
  const fundura = ganho(9)
  vibrato.connect(fundura)
  fundura.connect(sinal.detune)
  fundura.connect(harmonico.detune)
  const presenca = ganho(0)
  sinal.connect(presenca)
  harmonico.connect(ganho(0.14)).connect(presenca)
  const orbita = ctx.createPanner()
  orbita.panningModel = 'HRTF'
  orbita.distanceModel = 'linear'
  orbita.rolloffFactor = 0
  // (navegadores antigos não animam a posição: ali o sinal fica parado)
  if (orbita.positionX && orbita.positionZ) {
    mover(orbita.positionX, 21, 4)
    const giro = ctx.createDelay(10)
    giro.delayTime.value = 21 / 4 // um quarto de volta depois, para o eixo Z fazer o círculo com o X
    oscilador('sine', 1 / 21)
      .connect(giro)
      .connect(ganho(4))
      .connect(orbita.positionZ)
  }
  presenca.connect(orbita).connect(canal(0.25, 0.9, 0.55))

  const harmonia = (secao: number) => HARMONIAS[secao % HARMONIAS.length]!

  const mudarHarmonia = (secao: number, quando: number) => {
    const { raiz, vozes: notas } = harmonia(secao)
    // cada voz parte num momento diferente e leva vários segundos para chegar
    const ordem = [...vozes.keys()].sort(() => Math.random() - 0.5)
    ordem.forEach((v, k) => {
      const t = quando + k * entre(1.2, 2.4)
      vozes[v]!.forEach((o) => o.frequency.setTargetAtTime(hz(notas[v]!), t, 2.2))
    })
    fundo.forEach((o, i) => o.frequency.setTargetAtTime(hz(raiz - 12) + i * 0.11, quando + 3, 3))
    assobio.frequency.setTargetAtTime(hz(um(notas) + 24), quando + 5, 4)
  }

  /** uma frase do sinal: poucas notas, saltos largos, tempos desiguais */
  const frase = (quando: number) => {
    const notas = [0, 12].flatMap((o) => MENOR.map((g) => MI + 12 + o + g))
    let i = (Math.random() * notas.length) | 0
    let t = quando
    const quantas = 2 + ((Math.random() * 4) | 0)
    sinal.frequency.setValueAtTime(hz(notas[i]!), t)
    harmonico.frequency.setValueAtTime(hz(notas[i]!) * 2.003, t)
    presenca.gain.setTargetAtTime(0.03, t, 0.9)
    for (let k = 0; k < quantas; k++) {
      t += entre(1.4, 3.8)
      i = (i + um([-5, -3, -2, 1, 3, 4, 6]) + notas.length) % notas.length
      sinal.frequency.setTargetAtTime(hz(notas[i]!), t, entre(0.12, 0.5))
      harmonico.frequency.setTargetAtTime(hz(notas[i]!) * 2.003, t, 0.3)
    }
    presenca.gain.setTargetAtTime(0, t + 1.5, 1.4)
    return t + 1.5
  }

  /** estilhaços: um punhado de notas muito agudas e fracas, espalhadas no estéreo, quase só reverberação */
  const estrelas = canal(0.08, 1, 0.5)
  const brilho = (secao: number, quando: number) => {
    const { vozes: acorde } = harmonia(secao)
    let t = quando
    const quantas = 3 + ((Math.random() * 5) | 0)
    for (let k = 0; k < quantas; k++) {
      t += entre(0.07, 0.55)
      const o = ctx.createOscillator()
      o.frequency.value = hz(um(acorde) + um([24, 36]))
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(entre(0.004, 0.012), t + 0.04)
      g.gain.setTargetAtTime(0, t + 0.05, entre(0.15, 0.6))
      const p = ctx.createStereoPanner()
      p.pan.value = entre(-1, 1)
      o.connect(g).connect(p).connect(estrelas)
      o.start(t)
      o.stop(t + 3.5)
    }
  }

  // o solo: a segunda melodia, uma senoide só, tocada como um instrumento (ligada de nota a nota, com o vibrato crescendo nas notas
  // longas). Cada solo é um motivo, o mesmo motivo um pouco acima e uma resolução numa nota longa
  const solista = oscilador('sine', hz(MI))
  const tremor = oscilador('sine', 5.3)
  const intensidade = ganho(0)
  tremor.connect(intensidade).connect(solista.detune)
  const folego = ganho(0)
  solista.connect(folego).connect(canal(0.55, 0.65, 0.35))
  // [grau da escala, duração em segundos]; os graus passam de 6 para subir de oitava
  const MOTIVOS: [number, number][][] = [
    [[4, 0.45], [6, 0.35], [7, 1.1], [3, 0.5], [4, 1.6]],
    [[9, 0.9], [8, 0.3], [6, 0.3], [3, 1.4], [4, 0.35], [2, 1.2]],
    [[0, 0.3], [4, 0.3], [6, 0.3], [10, 1.5], [9, 0.45], [7, 1.1]],
    [[7, 1.3], [10, 0.4], [9, 0.4], [6, 0.7], [8, 1.4]],
    [[11, 0.7], [10, 0.25], [9, 0.25], [7, 0.9], [3, 0.5], [6, 1.3]],
  ]
  const solo = (inicioDoSolo: number, secao: number) => {
    const nota = (g: number) => MI + Math.floor(g / 7) * 12 + MENOR[((g % 7) + 7) % 7]!
    const grau = (g: number) => hz(nota(g))
    // a nota final é uma que o acorde do momento também tem
    const acorde = new Set(harmonia(secao).vozes.map((v) => v % 12))
    const finais = [7, 8, 9, 10, 11].filter((g) => acorde.has(nota(g) % 12))
    const motivo = um(MOTIVOS)
    const subida = um([1, 2, 3])
    const notas: [number, number][] = [
      ...motivo,
      ...motivo.map(([g, d]): [number, number] => [g + subida, d * entre(0.85, 1.15)]),
      [um([11, 9, 7]), 0.8],
      [finais.length ? um(finais) : 7, 3.6],
    ]
    let t = inicioDoSolo
    solista.frequency.setValueAtTime(grau(notas[0]![0]), t)
    notas.forEach(([g, dura], k) => {
      // desliza até a nota (mais devagar de vez em quando, como um dedo que arrasta)
      solista.frequency.setTargetAtTime(grau(g), t, Math.random() < 0.2 ? 0.11 : 0.025)
      const forte = 0.032 * entre(0.75, 1.1)
      folego.gain.setTargetAtTime(forte, t, k === 0 ? 0.18 : 0.04)
      folego.gain.setTargetAtTime(forte * 0.7, t + dura * 0.6, dura * 0.25)
      // o vibrato começa parado e cresce se a nota dura
      intensidade.gain.setTargetAtTime(0, t, 0.03)
      if (dura > 0.8) intensidade.gain.setTargetAtTime(dura > 2 ? 22 : 13, t + 0.4, 0.4)
      t += dura
    })
    folego.gain.setTargetAtTime(0, t, 0.7)
    intensidade.gain.setTargetAtTime(0, t + 0.8, 0.3)
    return t + 2
  }

  // o relógio: agenda com folga o que vem nos próximos segundos. Com o contexto suspenso o tempo dele para, e tudo continua de onde estava
  const inicio = ctx.currentTime
  let secao = 1
  let proximaFrase = inicio + 4
  let proximoBrilho = inicio + 4
  let proximoSolo = inicio + 14
  const agendar = () => {
    const ate = ctx.currentTime + 1.5
    while (inicio + secao * SECAO < ate) mudarHarmonia(secao, inicio + secao++ * SECAO)
    const agora = () => Math.floor((ctx.currentTime - inicio) / SECAO)
    if (proximoSolo < ate) {
      // o solo cabe inteiro dentro de uma harmonia: se não der tempo, espera a próxima assentar
      const qual = Math.floor((proximoSolo - inicio) / SECAO)
      const sobra = inicio + (qual + 1) * SECAO - proximoSolo
      if (sobra < 18) proximoSolo += sobra + 9
      else {
        const fim = solo(proximoSolo, qual)
        // enquanto o solo toca, o sinal distante se cala
        proximaFrase = Math.max(proximaFrase, fim + 1)
        proximoSolo = fim + entre(14, 24)
      }
    }
    // o sinal também não começa em cima de um solo prestes a entrar
    if (proximaFrase < ate) proximaFrase = proximoSolo - proximaFrase < 8 ? proximoSolo + 1 : frase(proximaFrase) + entre(6, 15)
    if (proximoBrilho < ate) {
      brilho(agora(), proximoBrilho)
      proximoBrilho += entre(5, 13)
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
      volume.gain.setTargetAtTime(VOLUME, ctx.currentTime, 2.5) // chega bem devagar
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
