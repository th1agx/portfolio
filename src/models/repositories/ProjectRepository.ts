import type { Project } from '../entities/Project'
import { projects } from '../content/pt'

export interface ProjectRepository {
  all(): Project[]
  bySlug(slug: string): Project | undefined
}

/** Lê o conteúdo estático. Trocar por um CMS amanhã é trocar esta classe, nada mais. */
export class StaticProjectRepository implements ProjectRepository {
  all() {
    return projects
  }
  bySlug(slug: string) {
    return projects.find((p) => p.slug === slug)
  }
}
