# Timer e controle de tempo

Cada tarefa tem seu próprio cronômetro. Vários podem rodar ao mesmo tempo, e cada play/pause vira
uma **sessão** registrada.

## Iniciar e parar

- **No detalhe da tarefa** — o bloco do timer no cabeçalho, com **Iniciar** / **Pausar** e
  **Finalizar**; **Zerar tempo** fica no menu `⋯`.
- **Na lista** — pelo **botão direito → Iniciar timer** (ou **Parar timer**) em qualquer linha ou
  card.
- **Pelo terminal da tarefa** — com a opção ligada, o primeiro comando no
  [terminal embutido](terminal.md) inicia o timer.
- **Pelo MCP** — a ferramenta `timer` inicia, para e consulta timers
  ([integração MCP](../integracoes/mcp.md)).

Tarefa **bloqueada** (com dependência não finalizada) não pode iniciar o timer.

## Limite de tempo

Em **Limite de tempo**, no detalhe da tarefa, defina quanto você pretende gastar. Aparece uma
barra de progresso: verde até 80%, âmbar até 100% e vermelha depois. Ao cruzar o limite pela
primeira vez o sistema mostra uma notificação.

## Ajustar o tempo à mão

Ainda no detalhe da tarefa:

| Campo | O que faz |
| --- | --- |
| **Adicionar tempo** | soma um valor (`HH:MM:SS`) ao total — para trabalho feito longe do app |
| **Ajustar total** | substitui o total pelo valor informado |
| **Limite de tempo** | define ou limpa o limite |

Na lista de **Sessões** (aba Tempo do inspetor), cada sessão encerrada pode ter o início e o fim
editados (lápis; horas `HH:MM` no dia do início — fim menor que o início cai no dia seguinte) ou
ser excluída (lixeira, com confirmação). O total da tarefa muda pela diferença. A sessão em andamento
só muda depois de pausar o timer. Tempo adicionado à mão vira uma sessão com início igual ao fim;
para editá-la, informe os dois horários.

**Zerar tempo** (menu `⋯` do detalhe) apaga todo o tempo registrado da tarefa (pede confirmação). Se o
[worklog do Jira](../integracoes/jira.md#worklog) estiver ligado, os registros que o app criou no
Jira também são apagados.

## Timer flutuante

Quando você **minimiza** ou **fecha** a janela principal com algum timer rodando, aparece uma
pequena janela sempre no topo, no mesmo tema da principal, com cada timer ativo, o tempo correndo e
um botão de pausar. Clique no nome para abrir a tarefa na janela principal. No rodapé: **Pausar
todos** (com mais de um timer) e **Abrir CrafyTask**. Ela some quando a janela principal volta ao
foco. Sem timer rodando, o flutuante nunca aparece. Arraste-a para onde quiser.

## Time leak

A categoria **Time leak** marca tarefas que drenam tempo sem gerar valor. O fundo da tarefa muda de
cor conforme o tempo acumulado (amarelo → laranja → vermelho); acima de 1 h o cronômetro pulsa em
vermelho e o sistema avisa a cada 5 minutos.

## Relatórios

- **Dashboard** — tempo por tarefa e por projeto, métricas do GTD e **Exportar PDF** com o
  relatório semanal.
- **Sessões** — na aba Tempo do detalhe da tarefa, com edição e exclusão.
- **MCP** — a ferramenta `time_report` devolve tempo geral, semanal, por tarefa ou os registros de
  uma tarefa.
