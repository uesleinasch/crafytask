import { describe, expect, it } from 'vitest'
import { effectiveWorkingDir } from './workingDir'

describe('effectiveWorkingDir', () => {
  it('prefere o diretório da task', () => {
    expect(effectiveWorkingDir({ working_dir: '/task', project_working_dir: '/proj' })).toEqual({
      dir: '/task',
      source: 'task'
    })
  })

  it('herda o diretório do projeto quando a task não tem um', () => {
    expect(effectiveWorkingDir({ working_dir: null, project_working_dir: '/proj' })).toEqual({
      dir: '/proj',
      source: 'project'
    })
  })

  it('trata texto vazio como ausente', () => {
    expect(effectiveWorkingDir({ working_dir: '', project_working_dir: '' })).toEqual({
      dir: null,
      source: null
    })
  })

  it('sem nenhum diretório', () => {
    expect(effectiveWorkingDir({})).toEqual({ dir: null, source: null })
  })
})
