# Visão geral

## O que é o CrafyTask

Aplicativo de desktop (Electron) para gestão pessoal de tarefas e tempo, organizado em torno do
método **GTD** (*Getting Things Done*). Local-first: tudo vive num SQLite na máquina do usuário;
a sincronização com o Notion é opcional e unidirecional (app → Notion).

Duas ideias convivem na interface e às vezes competem por espaço:

1. **Sistema GTD completo** — inbox, contextos, projetos, áreas, horizontes, revisão semanal.
2. **Cronômetro de tarefas** — timer por tarefa, sessões, limite de tempo, alerta de *time leak*.

Toda a interface está em português. Não há tema escuro em uso (existem tokens `.dark` no CSS, mas
nada aciona a classe).

## Vocabulário do domínio

Estes termos aparecem literalmente na tela e devem ser preservados num redesenho.

### Status da tarefa (`TaskStatus`)

O ciclo de vida GTD. Uma tarefa tem exatamente um status.

| Valor | Rótulo na tela | Cor do badge | Significado |
| --- | --- | --- | --- |
| `inbox` | Inbox | slate (cinza) | Capturado, ainda não processado |
| `aguardando` | Aguardando | amarelo | Delegado / esperando terceiro |
| `proximas` | Próximas | azul | Próxima ação, pronta para execução |
| `executando` | Executando | esmeralda (com `animate-pulse`) | Em andamento |
| `finalizada` | Finalizada | roxo | Concluída |
| `someday` | Someday/Maybe | teal | Talvez um dia |

### Categoria da tarefa (`TaskCategory`)

Prioridade/natureza. Independente do status.

| Valor | Rótulo | Ícone | Cor |
| --- | --- | --- | --- |
| `urgente` | Urgente | `AlertTriangle` | vermelho |
| `prioridade` | Prioridade | `Flag` | laranja |
| `normal` | Normal | `Circle` | azul |
| `time_leak` | Time Leak | `Clock` | amarelo |

**Time Leak** é a categoria mais visualmente carregada do app: identifica tarefas que consomem
tempo sem gerar valor. O fundo do card/linha muda conforme o tempo acumulado (amarelo → laranja →
vermelho), e acima de 1h o cronômetro pulsa em vermelho e o sistema dispara notificação a cada 5
minutos.

### Nível de energia (`EnergyLevel`)

Quanto de disposição a tarefa exige. Usado como filtro mental e alimenta o gráfico do dashboard.

| Valor | Rótulo | Emoji | Cor |
| --- | --- | --- | --- |
| `alto` | Alta Energia | ⚡ | `#22c55e` |
| `medio` | Energia Média | 🔋 | `#f59e0b` |
| `baixo` | Baixa Energia | 😴 | `#94a3b8` |

### Demais entidades

- **Contexto** — *onde* ou *com o que* a ação pode ser feita (`@computador`, `@telefone`). Tem nome,
  emoji e cor. Uma tarefa pode ter vários. Oito contextos padrão são criados na primeira execução.
- **Tag** ("Fonte / Tag") — rótulo livre, criado enquanto se digita. Tem nome e cor. Uma tarefa pode
  ter várias.
- **Projeto** — resultado que exige mais de uma ação. Tem nome, descrição, *outcome* (resultado
  desejado), status (`active` / `someday` / `done` / `archived`), cor, data limite e área.
- **Área de foco** (Horizonte 2) — responsabilidade contínua (Carreira, Saúde). Tem nome, descrição e
  emoji. Agrupa projetos.
- **Meta / Visão / Propósito** (Horizontes 3, 4 e 5) — objetivos de longo prazo, opcionalmente
  ligados a uma área.
- **Bloco de tempo** — reserva de agenda (`data`, `início`, `fim`) apontando para uma tarefa.
- **Revisão semanal** — sessão com checklist de 8 itens, notas e carimbo de conclusão.

### Relações entre tarefas

- **Subtarefa** — `parent_task_id`. Uma tarefa-pai exibe barra de progresso e contador `feitas/total`.
- **Dependência** — "depende de". Enquanto a dependência não estiver `finalizada`, a tarefa fica
  **bloqueada**: cadeado laranja em toda listagem e botão Iniciar desabilitado.
- **Recorrência** — `daily` / `weekly` / `monthly`. Concluir a tarefa gera a próxima instância.

## Estrutura da janela principal

```
┌──────────┬───────────────────────────────────────────────────┐
│ Sider    │ Header — 52px: título da tela · [Nova tarefa]     │
│ 232px    ├───────────────────────────────────────────────────┤
│ (64px    │ Content — a rota ativa (h-full, nunca 100vh)      │
│ recolhida)│                                                  │
│          ├───────────────────────────────────────────────────┤
│          │ TerminalPanel (quando aberto)                     │
│          ├───────────────────────────────────────────────────┤
│          │ StatusBar — 28px: Notion · Google · Jira · MCP    │
└──────────┴───────────────────────────────────────────────────┘
Sobreposto: Toaster (sonner)
```

Dentro do `Content`, a página usa `PageContainer` (`components/shell/`): 24px de margem lateral
(12px abaixo de `md`), 20px em cima e 32px embaixo, e largura máxima de 1480px centralizada; com
`fullWidth` a largura é livre (calendário, cadernos, modo foco). `padBlock` deixa só o padding de
cima ou de baixo, para telas com cabeçalho fixo e conteúdo rolável, como a lista de tarefas.

O shell é `components/shell/AppShell.tsx` (antd `Layout`), com as rotas aninhadas no `HashRouter`
(`App.tsx`); `/float` e `/quick-capture` ficam fora dele. Sidebar, header e conteúdo têm cada um o
seu `RegionBoundary`: se um quebra, os outros continuam.

Abaixo do breakpoint `lg` (992px) a sidebar fica sempre recolhida em 64px e o item "Recolher menu"
some; abaixo de `md` (768px) ela sai e abre num `Drawer` pelo botão de menu do header, que fecha ao
navegar (`Grid.useBreakpoint`).

Dimensões da janela: `1024 × 700`, mínimo `400 × 600`, moldura nativa do SO com menu escondido
(`autoHideMenuBar`). Os canais `window:minimize` / `maximize` / `close` existem no preload mas **não
estão ligados a nenhum botão**.

### Sidebar (`components/shell/SiderNav.tsx`)

Em todas as rotas. Logo "CrafyTask" (Denk One; só "C" com a sidebar recolhida) e três grupos, como
no guia de design §7. Itens e rotas em `navigation.ts`:

| Grupo | Item | Ícone | Rota | Indicador |
| --- | --- | --- | --- | --- |
| Fluxo | Tarefas | `ListTodo` | `/` (marcado também em `/task/:id`) | tarefas no Inbox |
| Fluxo | Hoje | `CalendarDays` | `/today` | tarefas não finalizadas no plano de hoje |
| Fluxo | Calendário | `Calendar` | `/calendar` | — |
| Fluxo | Revisão semanal | `ClipboardCheck` | `/review` | ponto âmbar sem revisão concluída em 7 dias |
| Organizar | Projetos | `FolderKanban` | `/projects` (e `/project/:id`) | projetos ativos |
| Organizar | Horizontes | `Mountain` | `/horizons` | — |
| Organizar | Contextos e tags | `Tags` | `/contexts` (e `/tags`) | — |
| Conhecimento | Cadernos | `NotebookTabs` | `/notebooks` | — |
| Conhecimento | Dashboard | `BarChart3` | `/dashboard` | — |
| Rodapé | Terminais | `SquareTerminal` | alterna o painel (`Ctrl + '`); desabilitado sem sessão | sessões abertas |
| Rodapé | Arquivo | `Archive` | `/archived` | — |
| Rodapé | Configurações | `Settings` | `/settings` | — |
| Rodapé | Recolher menu | `PanelLeftClose` | alterna 232px ⇄ 64px (`ticktask:siderCollapsed`) | — |

Os contadores (`useNavCounts`) são relidos a cada troca de rota e a cada `tasks:refresh`.

### Header (`components/shell/ShellHeader.tsx`)

Grid de três zonas (`minmax(max-content, 1fr) · 200–520px · minmax(max-content, 1fr)`):

- **Esquerda:** botão de menu (só abaixo de `md`, abre o `Drawer`) e o título da tela (`screenTitle`).
- **Centro:** `HeaderCapture`, o campo "Capturar para o Inbox…": Enter grava pelo mesmo
  `quickCapture` da janela de captura rápida e confirma com `message`. Some abaixo de `sm`.
- **Direita:** `RunningTimersPill`: o tempo do timer iniciado por último e, com mais de um, o
  número; abaixo de `md` fica compacta (ponto ao vivo e tempo, sem o número). O popover lista
  todos, com link para a tarefa e botão de pausar. Substitui
  o antigo `FloatingTimer`. Depois, **Buscar** (abre a paleta; mostra "Ctrl K" a partir de `xxl`),
  **Aparência** (por enquanto só a densidade; o tema entra com a
  seção de Configurações) e **Nova tarefa** (só ícone abaixo de `lg`). Fora de `/`, Nova tarefa
  volta para a lista e o pedido fica guardado (`lib/newTaskRequest.ts`) até a `TaskListPage` montar
  e abrir o `TaskDialog`.

As telas não têm mais botão "Voltar"; só os detalhes (tarefa e projeto) mantêm o seu.

### Barra de status (`components/shell/StatusBar.tsx`)

Faixa de 28px no pé da coluna de conteúdo, com indicadores passivos: Notion, Google Calendar e Jira
(ponto + texto: sincronizando, sincronizado há X, não conectado, com erro) e o MCP (porta, parado
ou desligado). Erro vira ponto vermelho com tooltip; clicar abre Configurações. À direita, a dica
de que fechar a janela mantém o app na bandeja. Abaixo de `md` fica só o Notion. O estado inicial
vem das configs (`notionGetConfig`, `gcalGetStatus`, `jiraGetStatus`, `mcpGetStatus`, relidas a
cada troca de rota) e muda com os eventos de sync; as regras ficam em `integrationStatus.ts`
(testado). Substituiu o banner `SyncNotification`.

### Paleta de comandos (`components/shell/CommandPalette.tsx`)

`Ctrl+K` (ou `Cmd+K`) em qualquer rota da janela principal, menos com o foco no terminal, onde o
atalho é do shell. Um `Modal` com campo de busca e lista navegável por setas e Enter:

- **Ações:** capturar o texto digitado no Inbox (o substituto da captura do header abaixo de `sm`)
  e alternar a densidade.
- **Ir para:** uma entrada por tela da sidebar.
- **Tarefas:** `listTasks({ search, limit: 8 })`, com botão para iniciar o timer de quem não está
  rodando.
- **Projetos:** `listProjects` ao abrir a paleta, filtrado pelo nome (sem acento e caixa), até 5,
  abrindo `/project/<id>`; arquivado leva a dica "Arquivado".
- **Páginas:** `searchPages`, até 5, abrindo `/notebooks?page=<id>`.

A busca espera 150 ms sem digitar e descarta respostas atrasadas. A filtragem de comandos ignora
acento e caixa (`paletteCommands.ts`, testado).

## Rotas

| Rota | Tela | Documento | Sub-página¹ |
| --- | --- | --- | --- |
| `/` | Lista de tarefas | [01](01-lista-de-tarefas.md) | não |
| `/task/:id` | Detalhe da tarefa | [02](02-detalhe-da-tarefa.md) | sim |
| `/today` | Plano do dia | [03](03-plano-do-dia.md) | sim |
| `/calendar` | Calendário | [04](04-calendario.md) | sim |
| `/notebooks` | Cadernos | [17](17-cadernos.md) | sim |
| `/projects` | Projetos | [05](05-projetos.md) | sim |
| `/project/:id` | Detalhe do projeto | [05](05-projetos.md) | sim |
| `/horizons` | Horizontes GTD | [06](06-horizontes.md) | sim |
| `/review` | Revisão semanal | [07](07-revisao-semanal.md) | sim |
| `/dashboard` | Dashboard | [08](08-dashboard.md) | sim |
| `/contexts` | Contextos e tags (aba Contextos) | [09](09-contextos-e-tags.md) | sim |
| `/tags` | Contextos e tags (aba Tags) | [09](09-contextos-e-tags.md) | sim |
| `/archived` | Arquivo | [10](10-arquivadas.md) | sim |
| `/settings` | Configurações | [11](11-configuracoes.md) | sim |
| `/float` | Timer flutuante | [12](12-janelas-auxiliares.md) | janela própria |
| `/quick-capture` | Captura rápida | [12](12-janelas-auxiliares.md) | janela própria |

¹ "Sub-página" decidia onde aparecia o antigo `FloatingTimer`. Com a pílula de timers no header
(F1-d), todas as rotas se comportam igual.

## As três janelas

Todas as três carregam **o mesmo bundle do renderer** e se diferenciam pelo hash da URL.

| Janela | Rota | Dimensões | Características |
| --- | --- | --- | --- |
| Principal | `#/` | 1024×700 (mín. 800×600) | moldura do SO, menu escondido |
| Timer flutuante | `#/float` | 300 × dinâmica (44px por timer, até 5, + rodapé 44 + 16) | sem moldura, transparente, sempre no topo, fora da barra de tarefas, arrastável |
| Captura rápida | `#/quick-capture` | 400×140, centralizada a 1/3 da altura | sem moldura, transparente, sempre no topo, fecha ao perder o foco |

Regras de exibição do float, decididas no processo principal (não pelo renderer):

- **Minimizar** ou **fechar** a janela principal → mostra o float **se houver timer rodando**.
- **Restaurar** ou **focar** a janela principal → esconde o float.
- Fechar a janela principal não encerra o app: ele fica na bandeja.

O app também registra um **ícone de bandeja** (Abrir CrafyTask · Captura rápida · Sair) e um **atalho
global `Ctrl/Cmd + Shift + Space`** que abre a captura rápida de qualquer lugar do sistema.

## Padrões que se repetem em toda tela

Reconhecer estes padrões evita redesenhar a mesma coisa quinze vezes.

### 1. Cabeçalho de sub-página

Presente em `/calendar`, `/notebooks`, `/projects`, `/project/:id`, `/horizons`,
`/review`, `/dashboard`, `/contexts`, `/tags`, `/archived`, `/settings`.

```
<header class="shrink-0 px-6 py-4 bg-white border-b border-slate-200
               flex items-center justify-between">
  [← Voltar] [divisor vertical] [ícone] [título]     [ação primária]
</header>
```

Variações reais: o divisor `h-6 w-px bg-slate-200` existe em algumas telas e não em outras; o botão
Voltar às vezes é `<Button variant="ghost">` e às vezes um `<button>` cru; o destino é quase sempre
`/`, exceto no detalhe do projeto (volta para `/projects`) e no detalhe da tarefa (`navigate(-1)`).

### 2. Casca de página

```
<div class="flex flex-col h-full overflow-hidden bg-slate-50">
  <header … />
  <ScrollArea class="flex-1 h-0">
    <div class="p-6 pb-24">  ← conteúdo
  </ScrollArea>
</div>
```

O `h-full` (não `h-screen`) é deliberado: o `Content` do shell já descontou a altura do header. O
`pb-24` reservava espaço para o antigo `FloatingTimer`, que saiu na F1-d. Telas migradas trocam o
`p-6` pelo `PageContainer` (ver o início deste documento); a lista de tarefas já usa, com o
cabeçalho fixo (`padBlock="top"`) e o conteúdo rolável (`padBlock="bottom"`).

### 3. Abas em pílula

Filtros de status na lista de tarefas e em projetos usam o mesmo botão:

```
ativo:   bg-slate-900 text-white shadow-md
inativo: bg-white text-slate-600 border border-slate-200 hover:bg-slate-100
formato: rounded-full px-4 py-2 text-sm font-medium
```

### 4. Cartão de superfície

`bg-white border border-slate-200 rounded-sm p-4` — o contêiner padrão de conteúdo. O `rounded-sm`
é resultado de uma decisão de "design flat" que substituiu o `rounded-xl` + `shadow` originais.

### 5. Ações reveladas no hover

Editar/excluir em cartões de contexto, tag, área e meta ficam em `opacity-0
group-hover:opacity-100`. O mesmo vale para o checkbox do `TaskCard` e o botão "Hoje".

### 6. Estado vazio

Ícone grande dentro de um círculo `bg-slate-100 p-4 rounded-full`, frase principal e, às vezes, um
botão de ação. Formulações e tamanhos variam de tela para tela.

### 7. Diálogo de confirmação

`AlertDialog` (Radix) com título, descrição, "Cancelar" e ação destrutiva em vermelho. O
`DeleteConfirmDialog` embrulha esse padrão com textos padrão.

### 8. Feedback de ação

`toast` (sonner) no canto inferior direito para sucesso e erro; o shell usa `App.useApp().message`.
A sincronização (Notion, Google Calendar, Jira) não gera aviso: aparece na barra de status.

## Como os dados chegam à tela

Não há store global de dados — apenas o `timerStore` (Zustand) para o cronômetro ao vivo. Cada tela
busca o que precisa através de hooks que chamam `window.api.*` (IPC para o processo principal).

| Hook | Fornece |
| --- | --- |
| `useTasks(filters)` | Lista de tarefas filtrada + `createTask` / `refreshTasks` |
| `useTaskDetail(id)` | Tarefa, sessões de tempo, update/status/arquivar/deletar |
| `useProjects()` / `useProjectDetail(id)` | Projetos |
| `useLabels()` | Contextos e tags com uso e abertas |
| `useHorizons()` → `useAreas()` / `useGoals()` | Áreas e metas |
| `useCalendarWeek(inicio)` / `useCalendarMonth(ano-mês)` | Agenda e blocos de tempo |
| `useWeeklyReview()` | Revisão corrente, histórico, indicadores de saúde |
| `useTimer()` / `timerStore` | Cronômetros ativos |
| `useNotification()` | Notificações do SO |
| `usePersistedState(chave, inicial)` | Preferência de visualização em `localStorage` |
| `useIncrementalList(itens, chave)` | Renderização em lotes de 60 via `IntersectionObserver` |

**Atualização entre telas** acontece por evento, não por estado compartilhado: o processo principal
emite `tasks:refresh` e as telas interessadas recarregam. Outros eventos push: `float:update`,
`float:clear`, `timer:stopped`, `task:unblocked`, `notion:syncStart|syncSuccess|syncError`.

## O que a interface memoriza

Chaves em `localStorage` (via `usePersistedState`):

| Chave | Padrão | Efeito |
| --- | --- | --- |
| `ticktask:taskListStatusFilter` | `'inbox'` | Aba de status ativa na lista |
| `ticktask:taskListViewMode` | `'table'` | Cards ou tabela |
| `ticktask:taskListGrouping` | `false` | Agrupamento ligado |
| `ticktask:taskListGroupBy` | `'project'` | Agrupar por projeto ou contexto |
| `ticktask:executandoKanban` | `false` | Kanban na aba Executando |
| `ticktask:executandoKanbanGroupBy` | o `taskListGroupBy` atual | Colunas do Kanban (projeto, contexto, Jira) |
| `ticktask:taskInspectorOpen` | `true` | Inspetor aberto no detalhe da tarefa (a partir de `xl`) |
| `ticktask.notesZenWidth` | `640` | Largura da coluna no modo zen dos cadernos |

Note a inconsistência de nomenclatura: cinco chaves usam `:` e duas usam `.`.
