# Jira

Traz para o CrafyTask as issues do **Jira Cloud** atribuídas a você, nos boards que você escolher,
como tarefas. A partir daí você organiza, cronometra e anota no app; o status no Jira, os campos da
issue, a descrição e (opcionalmente) o tempo gasto podem voltar para o Jira.

## Configurar

Em **Configurações → Jira**:

1. **Credenciais**
    - **Site do Jira Cloud** — por exemplo, `sua-empresa.atlassian.net`.
    - **E-mail da conta Atlassian**.
    - **API token** — gere em [id.atlassian.com](https://id.atlassian.com/manage-profile/security/api-tokens)
      → Segurança → Criar token de API.

    Clique em **Salvar e testar**. O token fica cifrado no seu computador e não aparece de novo
    depois de salvo. Trocar o site ou o e-mail exige um token novo.

2. **Boards** — **Carregar boards** lista os boards do site agrupados por espaço. Marque os que
   devem alimentar o app.
3. **Importar agora** — traz as issues atribuídas a você nos boards marcados: abertas, ou
   concluídas nos últimos 30 dias. Issue já concluída não vira tarefa nova.

## Como as tarefas importadas se comportam

- **Status separados.** A tarefa tem o status GTD dela (Inbox, Próximas…) e, à parte, o **status do
  Jira**. Mover a tarefa no CrafyTask **não** mexe no Jira. Para transicionar a issue, use o
  seletor **Jira** no card, na tabela ou no detalhe.
- **Status inicial.** Só vale para tarefas novas. "Padrão da categoria" leva *A fazer* → Inbox,
  *Em andamento* → Executando e *Concluído* → Finalizada; você pode escolher outro status por
  status do Jira.
- **Projeto por espaço.** Defina um **Projeto padrão** e, se quiser, um projeto local para cada
  espaço do Jira. Tarefa nova vai para o projeto do espaço; tarefa já vinculada e sem projeto
  recebe o do espaço na importação. Uma tarefa que você moveu para outro projeto não é tocada.
- **Reimportar** atualiza nome, link, status do Jira, tipo e issue pai. O prazo só é atualizado
  quando a issue tem um (o prazo local não é apagado).
- **Descrição ↔ notas.** A descrição da issue entra nas notas da tarefa, e editar as notas
  atualiza a descrição no Jira (alguns segundos depois). Se a descrição mudou no Jira, a versão do
  Jira vence. Imagens do Jira aparecem como um marcador nas notas e voltam intactas; imagens
  coladas no app não vão para o Jira.
- **Campos da issue.** No detalhe, o painel de campos lê os campos editáveis da issue e grava cada
  um direto no Jira.
- **Hierarquia.** Épico, história e issue pai **não** viram subtarefas locais. Para ver a
  hierarquia, agrupe a lista por **Espaço Jira** ou **Pai Jira**. O detalhe mostra a issue pai e as
  issues filhas.
- **Excluir** uma tarefa importada não impede que ela volte na próxima importação. Para tirá-la da
  frente, **arquive**.

## Opções

- **Sincronizar tasks do Jira com o Notion** — desligado por padrão: tarefas do Jira só vão ao
  [Notion](notion.md) com esta opção ligada.
- **Registrar o tempo no Jira (worklog)** — veja abaixo.
- **Importação automática** — a cada 15 min, 30 min ou 1 h (só roda com algum board marcado).

## Worklog

Com **Registrar o tempo no Jira (worklog)** ligado, cada sessão de timer encerrada de **1 minuto
ou mais** (play/pause ou tempo adicionado à mão) numa tarefa vinculada vira um worklog na issue.

- Tempo registrado **antes** de ligar a opção nunca é enviado.
- Cada sessão é enviada uma vez só.
- **Resetar** o timer da tarefa apaga no Jira os worklogs que o app criou.
- **Ajustar total** (definir o tempo direto) não gera worklog: não há sessão para enviar.

## Limites

- Só **Jira Cloud**, com e-mail + API token. Jira Server/Data Center não é suportado.
- Só issues atribuídas a você, nos boards marcados.
- O token fica cifrado pelo chaveiro do sistema e **não entra no backup**.
