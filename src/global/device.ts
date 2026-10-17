// Capacidades do aparelho, lidas uma vez. Todo efeito caro consulta isto antes (padrão do Hart).
const mq = (q: string) => typeof window !== 'undefined' && window.matchMedia(q).matches

const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection

export const device = {
  finePointer: mq('(pointer: fine) and (hover: hover)'),
  reducedMotion: mq('(prefers-reduced-motion: reduce)'),
  saveData: Boolean(connection?.saveData),
  get lowPower() {
    return !this.finePointer || this.reducedMotion || this.saveData
  },
}
