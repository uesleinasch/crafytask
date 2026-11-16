# Ferramentas MCP

Com o [servidor MCP](../integracoes/mcp.md) ligado, um assistente de IA pode chamar estas
ferramentas. Você não precisa saber os nomes: basta pedir em linguagem natural ("planeje meu dia
com as tarefas urgentes", "registre 30 minutos na tarefa X", "resuma a página de reunião de ontem").
A lista ajuda a saber o que é possível.

Ferramentas marcadas com **confirmação** devolvem primeiro uma prévia e só executam quando o
assistente repete a chamada com o `confirm_token` — ele deve mostrar a prévia para você antes.

## Tarefas

| Ferramenta | O que faz |
| --- | --- |
| `search_tasks` | lista tarefas com filtros (status, categoria, energia, projeto, contexto, busca, datas); não inclui subtarefas |
| `get_task` | detalhe completo: campos, notas em Markdown, subtarefas, dependências, registros de tempo |
| `create_task` | cria uma tarefa; projeto/contexto por nome ou id, tags criadas se não existirem; aceita horários e link externo |
| `update_task` | altera campos; `tags`/`contexts` substituem a lista inteira |
| `bulk_update_tasks` | altera status/projeto/arquivamento de várias tarefas — **confirmação** acima de 5 itens |
| `delete_tasks` | exclui tarefas e subtarefas — sempre com **confirmação** |

## Organização

| Ferramenta | O que faz |
| --- | --- |
| `organize_overview` | retrato GTD: inbox, sem projeto, atrasadas, bloqueadas, someday, métricas |
| `list_structure` | projetos, contextos, tags (com uso), áreas e metas |
| `manage_structure` | cria/atualiza/remove projeto, contexto, tag, área ou meta — remover e mesclar tag com **confirmação** |

## Tempo

| Ferramenta | O que faz |
| --- | --- |
| `timer` | inicia, para, consulta ou lança tempo manual numa tarefa |
| `time_report` | tempo gasto: geral, semanal, por tarefa ou registros de uma tarefa |

## Notas e desenho

| Ferramenta | O que faz |
| --- | --- |
| `read_notes` | notas de uma tarefa em Markdown |
| `write_notes` | grava Markdown nas notas; `mode=append` (recomendado) ou `mode=replace` — substituir nota não vazia pede **confirmação** |
| `read_drawing` | desenho da tarefa como PNG, com resumo dos elementos e textos |

## Planejamento

| Ferramenta | O que faz |
| --- | --- |
| `agenda` | tarefas agendadas e blocos de tempo de um dia, semana ou mês |
| `plan_day` | agenda tarefas numa data, ordena o dia, cria/remove blocos de tempo — **confirmação** acima de 5 itens |
| `weekly_review` | lê revisões anteriores e indicadores de saúde, ou registra uma revisão nova |

## Cadernos

| Ferramenta | O que faz |
| --- | --- |
| `list_notebooks` | cadernos, seções e páginas em árvore |
| `search_pages` | busca páginas pelo título e pelo texto (até 30 resultados, com trecho) |
| `read_page` | página em Markdown, com o PNG do desenho quando existe |
| `create_page` | cria página numa seção, opcionalmente como subpágina e já com Markdown |
| `write_page` | grava Markdown numa página — substituir conteúdo pede **confirmação** |
| `delete_page` | apaga a página e as subpáginas — sempre com **confirmação** |

## Diagnóstico

| Ferramenta | O que faz |
| --- | --- |
| `server_info` | confirma que o app está aberto e respondendo (responde `app: 'TickTask'`, nome mantido por compatibilidade) |

Referência técnica completa, com parâmetros e limitações: [Servidor MCP](../mcp-server.md).
