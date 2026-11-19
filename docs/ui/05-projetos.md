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
- **Barra:** busca em nome, resultado desejado, descrição e área; ordenar (prazo, sem prazo no fim;
  progresso; mais recentes; nome); **Cards / Tabela** (`Segmented`, só a partir de `md`: abaixo
  disso é sempre Cards); agrupar por área de foco; **Novo projeto** (primário).
- Visão, ordem e agrupamento ficam em `localStorage` (`ticktask:projectListViewMode`, o valor antigo
  `list` vira Tabela; `ticktask:projects-sort`; `ticktask:projects-by-area`).
- Os projetos vêm todos de uma vez e a filtragem e a ordem são feitas no renderer
  (`visibleProjects`): são poucos, e os contadores das abas precisam da lista inteira.

## Aviso "sem próxima ação"

Nas abas Ativos e Todos, um `Alert` âmbar: "N projetos ativos estão sem próxima ação. Projeto sem
próxima ação fica parado: defina o próximo passo concreto.", com **Mostrar só esses** (filtro, vira
**Mostrar todos**). Sem próxima ação = ativo, com tarefa aberta e nenhuma tarefa em Próximas
(`lacksNextAction`).

## Card

Grade automática (mínimo 260px). `Card` pequeno e clicável (Enter também abre): ponto da cor, nome,
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
no atual) · **Área de foco ▸** (as áreas e "Sem área") · **Excluir…**, que pede confirmação e avisa
que as tarefas não são apagadas: ficam sem projeto (`ON DELETE SET NULL`).

## Vazio

"Nenhum projeto aqui." com **Criar projeto**; com busca ou filtro, "Nenhum projeto com esses
filtros." com **Limpar filtros**.

## Novo projeto

`Modal` com Nome, Resultado desejado ("Como fica o mundo quando o projeto estiver pronto?"),
Descrição, Área de foco (`Select`) e Cor (as dez cores de `USER_COLORS`, como rádio). Ao criar, abre
`/project/:id`.

## Dados

`project:list` usa `listProjectsQuery` (`src/main/projectQueries.ts`, testado): uma consulta com a
área, `task_count`, `completed_task_count`, `total_seconds` (soma do tempo das tarefas) e a próxima
ação (`next_action` e `next_action_id`: a tarefa em Próximas mais recente) — no lugar das três
consultas por projeto de antes. `project:get` usa a mesma consulta.

---

# Detalhe do projeto — `/project/:id`

## Cabeçalho

- **Esquerda:** `← Projetos` (volta para a lista, não para `/`).
- **Direita:** `Select` de status de 160px (`bg-slate-100 border-none font-semibold`) com as quatro
  opções, e um botão vermelho quadrado só com `Trash2` que abre o `DeleteConfirmDialog`.

## Corpo (`max-w-3xl mx-auto`)

### Identidade

- Bolinha de 20px com a cor do projeto (`border border-black/10`) + **título editável inline** em
  `text-3xl font-bold` — campo transparente com borda inferior que aparece no hover.
- **Descrição** — `textarea` transparente que ganha `hover:bg-white/50` ao passar o mouse.
- **`ColorPicker`** logo abaixo, salvando a cada clique. Trocar a cor aqui repinta o projeto em
  todas as listagens e no Kanban.

Título, descrição, outcome e data limite salvam no **blur** (uma única chamada que envia os quatro).

### Dois cartões lado a lado

| Cartão | Conteúdo |
| --- | --- |
| **Resultado Desejado** (`Target` verde) | `textarea` `bg-slate-50` de altura mínima 80px |
| **Data Limite** (`Clock` azul) | `input[type=date]` e, abaixo, um bloco **Progresso** com `{feitas} / {total} tarefas`, porcentagem e barra de 8px |

O cartão da direita acumula duas coisas sem relação (prazo e progresso) porque o da esquerda ficou
com apenas um campo.

### Diretório de trabalho

Cartão de largura total (`SquareTerminal` laranja) com o caminho em `font-mono`, **Escolher** /
**Alterar** (diálogo de pasta do sistema, `terminal:pickProjectDirectory`) e `×` para remover. Grava
`projects.working_dir`, coluna local (não vai ao Notion). As tasks do projeto sem diretório próprio
abrem o terminal nessa pasta — ver [16-terminal.md](16-terminal.md).

### Tarefas do projeto

Título de seção `Tarefas do Projeto (N)` em `text-sm font-bold uppercase tracking-wider
text-slate-400`.

Cada tarefa é uma linha clicável (`rounded-lg px-4 py-3`) com:
- `StatusChip` + `CategoryChip` na primeira linha;
- nome truncado na segunda;
- à direita, `Activity` pulsante se rodando e o tempo em `font-mono tabular-nums`.

**Não há como criar ou vincular tarefa a partir daqui.** O estado vazio diz exatamente isso:
*"Nenhuma tarefa vinculada a este projeto. Vincule tarefas editando-as e selecionando este projeto."*
É uma lacuna funcional relevante — o caminho natural (estar no projeto e adicionar uma ação) não
existe.

## O que não é editável pela interface

- **Área de foco** (`area_id`) — na lista de projetos, pelo diálogo **Novo projeto** e pelo menu
  (**Área de foco ▸**); o detalhe do projeto ainda não a edita (F5-e). O MCP (`manage_structure`)
  também grava.
- **Próxima ação** — é derivada, não escolhida: é o nome da tarefa com status `proximas` de
  `updated_at` mais recente naquele projeto.
