# Lista de tarefas — `/`

`src/renderer/src/pages/TaskListPage.tsx` (casca: `PageContainer`, diálogo de nova tarefa) ·
`components/tasks/TaskListView.tsx` (abas, barra, visões e ações em massa; também usado no detalhe
do projeto, ver `05-projetos.md`)

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
│ ALERTA DO INBOX (só na aba Inbox, com tarefas)                         │
├────────────────────────────────────────────────────────────────────────┤
│ ⑤ CONTEÚDO — Tabela | Cards | Grupos | Kanban                          │
│                                                                        │
│    ⑥ sentinela "Carregando mais N tarefas…"                            │
│ ④ BARRA DE AÇÕES EM MASSA (flutuante, só com seleção)                  │
│ N selecionadas · Limpar   [Marcar como▾][Projeto▾][Hoje][Arquivar][Excluir] │
└────────────────────────────────────────────────────────────────────────┘

Na aba Inbox, um `Alert` informativo acima do conteúdo: "**N itens para processar.** Para cada um: é
acionável? Leva menos de 2 minutos? É de um projeto?".
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

## ④ Barra de ações em massa (`components/tasks/BulkActionBar.tsx`)

Só aparece **com ao menos uma tarefa selecionada**, depois do conteúdo, presa a 12px do fundo da área
rolável (`position: sticky; bottom: 12px`). É uma faixa flutuante (`colorBgElevated`, borda,
`borderRadiusLG`, `boxShadowSecondary`) com:

- `{N} selecionada(s)` (anunciado por leitor de tela), **Selecionar todas (N)** quando faltam
  visíveis, **Limpar**;
- `Select` **Marcar como…** (os 6 status; Executando desabilitado se alguma está bloqueada) e
  `Select` **Mover para projeto…** (com busca e "Sem projeto"): aplicam ao escolher;
- **Hoje** (planeja todas para hoje, ou tira do plano se todas já estão), **Arquivar** e
  **Excluir** (`danger`, pede confirmação com `modal.confirm`: "Excluir N tarefas?").

As ações vêm de `useTaskBulkActions` (`components/tasks/`), o mesmo do menu de contexto. No main,
`task:updateStatus` e `task:bulkUpdateStatus` passam pela mesma `applyStatusChange` (bloqueio,
subtarefa de pai bloqueado, recorrência, fechar o pai, aviso de desbloqueio); o lote aplica a cada
tarefa e, se alguma for recusada, devolve um erro com os ids. Cada ação mostra um toast com a
quantidade e recarrega a lista, mesmo quando parte falha. "Selecionar todas" soma as visíveis à
seleção atual (subtarefas marcadas continuam). A seleção é podada quando os filtros mudam: ids que
saíram do resultado (e não são subtarefas carregadas) deixam de estar selecionados. Quando a barra
some com o foco dentro (depois de arquivar ou excluir), o foco vai para a área das tarefas. Um
`aria-live` sempre montado anuncia a contagem.

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
flutua, presa ao fundo, e só com seleção.

### Menu de contexto (`components/tasks/TaskContextMenu.tsx`)

`Dropdown` do antd. Abre com o botão direito numa linha ou num card e com o `⋯`. Itens: **Abrir** ·
**Iniciar/Pausar timer** (iniciar desabilitado em tarefa bloqueada) · **Planejar para hoje / Tirar do
plano de hoje** · **Marcar como ▸** (os 6 status com ícone na cor do status) · **Categoria ▸** ·
**Mover para projeto ▸** ("Sem projeto" e os projetos não arquivados) · **Jira ▸** (só em task do
Jira; ver "Jira na lista") · **Contextos ▸** (marca e
desmarca) · **Copiar #id** · **Arquivar** · **Excluir…** (`modal.confirm`). O valor atual de cada
submenu leva `✓`.

Se a linha faz parte de uma seleção maior, o menu age sobre a seleção toda: título "N tarefas
selecionadas", rótulos com "(N)" e sem Abrir, timer, Jira, Contextos e Copiar. Projetos, contextos, ids
selecionados e a busca de tarefa por id chegam pelo `TaskMenuDataContext`
(`components/taskMenuContext.ts`), que o `TaskListView` fornece junto com o
`TaskMenuChangedContext` (recarregar a lista).

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
há subtarefas), `Lock` se bloqueada (tooltip e rótulo "Bloqueada: depende de #702 e #705", de
`blocked_by`, até três ids e "e mais N"), ponto pulsante (`LiveDot`) se rodando, o nome (500, reticências,
riscado se finalizada; é um link `#/task/<id>`, então recebe foco pelo Tab), `Hourglass` na cor de Aguardando com "Aguardando: {texto}" no tooltip quando há `waiting_for` (`WaitingForIcon`), `Clock` com o horário
agendado no tooltip e no rótulo acessível, `Copy` com "Também em …" ao agrupar por contexto e
a chave do Jira em task importada (ver "Jira na lista").

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

**Jira na lista** — em task com `jira_key`, a célula Tarefa e o card mostram só a chave em Geist
Mono, texto terciário (`components/tasks/JiraKey.tsx`), com "{tipo} · Jira: {status}" no tooltip e no
rótulo acessível. O resto foi para o submenu **Jira ▸** do menu da tarefa (só sem seleção maior):
**Abrir no Jira** (`app:openExternal` com `tasks.external_url` quando ele é o link da issue,
`/browse/{chave}`; sem isso fica desabilitado com "(sem link da issue)"),
**Status no Jira ▸** (o status atual aparece no topo, com `✓` e desabilitado; as transições vêm de
`jira:listTransitions` ao abrir esse submenu, a resposta mais recente vence, e o erro do Jira
aparece no item; aplicar usa `jira:transition`) e **Campos do Jira…** (abre o `JiraFieldsSheet`, que lê
`issue?expand=editmeta` e grava cada campo com `jira:updateField`). O status do Jira continua
independente do `StatusChip` local.

No detalhe da tarefa, a aba Detalhes do inspetor mostra tipo, chave, status Jira (com transição) e pai
(ver [02-detalhe-da-tarefa.md](02-detalhe-da-tarefa.md)).

### Modo cards (`components/tasks/TaskCardViews.tsx` → `TaskCard`)

Grade `repeat(auto-fill, minmax(min(100%, 260px), 1fr))` com 16px de espaço. Cada `TaskCard` é um
`Card size="small" hoverable` do antd, com a mesma escala de time leak da tabela no fundo e a borda
na cor primária quando selecionado:

1. **Topo, à esquerda:** checkbox de seleção, `#id` em mono e cadeado se bloqueada (mesmo texto da tabela); abaixo, ponto
   pulsante se rodando e o nome (link `#/task/<id>`, riscado se finalizada); abaixo, se houver
   subtarefas, um botão com `Progress` fino e `feitas/total` que abre a lista delas.
2. **Topo, à direita:** `TaskActions` com Hoje e `⋯` (o mesmo menu da tabela).
3. **Subtarefas abertas:** lista recuada com borda à esquerda, círculo ou `CircleCheck` e nome
   riscado quando finalizada.
4. **Linha de metadados:** `StatusChip` (só na aba "Todas"), `CategoryChip` (só fora de normal),
   projeto (some ao agrupar por projeto), `ContextsCell` (some ao agrupar por contexto), prazo em
   mono, a chave do Jira e, à direita, o tempo (`formatShortDuration`).

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
| Recorrência | `RecurrenceSelect` (Não repete / Diária / Semanal / Mensal) | não |
| Projeto | `SearchableSelect` — só projetos `active` ou `someday` | não |
| Contextos | pílulas alternáveis, coloridas quando selecionadas | não |
| Nível de Energia | três botões de largura igual com emoji; clicar no ativo desmarca | não |
| Tags | `TagInput` + dica "Ex: E-mail, Trabalho, Pessoal, Cliente X" | não |

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
