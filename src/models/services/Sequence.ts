import type { ProjectRepository } from '../repositories/ProjectRepository'

/** Ordem dos projetos com volta infinita: depois do último vem o primeiro. */
export class Sequence {
  constructor(private repo: ProjectRepository) {}

  private slugs() {
    return this.repo.all().map((p) => p.slug)
  }

  next(slug: string) {
    const s = this.slugs()
    return s[(s.indexOf(slug) + 1) % s.length]
  }

  prev(slug: string) {
    const s = this.slugs()
    return s[(s.indexOf(slug) - 1 + s.length) % s.length]
  }
}
