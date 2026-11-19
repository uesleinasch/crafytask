# Plano do dia — `/today`

`src/renderer/src/pages/TodayPage.tsx` · `components/today/dayPlan.ts` (puro, testado)

## Função

Responder "o que eu faço hoje, e nessa ordem?". É a materialização do horizonte H0 do GTD.

Uma tarefa entra aqui quando tem `scheduled_date` igual à data de hoje — definido pelo botão "Hoje"
nas listagens (linha e menu de contexto), pelo campo "Programado para" no detalhe, ou arrastando no
calendário mensal.

## Dados

- Tarefas de `schedule:getForDate(hoje)`, com a data local (`localDateString`), não a UTC.
- Blocos de tempo da semana de `timeBlock:getForWeek(início)`. Jornada e início da semana vêm de
  `calendarPrefs()` (`src/shared/calendarPrefs.ts`): 8h e segunda, fixos até a F7-f.
- A tela relê tudo a cada `tasks:refresh` e `timer:stopped`, e troca de dia sozinha à meia-noite;
  falha de leitura vai para o `RegionBoundary` da rota.

## Layout

`Row`/`Col`: card do plano (`lg` 16) e card da semana (`lg` 8); abaixo de `lg`, a semana desce.

## Card "Plano de {dia}, {data}"

Título como "Plano de terça, 17 de novembro" (`planTitle`, sem "-feira").

**Carga** no `extra`: `Progress` fino de 96px e "6,5h de 8h" em mono. A carga (`plannedMin`) é a
soma dos blocos de tempo de hoje, a mesma conta do calendário; a jornada vem de
`calendarPrefs()`, lida a cada render. Passou da jornada: barra em `colorWarning`, texto em
`colorWarningText` com "· passa da jornada". Nunca vermelho. Abaixo de `sm`, a barra cai para
48px e o aviso vira tooltip, para o título caber.

**Lista** (`List size="small"`), sem arrasto. A ordem vem do SQL de `getTasksForDate`:

1. com horário (`scheduled_time`), pela hora;
2. com prazo hoje e hora (`due_time`), pela hora;
3. o resto por `day_order` (definido pelo `plan_day` do MCP) e pela data de criação.

Cada linha: nome (abre `/task/:id`) e, embaixo, a faixa `09:00–10:30` com `Clock` (só com horário,
tooltip "Horário fixo…"), `StatusChip` e `ProjectLabel`. À direita, em mono, a hora do prazo de hoje
ou o tempo registrado (`formatShortDuration`, ao vivo quando o timer roda; "—" sem tempo).

**Vazio:** "Nada planejado para hoje.", a dica de usar **Hoje** na lista de tarefas e o botão **Ir
para Tarefas** (`/`).

## Card "Semana"

Extra "blocos de tempo". Uma linha por dia, Seg a Dom: rótulo (hoje em negrito), `Progress` contra a
jornada e as horas em mono ("—" sem blocos). Dia acima da jornada em âmbar (`colorWarning` na
barra, `colorWarningText` no número).

## Sobreposição com outras telas

| Recurso | `/today` | `/calendar` (semana) | `/horizons` (H0) |
| --- | --- | --- | --- |
| Tarefas agendadas para hoje | lista em ordem automática | linha "Dia" (máx. 2 + "+N") | lista simples |
| Panorama da semana | horas planejadas por dia | grade horária completa | — |
| Reagendar arrastando | não | sim (só no modo mês) | — |
| Blocos de tempo | soma por dia | sim | não mostra |
| Carga do dia | sim (vs. 8h) | não | não |
