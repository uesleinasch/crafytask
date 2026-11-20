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
cima, a linha da área de trabalho ocupa o resto da altura (mínimo 520px): o editor e o inspetor
rolam dentro dos seus cartões. Abaixo de `md`, a área de trabalho tem altura mínima de 360px (480px
na aba Desenho) e cresce com o conteúdo.

## Cabeçalho — `TaskHeader`

- **Linha 1:** botão **← Tarefas** (vai para `/`) e, com projeto, `/ Nome do projeto`, que abre o
  projeto.
- **Identidade:** **Status** (`Select` do antd, pequeno e preenchido, cada opção com o ícone e a
  cor do status; Executando desabilitado quando a tarefa está bloqueada), `#id` em `Tag` mono (clique
  ou Enter copia), etiqueta do Jira com tipo · chave · status Jira (só task do Jira), "Arquivada"
  (só arquivada), o **nome** (`Input` sem borda, 22px/600; grava ao sair do campo ou com Enter; vazio volta
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
  (fica na tela; o menu passa a oferecer Desarquivar) ou Desarquivar, Excluir tarefa… (confirmação que cita notas, desenho, Notion e
  Google).

### Barra de propriedades — `TaskPropertyBar`

As pílulas moram em `tasks/propertyPills.tsx`, com `value`/`onChange`, e o modal Nova tarefa usa as
mesmas. A barra só liga cada uma ao `update` da task (e resolve as tags por id).

Pílulas de 28px (classe `.ct-prop` em `main.css`, sobre as variáveis do antd; vazia fica tracejada e
apagada) que abrem um `Popover` de edição (`role="dialog"`, foco no primeiro controle, `aria-expanded`
na pílula). Cada mudança grava na hora; campos de texto gravam ao sair ou com Enter.

| Pílula | Aparece | Edição |
| --- | --- | --- |
| Aguardando (`Hourglass`) | primeira, com status Aguardando ou texto salvo | campo de até 120 caracteres; grava `waiting_for` ao sair ou com Enter (vazio limpa). Com texto: "Aguardando: Revisor externo" na cor de Aguardando; vazia: "Aguardando quem?" |
| Categoria | sempre | os quatro `CategoryChip` (Urgente, Prioridade, Normal, Time leak); Normal aparece como texto |
| Projeto | sempre | `Select` com busca (ativos, someday e o atual, mesmo concluído ou arquivado, para não perder o vínculo) + "Abrir projeto →" |
| Contextos (`MapPin` quando vazia) | sempre | `CheckableTag` por contexto; a pílula mostra dois e "+N"; sem contextos, `Empty` com o link "Criar em Contextos e tags" |
| Prazo (`Flag`) | sempre | data + hora (`DatePicker`/`TimePicker`), "Remover prazo"; vermelha se vencido, âmbar se hoje |
| Energia | sempre | três botões com `EnergyMeter`; clicar no ativo limpa |
| Programado (`CalendarClock`) | com valor, ou por "+ Propriedade" | data + início/fim (`TimePicker.RangePicker`; o fim só libera com início, e fim antes do início avisa e não grava), "Remover agendamento" |
| Recorrência (`Repeat`) | idem | `Select` (Não repete, diária, semanal, mensal; regra fora disso aparece como Personalizada) |
| Tags (`Tags`) | idem | `Select` em modo tags; nome novo vira tag (`tag:getOrCreate`) |
| Link externo (`Link`) | idem | URL `http(s)` gravada ao sair ou com Enter (inválida avisa e volta), botão abre no navegador por `appOpenExternal`; em task do Jira, avisa que é o link da issue |

Fim ≤ início do agendamento é descartado pelo main (`normalizeTaskTimes`). Tasks importadas do Jira
trazem o link da issue, e nelas as **Notas** espelham a descrição da issue: a importação as
substitui quando a descrição muda no Jira, e salvar as notas envia a descrição de volta (~2s
depois). O editor aberto não recarrega sozinho se uma importação trouxer descrição nova.

### Aviso de bloqueio

Com dependência aberta, um `Alert` de aviso (`Lock`) diz "Bloqueada por dependências: nome, nome"
(os nomes vêm de `getDependencies`, filtrados pelos ids de `blocked_by`) e oferece **Ver
dependências**, que abre a aba Relações (no inspetor lateral, no `Drawer` ou nas abas do estreito).

O cronômetro gigante da antiga coluna central, a faixa de acento colorida pela categoria e os botões
Arquivar/Deletar no fim do painel saíram. Ao atingir o limite, o app ainda dispara a notificação do
sistema uma única vez (até zerar o tempo ou trocar de tarefa).

## Área de trabalho — `TaskWorkspace`

Cartão com as abas **Notas | Desenho**, as ações da nota (só na aba Notas) e o botão **Modo foco**
(`Expand`, "Modo foco (Esc sai)").

As duas ações (`NotesActions`) são botões `text` com tooltip, também na barra do modo foco:

- **Salvar em arquivo local** (`Save`) — na primeira vez abre o seletor de arquivo e grava a nota
  como Markdown com frontmatter YAML + imagens copiadas; depois cada auto-save (de nota ou desenho)
  reexporta. Com arquivo escolhido, o nome aparece em mono ao lado do ícone a partir de `lg`, e o
  tooltip mostra o caminho; clicar de novo escolhe outro arquivo.
- **Salvar e sincronizar com o Notion** (`RefreshCw`, gira enquanto sincroniza) — força o save e
  empurra a nota para o Notion. Além disso, a cada **60
  segundos** a página sincroniza sozinha se houver alteração pendente e o Notion estiver configurado.

### Modo foco — `FocusOverlay`

Camada `position: fixed` sobre o shell inteiro (sidebar, header e barra de status somem), no
`zIndexPopupBase` do tema. Barra de 48px: **Sair**, nome da tarefa, ponto ao vivo, cronômetro mono,
Iniciar/Pausar, `Segmented` Notas/Desenho (rótulos a partir de `sm`), as ações da nota e o botão de
sair (`Shrink`). As notas ficam numa coluna de leitura de 68 caracteres em 17px; o desenho usa a
largura toda. **Esc** sai, menos com um popup de sugestão aberto (`[data-suggestion-popup]`), para
não fechar o modo quando o usuário só queria fechar o menu de barra ou de menção.

Ao abrir, o foco do teclado vai para a camada e o Tab fica preso nela; ao sair, volta para o botão
Modo foco. O editor não é remontado ao entrar ou sair do foco: a camada é o próprio cartão da área de trabalho
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
- **Total** (o cronômetro ao vivo, em formato curto: `2h32`, `45 min`) e **Sessões** (quantidade),
  em `Statistic` com valor mono. O rótulo do limite usa o mesmo formato curto.
- **Sessões:** a em andamento no topo, com ponto ao vivo e "– agora"; as encerradas com dia,
  início e fim e `+HH:MM:SS`. Cada encerrada tem **editar** (`Pencil`: início e fim em `HH:MM` no
  dia da sessão, Enter ou Salvar grava, Esc ou Cancelar desiste; fim antes do início avisa) e
  **excluir** (`Trash2`, `Popconfirm` que avisa que o tempo sai do total e o worklog do Jira é
  apagado). O main (`timeEntry:update`/`timeEntry:delete`, regras em `timeEntryQueries.ts`) recusa
  a sessão em andamento e ajusta `total_seconds` pela diferença.
- **Ajustes de tempo:** Adicionar, Total e Limite, cada um com campo mono `HH:MM:SS` e botão (Enter
  também confirma; valor fora do formato avisa e não grava). **Remover limite** grava 0.

### Detalhes — `TaskDetailsPanel`

Cada seção usa `Field` (rótulo de 92px à esquerda, controle à direita).

- **Jira** (só task do Jira):
  - **Issue:** o tipo (`tasks.jira_issue_type`) numa `Tag` e a chave em mono, que abre a issue no
    navegador; o tooltip da chave diz o espaço (`tasks.jira_space`, ou o prefixo da chave antes da
    primeira importação que o preenche).
  - **Status Jira:** `JiraStatusSelect`, um `Select` que mostra o status atual e, ao abrir, busca as
    transições da issue (`jira:listTransitions`) e aplica a escolhida (`jira:transition`). É
    independente do status local: mudar um não muda o outro.
  - **Pai:** chave + resumo da issue pai, que abre no navegador.
  - Botão **Campos do Jira**, que abre o `JiraFieldsSheet` (o mesmo do cabeçalho): um `Drawer` do
    antd de 380px, título "Campos do Jira · CHAVE", com Abrir no Jira e Recarregar no canto. Dentro,
    o status Jira e os campos editáveis da issue (vindos do `editmeta`) em `Field`, um editor antd
    por tipo (`Input`, `TextArea`, `InputNumber`, `DatePicker`, `Select` simples, múltiplo, de tags e
    de pessoa com busca e "Atribuir a mim"); cada campo grava ao sair ou escolher; erro do Jira volta
    por `message` e o campo retorna ao valor anterior.
- **Google Calendar** — só com o Google conectado: `Switch` que grava `gcal_sync` e sincroniza na
  hora (desligar apaga os eventos da task), o texto "Na agenda TickTask" / "Fora do Google
  Calendar" e, ligado, o botão de ressincronizar (`RefreshCw`).
- **Ambiente** — Diretório: o fim do caminho em mono (`…/pasta/repo`, completo no tooltip), etiqueta
  "do projeto" quando herdado, **Escolher/Alterar** (seletor de pasta do sistema,
  `terminal:pickDirectory`, grava na hora) e, com diretório próprio num projeto que também tem um,
  o botão de voltar a herdar (`Undo2`). Com diretório, **Comando ao abrir o terminal** (mono, grava
  ao sair ou com Enter). **Abrir terminal** mostra o painel de terminal na sessão desta task (sem
  diretório, pede a pasta antes; se o painel já mostra esta task, não fecha). Erros dessas ações
  aparecem como aviso. Diretório e comando são locais: não vão ao Notion nem ao Jira.

### Relações — `TaskRelationsPanel`

**Subtarefas** — só quando a tarefa não é ela mesma uma subtarefa (`!task.parent_task_id`): não há
hierarquia de três níveis. O `SectionHeader` mostra `feitas/total`.

- `Alert` "Subtarefas bloqueadas: conclua as dependências da tarefa pai primeiro." quando a pai está
  bloqueada;
- `Progress` pequeno com a porcentagem;
- cada subtarefa: `Checkbox` (desabilitado para as abertas se a pai está bloqueada) + nome que
  **navega para a subtarefa** (riscado quando finalizada);
- botão tracejado **Nova subtarefa**, que vira campo inline (Enter confirma, Esc ou Cancelar
  descartam o texto) com Adicionar (desabilitado com o nome vazio) / Cancelar.

Marcar o checkbox alterna entre `finalizada` e `inbox` — não devolve ao status anterior.

**Depende de** — cada dependência é uma linha com fundo da cor de Executando e "✓ concluída" quando
já não bloqueia, ou da cor de Prioridade e "pendente" quando bloqueia (vem de `blocked_by`), com
cadeado, nome e "×" para remover. Abaixo, um `Select` "Adicionar dependência…" que **busca no main**
(`listTasks` com `search` e `limit`, 250ms de debounce) e mostra até 10 tarefas com o `StatusChip` à
direita.

**Issues filhas no Jira** — em task do Jira que não é subtarefa. Ao abrir, busca no Jira as issues
com `parent = <chave>` (`jira:getChildren`) — **todas**, inclusive as de outras pessoas, que a
importação não traz. Cada linha: tipo numa `Tag`, chave em mono, resumo e status Jira. A chave abre a task no
CrafyTask se a issue já foi importada; senão abre a issue no navegador (ícone `ExternalLink`). Sem
filhas, a seção some. Se o Jira falhar, mostra um aviso e só as filhas já importadas
(`jira_parent_key` local).

## Notas e desenho

O editor de notas, o de desenho e cada terminal ficam dentro de um `RegionBoundary` próprio
("editor de notas", "editor de desenho", "terminal"): se um quebra, só aquela área mostra "Esta área
falhou" com Tentar de novo, e o resto da tela continua. As cores do conteúdo do Tiptap e dos popups
dele (classes `.ct-popup`, `.ct-popup-item` e `.ct-tool` em `main.css`) vêm das variáveis CSS do
antd; o menu `/` e as menções são pendurados dentro do shell (`[data-popup-root]`) para herdá-las. O
Excalidraw recebe o tema atual (`theme`).

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
| Tarefa arquivada | Só leitura (`task.is_archived`). Acima do cabeçalho, `ArchivedTaskBanner`: `Alert` informativo "Arquivada em DD/MM/AAAA · só leitura", a frase do que fica travado e **Desarquivar**. Nome e descrição `readOnly`; status, Iniciar, Finalizar, terminal e Campos do Jira desabilitados (Pausar continua se o timer estava rodando); pílulas tracejadas, em cinza, sem popover e sem "+ Propriedade"; "Zerar tempo" desabilitado no `⋯`; Tiptap com `editable: false` e sem barra/alça; Excalidraw em `viewModeEnabled` (não grava); nada regrava as notas (clicar em menção só navega, exportar não salva antes); painéis do inspetor sob `ConfigProvider componentDisabled` (links continuam abrindo). Voltar, abas, modo foco, exportar as notas e o `⋯` (Desarquivar, Copiar, Excluir) continuam. Desarquivar relê a tarefa e libera tudo |

## Nota de arquitetura visível na UI

A página usa `h-full`, nunca `h-screen`: o `Content` do `AppShell` já desconta o header. Com
`100vh`, um `scrollIntoView` (o Excalidraw dá foco ao canvas ao selecionar um elemento) rolaria o
excesso e esconderia parte da tela atrás do header. No modo foco a camada é `fixed` e não rola.
