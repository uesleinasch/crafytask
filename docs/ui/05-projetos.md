# Projetos — `/projects` e `/project/:id`

`src/renderer/src/pages/ProjectsPage.tsx` · `src/renderer/src/pages/ProjectDetailPage.tsx`

No GTD, projeto é qualquer resultado que exige mais de uma ação. No CrafyTask ele agrupa tarefas,
carrega um *outcome* (resultado desejado), uma cor que se propaga para todas as listagens e,
opcionalmente, uma área de foco.

---

# Lista de projetos — `/projects`

`ProjectsPage.tsx` · `components/projects/` (`ProjectCard.tsx`, `ProjectTable.tsx`,
`ProjectCells.tsx`, `NewProjectModal.tsx`, `useProjectMenu.tsx` e `projectList.ts`, puro e testado).
Dados: `project:list` (todos os status de uma vez) e `area:list`; relê em `tasks:refresh`.

## Abas e barra

- **Abas de status** (`Tabs`; `Select` abaixo de `md`): Todos, Ativos (padrão), Someday, Concluídos e
  Arquivados, cada uma com o ícone e a cor do status e o contador em mono (`ProjectTabLabel`).
- **Barra:** busca em nome, resultado desejado, descrição e área (começa com `?q=` da URL, que
  Horizontes usa em "Ver projetos da área"); ordenar (prazo, sem prazo no fim;
  progresso; mais recentes; nome; mais parados primeiro, pela `last_activity_at`); **Cards / Tabela** (`Segmented`, só a partir de `md`: abaixo
  disso é sempre Cards); agrupar por área de foco; **Novo projeto** (primário).
- Visão, ordem e agrupamento ficam em `localStorage` (`ticktask:projectListViewMode`, o valor antigo
  `list` vira Tabela; `ticktask:projects-sort`; `ticktask:projects-by-area`).
- Os projetos vêm todos de uma vez e a filtragem e a ordem são feitas no renderer
  (`visibleProjects`): são poucos, e os contadores das abas precisam da lista inteira.

## Aviso "sem próxima ação"

Nas abas Ativos e Todos, um `Alert` âmbar: "N projetos ativos estão sem próxima ação. Projeto sem
próxima ação fica parado: defina o próximo passo concreto.", com **Mostrar só esses** (filtro, vira
**Mostrar todos**). Sem próxima ação = ativo, com tarefa aberta (não finalizada e não arquivada) e
nenhuma tarefa em Próximas fora do arquivo (`lacksNextAction`).

`?semProxima=1` abre a aba Ativos com **Mostrar só esses** ligado (indicador "Projetos sem próxima
ação").

## Projetos de uma meta

`?meta=<id>` (clicar numa meta em Horizontes) abre a aba Todos só com os projetos daquela meta, sob
um aviso informativo (`Trophy`, "Projetos que servem a "{meta}" · H3", o nível em mono) com **Mostrar
todos**, que tira o filtro e o parâmetro da URL. Sem nenhum projeto, o vazio diz "Nenhum projeto
serve a esta meta ainda." e oferece **Criar projeto para esta meta**, que abre o "Novo projeto" já
com a meta e a área dela. Regras em `projectGoals.ts` (puro, testado).

## Projetos parados

`project:list` traz `last_activity_at`: a mais recente entre a criação do projeto, a última sessão de
tempo de uma tarefa dele (sessão rodando conta como agora) e a última tarefa concluída (pela data da
mudança de status). Parado = ativo e sem atividade há mais de 7 dias (`isStalled`); o SQL da
atividade (`PROJECT_ACTIVITY_JULIAN` em `projectQueries.ts`) é o mesmo do indicador de saúde.
`?parados=1` abre Ativos, ordena por "Mais parados primeiro" e mostra só os parados, com um `Alert`
informativo ("N projetos ativos estão parados. Sem sessão nem tarefa concluída há mais de 7 dias.")
e **Mostrar todos**.

## Card

Grade automática (mínimo 260px). `Card` pequeno e clicável; o nome é o link (é ele que o teclado
alcança): ponto da cor, nome,
status (só na aba Todos) e `⋯`; resultado desejado com `Target`; progresso `feitas/total` com barra
curta; próxima ação (`CircleArrowRight` na cor de Próximas) ou o chip âmbar "Sem próxima ação";
área (ou "Sem área") e prazo com `CalendarDays`. A cor do projeto é só o ponto, nunca fundo nem
borda.

## Tabela

Uma linha por projeto: Projeto (ponto, nome como link e `Target` com o resultado no tooltip) ·
Status (só em Todos) · Área (`lg+`, some ao agrupar) · Próxima ação · Progresso · Prazo (`md+`) ·
Tempo (`xl+`, soma do tempo das tarefas) · `⋯`.

Prazo em mono `DD/MM` com tooltip ("Faltam 3 dias", "Vence hoje", "Venceu há 2 dias"); num projeto
ativo fica âmbar a 7 dias ou menos e vermelho quando venceu.

## Agrupar por área

Grupos na ordem das áreas de Horizontes, mais "Sem área" no fim (inclui área apagada), só os que
têm projeto. Cabeçalho com recolher/expandir, `TrendingUp`, nome e contador; nos Cards é uma faixa
acima da grade, na Tabela uma linha de grupo.

## Menu do projeto

Botão direito no card ou na linha, e o `⋯`: **Abrir** · **Marcar como ▸** (os quatro status, com ✓
no atual) · **Área de foco ▸** (as áreas e "Sem área") · **Meta ▸** (as metas agrupadas por H3, H4
e H5, mais "Sem meta") · **Excluir…**, que pede confirmação e avisa
que as tarefas não são apagadas: ficam sem projeto (`ON DELETE SET NULL`).

## Vazio

"Nenhum projeto aqui." com **Criar projeto**; com busca ou filtro, "Nenhum projeto com esses
filtros." com **Limpar filtros**.

## Novo projeto

`Modal` com Nome, Resultado desejado ("Como fica o mundo quando o projeto estiver pronto?"),
Descrição, Área de foco (`Select`), Meta (`Select` agrupado por nível, com "A que meta, visão ou
propósito este projeto serve?") e Cor (as dez cores de `USER_COLORS`, como rádio). Ao criar, abre
`/project/:id`.

## Dados

`project:list` usa `listProjectsQuery` (`src/main/projectQueries.ts`, testado): uma consulta com a
área, a meta (`goal_id`, `goal_name`; `projects.goal_id` é `ON DELETE SET NULL`), `task_count`, `completed_task_count`, `open_task_count` (sem as arquivadas), `total_seconds`
(soma do tempo das tarefas) e a próxima ação (`next_action` e `next_action_id`: a escolhida em
`projects.next_task_id` se ainda estiver aberta, no projeto e fora do arquivo; senão, a tarefa em
Próximas mais recente fora do arquivo) — no lugar das três consultas por projeto de antes.
`project:get` usa a mesma consulta.

---

# Detalhe do projeto — `/project/:id`

`ProjectDetailPage.tsx` · `components/projects/ProjectHeader.tsx` e `ProjectSummary.tsx` · tarefas
em `components/tasks/TaskListView.tsx`, o mesmo miolo da lista de tarefas. Dados: `project:get`,
`area:list`, `milestone:list` e `task:list` do projeto (todas as abertas e fechadas, fora do arquivo); relê em
`tasks:refresh`. Projeto inexistente mostra um `Result` 404.

## Cabeçalho

- **Voltar:** "← Projetos" e, com área, "/ {área}" como link para `/horizons`.
- **Status:** `Select` pequeno com ícone e cor de cada status.
- **Nome** (ponto da cor + `Input` sem borda, grava ao sair ou com Enter; vazio volta ao anterior)
  e **descrição** (`TextArea` sem borda, grava ao sair).
- **`⋯`:** Copiar nome · Arquivar / Reativar · Excluir projeto… (confirma e avisa que as tarefas
  ficam sem projeto; depois volta para `/projects`).
- **Terminal** (`SquareTerminal`, à esquerda do `⋯`): só com diretório de trabalho; tooltip "Terminal
  em {diretório}". Abre a sessão do projeto no painel do terminal, ou foca a que já existe; com ela em
  foco, esconde o painel. Ver [16-terminal.md](16-terminal.md).

## Pílulas (`PropPill`, as mesmas do detalhe da tarefa)

- **Área de foco** (`TrendingUp`): `Select` com as áreas e "Ver em Horizontes →".
- **Meta** (`Trophy`): o mesmo `Select` agrupado do "Novo projeto" e "Ver em Horizontes →"; o nome
  longo corta com reticências.
- **Prazo** (`CalendarDays`): `DatePicker` e "Remover prazo"; o texto diz "Prazo 12/12 · faltam
  8d" (ou "hoje", "venceu há 3d"), âmbar a 7 dias e vermelho vencido, só em projeto ativo.
- **Cor:** as dez `USER_COLORS` como rádio. Uma cor antiga fora da paleta continua e aparece como
  está até alguém trocar.
- **Diretório de trabalho** (`SquareTerminal`): caminho em mono, "Tarefas sem diretório próprio
  abrem o terminal aqui", **Escolher/Alterar** (`terminal:pickProjectDirectory`) e **Remover**.

## Aviso

"Sem próxima ação definida: o projeto não anda até ter um próximo passo concreto." (`Alert` âmbar
com `TriangleAlert`), quando o projeto está ativo, tem tarefa aberta e nenhuma próxima ação.
**Definir** foca o seletor de próxima ação (abaixo de `md`, troca para a aba Resumo antes).

## Tarefas

`TaskListView` com `project`: as mesmas abas de status (começa em Todas), busca, filtros (sem o de
projeto), Tabela/Cards/Kanban, agrupar (sem "por projeto"), menu de contexto e ações em massa, só
com as tarefas do projeto e sem a coluna/rótulo de projeto. No topo, o campo **"Adicionar tarefa a
{projeto}…"** (Enter cria a tarefa já em Próximas). O **Kanban** aqui vale em qualquer aba e tem
uma coluna por status, vazias inclusive ("Nada aqui"), sem reordenar colunas. Com marcos, o
agrupamento ganha **Agrupar por marco** (ordem dos marcos, "Sem marco" por último) e o menu de
contexto, **Marco ▸**. Visão e agrupamento
do projeto têm chaves próprias em `localStorage` (`ticktask:projectTaskView`,
`ticktask:projectTaskGroup`).

## Resumo

- **Próxima ação:** nome (abre a tarefa), status, contextos e **Iniciar** (timer; desabilitado se
  bloqueada), ou "Nenhuma tarefa marcada como próxima ação."; embaixo, o `Select` "Escolher outra
  tarefa como próxima…" com as tarefas abertas. A escolha grava `projects.next_task_id`; vale
  enquanto a tarefa está aberta, no projeto e fora do arquivo, senão volta a regra antiga (a tarefa
  em Próximas mais recente).
- **Marcos** (`ProjectMilestones.tsx`, logo abaixo da Próxima ação; entre `md` e `lg`, numa linha
  inteira abaixo dos três cards): `Timeline` dos marcos (`milestone:list`, ordem início →
  desenvolvimento por data → fim) com nome (abre o `Modal`), `Tag` do tipo, data com "faltam Nd"
  (tom de `milestoneView.ts` em `colorWarning`/`colorError`, como o prazo), "· próximo" no primeiro aberto, barra das
  tarefas do marco e Concluir/Reabrir (`milestone:setDone`, manual). Com todas as tarefas feitas
  aparece "Todas as tarefas feitas. Concluir marco". **Novo marco** abre o `Modal` (Nome, Tipo em
  `Segmented` com Início/Fim tomados desabilitados, Data, "O que fica pronto"); editar mostra
  **Excluir** com `Popconfirm` (as tarefas ficam sem marco). Dados em `project_milestones`
  (`milestoneQueries.ts`, puro e testado); a tarefa guarda `tasks.milestone_id`.
- **Resultado desejado:** `TextArea` sem borda, grava ao sair.
- **Progresso:** "N de M tarefas" com a porcentagem e a barra; `Statistic` em mono 20: Abertas,
  Bloqueadas (no laranja de Prioridade quando há), Tempo total e Prazo ("12 dias", "venceu").

## Larguras

A partir de `xl`, tarefas à esquerda e o resumo numa coluna de 340px (400 em `xxl`); entre `md` e
`lg`, os três cards em linha acima das tarefas; abaixo de `md`, abas **Tarefas N** e **Resumo**.
