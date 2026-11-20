import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ConfirmStore } from './confirmGuard'
import { MCP_INSTRUCTIONS } from './instructions'
import { ok } from './reply'
import { registerDrawingTools } from './tools/drawing'
import { registerHistoryTools } from './tools/history'
import { registerNotebookTools } from './tools/notebooks'
import { registerNotesTools } from './tools/notes'
import { registerPlanningTools } from './tools/planning'
import { registerStructureTools } from './tools/structure'
import { registerTaskTools } from './tools/tasks'
import { registerTimerTools } from './tools/timer'
import { registerWorkSessionTools } from './tools/workSession'

export function createMcpServer(bulkThreshold: number, confirmStore: ConfirmStore): McpServer {
  const server = new McpServer(
    { name: 'crafytask', version: '1.0.0' },
    { instructions: MCP_INSTRUCTIONS }
  )
  const ctx = { confirmStore, bulkThreshold }

  server.registerTool(
    'server_info',
    {
      title: 'Informações do servidor',
      description: 'Confirma que o CrafyTask está aberto e respondendo.'
    },
    async () => ok({ app: 'CrafyTask', status: 'ok' })
  )

  registerTaskTools(server, ctx)
  registerStructureTools(server, ctx)
  registerTimerTools(server, ctx)
  registerNotesTools(server, ctx)
  registerHistoryTools(server)
  registerWorkSessionTools(server)
  registerDrawingTools(server, ctx)
  registerNotebookTools(server, ctx)
  registerPlanningTools(server, ctx)

  return server
}
