import { describe, expect, it } from 'vitest'
import type { Task, TimeBlock, TimeEntrySpan } from '@shared/types'
import {
  DRAG_TYPE,
  agendaDays,
  allDayOf,
  chipAlreadyOn,
  itemName,
  monthCells,
  readDropPayload,
  timedItemsOfDay,
  clampToGrid,
  defaultView,
  dropStart,
  movedTimes,
  resizedEnd,
  shiftedDay,
  durationLabel,
  eventsOfDay,
  layoutDay,
  periodLabel,
  plannedMinutes,
  sessionsOfDay,
  snapSlot,
  stepCursor,
  viewDays,
  type GridItem,
  type ShowKey
} from './calendarView'

const item = (key: string, start: string, end: string): GridItem => ({
  key,
  kind: 'block',
  taskId: 1,
  start,
  end
})

describe('dias da visão', () => {
  it('semana começa na segunda, 3 dias e dia a partir do cursor', () => {
    expect(viewDays('week', '2026-11-18', 'monday')).toEqual([
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22'
    ])
    expect(viewDays('3days', '2026-11-30', 'monday')).toEqual([
      '2026-11-30',
      '2026-12-01',
      '2026-12-02'
    ])
    expect(viewDays('day', '2026-11-18', 'monday')).toEqual(['2026-11-18'])
  })

  it('anda pelo tamanho da visão', () => {
    expect(stepCursor('week', '2026-11-18', 1)).toBe('2026-11-25')
    expect(stepCursor('3days', '2026-11-18', -1)).toBe('2026-11-15')
    expect(stepCursor('month', '2026-01-31', -1)).toBe('2025-12-01')
  })

  it('escolhe a visão inicial pela largura', () => {
    expect(defaultView({ lg: true, md: true })).toBe('week')
    expect(defaultView({ md: true })).toBe('3days')
    expect(defaultView({})).toBe('day')
  })

  it('nomeia o período', () => {
    const week = viewDays('week', '2026-11-18', 'monday')
    expect(periodLabel('week', '2026-11-18', week)).toBe('16–22 de novembro de 2026')
    const cross = viewDays('week', '2026-12-01', 'monday')
    expect(periodLabel('week', '2026-12-01', cross)).toBe('30 nov – 6 dez 2026')
    expect(periodLabel('day', '2026-11-18', ['2026-11-18'])).toBe('quarta-feira, 18 de novembro')
  })
})

describe('layoutDay', () => {
  it('põe os que se cruzam lado a lado e os separados em coluna cheia', () => {
    const placed = layoutDay([
      item('a', '09:00', '12:00'),
      item('b', '09:00', '09:15'),
      item('c', '10:00', '11:00'),
      item('d', '14:00', '15:00')
    ])
    const byKey = Object.fromEntries(placed.map((p) => [p.key, [p.col, p.cols]]))
    expect(byKey).toEqual({ a: [0, 2], b: [1, 2], c: [1, 2], d: [0, 1] })
  })
})

describe('itens do dia', () => {
  const tasks = [
    { id: 1, scheduled_date: '2026-11-18', scheduled_time: '14:00', scheduled_end_time: '15:30' },
    { id: 2, scheduled_date: '2026-11-18', scheduled_time: '23:30', scheduled_end_time: null },
    { id: 3, scheduled_date: '2026-11-18', scheduled_time: null, status: 'proximas' },
    { id: 4, due_date: '2026-11-18 00:00:00', status: 'proximas' },
    { id: 5, due_date: '2026-11-18', status: 'finalizada' }
  ] as Task[]

  it('tarefa com horário vira compromisso; sem fim dura 1h, sem passar da meia-noite', () => {
    expect(eventsOfDay(tasks, '2026-11-18').map((e) => [e.taskId, e.start, e.end])).toEqual([
      [1, '14:00', '15:30'],
      [2, '23:30', '23:59']
    ])
  })

  it('faixa Dia: agendadas sem horário e prazos abertos, conforme Mostrar', () => {
    const all = new Set<ShowKey>(['scheduled', 'due'])
    expect(allDayOf(tasks, '2026-11-18', all).map((a) => a.key)).toEqual(['s3', 'd4'])
    expect(allDayOf(tasks, '2026-11-18', new Set<ShowKey>(['due'])).map((a) => a.key)).toEqual([
      'd4'
    ])
  })

  it('soma os minutos dos blocos do dia', () => {
    const blocks = [
      { date: '2026-11-18', start_time: '09:00', end_time: '10:30' },
      { date: '2026-11-18', start_time: '14:00', end_time: '15:00' },
      { date: '2026-11-19', start_time: '09:00', end_time: '17:00' }
    ] as TimeBlock[]
    expect(plannedMinutes(blocks, '2026-11-18')).toBe(150)
  })
})

describe('sessões', () => {
  const local = (d: number, h: number, m = 0): string => new Date(2026, 10, d, h, m).toISOString()
  const spans = [
    { id: 1, start_time: local(17, 23), end_time: local(18, 1) },
    { id: 2, start_time: local(18, 9), end_time: local(18, 9, 40) },
    { id: 3, start_time: local(18, 16), end_time: null }
  ] as TimeEntrySpan[]

  it('corta na meia-noite e leva a sessão em andamento até agora', () => {
    const now = new Date(2026, 10, 18, 17, 0)
    expect(
      sessionsOfDay(spans, '2026-11-18', now).map((s) => [s.span.id, s.start, s.end, s.running])
    ).toEqual([
      [1, 0, 60, false],
      [2, 540, 580, false],
      [3, 960, 1020, true]
    ])
    expect(sessionsOfDay(spans, '2026-11-17', now).map((s) => [s.start, s.end])).toEqual([
      [1380, 1440]
    ])
  })
})

describe('geometria', () => {
  it('recorta pela faixa de horas', () => {
    expect(clampToGrid(6 * 60, 8 * 60, 7, 22)).toEqual({ top: 0, length: 60 })
    expect(clampToGrid(23 * 60, 24 * 60, 7, 22)).toBeNull()
  })

  it('arredonda o clique em 15 min dentro da faixa', () => {
    expect(snapSlot(9 * 60 + 7, 7, 22)).toBe(9 * 60)
    expect(snapSlot(21 * 60 + 50, 7, 22)).toBe(21 * 60)
    expect(snapSlot(5 * 60, 7, 22)).toBe(7 * 60)
  })

  it('escreve a duração', () => {
    expect(durationLabel(45)).toBe('45 min')
    expect(durationLabel(60)).toBe('1h')
    expect(durationLabel(150)).toBe('2h30')
  })
})

describe('arrastar e redimensionar', () => {
  it('move mantendo a duração, em passos de 15 min, dentro do dia', () => {
    expect(movedTimes('09:00', '10:30', 37, 0, 24)).toEqual({
      start_time: '09:30',
      end_time: '11:00'
    })
    expect(movedTimes('23:00', '23:45', 120, 0, 24)).toEqual({
      start_time: '23:00',
      end_time: '23:45'
    })
    expect(movedTimes('00:30', '01:00', -90, 0, 24)).toEqual({
      start_time: '00:00',
      end_time: '00:30'
    })
  })

  it('a alça muda só o fim, com no mínimo 15 min', () => {
    expect(resizedEnd('09:00', '10:00', 22, 24)).toBe('10:15')
    expect(resizedEnd('09:00', '10:00', -120, 24)).toBe('09:15')
    expect(resizedEnd('22:00', '23:00', 300, 24)).toBe('23:59')
  })

  it('soltar da lista cria 1h a partir do ponto, sem passar do fim do dia', () => {
    expect(dropStart(9 * 60 + 8, 0, 24)).toBe(9 * 60 + 15)
    expect(dropStart(23 * 60 + 40, 0, 24)).toBe(22 * 60 + 45)
  })
})

describe('troca de dia ao arrastar', () => {
  const days = ['2026-11-16', '2026-11-17', '2026-11-18']
  it('anda pelas colunas visíveis e para nas pontas', () => {
    expect(shiftedDay(days, '2026-11-17', 0.6)).toBe('2026-11-18')
    expect(shiftedDay(days, '2026-11-17', 4)).toBe('2026-11-18')
    expect(shiftedDay(days, '2026-11-17', -3)).toBe('2026-11-16')
    expect(shiftedDay(['2026-11-17'], '2026-11-17', 2)).toBe('2026-11-17')
  })
})

describe('mês e agenda', () => {
  it('mês começa na segunda e corta a sexta semana quando ela é do mês seguinte', () => {
    const nov = monthCells('2026-11-19', 'monday')
    expect([nov[0], nov.length, nov[nov.length - 1]]).toEqual(['2026-10-26', 42, '2026-12-06'])
    const feb = monthCells('2026-02-10', 'monday')
    expect([feb[0], feb.length, feb[feb.length - 1]]).toEqual(['2026-01-26', 35, '2026-03-01'])
    expect(monthCells('2026-11-19', 'sunday')[0]).toBe('2026-11-01')
  })

  it('agenda são 14 dias a partir do cursor e anda de 14 em 14', () => {
    const days = agendaDays('2026-11-19')
    expect([days.length, days[0], days[13]]).toEqual([14, '2026-11-19', '2026-12-02'])
    expect(stepCursor('agenda', '2026-11-19', 1)).toBe('2026-12-03')
    expect(periodLabel('agenda', '2026-11-19', days)).toBe('19 nov – 2 dez 2026')
    expect(periodLabel('agenda', '2026-11-01', agendaDays('2026-11-01'))).toBe(
      '1 nov – 14 nov 2026'
    )
  })

  it('itens com hora do dia: blocos e tarefas com horário em ordem, conforme Mostrar', () => {
    const data = {
      blocks: [
        {
          id: 7,
          task_id: 9,
          task_name: 'Bloco',
          date: '2026-11-18',
          start_time: '15:00',
          end_time: '16:00'
        }
      ] as TimeBlock[],
      tasks: [
        { id: 1, name: 'Reunião', scheduled_date: '2026-11-18', scheduled_time: '09:00' }
      ] as Task[]
    }
    const all = timedItemsOfDay(data, '2026-11-18', new Set<ShowKey>(['block', 'event']))
    expect(all.map((i) => [itemName(i), i.start])).toEqual([
      ['Reunião', '09:00'],
      ['Bloco', '15:00']
    ])
    expect(timedItemsOfDay(data, '2026-11-18', new Set<ShowKey>(['block'])).map(itemName)).toEqual([
      'Bloco'
    ])
  })

  it('lê o que foi arrastado e ignora soltar no mesmo dia', () => {
    const payload = (raw: string): Pick<DataTransfer, 'getData'> => ({
      getData: (type) => (type === DRAG_TYPE ? raw : '')
    })
    expect(readDropPayload(payload('{"taskId":3,"chip":"due"}'))).toEqual({
      taskId: 3,
      chip: 'due'
    })
    expect(readDropPayload(payload('lixo'))).toBeNull()
    expect(readDropPayload(payload('{"taskId":"3"}'))).toBeNull()
    const task = { id: 3, scheduled_date: '2026-11-18', due_date: '2026-11-20 00:00:00' } as Task
    expect(chipAlreadyOn(task, 'scheduled', '2026-11-18')).toBe(true)
    expect(chipAlreadyOn(task, 'due', '2026-11-20')).toBe(true)
    expect(chipAlreadyOn(task, 'due', '2026-11-18')).toBe(false)
    expect(chipAlreadyOn(undefined, 'due', '2026-11-18')).toBe(false)
  })
})
