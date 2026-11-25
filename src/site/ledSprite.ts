// Um LED de matriz pré-desenhado. Os olhos de LED (EscolhaOlhos.tsx e OlhosMenu.tsx) desenhavam cada LED aceso com três círculos e uma string de
// cor nova por quadro: quase 300 LEDs × 3 arcos a cada frame, o que no celular (CPU 4× mais lenta) ocupava a thread principal o tempo todo.
// Aqui o halo, o corpo e o miolo são desenhados uma vez em canvases pequenos; por quadro cada LED vira um drawImage com o brilho no globalAlpha.

export type Sprites = {
  corpo: HTMLCanvasElement
  miolo: HTMLCanvasElement
  meia: number
}

const circulo = (g: CanvasRenderingContext2D, c: number, raio: number, cor: string) => {
  g.fillStyle = cor
  g.beginPath()
  g.arc(c, c, raio, 0, Math.PI * 2)
  g.fill()
}

/** halo + corpo do LED (raio r, halo em r × haloK) e o miolo claro, na densidade dpr; cores como "r, g, b" */
export function criarSprites(
  r: number,
  haloK: number,
  haloAlpha: number,
  halo: string,
  corpo: string,
  miolo: string,
  mioloK: number,
  dpr: number,
): Sprites {
  const meia = r * haloK
  const lado = Math.max(2, Math.ceil(meia * 2 * dpr))
  const novo = () => {
    const c = document.createElement('canvas')
    c.width = c.height = lado
    return c
  }
  const a = novo()
  const ga = a.getContext('2d')!
  ga.scale(dpr, dpr)
  ga.globalCompositeOperation = 'lighter'
  circulo(ga, meia, meia * 1, `rgba(${halo}, ${haloAlpha})`)
  circulo(ga, meia, r, `rgba(${corpo}, 1)`)
  const b = novo()
  const gb = b.getContext('2d')!
  gb.scale(dpr, dpr)
  circulo(gb, meia, r * mioloK, `rgba(${miolo}, 1)`)
  return { corpo: a, miolo: b, meia }
}
