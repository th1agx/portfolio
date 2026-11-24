// Caminho de um arquivo de public/ levando em conta o basePath (o site no GitHub Pages fica em /<nome do repositório>).
export const arquivo = (caminho: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${caminho}`
