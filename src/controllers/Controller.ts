export interface Lifecycle {
  init(): void
  destroy(): void
}

export interface Frameable {
  onFrame(time: number, delta: number): void
}

export interface Resizable {
  onResize(width: number, height: number): void
}

export const isFrameable = (c: unknown): c is Frameable => typeof (c as Frameable).onFrame === 'function'
export const isResizable = (c: unknown): c is Resizable => typeof (c as Resizable).onResize === 'function'
