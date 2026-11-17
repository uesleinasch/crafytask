# Guia de design

Regras da interface nova do CrafyTask: Ant Design com paleta própria, AppShell que isola falhas,
responsivo de 400px a monitor largo, com modo escuro. O [protótipo](prototipo/index.html)
([versão publicada](https://claude.ai/artifact/Vvt5YdciJdFX6ut1sqfbAm)) mostra as regras juntas; o
[plano de refatoração](plano-de-refatoracao.md) diz em que ordem elas chegam ao código; a
[pesquisa](pesquisa/README.md) explica de onde cada uma veio.

Quando código e guia discordarem, o guia vence. Para mudar uma regra, mude o guia primeiro (a skill
`design-crafytask` descreve o passo a passo).

## 1. Direção: bancada

O CrafyTask é uma bancada de trabalho: fica aberta o dia todo, guarda o que a cabeça não precisa
guardar e mostra o que está rodando agora. Daí três escolhas:

- **Calma por padrão.** Superfícies neutras com um leve tom violeta. A cor aparece só onde existe
  estado: ação primária, o que está executando, erro e prazo vencido.
- **Precisão no que é medido.** Tempo é o dado mais lido do app. Tempo, ids e contadores usam fonte
  mono com algarismos tabulares, sempre alinhados.
- **Ofício, não enfeite.** O roxo da marca (`#705EFF`, logo em Denk One) é a assinatura. Ele aparece
  no logo e na ação, nunca como fundo decorativo, gradiente ou faixa.

## 2. Princípios

Cada princípio vem de uma conclusão da pesquisa ([lista completa](pesquisa/README.md#conclusoes-principais)).

| Princípio                             | O que muda na tela                                                                                                   | Base                              |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Manter o sistema tem que custar pouco | Captura de uma linha em qualquer tela, edição inline, nenhum campo obrigatório além do nome                          | Bellotti 2004; Kamsin 2012        |
| Planejar libera a mente               | Processar o inbox pede próxima ação, contexto e quando em poucos cliques; o plano do dia tem lugar fixo na navegação | Masicampo e Baumeister 2011       |
| O app é memória externa               | Inbox, executando e aguardando sempre visíveis (contadores na navegação e nas abas)                                  | Heylighen e Vidal 2008            |
| Retomar precisa de pista              | Timers rodando no header em toda tela; a task mostra a última nota, a sessão e o terminal                            | Iqbal e Horvitz 2007              |
| Notificação custa atenção             | Toast só para o que pede ação; sync e integrações ficam na barra de status, sem interromper                          | Stothart 2015; Mark 2008          |
| Cor guia, cor sozinha exclui          | Status sempre com ícone e texto; vermelho só para erro, prazo vencido e urgente                                      | Wolfe e Horowitz 2004; WCAG 1.4.1 |
| Teclado primeiro                      | `Ctrl+K` em todo lugar, captura global, atalhos visíveis nos tooltips                                                | Linear, Things, Akiflow           |

## 3. Cor

### 3.1 Base

Neutros com croma baixo puxado para o violeta (matiz ≈ 282 em OKLCH), nunca cinza puro. Valores
calculados e conferidos: todo texto passa WCAG AA (4,5:1) sobre a superfície onde aparece.

| Token          | Claro     | Escuro    | Uso                          | Token antd                                   |
| -------------- | --------- | --------- | ---------------------------- | -------------------------------------------- |
| `bg`           | `#F6F5FA` | `#111018` | fundo do layout              | `colorBgLayout`                              |
| `surface`      | `#FFFFFF` | `#1A1923` | cards, tabela, header        | `colorBgContainer`                           |
| `elevated`     | `#FFFFFF` | `#22202E` | popover, modal, dropdown     | `colorBgElevated`                            |
| `sider`        | `#FBFAFE` | `#15141D` | navegação lateral            | `Layout.siderBg`                             |
| `border`       | `#E4E2EE` | `#2E2B3C` | divisórias, borda de card    | `colorBorderSecondary`                       |
| `borderStrong` | `#CFCCDD` | `#403C52` | borda de controle            | `colorBorder`                                |
| `text`         | `#1B1A27` | `#ECEAF6` | texto principal              | `colorText`                                  |
| `text2`        | `#5B5970` | `#A9A6BE` | texto secundário             | `colorTextSecondary`                         |
| `text3`        | `#6B6980` | `#8A879F` | metadado, rótulo de seção    | `colorTextTertiary`                          |
| `primary`      | `#5B47EB` | `#8F82FF` | ação primária, link, seleção | `colorPrimary`, `colorLink`                  |
| `primarySoft`  | `#EFEDFF` | `#221E3D` | item selecionado             | `Menu.itemSelectedBg`, `Table.rowSelectedBg` |
| `brand`        | `#705EFF` | `#8F82FF` | logo                         | —                                            |

`#705EFF` com texto branco dá 4,44:1 e não passa AA; por isso o botão usa `#5B47EB` (5,92:1) e o
`#705EFF` fica no logo, que é texto grande ([cálculo](pesquisa/03-cor-acessibilidade-e-modo-escuro.md)).

Feedback do sistema: sucesso `#0B7A50` / `#4CD69A`, aviso `#A15C00` / `#F0B44C`, erro `#C02331` /
`#FF7A82`, informação `#2A62D6` / `#7AA5FF` (`colorSuccess`, `colorWarning`, `colorError`,
`colorInfo`).

### 3.2 Domínio GTD

Um módulo só (`src/renderer/src/theme/semantic.ts`) define estas cores. Cada par é texto sobre
fundo do chip; todos passam 4,5:1 nos dois temas.

**Status da task** — o croma diz o quanto é acionável agora: forte para próximas e executando,
médio para aguardando, baixo para inbox, someday e finalizada.

| Status     | Ícone (lucide)                | Claro texto / fundo   | Escuro texto / fundo  |
| ---------- | ----------------------------- | --------------------- | --------------------- |
| Inbox      | `Inbox`                       | `#5D6B82` / `#EEF1F6` | `#9AA8C0` / `#232A36` |
| Aguardando | `Hourglass`                   | `#A15C00` / `#FFF4E0` | `#F0B44C` / `#33280F` |
| Próximas   | `ArrowRightCircle`            | `#2A62D6` / `#EAF0FF` | `#7AA5FF` / `#1C2744` |
| Executando | `PlayCircle` + ponto pulsando | `#0B7A50` / `#E3F6EC` | `#4CD69A` / `#123326` |
| Finalizada | `CheckCircle2` + nome riscado | `#526B5E` / `#EDF2EF` | `#93AE9F` / `#1F2A25` |
| Someday    | `Lightbulb`                   | `#0F6E7A` / `#E2F4F6` | `#5CC8D4` / `#12302F` |

**Categoria** — `normal` não tem cor (é o caso comum e não deve gritar).

| Categoria  | Ícone   | Claro                       | Escuro                |
| ---------- | ------- | --------------------------- | --------------------- |
| Urgente    | `Flame` | `#C02331` / `#FDECEE`       | `#FF7A82` / `#3A1A1E` |
| Prioridade | `Flag`  | `#A84803` / `#FFF0E5`       | `#FF9A55` / `#3A2414` |
| Normal     | —       | texto secundário, sem fundo | idem                  |
| Time leak  | `Clock` | `#94600E` / `#FFF6DD`       | `#F2C062` / `#352A10` |

Time leak é âmbar em todo lugar. O roxo que ele usa hoje no acento da task e no dashboard sai
(inconsistência A1).

**Escala de time leak** — a única semântica que pinta o fundo da linha ou do card inteiro. Três
níveis, nos limiares atuais: `#FFF6DD` → `#FFF0E5` → `#FDECEE` no claro, `#2A2412` → `#2E2016` →
`#301A1E` no escuro. O texto continua `text`.

**Energia** — não usa cor: um medidor de três barras na cor primária (cheias = nível), com tooltip
"Energia alta/média/baixa". O emoji atual sai.

**Projetos, contextos e tags** — cor livre escolhida pelo usuário, mostrada só como ponto de 8px ao
lado do nome. Nunca como fundo de texto.

**Gráficos** — oito cores categóricas na mesma luminosidade, na ordem:
`#5B47EB #2A62D6 #0F6E7A #0B7A50 #A15C00 #A84803 #B8327A #5D6B82` (claro) e
`#8F82FF #7AA5FF #5CC8D4 #4CD69A #F0B44C #FF9A55 #F07AB8 #9AA8C0` (escuro). Gráfico de status usa as
cores de status, não estas.

### 3.3 Regras

- Sem paleta padrão do antd: `colorPrimary` sempre definido pelos tokens.
- Cor em componente vem de `theme.useToken()`, das variáveis CSS do antd ou de `semantic.ts`. Hex
  solto e classe de cor do Tailwind são proibidos (`F9.1`, `F9.5` do checklist).
- Paleta nova se monta em OKLCH e passa 4,5:1 (texto) e 3:1 (ícone, borda de controle) nos dois
  temas antes de entrar.

## 4. Tipografia

| Papel           | Fonte                      | Tamanho / peso                                | Onde                                     |
| --------------- | -------------------------- | --------------------------------------------- | ---------------------------------------- |
| Marca           | Denk One                   | 22px (header), 28px (vitrine)                 | só o logo                                |
| Título de tela  | Geist                      | 20–24 / 600                                   | cabeçalho da página                      |
| Título de seção | Geist                      | 16 / 600                                      | card, painel                             |
| Interface       | Geist                      | 14 / 400–500                                  | texto, tabela, controles                 |
| Metadado        | Geist                      | 12 / 400                                      | ids, datas, legendas; nunca abaixo de 12 |
| Rótulo de seção | Geist                      | 11 / 600, maiúsculas, `letter-spacing: .08em` | "ORGANIZAÇÃO", "AGENDA"                  |
| Números         | Geist Mono, `tabular-nums` | 12–14 em listas; 52–72 no timer               | tempo, ids, contadores, prazos           |

Geist e Geist Mono entram por `@fontsource-variable/*` (o app é offline e a CSP bloqueia fonte
remota). Isso também corrige `--font-sans`/`--font-mono`, que hoje apontam para variáveis que não
existem. Token antd: `fontFamily` (Geist) e `fontFamilyCode` (Geist Mono), `fontSize: 14`.

## 5. Forma, espaço e densidade

- **Raio:** 4 (`borderRadiusXS`, tag), 6 (`borderRadiusSM`, chip e controle pequeno), 8
  (`borderRadius`, controle e card), 12 (`borderRadiusLG`, modal, coluna do Kanban, barra
  flutuante). `999px` só para pílula de timer e ponto. Nada de outros valores.
- **Sombra:** só no que flutua (popover, modal, barra de ações em massa). Card na página tem borda,
  sem sombra.
- **Espaço:** múltiplos de 4. Página com 24px de margem lateral (12px abaixo de `md`), 16px entre
  cards, 8px entre controles de uma barra.
- **Densidade:** padrão "confortável" (`controlHeight` 32, linhas de tabela com 10px). "Compacta"
  liga o `compactAlgorithm` e linhas de 6px. Alvo de clique nunca menor que 24px (WCAG 2.5.8).
- **Abas:** espaço mínimo de 24px entre o fim de um rótulo e o início do próximo (16px na densidade
  compacta), em todos os tamanhos. No tema: `Tabs.horizontalItemGutter` 24 (16 compacto) e padding
  lateral de 4px em `horizontalItemPadding`, `horizontalItemPaddingSM` e `horizontalItemPaddingLG`;
  nunca deixar o `size="small"` com o padding padrão (`8px 0`), que cola os rótulos. Rótulo com
  ícone e contador conta como um só bloco.
- **Metadado em texto, não em badge.** Uma linha de tabela tem no máximo dois chips (status e
  categoria); projeto é ponto + nome, contexto é tag sem borda.

## 6. Ícones

Lucide continua sendo o único conjunto de ícones do produto, em 16px (18px no Sider recolhido),
`strokeWidth` 1.75. Componentes do antd aceitam qualquer `ReactNode` como ícone. Os ícones internos
do antd (setas de select, fechar de modal) continuam os dele. O protótipo usa `@ant-design/icons`
só porque roda de CDN; os nomes lucide de cada lugar estão nas tabelas acima.

## 7. AppShell

```text
ConfigProvider (tema, cssVar) → App (message, modal, notification) → RegionBoundary raiz
└─ Layout
   ├─ Sider ............ RegionBoundary "navegação"
   │   logo · Fluxo · Organizar · Conhecimento · (rodapé) Arquivo, Configurações
   └─ Layout
      ├─ Header ........ RegionBoundary "barra superior"
      │   menu · título · captura · timers · Ctrl+K · aparência · Nova tarefa
      ├─ Content ....... RegionBoundary por rota (reset ao trocar de rota ou de id)
      │   └─ ilhas com boundary próprio: Tiptap, Excalidraw, terminal, gráficos
      └─ StatusBar ..... Notion · Google · Jira · MCP · dica da bandeja
```

- **Navegação** em todas as rotas. Substitui os doze botões do `TitleBar` (só na home) e os quatro
  botões "Voltar" (B1, B2, B4). Voltar fica só em telas de detalhe (task, projeto), como botão
  `text` com o nome do destino. A sidebar completa, de cima para baixo, é esta; nada fora dela:

  | Região       | Item                                | Ícone (lucide)                     | Ação                                                     | Indicador                                  |
  | ------------ | ----------------------------------- | ---------------------------------- | -------------------------------------------------------- | ------------------------------------------ |
  | Topo         | Logo "CrafyTask" (só "C" recolhida) | —                                  | —                                                        | —                                          |
  | Fluxo        | Tarefas                             | `ListTodo`                         | rota `/` (e `/task/:id` fica marcada)                    | contador do Inbox                          |
  | Fluxo        | Hoje                                | `CalendarDays`                     | `/today`                                                 | contador do plano de hoje                  |
  | Fluxo        | Calendário                          | `Calendar`                         | `/calendar`                                              | —                                          |
  | Fluxo        | Revisão semanal                     | `ClipboardCheck`                   | `/review`                                                | ponto âmbar quando a revisão está atrasada |
  | Organizar    | Projetos                            | `FolderKanban`                     | `/projects` (e `/project/:id`)                           | contador de projetos ativos                |
  | Organizar    | Horizontes                          | `Mountain`                         | `/horizons`                                              | —                                          |
  | Organizar    | Contextos e tags                    | `Tags`                             | `/contexts` (abas Contextos e Tags; `/tags` redireciona) | —                                          |
  | Conhecimento | Cadernos                            | `NotebookTabs`                     | `/notebooks`                                             | —                                          |
  | Conhecimento | Dashboard                           | `BarChart3`                        | `/dashboard`                                             | —                                          |
  | Rodapé       | Terminais                           | `SquareTerminal`                   | abre/fecha o painel de terminal (`Ctrl+'`), não navega   | número de sessões abertas, neutro          |
  | Rodapé       | Arquivo                             | `Archive`                          | `/archived` (até a F6; depois, filtro da lista)          | —                                          |
  | Rodapé       | Configurações                       | `Settings`                         | `/settings`                                              | —                                          |
  | Rodapé       | Recolher / Expandir menu            | `PanelLeftClose` / `PanelLeftOpen` | alterna 232px ⇄ 64px; some abaixo de `lg`                | —                                          |

  Recolhida, cada item mostra só o ícone e o rótulo (com o indicador) em tooltip à direita. Abaixo
  de `md` a mesma lista abre num `Drawer` pelo botão de menu do header. O terminal sai do header (o
  botão laranja de hoje) e passa a viver só aqui e no atalho.

- **Header (52px)** em três zonas de grid (`minmax(max-content, 1fr) · 200–520px · minmax(max-content, 1fr)`: os lados nunca ficam menores que o conteúdo, e com folga ficam iguais, o que centraliza a captura): à esquerda, botão de menu (só
  abaixo de `md`) e título da tela; **no centro, o campo "Capturar para o Inbox…"** (Enter grava,
  mesmo IPC da captura rápida); à direita, pílula com os timers rodando, busca `Ctrl+K`, menu de
  aparência e "Nova tarefa". O centro dá à captura uma posição fixa, que não anda com o tamanho do
  título nem com quantos botões há à direita; posição estável vira memória espacial e a captura,
  que é a ação de menor esforço do GTD (Bellotti 2004), fica sempre no mesmo lugar e larga como
  alvo (Fitts). Abaixo de `sm` a captura sai do header e vai para a paleta de comandos.
- **Paleta de comandos (`Ctrl+K`):** navegar, buscar tasks e páginas, iniciar timer, mudar tema.
  Componente próprio sobre `Modal` + `Input` + `List` (o antd não tem um).
- **Barra de status (28px):** indicadores passivos de integração. Substitui o banner
  `SyncNotification`. Erro de sync vira ponto vermelho com tooltip e ação, não toast.
- **RegionBoundary:** fallback com `Result` do antd: "Esta área falhou: {região}", "O resto do app
  continua funcionando. Seus dados estão salvos no banco local.", botões "Tentar de novo" e "Copiar
  detalhes". Erros assíncronos (IPC) chegam ao boundary por `useErrorBoundary().showBoundary`
  (`react-error-boundary`); `createRoot` registra `onCaughtError`/`onUncaughtError`; o main trata
  `render-process-gone` e `unresponsive`. Detalhes em
  [resiliência](pesquisa/05-resiliencia-e-responsividade.md).
- **Feedback:** sempre por `App.useApp()` (`message`, `modal`, `notification`). Os métodos
  estáticos ignoram o tema.
- **Modo foco (zen):** uma camada de tela cheia dentro do app (`FocusOverlay`, `position: fixed`
  sobre o shell inteiro: Sider, Header e barra de status somem). Fica só a barra de foco de 48px
  (sair, nome da task, ponto de executando, cronômetro, pausar/iniciar, Notas/Desenho) e o editor:
  notas numa coluna de leitura de ~68 caracteres, desenho na largura toda. Sai por `Esc` (menos
  com popup de sugestão aberto) ou pelo mesmo botão. Não aciona o fullscreen da janela; o modo
  maximizado de hoje vira este.
- **Detalhe da task: cabeçalho, área de trabalho e inspetor.** A tela deixa de ser três colunas
  disputando espaço (dados · timer · notas). As notas viram a área principal, porque é nelas que o
  trabalho é retomado; o resto se organiza em volta. Nenhum recurso de hoje sai: a tabela abaixo diz
  onde cada um foi parar.

  ```text
  ┌ Cabeçalho ───────────────────────────────────────────────────────────────┐
  │ ← Tarefas / Projeto                                                      │
  │ [Status▾] #711 [Jira]                    ● 02:32:10 [Pausar] [✓]  ⌨ ◧ ⋯ │
  │ Nome da tarefa                                                           │
  │ descrição                                                                │
  │ (Normal) (● CrafyTask) (💻 @dev) (⚑ Prazo 21/11) (▮▮▮ Energia) (+ Prop.) │
  │ ⚠ Bloqueada por dependências: …                     [Ver dependências]   │
  ├ Área de trabalho ─────────────────────────────┬ Inspetor (380–420px) ────┤
  │ [Notas | Desenho]                   [Foco]    │ [Tempo|Detalhes|Relações]│
  │                                               │                          │
  │ editor                                        │ conteúdo da aba          │
  └───────────────────────────────────────────────┴──────────────────────────┘
  ```

  | Onde                  | O que tem                                                                                                                                                                                                                                                                                                                                                            |
  | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | Cabeçalho, linha 1    | Voltar para Tarefas e o nome do projeto (abre o projeto)                                                                                                                                                                                                                                                                                                             |
  | Cabeçalho, linha 2    | Status (Executando desabilitado se bloqueada) · `#id` (clique copia) · etiqueta Jira com tipo, chave e status Jira · "Arquivada" · **bloco do timer** (ponto de executando, cronômetro mono 30px, Iniciar/Pausar, Finalizar) · Terminal · Campos do Jira (só Jira) · mostrar/esconder inspetor · menu `⋯` (Copiar `#id`, Zerar tempo, Arquivar/Desarquivar, Excluir) |
  | Cabeçalho, linhas 3–4 | Nome e descrição editáveis no lugar                                                                                                                                                                                                                                                                                                                                  |
  | Barra de propriedades | Pílulas que abrem um `Popover` de edição: Categoria, Projeto (+ "Abrir projeto →"), Contextos, Prazo (data + hora, cor de vencido/hoje), Energia (clicar no ativo limpa). Programado (data + início/fim), Recorrência, Tags e Link externo aparecem quando têm valor; vazias, entram por "+ Propriedade"                                                             |
  | Aviso                 | `Alert` de bloqueio com "Ver dependências", que abre o inspetor em Relações                                                                                                                                                                                                                                                                                          |
  | Área de trabalho      | Abas Notas e Desenho, botão de modo foco                                                                                                                                                                                                                                                                                                                             |
  | Inspetor · Tempo      | Barra do limite (`success` → `warning` 80% → `error` 100%), Total e Sessões, lista de sessões (em andamento no topo; encerradas com editar início/fim e excluir), Ajustes de tempo (adicionar, ajustar total, limite, remover limite)                                                                                                                                |
  | Inspetor · Detalhes   | Jira (issue, status com transição, pai, Campos do Jira) · Google Calendar (switch, ressincronizar) · Ambiente (diretório herdado/alterar/voltar a herdar, comando, abrir terminal)                                                                                                                                                                                   |
  | Inspetor · Relações   | Subtarefas (aviso de pai bloqueado, progresso, checkbox + nome que navega, nova inline) · Depende de (verde/laranja, remover, adicionar com busca) · Issues filhas no Jira. A aba mostra cadeado se bloqueada e `feitas/total`                                                                                                                                       |

  O cronômetro grande da coluna central sai: o tempo fica no bloco do cabeçalho (sempre visível),
  na pílula do header do shell e no modo foco. O cronômetro fica em `text3` parado, `text` rodando
  e `error` ao passar do limite. Editar e excluir sessão são recursos novos (hoje a lista é só
  leitura). O protótipo tem um seletor "Task local / Task do Jira" para mostrar os blocos que só
  aparecem em task do Jira.

## 8. Responsividade

Breakpoints do antd para a casca; container queries para componentes dentro de painéis
redimensionáveis (notas, terminal). A janela principal passa a aceitar `minWidth` 400 (hoje 800,
o que impede ver qualquer layout estreito).

| Faixa            | Sider                           | Header                              | Lista de tarefas                                                   | Detalhe da task                                      |
| ---------------- | ------------------------------- | ----------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------- |
| `< 576` (xs)     | `Drawer` pelo botão de menu     | sem captura, "Nova tarefa" só ícone | status em `Select`, cards                                          | cabeçalho + abas Notas / Tempo / Detalhes / Relações |
| `576–767` (sm)   | `Drawer`                        | captura volta                       | status em `Select`, cards                                          | idem                                                 |
| `768–991` (md)   | recolhido, 64px                 | sem pílula de timers no texto       | `Tabs` com contadores; tabela com ID, tarefa, prazo, tempo e ações | cabeçalho + notas; inspetor em `Drawer`              |
| `992–1199` (lg)  | recolhido, 64px (pode expandir) | completo                            | + categoria, contextos                                             | idem                                                 |
| `1200–1599` (xl) | aberto, 232px                   | completo + atalho visível           | + projeto, energia                                                 | cabeçalho + notas + inspetor 380px (pode esconder)   |
| `≥ 1600` (xxl)   | aberto                          | completo                            | idem, linhas mais altas                                            | cabeçalho + notas + inspetor 420px                   |

As abas de status são o centro da lista e continuam abas (não viram menu) enquanto couberem numa
linha: seis status mais "Todas" estão no limite recomendado pela NN/g. Abaixo de `md` viram `Select`
com o mesmo ícone, rótulo e contador.

### Tabela de tarefas

Cada linha leva só o que ajuda a decidir o que fazer agora; metadado secundário é texto discreto, não
mais um badge (pesquisa: poucos elementos por linha; Hick e carga cognitiva).

- **Colunas:** ID (`#711`, mono, 72px) · Tarefa · Status (**só na aba "Todas"**: dentro de um status
  a coluna repetiria a aba) · Categoria (vazia quando normal) · Projeto · Contextos · Energia ·
  Prazo · Tempo · ações. As colunas entram por breakpoint (tabela acima) e somem quando viram
  agrupamento (agrupar por projeto tira Projeto; por contexto tira Contextos).
- **Célula Tarefa:** linha 1 com cadeado de bloqueio, ponto de executando e o nome; logo abaixo do
  nome, barra fina de 120px com `feitas/total` das subtarefas; abaixo, "aguardando: …" quando houver.
- **Contextos:** o primeiro como tag e `+N` ao lado. Passar o mouse abre um popover com todos, já
  editáveis (marcar/desmarcar).
- **Subtarefas:** linha expansível. Um caret ao lado do nome abre as subtarefas recuadas logo
  abaixo, cada uma com checkbox de concluir, status (como chip, quando a coluna Status está oculta),
  timer e menu. Por padrão ficam recolhidas e não entram na lista principal, para não duplicar
  linhas. Seleção não propaga do pai para as filhas (`checkStrictly`).
- **Agrupamento na tabela:** cada grupo é uma linha de cabeçalho que ocupa a largura toda (cor do
  projeto ou emoji do contexto, nome, quantidade, "Selecionar grupo" e tempo somado), recolhível.
  Agrupar por contexto repete a tarefa em cada contexto dela, com um ícone discreto "Também em …" e
  um aviso acima da tabela de que a soma dos grupos passa do total.
- **Ações da linha:** Hoje, timer e `⋯`. O `⋯` abre o mesmo menu do botão direito.
- **Menu de contexto** (botão direito na linha ou no card): Abrir · Iniciar/Pausar timer · Planejar
  para hoje · Marcar como ▸ · Categoria ▸ · Mover para projeto ▸ · Contextos ▸ · Copiar `#id` ·
  Arquivar · Excluir… (com confirmação). O item atual de cada submenu aparece marcado. Se a linha
  faz parte de uma seleção maior, o menu age sobre a seleção toda (título "N tarefas selecionadas",
  sem Abrir, timer, contextos e copiar), igual à barra de ações em massa.

## 9. Modo escuro

- Preferência Sistema / Claro / Escuro, aplicada no main por `nativeTheme.themeSource`, para as
  três janelas (principal, timer flutuante, captura rápida) mudarem juntas. O renderer lê
  `prefers-color-scheme` e escolhe `darkAlgorithm` ou `defaultAlgorithm`.
- Padrão: seguir o sistema. Polaridade clara lê melhor com fonte pequena (Piepenbrock 2013/2014),
  por isso o claro é o tema de referência e o escuro é cuidado com o mesmo rigor, não uma inversão.
- Fundo cinza-violeta escuro, nunca preto. Elevação por luminosidade (`bg` < `surface` <
  `elevated`), cores dessaturadas e mais claras, texto em três níveis.
- Tiptap, Excalidraw e xterm recebem fundo, texto e borda dos tokens (via variáveis CSS).
- Até a fase F7 o seletor fica escondido (as telas antigas não têm tokens escuros).

## 10. Componentes: do atual para o antd

| Hoje                                              | Passa a ser                                                                         |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Botões do `TitleBar`                              | `Layout.Sider` + `Menu` agrupado                                                    |
| Abas em pílula (`rounded-full` escuro)            | `Tabs` com ícone e contador; `Select` no estreito; `Segmented` para alternar visão  |
| `StatusBadge`, `CategoryBadge`, spans com classes | `StatusChip`, `CategoryChip`, `EnergyMeter` (próprios, sobre tokens)                |
| `TaskTable` com `<table>`                         | `Table` com `rowSelection`, `responsive` nas colunas e `expandable` para subtarefas |
| Cartão `bg-white border rounded-sm`               | `Card size="small"`                                                                 |
| `SearchableSelect`                                | `Select showSearch`                                                                 |
| `Dialog`, `AlertDialog`, `DeleteConfirmDialog`    | `Modal`, `modal.confirm` com texto que cita o que será afetado                      |
| `ContextMenu` (Radix)                             | `Dropdown trigger={['contextMenu']}`                                                |
| `Progress` e `div` com `width` inline             | `Progress`                                                                          |
| `ScrollArea`                                      | rolagem nativa do `Content`                                                         |
| `sonner`                                          | `message` / `notification` de `App.useApp()`                                        |
| `SyncNotification`                                | `StatusBar`                                                                         |
| `FloatingTimer` dentro da janela                  | pílula de timers no header (a janela flutuante continua)                            |
| Estado vazio caseiro                              | `Empty` com frase específica da aba e uma ação                                      |
| Tela de erro inexistente                          | `Result` no `RegionBoundary`                                                        |

## 11. Padrões de tela

- **Cabeçalho de página:** o título está no header do shell; a página começa direto pelo conteúdo
  ou por uma barra de ferramentas (`Flex` com `wrap`, busca à esquerda, alternadores à direita).
- **Ação primária:** uma por tela, `type="primary"`, sempre na cor primária. O verde, azul e índigo
  de hoje saem (B3).
- **Ações reveladas no hover** continuam em listas densas, mas também ficam acessíveis pelo teclado
  (foco mostra) e pelo menu de contexto.
- **Estado vazio:** diz o que significa e o próximo passo. Inbox vazio: "Inbox zerado. Tudo
  processado."
- **Confirmação:** destrutiva sempre (inclui área e meta, E6), cita quantos itens e o que não
  acontece (o modelo é a confirmação de exclusão de tag).
- **Alerta GTD inline:** `Alert` com ação, como "Sem próxima ação definida · Definir" nos projetos e
  "N itens para processar" no topo do inbox.

## 12. Movimento

Durações de 160ms (`motionDurationMid`) e 240ms (`motionDurationSlow`). O único movimento contínuo
é o ponto verde de "executando". Tudo respeita `prefers-reduced-motion`: sem pulso, sem transição
de layout.

## 13. Palavras

Um nome por coisa: **Tags** (não "Fonte / Tag"), **Arquivo** (não "Arquivo Morto"), **Contextos e
tags** na navegação. Verbos que dizem o que acontece: "Capturar", "Planejar para hoje", "Arquivar".
Erros dizem o que houve e o que fazer, sem pedir desculpa.

## 14. Proibido

- Paleta padrão do antd, cor de marca como fundo decorativo, gradiente.
- Hex solto e classe de cor do Tailwind em componente.
- CSS mirando classes internas `.ant-*` (o DOM interno muda entre versões); customizar por token,
  `classNames` e `styles`.
- `message`, `Modal.confirm` e `notification` estáticos.
- `h-screen` em página; fonte ou imagem remota; status só com cor.

## 15. Stack e verificação

- `antd@^6.7` e React 19 (a v6 não precisa do patch de React 19), `cssVar` ligado, `hashed: false`.
- Tailwind v4 só para layout, com `@layer theme, base, antd, components, utilities;` antes do
  `@import 'tailwindcss'` e `StyleProvider layer` no antd. O preflight continua ligado.
- `npm run design:audit` confere o que do protótipo já existe no código
  ([checklist](prototipo/checklist.json)). Itens visuais só fecham com a validação do usuário no
  app rodando.
