import { describe, expect, it } from 'vitest'
import { chooseDirectoryStart, matchByDirectory, normalizeDir, type DirTask } from './workDirMatch'

const task = (id: number, overrides: Partial<DirTask> = {}): DirTask => ({
  id,
  status: 'proximas',
  ...overrides
})

describe('normalizeDir', () => {
  it('tira a barra final, junta barras e expande ~', () => {
    expect(normalizeDir('/repo/app/')).toBe('/repo/app')
    expect(normalizeDir('/repo//app///')).toBe('/repo/app')
    expect(normalizeDir('~/Code', '/home/ana')).toBe('/home/ana/Code')
    expect(normalizeDir('~', '/home/ana')).toBe('/home/ana')
    expect(normalizeDir('/')).toBe('/')
  })
})

describe('matchByDirectory', () => {
  it('casa pasta igual e subpasta, não pasta irmã de mesmo prefixo', () => {
    const tasks = [task(1, { working_dir: '/repo/app' })]
    expect(matchByDirectory('/repo/app', tasks, []).tasks).toHaveLength(1)
    expect(matchByDirectory('/repo/app/src/main/', tasks, []).tasks).toHaveLength(1)
    expect(matchByDirectory('/repo/app-old', tasks, []).tasks).toHaveLength(0)
    expect(matchByDirectory('/repo', tasks, []).tasks).toHaveLength(0)
  })

  it('o caminho mais específico vence', () => {
    const tasks = [
      task(1, { project_working_dir: '/repo' }),
      task(2, { working_dir: '/repo/packages/api', project_working_dir: '/repo' })
    ]
    expect(matchByDirectory('/repo/packages/api/src', tasks, []).tasks.map((t) => t.id)).toEqual([
      2
    ])
    expect(matchByDirectory('/repo/docs', tasks, []).tasks.map((t) => t.id)).toEqual([1])
  })

  it('herda a pasta do projeto e devolve o projeto', () => {
    const tasks = [task(1, { project_working_dir: '~/Code/app' }), task(2)]
    const projects = [
      { id: 10, working_dir: '~/Code/app' },
      { id: 11, working_dir: '~/Code' },
      { id: 12, working_dir: null }
    ]
    const match = matchByDirectory('/home/ana/Code/app/src', tasks, projects, '/home/ana')
    expect(match.tasks.map((t) => t.id)).toEqual([1])
    expect(match.project?.id).toBe(10)
  })

  it('nada casa', () => {
    const match = matchByDirectory('/tmp/x', [task(1, { working_dir: '/repo' })], [])
    expect(match).toEqual({ tasks: [], project: null })
  })
})

describe('chooseDirectoryStart', () => {
  it('abre a única task em executando', () => {
    const result = chooseDirectoryStart([task(1), task(2, { status: 'executando' }), task(3)])
    expect(result).toEqual({ kind: 'open', task: task(2, { status: 'executando' }) })
  })

  it('prefere a subtarefa em executando à task pai', () => {
    const result = chooseDirectoryStart([
      task(1, { status: 'executando' }),
      task(2, { status: 'executando', parent_task_id: 1 })
    ])
    expect(result.kind === 'open' && result.task.id).toBe(2)
  })

  it('várias em executando: ambíguo só com elas', () => {
    const result = chooseDirectoryStart([
      task(1, { status: 'executando' }),
      task(2, { status: 'executando' }),
      task(3)
    ])
    expect(result.kind === 'ambiguous' && result.candidates.map((t) => t.id)).toEqual([1, 2])
  })

  it('nenhuma em executando: abre se for a única, senão ambíguo', () => {
    expect(chooseDirectoryStart([task(1)]).kind).toBe('open')
    expect(chooseDirectoryStart([task(1), task(2)]).kind).toBe('ambiguous')
    expect(chooseDirectoryStart([]).kind).toBe('none')
  })
})
