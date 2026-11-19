# Revisão semanal — `/review`

`src/renderer/src/pages/WeeklyReviewPage.tsx`

## Função

Conduzir o ritual que, no GTD, mantém o sistema confiável: um checklist de 10 passos, com indicadores
objetivos de saúde do sistema ao lado, registrado no histórico ao final.

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
  (`daysSinceLastReview`): "Nenhuma revisão ainda", "Em dia: a última foi há N dias" (até 7) ou "A
  última foi há N dias", e aí o texto avisa que passou de uma semana. Sempre "Leva uns 45 minutos e
  dá para pausar no meio."
- As três fases (`REVIEW_PHASES`: Clarear, Atualizar, Criar) em `.ct-rvphases`, com número, nome,
  resumo e quantos passos.
- **Começar revisão** (primário, grande, `CirclePlay`): o único botão de começar da tela. Some
  quando há revisão aberta (aí o caminho é Retomar).

### 2. Ritmo (`xl` 9/24)

As 12 últimas semanas (início pela preferência do calendário, segunda por padrão) em quadrados
`.ct-rvweek`: com revisão concluída, tom 4 da escala sequencial de gráfico e um `Check`; sem, tom 0.
Cada quadrado é focável, com tooltip e rótulo acessível (semana, data e duração). Embaixo, "N de 12
semanas com revisão" e a média de minutos das últimas 8. Sem sequência e sem vermelho por semana
perdida.

### 3. Como está o sistema

`Section` com os seis `HealthCard` da revisão (ver abaixo); cada cartão abre o destino filtrado.

### 4. Histórico

`Section` com "N revisões" e uma `Table` paginada (6 por página) só com as concluídas: data e hora
de início (`parseSqlTime`, no fuso local), duração, passos `feitos/total` (· N pulados, com tooltip
dos pulados), Inbox zero (chip com as cores de Executando, a partir de `md`) e notas (a partir de
`lg`). A linha, por clique ou Enter, abre um `Drawer` (420px, tela cheia abaixo de `md`) com início,
duração, Inbox, os passos de cada fase (`CircleCheck` feito, `CircleMinus` pulado; numa
revisão sobre 8, `mind` e `past` não aparecem) e as notas.

---

## Estado B — revisão em andamento

Até a F5-c4 trocar este estado pelo fluxo guiado, ele mantém o checklist antigo. Entra-se por
Começar revisão ou Retomar.

### 1. Banner de progresso

`bg-emerald-50 border-emerald-200`:

- esquerda: "Revisão em andamento" + "Iniciada em {data por extenso}";
- **Pausar** (grava as notas digitadas e volta à entrada, com o `Alert` de retomar);
- direita: `{feitos}/{total}` em `text-lg font-bold` + "itens concluídos";
- abaixo, barra de 8px `bg-emerald-500` com a fração concluída.

### 2. Saúde do Sistema

Os mesmos seis `HealthCard` da entrada, **sem título de seção**, entre o banner e o checklist.

### 3. Checklist

Título "Checklist da Revisão". Dez botões de largura total, cada um alternando entre feito e pendente:

| # | id | Rótulo | Ícone | Descrição |
| --- | --- | --- | --- | --- |
| 1 | `collect` | Coletar itens soltos | `Inbox` | Reúna papéis, recibos, notas e pensamentos que ficaram fora do sistema. |
| 2 | `inbox` | Processar Inbox | `ClipboardCheck` | Alcance Inbox Zero — classifique cada item: ação, projeto, referência ou lixo. |
| 3 | `mind` | Esvaziar a cabeça | `Cloud` | O que ainda está ocupando sua cabeça? Anote tudo o que aparecer. |
| 4 | `next` | Revisar Próximas Ações | `Calendar` | As próximas ações ainda são relevantes? Alguma pode ser concluída ou removida? |
| 5 | `past` | Olhar a semana que passou | `History` | Reuniões, sessões e entregas dos últimos 7 dias geraram alguma ação? |
| 6 | `upcoming` | Revisar Calendário | `Clock` | O que vem nas próximas duas semanas? Precisa preparar algo? |
| 7 | `waiting` | Revisar Aguardando | `Hourglass` | Alguém respondeu? Precisa fazer follow-up em algo pendente? |
| 8 | `projects` | Revisar Projetos | `FolderKanban` | Cada projeto ativo tem progresso? Existe próxima ação definida? |
| 9 | `someday` | Revisar Someday/Maybe | `Lightbulb` | Algum item está pronto para ser ativado? Algum pode ser descartado? |
| 10 | `creative` | Pensamento Criativo | `Sparkles` | Que mais precisa de atenção? Novos projetos ou ideias? |

Cada item:
- `CheckCircle2` esmeralda quando marcado, `Circle` cinza quando não;
- rótulo em `font-semibold`, **riscado e esmeralda** quando marcado;
- descrição em `text-xs text-slate-500`;
- o cartão inteiro ganha `border-emerald-200 bg-emerald-50/50` quando marcado.

O badge "Inbox Zero" do histórico vem de `inbox_cleared`, gravado ao concluir: verdadeiro quando o
Inbox está vazio naquele momento.

**Nenhum item leva à tela correspondente.** "Revisar Projetos" não abre `/projects`, "Revisar
Calendário" não abre `/calendar`. O usuário navega por conta própria e volta — e, ao voltar, a
revisão continua onde estava (o estado vive no banco).

### 4. Notas e conclusão

Cartão branco com:
- título "Notas da Revisão";
- `Textarea` de 3 linhas, placeholder "Observações, insights, próximos passos...";
- botão de largura total `bg-emerald-600`, sempre habilitado: *"Concluir Revisão Semanal"* com
  todos os passos feitos, *"Concluir com N passos pulados"* quando falta algum. Os passos pendentes
  são gravados como pulados.

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
o cartão vira botão com a seta à direita. Na revisão, cada cartão abre o destino de
`HEALTH_TARGETS`: Inbox e Someday abrem a aba; Aguardando e Próximas abrem a aba só com as paradas
(7 e 14 dias), da mais parada para a menos; Prazos vencidos abre Todas com "Só com prazo vencido";
Projetos sem próxima ação abre Projetos com "Mostrar só esses". Antes de sair, as notas digitadas são
gravadas na revisão em andamento, que continua de onde estava (checklist e notas) ao voltar.
