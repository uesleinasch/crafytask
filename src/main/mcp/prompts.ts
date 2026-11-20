import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

export function retomarPrompt(taskId?: string): string {
  const target = taskId
    ? `task_id=${taskId}`
    : 'directory = a pasta em que você está trabalhando (sem task_id)'
  return [
    'Retome o trabalho no CrafyTask.',
    `1. Chame work_session com action=start e ${target}. Se vier ambiguous, mostre as candidatas e pergunte qual é.`,
    '2. Leia last_checkpoint, history e subtasks da resposta.',
    '3. Resuma em até 5 linhas: onde parou, o que falta e o próximo passo.',
    '4. Pergunte se pode seguir antes de mexer em qualquer coisa.'
  ].join('\n')
}

export function planejarDiaPrompt(date?: string): string {
  return [
    `Planeje ${date ? `o dia ${date}` : 'o dia de hoje'} no CrafyTask.`,
    `1. Chame briefing${date ? ` com date=${date}` : ''}.`,
    '2. Monte a proposta: ordem das tasks do dia, quais atrasadas puxar e blocos de tempo com horário, sem passar por cima dos blocos que já existem.',
    '3. Mostre a proposta em lista curta e espere o ok.',
    '4. Só depois do ok grave com plan_day (schedule e create_blocks).'
  ].join('\n')
}

export function revisaoPrompt(): string {
  return [
    'Conduza a revisão semanal no CrafyTask, um passo por vez.',
    '1. Chame weekly_review com action=start. Se vier already_open, continue de onde parou: passo já marcado fica como está.',
    '2. Busque os números com weekly_review action=past_week e com organize_overview.',
    '3. Para cada passo pendente: mostre o que encontrou, pergunte o que fazer, aplique o que for pedido e marque com action=step (done ou skipped).',
    '4. No fim, pergunte se há observações, grave com action=notes e feche com action=complete.'
  ].join('\n')
}

export function capturarPrompt(texto: string): string {
  return [
    'Capture no inbox do CrafyTask, sem perguntar nada.',
    'Chame create_task só com name (e description, se houver): sem status, projeto nem data. Se o texto tiver mais de uma linha, a primeira é o name e o resto vai em description.',
    'Responda só com o id criado.',
    '',
    'Texto:',
    texto.trim()
  ].join('\n')
}

export function encerrarPrompt(): string {
  return [
    'Encerre a sessão de trabalho no CrafyTask.',
    '1. Chame work_session com action=status.',
    '2. Para cada task em executando em que você trabalhou nesta conversa: escreva summary, done e remaining a partir do que foi feito e chame work_session com action=finish, se concluiu, ou action=pause (com waiting_for, se depende de alguém).',
    '3. Task em executando que não é desta conversa: não mexa; liste e pergunte.',
    '4. Termine com uma linha por task: id e status novo.'
  ].join('\n')
}

export const PROMPT_NAMES = ['retomar', 'planejar-dia', 'revisao', 'capturar', 'encerrar'] as const

function userMessage(text: string): {
  messages: { role: 'user'; content: { type: 'text'; text: string } }[]
} {
  return { messages: [{ role: 'user', content: { type: 'text', text } }] }
}

export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    'retomar',
    {
      title: 'Retomar trabalho',
      description: 'Abre a sessão de trabalho (por id ou pela pasta) e resume onde parou.',
      argsSchema: {
        task_id: z
          .string()
          .regex(/^\d+$/, 'Use o número da task.')
          .optional()
          .describe('Id da task.')
      }
    },
    ({ task_id }) => userMessage(retomarPrompt(task_id))
  )

  server.registerPrompt(
    'planejar-dia',
    {
      title: 'Planejar o dia',
      description: 'Propõe a ordem e os blocos do dia; só grava depois do ok.',
      argsSchema: {
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD.')
          .optional()
          .describe('Dia a planejar; padrão: hoje.')
      }
    },
    ({ date }) => userMessage(planejarDiaPrompt(date))
  )

  server.registerPrompt(
    'revisao',
    { title: 'Revisão semanal', description: 'Conduz a revisão semanal passo a passo.' },
    () => userMessage(revisaoPrompt())
  )

  server.registerPrompt(
    'capturar',
    {
      title: 'Capturar no inbox',
      description: 'Cria uma task no inbox com o texto, sem perguntas.',
      argsSchema: { texto: z.string().min(1).describe('O que capturar.') }
    },
    ({ texto }) => userMessage(capturarPrompt(texto))
  )

  server.registerPrompt(
    'encerrar',
    {
      title: 'Encerrar a sessão',
      description: 'Pausa ou conclui, com resumo, cada task em que a conversa trabalhou.'
    },
    () => userMessage(encerrarPrompt())
  )
}
