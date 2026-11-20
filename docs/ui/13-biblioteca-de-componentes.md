# Biblioteca de componentes

Inventário do que é reutilizável no renderer. A base é o **Ant Design** (antd v6, tema em
`src/renderer/src/theme/`); por cima dele há os componentes próprios de `components/`, agrupados por
pasta, e o editor de notas. Componente de uma tela só fica de fora, salvo quando é o padrão que
outras telas devem copiar.

shadcn, Radix, `components/ui/`, `sonner`, `cn()`/`clsx`/`tailwind-merge` e
`class-variance-authority` saíram na F9-a. Código novo não volta a eles.

---

## Base: antd

Tudo que o antd resolve vem dele, configurado pelo `ThemeProvider` (`ConfigProvider` com locale
`pt_BR`, tema de `buildTheme` e `App` para `message`/`modal`/`notification`). A troca do legado para
o antd está no guia de design, §10.

| Necessidade | Componente antd | Onde é o padrão |
| --- | --- | --- |
| casca | `Layout`, `Menu`, `Drawer` | `AppShell`, `SiderNav` |
| abas de status | `Tabs` (com `Select` no estreito) | lista de tarefas, Projetos, Contextos e tags, inspetor |
| alternar visão | `Segmented` | Tabela/Cards/Kanban, período do dashboard, Notas/Desenho |
| listas densas | `Table` com `rowSelection` e `expandable` | `TaskTable`, `ProjectTable`, Arquivo |
| superfícies | `Card` | `TaskCard`, `ProjectCard`, cartões de Configurações, níveis de Horizontes |
| formulários | `Input`, `Select showSearch`, `DatePicker`, `TimePicker` | pílulas de propriedade, modais |
| diálogos | `Modal`, `modal.confirm`, `Popconfirm` | `NewTaskModal`, exclusões |
| menus | `Dropdown` (inclusive `trigger={['contextMenu']}`) | `TaskContextMenu`, `MenuRow` |
| progresso | `Progress` | subtarefas, projetos, plano do dia, revisão |
| vazio, erro, carga | `Empty`, `Result`, `Spin`, `Skeleton` | todas as telas; `Result` no `RegionBoundary` |
| feedback | `message` de `App.useApp()` | todas as ações; `notification` só no terminal |

Ícones são do `lucide-react` (16px com traço 1,75 na maior parte da interface), não os do antd.

---

## `components/chips/` — domínio GTD

| Componente | Para que serve | Onde é usado |
| --- | --- | --- |
| `StatusChip` | status da tarefa: ícone + rótulo, cores de `STATUS_COLORS` no tema atual, 22px de altura, raio 6 | tabela, cards, Hoje, Arquivo, dashboard, revisão, popover do calendário, relações, resumo do projeto |
| `CategoryChip` | categoria; "Normal" sem cor, só borda e texto secundário | tabela, cards, pílula Categoria, popover do calendário, dashboard |
| `ProjectStatusChip` | status do projeto, mesma gramática do `StatusChip` | `ProjectCard`, `ProjectTable` |
| `EnergyMeter` | três barras na cor primária (cheias = nível), tooltip "Energia alta/média/baixa" | tabela, pílula Energia, "A agendar" do calendário, dashboard |
| `LiveDot` | ponto verde que pulsa (`.ct-live`) para timer rodando; para com `prefers-reduced-motion` | pílula de timers, tabela, cards, detalhe, calendário, Horizontes, janela flutuante |

`statusMeta.ts`, `categoryMeta.ts` e `projectStatusMeta.ts` guardam ícone e rótulo de cada valor;
`chipStyle.ts` é o estilo comum dos chips.

## `components/shell/` — casca e peças gerais

| Componente | Para que serve | Onde é usado |
| --- | --- | --- |
| `AppShell` | `Layout` com sidebar, header, conteúdo, terminal e barra de status; um `RegionBoundary` por região | todas as rotas, menos `/float` e `/quick-capture` |
| `SiderNav` | logo, grupos de navegação e rodapé (itens em `navigation.ts`, contadores de `useNavCounts`) | `AppShell` (fixa ou em `Drawer`) |
| `ShellHeader` | título da tela, `HeaderCapture`, `RunningTimersPill`, Buscar, Aparência e Nova tarefa | `AppShell` |
| `HeaderCapture` | campo "Capturar para o Inbox…" do header | `ShellHeader` |
| `RunningTimersPill` | tempo do timer mais recente, contador e popover com todos | `ShellHeader` |
| `StatusBar` | faixa de 28px com Notion, Google Calendar, Jira e MCP (regras em `integrationStatus.ts`) | `AppShell` |
| `CommandPalette` | paleta `Ctrl+K`: ações, telas, tarefas, projetos e páginas (`paletteCommands.ts`) | `AppShell` |
| `PageContainer` | margens e largura máxima (1480px) da página; `fullWidth` e `padBlock` | todas as telas da sidebar e os detalhes |
| `RegionBoundary` | isola uma região: `Result` "Esta área falhou", Tentar de novo, Copiar detalhes | raiz, shell, rota, editores, terminal, dashboard, revisão, calendário, cadernos, Configurações |
| `SectionHeader`, `Section`, `Field` | rótulo de seção 11/600 em maiúsculas com linha até o fim e número em mono; `Section` junta cabeçalho e conteúdo; `Field` é a grade rótulo (92px) + valor | inspetor da tarefa, dashboard, revisão, Campos do Jira, Arquivo, novo bloco |
| `Kbd`, `KeyCombo` | tecla em mono (`.ct-kbd`) e combinação de teclas | captura rápida, Configurações (Geral, Terminal), rodapé do `NewTaskModal` |
| `MenuRow` | `<tr>` de `Table` com o menu da linha no botão direito (via `RowMenuContext`) | `TaskTable`, `ProjectTable`, Contextos e tags, Arquivo |
| `SimulatedCrash` | quebra uma região de propósito, pela paleta, para conferir o `RegionBoundary` | `AppShell` |

## `components/tasks/` — tarefa

| Componente | Onde aparece | Notas |
| --- | --- | --- |
| `TaskListView` | lista de tarefas e tarefas do projeto | abas, barra de ferramentas, filtros, visões e grupos; ver [01](01-lista-de-tarefas.md) |
| `TaskTable` | lista (tabela, com ou sem grupos) | `Table` do antd; colunas por breakpoint; subtarefas como linhas filhas; time leak em 3 níveis |
| `TaskCard`, `TaskCardViews` | lista (cards, grupos, Kanban) | `Card` do antd; grade `auto-fill` de 260px; Kanban em colunas de 260px |
| `GroupHeader`, `TaskActions`, `ProjectLabel`, `ContextsCell`, `JiraKey`, `WaitingForIcon` | tabela e cards | cabeçalho de grupo; Hoje, timer e `⋯`; ponto + nome do projeto; contextos; chave do Jira em mono; "aguardando o quê" |
| `TaskFilters` | lista | filtros em `Popover` (`Drawer` abaixo de `md`) |
| `TaskContextMenu` | botão direito e `⋯` em cards e linhas | `Dropdown`: abrir, timer, hoje, status, categoria, projeto, Jira, contextos, copiar, arquivar, excluir; age sobre a seleção |
| `BulkActionBar` sobre `FloatingActionBar` | lista e Arquivo, com seleção | barra flutuante de ações em massa |
| `NewTaskModal` | "Nova tarefa" do header, por cima de qualquer tela | `Modal` com as pílulas do detalhe |
| `propertyPills` (`PropPill` e as pílulas de Categoria, Projeto, Contextos, Prazo, Energia, Programado, Recorrência, Tags e Link) | detalhe (`TaskPropertyBar`), `NewTaskModal`, cabeçalho do projeto | cada pílula com `value`/`onChange` |
| `TaskHeader`, `TaskInspector`, `TaskDetailsPanel`, `TaskTimePanel`, `TaskRelationsPanel` | detalhe da tarefa | ver [02](02-detalhe-da-tarefa.md) |
| `TaskWorkspace` | detalhe da tarefa e página de caderno | abas Notas/Desenho, ações da nota e modo foco |
| `ArchivedTaskBanner` | tarefa arquivada aberta | faixa "Arquivada em … · só leitura" com Desarquivar |

## Outras pastas

| Componente | Para que serve | Onde é usado |
| --- | --- | --- |
| `SortableGroups` (`components/`) | grupos reordenáveis por arraste | cards agrupados e Kanban |
| `color/ColorSwatches` | seletor de cor de `USER_COLORS` (`radiogroup`, cor anunciada pelo nome; a cor atual fora da paleta vira mais uma opção) | rótulo, projeto (criar e cabeçalho), caderno e seção |
| `health/HealthCard`, `HealthGrid` | indicador de saúde clicável que abre a lista filtrada | dashboard (Agora) e entrada da revisão |
| `dashboard/ChartCard`, `HBarList` | cartão de gráfico com "Ver como tabela" e vazio; barras horizontais em HTML com `CHART_COLORS` | dashboard |
| `projects/ProjectCells` (`ProjectProgress`, `NextActionCell`, `ProjectDue`, `ProjectGroupHeader`, `ProjectTabLabel`) | peças comuns de cartão e linha de projeto | Projetos, Horizontes |
| `projects/ProjectCard`, `ProjectTable`, `ProjectHeader`, `NewProjectModal` | lista, detalhe e criação de projeto | Projetos, detalhe do projeto |
| `calendar/CalendarChip` | tarefa de dia inteiro (agendada ou prazo) | grade, Mês e Agenda do calendário |
| `labels/LabelMark` | marca de contexto (emoji) ou tag (cor) | Contextos e tags, modal de rótulo |
| `labels/LabelEditModal`, `LabelMergeModal` | criar, editar e mesclar contexto ou tag | Contextos e tags |
| `horizons/HorizonChip`, `AreaModal`, `GoalModal` | nível H0–H5 com `HORIZON_COLORS`; criar e editar área e meta | Horizontes |
| `notebooks/NameColorDialog` | nome e cor de caderno ou seção | Cadernos |
| `settings/SettingsLayout` (`SettingsCard`, `SettingRow`, `SettingsHeader`) | molde de toda seção de Configurações | Configurações |
| `settings/SetupGuide` (`GuideLink`, `GuideField`) | guia de conexão em `Steps` | Notion, Google Calendar |
| `jira/JiraStatusSelect`, `JiraFieldsSheet`, `JiraFieldEditor` | transição de status e campos do Jira | inspetor da tarefa |
| `terminal/TerminalTaskButton`, `TerminalProjectButton` | abre o terminal no diretório da tarefa ou do projeto | cabeçalho da tarefa e do projeto |

---

## Editor — `components/editor/`

| Arquivo | Papel |
| --- | --- |
| `NotesBody` (`NotesPanel.tsx`) | corpo das abas Notas/Desenho, cada editor num `RegionBoundary`; carrega o Excalidraw com `React.lazy`. A casca (abas, ações, Modo foco) é o `TaskWorkspace`, usado pela tarefa e pela página de caderno |
| `TaskNotesEditor` | monta o Tiptap; auto-save com debounce de 400ms; expõe `flushSave()` via ref |
| `extensions.ts` | conjunto de extensões: StarterKit, Highlight, TextStyle+FontSize, TaskList/TaskItem aninhável, Placeholder, TableKit redimensionável, SlashCommand, Mention, Image com `assetId`, FileHandler |
| `BubbleToolbar` | barra flutuante na seleção: negrito, itálico, tachado, código, marca-texto, tamanho da fonte (12–32px), link |
| `slash/SlashCommand` + `SlashMenu` | menu do `/` com 11 comandos; navegação por ↑↓ e Enter; máximo de 12 itens visíveis |
| `mention/mentionConfig` + `MentionList` | menções `@` a tarefas, projetos e contextos, com o tipo à direita de cada item |
| `TableContextMenu` | menu de botão direito: 10 operações de tabela dentro dela, "Inserir tabela" fora |
| `NotesActions` | botões "Salvar local" e "Salvar e sincronizar" |
| `FocusOverlay` | modo foco do `TaskWorkspace` (tarefa e página de caderno): camada fixa sobre o shell com barra de 48px (sair, nome, cronômetro e iniciar/pausar só na tarefa, Notas/Desenho, ações da nota); `Esc` sai |
| `TaskDrawingEditor` | Excalidraw em `pt-BR`; auto-save com debounce de 800ms; grava JSON + PNG derivado |
| `imageUpload` | seleção/colagem de imagem → `notesAssets` → `ticktask-asset://` |
| `suggestionPopup` | infraestrutura compartilhada dos popups de `/` e `@`; marca `[data-suggestion-popup]` para que o `Esc` da página não interfira; o popup roda numa raiz React própria e é anexado ao `[data-popup-root]` (o `Layout` do `AppShell`), ou ao `body` fora dele |
| `notesFormat.ts` | ProseMirror ↔ formato legado do Editor.js (unitário) |
| `drawingAssetPath.ts` | resolve as fontes do Excalidraw pelo esquema `ticktask-asset://` (host `excalidraw`) |

O terminal (`components/terminal/`) tem documento próprio: [16](16-terminal.md).

---

## Hooks de interface

| Hook | Função |
| --- | --- |
| `usePersistedState(chave, inicial)` | `useState` espelhado em `localStorage`; tolerante a falha de acesso |
| `useIncrementalList(itens, chaveDeReset, tamanho=60)` | renderização em lotes via `IntersectionObserver` com `rootMargin: 400px` |
| `useDebouncedValue(valor, ms)` | valor atrasado; a busca da lista espera 250 ms |
| `useLiveSeconds(tarefa)` | segundos da tarefa: os do timer rodando (`timerStore`) ou o `total_seconds` gravado |
| `useAuxWindow()` | marca o `body` das janelas auxiliares (`aux-window`, fundo transparente) |
| `useNotification()` | dispara notificação do sistema pelo IPC |
| `useThemeSettings()` (`theme/themeSettings.ts`) | tema, densidade e o modo resolvido (`light`/`dark`), com os setters |

## Estado do cronômetro — `stores/timerStore.ts` (Zustand)

Guarda um mapa `taskId → { task, entry, displaySeconds }`. A outra store do renderer é a do
terminal (`stores/terminalStore.ts`), com as sessões e o layout do painel.

- **Timers paralelos por padrão** — iniciar um não para os outros.
- Um único `setInterval` de 1s recalcula todos os cronômetros a partir do horário de início gravado
  (não por acumulação), e empurra o estado para a janela flutuante.
- **Alerta de Time leak:** para tarefas dessa categoria, a partir do nível laranja (padrão 1h)
  dispara notificação do sistema e repete no intervalo das preferências (padrão 5 minutos;
  `timeLeakNoticeStep` em `shared/workflowPrefs.ts`): *"A tarefa X já está em 1h23min. Considere finalizá-la!"*
- `syncWithDatabase()` reconstrói o estado a partir das tarefas com `is_running` — chamado no boot e
  ao entrar numa tarefa que está rodando.
- **Guarda de janela:** `shouldBootstrapTimerStore(hash)` impede que as janelas `/float` e
  `/quick-capture` iniciem sua própria cópia da store; sem isso, as três janelas disputariam o
  controle do float.

## Utilitários — `lib/`

| Função | Saída |
| --- | --- |
| `formatTime(segundos)` (`utils.ts`) | `HH:MM:SS`, sempre com duas casas e nunca negativo |
| `parseTimeInput('01:30:00')` | segundos |
| `formatDate` / `formatDateTime` | `dd/mm` e `dd/mm, HH:MM` em `pt-BR` |
| `calculateProgress(atual, limite)` | 0–100 |
| `inlineEditStyle()` (`inlineEdit.ts`) | estilo da edição no lugar (`Input` sem borda com 8px de respiro), guia §11 |
| `buildTaskGroups` (`taskGrouping.ts`), `applyGroupOrder` (`groupOrder.ts`) | grupos da lista e a ordem salva |
| `effectiveListView` (`taskListView.ts`) | visão real da lista: Kanban só em Executando (fora do projeto), cards no lugar da tabela abaixo de `md` |
| `useWorkflowPrefs` e afins (`workflowPrefs.ts`) | preferências de fluxo de trabalho no renderer |
| `requestNewTask()` (`newTaskRequest.ts`) | abre o `NewTaskModal` do shell de qualquer lugar |
