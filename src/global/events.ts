// Barramento de eventos tipado. Controllers conversam por aqui, sem se conhecerem.
export interface SiteEvents {
  'route:leave': { from: string; to: string }
  'project:focus': { slug: string | null }
}

type Handler<T> = (payload: T) => void

export class EventBus {
  private handlers = new Map<keyof SiteEvents, Set<Handler<never>>>()

  on<K extends keyof SiteEvents>(name: K, handler: Handler<SiteEvents[K]>) {
    const set = this.handlers.get(name) ?? new Set()
    set.add(handler as Handler<never>)
    this.handlers.set(name, set)
    return () => set.delete(handler as Handler<never>)
  }

  emit<K extends keyof SiteEvents>(name: K, payload: SiteEvents[K]) {
    this.handlers.get(name)?.forEach((h) => (h as Handler<SiteEvents[K]>)(payload))
  }
}
