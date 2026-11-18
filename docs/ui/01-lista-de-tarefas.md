# Lista de tarefas — `/`

`src/renderer/src/pages/TaskListPage.tsx` (~1000 linhas)

A tela inicial e o centro de gravidade do app (item **Tarefas** da sidebar) e a única com ações em
massa. Concentra quatro modos de visualização diferentes sobre o mesmo conjunto
de dados.

## Função

Ver, filtrar e triar todas as tarefas não arquivadas. Na prática cumpre três papéis distintos:

1. **Processar o Inbox** (aba padrão) — decidir o que fazer com o que foi capturado.
2. **Escolher o que executar agora** — filtrar por contexto, energia, projeto.
3. **Manutenção em lote** — mover dezenas de tarefas de status ou projeto de uma vez.

## Anatomia

```
┌────────────────────────────────────────────────────────────────────────┐
│ ① ABAS DE STATUS (Tabs do antd, com contador)                          │
│ [Todas 42][Inbox 3][Aguardando 5][Próximas 12]…                        │
├────────────────────────────────────────────────────────────────────────┤
│ ② BARRA DE FERRAMENTAS                                                 │
│ [🔍 Buscar…] [Filtros ③ 2]      [Tabela|Cards|Kanban] [Agrupar por ▾]  │
├────────────────────────────────────────────────────────────────────────┤
│ ④ BARRA DE AÇÕES EM MASSA                                              │
│ N selecionada(s) · Selecionar todas visíveis · Limpar seleção          │
│       [Marcar como▾][Marcar] [Projeto▾][Mover] [Arquivar] [Excluir]    │
├────────────────────────────────────────────────────────────────────────┤
│ ⑤ CONTEÚDO — Tabela | Cards | Grupos | Kanban                          │
│                                                                        │
│    ⑥ sentinela "Carregando mais N tarefas…"                            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ① Abas de status

`Tabs` do antd (a partir de `md`; abaixo disso, um `Select` com os mesmos itens). Cada aba tem o
ícone do status na cor de `theme/semantic.ts`, o rótulo e o contador em Geist Mono.

| Aba | Ícone | Filtro aplicado |
| --- | --- | --- |
| Todas | `ListTodo` | `status: 'all'` |
| Inbox | `Inbox` | `status: 'inbox'` |
| Aguardando | `Hourglass` | `status: 'aguardando'` |
| Próximas | `CircleArrowRight` | `status: 'proximas'` |
| Executando | `CirclePlay` | `status: 'executando'` |
| Finalizada | `CircleCheck` | `status: 'finalizada'` |
| Someday | `Lightbulb` | `status: 'someday'` |

Os contadores vêm de `task:statusCounts` (`countTasksByStatus`): uma query `GROUP BY status` com os
mesmos filtros da lista menos o status, relida a cada mudança da lista. Com uma busca ou filtro
ligado, cada aba diz quantas tarefas daquele status casam com ele. A aba ativa é persistida em
`ticktask:taskListStatusFilter` (padrão: **Inbox**).

## ② Barra de ferramentas

Uma linha abaixo das abas (`Flex` com quebra):

- **Busca** — `Input` com ícone `Search` e botão de limpar. Busca em nome e descrição, com
  **debounce de 250 ms** (`useDebouncedValue`): a consulta sai quando a pessoa para de digitar.
- **Filtros** — botão com `ListFilter` e o número de filtros ativos; abre o painel ③.
- **Visão** — `Segmented` Tabela | Cards | Kanban (rótulos a partir de `lg`). Kanban só aparece na
  aba Executando; em outra aba a visão Kanban guardada vale como Tabela.
- **Agrupar** — `Select` com Sem agrupamento, Projeto, Contexto, Espaço Jira e Pai Jira (os dois do
  Jira só com task do Jira na lista). No Kanban, o mesmo `Select` escolhe as colunas e não tem "Sem
  agrupamento" (cai em Projeto). O agrupamento é puro, em `lib/taskGrouping.ts` (testado):
  - **Espaço Jira** — por `jira_space` (ou prefixo da chave); o resto vai para "Fora do Jira".
  - **Pai Jira** — por `jira_parent_key` (épico ou história da issue). Se a própria issue pai foi
    importada, ela entra no grupo, no topo; o resto vai para "Sem issue pai". Não usa subtarefa
    local (`parent_task_id`): issue filha continua aparecendo na lista.

Visão e agrupamento são duas chaves só, `ticktask:taskListView` e `ticktask:taskListGroup`
(`lib/taskListView.ts`, testado). Na primeira abertura elas são lidas das quatro chaves antigas
(`taskListViewMode`, `taskListGrouping`, `taskListGroupBy`, `executandoKanban*`), que davam estados
de reabertura contraditórios.

## ③ Filtros

`components/tasks/TaskFilters.tsx`: um `Popover` sob o botão (abaixo de `md`, um `Drawer` que sobe
de baixo). Campos, em `Select` do antd com busca onde a lista é longa:

| Campo | Comportamento |
| --- | --- |
| Categoria | Urgente / Prioridade / Normal / Time leak; limpar = todas |
| Contexto | `ícone nome` |
| Projeto | Inclui **"Sem projeto"** (`-1` → `'none'`) |
| Tag | nome da tag |
| Ordenar | por atualização (padrão) ou por prazo |
| Só bloqueadas | `Checkbox` |

No pé: `Mostrando {tasks.length} de {totalTasks}` e **Limpar filtros** (não mexe na aba nem na
busca). A contagem do botão soma os campos acima (`taskFilterState.ts`, testado).

## ④ Barra de ações em massa

Renderizada **sempre que houver ao menos uma tarefa carregada** — inclusive com nenhuma tarefa
selecionada, quando mostra "0 selecionada(s)" e botões desabilitados. Com ao menos uma tarefa
selecionada, a barra fica presa no topo da área rolável (`sticky top-0`), para as ações continuarem
à mão enquanto se rola a lista; sem seleção, ela rola junto com o conteúdo.

Cartão branco em duas metades (`flex-col xl:flex-row`):

**Esquerda:**
- `{N} selecionada(s)` em `font-semibold`
- "Selecionar todas visíveis ({total})" — desabilitado quando já estão todas
- "Limpar seleção" — desabilitado com zero selecionadas

**Direita:**
- `SearchableSelect` "Marcar como…" (os 6 status) + botão **Marcar** (`CheckCheck`)
- `SearchableSelect` "Mover para projeto…" (inclui "Sem projeto") + botão **Mover** (`FolderInput`)
- Botão **Arquivar** (`Archive`) — manda as selecionadas para o Arquivo Morto (`task:bulkSetArchived`)
- Botão **Excluir** (`Trash2`) em `bg-red-50 border-red-200 text-red-700`

Cada ação abre um `AlertDialog` cujo texto é montado dinamicamente:

| Ação | Título | Descrição |
| --- | --- | --- |
| Excluir | `Deletar N tarefa(s)?` | Avisa que a exclusão também ocorre no Notion se a sincronização automática estiver ativa |
| Marcar | `Marcar N tarefa(s)?` | Cita o status de destino |
| Mover | `Mover N tarefa(s)?` | Texto diferente para "sem projeto" e para um projeto escolhido |
| Arquivar | `Arquivar N tarefa(s)?` | Avisa que as tarefas vão para o Arquivo Morto e podem ser desarquivadas |

Durante a execução, o botão de confirmação vira `Loader2` girando + "Aplicando…". Ao terminar, a
seleção é limpa e a lista recarregada. A seleção também é podada automaticamente quando os filtros
mudam: IDs que saíram do resultado deixam de estar selecionados.

## ⑤ Conteúdo

A ordem de decisão do que renderizar é:

1. Carregando → `Spin` centralizado com "Carregando tarefas"
2. Zero tarefas → `Empty` simples: com busca ou filtro ativo, "Nenhuma tarefa com esses filtros." e o
   botão "Limpar filtros"; sem filtro, "Inbox zerado. Tudo processado." na aba Inbox e "Nenhuma
   tarefa aqui." nas outras
3. Aba Executando **e** Kanban ligado → `TaskKanban`
4. Agrupamento ligado em cards → `TaskCardGroups`
5. Modo cards → `TaskCardGrid`
6. Caso contrário → `TaskTable` (com ou sem agrupamento)

Abaixo de `md` a visão Tabela vira Cards (`effectiveListView(view, status, narrow)` em
`lib/taskListView.ts`, testada) e some do `Segmented`; a preferência guardada só muda se a pessoa escolher outra visão no
estreito. Os grupos recolhidos ficam na página (valem para tabela e cards) e voltam a abrir ao
trocar o agrupamento. Tabela, cards e Kanban têm cada um seu `RegionBoundary`. Com
agrupamento por contexto e alguma tarefa em mais de um contexto, um aviso em texto secundário (ícone
`Copy`) fica acima do conteúdo: "Tarefas com mais de um contexto aparecem em cada grupo; a soma dos
grupos passa do total."

A página inteira rola num só contêiner (`h-full overflow-y-auto`, dentro do `PageContainer`):
abas, barra de ferramentas e conteúdo sobem juntos, como no protótipo. Só a barra de ações em massa
fica presa no topo, e só com seleção.

### Menu de contexto (`TaskContextMenu`)

`Dropdown` do antd. Abre com o botão direito num card (cards, grupos, Kanban) ou numa linha da
tabela, e com o clique no botão `⋯` da linha (`trigger={['click']}`): **Abrir** · **Iniciar timer** /
**Parar timer** (iniciar fica desabilitado em tarefa bloqueada) · **Planejar para hoje** / **Tirar
do plano de hoje** · **Marcar como ▸** (os 6 status, o atual com `✓`; Executando desabilitado em
tarefa bloqueada) · **Arquivar** · **Excluir** (vermelho, abre o `DeleteConfirmDialog`). Cada ação
mostra um toast e recarrega a lista pelo `TaskMenuChangedContext` (`components/taskMenuContext.ts`),
que a `TaskListPage` fornece. Linhas de subtarefa também têm o menu. Categoria, projeto, contextos,
copiar `#id` e a ação sobre a seleção entram na F2-f.

### Modo tabela (`components/tasks/TaskTable.tsx`) — padrão

`Table` do antd (`tableLayout="fixed"`, sem paginação, `size` `small` e `middle` a partir de `xxl`,
com o respiro de linha da densidade em `buildTheme`: 10/6px, 12/8px no `middle`). Largura mínima =
soma das colunas + 240px para Tarefa; abaixo disso a tabela rola na horizontal. Fica dentro de um
`RegionBoundary` próprio.
Toda linha tem uma linha de texto só: nada de descrição, barra ou contador embaixo do nome.

| Coluna | Largura | Quando aparece | Conteúdo |
| --- | --- | --- | --- |
| ☐ | 40px | sempre | `rowSelection` do antd; o cabeçalho seleciona todas as visíveis |
| **ID** | 72px | sempre | `#id` em Geist Mono, texto secundário |
| **Tarefa** | resto | sempre | ver abaixo |
| **Status** | 132px | só na aba "Todas" | `StatusChip` |
| **Categoria** | 124px | a partir de `lg` | `CategoryChip`; vazia quando normal |
| **Projeto** | 160px | a partir de `xl`, fora do agrupar por projeto | ponto de 8px na cor + nome |
| **Contextos** | 150px | a partir de `lg`, fora do agrupar por contexto | `ContextsCell` |
| **Energia** | 76px | a partir de `xl` | `EnergyMeter` |
| **Prazo** | 104px | a partir de `md` | `dd/mm` (e a hora) em mono; vermelho vencido, aviso hoje |
| **Tempo** | 84px, direita | sempre | `1h05`, `25 min` ou `—` (`formatShortDuration`), ao vivo se rodando |
| ações | 104px | sempre | **Hoje** (`CalendarDays`, primário quando já está no plano), timer (`Play`/`Pause`) e `⋯` |

A célula **Tarefa**, da esquerda para a direita: botão de expandir subtarefas (`ChevronRight`/
`ChevronDown`; a quantidade fica no rótulo acessível e no tooltip, e o espaço é mantido quando não
há subtarefas), `Lock` se bloqueada, ponto pulsante (`LiveDot`) se rodando, o nome (500, reticências,
riscado se finalizada; é um link `#/task/<id>`, então recebe foco pelo Tab), `Clock` com o horário
agendado no tooltip e no rótulo acessível, `Copy` com "Também em …" ao agrupar por contexto e
`JiraTaskControls` em task do Jira (ver abaixo; a forma do Jira na tabela é a F2-i).

Clicar na linha abre a task. Botões, links, checkboxes, a célula de contextos e qualquer clique que
venha de um popup em portal (popover, menu, diálogo) não abrem: o `onClick` da linha confere se o
alvo está dentro do `<tr>`.

**`ContextsCell`** (`components/tasks/`): o primeiro contexto como `Tag` e `+N` ao lado. Passar o mouse
ou o clique (e Enter/Espaço com foco na célula) abre um `Popover` com todos os contextos em
`Tag.CheckableTag`; marcar ou desmarcar grava na hora (`setTaskContexts`), com estado otimista local
para dois cliques seguidos não se sobrescreverem, e recarrega a lista.

**Subtarefas** são linhas filhas da tabela (`children` + `expandedRowKeys`, `indentSize` 28), carregadas
sob demanda (`window.api.listSubtasks`) e recarregadas quando a lista muda. Cada uma tem checkbox de
concluir (desabilitado se a tarefa pai está bloqueada), `StatusChip` quando a coluna Status está
oculta, timer e `⋯`. Vêm de `getSubtasks`, que usa a mesma projeção e o mesmo `enrichTasks` da
listagem (cadeado, contextos e contadores corretos). As filhas são selecionáveis, mas a seleção não
propaga do pai para elas (`checkStrictly`); a página conta os ids das subtarefas carregadas ao
podar a seleção.

**Agrupamento na tabela:** com "Agrupar por" ligado, cada grupo vira uma linha de cabeçalho que ocupa
a largura toda (`colSpan`), com fundo `colorBgLayout` e borda superior (`.ct-table-grouprow` em
`main.css`, sobre as variáveis CSS do antd): botão de recolher, ponto da cor (projeto) ou
emoji (contexto), nome, quantidade, **Selecionar grupo** / **Desmarcar
grupo** e o tempo somado do grupo à direita. Recolher é por sessão e volta ao trocar o agrupamento.
A ordem dos grupos segue a ordem salva (ver "Modo agrupado"), mas o arrastar só existe nos cards e
no Kanban.

**Time leak:** tarefa da categoria time leak pinta o fundo da linha pelo tempo acumulado, em três
níveis: 30 min, 1 h e 2 h (`TIME_LEAK_THRESHOLDS` e `timeLeakLevel` em `theme/semantic.ts`, com as
cores de `TIME_LEAK_SCALE`). Hover e seleção do antd passam por cima da cor.

**`JiraTaskControls`** (`components/jira/`) — usado no card, na tabela e no detalhe, só quando a
task tem `jira_key`. Quatro peças, num wrapper que para a propagação do clique (senão abriria a task):
- chip cinza com `Layers` e o **espaço** da issue (`tasks.jira_space`, gravado pela importação; antes
  da primeira importação que o preenche, mostra o prefixo da chave, ex.: `CON`).
- `JiraIssueTypeBadge`: chip colorido com o **tipo** da issue (`tasks.jira_issue_type`), cor e ícone
  pela classe em `tasks.jira_issue_kind` — épico roxo, história verde, tarefa azul, bug vermelho,
  subtarefa cinza. A classe vem de `classifyIssueType` (`jiraPlan.ts`): nível da hierarquia do
  Jira primeiro (>0 épico, <0 subtarefa), nome do tipo depois. Some antes da primeira importação.
- chip azul **Jira · {status}**: um `Select` que, ao abrir, busca as transições da issue
  (`jira:listTransitions`) e aplica a escolhida (`jira:transition`). É independente do `StatusChip`
  local — mudar um não muda o outro.
- botão `SlidersHorizontal` (só no card e na tabela; o detalhe usa o botão azul "Campos do Jira",
  ver `02-detalhe-da-tarefa.md`) que abre o `JiraFieldsSheet`: painel lateral direito com os campos
  editáveis da issue (vindos do `editmeta`), um editor por tipo (texto, número, data, seleção,
  múltipla escolha, rótulos, pessoa com "Atribuir a mim", sprint). Múltipla escolha (ex.: Cliente,
  Equipe) é um `SearchableSelect` "Adicionar opção…" com as escolhidas em chips removíveis. Cada campo grava ao sair do
  campo/escolher; erro do Jira volta como toast e o campo retorna ao valor anterior.

### Modo cards (`components/tasks/TaskCardViews.tsx` → `TaskCard`)

Grade `repeat(auto-fill, minmax(min(100%, 260px), 1fr))` com 16px de espaço. Cada `TaskCard` é um
`Card size="small" hoverable` do antd, com a mesma escala de time leak da tabela no fundo e a borda
na cor primária quando selecionado:

1. **Topo, à esquerda:** checkbox de seleção, `#id` em mono e cadeado se bloqueada; abaixo, ponto
   pulsante se rodando e o nome (link `#/task/<id>`, riscado se finalizada); abaixo, se houver
   subtarefas, um botão com `Progress` fino e `feitas/total` que abre a lista delas.
2. **Topo, à direita:** `TaskActions` com Hoje e `⋯` (o mesmo menu da tabela).
3. **Subtarefas abertas:** lista recuada com borda à esquerda, círculo ou `CircleCheck` e nome
   riscado quando finalizada.
4. **Linha de metadados:** `StatusChip` (só na aba "Todas"), `CategoryChip` (só fora de normal),
   projeto (some ao agrupar por projeto), `ContextsCell` (some ao agrupar por contexto), prazo em
   mono, `JiraTaskControls` e, à direita, o tempo (`formatShortDuration`).

Descrição, tags e limite de tempo saíram do card (ficam no detalhe). Clicar no card abre a task;
botões, links, checkboxes e cliques vindos de popups não abrem.

### Modo agrupado em cards (`TaskCardGroups`)

Cada grupo tem uma barra de cabeçalho (`GroupHeader`, o mesmo da tabela) com alça de arrastar,
recolher, ponto da cor (projeto) ou emoji (contexto), nome, quantidade, **Selecionar grupo** e tempo
somado, e a grade de cards embaixo.

Grupo sem cor nem emoji ("Sem projeto", grupos do Jira) não leva marcador.

Ordenação dos grupos: alfabética `pt-BR`, com "Sem projeto" / "Sem contexto" por último — até o
usuário arrastar um grupo pela alça (`GroupDragButton`, `GripVertical`). A ordem personalizada fica em
`localStorage` (`ticktask:taskListGroupOrder`), separada para projeto e contexto, e vale também para
as colunas do Kanban e para os cabeçalhos da tabela. Grupos que ainda não têm posição salva entram
depois dos ordenados, na ordem alfabética; grupos fora da tela (filtrados) mantêm a posição. A lógica
é pura, em `lib/groupOrder.ts` (testada), e o arrastar vem de `components/SortableGroups.tsx`
(`@dnd-kit`).

### Modo Kanban (`TaskKanban`)

Só na aba Executando. Colunas em grade horizontal (`minmax(260px, 1fr)`, rolagem horizontal), cada
uma com fundo `colorBgLayout`, borda e raio de 12px; cabeçalho com alça, ponto ou emoji, nome e
contador em mono; os cards empilhados com 8px. Só existem colunas com tarefas (as colunas vêm do
agrupamento).

As **colunas** podem ser reordenadas pela alça (mesma ordem do modo agrupado).
**Os cards não se arrastam entre colunas** — as colunas são projeto/contexto, não status, e servem
apenas como leitura agrupada.

## ⑥ Carregamento incremental

A consulta traz todas as tarefas do filtro, mas o DOM recebe **60 por vez**. Uma sentinela no fim da
lista ("Carregando mais N tarefas…" em `text-xs text-slate-400`) é observada por um
`IntersectionObserver` com `rootMargin: 400px`; ao se aproximar, mais 60 entram.

A paginação é **desligada nos modos agrupado e Kanban** — esses renderizam a lista inteira de uma
vez.

## Diálogo "Nova Tarefa" (`TaskDialog`)

Aberto pelo botão **Nova tarefa** do header. `max-h-[90vh] overflow-y-auto`. Campos, na ordem:

| Campo | Controle | Obrigatório |
| --- | --- | --- |
| Nome | `Input`, placeholder "Ex: Refatorar módulo de login" | sim |
| Descrição | `Textarea` 3 linhas, sem redimensionar | não |
| Categoria \| Tempo Limite | duas colunas: `CategorySelect` \| `Input` mono `00:00:00` | não |
| Programar para \| Prazo | duas colunas de `input[type=date]` | não |
| Recorrência | `RecurrenceSelect` (Não repete / Diariamente / Semanalmente / Mensalmente) | não |
| Projeto | `SearchableSelect` — só projetos `active` ou `someday` | não |
| Contextos | pílulas alternáveis, coloridas quando selecionadas | não |
| Nível de Energia | três botões de largura igual com emoji; clicar no ativo desmarca | não |
| Fontes / Tags | `TagInput` + dica "Ex: E-mail, Trabalho, Pessoal, Cliente X" | não |

O campo de tempo limite aceita `HH:MM:SS`, `MM:SS` ou um número solto (interpretado como minutos).
Rodapé: "Cancelar" (ghost) e "Criar Tarefa" (primária, desabilitada com nome vazio, vira "Criando…").

**Ao criar, o app navega direto para `/task/{id}`** — o diálogo não deixa o usuário no lugar.

## Comportamentos que valem preservar

- **Botão "Hoje" onipresente** — agendar/desagendar para hoje sem sair da lista, em card e tabela.
  Alterna: se já está agendada para hoje, o clique remove.
- **Expandir subtarefas na própria linha** — sem navegar, com carregamento sob demanda.
- **Time Leak visualmente agressivo** — é a única semântica do app que colore o fundo inteiro da
  linha/card.
- **Recarga por evento** — a tela escuta `tasks:refresh` e se atualiza quando algo é criado pela
  captura rápida ou pelo servidor MCP.
