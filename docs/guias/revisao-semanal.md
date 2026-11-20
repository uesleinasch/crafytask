# Revisão semanal

A revisão semanal é o hábito que mantém o GTD confiável. No CrafyTask ela fica na tela **Revisão**.

## Antes de começar: saúde do sistema

A tela mostra cinco indicadores, calculados a partir das suas tarefas. Os quatro primeiros ficam
em destaque (âmbar) quando passam de zero:

| Indicador | O que conta |
| --- | --- |
| Inbox | tarefas ainda no Inbox |
| Projetos sem ação | projetos ativos sem nenhuma tarefa em **Próximas** |
| Aguardando >7d | tarefas em Aguardando paradas há mais de 7 dias |
| Próximas >14d | tarefas em Próximas paradas há mais de 14 dias |
| Someday | total da lista Someday (nunca fica em alerta) |

## Passo a passo

1. Clique em **Iniciar Revisão**. A revisão fica salva no banco: você pode navegar pelas outras
   telas e voltar, que ela continua de onde parou.
2. Percorra o checklist. Cada item é marcado com um clique:

    | # | Item | O que fazer |
    | --- | --- | --- |
    | 1 | Coletar itens soltos | jogue no Inbox papéis, notas e pensamentos que ficaram fora |
    | 2 | Processar Inbox | chegue ao Inbox Zero: cada item vira ação, projeto, referência ou lixo |
    | 3 | Revisar Próximas Ações | ainda são relevantes? alguma pode sair? |
    | 4 | Revisar Projetos | cada projeto ativo tem progresso e próxima ação? |
    | 5 | Revisar Aguardando | alguém respondeu? precisa cobrar? |
    | 6 | Revisar someday | algo pronto para ativar? algo para descartar? |
    | 7 | Revisar Calendário | o que vem na próxima semana? |
    | 8 | Pensamento Criativo | novos projetos ou ideias? |

    Os itens não abrem as telas correspondentes — use a lista de tarefas, **Projetos** e
    **Calendário** e volte para marcar.

3. Escreva observações em **Notas da Revisão** (opcional).
4. Com os 8 itens marcados, clique em **Concluir Revisão Semanal**.

A revisão vai para o **Histórico de Revisões**. Se o item 2 foi marcado, ela ganha o selo
**Inbox Zero**.

## Com um assistente de IA

Pelo [servidor MCP](../integracoes/mcp.md), a ferramenta `weekly_review` lê as revisões anteriores
e os indicadores de saúde, ou registra uma revisão nova; `organize_overview` dá um retrato do
sistema (inbox, tarefas sem projeto, atrasadas, bloqueadas, someday). Um pedido como "me ajude a
fazer a revisão semanal" funciona bem no Claude Code.
