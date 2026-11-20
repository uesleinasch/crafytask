# Arquivo — `/archived`

`src/renderer/src/pages/ArchivePage.tsx` · `components/tasks/archiveView.ts` (puro, testado) ·
`components/tasks/FloatingActionBar.tsx`

## Função

Consultar, restaurar ou apagar de vez as tarefas arquivadas. Arquivar (`is_archived = 1`) é diferente
de finalizar (`status = 'finalizada'`): uma tarefa pode ser arquivada em qualquer status, e some de
todas as outras listagens. O nome na navegação e no título é **Arquivo**.

## Dados

- Arquivar grava `tasks.archived_at` (UTC) e desarquivar limpa; as arquivadas antes da coluna
  receberam o `updated_at`.
- A tabela vem de `listTasks({ archived: true, search, status, projectId, archivedAfter, sort })`:
  filtro e ordem no SQL. Os filtros de data comparam a data local (`date(archived_at, 'localtime')`).
  A busca casa nome, descrição e `#id` (ou o número).
- O topo usa `task:totals` (contagem e soma de `total_seconds` do arquivo inteiro); o alerta de "mais
  de um ano" e o modal de limpeza usam `task:countArchivedBefore`.
- A tela relê tudo a cada `tasks:refresh`; falha de leitura vai para o `RegionBoundary` da rota.

## Topo

Frase do que é arquivar, com o link **Projetos → Arquivados** (`/projects`), e o total em mono:
"12 tarefas · 21h 17min registradas". Com tarefas arquivadas há mais de um ano, um `Alert` informa
quantas e oferece **Revisar e limpar**.

## Filtros

Uma linha que quebra: busca "Buscar por nome ou #id" (debounce de 250 ms), projeto (Todos, Sem
projeto e cada projeto com o ponto da cor), status ao arquivar, "Arquivada em" (Qualquer data,
Últimos 30 dias, Últimos 90 dias, Último ano), ordenar (Arquivadas por último, nome, mais tempo
registrado), agrupar (por mês — padrão —, por projeto, sem agrupamento) e `⋯` com **Limpar o
arquivo…**. Abaixo de `md`, status e ordenação somem e voltam ao padrão.

## Tabela

`Table` do antd com linhas de grupo no mesmo estilo da lista (`ct-table-grouprow`): mês com
`CalendarDays` e nome do mês, ou projeto com o ponto da cor (`Folder` para "Sem projeto"), e o total
do grupo. Colunas: ID (mono), Tarefa (abre `/task/:id`), Status (o que a tarefa tinha ao ser
arquivada, com tooltip), Projeto (só `lg`, some ao agrupar por projeto), Arquivada em (`DD/MM/AA`,
data completa no tooltip; só `lg`), Tempo (`md`) e ações: **Desarquivar** (`md`) e `⋯`. Abaixo de
`lg`, projeto e data descem para baixo do nome. Botão direito na linha abre o mesmo menu: Abrir (só
leitura) · Desarquivar · Excluir de vez…. Sem agrupamento, pagina de 20 em 20.

Abrir leva ao detalhe em modo só leitura, com a faixa "Arquivada em … · só leitura" e Desarquivar
(ver [02](02-detalhe-da-tarefa.md), "Estados especiais").

## Ações

- **Desarquivar** (linha, menu ou massa): `task:bulkSetArchived(ids, false)` e mensagem "N tarefas
  voltaram para as listas · Desfazer". Desfazer chama `task:restoreArchived` com as datas originais.
- **Excluir de vez**: `modal.confirm` com o tempo de sessões que vai junto e o aviso do Notion e do
  Google; usa `task:bulkDelete`.
- **Ações em massa**: seleção por checkbox e a mesma barra flutuante da lista (`FloatingActionBar`),
  com Desarquivar e Excluir de vez.
- **Limpar o arquivo**: `Modal` com "Arquivadas há mais de 3 meses / 6 meses / 1 ano / 2 anos", a
  contagem que vai sair e a dica de backup. Uma confirmação só: `task:deleteArchivedBefore`, com os
  mesmos efeitos do `task:bulkDelete` (Notion, Google, terminais).

## Estados

- Carregando: `Spin`.
- Arquivo vazio: "Nada no arquivo." e como arquivar.
- Filtros sem resultado: "Nenhuma tarefa arquivada com esses filtros." e **Limpar filtros**.

## Limitações

Subtarefa arquivada com pai ativo não aparece (a listagem filtra `parent_task_id IS NULL`).
