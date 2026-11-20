# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

CrafyTask (antigo TickTask) is an Electron desktop app for personal task and time tracking, organized around GTD (Getting Things Done) concepts: an inbox, contexts, projects, areas, goals/horizons, weekly reviews, plus time tracking, recurring tasks, subtasks, and task dependencies. Local-first with SQLite; optional one-way+ sync to Notion. UI strings, task statuses, and categories are in Portuguese (e.g. status `inbox`/`aguardando`/`proximas`/`executando`/`finalizada`/`someday`).

## Rebrand: só visual

O nome visível é **CrafyTask** (título das janelas, sidebar, bandeja, autostart, notificações,
textos de Configurações, nome do atalho no menu do Linux e dos pacotes `crafytask-<versão>.*`). A
logo é só texto, na fonte **Denk One** (`@fontsource/denk-one`, empacotada — o app é offline e a CSP
não deixa buscar fonte remota), classes `font-brand` e `text-brand` (`#705EFF`) em `main.css`.

Por compatibilidade com instalações e dados existentes, **não renomeie**: `name: ticktask` (define a
pasta de dados `~/.config/ticktask` e o pacote deb que faz upgrade do antigo) e `productName: "TickTask
App"` (`/opt/TickTask App` e o perfil AppArmor), `app.setName('TickTask App')`,
`appId`/`AppUserModelId` `com.ticktask.app`, `ticktask.db`, `ticktask-dev`, `TICKTASK_USER_DATA`,
`ticktask-asset://`, `scripts/ticktask-backup.sh`, a agenda "TickTask" do Google e a descrição
`TickTask #id` dos eventos, a raiz "Cadernos TickTask" e o banco "GTD APP" do Notion.
Identificadores de código também ficam como estão. O servidor MCP, ao contrário, já se chama
`crafytask` (nome no `McpServer`, no comando de registro e no `server_info`): é o nome que o usuário
fala com o assistente, e o antigo `ticktask` confundia.

## Where the docs are

- **Site MkDocs** (`mkdocs.yml`, `docs/`) — publicado em https://uesleinasch.github.io/crafytask/ :
  instalação, tutoriais, integrações, comandos, desenvolvimento e uma página por release em
  `docs/releases/`. Validar com `uvx --with mkdocs-material mkdocs build --strict -d /tmp/site`.

- **`docs/ui/`** — screen-by-screen map of the interface (written in pt-BR): every route, region and
  interactive element, plus the component library, the real design tokens and a catalogue of
  inconsistencies. Start at `docs/ui/README.md`. **Read the relevant screen doc before touching a
  page** — it records behaviour that isn't obvious from the JSX (persisted preferences, why the float
  appears, which colors disagree with which).
- **Design review is mandatory.** Every change to a screen, visual component, theme, tokens or
  design docs loads the project skill `design-crafytask` before starting and runs the project
  agent `design-reviewer` (`.claude/agents/`) on the branch diff before opening the PR; fix what it
  reports or write down why not in the PR. A prototype feature that doesn't exist in the code and
  has no subtask becomes a new subtask of CrafyTask #745 (the visual refactor epic).
- **`docs/design/`** — the **target** interface of the visual refactor to Ant Design (pt-BR):
  `guia-de-design.md` (rules), `plano-de-refatoracao.md` (phases F0–F9, one subtask per PR, where the
  code lives), `prototipo/index.html` (the prototype the user approved) and `prototipo/checklist.json`,
  audited by `npm run design:audit`. Before touching any screen, load the project skill
  `design-crafytask` (`.claude/skills/`); it lists the sources of truth and the checks.
- **`docs/mcp-server.md`** — embedded MCP server: tool list and known limitations.
- **`ui-ux/`** — original design system and mockups; see the caveat under **Conventions**.

## Commands

```bash
npm run dev          # Run app with hot reload (electron-vite), com ELECTRON_DISABLE_SANDBOX=1
npm run build        # typecheck (node + web) then build to out/
npm run typecheck    # tsc for both tsconfig.node.json and tsconfig.web.json
npm run lint         # eslint --cache
npm run format       # prettier --write
npm run start        # preview a built app
npm run test         # vitest run (config em vitest.config.ts, environment node)
npm run test:watch   # vitest in watch mode
npm run build:linux  # package AppImage + .deb (Linux é o único alvo)
npm run build:unpack # build + electron-builder --dir (no installer)
```

`dev` e `start` (app não empacotado) usam uma pasta de dados própria — `<appData>/ticktask-dev`
(no Linux, `~/.config/ticktask-dev`) — em vez da do app instalado: banco vazio, e o dev roda ao lado
da instância instalada, já que a trava de instância única é por pasta. `TICKTASK_USER_DATA=<pasta>`
troca a pasta em qualquer build (`devUserData.ts`, aplicado no topo de `index.ts`, antes da trava).
Não copie `notion-config.json` nem `mcp-config.json` para a pasta de dev: o dev escreveria no mesmo
Notion e disputaria a porta do MCP.

Single test file / single case:

```bash
npx vitest run src/main/taskQuery.test.ts
npx vitest run src/main/taskQuery.test.ts -t "nome do caso"
npm run typecheck:node   # or typecheck:web — narrow the tsc run while iterating
```

Tests run on **vitest** (`vitest.config.ts`, `environment: 'node'`, include `src/**/*.test.ts`) and
cover the pure modules — query building (`taskQuery`), tag merge/rename (`tagQueries`),
ProseMirror↔Markdown (`notesMarkdown`), ProseMirror→Notion blocks (`notionBlocks`), note
format/layout math, the auxiliary-window guard (`timerWindow`), the Google Calendar plan/API/OAuth
modules, backup planning, due-date notices and most of `src/main/mcp/`. Anything that imports
`electron` or `better-sqlite3` is not testable as-is; extract the logic into a pure module next to
it (as `src/main/taskQuery.ts` does for `database.ts`, or `tagQueries.ts` does by taking an
injected `SqliteLike`) and test that.

`build` (and `dist`/`build:unpack`) runs `typecheck` first, so a type error fails it —
but `build:linux` calls `electron-vite build` directly and skips it. After meaningful changes run `npm run typecheck && npm run lint` to validate.

`npm run lint` reports pre-existing prettier warnings across the repo. Do **not** run
`prettier --write` on a whole legacy file to silence them — it rewrites hundreds of untouched lines
and buries the real diff. Format only the files you created.

## Architecture

Standard electron-vite three-context layout. Understanding the **data round-trip** matters more than any single file:

```
renderer (React)  →  preload (window.api)  →  main (ipcMain.handle)  →  database.ts (SQLite)
   src/renderer/src      src/preload/index.ts      src/main/index.ts        src/main/database.ts
```

- **src/main/** — Node side. `index.ts` (windows, lifecycle, ~130 `ipcMain.handle` registrations in `setupIpcHandlers()`, global shortcut, PDF export via `webContents.printToPDF`). `database.ts` owns the schema + every query as an exported function. `notion.ts` is the Notion client/sync. Around it sit the pure/leaf modules: `taskQuery.ts` (WHERE/ORDER builder), `tagQueries.ts` (tag CRUD/merge over an injected `SqliteLike`), `notesMarkdown.ts` (ProseMirror JSON ↔ Markdown), `notionBlocks.ts` (ProseMirror → Notion blocks), `notionFileUpload.ts` (image upload to Notion), `notesAssets.ts` (local image store + `ticktask-asset://` protocol), `localExport.ts` (task → Markdown file with YAML frontmatter + copied assets).
- **src/preload/index.ts** — exposes a single `api` object on `window.api` via `contextBridge` (and `@electron-toolkit/preload`'s `electron`). Every method is a thin `ipcRenderer.invoke('domain:action', …)` wrapper. `index.d.ts` types `window.api` for the renderer.
- **src/renderer/src/** — React 19 app. `main.tsx` → `App.tsx` (uses **`HashRouter`** — required because Electron loads the renderer over `file://`). Pages in `pages/`, reusable components in `components/` (shadcn/Radix primitives under `components/ui/`), data-fetching logic in `hooks/` (one hook per domain: `useTasks`, `useProjects`, `useLabels`, `useCalendar`, `useWeeklyReview`, `useTaskDetail`, `useTimer`, `useNotification`, plus the UI-only `useIncrementalList` — IntersectionObserver paging of an already-loaded array — and `usePersistedState` for view preferences), Zustand `stores/timerStore.ts` for the live timer.
- **src/shared/types.ts** — the single source of truth for domain types (`Task`, `Project`, `Context`, `Area`, `Goal`, `TimeBlock`, `WeeklyReview`, the `Create*/Update*Input` variants, and the status/category/energy unions). Imported by all three contexts.

### IPC conventions

- Channels are named `domain:action` — e.g. `task:create`, `project:getTasks`, `schedule:getWeekly`, `notion:syncAllTasks`, `timeBlock:getForMonth`, `stats:period`. Adding a backend capability almost always means adding a matching channel in all three places.
- Renderer→main is request/response via `invoke`/`handle`. Main→renderer pushes are **events** sent with `webContents.send`: `tasks:refresh`, `float:update`, `float:clear`, `timer:stopped`, `task:unblocked`, and `notion:syncStart`/`syncSuccess`/`syncError`. The renderer subscribes via `window.api.on*` listeners (e.g. the shell's `StatusBar`, which turns the Notion/Jira/Google sync events into per-integration state, and the float timer).
- Task mutation handlers in `index.ts` call `autoSyncToNotion(...)` after the DB write when Notion auto-sync is enabled — keep that side effect in mind when touching task handlers.

### Adding a feature (the cross-cutting path)

A typical new capability touches, in order: `src/shared/types.ts` → a query fn in `src/main/database.ts` → an `ipcMain.handle('domain:action', …)` in `src/main/index.ts` (inside `setupIpcHandlers`) → a wrapper in `src/preload/index.ts` **and** its type in `index.d.ts` → a hook in `src/renderer/src/hooks/` → page/component + (if a new screen) a `<Route>` in `App.tsx`.

A **new screen** needs two more touches: its `<Route>` nested under `<AppShell>` in `App.tsx`
(`/float` and `/quick-capture` stay outside the shell), and an entry in
`components/shell/navigation.ts` (`NAV_GROUPS`/`NAV_FOOTER`, plus `navKeyFor`/`screenTitle` if the
route has an id) with its lucide icon in `SiderNav.tsx`. `AppShell` (antd `Layout`) renders the
sidebar, the header (screen title + "Nova tarefa") and the route inside a `RegionBoundary`, on every
route. The page itself must use `h-full`, never `h-screen`: the `Content` already subtracted the
header, and the extra height can be scrolled by a programmatic `scrollIntoView` (see
`docs/ui/02-detalhe-da-tarefa.md`).

## Database

- File: `app.getPath('userData')/ticktask.db` (em dev, `ticktask-dev/` — ver **Commands**). Opened with `journal_mode = WAL` and `foreign_keys = ON`. `initDatabase()` runs at startup.
- 17 tables: `tasks`, `time_entries`, `tags`, `task_tags`, `projects`, `contexts`, `task_contexts`, `weekly_reviews`, `task_dependencies`, `areas`, `goals`, `time_blocks`, `note_assets`, `notebooks`, `notebook_sections`, `notebook_pages`, `task_status_events`.
- **Migrations are imperative, inline in `initDatabase()`** — `CREATE TABLE IF NOT EXISTS` plus guarded `ALTER TABLE`s. Changing a `CHECK` constraint requires the create-new-table-and-copy dance (see the `tasks_new` rebuild around `src/main/database.ts:375`, used to widen the task `status` CHECK). There is no migration framework — follow the existing pattern.
- All queries use better-sqlite3 prepared statements; multi-step writes use `db.transaction(...)`.
- `tasks.status_changed_at` (when the status last changed, used by the health indicators in
  `healthQueries.ts`) is kept by two SQLite triggers, not by the handlers, so every writer (IPC, MCP,
  Jira import) is covered. Two more triggers append every status change (and the creation) to
  `task_status_events` (`from_status`, `to_status`, `changed_at`), the history behind the weekly
  Inbox rate; it only starts when the triggers are installed. A `tasks` rebuild drops triggers:
  `ensureStatusChangedAt` runs at the end of `initDatabase()` and recreates all four.
- Dashboard period stats (`stats:period`, `StatsPeriod` → `PeriodStats`) come from
  `statsQueries.ts` (pure, tested): sessions clipped to the period and to now, split per local day
  and hour, compared with the previous period of the same length, project filter in SQL.

### Task listings

- `listTasks(filters: TaskListFilters)` is the single listing entry point. **Filtering and sorting
  belong in SQL, never in the renderer** — the `WHERE` is assembled by `buildTaskListQuery` in
  `src/main/taskQuery.ts` (pure, unit-tested), which also accepts `limit`/`offset`.
- Listings project through `TASK_LIST_COLUMNS`, which **omits `notes`** (the Tiptap JSON) and
  truncates `description`. Anything needing the full body uses `getTask`, or `listTasksForSync` —
  the Notion sync serializes both fields whole.
- Never enrich rows one by one: `enrichTasks(rows)` resolves tags, contexts, subtask counts and
  `is_blocked` with four aggregate queries per batch.
- Screens that need a slice ask for that slice: `task:listRunning` (timer store),
  `task:listActiveLight` (task pickers), `schedule:getForDate` (today's tasks). Pulling the whole
  list to `Array.filter` it in the renderer is the pattern this replaced.

## Rich notes (Tiptap)

Each task carries a `notes` column holding **ProseMirror JSON** (migrated away from an earlier
Editor.js format). The editor lives in `src/renderer/src/components/editor/`: `TaskNotesEditor.tsx`
mounts Tiptap with the extension set in `extensions.ts` (starter kit, tables, highlight, images,
file handler, drag handle, mention), plus a slash menu (`slash/`), `@` mentions of other tasks
(`mention/`, backed by `notes:searchMentions`), a bubble toolbar, and `FocusOverlay` for the
task detail's focus mode. `notesFormat.ts` holds the pure bits and is unit-tested.

The JSON is converted, never stored twice: `notesMarkdown.ts` for Markdown (local export),
`notionBlocks.ts` for Notion blocks. Pasted/dropped images go through `notesAssets.ts` — bytes land
in `userData/notes-assets`, a row in `note_assets`, and the document references them by the
privileged `ticktask-asset://` scheme registered in `index.ts` (`registerSchemesAsPrivileged` at
module scope, `registerAssetProtocol()` after `app.whenReady`). Pushing the same note to Notion
re-uploads those bytes via `notionFileUpload.ts`; `@notionhq/client` is pinned to v4 because the
upload API differs across majors.

## Desenho por task (Excalidraw)

Cada task tem um desenho, na aba **Desenho** do mesmo painel das notas. O JSON do Excalidraw vive
na coluna `drawing` de `tasks`; o PNG derivado vai para `userData/drawings/<taskId>.png`, gravado
no mesmo IPC (`drawing:save`) que grava o JSON — MCP, Notion e export local leem esse PNG, então
as duas escritas não podem divergir. O editor (`components/editor/TaskDrawingEditor.tsx`) é
carregado com `React.lazy`: o pacote é grande e só a aba de desenho paga por ele.

As fontes do Excalidraw são servidas pelo protocolo `ticktask-asset://` (host `excalidraw`), não
por `file://` — o renderer roda em origem opaca em produção e o Chromium recusa carregar fontes
dali. A CSP em `src/renderer/index.html` precisa listar o esquema em `font-src` e `img-src`.

## Cadernos

Tela `/notebooks`: Caderno → Seção → Página (até 2 níveis de subpágina), cada página com as abas
Notas e Desenho da task. Decisões em `docs/adr/0001-cadernos.md`; tela em `docs/ui/17-cadernos.md`.

- Schema e queries em `notebookQueries.ts` (puro, `SqliteLike`, testado), chamado de
  `initDatabase()` por `ensureNotebookSchema`. Regras de árvore em `src/shared/notebookTree.ts`,
  usadas pelo renderer e revalidadas no main. IPC em `notebookIpc.ts` (`notebook:*`, `section:*`,
  `page:*`); mutações de estrutura emitem `notebooks:refresh`.
- Notas, imagens e desenho têm um **dono** (`NotesOwner = { kind: 'task' | 'page', id }`), não um
  `taskId`. Os editores recebem `owner`; `components/editor/notesOwner.ts` escolhe o canal.
  `note_assets` tem `task_id` **ou** `page_id` (CHECK); o PNG de página fica em
  `drawings/pages/<id>.png`. Código novo que grava nota/imagem/desenho deve receber o dono.
- Notion: hierarquia de páginas sob a raiz "Cadernos TickTask" (`notionNotebooks.ts`; decisões puras
  em `notionNotebookPlan.ts`). Tudo passa por uma fila única com debounce (`debouncedSerialQueue.ts`)
  em `notebookIpc.ts` — em paralelo, duas páginas criariam a mesma seção duas vezes. O SDK v4 não
  move página: pai diferente = arquivar e recriar. `replacePageBody` (em `notion.ts`) reescreve o
  corpo de task e de página e preserva blocos `child_page`.
- `notebookService.ts` concentra o que IPC e MCP compartilham: refresh, fila do Notion, exclusão
  (apaga PNGs e arquiva no Notion). Escrita nova em caderno passa por ele, não direto pela query.
- Busca em SQL sobre `notebook_pages.search_text` (texto puro derivado do JSON em
  `updatePageNotes`, via `notesPlainText.ts`). A menção `@` sugere páginas; clicar numa menção abre
  task, projeto ou `/notebooks?page=<id>` (`mention/mentionRoute.ts`).
- MCP em `mcp/tools/notebooks.ts`; export local em `notebookExport.ts` (+ `notebookExportPlan.ts`,
  puro), reaproveitando `copyNoteAssets`/`writeDrawingFiles` de `localExport.ts`.
- `notion.ts` não pode chamar `app.getPath` no escopo do módulo: as tools do MCP o importam e o
  `transport.test.ts` carrega todas elas sob o Node puro.

## Terminal embutido

Cada task pode ter `working_dir` e `start_command` (colunas locais: não vão ao Notion nem ao Jira); sem
`working_dir`, a task herda `projects.working_dir` (`effectiveWorkingDir` em `shared/workingDir.ts`). O
painel (`components/terminal/`, montado em `App.tsx`) usa `@xterm/xterm`; o PTY é `node-pty`, só no
main. `terminalSessions.ts` é puro e testado (sessões, ring buffer de ~200 KB, coalescência de
output a cada 10 ms, `seq` por envio para o replay não duplicar); `terminal.ts` é o lado Electron e
importa `node-pty` sob demanda, para um binário com ABI errada degradar só o painel. As sessões
morrem no `before-quit` e quando o dono é apagado. A sessão tem um dono (`TerminalOwner`: task ou
projeto; a de projeto abre em `projects.working_dir`, pelo botão no cabeçalho do projeto):
`task:delete`, `task:bulkDelete` e o `delete_tasks` do MCP (`afterTasksDeleted`) chamam
`disposeTerminalsForTasks`; `project:delete` e o `manage_structure` do MCP (`afterProjectDeleted`)
chamam `disposeTerminalsForProjects`. Shell e "timer no
primeiro comando" ficam em `localStorage`. Ver `docs/ui/16-terminal.md`.

## Notion sync (src/main/notion.ts)

Config (API key, target page/database id, auto-sync flag) is persisted to `app.getPath('userData')/notion-config.json`, not the DB. On first sync the app provisions a "GTD APP" Notion database and maps local task fields to Notion properties (names are Portuguese: Nome, Status, etc.), translating the local status union to Notion status options. Sync progress is surfaced to the UI through the `notion:sync*` events above.

## Google Calendar sync

Opt-in por task (`tasks.gcal_sync`), só TickTask → Google, numa agenda secundária "TickTask" criada
pelo app com o escopo `calendar.app.created`. Time blocks viram eventos com hora; `scheduled_date` e
`due_date` viram eventos de dia inteiro; task finalizada ganha `✓ ` no título.

Não há tabela de vínculo: cada evento tem ID determinístico (`tick{taskId}b{blockId}`,
`tick{taskId}s`, `tick{taskId}d`) e `extendedProperties.private.taskId`. Com horário na task
(`scheduled_time`/`scheduled_end_time`, `due_time` — colunas `HH:MM` separadas das datas, regras em
`src/shared/taskTime.ts`), `s` e `d` viram eventos com hora em vez de dia inteiro. Sincronizar uma task é
recalcular o conjunto desejado (`gcalPlan.ts`, puro), listar o que existe no Google por essa
propriedade e aplicar a diferença (`googleCalendarApi.ts`, `fetch` injetado). Task apagada ou
desmarcada = conjunto vazio = eventos apagados. `gcalSyncQueue.ts` serializa por task.

`googleCalendar.ts` é o lado Electron: `userData/gcal-config.json` (refresh token via
`safeStorage`), OAuth loopback + PKCE (`googleOAuth.ts`). Em `index.ts`, `autoSyncTask(id)` dispara
Notion e Google; o Google só age em tasks com `gcal_sync = 1`, então **caminhos de exclusão filtram
os ids com `filterGcalSyncedIds` antes de apagar** e chamam `pushToGoogle` depois. Handlers de time
block também sincronizam. No MCP, use `afterCalendarChange(ids)`.

## Jira

Jira Cloud com e-mail + API token (Basic auth). Mesmo desenho do Google: `jiraApi.ts` (REST puro,
`fetch` injetado), `jiraPlan.ts` (mapeamento inicial, diff de importação e plano da descrição),
`jiraAdf.ts` (ADF ↔ ProseMirror), `jiraFields.ts` (editmeta → campos editáveis e valor do PUT) —
todos puros e testados — e `jira.ts` (lado Electron: `userData/jira-config.json`, token via
`safeStorage`, importação, transições, campos, envio da descrição e agendador).

- A importação traz as issues atribuídas ao usuário nos boards escolhidos e faz upsert por
  `tasks.jira_key` (índice único). Ela escreve direto no banco, sem passar pelos handlers `task:*`.
- **Status do Jira e status da task são independentes.** O mapeamento só escolhe o status inicial
  de task nova; depois a importação atualiza só `tasks.jira_status` (e `tasks.jira_space`, o nome do
  espaço/projeto da issue). `spaceProjects` (config) leva cada espaço a um projeto local: vale para
  task nova e para task vinculada ainda sem projeto. O status no Jira muda apenas
  pelo seletor de transições (`jira:transition`), nunca ao mover a task no TickTask.
- A importação também grava o tipo da issue (`jira_issue_type`, e a classe em `jira_issue_kind`:
  epic/story/task/bug/subtask) e a issue pai (`jira_parent_key`/`jira_parent_summary`). A
  hierarquia do Jira **não** vira subtarefa local (`parent_task_id`): isso tiraria a issue da lista e
  a apagaria junto com o pai. O agrupamento "Pai Jira" da listagem (`lib/taskGrouping.ts`) cobre isso.
- **Worklog** (opt-in, `worklogSince` na config): `autoSyncTask` chama `scheduleJiraWorklogPush`,
  que envia cada sessão de tempo encerrada (≥ 1 min, posterior a ligar) e guarda o id em
  `time_entries.jira_worklog_id` — a coluna é o que impede envio duplo. `task:reset` captura esses
  ids **antes** de apagar as sessões e depois os apaga no Jira (`captureJiraWorklogs` →
  `deleteJiraWorklogs`). Editar ou excluir uma sessão (`timeEntry:update`/`timeEntry:delete`,
  `timeEntryQueries.ts`) atualiza ou apaga o worklog dela (`syncEditedTimeEntry`/
  `syncDeletedTimeEntry`). Regras puras em `jiraWorklog.ts`.
- O painel lateral (`components/jira/JiraFieldsSheet.tsx`) lê `issue?expand=editmeta` e grava cada
  campo com PUT na issue (`jira:updateField`). Depois de transição ou edição, a task é relida do
  Jira (nome, prazo, status Jira).
- **Descrição ↔ notas**: a importação converte a descrição (ADF) em notas Tiptap; salvar as notas
  envia de volta (`scheduleJiraDescriptionPush`, com debounce, chamado por `task:updateNotes` e por
  `autoSyncTask`, então cobre o MCP). `jira_desc_hash`/`jira_notes_hash` guardam o último estado
  sincronizado dos dois lados e evitam laço. Se a descrição mudou no Jira, ela vence. Imagens do
  Jira viram o marcador `🖼 jira-media:<id>` nas notas e voltam como o nó original no envio;
  imagens locais não vão ao Jira.
- Tasks com `jira_key` só vão ao Notion com o opt-in ligado: todo caminho que sincroniza com o
  Notion filtra com `jiraNotionFilter()`.
- `jira-config.json` fica fora do backup pelo mesmo motivo do `gcal-config.json`.

`tasks.external_url` é o link externo genérico da task (as importadas recebem o da issue). Abrir no
navegador passa por `app:openExternal`, que só aceita `http(s)` (`shared/externalUrl.ts`).

## Backup e restauração

`src/main/backup.ts` (lado Electron) + `backupPlan.ts` (puro, testado), expostos em Configurações →
Backup. Um snapshot é uma pasta `AAAA-MM-DD_HHMMSS/` com `ticktask.db` (via `db.backup()`),
`notes-assets/`, `drawings/`, as configs do Notion e do MCP e um `MANIFEST.txt`. O formato é
compartilhado com `scripts/ticktask-backup.sh`, que faz backup e restauração sem o app — mudar
nomes ou rótulos do manifest exige mudar os dois. Restaurar fecha o banco, guarda os dados atuais
em `userData/pre-restore-*/` e reinicia o app. `gcal-config.json` fica de fora de propósito: o
token é cifrado com `safeStorage` e não abre em outra máquina.

## MCP server

Lives in `src/main/mcp/`, embedded in the main process. It speaks MCP over HTTP on loopback
(`127.0.0.1`), authenticated with a Bearer token, toggled from Settings. Tools are thin adapters
reusing `database.ts` directly — task-write tools call `afterTaskWrite(id)`, non-task-specific
writes call `broadcastRefresh()`. Destructive or bulk operations go through the two-phase
confirmation guard in `confirmGuard.ts` (preview + `confirm_token`, then repeat the call). See
`docs/mcp-server.md` for the tool list and known limitations.

## Windows & shortcuts

`index.ts` manages three `BrowserWindow`s: `mainWindow`, an always-on-top `floatWindow` (the floating timer, route `/float`), and `quickCaptureWindow` (route `/quick-capture`). Global shortcut **`CommandOrControl+Shift+Space`** toggles quick capture. The float and quick-capture windows are `frame: false`; the main window keeps its OS frame with `autoHideMenuBar` and renders its own in-app `TitleBar`. The `window:minimize`/`maximize`/`close` channels exist in the preload but no button in the current UI is wired to them.

The float is driven by `mainWindow` events, not by the renderer: `minimize` **and `close`** show it
**only when a timer is running**, `restore` and `focus` hide it. Its size is derived from the timer
count (`FLOAT_WIDTH = 300`, 44px per row, max 5 rows) and only re-set when that count changes.
A due-date notification sweep (`startNotificationScheduler`) runs every minute from the main process; which notices fire (day-of, eve, 15 min before and at `due_time`) is decided by the pure `dueNotifications.ts`.

Closing the main window **hides** it — the app lives on in a tray icon (`src/main/tray.ts`: Abrir
CrafyTask / Captura rápida / Sair); only "Sair" actually quits. Autostart is toggled from Settings
(`app:getAutostart` / `app:setAutostart`) and launches the app straight into the tray.

Falhas: `RegionBoundary` (`components/shell/`, sobre `react-error-boundary` + `Result` do antd)
isola regiões — raiz em `main.tsx`, rota atual em `App.tsx` com reset por `pathname + search`. Erro
assíncrono (IPC) chega ao boundary por `useErrorBoundary().showBoundary`. `createRoot` manda todo
erro ao main (`app:logRendererError`). `rendererGuard.ts` recarrega a janela cujo renderer morreu
(até 3 vezes por minuto, regra em `rendererRecovery.ts`), oferece recarregar quando ela trava e
avisa o renderer (`app:rendererRecovered`).

All three windows load the **same renderer bundle**, so anything that runs at module scope runs
three times. `stores/timerWindow.ts` (`shouldBootstrapTimerStore`) is the guard: the auxiliary
routes must not boot their own copy of the timer store, or each window fights over the float. Keep
new global side effects behind the same check.

## Path aliases

Defined in `electron.vite.config.ts` and the tsconfigs:

- `@shared/*` → `src/shared/*` (available in main, preload, and renderer)
- `@renderer/*` → `src/renderer/src/*` (renderer only)

## Conventions

- Pages: `*Page.tsx`; hooks: `useX.ts`; stores: `xStore.ts`. shadcn config in `components.json` (new-york style, lucide icons, `@renderer/components/ui`).
- No global app store beyond the timer — screen data is fetched on demand inside hooks via `window.api`; cross-screen freshness comes from the `tasks:refresh` event, not shared state.
- Visual language: new UI work follows **`docs/design/guia-de-design.md`** and the prototype (skill
  `design-crafytask`); no new hex or Tailwind color classes. **`docs/ui/14-design-tokens.md` describes
  what the legacy code actually uses** — read it to understand a screen before migrating it, not as
  the target.
  `ui-ux/TickTask - Design System & Guia de Estilo.md` is the original intent and is partly stale
  (it prescribes `rounded-xl` + shadows; the app moved to `rounded-sm` and dropped `shadow-sm`).
  Gotcha: `--radius: 0.75rem` makes `rounded-sm` resolve to **8px**, not Tailwind's 2px.
  Fonts are Geist and Geist Mono from `@fontsource-variable/*` (`--font-sans`/`--font-mono`).
  `main.css` declares `@layer theme, base, antd, components, utilities` and `main.tsx` wraps the app
  in `StyleProvider layer`, so antd styles sit in their own layer above Tailwind's preflight.
- New colors live in `src/renderer/src/theme/`: `tokens.ts` (palette + antd seed tokens) and
  `semantic.ts` (status, category, time leak, energy, charts, horizons), with a WCAG contrast test.
  `ThemeProvider` (mounted in `main.tsx`) wraps the app in antd's `ConfigProvider` + `App`, built by
  `buildTheme(mode, density)`. Preferences `ticktask:theme` (default `system`; Settings →
  Aparência, the header's appearance menu and the command palette) and `ticktask:density` live in `localStorage`; the main window sends the theme to
  `app:setThemeSource` (`nativeTheme.themeSource`). Use `App.useApp()` for message/modal.
  Status, category and energy render through `components/chips/` (`StatusChip`, `CategoryChip`,
  `EnergyMeter`: icon + text, never color alone). `CalendarPage` still keeps local color copies
  that **disagree** — check `docs/ui/14-design-tokens.md` until it migrates. The dashboard
  (`components/dashboard/`) draws bars, columns and heatmaps in HTML with `CHART_COLORS`.
- Carried over from `.github/copilot-instructions.md`: change only what the task requires, keep the
  code simple over clever, and reserve inline comments for genuinely non-obvious constraints.

## Release

Só Linux: `.deb` e `AppImage` (`electron-builder.yml` não tem mais alvo Windows/macOS). Entrega
por tag (`.github/workflows/release.yml`): uma tag anotada `vX.Y.Z` que esteja em `production`
roda o CI, gera os pacotes no ubuntu, atesta a proveniência e publica a GitHub Release.

- O título da release é **sempre a tag** (`vX.Y.Z`), nunca nome de branch ou de commit.
- O corpo vem de `docs/releases/vX.Y.Z.md` (tudo depois do `# vX.Y.Z`), mais a tabela de
  downloads e o changelog do `git-cliff` (`cliff.toml`), que o workflow acrescenta. O workflow
  **falha** se a página da versão não existir no commit da tag. Essa página é Markdown que o GitHub
  entende: sem admonitions, abas ou links relativos.
- A versão vem da tag (`npm version <tag> --no-git-tag-version` no CI): **não mude
  `package.json` à mão**. A próxima versão sai dos Conventional Commits: `git cliff --bumped-version`.
- `docs.yml` publica o site MkDocs (`mkdocs.yml`, `docs/`, `requirements-docs.txt`) no GitHub Pages
  a cada push em `production` que mexa na documentação. `ci.yml` (typecheck, testes e
  `mkdocs build --strict`) roda em todo PR. `pr-checks.yml` valida origem × destino, título do PR e
  ausência de coautoria de IA.

## Git Context

Release branch strategy com duas branches fixas. **O agente executa o fluxo inteiro com `git` e
`gh`**, inclusive merge em `production` e tag de release.

- `production`: branch padrão. Todo trabalho sai dela e volta para ela por PR (squash).
- `main`: espelho estável. Só recebe PR `production → main` (merge commit) depois de uma release.
  O agente abre esse PR e **para**: o usuário aprova e faz o merge.
- Nunca commitar direto em `main` ou `production` (o hook `pre-commit` recusa).
- Nomes de branch seguem https://conventionalbranch.org: `feature/`, `bugfix/`, `hotfix/`,
  `chore/` + descrição em minúsculas, números e hífens (ex.: `feature/issue-42-export-csv`);
  `release/vX.Y.Z` para preparar uma versão. Ponto só na versão do release.
- Commits granulares em Conventional Commits 1.0.0: `<tipo>(escopo)!: descrição` imperativa,
  minúscula, sem ponto final. Tipos: feat, fix, perf, refactor, docs, test, build, ci, style, chore,
  revert. O título do PR vira o commit em `production`, então segue o mesmo formato.
- **Sem coautoria de IA**: nenhum trailer `Co-Authored-By` de Claude/IA nem "Generated with Claude
  Code" em commit ou descrição de PR (o squash copia o corpo). Os hooks em `.githooks/`
  (`commit-msg`, `pre-push`) e o `pr-checks.yml` recusam. Os hooks são ativados pelo script
  `prepare` do `npm install` (`core.hooksPath=.githooks`); num clone novo rode `npm install` ou
  `git config core.hooksPath .githooks`.

### Fluxo de uma task

```bash
git switch production && git pull --ff-only
git switch -c feature/<descricao>
# ... commits em Conventional Commits ...
git push -u origin feature/<descricao>
gh pr create --base production --title "feat(escopo): descrição" --body "..."
gh pr checks --watch
gh pr merge --squash --delete-branch
```

O GitHub não deixa o autor aprovar o próprio PR, e o agente usa a conta do usuário; por isso a
regra de `production` exige PR e checks verdes, sem aprovação obrigatória. "Aprovar" aqui é
conferir os checks antes do merge.

### Fluxo de release

```bash
git switch production && git pull --ff-only
V=$(git cliff --bumped-version)            # ex.: v3.16.0
git switch -c release/$V
# criar docs/releases/$V.md (modelo: a página da versão anterior) e listar em docs/releases/index.md e no nav do mkdocs.yml
git commit -m "docs(release): adiciona notas da $V"
git push -u origin release/$V
gh pr create --base production --title "docs(release): notas da $V" --body "..."
gh pr checks --watch && gh pr merge --squash --delete-branch
git switch production && git pull --ff-only
git tag -a "$V" -m "$V" && git push origin "$V"
gh run watch "$(gh run list --workflow release.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
gh pr create --base main --head production --title "chore(release): leva $V para main" --body "..."
# parar aqui: o usuário aprova e faz o merge do PR para main
```

- Nunca `git push --force` (use `--force-with-lease` só em branch de trabalho), nunca `--all`,
  `--mirror`, `--tags`. Nunca mover nem apagar tag `v*` publicada. Não desabilitar rulesets ou
  checks para destravar algo.

<!-- rtk-instructions v2 -->

# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:

```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)

```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (60-99% savings)

```bash
rtk cargo test          # Cargo test failures only (90%)
rtk go test             # Go test failures only (90%)
rtk jest                # Jest failures only (99.5%)
rtk vitest              # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk pytest              # Python test failures only (90%)
rtk rake test           # Ruby test failures only (90%)
rtk rspec               # RSpec test failures only (60%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)

```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)

```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)

```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)

```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%). Format flags (-c, -l, -L, -o, -Z) run raw.
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)

```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)

```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)

```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands

```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category         | Commands                       | Typical Savings |
| ---------------- | ------------------------------ | --------------- |
| Tests            | vitest, playwright, cargo test | 90-99%          |
| Build            | next, tsc, lint, prettier      | 70-87%          |
| Git              | status, log, diff, add, commit | 59-80%          |
| GitHub           | gh pr, gh run, gh issue        | 26-87%          |
| Package Managers | pnpm, npm, npx                 | 70-90%          |
| Files            | ls, read, grep, find           | 60-75%          |
| Infrastructure   | docker, kubectl                | 85%             |
| Network          | curl, wget                     | 65-70%          |

Overall average: **60-90% token reduction** on common development operations.

<!-- /rtk-instructions -->

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
