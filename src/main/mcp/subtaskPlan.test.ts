import { describe, expect, it } from 'vitest'
import { planSubtasks } from './subtaskPlan'

describe('planSubtasks', () => {
  it('herda projeto e tags do pai quando a subtarefa não informa', () => {
    const [child] = planSubtasks({ project_id: 3, tagNames: ['mcp'] }, [{ name: 'Filha' }])
    expect(child).toMatchObject({ name: 'Filha', project_id: 3, tagNames: ['mcp'] })
  })

  it('respeita projeto e tags próprios da subtarefa', () => {
    const [child] = planSubtasks({ project_id: 3, tagNames: ['mcp'] }, [
      { name: 'Filha', project_id: 9, tags: ['docs'] }
    ])
    expect(child).toMatchObject({ project_id: 9, tagNames: ['docs'] })
  })

  it('lista de tags vazia na subtarefa não herda as do pai', () => {
    const [child] = planSubtasks({ tagNames: ['mcp'] }, [{ name: 'Filha', tags: [] }])
    expect(child.tagNames).toEqual([])
  })

  it('leva descrição, categoria, energia e prazo, na ordem recebida', () => {
    const children = planSubtasks({}, [
      { name: 'A', description: 'd', category: 'urgente', energy: 'alto', due_date: '2026-12-01' },
      { name: 'B' }
    ])
    expect(children.map((child) => child.name)).toEqual(['A', 'B'])
    expect(children[0]).toMatchObject({
      description: 'd',
      category: 'urgente',
      energy_level: 'alto',
      due_date: '2026-12-01'
    })
    expect(children[1].project_id).toBeUndefined()
  })
})
