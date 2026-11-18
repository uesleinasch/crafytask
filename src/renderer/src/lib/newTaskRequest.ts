type Listener = () => void

const listeners = new Set<Listener>()
let pending = false

export function requestNewTask(): void {
  if (listeners.size === 0) {
    pending = true
    return
  }
  listeners.forEach((listener) => listener())
}

export function onNewTaskRequest(listener: Listener): () => void {
  listeners.add(listener)
  if (pending) {
    pending = false
    listener()
  }
  return () => {
    listeners.delete(listener)
  }
}
