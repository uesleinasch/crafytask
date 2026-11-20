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
| `search_tasks` | Lista tasks com filtros (status, categoria, energia, projeto, contexto, busca, datas). Não inclui subtarefas. |
| `get_task` | Detalhe completo de uma task: campos, notas em Markdown, subtarefas, dependências, registros de tempo. |
| `create_task` | Cria uma task; projeto/contexto por nome ou id, tags criadas se não existirem. Aceita `scheduled_time`/`scheduled_end_time` (exigem `scheduled_date`) e `due_time` (exige `due_date`), em `HH:MM`, `external_url` (`http(s)`), `waiting_for` (quem ou o quê a task aguarda, até 120 caracteres), `time_limit_minutes`, `recurrence` (`daily`/`weekly`/`monthly`), `working_dir` (caminho absoluto) e `start_command` (terminal da task). |
| `update_task` | Altera campos de uma task; passar `tags`/`contexts` substitui a lista inteira. Horários em `HH:MM`, `null` remove; limpar a data remove a hora dela, limpar o início remove o fim. `external_url` aceita `http(s)` ou `null` (remove); `waiting_for` aceita texto ou `null`. Fim ≤ início ou hora sem data → erro `validation`. Também aceita `time_limit_minutes`, `recurrence` (`null` remove), `working_dir` e `start_command` (`null` remove). |
| `bulk_update_tasks` | Altera status/projeto/arquivamento de várias tasks; acima do `bulkThreshold` exige `confirm_token`. O status segue as regras de status abaixo; as tasks recusadas voltam em `status_refused`, e as demais mudam. |
| `delete_tasks` | Deleta tasks permanentemente, incluindo subtarefas em cascata; sempre exige `confirm_token`. |
| `organize_overview` | Retrato GTD: inbox, sem projeto, atrasadas, bloqueadas, someday, métricas. Atrasada = prazo antes de `today`, ou em `today` com `due_time` já passado. |
| `list_structure` | Projetos, contextos, tags (com uso), áreas e metas num só payload. |
| `manage_structure` | Cria/atualiza/remove projeto, contexto, tag, área ou meta; remover e mesclar tag exigem `confirm_token`. |
| `task_dependencies` | `add` faz uma task depender de outra (fica bloqueada até a outra ser finalizada) e recusa ciclo; `remove` desfaz. |
| `time_entries` | Corrige o tempo registrado: `update` muda início e fim de uma sessão encerrada, `delete` apaga uma sessão, `reset` zera o tempo da task. `delete` e `reset` exigem `confirm_token`. O worklog do Jira acompanha. |
| `timer` | Inicia, para, consulta status ou lança tempo manual numa task. Iniciar em task bloqueada devolve `app_state`. |
| `time_report` | Tempo gasto: geral, semanal, por task, registros de uma task, ou `scope=period` (`start`, `end`, `project_id` opcional): as estatísticas do dashboard para o período, com a comparação com o período anterior. |
| `read_notes` | Devolve as notas de uma task convertidas para Markdown. |
| `read_drawing` | Devolve o desenho (Excalidraw) de uma task como imagem PNG, com um resumo dos elementos e dos textos contidos. |
| `drawing_guide` | Guia de como montar os elementos de `write_drawing`: formas, texto, setas ligadas por `id`, molduras, cores e um exemplo. |
| `write_drawing` | Cria ou altera o desenho de uma task (`task_id`) ou página (`page_id`) a partir de elementos simplificados do Excalidraw. `mode=append` (padrão) acrescenta; `mode=replace` sobre desenho existente exige `confirm_token`. O JSON e o PNG são gerados pela janela principal e gravados juntos. |
| `write_notes` | Grava Markdown nas notas; `mode=append` (recomendado) ou `mode=replace` sobre nota não vazia, que exige `confirm_token`. |
| `work_session` | Sessão de trabalho numa task. `start` põe a task (e a pai) em `executando`, liga o timer e devolve o último checkpoint, o histórico recente e as subtarefas; `pause` para o timer, grava um checkpoint e move para `aguardando` (com `waiting_for`) ou `proximas`; `finish` para o timer, grava o checkpoint final e move para `finalizada` (recusa com subtarefa aberta); `status` lista o que está em `executando` e os timers ligados. |
| `task_history` | Histórico e memória da task. `read` devolve mudanças de status e entradas escritas (mais recentes primeiro, `limit`/`before`) e o último checkpoint; `add` grava `checkpoint` (estado atual, `done`, `remaining`), `operation` ou `note`. `include_subtasks` junta o histórico das subtarefas. |
| `agenda` | Tasks agendadas e blocos de tempo de um dia, semana ou mês. |
| `plan_day` | Agenda tasks numa data (itens de `schedule` aceitam `start_time`/`end_time`, gravados como horário da task), ordena o dia (a `order` só pesa entre as tasks sem horário e sem prazo de hoje com hora), cria/remove blocos de tempo; acima do `bulkThreshold` exige `confirm_token`. |
| `weekly_review` | `status` (revisão aberta, última e indicadores de saúde), `list` (concluídas), `past_week` (sessões, conclusões e blocos dos últimos 7 dias), `start` (abre a revisão; se já há uma em andamento, devolve essa com `already_open`, sem mexer nas notas), `step` (passo feito, pulado ou pendente), `notes` e `complete` (pendentes viram pulados). |
| `list_notebooks` | Cadernos, seções e páginas (subpáginas em ordem de árvore, `depth` 0–2); `notebook_id` limita a um caderno. |
| `search_pages` | Busca páginas de caderno pelo título e pelo texto das notas (até 30, com trecho). |
| `read_page` | Página em Markdown, com caderno, seção e subpáginas; o PNG do desenho vem junto quando existe. |
| `create_page` | Cria página numa seção, opcionalmente como subpágina (até 2 níveis) e já com Markdown. |
| `write_page` | Grava Markdown numa página; mesmas regras e perdas de `write_notes` (`mode=replace` sobre conteúdo exige confirmação). |
| `delete_page` | Apaga a página e as subpáginas; sempre exige `confirm_token`. |
| `manage_notebooks` | Estrutura dos cadernos: cria, renomeia e apaga caderno e seção (apagar sempre exige `confirm_token` e leva as páginas junto); renomeia e move página (`section_id`, `parent_page_id`, `index`). |
| `integrations` | Aciona integrações já configuradas: `gcal_sync` (liga/desliga a task na agenda do Google), `notion_sync`, `jira_import`, `jira_transitions` e `jira_transition` (muda o status no Jira; sempre exige `confirm_token`), `export_task` (regrava o Markdown local) e `backup`. Integração não configurada devolve `app_state`. |

## Mapa de cobertura

O que a tela faz e por onde o MCP faz o mesmo.

| Recurso do app | Pelo MCP |
| --- | --- |
| Listar, ver, criar, editar e apagar tasks; subtarefas | `search_tasks`, `get_task`, `create_task` (`parent_task_id`), `update_task`, `bulk_update_tasks`, `delete_tasks` |
| Status, com as regras de bloqueio e recorrência | `update_task`, `bulk_update_tasks`, `work_session` |
| Timer, tempo manual, corrigir e zerar sessões | `timer`, `time_entries` |
| Relatórios e estatísticas do dashboard | `time_report` |
| Dependências entre tasks | `task_dependencies` |
| Recorrência, limite de tempo, aguardando, link externo | `create_task`, `update_task` |
| Terminal da task (pasta e comando) | `update_task` (`working_dir`, `start_command`); abrir o terminal é só na tela |
| Notas | `read_notes`, `write_notes` |
| Desenho | `read_drawing`, `write_drawing`, `drawing_guide` |
| Histórico e memória da task | `task_history`, `work_session` |
| Projetos, contextos, tags, áreas e metas | `list_structure`, `manage_structure` |
| Hoje, calendário e blocos de tempo | `agenda`, `plan_day` |
| Revisão semanal e indicadores de saúde | `weekly_review`, `organize_overview` |
| Cadernos, seções e páginas | `list_notebooks`, `search_pages`, `read_page`, `create_page`, `write_page`, `delete_page`, `manage_notebooks`, `write_drawing` (`page_id`) |
| Google Calendar, Notion, Jira, export local, backup | `integrations` |

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
- `write_notes` converte um subconjunto de Markdown; menções `@` a outras tasks, tabelas e imagens
  do editor Tiptap não sobrevivem à conversão.
- Deletar uma task pai apaga as subtarefas em cascata — não há como recuperar depois de confirmado.
- `write_drawing` depende da janela principal: é ela que converte os elementos e gera o PNG
  (`drawing:renderRequest` → `lib/drawingRender.ts` → `drawing:renderResult`, com limite de 20 s).
  A janela pode estar minimizada ou escondida na bandeja, mas precisa existir e ter terminado de
  carregar. Se a aba Desenho da mesma task ou página estiver aberta no app, ela não recarrega
  sozinha, e o próximo salvamento dela sobrescreve o que o MCP gravou.
- `read_drawing` serve o PNG gerado no último save feito no app. Um desenho criado numa versão
  antiga do app, antes da coluna `drawing` existir, não tem imagem para servir.
