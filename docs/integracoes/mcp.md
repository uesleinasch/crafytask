# MCP (Claude Code e outros clientes)

O CrafyTask tem um servidor **MCP** (*Model Context Protocol*) embutido. Com ele ligado, um
assistente como o **Claude Code** consegue listar, criar e organizar tarefas, controlar timers,
planejar o dia, conduzir a revisão semanal e ler/escrever notas e cadernos — sempre com o seu app
como fonte de verdade.

O servidor escuta só em `127.0.0.1` (não é acessível pela rede) e exige um token.

## Ligar

1. Em **Configurações → Servidor MCP**, ligue o interruptor. O estado muda para
   **Rodando em 127.0.0.1:&lt;porta&gt;** (porta padrão `39237`).
2. Copie o **Comando para registrar no Claude Code** com o botão ao lado.
3. Rode o comando no terminal. Ele tem esta forma:

    ```bash
    claude mcp add ticktask --scope user --env ELECTRON_RUN_AS_NODE=1 -- "<executável>" "<pasta de dados>/mcp-bridge.js"
    ```

4. Abra uma sessão nova do Claude Code e peça, por exemplo, "o que tenho no inbox do CrafyTask?".

!!! warning "O comando contém o token"
    Não compartilhe o comando. **Regenerar token** invalida o atual: todo cliente registrado para
    de funcionar até ser registrado de novo com o comando novo.

### Por que esse comando

- **`--scope user`** registra o servidor para todos os projetos. No escopo padrão (`local`) ele
  valeria só no diretório onde o comando rodou.
- **Ponte stdio.** Quem sobe a ponte (`mcp-bridge.js`) é o próprio Claude Code. Se o app estiver
  fechado, a ponte o abre na bandeja, sem janela, e espera o servidor responder (a primeira
  chamada leva 1–3 s a mais). A ponte é recopiada para a pasta de dados a cada inicialização, então
  o caminho registrado sobrevive a atualizações do app.
- O nome registrado continua `ticktask`: quem já tinha o servidor registrado no TickTask não
  precisa fazer nada.

### Alternativa: HTTP direto

Clientes que preferirem falar HTTP podem registrar assim:

```bash
claude mcp add ticktask --scope user --transport http http://127.0.0.1:<porta>/mcp --header "Authorization: Bearer <token>"
```

Nesse modo o app **precisa** estar aberto quando a sessão do cliente começa.

## O que o assistente pode fazer

São 24 ferramentas. Além de `server_info` (confirma que o app está respondendo), elas se agrupam
em: tarefas (`search_tasks`, `get_task`, `create_task`, `update_task`,
`bulk_update_tasks`, `delete_tasks`), organização (`organize_overview`, `list_structure`,
`manage_structure`), tempo (`timer`, `time_report`), notas e desenho (`read_notes`, `write_notes`,
`read_drawing`), planejamento (`agenda`, `plan_day`, `weekly_review`) e cadernos
(`list_notebooks`, `search_pages`, `read_page`, `create_page`, `write_page`, `delete_page`). Lista
completa em [Ferramentas MCP](../comandos/ferramentas-mcp.md).

## Confirmação de operações perigosas

Excluir tarefas ou páginas, remover/mesclar estrutura, substituir uma nota não vazia e operações
em massa acima do limite (padrão: 5 itens) passam por **duas fases**: a primeira chamada devolve
uma prévia do que será afetado e um `confirm_token`; o assistente mostra a prévia e só executa ao
repetir a chamada com o token (válido por 5 minutos, uso único, só para aquela operação exata).

## Limites

- O servidor só responde com o app aberto (a ponte stdio abre o app quando precisa). Fechar a
  janela não encerra o app: ele fica na bandeja e o servidor continua de pé.
- `search_tasks` não devolve subtarefas — use `get_task` para o detalhe.
- `write_notes` converte um subconjunto de Markdown: menções `@`, tabelas e imagens do editor não
  sobrevivem à conversão. Prefira `mode=append`.
- Excluir uma tarefa pai apaga as subtarefas, sem volta depois de confirmado.
- `read_drawing` serve o PNG gerado no último salvamento feito no app.

Detalhes técnicos (ponte, transporte, guard de confirmação) em
[Servidor MCP](../mcp-server.md).
