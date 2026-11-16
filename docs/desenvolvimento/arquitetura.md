# Arquitetura

Layout padrão do electron-vite, com três contextos. Entender o **caminho de ida e volta de um dado**
importa mais que qualquer arquivo isolado:

```
renderer (React)  →  preload (window.api)  →  main (ipcMain.handle)  →  database.ts (SQLite)
   src/renderer/src      src/preload/index.ts      src/main/index.ts        src/main/database.ts
```

| Pasta | Papel |
| --- | --- |
| `src/main/` | lado Node: janelas, ciclo de vida, handlers IPC (`index.ts`), schema e queries (`database.ts`), integrações, servidor MCP, terminal |
| `src/preload/` | expõe um único objeto `window.api` via `contextBridge`; cada método é um `ipcRenderer.invoke('domínio:ação', …)` |
| `src/renderer/src/` | app React 19 com `HashRouter` (obrigatório porque o Electron carrega o renderer por `file://`); páginas em `pages/`, componentes em `components/`, um hook de dados por domínio em `hooks/` |
| `src/shared/` | `types.ts`, fonte única dos tipos de domínio, importada pelos três contextos |
| `src/mcp-bridge/` | ponte stdio do MCP, compilada à parte e copiada para a pasta de dados |

Aliases: `@shared/*` → `src/shared/*` (todos os contextos) e `@renderer/*` → `src/renderer/src/*`.

## IPC

- Canais seguem `domínio:ação` — `task:create`, `project:getTasks`, `schedule:getWeekly`,
  `notion:syncAllTasks`…
- Renderer → main é pedido/resposta (`invoke`/`handle`). Main → renderer são **eventos**
  (`webContents.send`): `tasks:refresh`, `float:update`, `timer:stopped`, `task:unblocked`,
  `notion:sync*`, `notebooks:refresh`.
- Não há store global além do timer (Zustand). Cada tela busca seus dados num hook, e a atualização
  entre telas vem do evento `tasks:refresh`.

Uma funcionalidade nova costuma tocar, nesta ordem: `src/shared/types.ts` → query em
`database.ts` → `ipcMain.handle` em `index.ts` → wrapper em `src/preload/index.ts` e o tipo em
`index.d.ts` → hook em `hooks/` → página/componente (e, se for tela nova, a `<Route>` em `App.tsx`,
a lista `isSubPage` e um botão no `TitleBar`).

## Banco de dados

- SQLite em `<pasta de dados>/ticktask.db`, com `journal_mode = WAL` e `foreign_keys = ON`.
- 16 tabelas: `tasks`, `time_entries`, `tags`, `task_tags`, `projects`, `contexts`,
  `task_contexts`, `weekly_reviews`, `task_dependencies`, `areas`, `goals`, `time_blocks`,
  `note_assets`, `notebooks`, `notebook_sections`, `notebook_pages`.
- **Migrações são imperativas**, dentro de `initDatabase()`: `CREATE TABLE IF NOT EXISTS` e
  `ALTER TABLE` protegidos. Mudar um `CHECK` exige recriar a tabela e copiar os dados. Não há
  framework de migração.
- Filtro e ordenação de listagens ficam **no SQL**, nunca no renderer: `listTasks(filters)` monta
  o `WHERE` com `buildTaskListQuery` (`taskQuery.ts`, puro e testado). As listagens não trazem a
  coluna `notes`; quem precisa do corpo usa `getTask`.

## Módulos puros e testes

Tudo que importa `electron` ou `better-sqlite3` não é testável diretamente. O padrão é extrair a
lógica para um módulo puro ao lado e testá-lo com Vitest (`environment: node`). Exemplos:
`taskQuery.ts`, `tagQueries.ts` (recebe um `SqliteLike` injetado), `notesMarkdown.ts`
(ProseMirror ↔ Markdown), `notionBlocks.ts`, `gcalPlan.ts`, `jiraPlan.ts`, `jiraAdf.ts`,
`backupPlan.ts`, `dueNotifications.ts`, `terminalSessions.ts`, `notebookQueries.ts` e a maior parte
de `src/main/mcp/`.

## Peças principais

- **Notas** — JSON do ProseMirror (Tiptap) na coluna `notes`; convertido, nunca guardado duas
  vezes: `notesMarkdown.ts` para Markdown, `notionBlocks.ts` para o Notion. Imagens em
  `notes-assets/`, servidas pelo esquema privilegiado `ticktask-asset://`.
- **Desenho** — JSON do Excalidraw na coluna `drawing`; o PNG derivado é gravado no mesmo IPC
  (`drawing:save`). O editor é carregado com `React.lazy`. As fontes do Excalidraw também passam por
  `ticktask-asset://`, listado na CSP.
- **Cadernos** — `notebookQueries.ts`, `notebookIpc.ts`, `notebookService.ts`; notas, imagens e
  desenho têm um **dono** (`task` ou `page`). Decisões em
  [ADR 0001](../adr/0001-cadernos.md).
- **Terminal** — `node-pty` só no main, importado sob demanda; `terminalSessions.ts` (puro) cuida
  de sessões, buffer e replay.
- **Janelas** — principal, timer flutuante (`/float`) e captura rápida (`/quick-capture`) carregam
  o mesmo bundle; efeitos globais precisam passar pelo guard `shouldBootstrapTimerStore`. Fechar a
  janela principal só a esconde; o app vive na bandeja (`tray.ts`).
- **Integrações** — Notion (`notion.ts`), Google Calendar (`gcalPlan.ts`, `googleCalendarApi.ts`,
  `googleCalendar.ts`, OAuth loopback com PKCE), Jira (`jiraApi.ts`, `jiraPlan.ts`, `jiraAdf.ts`,
  `jiraFields.ts`, `jira.ts`). Handlers que alteram tarefas chamam `autoSyncTask(id)`, que dispara
  Notion e Google.
- **MCP** — `src/main/mcp/`: HTTP em loopback com token Bearer, ferramentas finas sobre
  `database.ts`, guard de confirmação em duas fases. Veja [Servidor MCP](../mcp-server.md).
- **Backup** — `backup.ts` + `backupPlan.ts`; formato compartilhado com
  `scripts/ticktask-backup.sh`.

## Identificadores que não mudam

O rebrand para CrafyTask foi só visual. Estes nomes continuam os do TickTask porque mudá-los
quebraria dados ou integrações de quem já usa o app: pasta de dados (`ticktask`, `ticktask-dev`),
`ticktask.db`, `TICKTASK_USER_DATA`, `ticktask-asset://`, o pacote/executável `ticktask`,
`scripts/ticktask-backup.sh`, a agenda "TickTask" no Google, "GTD APP" e "Cadernos TickTask" no
Notion, o nome `ticktask` do servidor MCP e o `app: 'TickTask'` do `server_info`. Também ficam as
chaves de `localStorage` com prefixo `ticktask`.
