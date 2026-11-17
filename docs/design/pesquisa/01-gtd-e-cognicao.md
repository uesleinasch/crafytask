# GTD e cognição: o que a ciência diz e o que muda na UI

Este documento reúne os estudos que explicam **por que** o GTD funciona (ou falha) e o que isso
pede da interface do CrafyTask. Cada estudo foi conferido pelo DOI (Crossref) ou pelo texto
original. A lista completa está em [referencias.md](referencias.md).

## 1. GTD como cognição distribuída

**Heylighen e Vidal (2008)**, _Getting Things Done: The Science behind Stress-Free Productivity_,
Long Range Planning 41(6), 585–605 — [DOI 10.1016/j.lrp.2008.09.004](https://doi.org/10.1016/j.lrp.2008.09.004)
([pré-print](http://pespmc1.vub.ac.be/Papers/GTD-cognition.pdf)).

- O artigo liga o GTD às teorias de cognição **situada, incorporada e distribuída**. A conclusão
  do resumo: o cérebro depende do ambiente "como memória externa, gatilho para ações e fonte de
  affordances, perturbações e feedback".
- A memória de trabalho é limitada (citam Miller, 1956). Por isso o GTD tira da cabeça tudo o que
  é "aberto" e guarda num sistema externo **confiável**.
- **Contexto** (`@escritório`, `@casa`) é o primeiro filtro na hora de escolher o que fazer:
  "o que posso fazer aqui e agora?". Depois vêm tempo disponível, energia e prioridade.
- A sensação de controle volta quando a revisão é feita **toda semana**. Sem ela, as listas ficam
  velhas e a confiança no sistema some.
- **Estigmergia**: a marca deixada no ambiente puxa a próxima ação. Na UI isso é o rastro visível
  do trabalho (o que mudou, o que está parado, o que destravou).

**Implicações para a UI**

- O app é a "memória externa". Ele precisa ser **confiável e rápido de consultar**: busca boa,
  estado sempre visível, nada perdido.
- Contexto, tempo e energia são filtros de primeira classe na lista de próximas ações, não
  opções escondidas.
- A revisão semanal precisa ser um fluxo guiado e visível (lembrete, progresso), não uma tela
  esquecida.

## 2. Tarefa aberta ocupa a mente; um plano libera

**Zeigarnik (1927)**, _Das Behalten erledigter und unerledigter Handlungen_, Psychologische
Forschung 9, 1–85 — [DOI 10.1007/BF02409755](https://doi.org/10.1007/BF02409755) (publicado na
série de estudos editada por K. Lewin; o Crossref registra o título da série). É a origem do
"efeito Zeigarnik": tarefas interrompidas são lembradas melhor que as concluídas.

**Masicampo e Baumeister (2011)**, _Consider it done! Plan making can eliminate the cognitive
effects of unfulfilled goals_, Journal of Personality and Social Psychology 101(4), 667–683 —
[DOI 10.1037/a0024192](https://doi.org/10.1037/a0024192)
([resumo no PubMed](https://pubmed.ncbi.nlm.nih.gov/21688924/)).

- Metas não cumpridas causaram pensamentos intrusivos durante leitura, alta acessibilidade de
  palavras ligadas à meta e pior desempenho numa tarefa sem relação.
- Deixar a pessoa formular um **plano específico** eliminou esses efeitos, **sem** que a tarefa
  fosse feita. O efeito dependeu de o plano ser sério.

**Gollwitzer (1999)**, _Implementation intentions: Strong effects of simple plans_, American
Psychologist 54(7), 493–503 — [DOI 10.1037/0003-066X.54.7.493](https://doi.org/10.1037/0003-066X.54.7.493).
Planos do tipo "quando X, farei Y" aumentam a chance de cumprir a meta.

**Implicações para a UI**

- A captura (inbox) alivia, mas **não basta**: o alívio vem de decidir a **próxima ação** e
  **quando/onde** ela acontece. O processamento do inbox deve pedir esses campos com poucos
  cliques (próxima ação, contexto, data agendada).
- O plano do dia e o agendamento (`scheduled_date`/hora) são o "plano específico" do estudo.
  Merecem destaque, não um campo perdido no formulário.
- Inbox cheio é dívida cognitiva. Mostrar a contagem do inbox de forma discreta, mas sempre
  visível, ajuda a manter o hábito de processar.

## 3. Como as pessoas gerenciam tarefas de verdade

**Bellotti et al. (2004)**, _What a to-do: studies of task management towards the design of a
personal task list manager_, CHI 2004, 735–742 — [DOI 10.1145/985692.985785](https://doi.org/10.1145/985692.985785).

- Contra o senso comum, as pessoas **não são ruins em priorizar**. O problema central é o
  **esforço** que a gestão exige ("the principal problem of task management is not poor
  prioritization, but the effort it requires").
- Só 14% dos lembretes estavam numa lista. To-dos são anotados com esforço mínimo e quase não
  descrevem a tarefa.
- O artigo pede: várias visões da mesma massa de tarefas (dia, semana, projeto), filtros e
  ordenação, itens prioritários aparentes, ser "o lugar habitual" do dia a dia e estar
  "instantaneamente ligado" para entrada rápida.

**Kamsin, Blandford e Cox (2012)**, _Personal task management: my tools fall apart when I'm very
busy!_, CHI EA 2012, 1369–1374 — [DOI 10.1145/2212776.2212457](https://doi.org/10.1145/2212776.2212457).
O título resume o achado: as ferramentas são abandonadas justo nos momentos de maior carga.

**Implicações para a UI**

- Reduzir esforço é a meta número um: captura de uma linha, valores padrão bons, edição inline.
- Ferramenta que "desmonta" quando a pessoa está ocupada falha. Em dias cheios, a UI deve
  continuar útil com o mínimo (captura, timer, lista de hoje), sem exigir manutenção.
- Várias perspectivas (lista, plano do dia, calendário, projeto) sobre os **mesmos** dados, com
  filtros persistidos.

## 4. Interrupção e retomada

**Czerwinski, Horvitz e Wilhite (2004)**, _A diary study of task switching and interruptions_,
CHI 2004, 175–182 — [DOI 10.1145/985692.985715](https://doi.org/10.1145/985692.985715).
Tarefas às quais a pessoa precisou "voltar" foram avaliadas como mais difíceis de retomar, eram
mais de duas vezes mais longas (média de 120 vs. 45 minutos) e o software da época não ajudava a
recuperar o contexto.

**Iqbal e Horvitz (2007)**, _Disruption and recovery of computing tasks: field study, analysis,
and directions_, CHI 2007, 677–686 — [DOI 10.1145/1240624.1240730](https://doi.org/10.1145/1240624.1240730)
([PDF do autor](https://www.erichorvitz.com/CHI_2007_Iqbal_Horvitz.pdf)).

- Depois de um alerta de e-mail ou IM, a volta ao aplicativo da tarefa principal levou em média
  cerca de 8 a 10 minutos; em 27% dos alertas a pessoa ficou mais de 2 horas longe das janelas
  em que trabalhava.
- Janelas suspensas **menos de 25% visíveis** demoraram significativamente mais para receber a
  pessoa de volta do que janelas mais de 75% visíveis. Pista visual de "o que eu estava fazendo"
  acelera a retomada.

**Mark, Gudith e Klocke (2008)**, _The cost of interrupted work: more speed and stress_, CHI 2008,
107–110 — [DOI 10.1145/1357054.1357072](https://doi.org/10.1145/1357054.1357072). Pessoas
interrompidas terminaram mais rápido, sem perder qualidade, mas com **mais estresse, frustração,
pressão de tempo e esforço** (NASA-TLX).

**Altmann e Trafton (2002)**, _Memory for goals: an activation-based model_, Cognitive Science
26(1), 39–83 — [DOI 10.1207/s15516709cog2601_2](https://doi.org/10.1207/s15516709cog2601_2).
Metas suspensas perdem ativação com o tempo e precisam de **pistas** para voltar.
**Trafton et al. (2003)**, International Journal of Human-Computer Studies 58(5), 583–603 —
[DOI 10.1016/S1071-5819(03)00023-5](<https://doi.org/10.1016/S1071-5819(03)00023-5>): um aviso
antes da interrupção, que permite "ensaiar" o ponto de parada, acelera a retomada.

**Leroy (2009)**, _Why is it so hard to do my work? The challenge of attention residue when
switching between work tasks_, OBHDP 109(2), 168–181 —
[DOI 10.1016/j.obhdp.2009.04.002](https://doi.org/10.1016/j.obhdp.2009.04.002). Ao trocar de
tarefa, parte da atenção fica presa na anterior ("resíduo de atenção") e piora o desempenho na
seguinte.

**Stothart, Mitchum e Yehnert (2015)**, _The attentional cost of receiving a cell phone
notification_, JEP: Human Perception and Performance 41(4), 893–897 —
[DOI 10.1037/xhp0000100](https://doi.org/10.1037/xhp0000100). Só **receber** a notificação, sem
interagir, já prejudicou uma tarefa de atenção, em magnitude parecida com usar o celular.

**Adamczyk e Bailey (2004)**, _If not now, when? The effects of interruption at different moments
within task execution_, CHI 2004, 271–278 — [DOI 10.1145/985692.985727](https://doi.org/10.1145/985692.985727).
Interromper em momentos diferentes da execução teve efeitos diferentes no estado emocional e na
atribuição social; o artigo sugere que um sistema pode manter a pessoa informada e reduzir o
efeito disruptivo escolhendo **quando** interromper.

**Implicações para a UI**

- Avisos não urgentes (sync concluído, lembrete de revisão) esperam um **ponto de quebra**
  natural: parar o timer, concluir uma task, trocar de tela.
- Toda task deve guardar e mostrar o **ponto de retomada**: última nota, último comando do
  terminal, sessão de timer, "próximo passo". O timer flutuante é a pista visual de Iqbal e Horvitz.
- Ao pausar/trocar de task, oferecer (opcional, uma linha) "onde parei?" — é o ensaio de
  Trafton et al. e reduz o resíduo de Leroy.
- Notificações do app (prazo, sync, MCP) devem ser **poucas, agrupadas e silenciosas** por padrão.
  Toast só para o que exige ação; o resto vira indicador passivo (ver
  [02-referencias-de-mercado.md](02-referencias-de-mercado.md)).
- Modo foco: esconder chrome e badges não essenciais enquanto um timer roda.

## 5. Controle de tempo, enquadramento e estresse

**Kim et al. (2016)**, _TimeAware: Leveraging Framing Effects to Enhance Personal Productivity_,
CHI 2016, 272–283 — [DOI 10.1145/2858036.2858428](https://doi.org/10.1145/2858036.2858428).
Em 8 semanas com 24 participantes, só o grupo com enquadramento **negativo** (mostrar o tempo
perdido em distração) melhorou a produtividade; mas esse grupo ficou "muito mais estressado"
que o do enquadramento positivo ([notícia da Penn State](https://www.psu.edu/news/research/story/professor-studies-how-apps-can-affect-productivity)).

**Mark et al. (2014)**, _Bored Mondays and focused afternoons_, CHI 2014, 3025–3034 —
[DOI 10.1145/2556288.2557204](https://doi.org/10.1145/2556288.2557204): foco e tédio variam pela
hora do dia e pelo dia da semana.

**Implicações para a UI**

- O dashboard deve informar sem punir. Usar enquadramento neutro/positivo por padrão (tempo
  investido por área/projeto, progresso), e deixar comparações "duras" opcionais.
- Vermelho só para erro e atraso real. Tempo "a mais" ou meta não batida não é erro.
- Mostrar padrões por hora/dia (heatmap) ajuda a planejar tarefas pesadas nos horários de foco.

## 6. Carga cognitiva e as leis de Hick e Fitts

- **Sweller (1988)**, Cognitive Science 12(2), 257–285 —
  [DOI 10.1207/s15516709cog1202_4](https://doi.org/10.1207/s15516709cog1202_4): a memória de
  trabalho é o gargalo; elementos que não ajudam a tarefa consomem a mesma capacidade.
- **Hick (1952)**, QJEP 4(1), 11–26 — [DOI 10.1080/17470215208416600](https://doi.org/10.1080/17470215208416600);
  **Hyman (1953)**, J. Exp. Psychology 45(3), 188–196 — [DOI 10.1037/h0056940](https://doi.org/10.1037/h0056940):
  o tempo de escolha cresce com o logaritmo do número de alternativas. Vale para escolhas entre
  opções conhecidas; não justifica esconder tudo, mas justifica **agrupar** e dar padrão.
- **Fitts (1954)**, J. Exp. Psychology 47(6), 381–391 — [DOI 10.1037/h0055392](https://doi.org/10.1037/h0055392):
  o tempo para acertar um alvo cresce com a distância e cai com o tamanho. A
  [NN/g](https://www.nngroup.com/articles/fitts-law/) traduz: alvos maiores, menus perto do
  gatilho, bordas da tela como alvos "infinitos", espaço entre alvos pequenos.

**Implicações para a UI**

- Poucos elementos por linha de task; metadados secundários em texto discreto, não em vários
  badges coloridos.
- Ações frequentes (iniciar timer, concluir) grandes e perto do título; ações raras no menu `...`.
- Atalhos de teclado para quem já é especialista (heurística 7 de
  [Nielsen](https://www.nngroup.com/articles/ten-usability-heuristics/)): o usuário do CrafyTask
  passa o dia no app.

## 7. Cor e atenção

**Wolfe e Horowitz (2004)**, _What attributes guide the deployment of visual attention and how do
they do it?_, Nature Reviews Neuroscience 5(6), 495–501 —
[DOI 10.1038/nrn1411](https://doi.org/10.1038/nrn1411). Cor está entre os atributos que guiam a
atenção sem esforço.

**Implicação**: cor saturada puxa o olho. Se tudo tem cor, nada se destaca. Reservar cor forte
para o que exige atenção (task executando, atrasada, erro) e usar neutros no resto. Detalhes em
[03-cor-acessibilidade-e-modo-escuro.md](03-cor-acessibilidade-e-modo-escuro.md).
