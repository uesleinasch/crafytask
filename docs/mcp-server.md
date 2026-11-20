# Servidor MCP do CrafyTask

Servidor MCP embutido no processo main, exposto via HTTP em loopback (`127.0.0.1`) e autenticado
por token Bearer. Vive em `src/main/mcp/`: `config.ts` (shape/normalização da config), `store.ts`
(persistência em `userData/mcp-config.json`, 0600), `transport.ts` (HTTP + auth), `server.ts`
(registro das tools), `confirmGuard.ts` (guard de duas fases), `reply.ts`, `resolve.ts`,
`effects.ts`, e `tools/*.ts`.

## Ligar

Em **Ajustes → Servidor MCP**, ative o toggle. O app inicia um `http.Server` local na porta
configurada (padrão `39237`) e mostra o comando de registro pronto para copiar. É possível
regenerar o token a qualquer momento (reinicia o servidor).

## Registrar num cliente MCP

O registro recomendado é via **ponte stdio** (`src/mcp-bridge/`, comando pronto na tela de Ajustes):

```
claude mcp add crafytask --scope user --env ELECTRON_RUN_AS_NODE=1 -- "<executável>" "<userData>/mcp-bridge.js"
```

Dois detalhes importam nesse comando:

- **`--scope user`** — registra para todos os projetos. Com o escopo `local` (padrão), o servidor
  vale só no diretório onde o comando rodou, e cada diretório novo exige repetir o registro e
  reiniciar o cliente.
- **stdio, não HTTP** — quem sobe o processo da ponte é o cliente MCP, então o servidor nunca
  entra em `failed` por o app estar fechado.

O HTTP em loopback continua disponível para clientes que preferirem falar direto com ele:

```
claude mcp add crafytask --scope user --transport http http://127.0.0.1:<porta>/mcp --header "Authorization: Bearer <token>"
```

A diferença prática: nesse modo o CrafyTask **precisa** estar aberto no momento em que a sessão do
cliente inicia, ou o servidor fica indisponível até a sessão ser reiniciada.

## Ponte stdio

`src/mcp-bridge/index.ts` é compilado para `out/main/mcp-bridge.js` (segundo entry do build do
main) e copiado para `userData/mcp-bridge.js` a cada boot — o caminho registrado no cliente precisa
sobreviver a atualizações do app e, no AppImage, ao volume temporário da instalação.

Por frame JSON-RPC lido do stdin, a ponte faz POST no servidor HTTP local. Em `ECONNREFUSED`, ela
abre o app com `--hidden` (bandeja, sem janela), aguarda a porta aceitar conexão (poll de 250 ms,
teto de 20 s) e reenvia. Como o servidor é stateless, o repasse é transparente: tool nova no app
aparece no cliente sem nada a espelhar na ponte.

A config (porta e token) é lida a cada frame, então regenerar o token em Ajustes passa a valer na
chamada seguinte, sem reiniciar o cliente. Todo caminho de falha — MCP desligado, config ausente,
token recusado, app que não abriu no tempo — responde um erro JSON-RPC legível em vez de encerrar
o processo, para o cliente seguir conectado.

Ao subir a ponte com `ELECTRON_RUN_AS_NODE=1`, essa variável é removida do ambiente antes do
`spawn` do app: herdada, faria o Electron subir como Node puro, sem janela e sem servidor.

## Tools

| Tool | Descrição |
| --- | --- |
| `server_info` | Confirma que o CrafyTask está aberto e respondendo (`app: 'CrafyTask'`). |
| `search_tasks` | Lista tasks com filtros (status, categoria, energia, projeto, contexto, busca, datas), no [formato compacto](#formato-compacto); `detail=full` devolve a task inteira. Não inclui subtarefas. |
| `search` | Busca geral por texto (`query`, mínimo 2 caracteres): tasks (nome, descrição e corpo das notas), páginas de caderno, histórico das tasks e projetos. Cada resultado traz `kind`, `id`, `title`, `snippet`, `updated_at` e, no histórico, `task_id`; título que casa vem antes (`title_match`), depois o mais recente. `kinds` limita as fontes, `limit` vai até 50 (padrão 20), `include_archived` inclui tasks arquivadas. |
| `get_task` | Detalhe completo de uma task: campos, notas em Markdown, subtarefas (compactas), dependências, registros de tempo. |
| `create_task` | Cria uma task; projeto/contexto por nome ou id, tags criadas se não existirem. Aceita `scheduled_time`/`scheduled_end_time` (exigem `scheduled_date`) e `due_time` (exige `due_date`), em `HH:MM`, `external_url` (`http(s)`), `waiting_for` (quem ou o quê a task aguarda, até 120 caracteres), `time_limit_minutes`, `recurrence` (`daily`/`weekly`/`monthly`), `working_dir` (caminho absoluto) e `start_command` (terminal da task), `git_branch` (sem espaço, até 200 caracteres) e `pr_url` (`http(s)`). Com `subtasks` (até 30; `name`, `description`, `status`, `category`, `energy`, `due_date`, `project`, `tags`) cria a task e as subtarefas numa transação só: falhou uma, nada é criado. Subtarefa herda projeto e tags da task; não combina com `parent_task_id` nem pede `confirm_token`. A resposta traz a task compacta (`detail=full` para inteira) e, com `subtasks`, a lista `{id, name, status}`. |
| `update_task` | Altera campos de uma task; passar `tags`/`contexts` substitui a lista inteira. Horários em `HH:MM`, `null` remove; limpar a data remove a hora dela, limpar o início remove o fim. `external_url` aceita `http(s)` ou `null` (remove); `waiting_for` aceita texto ou `null`. Fim ≤ início ou hora sem data → erro `validation`. Também aceita `time_limit_minutes`, `recurrence` (`null` remove), `working_dir`, `start_command`, `git_branch` e `pr_url` (`null` remove). A resposta traz a task compacta (`detail=full` para inteira). |
| `bulk_update_tasks` | Altera status/projeto/arquivamento de várias tasks; acima do `bulkThreshold` exige `confirm_token`. O status segue as regras de status abaixo; as tasks recusadas voltam em `status_refused`, e as demais mudam. |
| `delete_tasks` | Deleta tasks permanentemente, incluindo subtarefas em cascata; sempre exige `confirm_token`. |
| `organize_overview` | Retrato GTD: inbox, sem projeto, atrasadas, bloqueadas, someday, métricas. Atrasada = prazo antes de `today`, ou em `today` com `due_time` já passado. |
| `list_structure` | Projetos, contextos, tags (com uso), áreas e metas num só payload. |
| `manage_structure` | Cria/atualiza/remove projeto, contexto, tag, área ou meta; remover e mesclar tag exigem `confirm_token`. |
| `task_dependencies` | `add` faz uma task depender de outra (fica bloqueada até a outra ser finalizada) e recusa ciclo; `remove` desfaz. |
| `time_entries` | Corrige o tempo registrado: `update` muda início e fim de uma sessão encerrada, `delete` apaga uma sessão, `reset` zera o tempo da task. `delete` e `reset` exigem `confirm_token`. O worklog do Jira acompanha. |
| `timer` | Inicia, para, consulta status ou lança tempo manual numa task. Iniciar em task bloqueada devolve `app_state`. |
| `time_report` | Tempo gasto: geral, semanal, por task, registros de uma task, ou `scope=period` (`start`, `end`, `project_id` opcional): as estatísticas do dashboard para o período, com a comparação com o período anterior. |
| `read_notes` | Devolve as notas de uma task convertidas para Markdown; menções saem como `@[Nome](task:123)`. Com `heading`, só aquela seção. |
| `read_drawing` | Devolve o desenho (Excalidraw) de uma task como imagem PNG, com um resumo dos elementos e dos textos contidos. |
| `drawing_guide` | Guia de como montar os elementos de `write_drawing`: formas, texto, setas ligadas por `id`, molduras, cores e um exemplo. |
| `write_drawing` | Cria ou altera o desenho de uma task (`task_id`) ou página (`page_id`) a partir de elementos simplificados do Excalidraw. `mode=append` (padrão) acrescenta; `mode=replace` sobre desenho existente exige `confirm_token`. O JSON e o PNG são gerados pela janela principal e gravados juntos. |
| `write_notes` | Grava Markdown nas notas (ver [Markdown das notas](#markdown-das-notas)); `mode=append` (recomendado), `mode=section` (com `heading`: troca só o que está sob aquele título, ver [Edição por seção](#edicao-por-secao)) ou `mode=replace` sobre nota não vazia, que exige `confirm_token`. |
| `work_session` | Sessão de trabalho numa task. `start` põe a task (e a pai) em `executando`, liga o timer e devolve o último checkpoint, o histórico recente e as subtarefas; `pause` para o timer, grava um checkpoint e move para `aguardando` (com `waiting_for`) ou `proximas`; `finish` para o timer, grava o checkpoint final e move para `finalizada` (recusa com subtarefa aberta); `status` lista o que está em `executando` (subtarefas também) e os timers ligados. Com `directory` no lugar de `task_id`, `start` acha a task pela pasta (`working_dir` da task ou do projeto; a pasta mais específica vence): abre a que está em `executando` (a subtarefa, não a pai), devolve `ambiguous` com as candidatas ou `not_found`; `status` lista só o que é daquela pasta. `start`, `pause` e `finish` aceitam `session_id` (gravado no histórico) e `git_branch` (gravada na task); `start` devolve `git_branch`, `pr_url` e `previous_session` (`session_id`, `at` e `resume`: `claude --resume <id>`), a última sessão que escreveu no histórico da task ou de uma subtarefa. |
| `task_history` | Histórico e memória da task. `read` devolve mudanças de status e entradas escritas (mais recentes primeiro, `limit`/`before`) e o último checkpoint; `add` grava `checkpoint` (estado atual, `done`, `remaining`), `operation` ou `note`. `include_subtasks` junta o histórico das subtarefas. `add` aceita `session_id` (fica na entrada; as entradas lidas trazem `session_id`) e `git_branch` (fica na task). |
| `agenda` | Tasks agendadas e blocos de tempo de um dia, semana ou mês. |
| `plan_day` | Agenda tasks numa data (itens de `schedule` aceitam `start_time`/`end_time`, gravados como horário da task), ordena o dia (a `order` só pesa entre as tasks sem horário e sem prazo de hoje com hora), cria/remove blocos de tempo; acima do `bulkThreshold` exige `confirm_token`. |
| `weekly_review` | `status` (revisão aberta, última e indicadores de saúde), `list` (concluídas), `past_week` (sessões, conclusões e blocos dos últimos 7 dias), `start` (abre a revisão; se já há uma em andamento, devolve essa com `already_open`, sem mexer nas notas), `step` (passo feito, pulado ou pendente), `notes` e `complete` (pendentes viram pulados). |
| `list_notebooks` | Cadernos, seções e páginas (subpáginas em ordem de árvore, `depth` 0–2); `notebook_id` limita a um caderno. |
| `search_pages` | Busca páginas de caderno pelo título e pelo texto das notas (até 30, com trecho). |
| `read_page` | Página em Markdown, com caderno, seção e subpáginas; o PNG do desenho vem junto quando existe. Com `heading`, o Markdown traz só aquela seção das notas. |
| `create_page` | Cria página numa seção, opcionalmente como subpágina (até 2 níveis) e já com Markdown. |
| `write_page` | Grava Markdown numa página; mesmas regras de `write_notes` (`mode=section` com `heading`; `mode=replace` sobre conteúdo exige confirmação). |
| `delete_page` | Apaga a página e as subpáginas; sempre exige `confirm_token`. |
| `manage_notebooks` | Estrutura dos cadernos: cria, renomeia e apaga caderno e seção (apagar sempre exige `confirm_token` e leva as páginas junto); renomeia e move página (`section_id`, `parent_page_id`, `index`). |
| `integrations` | Aciona integrações já configuradas: `gcal_sync` (liga/desliga a task na agenda do Google), `notion_sync`, `jira_import`, `jira_transitions` e `jira_transition` (muda o status no Jira; sempre exige `confirm_token`), `export_task` (regrava o Markdown local) e `backup`. Integração não configurada devolve `app_state`. |
| `briefing` | Retrato do momento numa chamada: `running` (timers), `executando` (com o último checkpoint: `summary`, `remaining`, `at`), `today` (tasks do dia e `time_blocks`), `overdue` (mesma regra de `organize_overview`), `waiting` (com `waiting_days`), `inbox_count` e `warnings` (timer em task fora de `executando`; task em `executando` sem timer e sem checkpoint há mais de 1 dia). Com `directory`, traz `here` (projeto e tasks da pasta). Cada seção tem `total` e até 10 itens compactos; `date` troca o dia de referência. |
| `notify` | Notificação do sistema (`title` até 80, `body` até 300 caracteres), mesmo com o app na bandeja. Com `task_id`, o clique abre a task. No máximo uma a cada 10 s; antes disso devolve `app_state` com `retry_after_seconds`. |
| `open_in_app` | Mostra e foca a janela principal numa task, projeto ou página (`target` + `id`) ou numa tela (`target=screen` + `screen`, lista fechada: as telas da barra lateral). |

## Prompts

O servidor também publica prompts (`mcp/prompts.ts`). No Claude Code eles viram comandos
`/mcp__crafytask__<nome>`; aparecem depois de reiniciar a sessão do cliente.

| Comando | Argumento | O que faz |
| --- | --- | --- |
| `/mcp__crafytask__retomar` | `task_id` (opcional) | Abre a sessão de trabalho pelo id ou pela pasta atual, lê o último checkpoint e o histórico, resume o que falta e pergunta se segue. |
| `/mcp__crafytask__planejar-dia` | `date` (opcional, `AAAA-MM-DD`) | Chama `briefing`, propõe a ordem e os blocos do dia e só grava com `plan_day` depois do ok. |
| `/mcp__crafytask__revisao` | — | Conduz a revisão semanal: abre, mostra os números de cada passo, marca cada um e conclui. |
| `/mcp__crafytask__capturar` | `texto` | Cria uma task no inbox com o texto, sem perguntas. |
| `/mcp__crafytask__encerrar` | — | Para cada task em `executando` em que a conversa trabalhou, grava o resumo e pausa ou conclui. |

## Markdown das notas

`read_notes`, `read_page` e o `notes_markdown` de `get_task` escrevem, e `write_notes`,
`write_page` e `create_page` leem de volta sem perda (`notesMarkdown.ts` e
`markdownToProsemirror.ts`, com teste de ida e volta):

| Construção | Markdown |
| --- | --- |
| Títulos (níveis 1 a 6), parágrafo, citação, linha, bloco de código | `# Título`, texto, `> citação`, `---`, cercas de três crases |
| Lista, lista numerada | `- item`, `1. item` |
| Checklist | `- [ ] a fazer`, `- [x] feito` |
| Tabela | tabela GFM (`\| a \| b \|` e a linha `\| --- \| --- \|`); a primeira linha é o cabeçalho |
| Negrito, itálico, riscado, destaque, sublinhado, código, link | `**x**`, `*x*`, `~~x~~`, `==x==`, `<u>x</u>`, crase, `[texto](url)` |
| Menção | `@[Nome](task:123)`, `@[Nome](project:5)`, `@[Nome](page:9)`, `@[Nome](context:2)` |

Menção a um id que não existe entra como texto (`@Nome`). O export local em Markdown continua
escrevendo a menção só como `@Nome`.

## Edição por seção

`write_notes` e `write_page` com `mode=section` e `heading` trocam só o conteúdo sob aquele título
(`notesSection.ts`): a seção vai do título até o próximo título de nível igual ou maior, então os
subtítulos de dentro saem junto. O título fica; se o Markdown novo começar repetindo o mesmo
título, ele não é duplicado. O resto do documento não é tocado.

- O título é comparado pelo texto, sem diferenciar maiúsculas; `## Plano` e `Plano` valem igual.
- Título não encontrado devolve `not_found`; título repetido, `ambiguous`. Os dois trazem
  `headings`, a lista de títulos da nota com o nível.
- Não pede `confirm_token`: a resposta traz `previous_markdown`, o conteúdo que saiu, para desfazer.
- `read_notes` e `read_page` aceitam `heading` para ler só uma seção.

## Formato compacto

As listagens de tasks (`search_tasks`, `briefing`, `organize_overview`, `agenda`, `timer` e `work_session` com
`status`, as subtarefas de `get_task`) e as respostas de `create_task` e `update_task` devolvem cada
task assim (`mcp/taskView.ts`):

`id`, `name`, `status`, `category`, `energy`, `project` (nome), `due_date`, `due_time`,
`scheduled_date`, `scheduled_time`, `tags` (nomes), `contexts` (nomes), `is_blocked`, `is_running`,
`waiting_for`, `subtasks` (`"feitas/total"`), `jira_key`, `parent_id` (quando é subtarefa), `git_branch` e `pr_url`.

Campo nulo, vazio ou `false` não aparece: ausência de `is_blocked` quer dizer "não bloqueada", e
ausência de `category` quer dizer `normal`.
Descrição, datas de criação, tempo acumulado e os demais campos vêm com `detail=full`
(`search_tasks`, `create_task`, `update_task`) ou com `get_task`. O corpo das notas só sai em
`read_notes` e no `notes_markdown` de `get_task`.

## Mapa de cobertura

O que a tela faz e por onde o MCP faz o mesmo.

| Recurso do app | Pelo MCP |
| --- | --- |
| Achar um texto em qualquer lugar (tasks, notas, páginas, histórico, projetos) | `search` |
| Listar, ver, criar, editar e apagar tasks; subtarefas | `search_tasks`, `get_task`, `create_task` (`parent_task_id`, `subtasks`), `update_task`, `bulk_update_tasks`, `delete_tasks` |
| Status, com as regras de bloqueio e recorrência | `update_task`, `bulk_update_tasks`, `work_session` |
| Timer, tempo manual, corrigir e zerar sessões | `timer`, `time_entries` |
| Relatórios e estatísticas do dashboard | `time_report` |
| Dependências entre tasks | `task_dependencies` |
| Recorrência, limite de tempo, aguardando, link externo | `create_task`, `update_task` |
| Branch, pull request e sessão do Claude ligados à task | `update_task` (`git_branch`, `pr_url`), `work_session` e `task_history` (`session_id`, `git_branch`); ainda sem campo na tela |
| Terminal da task (pasta e comando) | `update_task` (`working_dir`, `start_command`); abrir o terminal é só na tela |
| Notas | `read_notes`, `write_notes` |
| Desenho | `read_drawing`, `write_drawing`, `drawing_guide` |
| Histórico e memória da task | `task_history`, `work_session` |
| Projetos, contextos, tags, áreas e metas | `list_structure`, `manage_structure` |
| Hoje, calendário e blocos de tempo | `agenda`, `plan_day` |
| Revisão semanal e indicadores de saúde | `weekly_review`, `organize_overview` |
| Visão do momento (o que roda, hoje, atrasos, onde parou) | `briefing` |
| Cadernos, seções e páginas | `list_notebooks`, `search_pages`, `read_page`, `create_page`, `write_page`, `delete_page`, `manage_notebooks`, `write_drawing` (`page_id`) |
| Google Calendar, Notion, Jira, export local, backup | `integrations` |
| Notificação do sistema e abrir uma tela | `notify`, `open_in_app` |

Fica só na tela, de propósito:

- configurar integrações (credenciais, boards, mapeamento, opções) e o próprio servidor MCP;
- restaurar backup, que fecha o banco e reinicia o app;
- preferências (aparência, fluxo de trabalho, atalho de captura, autostart);
- editar campos do Jira e reordenar cadernos e seções;
- janelas e terminal: captura rápida, timer flutuante, sessões de terminal.

## Regras de status

Toda mudança de status pelo MCP (`update_task`, `bulk_update_tasks`, `work_session`) passa por
`taskStatusService.ts`, o mesmo caminho do app:

- `executando` em task bloqueada por dependência é recusado (`app_state`);
- concluir subtarefa de pai bloqueado é recusado;
- finalizar task recorrente cria a próxima ocorrência; reabrir desfaz;
- concluir a última subtarefa fecha a task pai;
- concluir uma task avisa o app das dependentes que ficaram livres.

## Histórico automático

As tools que escrevem numa task gravam sozinhas uma entrada `operation` (origem `mcp`) no histórico
dela, sem o agente chamar `task_history`: `update_task` (só os nomes dos campos, ex.: "Alterado:
prazo, projeto"), `write_notes`, `write_drawing`, `task_dependencies`, `timer` (`add_manual_time`),
`time_entries` e `integrations` (`gcal_sync`, `jira_transition`, `export_task`). Subtarefa criada ou
apagada entra no histórico da task pai. Os textos saem de `mcp/operationSummary.ts`.

Ficam de fora: leituras, mudança só de status (já está em `task_status_events`) e `timer`
`start`/`stop` (já é sessão de tempo). Falha ao gravar a entrada não derruba a tool. O histórico
não é podado: cresce com o uso (um limite por task fica para avaliar depois).

## Instruções ao cliente

O servidor envia `instructions` no `initialize` (`mcp/instructions.ts`): o que está sendo feito fica
em `executando`, nada fica em `executando` sem trabalho em curso, e cada etapa vira um checkpoint
no histórico. O cliente lê esse texto uma vez por sessão, então mudar as regras exige reiniciar a
sessão do cliente.

## Guard de confirmação

Operações destrutivas ou em massa seguem um fluxo de duas fases (`confirmGuard.ts`):

1. Primeira chamada sem `confirm_token` devolve `code: needs_confirmation`, um preview do que será
   afetado e um `confirm_token` (UUID, TTL de 5 minutos, uso único).
2. O agente mostra o preview ao usuário e repete a chamada com o mesmo `confirm_token`.
3. O token é validado contra um hash da operação exata (`kind` + payload) — não serve para uma
   operação diferente, mesmo que pareça similar, e é descartado no primeiro uso.

`delete_tasks`, `manage_structure` (delete/merge_tag), `delete_page`, `write_notes`/`write_page`
(`mode=replace` sobre nota não vazia), `write_drawing` (`mode=replace` sobre desenho existente) e
`time_entries` (`delete` e `reset`), `manage_notebooks` (`delete`) e `integrations`
(`jira_transition`) sempre exigem confirmação. `bulk_update_tasks` e `plan_day` só exigem acima do
`bulkThreshold` configurado (padrão 5 itens).

## Limitações conhecidas

- O servidor só responde enquanto o app CrafyTask está aberto (não há processo headless). Com a
  ponte stdio isso deixa de exigir ação sua — ela abre o app quando necessário —, mas a primeira
  chamada nesse caso paga o tempo de inicialização do app (~1–3 s).
- O app agora vive na bandeja: fechar a janela não encerra o processo, então o servidor continua
  de pé. Encerrar de verdade é pelo item "Sair" no ícone da bandeja.
- `search_tasks` não retorna subtarefas — use `get_task` para o detalhe de uma task específica.
- `git_branch`, `pr_url` e a sessão do cliente são o que o agente informa: o app não roda `git` nem
  confere se a branch ou o PR existem. São colunas locais: não vão ao Notion nem ao Jira.
- `search` usa `LIKE` (sem distinguir maiúsculas só em letras sem acento) sobre o texto puro das
  notas (`tasks.notes_text`, `notebook_pages.search_text`). Não há índice de texto: se a busca
  ficar lenta num banco grande, o caminho é FTS5.
- `write_notes` e `write_page` não representam imagem, quebra de linha dentro do parágrafo, lista
  aninhada nem tamanho de fonte: `mode=replace` sobre uma nota com isso perde esse conteúdo.
- Deletar uma task pai apaga as subtarefas em cascata — não há como recuperar depois de confirmado.
- `write_drawing` depende da janela principal: é ela que converte os elementos e gera o PNG
  (`drawing:renderRequest` → `lib/drawingRender.ts` → `drawing:renderResult`, com limite de 20 s).
  A janela pode estar minimizada ou escondida na bandeja, mas precisa existir e ter terminado de
  carregar. Se a aba Desenho da mesma task ou página estiver aberta no app, ela não recarrega
  sozinha, e o próximo salvamento dela sobrescreve o que o MCP gravou.
- `read_drawing` serve o PNG gerado no último save feito no app. Um desenho criado numa versão
  antiga do app, antes da coluna `drawing` existir, não tem imagem para servir.
