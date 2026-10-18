import type { Lifecycle } from './Controller'
import { coverState, useSite } from '../global/store'
import { device } from '../global/device'

/**
 * O som da fita, sintetizado na hora: chiado de fundo, clique do botão, motor quando uma faixa está em foco.
 * Começa mudo se a pessoa pediu menos movimento. Nada toca antes do play.
 */
export class AudioController implements Lifecycle {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private hiss: GainNode | null = null
  private motor: GainNode | null = null
  private unsub: (() => void) | null = null

  init() {
    this.unsub = useSite.subscribe((s, prev) => {
      if (s.muted !== prev.muted) this.applyMute()
      // cada travessia de portal tem o seu clique, com variação de tom no filtro
      if (coverState(s.progress).shown !== coverState(prev.progress).shown) this.click(0.7)
      this.setMotor(Boolean(s.activeProject))
    })
  }

  /** Chamado pelo clique em "Aperte play": só aqui o navegador permite som. */
  enable() {
    if (this.ctx) return
    const ctx = new AudioContext()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.connect(ctx.destination)
    if (device.reducedMotion) useSite.getState().setMuted(true)
    this.applyMute()

    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

    // chiado de fita: ruído filtrado, bem baixo
    const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true
    const band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 5200; band.Q.value = 0.7
    this.hiss = ctx.createGain(); this.hiss.gain.value = 0.012
    src.connect(band).connect(this.hiss).connect(this.master); src.start()

    // motor do toca-fitas: grave pulsando, ligado só quando uma faixa está em foco
    const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = 52
    const lfo = ctx.createOscillator(); lfo.frequency.value = 6.4
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 4
    lfo.connect(lfoGain).connect(osc.frequency)
    this.motor = ctx.createGain(); this.motor.gain.value = 0
    osc.connect(this.motor).connect(this.master); osc.start(); lfo.start()

    this.click(1)
  }

  /** O "tchac" mecânico de apertar play, ou de virar a fita. */
  click(level = 1) {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    const len = 0.05, buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate), d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 6)
    const src = ctx.createBufferSource(); src.buffer = buf
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900 + Math.random() * 400
    const g = ctx.createGain(); g.gain.value = 0.35 * level
    src.connect(hp).connect(g).connect(this.master); src.start()
  }

  /** Rebobinar: um zumbido que sobe, como a fita voltando. */
  rewind() {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    const osc = ctx.createOscillator(); osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(180, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.9)
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.95)
    osc.connect(lp).connect(g).connect(this.master); osc.start(); osc.stop(ctx.currentTime + 1)
  }

  private setMotor(on: boolean) {
    if (!this.ctx || !this.motor) return
    this.motor.gain.setTargetAtTime(on ? 0.03 : 0, this.ctx.currentTime, 0.12)
  }

  private applyMute() {
    if (!this.ctx || !this.master) return
    this.master.gain.setTargetAtTime(useSite.getState().muted ? 0 : 1, this.ctx.currentTime, 0.06)
  }

  destroy() {
    this.unsub?.()
    this.ctx?.close()
    this.ctx = null
  }
}
