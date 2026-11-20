import { describe, expect, it, vi } from 'vitest'
import { onNewTaskRequest, requestNewTask } from './newTaskRequest'

describe('pedido de nova tarefa', () => {
  it('avisa quem já está ouvindo', () => {
    const listener = vi.fn()
    const off = onNewTaskRequest(listener)
    requestNewTask()
    expect(listener).toHaveBeenCalledTimes(1)
    off()
  })

  it('guarda o pedido feito antes da lista montar e entrega uma vez só', () => {
    requestNewTask()
    const first = vi.fn()
    const offFirst = onNewTaskRequest(first)
    expect(first).toHaveBeenCalledTimes(1)
    offFirst()
    const second = vi.fn()
    const offSecond = onNewTaskRequest(second)
    expect(second).not.toHaveBeenCalled()
    offSecond()
  })
})
