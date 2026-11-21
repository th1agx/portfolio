// Onde a trilha de luz dos projetos está na tela quando a câmera termina de subir (em px CSS, de cima para
// baixo). A cena dos projetos (Obras.tsx) escreve; o "Até aqui" (ateAqui.ts) lê e continua a linha dali,
// no mesmo lugar e com a mesma espessura (meia: metade da largura do núcleo, em px), para ela seguir pelos
// cartões sem troca.
export const trilhaTela = { pontos: [] as { x: number; y: number }[], versao: 0, meia: 3 }
