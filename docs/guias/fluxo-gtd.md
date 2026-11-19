# Fluxo GTD no CrafyTask

O GTD (*Getting Things Done*, de David Allen) tem cinco etapas: **capturar**, **esclarecer**,
**organizar**, **revisar** e **executar**. Este guia mostra onde cada uma acontece no CrafyTask.

## Vocabulário rápido

O **status** da tarefa é a etapa do GTD em que ela está. Uma tarefa tem exatamente um status:

| Status | Quando usar |
| --- | --- |
| **Inbox** | acabou de ser capturada, ainda não foi processada |
| **Próximas** | próxima ação clara, pronta para ser feita |
| **Executando** | em andamento agora |
| **Aguardando** | delegada ou esperando outra pessoa |
| **Someday/Maybe** | talvez um dia; fora do radar ativo |
| **Finalizada** | concluída |

Independente do status, cada tarefa tem uma **categoria** (Urgente, Prioridade, Normal ou
**Time Leak** — tarefa que consome tempo sem gerar valor), um **nível de energia** opcional
(alta, média, baixa), **contextos** (`@computador`, `@telefone`…), **tags** livres e, se fizer
parte de algo maior, um **projeto**.

## 1. Capturar

Tire da cabeça tudo o que chamar sua atenção, sem decidir nada ainda.

- **Captura rápida** — `Ctrl + Shift + Space` de qualquer lugar do sistema (ou **Captura rápida**
  no ícone da bandeja). Digite e tecle `Enter`; `Esc` fecha. A tarefa entra no Inbox só com o nome.
- **Nova Tarefa** — botão na barra superior; abre o diálogo completo, para quando você já sabe os
  detalhes.
- **Assistentes de IA** — com o [servidor MCP](../integracoes/mcp.md) ligado, o Claude Code (ou
  outro cliente) pode criar tarefas por você.
- **Jira** — issues atribuídas a você podem ser [importadas](../integracoes/jira.md) como
  tarefas.

## 2. Esclarecer

Abra a aba **Inbox** da lista de tarefas e processe item por item. Para cada um, pergunte "isso
exige ação?":

- **Não** → exclua, ou mova para **Someday/Maybe** se quiser guardar a ideia.
- **Sim, e leva mais de um passo** → crie (ou escolha) um **projeto** e defina a primeira ação.
- **Sim, eu mesmo faço** → mude para **Próximas**.
- **Sim, mas depende de alguém** → mude para **Aguardando**.

Para processar vários de uma vez, selecione as tarefas e use a **barra de ações em massa**
(*Marcar como…*, *Mover para projeto…*, *Arquivar*, *Excluir*). O **botão direito** numa tarefa
abre um menu com as ações mais comuns: abrir, iniciar/parar timer, planejar para hoje, marcar
status, arquivar e excluir.

## 3. Organizar

Dê a cada ação o lugar certo. No **detalhe da tarefa** (clique no nome):

- **Projeto** — agrupa as ações de um resultado. Na tela **Projetos** cada projeto tem descrição,
  *resultado desejado*, cor, data limite e área de foco. A lista avisa quantos projetos ativos estão
  **sem próxima ação** (e filtra só esses), busca, ordena, mostra em cards ou tabela e agrupa por
  área; o botão direito num projeto muda o status, a área ou o exclui (as tarefas ficam sem projeto).
- **Contextos** — onde ou com o que a ação pode ser feita. Gerencie em **Contextos**.
- **Tags** — rótulos livres ("Fonte / Tag"), criados enquanto você digita.
- **Programado para** e **Prazo** — datas (e horários opcionais) que alimentam o
  [plano do dia](plano-do-dia.md), o calendário e as notificações.
- **Recorrência** — diária, semanal ou mensal; concluir gera a próxima instância.
- **Subtarefas** — quebre a tarefa em passos; a tarefa-pai mostra o progresso.
- **Depende de** — enquanto a dependência não estiver finalizada, a tarefa fica **bloqueada**
  (cadeado laranja) e o timer não inicia.
- **Nível de energia** — ajuda a escolher o que fazer conforme sua disposição.

A tela **Horizontes** reúne as seis alturas de perspectiva do GTD — da ação imediata ao propósito
— e é onde você cria **áreas de foco** (Carreira, Saúde…) e **metas**. Projetos se ligam a áreas.

!!! tip "Arquivar não é finalizar"
    Finalizar muda o status. **Arquivar** tira a tarefa de todas as listagens, em qualquer
    status. As arquivadas ficam no **Arquivo**, de onde podem ser restauradas ou apagadas de vez.

## 4. Revisar

Uma vez por semana, faça a [revisão semanal](revisao-semanal.md): o app conduz um checklist de 8
passos e mostra indicadores do que está esquecido (inbox cheio, projetos sem próxima ação, itens
parados há dias). O **Dashboard** completa a visão com o tempo gasto por tarefa e projeto e um
relatório semanal em PDF.

## 5. Executar

- Abra **Hoje** para ver o que está planejado para o dia, com as de horário primeiro
  ([plano do dia](plano-do-dia.md)).
- Filtre a lista por **contexto**, **projeto**, **categoria** ou **tag** no painel **Filtros**
  para achar o que dá para fazer agora.
- Inicie o **timer** da tarefa ([guia do timer](timer.md)). Ela passa a aparecer em
  **Executando**, que pode ser vista em Kanban.
- Use as [notas](notas-e-desenho.md) e o [terminal](terminal.md) da própria tarefa para trabalhar
  sem perder o contexto.
- Ao terminar, marque como **Finalizada**.

## Visualizações da lista

A lista de tarefas tem abas por status (Todas, Inbox, Aguardando, Próximas, Executando,
Finalizadas, Someday), modo **tabela** (padrão) ou **cards**, **agrupamento** por projeto,
contexto, espaço Jira ou issue pai no Jira, e **Kanban** na aba Executando. Essas escolhas ficam salvas entre as
sessões. Detalhes em [Lista de tarefas](../ui/01-lista-de-tarefas.md).
