import { Quaternion, Ray, Vector3 } from 'three'

// Física do aglomerado, no modelo do herói do Lusion (lido no bundle deles, reescrito aqui):
// gravidade para o centro em vez de para baixo, colisão entre esferas equivalentes, o raio do ponteiro
// empurrando as peças, um giro leve em torno de (1,1,1) que mantém tudo vivo, e um impulso no clique.

const GRAVIDADE = 40
const RAIO_PONTEIRO = 0.05
const INFLUENCIA_PONTEIRO = 0.1
const EMPURRAO = 0.12

export type Corpo = {
  pos: Vector3
  vel: Vector3
  giro: Quaternion
  raio: number
  massa: number
  inercia: number
  atrito: number
  restituicao: number
  atritoTotal: number
}

export function criarCorpo(raio: number, aleatorio: () => number): Corpo {
  const inicio = new Vector3((aleatorio() - 0.5) * 16, (aleatorio() - 0.5) * 12, (aleatorio() - 0.5) * 6)
  const massa = Math.PI * raio * 1.333 * raio * raio
  return {
    pos: inicio.clone(),
    vel: inicio.clone().multiplyScalar(-2),
    giro: new Quaternion().random(),
    raio: raio * 1.05,
    massa,
    inercia: massa * raio * raio * 0.4,
    atrito: 2,
    restituicao: 0.8,
    atritoTotal: 0,
  }
}

const n = new Vector3()
const va = new Vector3()
const vb = new Vector3()
const tmp = new Vector3()
const tmp2 = new Vector3()
const eixoGiro = new Vector3(1, 1, 1).normalize()
const q = new Quaternion()
const ponteiroAnterior = new Vector3()
const forcaPonteiro = new Vector3()

/** Um passo de simulação. `raio` é o raio do ponteiro saindo da câmera (ou null fora do painel). */
export function passo(corpos: Corpo[], dt: number, raio: Ray | null, alvoPonteiro: Vector3 | null) {
  dt = Math.min(dt, 1 / 30)
  if (alvoPonteiro) {
    forcaPonteiro.copy(alvoPonteiro).sub(ponteiroAnterior).multiplyScalar(EMPURRAO / dt)
    ponteiroAnterior.copy(alvoPonteiro)
  } else forcaPonteiro.set(0, 0, 0)

  for (let i = 0; i < corpos.length; i++) {
    const a = corpos[i]!
    // gravidade para o centro, aliviada pelo atrito acumulado nos contatos
    tmp.copy(a.pos).negate().multiplyScalar((GRAVIDADE / a.massa) * (1 / (1 + a.atritoTotal)) * dt)
    a.vel.add(tmp)
    a.atritoTotal *= 0.5

    for (let j = i + 1; j < corpos.length; j++) {
      const b = corpos[j]!
      n.subVectors(a.pos, b.pos)
      const d = n.length()
      const soma = a.raio + b.raio
      if (d >= soma || d === 0) continue
      const atrito = Math.sqrt(a.atrito * b.atrito)
      a.atritoTotal += atrito
      b.atritoTotal += atrito
      n.normalize()
      a.pos.addScaledVector(n, (soma - d) * 0.5)
      b.pos.addScaledVector(n, -(soma - d) * 0.5)
      const ua = a.vel.dot(n)
      const ub = b.vel.dot(n)
      const na = (a.massa * ua + b.massa * ub - b.massa * (ua - ub) * a.restituicao) / (a.massa + b.massa)
      const nb = (a.massa * ua + b.massa * ub - a.massa * (ub - ua) * b.restituicao) / (a.massa + b.massa)
      a.vel.addScaledVector(n, (na - ua) / (1 + atrito))
      b.vel.addScaledVector(n, (nb - ub) / (1 + atrito))
    }

    if (raio && alvoPonteiro) {
      const dist = raio.distanceToPoint(a.pos) - a.raio - RAIO_PONTEIRO
      if (dist < 0) {
        raio.closestPointToPoint(a.pos, tmp)
        tmp2.subVectors(a.pos, tmp).normalize()
        a.pos.addScaledVector(tmp2, -INFLUENCIA_PONTEIRO * dist)
        a.vel.addScaledVector(tmp2, 2.4).addScaledVector(forcaPonteiro, 0.5)
      }
    }

    const r = a.pos.length()
    if (r > 0) {
      let ang = 1 - Math.abs(eixoGiro.dot(va.copy(a.pos).normalize()))
      ang *= dt * Math.min(1, r / 2) * 0.5 * (i % 2 ? 1 : -1)
      q.setFromAxisAngle(eixoGiro, ang)
      vb.copy(a.pos).applyQuaternion(q).sub(a.pos)
      a.vel.add(vb)
    }

    va.copy(a.pos).cross(a.vel)
    const w = va.length() / a.inercia
    if (w > 0) {
      q.setFromAxisAngle(va.normalize(), w * dt)
      a.giro.premultiply(q)
    }

    a.pos.addScaledVector(a.vel, dt)
    a.vel.multiplyScalar(Math.pow(0.2, dt))
  }
}

/** Impulso do clique: inverte o movimento e espalha. */
export function impulso(corpos: Corpo[], aleatorio: () => number) {
  for (const c of corpos) {
    tmp.copy(c.pos).negate().multiplyScalar(10)
    tmp2.set(aleatorio() - 0.5, aleatorio() - 0.5, aleatorio() - 0.5).multiplyScalar(80)
    c.vel.negate().add(tmp.add(tmp2).multiplyScalar(1 / c.massa))
  }
}
