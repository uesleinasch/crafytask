# Detalhe da tarefa — `/task/:id`

`src/renderer/src/pages/SingleTaskPage.tsx` orquestra a tela; as peças moram em `components/tasks/`
(`TaskHeader`, `TaskWorkspace`, `TaskInspector`, `TaskTimePanel`, `TaskDetailsPanel`,
`TaskRelationsPanel`) e em `components/editor/FocusOverlay.tsx`. O desenho-alvo está no guia de
design (§7, "Detalhe da task"); esta página descreve o que o código faz hoje.

## Função

1. **Escrever e desenhar** sobre a tarefa — a área principal, porque é nas notas que o trabalho é
   retomado.
2. **Cronometrar** — o bloco do timer fica no cabeçalho, sempre visível.
3. **Editar os dados** da tarefa — no inspetor.

## Layout por largura

| Largura (`Grid.useBreakpoint`) | Onde fica o inspetor |
| --- | --- |
| `xl` ou mais | coluna à direita, 380px (420px em `xxl`), escondível pelo botão **Painel** do cabeçalho. Aberto/fechado fica em `ticktask:taskInspectorOpen` |
| `md` e `lg` | `Drawer` de 400px à direita, com o nome da tarefa no título, aberto pelo botão **Painel** |
| abaixo de `md` | não há inspetor: abas **Notas · Tempo · Detalhes · Relações** abaixo do cabeçalho |

```
┌ Cabeçalho ───────────────────────────────────────────────────────────────┐
│ ← Tarefas / Projeto                                                      │
│ [Status▾] #711                          ● 02:32:10 [Pausar] [✓]  ⌨ ◧ ⋯ │
│ Nome da tarefa                                                           │
│ descrição                                                                │
├ Área de trabalho ─────────────────────────────┬ Inspetor (380–420px) ────┤
│ [Notas | Desenho]      [💾] [⟳] [Foco]        │ [Tempo|Detalhes|Relações]│
│ editor                                        │ conteúdo da aba          │
└───────────────────────────────────────────────┴──────────────────────────┘
```

A página tem `h-full` e rola na vertical (`PageContainer` com as margens do shell). De `md` para
cima, a linha da área de trabalho ocupa o resto da altura (mínimo 480px): o editor e o inspetor
rolam dentro dos seus cartões. Abaixo de `md`, a área de trabalho tem altura mínima de 360px (480px
na aba Desenho) e cresce com o conteúdo.

## Cabeçalho — `TaskHeader`

- **Linha 1:** botão **← Tarefas** (vai para `/`) e, com projeto, `/ Nome do projeto`, que abre o
  projeto.
- **Identidade:** `StatusSelect` e `TaskIdBadge` (`#id`, clique copia) — ainda os legados, até a
  F3-b —, o **nome** (`Input` sem borda, 22px/600; grava ao sair do campo ou com Enter; vazio volta
  ao nome anterior) e a **descrição** (`TextArea` sem borda, 1 a 4 linhas, grava ao sair).
- **Bloco do timer:** ponto ao vivo quando roda, cronômetro em Geist Mono tabular de 30px (24px
  abaixo de `md`) — `colorTextTertiary` parado, `colorText` rodando, `colorError` a partir do
  limite —, **Iniciar/Pausar** (primário; o texto aparece a partir de `lg`; desabilitado com o
  tooltip "Bloqueada: depende de #id" quando há dependência aberta) e **Finalizar** (para o timer e
  muda o status para Finalizada).
- **Ações:** **Terminal** (`TerminalTaskButton`: sem diretório de trabalho, próprio ou herdado do
  projeto, abre o seletor de pasta e depois o terminal; com diretório, alterna o painel de terminal
  na sessão desta task; fica primário quando o painel mostra esta task; ver
  [16-terminal.md](16-terminal.md)), **Campos do Jira** (só task do Jira, abre o `JiraFieldsSheet`),
  **Painel** (de `md` para cima) e o menu **⋯**: Copiar `#id`, Zerar tempo… (confirmação), Arquivar
  (volta para a lista) ou Desarquivar, Excluir tarefa… (confirmação que cita notas, desenho, Notion e
  Google).

O cronômetro gigante da antiga coluna central, a faixa de acento colorida pela categoria e os botões
Arquivar/Deletar no fim do painel saíram. Ao atingir o limite, o app ainda dispara a notificação do
sistema uma única vez (até zerar o tempo ou trocar de tarefa).

## Área de trabalho — `TaskWorkspace`

Cartão com as abas **Notas | Desenho**, as ações da nota (só na aba Notas) e o botão **Modo foco**
(`Expand`, "Modo foco (Esc sai)").

- **Salvar local** (`NotesActions`) — na primeira vez abre o seletor de arquivo e grava a nota como
  Markdown com frontmatter YAML + imagens copiadas; depois cada auto-save (de nota ou desenho)
  reexporta.
- **Salvar e sincronizar** — força o save e empurra a nota para o Notion. Além disso, a cada **60
  segundos** a página sincroniza sozinha se houver alteração pendente e o Notion estiver configurado.

### Modo foco — `FocusOverlay`

Camada `position: fixed` sobre o shell inteiro (sidebar, header e barra de status somem), no
`zIndexPopupBase` do tema. Barra de 48px: **Sair**, nome da tarefa, ponto ao vivo, cronômetro mono,
Iniciar/Pausar, `Segmented` Notas/Desenho (rótulos a partir de `sm`), as ações da nota e o botão de
sair (`Shrink`). As notas ficam numa coluna de leitura de 68 caracteres em 17px; o desenho usa a
largura toda. **Esc** sai, menos com um popup de sugestão aberto (`[data-suggestion-popup]`), para
não fechar o modo quando o usuário só queria fechar o menu de barra ou de menção.

O editor não é remontado ao entrar ou sair do foco: a camada é o próprio cartão da área de trabalho
trocando de estilo, com o editor na mesma posição da árvore. O foco substituiu os modos
**maximizado** e **zen** de antes, e a largura arrastável do painel de notas saiu junto.

## Inspetor — `TaskInspector`

Abas **Tempo** (`Timer`), **Detalhes** (`FileText`) e **Relações** (`Network`; vira um cadeado
laranja quando a tarefa está bloqueada e mostra `feitas/total` das subtarefas em mono). Cada seção
abre com um `SectionHeader` (`components/shell/`): rótulo 11px/600 em maiúsculas, linha até o fim e
um número em mono à direita.

### Tempo — `TaskTimePanel`

- Barra do limite, só com limite: `colorSuccess` até 80%, `colorWarning` até 100%, `colorError`
  depois; porcentagem em mono.
- **Total** (o cronômetro ao vivo) e **Sessões** (quantidade), em `Statistic` com valor mono.
- **Sessões:** a em andamento no topo, com ponto ao vivo e "– agora"; as encerradas com início e
  `+HH:MM:SS`. Só leitura (editar e excluir chegam na F3-f).
- **Ajustes de tempo:** Adicionar, Total e Limite, cada um com campo mono `HH:MM:SS` e botão (Enter
  também confirma; valor fora do formato avisa e não grava). **Remover limite** grava 0.

### Detalhes — `TaskDetailsPanel`

Até a F3-b, o painel ainda carrega os campos que vão virar pílulas da barra de propriedades, com os
controles legados:

- **Organização:** Categoria (`CategorySelect`), Aguardando (`WaitingForField`, com status Aguardando
  ou texto salvo; grava `waiting_for` ao sair do campo ou com Enter, vazio limpa), Projeto
  (`SearchableSelect` + "Abrir projeto →"), Contextos (pílulas alternáveis, coloridas pela cor do
  contexto quando ativas) e Tags (`TagInput`).
- **Agenda:** Programado para e Prazo, Recorrência, Energia (clicar no ativo desmarca) e Link externo.
- **Jira** (só task do Jira): `JiraTaskControls` e a issue pai.
- **Google Calendar** e **Ambiente** (diretório de trabalho e comando).

A lista de projetos do select inclui os `active`, os `someday` **e** o projeto atual, mesmo que
concluído ou arquivado — assim uma tarefa vinculada a projeto arquivado não perde o vínculo ao ser
editada.

**`JiraTaskControls`** (`components/jira/`) — usado só no detalhe (a lista mostra a chave e o submenu Jira desde a F2-i), só quando a
task tem `jira_key`. Quatro peças, num wrapper que para a propagação do clique (senão abriria a task):
- chip cinza com `Layers` e o **espaço** da issue (`tasks.jira_space`, gravado pela importação; antes
  da primeira importação que o preenche, mostra o prefixo da chave, ex.: `CON`).
- `JiraIssueTypeBadge`: chip colorido com o **tipo** da issue (`tasks.jira_issue_type`), cor e ícone
  pela classe em `tasks.jira_issue_kind` — épico roxo, história verde, tarefa azul, bug vermelho,
  subtarefa cinza. A classe vem de `classifyIssueType` (`jiraPlan.ts`): nível da hierarquia do
  Jira primeiro (>0 épico, <0 subtarefa), nome do tipo depois. Some antes da primeira importação.
- chip azul **Jira · {status}**: um `Select` que, ao abrir, busca as transições da issue
  (`jira:listTransitions`) e aplica a escolhida (`jira:transition`). É independente do `StatusChip`
  local — mudar um não muda o outro.
- botão `SlidersHorizontal` (só no card e na tabela; o detalhe usa o botão azul "Campos do Jira",
  ver `02-detalhe-da-tarefa.md`) que abre o `JiraFieldsSheet`: painel lateral direito com os campos
  editáveis da issue (vindos do `editmeta`), um editor por tipo (texto, número, data, seleção,
  múltipla escolha, rótulos, pessoa com "Atribuir a mim", sprint). Múltipla escolha (ex.: Cliente,
  Equipe) é um `SearchableSelect` "Adicionar opção…" com as escolhidas em chips removíveis. Cada campo grava ao sair do
  campo/escolher; erro do Jira volta como toast e o campo retorna ao valor anterior.

A lista de projetos do select inclui os `active`, os `someday` **e** o projeto atual, mesmo que
concluído ou arquivado — assim uma tarefa vinculada a projeto arquivado não perde o vínculo ao ser
editada.

Detalhes da agenda e do ambiente:

- **Programado para** e **Prazo** — dois `input[type=date]` de 32px lado a lado, `bg-slate-50`.
  Com a data preenchida, aparecem campos de hora (`TimeInput`, `input[type=time]` com `×` para
  limpar): **Início** e, depois dele, **Fim** sob "Programado para"; **Hora** sob "Prazo". Fim ≤
  início é descartado pelo main (`normalizeTaskTimes`) e o campo volta vazio.
- **Recorrência** — `RecurrenceSelect`.
- **Energia** — três botões de largura igual (`flex-1 h-8`) com o `EnergyMeter` + rótulo. O ativo
  ganha fundo e borda neutros. Clicar no ativo desmarca.
- **Link externo** — `ExternalLinkField`: campo de URL `http(s)` salvo ao sair do campo ou com Enter
  (valor inválido é descartado com aviso). Quando há link válido, um botão abre no navegador via
  `appOpenExternal`, que revalida o esquema no main. Tasks importadas do Jira trazem o link da issue. Nelas, as **Notas** espelham a descrição da
  issue: a importação as substitui quando a descrição muda no Jira, e salvar as notas envia a
  descrição de volta (~2s depois). O editor aberto não recarrega sozinho se uma importação trouxer
  descrição nova.
- **Diretório de trabalho** — `WorkingDirField`: mostra o fim do caminho (`…/pasta/repo`, completo
  no `title`) e um botão **Escolher/Alterar** que abre o seletor de pasta do sistema
  (`terminal:pickDirectory`, grava na hora). Com diretório definido aparece **Comando ao abrir o
  terminal**, gravado ao sair do campo. Os dois campos são locais: não vão ao Notion nem ao Jira.
- **Google Calendar** — `GoogleCalendarTaskToggle`, só renderizado com o Google conectado: switch
  que grava `gcal_sync` e sincroniza na hora (desligar apaga os eventos da task), mais um botão
  `RefreshCw` de ressincronizar quando ligado.

### Relações — `TaskRelationsPanel`

**Subtarefas** — só quando a tarefa não é ela mesma uma subtarefa (`!task.parent_task_id`): não há
hierarquia de três níveis. O `SectionHeader` mostra `feitas/total`.

`SubtaskList` mostra:
- aviso laranja "Subtarefas bloqueadas — conclua as dependências da tarefa pai primeiro", quando a
  tarefa-pai está bloqueada;
- contador `{feitas}/{total} concluídas` + porcentagem + `Progress` de 6px;
- cada subtarefa: checkbox (desabilitado se a pai está bloqueada) + nome clicável que **navega para a
  subtarefa** (com sublinhado no hover);
- botão "Nova subtarefa" que vira campo inline (Enter confirma, Esc cancela) com botões Adicionar /
  Cancelar.

Marcar o checkbox alterna entre `finalizada` e `inbox` — não devolve ao status anterior.

**Depende de** — `DependencySelector`:
- cada dependência é uma linha colorida — **verde** com "✓ concluída" se já finalizada, **laranja**
  caso contrário — com cadeado, nome e "×" para remover;
- botão "Adicionar dependência" abre um seletor embutido com campo de busca e até 10 resultados,
  mostrando o status cru (`inbox`, `proximas`…) à direita de cada opção.

> Esse seletor carrega **todas** as tarefas via `window.api.listTasks()` e filtra no cliente — é o
> único lugar do app que ainda faz isso.

**Issues filhas no Jira** — em task do Jira que não é subtarefa (`JiraChildIssues`). Ao abrir, busca no Jira as issues com `parent = <chave>` (`jira:getChildren`)
— **todas**, inclusive as de outras pessoas, que a importação não traz. Cada linha: tipo, chave,
resumo e status Jira. Clique abre a task no CrafyTask se a issue já foi importada; senão abre a
issue no navegador (ícone `ExternalLink`). Sem filhas, a seção some. Se o Jira falhar, mostra um
aviso âmbar e só as filhas já importadas (`jira_parent_key` local).

## Notas e desenho

### Editor de notas (Tiptap / ProseMirror)

Conteúdo com `class="notes-editor-content p-5 min-h-[200px]"`. Auto-save com **debounce de 400ms**
(`window.api.updateTaskNotes`). Além disso, enquanto o painel está aberto, um intervalo de **60
segundos** sincroniza com o Notion se houver alterações pendentes e o Notion estiver configurado.

Recursos disponíveis:

| Recurso | Como se aciona | Detalhes |
| --- | --- | --- |
| **Barra flutuante** | selecionar texto | negrito, itálico, tachado, código, marca-texto, **tamanho da fonte** (12/14/16/18/24/32 + Padrão), link (via `window.prompt`) |
| **Menu de barra** | digitar `/` | Título 1/2/3, Lista, Lista numerada, Checklist, Citação, Código, Divisor, Tabela, Imagem — navegável por ↑↓ e Enter |
| **Menções** | digitar `@` | busca tarefas, projetos, contextos e páginas de caderno; cada item mostra o tipo à direita; vira um chip azul-índigo no texto. Clicar no chip salva a nota e abre a task, o projeto ou a página (contexto não navega) |
| **Alça de arraste** | passar o mouse à esquerda de um bloco | `GripVertical` para reordenar blocos |
| **Menu de tabela** | botão direito | dentro de tabela: adicionar/excluir coluna e linha, mesclar, dividir, excluir tabela (vermelho); fora: "Inserir tabela" |
| **Imagens** | colar ou arrastar arquivo | gravadas em `userData/notes-assets`, referenciadas pelo esquema `ticktask-asset://` |
| **Placeholder** | documento vazio | "Escreva suas anotações... (digite / para comandos)" |

O menu de barra mostra no máximo 12 itens (a lista tem 11) e filtra pelo texto digitado.

### Editor de desenho (Excalidraw)

Carregado com `React.lazy` — o pacote é grande e só a aba de desenho paga por ele. Enquanto carrega,
um `Loader2` girando ocupa a área.

- Idioma `pt-BR`.
- Auto-save com **debounce de 800ms**.
- Salva o JSON da cena **e** um PNG derivado no mesmo IPC (`drawing:save`) — MCP, Notion e exportação
  local leem esse PNG, então as duas gravações não podem divergir.
- Do `appState` só o `viewBackgroundColor` é persistido; o resto é estado volátil.
- A biblioteca de formas prontas do Excalidraw é escondida por CSS (`.sidebar-trigger`) por não fazer
  parte do fluxo do app.

### Persistência do conteúdo entre remontagens

O editor grava direto pelo IPC, sem passar pelo hook de detalhe da tarefa. Para que uma remontagem
(trocar entre Notas e Desenho, ou cruzar a largura `md`, que move a área de trabalho para dentro das
abas) não restaure um conteúdo velho, a página guarda o último JSON salvo em estado local
(`savedNotes` / `savedDrawing`) e o usa na remontagem. Trocar de tarefa limpa esses caches, sai do
modo foco e volta para a aba **Notas**.

## Estados especiais

| Situação | O que aparece |
| --- | --- |
| Carregando (primeira vez ou outra tarefa) | `Spin` centralizado. Recarregar a mesma tarefa depois de uma edição não troca a tela pelo spinner |
| Tarefa inexistente | `Empty` "Tarefa não encontrada" + botão "Voltar para Tarefas" |
| Tarefa bloqueada | Iniciar desabilitado com "Bloqueada: depende de #id"; cadeado na aba Relações |
| Limite atingido | Cronômetro e barra em `colorError` + notificação do sistema (uma vez) |

## Nota de arquitetura visível na UI

A página usa `h-full`, nunca `h-screen`: o `Content` do `AppShell` já desconta o header. Com
`100vh`, um `scrollIntoView` (o Excalidraw dá foco ao canvas ao selecionar um elemento) rolaria o
excesso e esconderia parte da tela atrás do header. No modo foco a camada é `fixed` e não rola.
