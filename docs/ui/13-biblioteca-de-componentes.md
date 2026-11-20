# Biblioteca de componentes

Inventário de tudo que é reutilizável em `src/renderer/src/components/`. Dividido em três camadas:
**primitivos** (shadcn/Radix), **componentes de domínio** e **editor**.

---

## Primitivos — `components/ui/`

Gerados pelo shadcn/ui (estilo *new-york*, ícones lucide, configuração em `components.json`).
Consomem os tokens CSS (`--primary`, `--border`, `--radius`…) definidos em `assets/main.css`.

| Componente | Uso no app |
| --- | --- |
| `button` | 6 variantes (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`) × 4 tamanhos (`default` h-9, `sm` h-8, `lg` h-10, `icon` 36px) |
| `input` · `textarea` | campos de formulário |
| `select` | seleção simples (Radix) — usado em status, categoria, recorrência, horizonte |
| `dialog` | diálogos de criação/edição |
| `alert-dialog` | confirmações destrutivas |
| `context-menu` | **importado por nenhuma tela** desde a F7-c: o menu de sessão do terminal e a lista de tarefas usam o `Dropdown` do antd |
| `card` | **importado por nenhuma tela** — todas escrevem `bg-white border border-slate-200 rounded-sm` na mão |
| `badge` | **importado por nenhuma tela** — status, categoria e energia usam os chips de `components/chips/` |
| `progress` | só em H1 dos horizontes. As outras seis barras de progresso do app são `<div>` com `width` inline |
| `scroll-area` | área rolável das sub-páginas |
| `tabs` | **importado por nenhuma tela** — todas as abas são botões manuais |
| `sonner` | toasts, ancorados em `bottom-right` |

> Três primitivos (`card`, `badge`, `tabs`) existem no repositório e **não são usados por nenhuma
> tela**: cada uma reimplementou o mesmo desenho à mão. Padronizá-los é o ganho mais barato de uma
> refatoração.

---

## Componentes de domínio

### Exibição de tarefa

| Componente | Onde aparece | Notas |
| --- | --- | --- |
| `tasks/TaskCard` | lista (modo cards), agrupado, Kanban | `Card` do antd; `#id`, nome, progresso de subtarefas, Hoje e `⋯`, linha de chips e tempo. Ver [01](01-lista-de-tarefas.md) |
| `tasks/TaskCardViews` | `TaskCardGrid`, `TaskCardGroups`, `TaskKanban` | grade `auto-fill` de 260px; grupos com `GroupHeader`; Kanban em colunas de 260px |
| `tasks/TaskTable` | lista (modo tabela, com ou sem agrupamento) | `Table` do antd; colunas por breakpoint; subtarefas como linhas filhas; cabeçalho de grupo; time leak em 3 níveis |
| `tasks/GroupHeader`, `TaskActions`, `ProjectLabel` | tabela e cards | cabeçalho de grupo; Hoje, timer e `⋯`; ponto + nome do projeto |
| `tasks/NewTaskModal` | botão Nova tarefa do header, por cima de qualquer tela | `Modal` do antd com as pílulas do detalhe; ver [01](01-lista-de-tarefas.md) |
| `tasks/propertyPills` | detalhe (`TaskPropertyBar`), modal Nova tarefa, cabeçalho do projeto (`PropPill`) | `PropPill` e as pílulas de Categoria, Projeto, Contextos, Prazo, Energia, Programado, Recorrência, Tags e Link, cada uma com `value`/`onChange` |
| `tasks/TaskContextMenu` | botão direito em `TaskCard` e nas linhas do `TaskTable`; `⋯` | `Dropdown` do antd: abrir, timer, hoje, status, categoria, projeto, Jira (abrir, transições, campos), contextos, copiar, arquivar, excluir; age sobre a seleção |
| `tasks/JiraKey` | tabela e cards | chave do Jira em mono discreto, tipo e status no tooltip |
| `tasks/BulkActionBar` | lista, com seleção | barra flutuante: marcar como, mover para projeto, hoje, arquivar, excluir |

### Badges e seletores

| Componente | Saída |
| --- | --- |
| `StatusChip` | `components/chips/`: ícone lucide + rótulo, cores de `theme/semantic.ts` nos dois temas, 22px de altura, raio 6 (substituiu o `StatusBadge`) |
| `CategoryChip` | idem para categoria; "Normal" sem cor, só borda e texto secundário (substituiu o `CategoryBadge`) |
| `EnergyMeter` | três barras na cor primária (cheias = nível), com tooltip "Energia alta/média/baixa"; substituiu o emoji ⚡🔋😴 |
| `DueDateBadge` | pílula com `Calendar` cujo rótulo e cor derivam da distância até o prazo — ver tabela abaixo |
| `ColorPicker` | 12 círculos de 32px a partir de `DEFAULT_COLORS`; selecionado com `ring-2 ring-offset-2 scale-110` |

#### Lógica do `DueDateBadge`

| Distância | Rótulo | Cor |
| --- | --- | --- |
| passado | "Atrasada" | vermelho |
| hoje | "Hoje" | vermelho |
| amanhã | "Amanhã" | amarelo |
| 2–3 dias | "2d" / "3d" | amarelo |
| 4+ dias | `dd/mm` | verde |

"Atrasada" e "Hoje" compartilham exatamente a mesma cor, o que impede distinguir urgência de atraso à
primeira vista.

### Entrada e relações

| Componente | Comportamento |
| --- | --- |
| `TimeEntryList` | sessões encerradas, `max-h-[250px]`, data à esquerda e `+ HH:MM:SS` à direita |

### Cronômetro

| Componente | Onde |
| --- | --- |
| `RunningTimersPill` | pílula no header do shell (substituiu o `FloatingTimer`); tempo do timer mais recente, contador e popover com todos, link e pausar; `compact` abaixo de `md` (sem contador) |

Os dois mostram a mesma informação em dois desenhos completamente diferentes, e o `FloatTimerPage` é
um terceiro.

### Sistema

| Componente | Detalhe |
| --- | --- |
| `TitleBar` | logo + 11 botões de navegação, **só na rota `/`** |
| `StatusBar` | barra de 28px no pé do shell com o estado de Notion, Google Calendar, Jira e MCP (substituiu o `SyncNotification`) |
| `Versions` | **componente morto** — mostra versões de Electron/Chrome/Node; não é importado por ninguém |
| `Timer` | **componente morto** — cronômetro completo substituído pela implementação inline da `SingleTaskPage` |

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
| `suggestionPopup` | infraestrutura compartilhada dos popups de `/` e `@`; marca `[data-suggestion-popup]` para que o `Esc` da página não interfira; o popup roda numa raiz React própria e é anexado ao `[data-popup-root]` (o `Layout` do `AppShell`) para herdar as variáveis CSS do antd |
| `notesFormat.ts` | ProseMirror ↔ formato legado do Editor.js (unitário) |
| `drawingAssetPath.ts` | resolve as fontes do Excalidraw pelo esquema `ticktask-asset://` (host `excalidraw`) |

---

## Hooks de interface

| Hook | Função |
| --- | --- |
| `usePersistedState(chave, inicial)` | `useState` espelhado em `localStorage`; tolerante a falha de acesso |
| `useIncrementalList(itens, chaveDeReset, tamanho=60)` | renderização em lotes via `IntersectionObserver` com `rootMargin: 400px` |
| `useNotification()` | dispara notificação do sistema pelo IPC |

## Estado do cronômetro — `stores/timerStore.ts` (Zustand)

A única store global. Guarda um mapa `taskId → { task, entry, displaySeconds }`.

- **Timers paralelos por padrão** — iniciar um não para os outros.
- Um único `setInterval` de 1s recalcula todos os cronômetros a partir do horário de início gravado
  (não por acumulação), e empurra o estado para a janela flutuante.
- **Alerta de Time Leak:** para tarefas dessa categoria, a partir do nível laranja (padrão 1h)
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
| `cn(...)` | `clsx` + `tailwind-merge` |
| `formatTime(segundos)` | `HH:MM:SS`, sempre com duas casas e nunca negativo |
| `parseTimeInput('01:30:00')` | segundos |
| `formatDate` / `formatDateTime` | `dd/mm` e `dd/mm, HH:MM` em `pt-BR` |
| `calculateProgress(atual, limite)` | 0–100 |
| `DEFAULT_COLORS` | as 12 cores do `ColorPicker` |
