// Caminho de um arquivo de public/ levando em conta o basePath (vazio na Vercel; só existe se o site for publicado numa subpasta).
export const arquivo = (caminho: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${caminho}`
