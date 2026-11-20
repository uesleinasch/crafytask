# Dashboard — `/dashboard`

`src/renderer/src/pages/DashboardPage.tsx` (casca) e `components/dashboard/`. Desenho no guia
(`docs/design/guia-de-design.md` §8 "Dashboard") e no protótipo (rota `#dashboard`).

## Função

Responde duas perguntas, nessa ordem: **o sistema está em dia?** e **para onde foi o tempo?** A
página usa o `PageContainer` (até 1480px) e tem duas seções, cada uma num `RegionBoundary`
("Agora", "No período"). Toda métrica abre o que ela conta.

## Agora

Estado atual, sem filtro (`DashboardNow.tsx`). Recarrega com o evento `tasks:refresh`.

- **Saúde do sistema:** os seis `HealthCard` de `DASHBOARD_HEALTH` (Inbox, sem próxima ação,
  projetos parados, aguardando, prazos vencidos, revisão), da mesma consulta da revisão semanal
  (`review:healthIndicators`). O Inbox mostra o item mais antigo e a taxa processada na semana
  (`task_status_events`). Cada cartão leva à lista já filtrada (`HEALTH_TARGETS`).
- **Tarefas abertas por status:** barras horizontais (`HBarList`) na ordem do fluxo (Inbox,
  Próximas, Executando, Aguardando, Someday), chip do status, contagem e %. Contagem de
  `task:statusCounts`, a mesma das abas da lista; clicar abre a aba.

## No período

`DashboardPeriod.tsx`, sobre uma consulta só: `stats:period` (`StatsPeriod` → `PeriodStats`,
`src/main/statsQueries.ts`). Também recarrega com `tasks:refresh`.

- **Filtros** numa linha, valendo para tudo abaixo: `Segmented` 7 dias / 30 dias / 90 dias /
  12 meses (padrão 30), `RangePicker` (sem datas futuras, até 365 dias) e `Select` de projeto (ativos e
  someday). O cabeçalho da seção mostra o período e o projeto. Enquanto recarrega, o conteúdo fica
  a 55% de opacidade (`aria-busy`), sem skeleton.
- **Exportar PDF** no fim da linha: `report:weeklyPDF` com o período, nome sugerido
  `crafytask-dashboard-<início>_<fim>.pdf`; imprime a janela (`printToPDF`) e abre o arquivo.
- **Tempo focado:** número herói (48px, sans), diferença neutra para o período anterior de mesmo
  tamanho e média por dia útil. Colunas por dia (até 31 dias), semana (segunda, até 120) ou mês, na
  cor recuada, e a atual (hoje, esta semana, este mês) na cor da série. Escala do eixo em horas
  redondas (`niceMaxHours`).
- **Três números** ao lado: tarefas concluídas (pela data da mudança para Finalizada), sessões de
  foco e média por sessão, cada um com a diferença.
- **Para onde foi o tempo**, com `Segmented` Projeto / Área / Contexto no cabeçalho (troca a
  visão, não filtra). Projeto abre o projeto e "Sem projeto" abre a lista com `?projeto=sem`; área
  abre Horizontes; contexto abre a lista com o contexto. "Sem área" e "Sem contexto" não abrem
  nada. Tempo de uma tarefa com vários contextos conta em cada um.
- **Tarefas com mais tempo** (oito, ponto do projeto e o nome dele no tooltip e na tabela),
  abrindo a tarefa.
- **Por categoria:** chip, "N tarefas" e tempo; abre a lista filtrada pela categoria
  (`?categoria=`). Com time leak acima de 10% do tempo, uma frase avisa, sem culpa.
- **Por nível de energia:** medidor, média por tarefa e tempo; abre a lista filtrada pela energia
  (`?energia=`).
- **Quando você foca:** heatmap dia da semana × hora (6h–23h, segunda primeiro), escala
  sequencial.
- **Constância:** heatmap de dias do período em semanas (segunda a domingo), com rótulo de mês;
  hoje contornado; "N de M dias com sessão de foco".
- **Vazio:** sem sessão no período, um `Empty` só no lugar dos gráficos, com "Todos os projetos" e
  "Ver 12 meses". A seção Agora continua.

Todo gráfico fica num `ChartCard` (título com ícone, botão "Ver como tabela", `RegionBoundary`
próprio) e tem tooltip no hover e no foco do teclado. Barras, colunas e heatmaps são HTML com as
cores de `CHART_COLORS` (`theme/semantic.ts`), uma cor só por gráfico; a identidade vem do ponto,
do chip ou do medidor. Diferenças são neutras: seta e texto secundário, sem verde nem vermelho.

Tempo vem das sessões (`time_entries`), recortadas no período e em agora (a sessão aberta conta),
divididas por dia e hora locais. Subtarefa entra no projeto da tarefa mãe.

## Responsivo

Grade `Row`/`Col`: herói e números lado a lado a partir de `xl` (16/8), cards de dois em dois a
partir de `lg`, heatmaps 14/10 em `xl`. No celular os filtros ocupam a largura toda, o botão de PDF
fica só com o ícone e os heatmaps rolam na horizontal dentro do card. Abaixo de 576px a barra vira
nome e valor numa linha e a trilha embaixo.

## O que saiu

Título "Dashboard Avançado", painel "Em execução agora", métricas GTD antigas, funil, pizzas,
"Tempo por status" e as consultas `stats:weekly`, `stats:taskTime`, `stats:status`,
`stats:category`, `stats:heatmap`, `stats:general` e `stats:energy` (o MCP continua usando as
funções de semana, tarefas e geral).
