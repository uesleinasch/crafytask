# Inconsistências e pontos de atrito

Este documento começou como o levantamento do que estava incoerente, duplicado ou ausente na
interface legada, e serviu de insumo para a refatoração visual (fases F0–F9 do
[plano de refatoração](../design/plano-de-refatoracao.md)). Agora cada item diz se foi resolvido e
em que fase, ou se continua aberto. Nada aqui é bug: nenhum item quebra o app.

Resumo: dos itens de A a E, sobram abertos C1 (sobreposição entre telas, decisão de produto), E3
(metas sem destino), E8 (idioma) e os novos A11–A12. A seção F reúne restrições que continuam
valendo.

---

## A. Sistema visual

### A1. Três paletas para status de tarefa, quatro para categoria — resolvida

**F2-b, F4-b2 e F7-b3.** Status, categoria e energia passam pelos chips de `components/chips/`, com
as cores de `theme/semantic.ts`; o calendário (F4-b2) e o dashboard (F7-b3) largaram as cópias
locais, e a F9-a tirou o último hex solto de componente. Antes, time leak era amarelo em três
lugares e roxo em dois, e `finalizada` era roxo no badge e esmeralda no dashboard.

### A2. Exports de cor mortos em `shared/types.ts` — resolvida

**F0-b**, com as últimas cópias saindo na F6-a (`CONTEXT_COLORS`), na F4-b2 (calendário) e na
F7-b3 (dashboard). As cores de domínio moram só em `theme/semantic.ts`.

### A3. Duas gramáticas de badge — resolvida

**F2-b.** Status de tarefa e de projeto usam o mesmo chip (`StatusChip` e `ProjectStatusChip`):
fundo claro, texto na cor, ícone e rótulo. Antes, o de projeto era pílula sólida com texto branco.

### A4. Cinco raios de borda sem regra — resolvida

**F0-b e a migração de cada tela (F1–F8).** O raio vem dos tokens do antd (4, 6, 8 e 12) e nenhum
componente usa classe `rounded-*`, e a escala `--radius` do Tailwind saiu na F9-a.

### A5. Sombras sobreviveram à migração "flat" — resolvida

**F0-e.** Uma sombra só, `boxShadowSecondary`, para o que flutua (popover, modal, barra de ações em
massa, bloco arrastado). Não há classe `shadow-*` em componente.

### A6. Tokens de fonte apontam para variáveis inexistentes — resolvida

**F0-a.** Geist e Geist Mono empacotadas, e os tokens apontam para elas.

### A7. Tema escuro definido e desligado — resolvida

**F0-c e F7-d3.** O `ThemeProvider` monta o tema claro ou escuro do antd a partir de
`theme/tokens.ts`, e a Aparência (F7-d3) libera o seletor em Configurações, no header e na paleta.
O bloco `.dark` antigo saiu do CSS na F9-a (A10).

### A8. Primitivos do shadcn não usados — resolvida

**F9-a.** Saíram shadcn, Radix e `components/ui/`. Cartões, abas e barras de progresso são `Card`,
`Tabs` e `Progress` do antd.

### A9. Componentes mortos — resolvida

**F9-a.** Saíram `Timer.tsx`, `Versions.tsx` e, junto, `TimeEntryList`, `DueDateBadge`,
`ScheduledTimeBadge`, `ColorPicker` e `lib/colors.ts`.

### A10. Variáveis do shadcn no `main.css` — resolvida

**F9-a.** O bloco `:root`/`.dark` com `--background`, `--primary`, `--chart-*`, `--sidebar-*` e os
mapeamentos do `@theme inline` que as expunham ao Tailwind saíram; o `@theme inline` ficou só com as
fontes. A camada `base` pinta o `body` com
`var(--ant-color-bg-layout)` e `var(--ant-color-text)`.

### A11. Seletor de cor copiado em quatro lugares — aberta

Os círculos de `USER_COLORS` com anel na cor escolhida estão escritos em `LabelEditModal`,
`ProjectHeader`, `NewProjectModal` e `NameColorDialog`. Os três primeiros anunciam a cor ao leitor
de tela pelo hex (`Cor #E5484D`); só o dos cadernos usa o nome (`USER_COLOR_NAMES`).

### A12. Rótulo do chip difere do rótulo do menu — aberta

O chip diz "Someday" e "Time leak" (`statusMeta.ts`, `categoryMeta.ts`); menus, seletores e ações em
massa dizem "Someday/Maybe" e "Time Leak" (`STATUS_LABELS` e `CATEGORY_LABELS` de
`shared/types.ts`).

---

## B. Navegação e casca

### B1. Onze botões numa barra única, só na home — resolvida

**F1-b.** A sidebar do `AppShell` traz a navegação agrupada em todas as rotas. Antes, o `TitleBar`
só mostrava a navegação em `/`.

### B2. Botão "Voltar" com quatro implementações — resolvida

**F1-b.** As telas da sidebar perderam o "Voltar"; só os detalhes mantêm o seu (tarefa em
`navigate(-1)`, projeto em "← Projetos", F5-e).

### B3. Ação primária em quatro cores — resolvida

**F4-b2, F5-b, F5-c3 e F7-d2**, fechada pela F9-a. Toda ação primária é `type="primary"`, na cor
primária do tema, uma por tela. Antes havia preto, azul, esmeralda e índigo, e a revisão semanal
mostrava o mesmo comando duas vezes em cores diferentes.

### B4. Configurações escondidas atrás de um ícone sem rótulo — resolvida

**F1-b.** Configurações é um item rotulado no rodapé da sidebar.

### B5. O comportamento de "fechar" nunca é explicado onde importa — resolvida

**F1-f.** A barra de status diz, em toda tela, que fechar a janela mantém o app na bandeja.

---

## C. Sobreposição funcional

### C1. Várias telas mostram tarefas agendadas — aberta (decisão de produto)

O calendário (F4-b2 a F4-b4) concentra blocos de tempo, arraste, redimensionamento e as visões Dia,
3 dias, Semana, Mês e Agenda; Hoje (F4-a) ficou com o plano e a carga do dia contra a jornada; o H0
dos Horizontes mostra as mesmas tarefas no contexto dos níveis. A divisão melhorou, mas as três
telas ainda listam as mesmas tarefas por caminhos diferentes.

### C2. Três desenhos para "timers em execução" — resolvida

**F1-d, F7-b2 e F8-a.** A pílula do header substituiu o `FloatingTimer`, o painel do dashboard
saiu e a janela flutuante segue a pílula (ponto ao vivo, nome que abre a tarefa, tempo em mono).

### C3. `/archived` é um filtro promovido a tela — resolvida

**F6-b2.** O Arquivo é uma tabela com busca, filtros, grupos, menu e ações em massa.

### C4. Contextos e Tags são a mesma tela duas vezes — resolvida

**F6-a.** Uma tela só (`LabelsPage`), com abas e os mesmos recursos nas duas.

---

## D. Terminologia

### D1. "Tag" tem três nomes — resolvida

**F2-c e F6-a.** Filtro, diálogo e tela dizem "Tag(s)".

### D2. "Arquivadas" vs. "Arquivo Morto" — resolvida

**F6-b2.** Um nome só na interface: **Arquivo**.

### D3. `DeleteConfirmDialog` genérico fala em "tarefa" para tudo — resolvida

**F6-a e F7-d2.** Cada exclusão tem o próprio `modal.confirm` ou `Popconfirm`, citando o que será
afetado; o componente saiu.

### D4. Legenda do calendário está incorreta — resolvida

**F4-b2.** O rodapé saiu; "Mostrar" é filtro e legenda, com as amostras e os ícones de categoria.

### D5. Dica com emoji que não existe na interface — resolvida

**F4-a.** O vazio de Hoje diz "Nada planejado para hoje.", explica o botão **Hoje** e leva às
Tarefas.

---

## E. Lacunas funcionais

### E1. Não se cria tarefa dentro de um projeto — resolvida

**F5-e.** O detalhe do projeto tem "Adicionar tarefa a {projeto}…", que cria a tarefa em Próximas.

### E2. Área de foco de projeto não é editável pela interface — resolvida

**F5-a e F5-e.** A área se escolhe no "Novo projeto", no menu da lista de projetos e na pílula
Área de foco do detalhe.

### E3. Rótulos não navegam para o que rotulam — em parte

**F6-a e F5-b.** Contexto e tag abrem a lista filtrada (`/?context=<id>`, `/?tag=<id>`); a área
abre os projetos dela pelo menu (`/projects?q=<área>`). **Aberto:** meta não tem destino, só o
menu `⋯` de edição.

### E4. O dashboard não leva a lugar nenhum — resolvida

**F5-g e F7-b2.** Os `HealthCard` abrem a lista já filtrada e as barras por status abrem a aba
correspondente.

### E5. A revisão semanal não conduz à revisão — resolvida

**F5-c4.** Cada passo traz a lista que revisa, as ações para resolver ali e "Abrir a tela".

### E6. Áreas e metas se excluem sem confirmação — resolvida

**F5-b.** Excluir área ou meta confirma e diz o que acontece com projetos e metas.

### E7. Blocos de tempo não se arrastam nem se redimensionam — resolvida

**F4-b3.** A grade move, estica e edita blocos (e tarefas com horário) direto, com Desfazer.

### E8. `/settings` não tem nenhuma preferência de aplicativo — em parte

**F7-d3, F7-f1 e F7-f2.** Aparência (tema e densidade), Fluxo de trabalho (jornada, início da
semana, time leak, faixa do calendário, avisos de prazo, intervalo das notas), atalho da captura e
backup automático. **Aberto:** não há escolha de idioma (a interface é só em português).

---

## F. Restrições que continuam valendo

Não são defeitos, mas condicionam qualquer mudança de tela.

### F1. Altura contida, nunca `100vh`

As páginas usam `h-full` porque o `Content` do `AppShell` já desconta o header de 52px. Com
`100vh` sobra a altura do header, e um `scrollIntoView` (o Excalidraw dá foco ao canvas ao
selecionar) rola esse excedente e esconde a barra do modo foco, sem volta.

### F2. As três janelas compartilham o bundle

Qualquer efeito colateral no escopo de módulo roda três vezes. A guarda é
`shouldBootstrapTimerStore(hash)`, em `stores/timerWindow.ts`. Novos efeitos globais precisam da
mesma proteção.

### F3. Chaves de preferência com três convenções de nome — aberta

A maioria usa `ticktask:` (`ticktask:taskListView`), os cadernos usam `ticktask.`
(`ticktask.notebooks.*`), e Configurações e terminal não têm prefixo (`settings.section`,
`terminal.*`). Lista completa em [00](00-visao-geral.md#o-que-a-interface-memoriza).

### F4. Agrupar por contexto repete tarefas

Uma tarefa com três contextos aparece nos três grupos, e a soma dos grupos passa do total. É o
comportamento certo para o caso de uso; desde a F2-e a lista avisa isso ao agrupar por contexto.

### F5. A ordem do plano do dia grava uma chamada por tarefa — resolvida

**F4-a.** O plano do dia não tem ordem manual; a ordem é automática, no SQL.

### F6. A busca da lista de tarefas não tem debounce — resolvida

**F2-c.** A busca espera 250 ms sem digitar.

### F7. O seletor de dependências carrega todas as tarefas — resolvida

**F3-c.** "Adicionar dependência…" busca no main (`listTasks` com `search` e `limit`).

---

## G. O que a interface legada acertava e foi mantido

- **Botão "Hoje" em toda listagem** — agendar sem navegar, com alternância imediata.
- **Expansão de subtarefas inline**, em card e em tabela, com carregamento sob demanda.
- **Escala visual do Time Leak** — a única semântica que colore o fundo inteiro.
- **Modo foco com timer embutido** (`FocusOverlay`) — escrever sem perder o cronômetro de vista, e
  `Esc` para sair.
- **Confirmação de exclusão que cita o efeito** — o modelo da tag virou a regra (guia §11).
- **Prévia ao vivo no diálogo de contexto e tag.**
- **Aviso "Sem próxima ação definida"** nos projetos — o alerta GTD inline.
- **Linha do "agora" com auto-scroll** na grade do calendário.
- **Captura rápida** — atalho global, `autoFocus`, Enter/Esc, confirmação "Capturado no Inbox" e
  fechamento automático.
- **Atualização por evento (`tasks:refresh`)** — o que o MCP ou a captura rápida cria aparece
  sozinho na lista aberta.
