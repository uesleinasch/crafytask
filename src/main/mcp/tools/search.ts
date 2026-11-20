import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { searchEverything } from '../../database'
import { SEARCH_DEFAULT_LIMIT, SEARCH_KINDS, SEARCH_MAX_LIMIT } from '../../searchQueries'
import { ok } from '../reply'

export function registerSearchTools(server: McpServer): void {
  server.registerTool(
    'search',
    {
      title: 'Busca geral',
      description:
        'Procura um texto em tudo de uma vez: tasks (nome, descrição e corpo das notas), páginas de caderno (título e texto), histórico das tasks (checkpoints, operações e notas) e projetos (nome, descrição e resultado). Cada resultado traz kind, id, title, snippet (trecho em volta do termo), updated_at e, no histórico, task_id. Título que casa vem antes; depois, o mais recente. Tasks arquivadas ficam de fora, salvo include_archived. Para filtros estruturados use search_tasks ou search_pages.',
      inputSchema: {
        query: z.string().trim().min(2),
        kinds: z.array(z.enum(SEARCH_KINDS)).optional().describe('Padrão: todas as fontes.'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(SEARCH_MAX_LIMIT)
          .optional()
          .describe(`Padrão: ${SEARCH_DEFAULT_LIMIT}.`),
        include_archived: z.boolean().optional()
      }
    },
    async ({ query, kinds, limit, include_archived }) => {
      const results = searchEverything(query, {
        kinds,
        limit,
        includeArchived: include_archived
      }).map(({ title_match, ...result }) => (title_match ? { ...result, title_match } : result))
      return ok({ query, total: results.length, results })
    }
  )
}
