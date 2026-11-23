// Onde a trilha de luz dos projetos está na tela quando a câmera termina de subir (em px CSS, de cima para
// baixo). A cena dos projetos (Obras.tsx) escreve; o "Até aqui" (ateAqui.ts) lê e continua a linha dali,
// no mesmo lugar e com a mesma espessura (meia: metade da largura do núcleo, em px), para ela seguir pelos
// cartões sem troca.
export const trilhaTela = { pontos: [] as { x: number; y: number }[], versao: 0, meia: 3 }

// A entrada do túnel: a borda do furo da página (Trajetoria.tsx) tem de ser a própria boca do túnel (Tunel.tsx), senão aparece
// um segundo círculo dentro do primeiro e o robô muda de tamanho na troca. A página escreve o raio do furo na tela; o túnel
// aproxima a câmera para a boca (anéis de raio 4,6, a z = 1) acompanhar essa borda, e o robô guia cresce na mesma proporção.
export const bocaTela = { R: 0, H: 900 }
const DIST_BASE = 17.5 // distância da câmera à boca com o furo do tamanho da boca
const R0 = 0.2373 // raio do furo, em alturas de tela, em que a boca está a DIST_BASE da câmera (4,6 / (17,5 · tan 29°) / 2)
/** distância da câmera à boca do túnel para a boca caber no furo de raio R px numa tela de H px; nunca mais perto que 6 */
export const distanciaEntrada = (R: number, H: number) => Math.max(6, DIST_BASE * Math.min(1, (R0 * H) / Math.max(R, 1)))
/** quanto o robô guia deve medir (em escala do guia, 1 = 72 px) para ter o tamanho que o robô do túnel terá na tela */
export const escalaDoRoboNaBoca = (R: number, H: number) => 1.14 * (H / 900) * (15.5 / (distanciaEntrada(R, H) - 2))

/** onde o robô do túnel está na tela agora (px, centro dele) e o tamanho, em escala do guia (1 = 72 px). O túnel escreve a cada
 *  quadro; o robô guia usa isso, enquanto o furo está aberto, para ficar exatamente por baixo do robô do túnel: a troca de um
 *  pelo outro não tem salto nenhum */
export const roboBoca = { ativo: false, x: 0, y: 0, escala: 1, t: 0 }

/** raio, em px, que a boca do túnel (anéis de raio 4,6) tem na tela para um furo de raio R: igual ao do furo enquanto a câmera
 *  consegue se aproximar, menor depois (a câmera para a 6 unidades) */
export const raioDaBocaNaTela = (R: number, H: number) => (4.6 * H) / (2 * 0.5543 * distanciaEntrada(R, H))
