// Um relógio só para a abertura (que desenha num Worker) e para o retrato do topo (thread principal): as curvas de nível
// do retrato giram com ele, e a abertura precisa mostrar a mesma fase no último quadro para a troca não ter salto. O
// `performance.timeOrigin + performance.now()` é o mesmo em qualquer contexto; o módulo 1000 mantém a precisão em float32.
export const tempoGlobal = () => ((performance.timeOrigin + performance.now()) / 1000) % 1000

/** instante absoluto em ms, comparável entre a thread principal e o Worker */
export const epoca = () => performance.timeOrigin + performance.now()
