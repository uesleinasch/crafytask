# Plano do dia e calendário

## Planejar o dia

Uma tarefa entra no plano de hoje quando a data **Programado para** é hoje. Você pode fazer isso:

- pelo botão **Hoje** que aparece ao passar o mouse sobre a tarefa na lista;
- pelo **botão direito → Planejar para hoje**;
- pelo campo **Programado para** no detalhe da tarefa;
- arrastando a tarefa para o dia de hoje na visão mensal do calendário;
- pelo MCP, com a ferramenta `plan_day`.

A tela **Hoje** tem duas abas:

- **Hoje** — a lista do dia, que você ordena arrastando. No topo, o **indicador de carga** soma os
  limites de tempo das tarefas do dia contra uma jornada de 8 h (fica vermelho quando passa) e
  conta quantas já foram feitas.
- **Esta Semana** — panorama dos próximos sete dias, só leitura.

## Horários e prazos

No detalhe da tarefa, seção **Agenda**:

- **Programado para** aceita **Início** e **Fim** opcionais (`HH:MM`).
- **Prazo** aceita uma **Hora** opcional.
- Notificações do sistema avisam sobre o prazo: no dia, na véspera, 15 minutos antes e na hora
  marcada (quando há hora).

Uma tarefa conta como **atrasada** quando o prazo é anterior a hoje, ou é hoje e a hora já passou.

## Calendário

A tela **Calendário** tem duas visões:

- **Semana** (padrão) — *time blocking*: uma grade das 07:00 às 22:00. Clique num espaço vazio
  para criar um **bloco de tempo** (o app propõe 1 hora, arredondada a 30 minutos) e escolha a
  tarefa. Para mover ou encurtar um bloco, abra-o e edite. A faixa **Dia**, acima da grade, mostra
  as tarefas agendadas para cada dia.
- **Mês** — panorama dos agendamentos. **Arraste** uma tarefa de um dia para outro para
  reagendar.

Blocos de tempo, datas agendadas e prazos podem ir para o Google Calendar, tarefa por tarefa —
veja a [integração com o Google Calendar](../integracoes/google-calendar.md).

## Recorrência

Em **Recorrência**, escolha diária, semanal (num dia da semana) ou mensal (num dia do mês).
Ao finalizar a tarefa, a próxima instância é criada automaticamente.
