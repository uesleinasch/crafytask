# Dashboard — `/dashboard`

`src/renderer/src/pages/DashboardPage.tsx` (~850 linhas). Gráficos com **Recharts**.

## Função

Analítica retrospectiva: quanto tempo foi para onde, e quão saudável está o sistema GTD. Oito blocos
empilhados numa coluna de `max-w-6xl`, todos carregados de uma vez ao abrir (`Promise.all` com oito
consultas). Enquanto carrega: "Carregando estatísticas..." ocupando a tela inteira.

## Agora (F7-b2)

Seção do topo, sem filtro: o estado atual do sistema (`components/dashboard/DashboardNow.tsx`,
dentro de um `RegionBoundary` "Agora"). Recarrega com o evento `tasks:refresh`.

- **Saúde do sistema:** os seis `HealthCard` de `DASHBOARD_HEALTH` (Inbox, sem próxima ação,
  projetos parados, aguardando, prazos vencidos, revisão), da mesma consulta da revisão semanal
  (`review:healthIndicators`). O Inbox mostra o item mais antigo e a taxa processada na semana.
  Cada cartão leva à lista já filtrada (`HEALTH_TARGETS`).
- **Tarefas abertas por status:** barras horizontais (`HBarList`) na ordem do fluxo (Inbox,
  Próximas, Executando, Aguardando, Someday), chip do status, contagem e %. Contagem de
  `task:statusCounts`, a mesma das abas da lista; clicar abre a aba. O card (`ChartCard`) tem
  "Ver como tabela".

Saíram o título "Dashboard Avançado", o painel "Em execução agora" (o timer já está no header e na
barra de status), as métricas GTD antigas e o funil de fluxo.

## No período (legado até a F7-b3)

Abaixo de um cabeçalho "No período" com **Exportar PDF** (relatório semanal via
`webContents.printToPDF`), seguem os blocos antigos, que a F7-b3 troca pelos de período
(`stats:period`).

### 1. Quatro cartões de resumo (`StatCard`)

Grade `grid-cols-2 md:grid-cols-4`. Ícone num quadrado colorido + valor em `text-2xl font-bold` +
rótulo em `text-xs`.

| Cartão | Ícone / cor | Valor |
| --- | --- | --- |
| Total de Tarefas | `Target` azul | contagem |
| Concluídas | `CheckCircle` esmeralda | contagem |
| Tempo Total | `Clock` roxo | `HH:MM:SS` |
| Sessões | `Activity` laranja | contagem |

### 4. Análise de Energia

`Zap` âmbar. `BarChart` **horizontal** de 220px (uma barra por nível, na cor do nível) ao lado de
três cartões `bg-slate-50`: emoji grande, rótulo, `N tarefas`, tempo total e "média: HH:MM:SS".

Vazio: `Zap` de 32px com `opacity-30`, "Nenhum dado de energia ainda." e "Defina o nível de energia
ao criar tarefas."

### 5. Duas colunas: dia da semana e status

| Bloco | Gráfico |
| --- | --- |
| **Tempo Focado por Dia da Semana** (`Calendar` azul) | `BarChart` vertical de 250px, barras `#3b82f6` com topo arredondado, eixo Y em horas |
| **Tempo por Status** | `PieChart` em rosca (`innerRadius 50` / `outerRadius 80`), com `Legend`; valores em minutos |

Os dados da semana são agrupados por **dia da semana** (Dom…Sáb) somando todas as ocorrências —
é uma média acumulada, não a semana corrente.

### 6. Duas colunas: categoria

| Bloco | Conteúdo |
| --- | --- |
| **Tempo por Categoria** (`AlertTriangle` vermelho) | `PieChart` em rosca com as cores de categoria |
| **Detalhes por Categoria** (`Flag` âmbar) | Lista `bg-slate-50`: ícone da categoria num quadrado tingido com 20% de opacidade, nome, `N tarefas`, tempo total à direita |

Aqui **time leak é roxo** (`#a855f7`), diferente do amarelo usado nos badges da lista de tarefas.

### 7. Top Tarefas (Tempo Investido)

`PieChart` cheio (sem furo) com as **6 tarefas de maior tempo**, rótulos externos sem linha-guia, ao
lado de uma lista com bolinha da cor, nome truncado e tempo. Nomes acima de 15 caracteres são
truncados com "..." no gráfico.

Paleta de 10 cores rotativa (`CHART_COLORS`), independente de qualquer semântica do app.

### 8. Contribuições no Último Ano

Heatmap no estilo GitHub. Colunas = semanas, linhas = dias, quadrados de 12px com `gap-0.5`,
`overflow-x-auto`.

Escala de cor por horas trabalhadas no dia:

| Horas | Classe |
| --- | --- |
| 0 | `bg-slate-100` |
| < 1 | `bg-emerald-200` |
| < 2 | `bg-emerald-300` |
| < 4 | `bg-emerald-400` |
| < 6 | `bg-emerald-500` |
| ≥ 6 | `bg-emerald-600` |

Cada quadrado tem `title` com data e horas (`28/08/2026: 3.4h`). Legenda "Menos ▢▢▢▢▢▢ Mais" à
direita.

Não há rótulos de mês nem de dia da semana — só a malha.

## Padrão visual comum aos blocos

```
<div class="bg-white border border-slate-200 rounded-sm p-6">
  <h3 class="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
    [ícone 20px colorido] Título
  </h3>
  …
</div>
```

Tooltips do Recharts usam `backgroundColor: #fff`, `border: 1px solid #e2e8f0`,
`borderRadius: 8px` — um raio que não corresponde a nenhum outro elemento da tela (`rounded-sm`).

Estado sem dados em cada gráfico: bloco de 250px com "Sem dados disponíveis" centralizado em
`text-slate-400`.

## Observações para o redesenho

- **Três paletas de status coexistem** nesta tela: as constantes locais do dashboard, as de
  `shared/types.ts` e as classes dos badges. Ver [14-design-tokens.md](14-design-tokens.md).
- **Nada é clicável** exceto o painel de timers no topo. Toda métrica é um beco sem saída.
- **Nenhum filtro de período.** Tudo é "sempre" ou uma janela fixa embutida na consulta (7 dias,
  14 dias, 1 ano).
