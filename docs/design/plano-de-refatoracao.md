# Plano de refatoração visual

Como sair da interface atual (Tailwind + shadcn/Radix, cores soltas, navegação só na home) para a
interface do [guia de design](guia-de-design.md) e do [protótipo](prototipo/index.html), sem parar o
app e sem um PR gigante.

O progresso é medido pelo script de auditoria:

```bash
npm run design:audit                 # tudo
npm run design:audit -- --fase=F1    # uma fase
npm run design:audit -- --pendentes  # só o que falta
```

Cada item do [checklist](prototipo/checklist.json) tem um id (`F2.3`). As subtarefas abaixo citam os
ids que elas fecham. Itens marcados como manuais só fecham quando o usuário confere o visual no app.

## Estratégia

- **Migração por tela, não por componente.** O antd entra na fase F0 e convive com o Tailwind até a
  F9. Cada tela é migrada inteira numa subtarefa: nada de tela meio antd, meio shadcn.
- **O shell vem primeiro.** Com o AppShell pronto (F1), toda tela antiga já ganha navegação lateral,
  isolamento de falhas e barra de status, mesmo antes de ser migrada.
- **O modo escuro fica atrás de uma flag até a F7.** As telas antigas não têm tokens escuros. O
  seletor de tema só aparece em Configurações quando todas as telas estiverem migradas; até lá, a
  flag `ticktask:theme` é ligada à mão por quem desenvolve.
- **Tailwind fica só para layout.** Depois da migração, classes de cor do Tailwind são proibidas
  (`F9.1`); espaçamento e flex/grid podem continuar, se não houver equivalente direto no antd.
- **Uma subtarefa = um PR** em `production`, no fluxo do CLAUDE.md (`feature/…`, squash). Cada PR
  roda `npm run typecheck && npm run lint && npm run test` e o `design:audit` da fase.
- **Comportamento não muda junto com o visual**, a não ser onde o plano diz (as lacunas da
  [lista de inconsistências](../ui/15-inconsistencias.md) que a refatoração resolve estão citadas em
  cada fase).

## Ordem e dependências

```text
F0 Fundação ──► F1 Shell ──► F2 Lista ──► F3 Detalhe
                    │            └──► F6 Rótulos e arquivo
                    ├──► F4 Hoje e calendário
                    ├──► F5 Projetos, horizontes e revisão
                    ├──► F7 Cadernos, dashboard e configurações
                    └──► F8 Janelas auxiliares
F2..F8 ──► F9 Limpeza
```

F2 vem antes das outras telas porque cria os chips de status, categoria e energia que todas usam.
Depois de F2, as fases F3 a F8 podem andar em qualquer ordem.

## F0 — Fundação: antd, tema e tokens

Sem mudança visível nas telas atuais, exceto a fonte.

| Subtarefa                      | Entrega                                                                                                                                                                                                                                                                                                                                                 | Fecha      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| F0-a Instalar antd e fontes    | `antd@^6.7` e `react-error-boundary`, `@fontsource-variable/geist` e `geist-mono`. Camadas CSS para o antd conviver com o Tailwind v4 sem o preflight quebrar componentes. Corrige `--font-sans`/`--font-mono`, que apontam para variáveis inexistentes.                                                                                                | F0.1, F0.2 |
| F0-b Tokens e cores semânticas | `src/renderer/src/theme/tokens.ts` (paleta clara e escura) e `theme/semantic.ts` (status, categoria, energia, escala de time leak, paleta de gráficos). Teste vitest que calcula o contraste WCAG de cada par texto/fundo nos dois temas. Os exports mortos de `shared/types.ts` (`STATUS_COLORS`, `CATEGORY_COLORS`) passam a apontar para cá ou saem. | F0.3, F0.4 |
| F0-c Provider de tema          | `ConfigProvider` (com `cssVar`) e `App` do antd na raiz, algoritmos claro/escuro e compacto, preferências `ticktask:theme` e `ticktask:density`; o tema vai ao main por IPC e vira `nativeTheme.themeSource`, para as três janelas mudarem juntas. Guardado contra a execução nas três janelas.                                                         | F0.5–F0.8  |
| F0-d Conferir a fundação       | Usuário confere fonte, paleta e um componente antd de exemplo nos dois temas.                                                                                                                                                                                                                                                                           | F0.9       |

## F1 — AppShell e navegação

| Subtarefa               | Entrega                                                                                                                                                                                                                                                                                    | Fecha                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| F1-a RegionBoundary     | Boundary com `Result` ("Esta área falhou", "Tentar de novo", "Copiar detalhes") sobre `react-error-boundary`, reset ao trocar de rota ou de id, `showBoundary` para erro de IPC, `onCaughtError`/`onUncaughtError` no `createRoot`, `render-process-gone` tratado no main. Teste do reset. | F1.3                                  |
| F1-b AppShell           | `Layout` + `Sider` + `Header` + `Content` + barra de status, rotas aninhadas no `HashRouter`, navegação agrupada (Fluxo, Organizar, Conhecimento, rodapé com Arquivo e Configurações) em todas as rotas. `TitleBar` sai. Cada região dentro de um `RegionBoundary`. Resolve B1, B2 e B4.   | F1.1, F1.2, F1.5, F1.10, F1.13, F1.14 |
| F1-c Shell responsivo   | Sider recolhido (64px) abaixo de `lg`, `Drawer` abaixo de `md`. Janela principal com `minWidth` 400 (hoje 800).                                                                                                                                                                            | F1.4, F1.11                           |
| F1-d Header de comando  | Grid de três zonas: título à esquerda, captura rápida inline **no centro** (mesmo IPC da janela de captura), à direita pílula de timers em execução com popover (unifica C2), busca, aparência e Nova tarefa.                                                                              | F1.6, F1.7, F1.15                     |
| F1-e Paleta de comandos | `Ctrl+K`: navegar entre telas e buscar tarefas e páginas pelos IPCs que já existem (`listTasks` com `search` e `limit`, busca de cadernos).                                                                                                                                                | F1.8                                  |
| F1-f Barra de status    | Estado do Notion, Google Calendar, Jira e MCP numa faixa de 28px. Substitui o `SyncNotification`. Explica que fechar a janela manda para a bandeja (B5).                                                                                                                                   | F1.9                                  |
| F1-g Conferir o shell   | Usuário confere de 480px a 1920px e a falha simulada isolada.                                                                                                                                                                                                                              | F1.12                                 |

## F2 — Lista de tarefas

| Subtarefa                   | Entrega                                                                                                                                                                                                                                                                                                                                                                                                            | Fecha                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| F2-a Contagem por status    | IPC `task:statusCounts` (uma query `GROUP BY status`, mesmos filtros da lista) e abas de status com `Tabs` do antd: ícone, rótulo e contador. As abas continuam sendo a navegação principal da tela.                                                                                                                                                                                                               | F2.1, F2.2                       |
| F2-b Chips de domínio       | `StatusChip`, `CategoryChip`, `EnergyMeter` em `components/chips/`, lendo `theme/semantic.ts`. Substituem `StatusBadge` e `CategoryBadge` em todo o app. Resolve A1 e A3.                                                                                                                                                                                                                                          | F2.7                             |
| F2-c Barra de ferramentas   | Busca com debounce (F6), filtros em `Popover` (e `Drawer` abaixo de `md`), `Segmented` para Tabela/Cards/Kanban, `Select` de agrupamento. Uma chave de agrupamento só, para acabar com os estados contraditórios de reabertura.                                                                                                                                                                                    | F2.5, F2.8                       |
| F2-d Tabela                 | `Table` do antd conforme o guia §8 "Tabela de tarefas": coluna ID, Status só em "Todas", colunas por breakpoint, altura de linha constante (sem barra nem contador sob o nome), `ContextsCell` (primeiro + N com popover editável), subtarefas em linhas expansíveis (`checkStrictly`), linhas de cabeçalho de grupo (projeto/contexto) recolhíveis com tempo somado, fundo de time leak, botão Hoje, timer e `⋯`. | F2.3, F2.11, F2.12, F2.13, F2.14 |
| F2-e Cards, grupos e Kanban | Mesmos chips, grade responsiva, cards automáticos abaixo de `md`, aviso de que agrupar por contexto repete tarefas (F4).                                                                                                                                                                                                                                                                                           | F2.6                             |
| F2-f Ações em massa e menu  | `BulkActionBar` flutuante só com seleção; `TaskContextMenu` (botão direito e `⋯`) com abrir, timer, hoje, status, categoria, projeto, contextos, copiar, arquivar e excluir, agindo sobre a seleção quando a linha faz parte dela; `modal.confirm` citando a quantidade. Alerta de processamento no Inbox.                                                                                                         | F2.4, F2.9, F2.15                |
| F2-g Conferir a lista       | Usuário confere tabela, cards, grupos e Kanban nos dois temas.                                                                                                                                                                                                                                                                                                                                                     | F2.10                            |

## F3 — Detalhe da tarefa

| Subtarefa                     | Entrega                                                                                                                                                                                                                                                                                                                                      | Fecha             |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| F3-a Layout do detalhe        | Cabeçalho + área de trabalho (notas/desenho) + inspetor à direita a partir de `xl` (escondível), inspetor em `Drawer` em `md`/`lg`, abas Notas/Tempo/Detalhes/Relações no estreito (guia §7). Modo foco em tela cheia (`FocusOverlay`).                                                                                                      | F3.1, F3.4, F3.6  |
| F3-b Cabeçalho e propriedades | Status, `#id`, etiqueta Jira, nome e descrição, bloco do timer, ações (terminal, Jira, inspetor, menu `⋯` com zerar/arquivar/excluir) e `TaskPropertyBar` com pílulas em `Popover` (categoria, projeto, contextos, prazo, energia; programado, recorrência, tags e link por "+ Propriedade"). Aviso de bloqueio. Nada sai do painel de hoje. | F3.9, F3.10       |
| F3-c Inspetor                 | `TaskInspector` com abas Tempo (limite, totais, sessões, ajustes), Detalhes (Jira, Google Calendar, ambiente) e Relações (subtarefas, dependências, issues filhas). Cronômetro do cabeçalho em Geist Mono tabular. `DependencySelector` busca no main (F7).                                                                                  | F3.3, F3.7, F3.11 |
| F3-f Editar sessões           | IPC `timeEntry:update` e `timeEntry:delete` (query pura + teste), total recalculado, e o worklog do Jira acompanha: editar reenvia, excluir apaga (`jira_worklog_id`). Edição inline e exclusão com `Popconfirm` na lista de sessões.                                                                                                        | F3.8              |
| F3-d Editores isolados        | `RegionBoundary` em volta do Tiptap, do Excalidraw e do terminal. Tema escuro do editor e do xterm a partir dos tokens.                                                                                                                                                                                                                      | F3.2              |
| F3-e Conferir o detalhe       | Usuário confere as três larguras e os três modos.                                                                                                                                                                                                                                                                                            | F3.5              |

## F4 — Hoje e calendário

| Subtarefa         | Entrega                                                                                                                                              | Fecha |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| F4-a Plano do dia | Lista ordenável, carga planejada contra a jornada (`Progress`), resumo da semana ao lado (abaixo no estreito). Texto do estado vazio corrigido (D5). | F4.1  |
| F4-b Calendário   | Grade semanal e mensal com as cores de categoria dos tokens e legenda certa (D4).                                                                    | F4.2  |
| F4-c Conferir     | Usuário confere Hoje e Calendário.                                                                                                                   | F4.3  |

## F5 — Projetos, horizontes e revisão

| Subtarefa               | Entrega                                                                                                                                                                                                                                                                                                                    | Fecha             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| F5-a Lista de projetos  | Guia §8 "Projetos": abas de status com contador, busca, ordenação, Cards/Tabela, agrupar por área, aviso e filtro "sem próxima ação", menu de contexto.                                                                                                                                                                    | F5.1, F5.5, F5.6  |
| F5-e Detalhe do projeto | Cabeçalho e pílulas (área editável: E2; prazo; cor; diretório), aviso sem próxima ação, a tabela de tarefas reaproveitada e filtrada pelo projeto com "Adicionar tarefa" (E1) e Kanban por status, coluna de resumo (próxima ação, resultado desejado, progresso). Próxima ação escolhida: coluna `projects.next_task_id`. | F5.2, F5.7, F5.8  |
| F5-b Horizontes         | Guia §8 "Horizontes": escala única H0–H5 nos tokens, níveis em `Card`, trilho lateral, filtro por área atravessando os níveis, tudo clicável (task, projeto, área, meta), "+ Adicionar" no nível certo, mover meta de nível, confirmação ao excluir área e meta (E6).                                                      | F5.3, F5.9, F5.10 |
| F5-c Revisão semanal    | Checklist em que cada item abre a tela que ele revisa (E5). Uma ação primária só (B3).                                                                                                                                                                                                                                     | F5.3              |
| F5-d Conferir           | Usuário confere as três telas.                                                                                                                                                                                                                                                                                             | F5.4              |

## F6 — Rótulos e arquivo

| Subtarefa             | Entrega                                                                                                                                                                                                                                                                                  | Fecha                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| F6-a Contextos e tags | `LabelsPage` com abas e os mesmos recursos (guia §8 "Contextos e tags"): uso e abertas, busca, ordenar, só sem uso, Cards/Tabela, prévia ao vivo, mesclar (novo para contextos: IPC `context:merge`), exclusão com contagem, clicar abre a lista filtrada (E3). Um nome só: "Tags" (D1). | F6.1, F6.3, F6.4, F6.5, F6.6 |
| F6-b Arquivo          | O arquivo vira uma visão da lista de tarefas (filtro `archived`), com busca e ações em massa (C3). Um nome só: "Arquivo" (D2).                                                                                                                                                           | F6.2                         |

## F7 — Cadernos, dashboard, terminal e configurações

| Subtarefa                  | Entrega                                                                                                                                                                                                                                                     | Fecha            |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| F7-a Cadernos              | Árvore com `Tree`/`Menu` do antd, editor isolado por boundary.                                                                                                                                                                                              | —                |
| F7-b Dashboard             | Gráficos com a paleta de `theme/semantic.ts`; métricas e alertas clicáveis (E4).                                                                                                                                                                            | F7.2             |
| F7-c Terminal              | Painel e abas de sessão no tema, cores do xterm dos tokens.                                                                                                                                                                                                 | —                |
| F7-d Configurações         | Guia §8 "Configurações": navegação agrupada com busca e estado das integrações, `SettingRow` em cards, guias em `Steps`, seção Aparência (tema com miniaturas e densidade). Libera o seletor de tema para o usuário.                                        | F7.1, F7.4, F7.5 |
| F7-f Preferências de fluxo | Seção Fluxo de trabalho com backend: jornada, início da semana, níveis e repetição do time leak, faixa do calendário, avisos de prazo, intervalo das notas no Notion, atalho da captura editável e backup automático. Hoje tudo isso é fixo no código (E8). | F7.6             |
| F7-e Conferir              | Usuário confere as quatro telas.                                                                                                                                                                                                                            | F7.3             |

## F8 — Janelas auxiliares

| Subtarefa                             | Entrega                                                                                     | Fecha |
| ------------------------------------- | ------------------------------------------------------------------------------------------- | ----- |
| F8-a Timer flutuante e captura rápida | Mesmo tema (claro/escuro) e mesma fonte da janela principal, mantendo as geometrias atuais. | F8.1  |
| F8-b Conferir                         | Usuário confere as duas janelas.                                                            | F8.2  |

## F9 — Limpeza do legado

| Subtarefa             | Entrega                                                                                                                                                                      | Fecha     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| F9-a Remover o legado | Sai shadcn, Radix, `class-variance-authority`, `sonner`, `components/ui/`, `Timer.tsx` e `Versions.tsx`; nenhuma classe de cor do Tailwind e nenhum hex solto em componente. | F9.1–F9.6 |
| F9-b Documentação     | `docs/ui/` reescrito para a interface nova, `docs/ui/14-design-tokens.md` passa a apontar para `theme/`, guias do site com capturas novas, notas de release.                 | F9.7      |

## Riscos

| Risco                                            | Como tratar                                                                                                          |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Preflight do Tailwind e estilos do antd brigando | Ordem de camadas CSS definida em F0-a e conferida pelo usuário antes de seguir.                                      |
| Bundle maior (antd + ícones) nas três janelas    | O antd faz tree-shaking por import nomeado; Excalidraw já é `React.lazy`. Medir `out/renderer` antes e depois de F0. |
| Tiptap e Excalidraw com estilos próprios         | Ficam fora do tema do antd; recebem as variáveis CSS dos tokens para fundo, texto e borda.                           |
| Regressão de comportamento ao trocar componentes | Comportamentos documentados em `docs/ui/` são o roteiro de teste manual de cada tela.                                |
| PR grande demais                                 | A unidade é a subtarefa. Se passar de ~600 linhas de diff, divida.                                                   |
