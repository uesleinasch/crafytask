import { describe, expect, it } from 'vitest'
import type { Task } from '@shared/types'
import {
  archiveMonthKey,
  archivedAfterFor,
  formatHoursMinutes,
  groupArchive,
  monthLabel,
  parseArchivedAt
} from './archiveView'

function task(id: number, archived_at: string | null, project_id: number | null = null): Task {
  return {
    id,
    archived_at,
    project_id,
    project_name: project_id ? `P${project_id}` : undefined,
    project_color: project_id ? '#2A62D6' : undefined
  } as Task
}

describe('datas do arquivo', () => {
  it('lê o CURRENT_TIMESTAMP do SQLite como UTC', () => {
    expect(parseArchivedAt('2026-11-18 12:00:00')?.toISOString()).toBe('2026-11-18T12:00:00.000Z')
    expect(parseArchivedAt(null)).toBeNull()
    expect(parseArchivedAt('lixo')).toBeNull()
  })

  it('agrupa pelo mês local e nomeia em português', () => {
    const local = new Date(2026, 10, 18, 10)
    const sqlite = local.toISOString().slice(0, 19).replace('T', ' ')
    expect(archiveMonthKey(sqlite)).toBe('2026-11')
    expect(archiveMonthKey(null)).toBe('sem-data')
    expect(monthLabel('2026-11')).toBe('novembro de 2026')
    expect(monthLabel('sem-data')).toBe('Sem data')
  })

  it('formata horas e minutos', () => {
    expect(formatHoursMinutes(0)).toBe('0min')
    expect(formatHoursMinutes(45 * 60)).toBe('45min')
    expect(formatHoursMinutes(21 * 3600 + 17 * 60)).toBe('21h 17min')
  })

  it('traduz o filtro de idade em data de corte', () => {
    const today = new Date(2026, 10, 18)
    expect(archivedAfterFor('all', today)).toBeUndefined()
    expect(archivedAfterFor('30', today)).toBe('2026-10-19')
    expect(archivedAfterFor('365', today)).toBe('2025-11-18')
  })
})

describe('groupArchive', () => {
  const tasks = [
    task(1, '2026-11-02 12:00:00', 3),
    task(2, '2026-10-20 12:00:00'),
    task(3, '2026-11-01 12:00:00')
  ]

  it('sem agrupamento devolve null', () => {
    expect(groupArchive(tasks, 'none')).toBeNull()
  })

  it('agrupa por mês na ordem em que aparecem', () => {
    const groups = groupArchive(tasks, 'month')!
    expect(groups.map((g) => [g.label, g.tasks.map((t) => t.id)])).toEqual([
      ['novembro de 2026', [1, 3]],
      ['outubro de 2026', [2]]
    ])
  })

  it('agrupa por projeto com "Sem projeto"', () => {
    const groups = groupArchive(tasks, 'project')!
    expect(groups.map((g) => [g.label, g.color, g.tasks.length])).toEqual([
      ['P3', '#2A62D6', 1],
      ['Sem projeto', null, 2]
    ])
  })
})
