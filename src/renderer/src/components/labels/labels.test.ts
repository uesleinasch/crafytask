import { describe, expect, it } from 'vitest'
import {
  labelDisplay,
  labelNameTaken,
  labelTasksPath,
  labelUsage,
  normalizeLabelName,
  visibleLabels,
  type Label
} from './labels'

function label(name: string, task_count: number, kind: Label['kind'] = 'tag', id = 0): Label {
  return { kind, id, name, color: '#2A62D6', icon: null, task_count, open_count: 0 }
}

describe('normalizeLabelName', () => {
  it('tira espaços e o # da tag', () => {
    expect(normalizeLabelName('tag', '  #urgente ')).toBe('urgente')
    expect(normalizeLabelName('context', ' @casa ')).toBe('@casa')
  })
})

describe('labelDisplay e labelUsage', () => {
  it('mostra tag com # e o uso com abertas', () => {
    expect(labelDisplay('tag', 'urgente')).toBe('#urgente')
    expect(labelDisplay('context', '@casa')).toBe('@casa')
    expect(labelUsage({ ...label('a', 1), open_count: 1 })).toBe('em 1 tarefa · 1 aberta')
    expect(labelUsage({ ...label('a', 3), open_count: 0 })).toBe('em 3 tarefas · 0 abertas')
  })

  it('diz não usado no gênero do rótulo', () => {
    expect(labelUsage(label('a', 0, 'tag'))).toBe('não usada')
    expect(labelUsage(label('a', 0, 'context'))).toBe('não usado')
  })
})

describe('visibleLabels', () => {
  const list = [label('casa', 2), label('Bug', 5), label('antigo', 0), label('agora', 2)]

  it('ordena por uso, desempata pelo nome', () => {
    const names = visibleLabels(list, { query: '', onlyUnused: false, sort: 'uses' }).map(
      (l) => l.name
    )
    expect(names).toEqual(['Bug', 'agora', 'casa', 'antigo'])
  })

  it('ordena por nome sem diferenciar maiúsculas e pelos menos usados', () => {
    expect(
      visibleLabels(list, { query: '', onlyUnused: false, sort: 'name' }).map((l) => l.name)
    ).toEqual(['agora', 'antigo', 'Bug', 'casa'])
    expect(visibleLabels(list, { query: '', onlyUnused: false, sort: 'unused' })[0].name).toBe(
      'antigo'
    )
  })

  it('filtra pela busca e por só sem uso', () => {
    expect(
      visibleLabels(list, { query: ' BU ', onlyUnused: false, sort: 'uses' }).map((l) => l.name)
    ).toEqual(['Bug'])
    expect(
      visibleLabels(list, { query: '', onlyUnused: true, sort: 'uses' }).map((l) => l.name)
    ).toEqual(['antigo'])
  })
})

describe('labelNameTaken', () => {
  it('acha nome igual sem diferenciar maiúsculas, menos o próprio', () => {
    const list = [label('Urgente', 1, 'tag', 1)]
    expect(labelNameTaken(list, 'urgente')).toBe(true)
    expect(labelNameTaken(list, 'urgente', 1)).toBe(false)
  })
})

describe('labelTasksPath', () => {
  it('leva para a lista filtrada pelo rótulo', () => {
    expect(labelTasksPath({ kind: 'context', id: 3 })).toBe('/?context=3')
    expect(labelTasksPath({ kind: 'tag', id: 7 })).toBe('/?tag=7')
  })
})
