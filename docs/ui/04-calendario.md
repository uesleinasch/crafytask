# Calendário — `/calendar`

`src/renderer/src/pages/CalendarPage.tsx` · `components/calendar/` (`CalendarGrid.tsx`,
`BlockPopover.tsx`, `NewBlockModal.tsx`, `UnscheduledPanel.tsx`, `CalendarShowMenu.tsx`,
`calendarView.ts` puro e testado; `LegacyMonthView.tsx` até a F4-b4) · dados em
`hooks/useCalendar.ts` (`useCalendarRange`, `useCalendarMonth`)

## Função

O plano (blocos de tempo), o compromisso (tarefa com horário), o prazo e o que de fato aconteceu
(sessões do timer) na mesma grade. Visões Dia, 3 dias e Semana (grade horária) e Mês (ainda a
antiga, até a F4-b4).

## Barra

`PageContainer` de largura total. **Hoje**, `‹ ›` (anda 1 dia, 3 dias, 1 semana ou 1 mês), o período
como `DatePicker` sem borda ("16–22 de novembro de 2026"), a visão (`Segmented`; `Select` abaixo de
`md`), **Mostrar** e **Novo bloco** (primário). A visão inicial sai da largura da janela: Semana a
partir de `lg`, 3 dias em `md`, Dia abaixo.

**Mostrar** (`Popover` com `Checkbox`) é filtro e legenda: Blocos de tempo, Tarefas com horário,
Agendadas sem horário, Prazos, Sessões registradas e Fins de semana, cada um com a amostra, e a chave
dos ícones (`Flame` urgente, `Flag` prioridade, `Clock` time leak, `CalendarSync` no Google). A
escolha fica em `localStorage` (`ticktask:calendar-show`). Sem fins de semana, a Semana mostra
segunda a sexta.

## Grade (Dia, 3 dias, Semana)

Um card que rola sozinho (`.ct-calscroll`), com cabeçalho e faixa Dia fixos no topo, e abre rolado
até a hora atual. Colunas de no mínimo 96px (Semana) ou 140px; em tela estreita rola na horizontal.

- **Cabeçalho do dia:** dia da semana e número (hoje em círculo da cor primária) num botão que abre
  a visão Dia; embaixo, um medidor de 4px das horas em blocos contra a jornada
  (`calendarPrefs().journeyMinutes`), âmbar quando passa, com tooltip "Xh em blocos de 8h da jornada
  · passa da jornada".
- **Faixa Dia:** agendadas sem horário (chip com o ponto do projeto) e prazos abertos (bandeira,
  borda tracejada; bandeira âmbar no dia, vermelha se venceu; hora do prazo em mono). Até 2 por dia
  (6 na visão Dia) e `+N` abre um `Popover` com todos. Clicar abre a tarefa.
- **Horas:** faixa de `calendarPrefs()` (00–24: o dia inteiro, régua em 24 h com rótulos de 01:00 a 23:00, como o Google Calendar), 48px por hora (40 no compacto), linha a cada hora,
  fim de semana em `colorBgLayout`. Clicar num espaço vazio abre o `Modal` "Novo bloco de tempo"
  com o dia e 1h centrada no clique (arredondada em 15 min).
- **Bloco de tempo:** fundo `calBlock` com borda `calBlockBorder` (`CAL_BLOCK_COLORS`), ponto do
  projeto, ícone da categoria quando não é normal, nome, horário em mono e `CalendarSync` quando a
  tarefa vai ao Google. Time leak pinta o fundo pela escala de três níveis (`timeLeakLevel` com o
  tempo total da tarefa). Concluída fica apagada e riscada; rodando agora, ponto pulsante.
- **Tarefa com horário:** mesmo formato, fundo `colorBgContainer`, borda forte e ícone `Calendar`;
  sem fim, dura 1h. Clicar abre a tarefa.
- **Sobreposição:** itens que se cruzam dividem a coluna lado a lado (`layoutDay`).
- **Sessões registradas:** faixa de 4px na borda direita da coluna, na cor primária, tracejada
  enquanto roda; cortada na meia-noite e na faixa de horas; tooltip "Sessão 09:00–09:40 · tarefa".
- **Agora:** linha de 2px na cor primária com um ponto, atualizada a cada minuto.
- **Editar na grade:** arrastar o bloco move (também para outro dia da visão), em passos de 15 min
  e dentro do dia; a alça de baixo muda o fim (mínimo 15 min). Clique ou Enter abre o `Popover`
  (`BlockPopover`): tarefa (abre), projeto, status, categoria, `TimePicker.RangePicker` com a
  duração, **Iniciar timer**, **Abrir** e excluir. Botão direito: Abrir tarefa, Iniciar timer,
  Repetir no dia seguinte, Excluir bloco. Delete exclui. Mover e excluir mostram "Desfazer" na
  mensagem (mover volta ao bloco anterior que o `timeBlock:update` devolve; excluir recria o bloco,
  com outro id).
- **Soltar na grade:** uma tarefa arrastada de "A agendar" vira um bloco de 1h no ponto em que
  soltou. Um chip da faixa Dia solto em outro dia reagenda (agendada) ou move o prazo.
- **Vazio:** "Nada nestes dias. Clique na grade ou arraste uma tarefa de “A agendar” para
  reservar tempo."

## Painel "A agendar"

`UnscheduledPanel`, à esquerda: aberto por padrão a partir de `xl`, fechado com botão
`PanelLeftOpen` em `lg`, `Drawer` (botão **A agendar**) abaixo de `lg`. Lista as Próximas e
Executando sem bloco nem horário nos dias visíveis (no Mês, no mês todo), de
`schedule:listUnscheduled`, com filtro por nome ou `#id` no SQL (debounce de 250 ms). Cada item:
alça, nome, projeto, energia e prazo; arrasta para a grade, e o `+` reserva 1h às 09:00 num dos
dias da visão. Vazio: "Toda próxima ação tem tempo reservado."

A grade relê em `tasks:refresh` e `timer:stopped` e descarta resposta velha ao trocar de período
rápido; o Mês relê ao salvar um bloco. A leitura acontece dentro do `RegionBoundary` "grade do
calendário": falha ali não derruba a barra. Erro ao salvar ou excluir bloco aparece numa mensagem
(sem o prefixo do Electron) e o diálogo continua aberto.

## Visão mensal

Grade `grid-cols-7`. Cabeçalho com `Dom … Sáb` em `bg-slate-50`. As células fora do mês (padding do
início e do fim) ficam `bg-slate-50/50`.

### Célula de dia (`DroppableDayCell`)

`min-h-[90px] p-1.5 border border-slate-200`, clicável (abre o diálogo de bloco já com a data).

- Número do dia em `w-6 h-6 rounded-full`; se for hoje, círculo azul preenchido e a célula inteira
  ganha `bg-blue-50 border-blue-300`.
- Badge `N⏱` em `bg-orange-100 text-orange-600` quando há blocos de tempo naquele dia.
- Até **três** chips de tarefa (`DraggableTaskChip`) + `+N mais`.
- Sendo alvo de um arraste: `bg-emerald-50 border-emerald-400 ring-1 ring-emerald-300`.

### Chip de tarefa arrastável

Pílula azul-clara com `GripVertical` e o nome truncado. `cursor-grab`, ativação após 5px de
movimento (para não confundir com clique). Clicar navega para a tarefa; arrastar e soltar em outro
dia **reagenda** (`scheduled_date`) e emite o toast "Tarefa reagendada!".

Enquanto o arraste está ativo, uma etiqueta escura fixa aparece em `bottom-4 right-4`: **"Solte em um
dia para reagendar"**.

## Novo bloco de tempo

`Modal` com Tarefa (`Select` com busca, de `listActiveTasksLight()`), Dia (`DatePicker`) e Horário
(`TimePicker.RangePicker` em passos de 15 min) com a duração; **Reservar** fica desabilitado sem
tarefa. Abre pelo **Novo bloco**, pelo clique na grade e pelo clique num dia do Mês. Erro do main
(validação de data e horário) aparece numa mensagem e o modal continua aberto.

## Dados

A grade usa `timeBlock:getForRange`, `schedule:getRange` e `timeEntry:listRange`; o Mês ainda usa
`timeBlock:getForMonth` e `schedule:getWeekly`.

- `timeEntry:listRange(fromIso, toIso)` → `TimeEntrySpan[]`: sessões de tempo que cruzam o
  intervalo, com nome e categoria da tarefa e cor do projeto (`listTimeEntriesInRange` em
  `timeEntryQueries.ts`, testado). A sessão em andamento vai até agora; ajustes manuais sem duração
  (início = fim) ficam de fora. Filtra com `julianday` e devolve `start_time`/`end_time` sempre
  em ISO UTC (`strftime`), inclusive as sessões gravadas no formato antigo do `CURRENT_TIMESTAMP`.
  A sessão em andamento chega com `end_time` nulo (a grade usa o relógio), e a sessão vem
  inteira: cortar na meia-noite e na faixa de horas é da grade. `localDaysToIsoRange` (`src/shared/calendarPrefs.ts`) converte dias
  locais no intervalo.
- `timeBlock:getForRange(from, to)`: blocos de qualquer intervalo de dias (3 dias, semana, Agenda).
  Todo bloco (também nas consultas por dia, semana e mês) traz `task_status`, `task_running`,
  `task_gcal_sync` (a tarefa vai ao Google; não diz se a conta está conectada),
  `task_total_seconds` (para o nível de time leak), `project_name` e `project_color`, além de nome
  e categoria (`TIME_BLOCK_SELECT` em `calendarQueries.ts`).
- `schedule:getRange(from, to)`: tarefas agendadas **ou** com prazo no intervalo, numa consulta só
  (prazo antigo gravado com hora também entra), ordenadas pela data que cai no intervalo e pela
  hora. Cada tarefa vem uma vez, com `scheduled_date` e `due_date`: a tela a põe no dia agendado
  e, com prazo, também no dia do prazo. Para a faixa Dia, a tarefa com horário e a Agenda de 14
  dias.
- `schedule:listUnscheduled(from, to, { search, projectId, limit })`: "A agendar" — Próximas e
  Executando sem bloco nos dias visíveis e sem horário neles (essas já estão na grade), executando
  primeiro, depois pelo prazo. Busca por nome ou `#id` e projeto (`null` = sem projeto) no SQL;
  até 100 por padrão.
- `timeBlock:create` e `timeBlock:update` validam data (`AAAA-MM-DD`), horas (`HH:MM`) e fim
  depois do início (data real: `2026-02-31` é recusada); `timeBlock:update` aceita trocar o dia
  (ressincroniza o Google) e devolve o bloco **anterior**, e `timeBlock:delete` devolve o bloco
  apagado, para o Desfazer. O erro chega ao renderer com o prefixo do Electron ("Error invoking
  remote method…"), que a tela precisa tirar antes de mostrar.
- Jornada (8h), faixa de horas (00–24) e início da semana (segunda) vêm de `calendarPrefs()`,
  fixos até a F7-f.
