import { FrameController } from '../controllers/FrameController'
import { ScrollController } from '../controllers/ScrollController'
import { PointerController } from '../controllers/PointerController'
import { AudioController } from '../controllers/AudioController'
import { ControllerRegistry } from '../controllers/ControllerRegistry'
import { StaticProjectRepository } from '../models/repositories/ProjectRepository'
import { Sequence } from '../models/services/Sequence'
import { EventBus } from '../global/events'

/** Composition root: o único lugar que dá `new`. Views pedem dependências por aqui. */
export function createContainer() {
  const frame = new FrameController()
  const events = new EventBus()
  const projects = new StaticProjectRepository()
  const sequence = new Sequence(projects)
  const scroll = new ScrollController()
  const pointer = new PointerController()
  const audio = new AudioController()

  const registry = new ControllerRegistry(frame).register(scroll, pointer, audio)

  return { frame, events, projects, sequence, scroll, pointer, audio, registry }
}

export type Container = ReturnType<typeof createContainer>
