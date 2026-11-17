# Timer e controle de tempo

Cada tarefa tem seu próprio cronômetro. Vários podem rodar ao mesmo tempo, e cada play/pause vira
uma **sessão** registrada.

## Iniciar e parar

- **No detalhe da tarefa** — o cronômetro grande no centro da tela, com **Iniciar** / **Pausar** e
  **Resetar**.
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
primeira vez o sistema mostra uma notificação. A soma dos limites das tarefas de hoje alimenta o
indicador de carga do [plano do dia](plano-do-dia.md) (jornada fixa de 8 h).

## Ajustar o tempo à mão

Ainda no detalhe da tarefa:

| Campo | O que faz |
| --- | --- |
| **Adicionar tempo** | soma um valor (`HH:MM:SS`) ao total — para trabalho feito longe do app |
| **Ajustar total** | substitui o total pelo valor informado |
| **Limite de tempo** | define ou limpa o limite |

**Resetar** apaga todo o tempo registrado da tarefa (pede confirmação). Se o
[worklog do Jira](../integracoes/jira.md#worklog) estiver ligado, os registros que o app criou no
Jira também são apagados.

## Timer flutuante

Quando você **minimiza** ou **fecha** a janela principal com algum timer rodando, aparece uma
pequena janela escura, sempre no topo, com cada timer ativo, o tempo correndo e um botão de parar.
No rodapé: **Parar todos** e **Abrir app**. Ela some quando a janela principal volta ao foco. Sem
timer rodando, o flutuante nunca aparece. Arraste-a para onde quiser.

## Time Leak

A categoria **Time Leak** marca tarefas que drenam tempo sem gerar valor. O fundo da tarefa muda de
cor conforme o tempo acumulado (amarelo → laranja → vermelho); acima de 1 h o cronômetro pulsa em
vermelho e o sistema avisa a cada 5 minutos.

## Relatórios

- **Dashboard** — tempo por tarefa e por projeto, métricas do GTD e **Exportar PDF** com o
  relatório semanal.
- **Histórico de sessões** — no detalhe da tarefa.
- **MCP** — a ferramenta `time_report` devolve tempo geral, semanal, por tarefa ou os registros de
  uma tarefa.
