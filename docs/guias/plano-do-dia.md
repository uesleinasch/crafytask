# Plano do dia e calendário

## Planejar o dia

Uma tarefa entra no plano de hoje quando a data **Programado para** é hoje. Você pode fazer isso:

- pelo botão **Hoje** que aparece ao passar o mouse sobre a tarefa na lista;
- pelo **botão direito → Planejar para hoje**;
- pelo campo **Programado para** no detalhe da tarefa;
- arrastando a tarefa para o dia de hoje na visão mensal do calendário;
- pelo MCP, com a ferramenta `plan_day`.

A tela **Hoje** tem dois cartões:

- **Plano do dia** — as tarefas de hoje, em ordem automática: primeiro as que têm horário, pela
  hora; depois as com prazo hoje e hora; o resto pela ordem do `plan_day` e pela data de criação.
  Para mudar a posição de uma tarefa, dê um horário a ela. No topo do cartão, a **carga** soma os
  blocos de tempo de hoje (os do calendário) contra uma jornada de 8 h; quando passa, fica em
  âmbar com "passa da jornada".
- **Semana** — as horas planejadas em blocos de tempo de segunda a domingo, com os dias acima da
  jornada em âmbar.

## Horários e prazos

No detalhe da tarefa, seção **Agenda**:

- **Programado para** aceita **Início** e **Fim** opcionais (`HH:MM`).
- **Prazo** aceita uma **Hora** opcional.
- Notificações do sistema avisam sobre o prazo: no dia, na véspera, 15 minutos antes e na hora
  marcada (quando há hora).

Uma tarefa conta como **atrasada** quando o prazo é anterior a hoje, ou é hoje e a hora já passou.

## Calendário

A tela **Calendário** tem as visões **Dia**, **3 dias**, **Semana** e **Mês**. Ela abre na Semana
em janela larga, em 3 dias numa média e no Dia numa estreita.

- **Dia, 3 dias e Semana** — *time blocking*: uma grade do dia inteiro, de 00:00 a 24:00, que abre
  rolada até a hora atual. Clique num espaço vazio para criar um **bloco de tempo** de 1 hora em volta do ponto clicado e escolha a tarefa.
  **Arraste** o bloco (ou a tarefa com horário) para mudar a hora ou o dia e puxe a borda de baixo
  para mudar o fim; clique nele para ajustar o horário, iniciar o timer, abrir a tarefa ou excluir
  (Delete também exclui).
  O botão direito tem **Repetir no dia seguinte**. Mover e excluir podem ser desfeitos na
  mensagem que aparece. O painel **A agendar** lista as próximas ações sem tempo reservado nos dias
  visíveis: arraste uma delas para a grade ou use o `+` para reservar 1 hora. Acima da grade, cada dia mostra quantas horas já estão em blocos contra a jornada de
  8 h (âmbar quando passa) e a faixa **Dia** com as tarefas agendadas sem horário e os prazos.
  Tarefas com horário aparecem como compromisso, e as sessões do timer como uma faixa fina na borda
  da coluna. Em **Mostrar** você escolhe o que aparece (blocos, tarefas com horário, agendadas,
  prazos, sessões, fins de semana) e vê a legenda.
- **Mês** — panorama dos agendamentos. **Arraste** uma tarefa de um dia para outro para
  reagendar.

Blocos de tempo, datas agendadas e prazos podem ir para o Google Calendar, tarefa por tarefa —
veja a [integração com o Google Calendar](../integracoes/google-calendar.md).

## Recorrência

Em **Recorrência**, escolha diária, semanal (num dia da semana) ou mensal (num dia do mês).
Ao finalizar a tarefa, a próxima instância é criada automaticamente.
