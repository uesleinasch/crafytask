import { describe, it, expect } from 'vitest'
import {
  buildTaskCountQuery,
  buildTaskIdsQuery,
  buildTaskListQuery,
  buildTaskTotalsQuery,
  buildTaskStatusCountQuery,
  buildTaskListWhere,
  escapeLike
} from './taskQuery'

const COLUMNS = 't.id, t.name'

describe('buildTaskListWhere', () => {
  it('overdueAt considera prazos de dias anteriores e de hoje com hora passada', () => {
    const { clause, params } = buildTaskListWhere({
      overdueAt: { date: '2026-10-06', time: '14:30' }
    })

    expect(clause).toContain(
      't.due_date IS NOT NULL AND (substr(t.due_date, 1, 10) < ? OR (substr(t.due_date, 1, 10) = ? AND t.due_time IS NOT NULL AND t.due_time < ?))'
    )
    expect(params).toEqual([0, '2026-10-06', '2026-10-06', '14:30'])
  })

  it('sempre restringe a tarefas raiz e parametriza o arquivamento', () => {
    const { clause, params } = buildTaskListWhere({})

    expect(clause).toBe('t.is_archived = ? AND t.parent_task_id IS NULL')
    expect(params).toEqual([0])
  })

  it('trata archived como 1', () => {
    expect(buildTaskListWhere({ archived: true }).params).toEqual([1])
  })

  it('adiciona status quando não é "all"', () => {
    const { clause, params } = buildTaskListWhere({ status: 'inbox' })

    expect(clause).toContain('t.status = ?')
    expect(params).toEqual([0, 'inbox'])
  })

  it('ignora status "all"', () => {
    expect(buildTaskListWhere({ status: 'all' }).clause).not.toContain('t.status')
  })

  it('adiciona categoria quando não é "all"', () => {
    const { clause, params } = buildTaskListWhere({ category: 'urgente' })

    expect(clause).toContain('t.category = ?')
    expect(params).toEqual([0, 'urgente'])
  })

  it('ignora categoria "all"', () => {
    expect(buildTaskListWhere({ category: 'all' }).clause).not.toContain('t.category')
  })

  it('filtra por projeto informado', () => {
    const { clause, params } = buildTaskListWhere({ projectId: 7 })

    expect(clause).toContain('t.project_id = ?')
    expect(params).toEqual([0, 7])
  })

  it('filtra tarefas sem projeto sem consumir parâmetro', () => {
    const { clause, params } = buildTaskListWhere({ projectId: 'none' })

    expect(clause).toContain('t.project_id IS NULL')
    expect(params).toEqual([0])
  })

  it('ignora projectId nulo', () => {
    expect(buildTaskListWhere({ projectId: null }).clause).not.toContain('t.project_id')
  })

  it('filtra tag por EXISTS para não duplicar linhas', () => {
    const { clause, params } = buildTaskListWhere({ tagId: 3 })

    expect(clause).toContain('EXISTS (SELECT 1 FROM task_tags')
    expect(clause).not.toContain('JOIN task_tags')
    expect(params).toEqual([0, 3])
  })

  it('filtra contexto por EXISTS', () => {
    const { clause, params } = buildTaskListWhere({ contextId: 5 })

    expect(clause).toContain('EXISTS (SELECT 1 FROM task_contexts')
    expect(params).toEqual([0, 5])
  })

  it('busca em nome e descrição', () => {
    const { clause, params } = buildTaskListWhere({ search: 'relatório' })

    expect(clause).toContain('t.name LIKE ?')
    expect(clause).toContain('t.description LIKE ?')
    expect(params).toEqual([0, '%relatório%', '%relatório%'])
  })

  it('ignora busca vazia ou só com espaços', () => {
    expect(buildTaskListWhere({ search: '   ' }).clause).not.toContain('LIKE')
    expect(buildTaskListWhere({ search: '' }).params).toEqual([0])
  })

  it('escapa curingas do LIKE na busca', () => {
    const { clause, params } = buildTaskListWhere({ search: '100%_a\\b' })

    expect(clause).toContain("ESCAPE '\\'")
    expect(params[1]).toBe('%100\\%\\_a\\\\b%')
  })

  it('filtra apenas bloqueadas por dependência não finalizada', () => {
    const { clause, params } = buildTaskListWhere({ blockedOnly: true })

    expect(clause).toContain('FROM task_dependencies')
    expect(clause).toContain("dep.status != 'finalizada'")
    expect(params).toEqual([0])
  })

  it('combina filtros preservando a ordem dos parâmetros', () => {
    const { params } = buildTaskListWhere({
      archived: true,
      status: 'proximas',
      category: 'urgente',
      projectId: 2,
      tagId: 4,
      contextId: 6,
      search: 'x'
    })

    expect(params).toEqual([1, 'proximas', 'urgente', 2, 4, 6, '%x%', '%x%'])
  })
})

describe('buildTaskListQuery', () => {
  it('ordena por atualização mais recente por padrão', () => {
    const { sql } = buildTaskListQuery(COLUMNS, {})

    expect(sql).toContain('ORDER BY t.updated_at DESC')
    expect(sql).toContain('FROM tasks t')
    expect(sql).toContain('LEFT JOIN projects p ON t.project_id = p.id')
    expect(sql).toContain(COLUMNS)
  })

  it('ordena por prazo jogando tarefas sem prazo para o fim', () => {
    const { sql } = buildTaskListQuery(COLUMNS, { sort: 'due_date' })

    expect(sql).toContain('ORDER BY t.due_date IS NULL, t.due_date ASC')
  })

  it('cai no padrão quando o sort é desconhecido', () => {
    const { sql } = buildTaskListQuery(COLUMNS, {
      sort: 'drop table' as unknown as 'updated'
    })

    expect(sql).toContain('ORDER BY t.updated_at DESC')
    expect(sql).not.toContain('drop table')
  })

  it('não pagina quando limit não é informado', () => {
    const { sql, params } = buildTaskListQuery(COLUMNS, { offset: 40 })

    expect(sql).not.toContain('LIMIT')
    expect(sql).not.toContain('OFFSET')
    expect(params).toEqual([0])
  })

  it('pagina com limit e offset depois dos parâmetros do filtro', () => {
    const { sql, params } = buildTaskListQuery(COLUMNS, {
      status: 'inbox',
      limit: 50,
      offset: 100
    })

    expect(sql).toContain('LIMIT ? OFFSET ?')
    expect(params).toEqual([0, 'inbox', 50, 100])
  })

  it('aceita limit sem offset', () => {
    const { sql, params } = buildTaskListQuery(COLUMNS, { limit: 25 })

    expect(sql).toContain('LIMIT ?')
    expect(sql).not.toContain('OFFSET')
    expect(params).toEqual([0, 25])
  })
})

describe('buildTaskCountQuery', () => {
  it('conta com o mesmo WHERE, sem ordenação nem paginação', () => {
    const filters = { status: 'inbox' as const, limit: 10 }
    const count = buildTaskCountQuery(filters)

    expect(count.sql).toContain('SELECT COUNT(*) as total')
    expect(count.sql).toContain(buildTaskListWhere(filters).clause)
    expect(count.sql).not.toContain('ORDER BY')
    expect(count.sql).not.toContain('LIMIT')
    expect(count.params).toEqual([0, 'inbox'])
  })
})

describe('buildTaskStatusCountQuery', () => {
  it('agrupa por status com os outros filtros da lista, ignorando o status escolhido', () => {
    const filters = { status: 'inbox' as const, projectId: 7, search: 'api', limit: 10 }
    const count = buildTaskStatusCountQuery(filters)

    expect(count.sql).toContain('GROUP BY t.status')
    expect(count.sql).not.toContain('t.status = ?')
    expect(count.sql).not.toContain('LIMIT')
    expect(count.params).toEqual([0, 7, '%api%', '%api%'])
  })
})

describe('buildTaskListWhere - prazo e energia', () => {
  it('filtra por prazo máximo incluindo o próprio dia', () => {
    const { clause, params } = buildTaskListWhere({ dueBefore: '2026-08-21' })
    expect(clause).toContain('t.due_date IS NOT NULL AND t.due_date <= ?')
    expect(params).toContain('2026-08-21')
  })

  it('filtra por prazo mínimo', () => {
    const { clause, params } = buildTaskListWhere({ dueAfter: '2026-08-01' })
    expect(clause).toContain('t.due_date IS NOT NULL AND t.due_date >= ?')
    expect(params).toContain('2026-08-01')
  })

  it('combina as duas pontas do intervalo', () => {
    const { params } = buildTaskListWhere({ dueAfter: '2026-08-01', dueBefore: '2026-08-31' })
    expect(params).toEqual([0, '2026-08-01', '2026-08-31'])
  })

  it('filtra por nível de energia', () => {
    const { clause, params } = buildTaskListWhere({ energy: 'alto' })
    expect(clause).toContain('t.energy_level = ?')
    expect(params).toContain('alto')
  })

  it('ignora prazo e energia quando não informados', () => {
    const { clause } = buildTaskListWhere({})
    expect(clause).not.toContain('due_date <=')
    expect(clause).not.toContain('energy_level')
  })

  it('exclui os status informados', () => {
    const { clause, params } = buildTaskListWhere({ excludeStatus: ['finalizada'] })
    expect(clause).toContain('t.status NOT IN (?)')
    expect(params).toContain('finalizada')
  })

  it('monta um placeholder por status excluído', () => {
    const { clause, params } = buildTaskListWhere({ excludeStatus: ['finalizada', 'someday'] })
    expect(clause).toContain('t.status NOT IN (?, ?)')
    expect(params).toEqual([0, 'finalizada', 'someday'])
  })

  it('ignora excludeStatus vazio', () => {
    expect(buildTaskListWhere({ excludeStatus: [] }).clause).not.toContain('NOT IN')
  })
})

describe('escapeLike', () => {
  it('neutraliza curingas e a própria barra de escape', () => {
    expect(escapeLike('a%b_c\\d')).toBe('a\\%b\\_c\\\\d')
  })

  it('deixa texto comum intacto', () => {
    expect(escapeLike('relatório final')).toBe('relatório final')
  })
})

describe('arquivo', () => {
  it('filtra pela data de arquivamento', () => {
    const { clause, params } = buildTaskListWhere({
      archived: true,
      archivedAfter: '2026-01-01',
      archivedBefore: '2026-06-01'
    })

    expect(clause).toContain("date(t.archived_at, 'localtime') >= ?")
    expect(clause).toContain("date(t.archived_at, 'localtime') < ?")
    expect(params).toEqual([1, '2026-01-01', '2026-06-01'])
  })

  it('ordena por arquivamento, nome e tempo', () => {
    expect(buildTaskListQuery(COLUMNS, { sort: 'archived' }).sql).toContain(
      'ORDER BY t.archived_at IS NULL, t.archived_at DESC'
    )
    expect(buildTaskListQuery(COLUMNS, { sort: 'name' }).sql).toContain(
      'ORDER BY t.name COLLATE NOCASE ASC'
    )
    expect(buildTaskListQuery(COLUMNS, { sort: 'total_time' }).sql).toContain(
      'ORDER BY t.total_seconds DESC'
    )
  })

  it('lista os ids com o mesmo filtro da listagem', () => {
    const { sql, params } = buildTaskIdsQuery({ archived: true, archivedBefore: '2025-11-18' })

    expect(sql).toContain('SELECT t.id FROM tasks t WHERE t.is_archived = ?')
    expect(sql).toContain('t.parent_task_id IS NULL')
    expect(params).toEqual([1, '2025-11-18'])
  })
})

describe('busca por #id e totais', () => {
  it('casa #id ou número com o id da tarefa, além do nome', () => {
    for (const search of ['#42', '42']) {
      const { clause, params } = buildTaskListWhere({ search })
      expect(clause).toContain('(t.id = ? OR t.name LIKE ?')
      expect(params).toEqual([0, 42, `%${search}%`, `%${search}%`])
    }
  })

  it('texto comum não compara id', () => {
    expect(buildTaskListWhere({ search: '#abc' }).clause).not.toContain('t.id = ?')
  })

  it('soma contagem e tempo com o mesmo filtro', () => {
    const { sql, params } = buildTaskTotalsQuery({ archived: true, projectId: 3 })
    expect(sql).toContain('COUNT(*) AS count, COALESCE(SUM(t.total_seconds), 0) AS seconds')
    expect(params).toEqual([1, 3])
  })
})
