# Revisão semanal — `/review`

`src/renderer/src/pages/WeeklyReviewPage.tsx`

## Função

Conduzir o ritual que, no GTD, mantém o sistema confiável: um fluxo guiado de 10 passos em três
fases, cada um com a lista que revisa e as ações para resolver ali mesmo, com os indicadores de saúde
ao lado e o registro no histórico ao final.

A tela tem **dois estados**: a entrada (sem revisão aberta, ou com uma pausada) e a revisão em
andamento. Sem cabeçalho próprio: o título vem do Header do shell.

---

## Estado A — entrada

`components/review/ReviewEntry.tsx`, com os cálculos em `reviewEntryState.ts` (puro, testado), dentro de
`PageContainer`. Aparece sem revisão aberta e também com uma aberta que não foi retomada nesta
visita (ao entrar na tela, ao pausar).

### 1. Cartão da revisão (`xl` 15/24)

- `Alert` informativo (ícone `CirclePause`) quando há revisão aberta: "**Revisão em andamento** ·
  N de 10 passos · próximo: …", com **Retomar** (primário) e **Descartar** (texto; `modal.confirm`
  avisa que os passos se perdem e o que mudou nas tarefas continua mudado; `review:discard`).
- Sobrescrito "Revisão semanal" e o título pelos dias desde a última concluída
  (`daysSinceLastReview`): "Nenhuma revisão ainda", "Em dia: a última foi hoje", "Em dia: a última
  foi há N dias" (até 7) ou "A última foi há N dias", e aí o texto avisa que passou de uma semana. Sempre "Leva uns 45 minutos e
  dá para pausar no meio."
- As três fases (`REVIEW_PHASES`: Clarear, Atualizar, Criar) em `.ct-rvphases`, com número, nome,
  resumo e quantos passos.
- **Começar revisão** (primário, grande, `CirclePlay`): o único botão de começar da tela. Some
  quando há revisão aberta (aí o caminho é Retomar).

### 2. Ritmo (`xl` 9/24)

As 12 últimas semanas (início pela preferência do calendário, segunda por padrão) em quadrados
`.ct-rvweek`: com revisão concluída, tom 4 da escala sequencial de gráfico e um `Check`; sem, tom 0.
Cada quadrado é focável, com tooltip e rótulo acessível (semana, data e duração; o tooltip abre também no foco). Embaixo, "N de 12
semanas com revisão" e a média de minutos das últimas 8. Sem sequência e sem vermelho por semana
perdida.

### 3. Como está o sistema

`Section` com os seis `HealthCard` da revisão (ver abaixo); cada cartão abre o destino filtrado.

### 4. Histórico

`Section` com "N revisões" e uma `Table` paginada (6 por página) só com as concluídas: data e hora
de início (`parseSqlTime`, no fuso local), duração, passos `feitos/total` (· N pulados, com tooltip
dos pulados), Inbox zero (chip com as cores de Executando, a partir de `md`) e notas (a partir de
`lg`). A linha (focável, rótulo "Abrir revisão de …"), por clique, Enter ou Espaço, abre um `Drawer` (420px, tela cheia abaixo de `md`) com início,
duração, Inbox, os passos de cada fase (`CircleCheck` feito, `CircleMinus` pulado; numa
revisão sobre 8, `mind` e `past` não aparecem) e as notas.

---

## Estado B — revisão em andamento (fluxo guiado)

`components/review/ReviewFlow.tsx` (estrutura) e `ReviewStepBody.tsx` (o conteúdo de cada passo),
com textos e contas em `reviewFlowState.ts` (puro, testado). Entra-se por Começar revisão ou
Retomar; a página guarda o id da revisão ativa em `sessionStorage` (`ticktask:review-active`), então
sair por "Abrir a tela" ou pela sidebar e voltar cai de novo no fluxo, no passo em que estava
(`current_step`). Pausar limpa essa marca e volta à entrada.

### 1. Cabeçalho

"Revisão da semana DD/MM", "Começou há N min · tudo fica salvo, pode sair e voltar", `Progress` com
`N/10` passos marcados (feitos ou pulados) e **Pausar** (grava as notas e volta à entrada).

### 2. Trilho

A partir de `lg`, à esquerda (260px, fixo ao rolar): um `Steps` vertical por fase (Clarear,
Atualizar, Criar). Clicar num passo vai até ele (`review:setCurrentStep`); feito fica concluído,
pulado mostra `CircleMinus` e "Pulado". Embaixo, **Fechar a revisão**. Abaixo de `lg`, um `Select`
agrupado por fase (✓ feito, – pulado) mais a opção "Fechar a revisão".

### 3. Card do passo

Título com fase, "passo N de 10", ícone e nome; à direita, **Abrir a tela** (só o ícone abaixo de
`md`), que grava as notas e leva à tela completa (Inbox, Próximas, Aguardando e Someday em Tarefas,
Calendário, Projetos, Horizontes; Esvaziar a cabeça não tem). Semana que passou e Próximas duas
semanas abrem o Calendário na semana atual ("Abre o Calendário") até a F4-e deixar abrir numa semana
pela URL. Embaixo do título, a pergunta do passo;
o conteúdo fica num `RegionBoundary` próprio. Rodapé: **Anterior**, **Pular** e **Concluir passo**
(primário, `Ctrl+Enter`, escrito no tooltip; o atalho não age com um modal aberto por cima). Marcar um passo vai para o próximo pendente; sem
pendentes, para o fechamento.

| Passo | Conteúdo | Ações (contador) |
| --- | --- | --- |
| Coletar | lugares para olhar (`Tag`) e o campo de captura | Enter cria tarefa no Inbox (coletados) |
| Processar o Inbox | Inbox do mais antigo para o mais novo; vazio vira `Result` "Inbox zero" | Próxima, Aguardando, Someday, Feito (< 2 min), Excluir (processados) |
| Esvaziar a cabeça | gatilhos e captura | Enter (coletados) |
| Próximas ações | da mais parada para a menos; chip âmbar "parada há N dias" acima de 14 | Concluir; Someday e Excluir (tiradas das listas) |
| Semana que passou | `review:pastWeek` por dia: sessões (`Timer`), concluídas (`CircleCheck`), blocos (`CalendarDays`, com a hora) e captura | Enter (coletados) |
| Próximas duas semanas | tarefas abertas com prazo de hoje a 14 dias, por dia, com status e hora | Enter (coletados) |
| Aguardando | da mais parada; `waiting_for` ou "sem responsável"; chip acima de 7 dias | Recebi (volta a Próximas), Cobrar (cria "Cobrar {quem}: {tarefa}" no Inbox; cobranças), Someday |
| Projetos | ativos, `feitas/total` e a próxima ação ou o chip "Sem próxima ação" | `Select` define a próxima (`next_task_id`; próximas definidas); menu: someday ou concluído |
| Someday | projetos e tarefas someday | Ativar; Excluir tarefa (tiradas das listas) |
| Pensar adiante | texto livre, uma ideia por linha (rascunho só na tela) | Mandar para o Inbox (coletados), Rever áreas e metas |

Nomes de tarefa e projeto são links (`#/task/:id`, `#/project/:id`), focáveis pelo teclado. Falha
de IPC numa ação ou na carga de uma lista vai para o `RegionBoundary` do passo (`showBoundary`).
O protótipo marca Esvaziar a cabeça e Semana que passou com uma tag "novo"; no app ela não existe,
porque ficaria para sempre.

As ações das linhas mostram texto a partir de `lg` e só ícone com tooltip abaixo (Excluir sempre só
ícone). Cada captura entra na lista "No Inbox nesta revisão" (`captured`), que vale para todos os
passos com captura.

### 4. Lateral

A partir de `xxl`, coluna de 300px ao lado do card; antes disso, embaixo dele.

- **Sistema nesta revisão**: Inbox, projetos sem próxima ação, aguardando > 7 dias e próximas > 14
  dias, cada um com o valor do começo (`start_health`) → agora, e `CircleCheck` quando chega a zero.
  Os valores de agora são relidos depois de cada ação.
- **Notas da revisão**, salvas sozinhas (600 ms depois de parar de digitar, e ao sair do campo).

### 5. Fechar a revisão

Resumo (Inbox começo → agora, coletados, processados, projetos com próxima ação nova, cobranças,
tiradas das listas), um `Alert` com os passos sem marcar e a duração. **Concluir revisão**: com
passos sem marcar, confirma ("Eles ficam registrados como pulados. Tudo bem: uma revisão parcial
vale mais que nenhuma."); depois volta à entrada com a revisão no histórico.

---

## Dados da revisão

`src/main/reviewQueries.ts` (puro, testado), chamado por `database.ts`; os passos e contadores em
`shared/reviewSteps.ts`. Uma linha de `weekly_reviews` por revisão:

- `checklist_state`: `{ passo: 'done' | 'skipped' }` com as 10 chaves (`collect`, `inbox`, `mind`,
  `next`, `past`, `upcoming`, `waiting`, `projects`, `someday`, `creative`). Passo sem chave está
  pendente. `migrateReviewSteps` leva os 8 passos antigos (`process_inbox`, `review_next`,
  `review_calendar`…) para as chaves novas; nas revisões concluídas antes da mudança, o que não foi
  marcado vira pulado. Numa revisão sobre 8, `mind` e `past` não existem: chave ausente em revisão
  concluída quer dizer "passo que não existia", não "feito".
- `current_step`: o passo em que a revisão está, para retomar de onde parou. Marcar um passo avança
  para o próximo pendente; desfazer volta para ele; `review:setCurrentStep` vai a qualquer passo.
- `step_total`: 10, ou 8 nas revisões que já estavam concluídas quando a coluna nasceu
  (`ensureReviewSchema`, no fim de `initDatabase()`). Uma revisão antiga em andamento passa a 10.
- `counters`: `{ counters: { processed, nextSet, chased, cleaned }, captured: [ids] }`, os
  contadores da sessão (processados, próximas definidas, cobranças, tiradas das listas) e as tarefas
  criadas no Inbox durante a revisão. `collected` é sempre o tamanho de `captured`: contar um item
  coletado exige o id da tarefa.
- `start_health`: o retrato de `healthIndicatorsQuery` no início, para comparar começo e agora mesmo
  depois de pausar.

`started_at` e `completed_at` são gravados em UTC no formato do SQLite (`AAAA-MM-DD HH:MM:SS`);
revisões antigas têm `completed_at` em ISO com `Z`. Leia os dois com `parseSqlTime`.

Só há uma revisão aberta por vez: `review:create` devolve a que está em andamento em vez de abrir
outra; `review:discard` apaga a revisão em andamento (as mudanças feitas nas tarefas ficam).
`review:list` traz todas as concluídas, sem limite; `review:getLast` traz a mais recente, aberta ou
não. Passos e contadores mudam por `review:setStep` e `review:bumpCounter` (recusam revisão
concluída); `review:complete` grava os pendentes como pulados, `completed_at` e `inbox_cleared`;
`review:updateNotes` grava as notas. `review:pastWeek` traz os últimos 7 dias (hoje incluído) por
dia: sessões somadas por tarefa (cortadas no início do intervalo; a que está rodando conta até agora),
tarefas concluídas no período e blocos de tempo que já começaram, mais recentes primeiro. A tool `weekly_review` do
MCP usa as mesmas funções.

---

## `HealthCard` — indicadores de saúde

`components/health/`: `HealthCard` e `HealthGrid` (`HealthCard.tsx`) e os textos e tons em
`healthItems.ts` (puro, testado). É o mesmo cartão do dashboard (F7-b2): os dois leem uma consulta
só, `review:healthIndicators` (`src/main/healthQueries.ts`, testada), com os limiares em
`shared/healthLimits.ts`.

A consulta traz oito indicadores; a revisão mostra seis (`REVIEW_HEALTH`) e o dashboard outros seis
(`DASHBOARD_HEALTH`):

| Indicador | Conta | Ícone | Revisão | Dashboard |
| --- | --- | --- | --- | --- |
| Inbox para processar | tarefas `inbox`; o texto diz há quanto tempo a mais antiga entrou no Inbox | `Inbox` | ✓ | ✓ |
| Projetos sem próxima ação | ativos, com tarefa aberta e sem próxima ação (mesma regra da lista de projetos) | `CircleArrowRight` | ✓ | ✓ |
| Projetos parados | ativos, criados há mais de 7 dias, sem sessão nem tarefa concluída nos últimos 7 | `CirclePause` | | ✓ |
| Aguardando sem resposta | `aguardando` há mais de 7 dias | `Hourglass` | ✓ | ✓ |
| Próximas paradas | `proximas` há mais de 14 dias | `Clock` | ✓ | |
| Prazos vencidos | abertas com prazo antes de hoje | `CalendarX` | ✓ | ✓ |
| Someday | tarefas `someday` | `Lightbulb` | ✓ | |
| Revisão semanal | dias desde a última revisão concluída | `ClipboardCheck` | | ✓ |

"Há mais de N dias em tal status" conta da **última mudança de status**, não da última edição:
`tasks.status_changed_at`, mantida por dois gatilhos do SQLite (`ensureStatusChangedAt`), então vale
para tudo que grava status (telas, MCP, Jira). Em bancos antigos a coluna nasce com `updated_at`.

Tons (ícone num quadrado tingido, valor em Geist 20/600): **em dia** com as cores de Executando e
`CircleCheck` no lugar do ícone; **atenção** com as de Aguardando e o ícone do indicador; **erro**
com as de Urgente, só para prazo vencido; **neutro** com as de Inbox, para Someday, que só informa.
Em dia, o texto troca para a frase de em dia ("Inbox zero", "Nenhum prazo vencido"…). Com `onOpen`
o cartão vira botão com a seta à direita. Na entrada da revisão, cada cartão abre o destino de
`HEALTH_TARGETS`: Inbox e Someday abrem a aba; Aguardando e Próximas abrem a aba só com as paradas
(7 e 14 dias), da mais parada para a menos; Prazos vencidos abre Todas com "Só com prazo vencido";
Projetos sem próxima ação abre Projetos com "Mostrar só esses".
