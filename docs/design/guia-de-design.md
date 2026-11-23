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
| Notificação custa atenção             | `message` só como retorno da ação de quem clicou; sync e integrações ficam na barra de status, sem interromper     | Stothart 2015; Mark 2008          |
| Cor guia, cor sozinha exclui          | Status sempre com ícone e texto; vermelho só para erro, prazo vencido e urgente                                      | Wolfe e Horowitz 2004; WCAG 1.4.1 |
| Teclado primeiro                      | `Ctrl+K` em todo lugar, captura global, atalhos visíveis nos tooltips                                                | Linear, Things, Akiflow           |

## 3. Cor

### 3.1 Base

Neutros com croma baixo puxado para o violeta (matiz ≈ 282 em OKLCH), nunca cinza puro. Valores
calculados e conferidos: todo texto passa WCAG AA (4,5:1) sobre a superfície onde aparece.

| Token            | Claro     | Escuro    | Uso                                   | Token antd                                   |
| ---------------- | --------- | --------- | ------------------------------------- | -------------------------------------------- |
| `bg`             | `#F6F5FA` | `#111018` | fundo do layout                       | `colorBgLayout`                              |
| `surface`        | `#FFFFFF` | `#1A1923` | cards, tabela, header                 | `colorBgContainer`                           |
| `elevated`       | `#FFFFFF` | `#22202E` | popover, modal, dropdown              | `colorBgElevated`                            |
| `sider`          | `#FBFAFE` | `#15141D` | navegação lateral                     | `Layout.siderBg`                             |
| `border`         | `#E4E2EE` | `#2E2B3C` | divisórias, borda de card             | `colorBorderSecondary`                       |
| `borderStrong`   | `#8A8796` | `#706C85` | borda de controle                     | `colorBorder`                                |
| `text`           | `#1B1A27` | `#ECEAF6` | texto principal                       | `colorText`                                  |
| `text2`          | `#5B5970` | `#A9A6BE` | texto secundário                      | `colorTextSecondary`                         |
| `text3`          | `#6B6980` | `#8C89A1` | metadado, rótulo de seção             | `colorTextTertiary`, `colorTextQuaternary`   |
| `primary`        | `#5B47EB` | `#8F82FF` | ação primária, link, seleção          | `colorPrimary`, `colorLink`                  |
| `primarySoft`    | `#EFEDFF` | `#221E3D` | item selecionado                      | `Menu.itemSelectedBg`, `Table.rowSelectedBg` |
| `onPrimary`      | `#FFFFFF` | `#111018` | texto sobre `primary` (botão)         | `colorTextLightSolid`                        |
| `brand`          | `#705EFF` | `#8F82FF` | logo                                  | —                                            |
| `hover`          | `#F0EFF6` | `#25232F` | item de menu sob o ponteiro           | `Menu.itemHoverBg`                           |
| `rowHover`       | `#F7F6FC` | `#201E2B` | linha de tabela sob o ponteiro        | `Table.rowHoverBg`                           |
| `track`          | `#ECEBF3` | `#15141D` | trilho do `Segmented`                 | `Segmented.trackBg`                          |
| `calBlock`       | `#EFEDFF` | `#252047` | fundo do bloco de tempo no calendário | `semantic.ts`                                |
| `calBlockBorder` | `#C9C1FF` | `#3E3770` | borda do bloco de tempo no calendário | `semantic.ts`                                |

`#705EFF` com texto branco dá 4,44:1 e não passa AA; por isso o botão usa `#5B47EB` (5,92:1) e o
`#705EFF` fica no logo, que é texto grande ([cálculo](pesquisa/03-cor-acessibilidade-e-modo-escuro.md)).
No escuro, branco sobre `#8F82FF` dá 3,09:1; por isso o texto do botão primário usa o `bg` escuro
(6,12:1).

`borderStrong` passa 3:1 (WCAG 1.4.11, borda que identifica o controle) sobre `bg`, `surface`,
`sider` e as cores de hover nos dois temas; `text3` passa 4,5:1 também sobre o hover e as linhas
de time leak do escuro. O teste `theme/contrast.test.ts` confere cada par.

Feedback do sistema: sucesso `#0B7A50` / `#4CD69A`, aviso `#A15C00` / `#F0B44C`, erro `#C02331` /
`#FF7A82`, informação `#2A62D6` / `#7AA5FF` (`colorSuccess`, `colorWarning`, `colorError`,
`colorInfo`).

O ponto pulsante de executando (chip, pílula de timers, bloco do calendário, modo foco) usa
`success`: `#0B7A50` no claro, `#4CD69A` no escuro. O anel do pulso é a mesma cor com transparência
(`color-mix`), nunca outro verde. O ponto de integração em dia na barra de status também usa
`success`.

### 3.2 Domínio GTD

Um módulo só (`src/renderer/src/theme/semantic.ts`) define estas cores. Cada par é texto sobre
fundo do chip; todos passam 4,5:1 nos dois temas.

**Status da task** — o croma diz o quanto é acionável agora: forte para próximas e executando,
médio para aguardando, baixo para inbox, someday e finalizada.

| Status     | Ícone (lucide)                | Claro texto / fundo   | Escuro texto / fundo  |
| ---------- | ----------------------------- | --------------------- | --------------------- |
| Inbox      | `Inbox`                       | `#5D6B82` / `#EEF1F6` | `#9AA8C0` / `#232A36` |
| Aguardando | `Hourglass`                   | `#A15C00` / `#FFF4E0` | `#F0B44C` / `#33280F` |
| Próximas   | `CircleArrowRight`            | `#2A62D6` / `#EAF0FF` | `#7AA5FF` / `#1C2744` |
| Executando | `CirclePlay` + ponto pulsando | `#0B7A50` / `#E3F6EC` | `#4CD69A` / `#123326` |
| Finalizada | `CircleCheck` + nome riscado  | `#526B5E` / `#EDF2EF` | `#93AE9F` / `#1F2A25` |
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

**Escala de time leak** — a única semântica que pinta o fundo da linha ou do card inteiro. Vale
para tarefa da categoria time leak e sobe com o tempo acumulado nela: 30 min ou mais pinta o nível
1 (âmbar), 1 h ou mais o nível 2 (laranja), 2 h ou mais o nível 3 (vermelho). Cores: `#FFF6DD` →
`#FFF0E5` → `#FDECEE` no claro, `#2A2412` → `#2E2016` → `#301A1E` no escuro. O texto continua
`text`. Os três limiares são preferência (Configurações → Fluxo de trabalho, `timeLeakLevels` em
`shared/workflowPrefs.ts`); `timeLeakLevel` (`theme/semantic.ts`) diz o nível com os limiares de
`useTimeLeakThresholds()`. O aviso do sistema começa no nível laranja e repete no intervalo escolhido.

**Energia** — não usa cor: um medidor de três barras na cor primária (cheias = nível), com tooltip
"Energia alta/média/baixa". O emoji atual sai.

**Projetos, contextos, tags, cadernos e seções** — cor escolhida pelo usuário numa paleta fixa de dez, `USER_COLORS`
em `semantic.ts`: `#E5484D #A84803 #A15C00 #0B7A50 #0F6E7A #2A62D6 #5B47EB #7647B0 #B8327A #5D6B82`.
Os seletores oferecem só essas dez. Uma cor já gravada fora delas continua valendo e
aparece como está. A cor aparece como ponto de 8px ao lado do nome, nunca como fundo de texto. A
exceção é o emoji do contexto: fica num quadrado com a cor do contexto a ~14% de opacidade (sufixo
hex `24`, como em `#2A62D624`).

**Status do projeto** — `ProjectStatusChip` reaproveita as cores dos status de task, com ícone
próprio:

| Status do projeto | Ícone (lucide) | Cores de   |
| ----------------- | -------------- | ---------- |
| Ativo             | `FolderOpen`   | Próximas   |
| Someday           | `Lightbulb`    | Someday    |
| Concluído         | `CircleCheck`  | Finalizada |
| Arquivado         | `Archive`      | Inbox      |

**Sem próxima ação** — o chip e o aviso em texto usam as cores de Aguardando (tom de aviso), com
`TriangleAlert`, em todo lugar: lista e detalhe do projeto, Horizontes e Revisão semanal. Nunca o
âmbar do time leak, que é categoria.

**Gráficos** — a cor segue o trabalho do dado:

| Uso                                     | Claro                                                                          | Escuro                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Série única e destaque                  | `#5B47EB`                                                                      | `#8F82FF`                                                                      |
| Série recuada (contexto do destaque)    | `#8F8BA6`                                                                      | `#6C6884`                                                                      |
| Sequencial (heatmap, vazio → mais)      | `#ECEBF3 #A99DFF #8F80FA #7462F2 #5B47EB #4532C4`                              | `#24222F #4A3F94 #5F50B8 #7766DA #9185FF #B7AEFF`                              |
| Categórica (só quando a série é o tema) | `#5B47EB #EB6834 #1BAF7A #EDA100 #E87BA4 #008300 #2A78D6 #E34948`, nessa ordem | `#8577F5 #D95926 #199E70 #C98500 #D55181 #0CA30C #3987E5 #E66767`, nessa ordem |

As quatro passaram no validador da skill `dataviz` (`validate_palette.js`): faixa de luminosidade,
croma, separação para daltonismo (ΔE ≥ 8 entre vizinhas), visão normal (ΔE ≥ 15) e contraste
sobre `surface`. A paleta categórica anterior (`#2A62D6 #0F6E7A…`) reprovou: laranja e âmbar
vizinhos com ΔE 4,7 e cinza sem croma. No claro, verde-água, amarelo e rosa ficam abaixo de 3:1,
então gráfico categórico sempre tem legenda com nome e a visão de tabela. A ordem é fixa: uma
série nova pega o próximo slot, nunca uma cor gerada; acima de oito, o resto vira "Outros".

Status, categoria e energia **não** viram cor de série: as cores de status reprovaram como paleta
categórica (inbox e próximas com ΔE 14,8). Nesses gráficos a barra é da cor única e a identidade
vem do chip com ícone e texto ao lado.

**Horizontes H0–H5** — uma escala violeta única, do mais claro (H0, ações) ao mais escuro (H5,
propósito), usada só no chip `H0`…`H5` (fundo / texto): claro `#F1EFFF/#4B3BC9`, `#E4E0FF/#4433B8`,
`#D5CFFF/#3B2BA6`, `#C3BAFF/#2E218C`, `#AFA3FA/#24196F`, `#9D8FF5/#170F4D`; escuro
`#1E1B33/#B9B0FF`, `#262143/#C3BBFF`, `#2F2854/#CEC7FF`, `#3A3168/#D9D3FF`, `#463B80/#E6E2FF`,
`#5B4CA8/#FFFFFF`. Mora em `semantic.ts` com as outras cores de domínio.

### 3.3 Regras

- Sem paleta padrão do antd: `colorPrimary` sempre definido pelos tokens.
- Cor em componente vem de `theme.useToken()`, das variáveis CSS do antd ou de `semantic.ts`. Hex
  solto e classe de cor do Tailwind são proibidos (`F9.1`, `F9.5` do checklist).
- Paleta nova se monta em OKLCH e passa 4,5:1 (texto) e 3:1 (ícone, borda de controle) nos dois
  temas antes de entrar.

## 4. Tipografia

| Papel                  | Fonte                           | Tamanho / peso                                                             | Onde                                                          |
| ---------------------- | ------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Marca                  | Denk One                        | 22px (header), 28px (vitrine)                                              | só o logo                                                     |
| Título de tela         | Geist                           | 15 / 600 no Header; 20–24 / 600 só em cabeçalho próprio (detalhe, revisão) | o Header do shell mostra o nome da tela                       |
| Título de seção        | Geist                           | 15 / 600; 14 no card pequeno (`Card.headerFontSize`, `headerFontSizeSM`)   | card, painel                                                  |
| Interface              | Geist                           | 14 / 400–500                                                               | texto, tabela, controles                                      |
| Metadado               | Geist                           | 12 / 400                                                                   | ids, datas, legendas; nunca abaixo de 12, exceto eixos de gráfico (11) e dias da Constância (10) |
| Rótulo de seção        | Geist                           | 11 / 600, maiúsculas, `letter-spacing: .08em`                              | "ORGANIZAÇÃO", "AGENDA"                                       |
| Números                | Geist Mono, `tabular-nums`      | 12–14 em listas; 24–30 no cronômetro da task; 40 na vitrine                | tempo, ids, contadores, prazos                                |
| Número de painel       | Geist, algarismos proporcionais | 48 / 600 (herói, um por tela); 26 / 600 (`Statistic.contentFontSize`)      | totais do dashboard, que não se alinham em coluna             |
| Valor de saúde         | Geist                           | 20 / 600                                                                   | valor do `HealthCard` (dashboard e revisão)                   |
| Número de card pequeno | Geist Mono, `tabular-nums`      | 20 (`Statistic` com `styles.content`)                                          | card Progresso do projeto (abertas, bloqueadas, tempo, prazo) |

Geist e Geist Mono entram por `@fontsource-variable/*` (o app é offline e a CSP bloqueia fonte
remota). Isso também corrige `--font-sans`/`--font-mono`, que hoje apontam para variáveis que não
existem. Token antd: `fontFamily` (Geist) e `fontFamilyCode` (Geist Mono), `fontSize: 14`.

A "vitrine" é a tela Identidade visual do protótipo (`IdentityPage`), que mostra tokens, chips e
tipografia juntos. Ela existe só no protótipo: nenhuma fase a constrói no app.

## 5. Forma, espaço e densidade

- **Raio:** 4 (`borderRadiusXS`, tag), 6 (`borderRadiusSM`, chip e controle pequeno), 8
  (`borderRadius`, controle e card), 12 (`borderRadiusLG`, modal, coluna do Kanban, barra
  flutuante). `999px` só para pílula de timer e ponto. Nada de outros valores, exceto 1–3px em micro-elementos
  (barras do medidor de energia, células de heatmap).
- **Cabeçalho de card:** altura mínima de 48px no `size="small"` (56px no normal), 16px de
  padding lateral (20px no normal), corpo com o mesmo padding. Título com subtítulo (duas linhas)
  ganha 12px de padding vertical via `styles.header`, nunca encostando nas bordas; entre o
  marcador (chip, ícone) e o título, 12–14px. Tokens: `Card.headerHeightSM`, `headerPaddingSM`,
  `bodyPaddingSM` (e as versões normais).
- **Sombra:** um token só, `boxShadowSecondary`: `0 8px 24px rgba(17,16,24,.10)` no claro,
  `0 8px 24px rgba(0,0,0,.45)` no escuro. Vale para tudo que flutua: popover, modal, barra de ações
  em massa e o bloco do calendário enquanto é arrastado. Card na página tem borda, sem sombra.
- **Contêiner de página:** `PageContainer` (em `components/shell/`) dá à página padding de 20px 24px
  32px (12px 12px 24px abaixo de `md`) e largura máxima de 1480px, centralizada. Calendário,
  Cadernos, modo foco e terminal usam a variante de largura total. No protótipo são as classes
  `.ct-page` e `.ct-page-narrow`. Cadernos usa ainda a **altura total**: as colunas rolam por
  dentro e a página não, com padding de 16px 24px (12px abaixo de `md`), classe `.ct-nb` no
  protótipo.
- **Espaço:** múltiplos de 4. 16px entre cards, 8px entre controles de uma barra.
- **Densidade:** padrão "confortável" (`controlHeight` 32, linhas de tabela com 10px). "Compacta"
  liga o `compactAlgorithm`, passa `componentSize="small"` ao `ConfigProvider` e usa linhas de 6px;
  `controlHeightSM` fica em 24px. Alvo de clique nunca menor que 24px (WCAG 2.5.8).
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
só porque roda de CDN; os nomes lucide de cada lugar estão nas tabelas acima e nestas:

| Lugar                 | Item → ícone (lucide)                                                                                                                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Detalhe da task       | Finalizar `Check` · terminal `SquareTerminal` · campos do Jira `SlidersHorizontal` · painel `PanelRightOpen`/`PanelRightClose` · mais `Ellipsis` · zerar tempo `RotateCcw` · desarquivar `ArchiveRestore` · modo foco `Expand`/`Shrink` · Notas `FileText` · Desenho `PenTool` · bloqueada `Lock` · pílulas: aguardando `Hourglass`, projeto vazio `Folder`, contextos vazios `MapPin`, prazo `Flag`, programado `CalendarClock`, recorrência `Repeat`, tags `Tags`, link `Link` (abrir no navegador `ExternalLink`), + Propriedade `Plus` · editar sessão `Pencil`, excluir sessão `Trash2` · seções do inspetor: sessões `History`, ajustes `PencilLine`, Jira `Plug`, Google Calendar `Calendar`, Ambiente `SquareTerminal`, Subtarefas `ListChecks`, Depende de `Lock`, Issues filhas `ListTree` |
| Abas do inspetor      | Tempo `Timer` · Detalhes `FileText` · Relações `Network`                                                                                                                                                                                       |
| `HealthCard`          | em dia `CircleCheck` · Inbox `Inbox` · sem próxima ação `CircleArrowRight` · projetos parados `CirclePause` · aguardando `Hourglass` · próximas paradas `Clock` · prazos vencidos `CalendarX` · revisão `ClipboardCheck` · someday `Lightbulb` |
| Janelas auxiliares    | Captura `Inbox` · Fechar `X` · Capturado `CircleCheck` · Pausar `Pause` · Abrir CrafyTask `Maximize2` |
| Configurações         | Geral `Settings` · Aparência `Palette` · Fluxo de trabalho `Workflow` · Terminal `SquareTerminal` · Backup `DatabaseBackup` · Notion `BookOpen` · Google `Cloud` (conectar `LogIn`, permitida `Check`, desconectar `LogOut`, ressincronizar `RefreshCw`, salvar credenciais `Save`) · Jira `Plug` · Servidor MCP `Cable` · Sobre `Info`               |
| Passos da revisão     | `collect` `Download` · `inbox` `Inbox` · `mind` `Brain` · `next` `CircleArrowRight` · `past` `History` · `upcoming` `CalendarDays` · `waiting` `Hourglass` · `projects` `FolderKanban` · `someday` `Lightbulb` · `creative` `Rocket`           |
| Menu da tarefa e ações em massa | Abrir `FileText` · timer `Play`/`Pause` · hoje `CalendarDays` · marcar como `CircleCheck` · categoria `Flag` · projeto `Folder` · contextos `MapPin` · copiar `Copy` · Jira `Plug` · abrir no Jira `ExternalLink` · campos do Jira `SlidersHorizontal` · arquivar `Archive` · excluir `Trash2` |
| Projetos              | abas pelo status (`LayoutGrid` em Todos, `FolderOpen` ativo, `Lightbulb` someday, `CircleCheck` concluído, `Archive` arquivado) · busca `Search` · Cards `LayoutGrid` · Tabela `Table2` · novo `Plus` · mais `Ellipsis` · resultado desejado `Target` · próxima ação `CircleArrowRight` · sem próxima ação `TriangleAlert` · área `TrendingUp` · meta `Trophy` · prazo `CalendarDays` · abrir `FolderOpen` · marcar como `CircleCheck` · excluir `Trash2` · terminal `SquareTerminal` |
| Horizontes            | chips `H0`…`H5` (texto, sem ícone) · Adicionar `Plus` · timer `Play`/`Pause` · mais `Ellipsis` · filtrar `Filter` · ver projetos `Folder` · editar `Pencil` · mover `ArrowLeftRight` · excluir `Trash2` · projetos da meta `Folder` |
| Contextos e tags      | abas `MapPin`/`Tags` · busca `Search` · Cards `LayoutGrid` · Tabela `Table2` · novo `Plus` · mais `Ellipsis` · Ver tarefas `ListTodo` · editar `Pencil` · mesclar `Merge` · excluir `Trash2` |
| Arquivo               | busca `Search` · abrir `FileText` · desarquivar `ArchiveRestore` · excluir de vez `Trash2` · limpar o arquivo `Eraser` · mais `Ellipsis` · grupo por mês `CalendarDays` · grupo sem projeto `Folder` |
| Legenda do calendário | urgente `Flame` · prioridade `Flag` · time leak `Clock` · no Google `CalendarSync`                                                                                                                                                             |
| Cadernos              | caderno `BookOpen` · busca `Search` · novo `Plus` · mais `Ellipsis` · sincronizar `RefreshCw` · exportar `Download` · editar `Pencil` · mover `ArrowUp`/`ArrowDown` (abas: `ArrowLeft`/`ArrowRight`) · mover para a seção `ArrowLeftRight` · nova subpágina `FilePlus2` · promover `IndentDecrease` · tornar subpágina `IndentIncrease` · excluir `Trash2` · Páginas (abaixo de `md`) `ListTree` · Notas `FileText` · Desenho `PenTool` · modo foco `Expand`/`Shrink` |
| Dashboard             | Agora `Gauge` · tarefas abertas `ListTodo` · No período `CalendarRange` · Exportar PDF `FileDown` · alternar gráfico e tabela `ChartColumn`/`Table2` · Tempo focado `Timer` · concluídas `CircleCheck` · sessões `Zap` · média por sessão `History` · para onde foi o tempo `FolderOpen` (área `TrendingUp`) · tarefas com mais tempo `ListOrdered` · categoria `Flag` · energia `Zap` · quando você foca `Clock` · constância `CalendarDays` · diferença `ArrowUp`/`ArrowDown`/`Minus` |
| Aparência             | Seguir o sistema `Monitor` · Claro `Sun` · Escuro `Moon` · densidade `Rows4` (ir para compacta) / `Rows3` (ir para confortável) |
| Nova tarefa           | Inbox `Inbox` · Limite de tempo `Timer` · Propriedade `Plus` · Link externo `Link` · as demais pílulas usam os ícones do detalhe |
| Calendário            | painel A agendar `PanelLeftOpen`/`PanelLeftClose` · gaveta `ListTodo` · alça `GripVertical` · reservar `Plus` · repetir `Copy` · abrir `FileText` · timer `Play` · excluir `Trash2` · tarefa com horário `Calendar` |

## 7. AppShell

```text
ConfigProvider (tema, cssVar) → App (message, modal, notification) → RegionBoundary raiz
└─ Layout
   ├─ Sider ............ RegionBoundary "navegação"
   │   logo · Fluxo · Organizar · Conhecimento · (rodapé) Terminais, Arquivo, Configurações, Recolher
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
  | Rodapé       | Arquivo                             | `Archive`                          | `/archived` (tabela de arquivadas no molde da de tarefas) | —                                          |
  | Rodapé       | Configurações                       | `Settings`                         | `/settings`                                              | —                                          |
  | Rodapé       | Recolher / Expandir menu            | `PanelLeftClose` / `PanelLeftOpen` | alterna 232px ⇄ 64px; some abaixo de `lg`                | —                                          |

  A sidebar fica aberta (232px) a partir de `lg` e recolhida (64px) abaixo de `lg`. Recolhida, cada
  item mostra só o ícone e o rótulo (com o indicador) em tooltip à direita. Abaixo de `md` a mesma
  lista abre num `Drawer` pelo botão de menu do header. O terminal sai do header (o
  botão laranja de hoje) e passa a viver só aqui e no atalho.

- **Header (52px)** em três zonas de grid
  (`minmax(max-content, 1fr) · 200–520px · minmax(max-content, 1fr)`: os lados nunca ficam
  menores que o conteúdo, e com folga ficam iguais, o que centraliza a captura): à esquerda, botão de menu (só abaixo de `md`) e título da tela; **no
  centro, o campo "Capturar para o Inbox…"** (Enter grava, mesmo IPC da captura rápida); à direita,
  pílula com os timers rodando, busca `Ctrl+K`, menu de aparência e "Nova tarefa". "Nova tarefa"
  fica só com o ícone abaixo de `lg`; o texto "Ctrl K" dentro do botão Buscar aparece a partir de
  `xxl`. O centro dá à captura uma posição fixa, que não anda com o tamanho do título nem com
  quantos botões há à direita; posição estável vira memória espacial e a captura, que é a ação de
  menor esforço do GTD (Bellotti 2004), fica sempre no mesmo lugar e larga como alvo (Fitts). Abaixo
  de `sm` a captura sai do header e vai para a paleta de comandos.
- **Nova tarefa** (botão do header; abaixo de `lg`, só ícone com tooltip "Nova tarefa"): `Modal` de
  640px montado no shell, por cima da tela atual (não navega para Tarefas). No corpo, o nome num
  `Input` sem borda (18px, semibold, foco ao abrir) e a descrição num `TextArea` sem borda (opcional,
  cresce até 6 linhas); embaixo, as **mesmas pílulas do detalhe** — Categoria, Projeto (só ativos e
  someday), Contextos, Prazo e Energia sempre; Programado, Recorrência, Tags e Link externo por
  "+ Propriedade". Duas diferenças do detalhe: não há Aguardando (task nova vai para o Inbox) e há a
  pílula **Limite de tempo** (`HH:MM:SS`, `MM:SS` ou minutos, em mono), que no detalhe fica no
  inspetor Tempo. Sem contextos cadastrados, o popover de Contextos mostra `Empty` com link para
  Contextos e tags. Tags novas só são criadas ao criar a tarefa (nada fica órfão se cancelar).
  Rodapé: à esquerda, `Checkbox` "Criar outra em seguida" e o lembrete "Vai para o Inbox" (`Inbox`);
  à direita, as teclas `Ctrl` `Enter` em `Kbd` (a partir de `sm`), Cancelar e "Criar tarefa"
  (primário, tooltip "Ctrl+Enter", desabilitado sem nome ou com limite inválido, `loading` enquanto
  grava). Enter no nome ou `Ctrl+Enter` em qualquer campo criam, uma vez só: o envio trava até a
  resposta. Criada a tarefa, o modal fecha e abre o detalhe. Com "Criar outra" ligado (fica ligado
  enquanto o app está aberto), ele continua aberto, mantém categoria, projeto e contextos, limpa o
  resto (nome, descrição, prazo, energia, programado, recorrência, tags, link e limite), esconde as
  pílulas opcionais de novo e volta o foco ao nome. Um formulário rotulado campo a campo repetiria a
  tela de detalhe com outra cara; as pílulas são a mesma peça, então o que se aprende num lugar
  vale no outro.
- **Pílula de timers:** ponto ao vivo, tempo do timer mais recente e o contador de timers; clicar
  abre o `Popover` com a lista. Abaixo de `md` ela continua no header, compacta: só o ponto e o
  tempo, sem contador, com o mesmo popover.
- **Menu de aparência:** o grupo Tema (Seguir o sistema, Claro, Escuro, com o atual marcado) e a
  troca de densidade (confortável ou compacta). O ícone do botão segue o tema escolhido. As mesmas
  opções ficam em Configurações → Aparência.
- **Paleta de comandos (`Ctrl+K`):** navegar, buscar tasks, projetos (abre o projeto) e páginas,
  iniciar timer, mudar tema e densidade.
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
  (sair, nome da task, ponto de executando, cronômetro, pausar/iniciar, Notas/Desenho, as ações da
  nota na aba Notas) e o editor:
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
  | Barra de propriedades | Pílulas que abrem um `Popover` de edição: Aguardando (primeira, só com status Aguardando ou com texto salvo: "Aguardando: Revisor externo" na cor de Aguardando, vazia "Aguardando quem?"), Categoria, Projeto (+ "Abrir projeto →"), Contextos, Prazo (data + hora, cor de vencido/hoje), Energia (clicar no ativo limpa). Programado (data + início/fim), Recorrência, Tags e Link externo aparecem quando têm valor; vazias, entram por "+ Propriedade"                                                             |
  | Aviso                 | `Alert` de bloqueio com "Ver dependências", que abre o inspetor em Relações                                                                                                                                                                                                                                                                                          |
  | Área de trabalho      | Abas Notas e Desenho, botão de modo foco e, só na aba Notas, as ações da nota: Salvar em arquivo local (`Save`; depois da primeira exportação o nome do arquivo aparece em mono a partir de `lg` e o tooltip diz que ele é reexportado a cada salvamento) e Salvar e sincronizar com o Notion (`RefreshCw`, gira enquanto sincroniza) |
  | Histórico (só task)   | Terceira aba da área de trabalho (`History`), sem ações de nota e sem modo foco. No topo, o cartão **Onde parei** (`Flag`): o último checkpoint da task, com resumo, Feito e Falta. Depois os filtros (`Segmented` Tudo · Checkpoints · Movimentações), o `Switch` Subtarefas (só em task com subtarefa) e o botão **Anotar** (`Pencil`), que abre o editor da anotação no molde do comentário do Jira: caixa com borda e, no topo, uma barra fixa (`role="toolbar"`, fundo `colorBgLayout`) com o estilo do bloco num `Select` sem borda (Texto normal, Título 1–3, Citação, Bloco de código), negrito `Bold`, itálico `Italic`, tachado `Strikethrough`, código `Code`, lista `List`, lista numerada `ListOrdered`, lista de tarefas `ListChecks`, link `Link` e menção `AtSign`, separados em grupos; abaixo, o texto (Tiptap, mesmo `/` e `@` das notas, 96–320px com rolagem). Embaixo, a dica em mono "Ctrl+Enter grava · / blocos · @ menciona" e Cancelar e Gravar; `Esc` cancela. Sem imagem: o histórico é texto. A lista é um `Timeline` do antd, do mais novo para o mais antigo: movimentação mostra os chips de status de origem e destino com `ArrowRight` (ou "Criada em"), no ponto o ícone do status de destino; checkpoint (`Flag`), operação (`Zap`) e anotação (`MessageSquare`) mostram rótulo, origem (`Bot` Claude ou `User` Você), texto (a anotação escrita no app aparece formatada, em 14px; o texto gravado pelo MCP segue simples) e, no checkpoint, Feito e Falta. Hora e nome da subtarefa em `colorTextSecondary`, hora em Geist Mono. Largura de leitura de 76ch. Em task arquivada o botão Anotar some. Sem nenhuma entrada, `Empty` simples com "Ainda não há histórico"; com filtro sem resultado, "Nada no histórico com este filtro". Página de caderno não tem esta aba. |
  | Inspetor · Tempo      | Barra do limite (`success` → `warning` 80% → `error` 100%), Total e Sessões, lista de sessões (em andamento no topo; encerradas com editar início/fim e excluir), Ajustes de tempo (adicionar, ajustar total, limite, remover limite)                                                                                                                                |
  | Inspetor · Detalhes   | Jira (issue, status com transição, pai, Campos do Jira) · Google Calendar (switch, ressincronizar) · Ambiente (diretório herdado/alterar/voltar a herdar, comando, abrir terminal)                                                                                                                                                                                   |
  | Inspetor · Relações   | Subtarefas (aviso de pai bloqueado, progresso, checkbox + nome que navega, nova inline) · Depende de (verde/laranja, remover, adicionar com busca) · Issues filhas no Jira. A aba mostra cadeado se bloqueada e `feitas/total`                                                                                                                                       |

  O cronômetro grande da coluna central sai: o tempo fica no bloco do cabeçalho (sempre visível),
  na pílula do header do shell e no modo foco. O cronômetro fica em `text3` parado, `text` rodando
  e `error` ao passar do limite. Editar e excluir sessão são recursos novos (hoje a lista é só
  leitura). O protótipo tem um seletor "Task local / Task do Jira" para mostrar os blocos que só
  aparecem em task do Jira.

## 8. Responsividade e telas

Breakpoints do antd para a casca; container queries para componentes dentro de painéis
redimensionáveis (notas, terminal). A janela principal passa a aceitar `minWidth` 400 (hoje 800,
o que impede ver qualquer layout estreito).

| Faixa            | Sider                         | Header                                                 | Lista de tarefas                                                   | Detalhe da task                                      |
| ---------------- | ----------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------ | ---------------------------------------------------- |
| `< 576` (xs)     | `Drawer` pelo botão de menu   | sem captura; pílula compacta; "Nova tarefa" só ícone   | status em `Select`, cards                                          | cabeçalho + abas Notas / Tempo / Detalhes / Relações |
| `576–767` (sm)   | `Drawer`                      | captura volta; pílula compacta; "Nova tarefa" só ícone | status em `Select`, cards                                          | idem                                                 |
| `768–991` (md)   | recolhido, 64px               | pílula com contador; "Nova tarefa" só ícone            | `Tabs` com contadores; tabela com ID, tarefa, prazo, tempo e ações | cabeçalho + notas; inspetor em `Drawer`              |
| `992–1199` (lg)  | aberto, 232px (pode recolher) | completo                                               | + categoria, contextos                                             | idem                                                 |
| `1200–1599` (xl) | aberto, 232px                 | completo                                               | + projeto, energia                                                 | cabeçalho + notas + inspetor 380px (pode esconder)   |
| `≥ 1600` (xxl)   | aberto                        | completo + "Ctrl K" no botão Buscar                    | idem, linhas mais altas                                            | cabeçalho + notas + inspetor 420px                   |

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
- **Altura de linha constante:** toda linha da tabela tem uma linha de texto só. Nada de barra de
  progresso, contador ou texto secundário embaixo do nome; o que for extra vira ícone com tooltip na
  mesma linha.
- **Célula Tarefa:** caret de subtarefas (quando houver), cadeado de bloqueio (tooltip "Bloqueada:
  depende de #id", até três ids e "e mais N"), ponto de executando,
  o nome (link focável) e, à direita dele, relógio com o horário agendado e ampulheta com
  "Aguardando: …" no tooltip (texto de `waiting_for`) e, em task do Jira, só a chave em mono
  discreto (`CONNECT-1234`, tipo e status Jira no tooltip). O caret já diz que
  há subtarefas; a quantidade fica no rótulo acessível e no tooltip, e o progresso aparece nos
  cards, no detalhe da task (aba Relações) e ao expandir.
- **Contextos:** o primeiro como tag e `+N` ao lado. Passar o mouse abre um popover com todos, já
  editáveis (marcar/desmarcar).
- **Subtarefas:** linha expansível. O caret ao lado do nome abre as subtarefas recuadas logo
  abaixo, cada uma com checkbox de concluir, status (como chip, quando a coluna Status está oculta),
  timer e menu. Por padrão ficam recolhidas e não entram na lista principal, para não duplicar
  linhas. Seleção não propaga do pai para as filhas (`checkStrictly`).
- **Agrupamento na tabela:** cada grupo é uma linha de cabeçalho que ocupa a largura toda (cor do
  projeto ou emoji do contexto, nome, quantidade, "Selecionar grupo" e tempo somado), recolhível.
  Agrupar por contexto repete a tarefa em cada contexto dela, com um ícone discreto "Também em …" e
  um aviso acima da tabela de que a soma dos grupos passa do total.
- **Ações da linha:** Hoje, timer e `⋯`. O `⋯` abre o mesmo menu do botão direito.
- **Barra de ações em massa:** flutua no fundo, só com seleção: contagem, "Selecionar todas (N)"
  quando faltam visíveis, Limpar, Marcar como…, Mover para projeto… (com "Sem projeto"), Hoje,
  Arquivar (sem confirmação, é reversível) e Excluir (com `modal.confirm` citando a quantidade).
- **Cards** (visão Cards, grupos em cards e Kanban): `#id` em mono com a checkbox de seleção ao lado
  (a seleção vale em todas as visões, para as ações em massa), nome, progresso das subtarefas
  (`feitas/total`, abre a lista), Hoje e `⋯` (sem timer); embaixo, status (só em "Todas"),
  categoria, projeto, contextos, prazo, a chave do Jira (mono discreto) e o tempo à direita. Descrição, tags e limite ficam no
  detalhe. Recolher um grupo vale para tabela e cards ao mesmo tempo.
- **Vazio:** `Empty` simples, "Inbox zerado. Tudo processado." no Inbox, "Nenhuma tarefa aqui." nas
  outras abas e, com busca ou filtro ativo, "Nenhuma tarefa com esses filtros." com "Limpar filtros".
- **Menu de contexto** (botão direito na linha ou no card): Abrir · Iniciar/Pausar timer · Planejar
  para hoje · Marcar como ▸ · Categoria ▸ · Mover para projeto ▸ · Jira ▸ (só em task do Jira e sem
  seleção: Abrir no Jira, Status no Jira ▸ com as transições, Campos do Jira…) · Contextos ▸ · Copiar `#id` ·
  Arquivar · Excluir… (com confirmação). O item atual de cada submenu aparece marcado. Se a linha
  faz parte de uma seleção maior, o menu age sobre a seleção toda (título "N tarefas selecionadas",
  sem Abrir, timer, contextos e copiar), igual à barra de ações em massa.
- **Filtros** (`Popover`, `Drawer` abaixo de `md`): categoria, contexto, projeto, tag, ordenar
  (atualização, prazo ou "pela mais parada"), "Parada há mais de 7/14/30 dias" (conta da última
  mudança de status), "Só com prazo vencido" (abertas com prazo antes de hoje) e "Só bloqueadas".
  A URL abre a lista já recortada, para os indicadores de saúde e outras telas levarem a ela:
  `?status=`, `?context=`, `?tag=`, `?prazo=vencido`, `?parada=N` e `?ordem=parada|prazo`.

### Projetos

No GTD, projeto é um resultado que pede mais de uma ação, e só anda se tiver uma **próxima ação**
concreta (Allen; Masicampo e Baumeister: o plano específico é o que libera a mente). As duas telas
giram em torno disso.

**Lista (`/projects`)** segue o mesmo esqueleto da lista de tarefas:

- Abas de status com contador (Todos, Ativos, Someday, Concluídos, Arquivados); `Select` abaixo de
  `md`.
- Barra: busca (nome, resultado desejado, descrição e área), ordenar (prazo, progresso, mais
  recentes, nome), Cards/Tabela, agrupar por área de foco (liga a lista aos Horizontes) e "Novo
  projeto".
- Aviso GTD: "N projetos ativos estão sem próxima ação", com "Mostrar só esses" (filtro). É o que a
  revisão semanal precisa achar rápido.
- Projetos parados (ativos, sem sessão nem tarefa concluída há mais de 7 dias): ordenar por "Mais
  parados primeiro" e, vindo do indicador de saúde (`?parados=1`), um aviso informativo com
  "Mostrar todos". `?semProxima=1` abre com "Mostrar só esses" ligado.
- Projetos de uma meta (`?meta=<id>`, vindo de Horizontes): abre na aba Todos, com um aviso
  informativo "Projetos que servem a "{meta}"" e "Mostrar todos". Sem nenhum, o vazio oferece "Criar
  projeto para esta meta" (já com a meta e a área dela).
- **Card:** cor, nome, menu `⋯`; resultado desejado; progresso `feitas/total`; próxima ação (ou chip
  "Sem próxima ação"); área e prazo. Status só aparece na aba Todos.
- **Tabela:** Projeto (cor + nome, resultado no tooltip do ícone de alvo) · Status (só em Todos) ·
  Área (`lg+`, some ao agrupar por área) · Próxima ação · Progresso (barra curta na mesma linha) ·
  Prazo (`md+`, âmbar a 7 dias, vermelho vencido) · Tempo (`xl+`) · `⋯`. Uma linha por projeto,
  mesma regra de altura constante da tabela de tarefas.
- Menu de contexto (botão direito e `⋯`): Abrir · Marcar como ▸ · Área de foco ▸ · Meta ▸ (metas
  agrupadas por H3/H4/H5, mais "Sem meta") · Excluir… (avisa que as tarefas ficam sem projeto).
- **Novo projeto:** `Modal` com Nome, Resultado desejado (com a pergunta "Como fica o mundo quando o
  projeto estiver pronto?"), Descrição, Área de foco, Meta (`Select` agrupado por H3/H4/H5, com a
  pergunta "A que meta, visão ou propósito este projeto serve?") e Cor (as dez de `USER_COLORS`).
  Criar abre o detalhe. Já na criação o projeto ganha área e meta, ligando a lista aos Horizontes.

**Detalhe (`/project/:id`)** usa o mesmo esqueleto do detalhe da task, com as tarefas no lugar das
notas:

- **Cabeçalho:** voltar para Projetos / área; status do projeto; cor + nome e descrição editáveis;
  terminal (se houver diretório) e `⋯` (copiar nome, arquivar/reativar, excluir).
- **Pílulas:** Área de foco (editável aqui: resolve E2; link para Horizontes), Meta (`Trophy`; o
  mesmo `Select` agrupado do "Novo projeto" e link para Horizontes; o nome longo corta com
  reticências), Prazo (com dias
  restantes e cor, âmbar e vermelho só em projeto ativo), Cor (paleta), Diretório de trabalho (escolher, alterar, remover).
- **Aviso** "Sem próxima ação definida" com "Definir", quando ativo, com tarefas abertas e sem
  próxima.
- **Área principal:** a mesma tabela de tarefas (abas de status, busca, filtros, agrupamento, menu
  de contexto, ações em massa), filtrada pelo projeto, sem a coluna Projeto, com um campo
  "Adicionar tarefa a {projeto}…" no topo (cria em Próximas; resolve E1) e Kanban por status.
- **Coluna lateral (`xl+`):** Próxima ação (nome, status, contextos, Iniciar, trocar por outra
  tarefa), Resultado desejado (editável) e Progresso (barra, abertas, bloqueadas, tempo total,
  prazo). Entre `md` e `lg` os três cards ficam em linha acima das tarefas; abaixo de `md`, abas
  Tarefas e Resumo.
- Próxima ação passa a ser **escolhida** (hoje é derivada da tarefa `proximas` mais recente). Isso
  pede uma coluna `projects.next_task_id`, com a regra atual como padrão quando estiver vazia.

### Horizontes

A única tela que liga a ação de hoje ao propósito. O redesenho dá a ela o que falta: navegar de um
nível para outro.

- **Escala única:** os seis níveis deixam de ter seis cores soltas. Cada um tem um chip `H0`…`H5`
  numa escala de violeta da marca, mais clara embaixo (ação) e mais escura em cima (propósito):
  claro `#F1EFFF/#4B3BC9` → `#9D8FF5/#170F4D`, escuro `#1E1B33/#B9B0FF` → `#5B4CA8/#FFFFFF`, todos
  com contraste AA. Os níveis são `Card` neutros, sem fundo tingido nem `border-2`.
- **Trilho lateral** (`lg+`): H0 a H5 com o chip; clicar rola até o nível. Não usa âncora de URL
  (o app roteia pelo hash).
- **Filtro por área**, no topo: escolhida uma área, todos os níveis mostram só o que é dela (ações
  de hoje dos projetos da área, projetos, a área, metas). Metas sem área aparecem em todas. Clicar
  num card de área ou numa etiqueta de área liga o mesmo filtro.
- **H0** ações de hoje (abre a task; timer na linha) · **H1** projetos ativos (abre o projeto;
  próxima ação ou "Sem próxima ação"; progresso) · **H2** áreas em cards (emoji, descrição,
  "N projetos · M metas") · **H3–H5** metas, visão e propósito (emoji do nível, área, descrição com
  quebras de linha, "N projetos" em mono ou "Nenhum projeto"). Clicar na meta abre os projetos que
  servem a ela (`/projects?meta=<id>`; resolve E3). A contagem ignora projetos arquivados.
- **Ações:** "+ Adicionar" de cada nível abre o diálogo **já no nível certo** (hoje sempre H3).
  Menu `⋯`/botão direito: área (filtrar, ver projetos, editar, excluir), meta (ver projetos da
  meta, editar, mover para outro nível, excluir). Excluir sempre confirma e diz o que acontece com
  projetos e metas (E6): ao excluir uma meta, os projetos dela ficam sem meta.
- Diálogo de meta com `Segmented` H3/H4/H5; de área com grade de emojis.

### Contextos e tags

Uma tela (`/contexts`, abas **Contextos** e **Tags** com contador; `/tags` abre na aba Tags) com os
mesmos recursos nas duas (C4, D1):

- Uma frase do que é cada um (sem faixa azul), busca, ordenar (mais usados, nome, menos usados),
  "Só sem uso" com contador (limpeza), Cards/Tabela e "Novo contexto"/"Nova tag".
- **Card:** contexto com emoji em quadrado tingido pela cor; tag com o ponto da cor. Nome (tag com
  `#`), "em N tarefas · M abertas" ou "não usado". Clicar abre a lista de tarefas filtrada pelo
  rótulo (E3); sem uso, abre a edição.
- **Tabela:** rótulo, tarefas, abertas, `⋯`.
- **Menu** (`⋯` e botão direito): Ver tarefas · Editar · Mesclar em… · Excluir…
- **Editar/criar** com prévia ao vivo para os dois (hoje só contexto tem), emoji só em contexto,
  paleta `USER_COLORS` (§3.2). Nome repetido é recusado com a dica de usar Mesclar.
- **Mesclar** vale para tags e, agora, para contextos (novo): diz quantas tarefas passam e que o
  rótulo de origem deixa de existir.
- **Excluir** confirma citando o uso, no modelo da exclusão de tag de hoje (D3).

### Configurações

Mesmo esqueleto das outras telas, com navegação própria porque são muitas seções:

- **Navegação interna** (232px, fixa ao rolar): busca de configuração no topo (filtra por nome e
  palavras-chave, como "tema", "worklog", "porta"); grupos **Aplicativo** (Geral, Aparência, Fluxo de
  trabalho, Terminal, Backup) e **Integrações** (Notion, Google, Jira, Servidor MCP), e
  Sobre no fim. Integração mostra um `Badge` de estado (conectado, desligado, erro) com o texto no
  tooltip. A seção aberta fica salva. Abaixo de `md` a navegação vira um `Select` agrupado. O
  conteúdo da seção tem largura máxima de 780px.
- **Cabeçalho da seção:** ícone em quadrado `primarySoft`, título, `Tag` neutra de estado com o
  ponto do `Badge` (integrações) e uma frase do que a seção faz.
- **Linha de ajuste** (`SettingRow`): título e descrição curta à esquerda, controle à direita
  (`Switch`, `Select`, `Segmented`, `InputNumber`, botão). Quebra para baixo quando falta espaço.
  Linhas relacionadas ficam num `Card` com título ("Inicialização", "Time leak").
- **Guias de configuração** (Notion, Google) usam `Steps` vertical com o passo atual, campos dentro
  do passo e "Marcar como feito" nos passos manuais. Com a integração conectada, o guia fica num
  `Collapse` para trocar credenciais. No Google o guia é só do cliente próprio e fica sempre no
  `Collapse` "Avançado".
- **Google** é uma ação só: o app traz o próprio cliente OAuth e a seção abre com "Conectar com
  Google" (primário; abre o navegador, entra na conta e libera a agenda). Conectado, o card **Conta
  Google** mostra o e-mail e "Desconectar" (confirma e diz que as tarefas já enviadas ficam na
  agenda), e o card **Permissões** lista Agenda e Google Drive, cada uma com `Tag` "Permitida" ou o
  botão "Permitir" (pede só aquela permissão). Tirar uma permissão é desconectar. Com a agenda
  permitida, o card **Agenda TickTask** traz "Sincronizar automaticamente" (`Switch`) e
  "Ressincronizar". O guia antigo, com
  cliente próprio, fica num `Collapse` "Avançado: usar um cliente OAuth próprio"; a tela não explica
  OAuth nem o aviso do Google fora dele.
- **Confirmações** destrutivas (restaurar backup, regenerar token, limpar Notion) dizem o que
  acontece e o que não acontece.
- **Seções novas:** **Aparência** (tema Sistema/Claro/Escuro com miniaturas montadas dos tokens, sem
  hex, e densidade) e **Fluxo de trabalho** (jornada diária, início da semana, níveis e repetição do
  time leak, faixa de horas do calendário, os quatro avisos de prazo, intervalo do envio das notas
  ao Notion), guardadas no banco (`app_prefs`) e lidas pelo main e pelo renderer. Também novos:
  alterar o atalho da captura (em Geral) e backup automático (em Backup: diário, guarda os 14
  automáticos mais recentes e nunca apaga os manuais; desabilitado sem pasta).
- **Gravar um atalho:** uma linha só, com as teclas atuais e o botão "Definir atalho". Ao clicar, o
  botão vira primário com "Pressione as teclas…" (`aria-pressed`) e a descrição da linha diz o que
  fazer; a combinação vale com dois modificadores ou Super (Ctrl+C, Alt+F4 e Ctrl+Shift+C/V/Z… são
  recusados, e a descrição fica `error` com a regra). `Esc`, `Tab` ou tirar o foco cancela. Definir
  já deixa o atalho valendo, seja qual for o sistema; a tela não explica o mecanismo. Se o atalho
  salvo não está valendo, uma `Tag` `warning` "Inativo" fica ao lado das teclas.

### Cadernos

Anotações livres no molde do OneNote: caderno → seção → página, com até 2 níveis de subpágina.
Variante de altura total (§5), em colunas que ocupam a altura da área, sem rolar a página:

- **Coluna de cadernos** (248px, a partir de `lg`): busca nas páginas no topo (`AutoComplete` com
  título, caderno › seção e um trecho; o título que bate vem primeiro), `Menu` com os cadernos
  (ícone `BookOpen` na cor do caderno) e "Novo caderno" no pé. Cada caderno tem `⋯` no hover e o
  mesmo menu no botão direito: Sincronizar com o Notion, Exportar em Markdown, Editar, Mover para
  cima, Mover para baixo, Excluir. Arrastar o caderno também reordena. Abaixo de `lg` a coluna vira
  uma barra: `Select` do caderno (com "Novo caderno" no fim da lista), `⋯` e a busca.
- **Seções** em `Tabs` `editable-card` acima das páginas e do editor: ponto na cor da seção e nome,
  `+` cria, `⋯` à direita e botão direito na aba (Editar, Mover para a esquerda, Mover para a
  direita, Excluir). Arrastar a aba reordena. Soltar uma página numa aba move a página, com as
  subpáginas, para o fim daquela seção; a aba ganha um contorno tracejado enquanto a página está
  por cima.
- **Páginas** num `Tree` (card de 280px com "Páginas" e "Nova página"): linhas-guia, subpáginas
  recolhíveis, arrastar entre páginas reordena e soltar sobre uma página a torna subpágina; a
  soltura que passaria de 2 níveis não é aceita. Cada linha tem "Nova subpágina" e `⋯` no hover, e
  o mesmo menu no botão direito: Nova subpágina, Promover, Tornar subpágina da anterior, Mover para
  cima, Mover para baixo, Mover para a seção ▸, Excluir. Tudo que se faz arrastando tem caminho
  pelo menu. Página sem título aparece em itálico, em `colorTextTertiary`. Abaixo de `md` a árvore
  vai para um `Drawer` aberto pelo botão "Páginas".
- **Editor** no molde do detalhe da tarefa: título grande sem borda (salva sozinho), "criada ·
  editada" em mono, abas Notas e Desenho, ações das notas e **Modo foco**, o mesmo da tarefa sem o
  timer. O Modo foco substitui os antigos Maximizar e Zen da página. As ações diferem da tarefa:
  a página **exporta uma vez**, pelo diálogo de salvar `.md` (`Download`), em vez de manter um
  arquivo atualizado a cada salvamento; ao lado, Salvar e sincronizar com o Notion.
- **Cor** de caderno e seção na paleta fixa de dez (§3.2), no mesmo modal de nome e cor
  ("Novo caderno", "Editar caderno", "Nova seção", "Editar seção"). Cada amostra tem nome
  ("Cor azul"), não o hex.
- **Vazios** com `Empty` e o próximo passo: sem caderno ("Novo caderno"), sem seção ("Nova
  seção"), seção sem página ("Nova página").
- **Excluir** confirma com o que vai junto e quantos (seções, páginas, subpáginas, com notas,
  imagens e desenhos) e o que não acontece: as tarefas não mudam e menções `@` às páginas ficam sem
  destino. No Notion, as páginas vão para o arquivo só com o envio automático ligado.
- A árvore de páginas e o editor ficam cada um num `RegionBoundary` (os editores de notas e de
  desenho já têm o seu).

### Arquivo

Arquivar tira a tarefa de todas as listas sem apagar nada. A tela deixa de ser a "Arquivo Morto"
de cartões sem ação e vira uma **tabela de tarefas arquivadas** (`listTasks` com `archived: true`),
no molde da tabela de tarefas: as mesmas linhas de grupo, menu no `⋯` e no botão direito, seleção e
barra flutuante (`FloatingActionBar`), com as colunas próprias do arquivo abaixo (C3, D2).

- **Topo:** uma frase do que é arquivar e onde ficam os projetos arquivados (Projetos →
  Arquivados, com link), e o total em mono ("12 tarefas · 21h 17min registradas").
- **Filtros** numa linha: busca por nome ou `#id`, projeto (inclui "Sem projeto"), status que a
  tarefa tinha ao ser arquivada, "Arquivada em" (30 dias, 90 dias, último ano), ordenar
  (arquivadas por último, nome, mais tempo) e agrupar (por mês, padrão; por projeto; nenhum).
  Os grupos são as mesmas linhas de cabeçalho da tabela de tarefas.
- **Tabela:** ID, Tarefa (abre a tarefa **só leitura**, com a faixa "Arquivada · Desarquivar"),
  Status (o de quando foi arquivada, com tooltip explicando), Projeto, Arquivada em, Tempo e
  "Desarquivar" + `⋯`. Botão direito na linha abre o mesmo menu. Abaixo de `lg`, projeto e data
  descem para baixo do nome.
- **Tarefa arquivada aberta** (pelo Arquivo, pela busca ou por link): o detalhe abre **só leitura**.
  Acima do cabeçalho, a faixa `ArchivedTaskBanner` (`Alert` informativo com `Archive`): "Arquivada em
  DD/MM/AAAA · só leitura", a frase "Notas, desenho, campos e timer ficam travados. Desarquive para
  editar; a tarefa volta ao status que tinha." e o botão **Desarquivar** (`ArchiveRestore`). Ficam
  travados nome, descrição, status, pílulas, notas, desenho, os campos do inspetor e o timer
  (Iniciar e Finalizar desabilitados); continuam ativos voltar, as abas, o menu `⋯` (Desarquivar,
  Copiar `#id`, Excluir) e exportar as notas. Desarquivar libera a tela na hora.
- **Desarquivar** devolve a tarefa ao status que tinha e mostra "Desfazer" na mensagem. **Excluir
  de vez** confirma com o tempo de sessões que vai junto e avisa do Notion e do Google.
- **Ações em massa:** a mesma barra flutuante da lista, com Desarquivar e Excluir de vez.
- **Limpar o arquivo** (novo, no `⋯` da barra e num `Alert` quando há tarefas arquivadas há mais de
  um ano): `Modal` com "arquivadas há mais de 3 / 6 / 12 / 24 meses", a contagem que vai sair e a
  dica de fazer backup antes. Uma confirmação só, em vez de uma por tarefa.
- **Vazio:** "Nada no arquivo" e como arquivar; com filtros, "Limpar filtros".
- **Backend novo:** coluna `tasks.archived_at` (gravada ao arquivar, limpa ao desarquivar), filtros
  e ordenação no SQL (`listTasks` com `archived`, `archivedBefore`, `archivedAfter`) e exclusão em
  lote por idade.

### Hoje

O plano do dia é o "plano específico" que libera a mente (Masicampo e Baumeister 2011): o que
fazer hoje e em que ordem.

- **Card "Plano de {dia da semana}, {data}"**: lista densa (`size="small"`), sem arrasto nem alça,
  cada linha com nome (abre a tarefa), chip de status, projeto e, à direita, a hora do prazo ou o
  tempo em mono. A ordem é automática: tarefas com horário (`scheduled_time`) primeiro, pela hora,
  com a faixa `09:00–10:30` (relógio + mono) na linha de baixo, antes do status; depois as de prazo
  com hora, pela hora; o resto pela ordem do `plan_day` do MCP, quando houver, e pela data de
  criação. Para mudar a ordem, dê horário à tarefa. Sem espaço extra no topo do card.
  No cabeçalho do card, a carga planejada contra a jornada: `Progress` fino e curto (~96px) seguido
  de "6,5h de 8h"; a barra não ocupa uma linha própria no corpo. Abaixo de `sm`, a barra encolhe e
  "passa da jornada" vira tooltip, para o título caber. A carga é a soma dos blocos de tempo do
  dia, a mesma conta do calendário (`plannedMin`). Passou da jornada: âmbar e "passa da jornada",
  nunca vermelho (aviso, não alarme).
- **Card "Semana"** ao lado (abaixo de `lg`, embaixo): um `Progress` por dia com as horas
  planejadas; hoje em negrito; dia acima da jornada em âmbar.
- **Vazio:** "Nada planejado para hoje." e a dica "Na lista de tarefas, use **Hoje** (botão da linha
  ou do menu ⋯) para trazer tarefas para cá.", com o botão **Ir para Tarefas** (D5).
- A jornada vem das preferências (Configurações → Fluxo de trabalho; padrão 8h).

### Calendário

O calendário é onde a próxima ação ganha hora: o _time blocking_ que Masicampo e Baumeister (2011)
mostram liberar a mente. Ele junta o plano (blocos), o compromisso (tarefa com horário), o prazo e
o que de fato aconteceu (sessões do timer) na mesma grade.

- **Barra da tela:** Hoje, `‹ ›`, o período como botão que abre um `DatePicker` para pular de data,
  `Segmented` Dia / 3 dias / Semana / Mês / Agenda, "Mostrar" e **"Novo bloco"** (primário na cor
  do tema; sai o azul exclusivo desta tela). Visão inicial por largura: Semana a partir de `lg`,
  3 dias em `md`, Dia abaixo disso. Abaixo de `md` o `Segmented` de visão vira `Select`. O
  calendário ocupa a largura toda do conteúdo (variante de largura total do `PageContainer`).
  A URL pode abrir a tela numa visão e numa data (`?visao=semana&semana=AAAA-MM-DD`); é assim que
  a revisão semanal leva à semana que passou e à Agenda das próximas duas semanas.
- **"Mostrar"** é ao mesmo tempo filtro e legenda (corrige D4): Blocos de tempo, Tarefas com
  horário, Agendadas sem horário, Prazos, Sessões registradas e Fins de semana, cada um com a
  amostra do que aparece na grade, mais a chave dos ícones (urgente, prioridade, time leak, Google).
- **Painel "A agendar"** (novo, à esquerda): aberto por padrão a partir de `xl`, fechado com botão
  para abrir em `lg`, `Drawer` abaixo de `lg`. Lista as tarefas em Próximas e Executando sem bloco
  nos dias visíveis, com busca, projeto, energia e prazo. Arrastar para a grade cria
  um bloco de 1h na hora em que soltou; o `+` reserva 1h num dia escolhido. Vazio diz "Toda
  próxima ação tem tempo reservado".
- **Cabeçalho do dia:** dia da semana, número (hoje em círculo da cor primária) e um medidor fino
  das horas em blocos contra a jornada das configurações. Passou da jornada, o medidor fica âmbar
  e o tooltip diz "passa da jornada" — aviso, não alarme. Clicar no dia abre a visão Dia.
- **Faixa "Dia":** agendadas sem horário (chip com ponto do projeto) e prazos (bandeira, borda
  tracejada; âmbar no dia, vermelho só se venceu; mostra a hora do prazo quando tem). `+N` abre um
  `Popover` com o resto. Arrastar um chip para outro dia reagenda ou move o prazo.
- **Grade:** faixa de horas das configurações; o padrão é o dia inteiro, 00:00–24:00, com a régua
  em 24 horas como no Google Calendar (rótulos de 01:00 a 23:00, nenhum na meia-noite das pontas,
  para nada ficar cortado). 48px por hora (40 no compacto), snap de 15 minutos, linha de hora em `border`, fim de semana em `bg`. A linha do agora é da cor
  primária (vermelho é só para erro) e a tela abre rolada até ela. Rola dentro do próprio card, com
  cabeçalho e faixa "Dia" fixos.
- **Bloco de tempo:** fundo `calBlock` com borda `calBlockBorder` (§3.1), ponto do projeto, ícone da
  categoria quando não é normal, nome, horário em mono e ícone do Google quando está na agenda
  TickTask. Time leak usa a escala de time leak de três níveis (a única semântica que pinta fundo).
  Tarefa concluída fica apagada e riscada; a que está rodando ganha o ponto pulsante. A cor do
  projeto nunca vira fundo.
- **Tarefa com horário** (`scheduled_time`–`scheduled_end_time`): mesmo formato, fundo `surface`,
  borda forte e ícone de calendário — é compromisso, não reserva.
- **Sobreposição:** blocos que se cruzam dividem a largura da coluna lado a lado.
- **Sessões registradas** (novo): uma faixa de 4px na borda direita da coluna para cada sessão do
  timer, tracejada enquanto roda. Planejado × feito lado a lado, sem julgamento.
- **Editar direto na grade** (novo): arrastar o bloco ou a tarefa com horário move (inclusive para
  outro dia), a alça de baixo muda o fim, clique abre um `Popover` com tarefa, projeto, status,
  `TimePicker.RangePicker`, duração, "Iniciar timer", "Abrir" e excluir. Botão direito: abrir,
  iniciar timer, repetir no dia seguinte, excluir. Teclado: Enter abre, Delete exclui. Exclusão
  mostra "Desfazer" na mensagem. Excluir, repetir e o botão direito são só do bloco: a tarefa com
  horário é compromisso, e tirar o horário é na própria tarefa.
- **Criar:** clicar num espaço vazio abre o `Modal` "Novo bloco de tempo" já com dia e hora (1h),
  com busca da tarefa e duração calculada.
- **Mês:** semana começando na segunda (configuração "início da semana"), número do dia como botão
  que abre o Dia, "N · Xh" em mono (tooltip com os horários) no lugar do selo laranja, chips de
  agendadas e prazos arrastáveis, `+N mais`. Hoje só no círculo do número, sem pintar a célula.
  Soltar uma tarefa de "A agendar" num dia reserva 1h às 09:00, como o `+` do painel.
- **Agenda:** lista dos próximos 14 dias com algo marcado, por dia: agendadas, prazos e blocos com
  horário. É a visão acessível e a melhor no celular.
- **Vazio:** dias sem nada mostram uma dica sobre a grade ("clique ou arraste de A agendar").
- **Backend novo:** sessões por intervalo de datas para a grade, mover/redimensionar bloco
  (`timeBlock:update` já existe), jornada, faixa de horas e início da semana das configurações.

### Revisão semanal

A revisão é o hábito que mantém o sistema confiável (Heylighen e Vidal 2008). A tela deixa de ser
um checklist de marcar e vira um **fluxo guiado**, em que cada passo traz a lista que ele revisa e
as ações para resolver ali mesmo (E5).

- **Três fases, dez passos** (a estrutura de David Allen):
  - **Clarear** — Coletar itens soltos · Processar o Inbox · Esvaziar a cabeça (novo, com lista de
    gatilhos);
  - **Atualizar** — Revisar próximas ações · Olhar a semana que passou (novo) · Olhar as próximas
    duas semanas · Revisar aguardando · Revisar projetos;
  - **Criar** — Revisar someday · Pensar adiante.
- **Antes de começar:** cartão com dias desde a última revisão, as três fases e **um** botão
  primário "Começar revisão" (some o botão duplicado do cabeçalho, B3). Ao lado, "Ritmo": as últimas
  12 semanas em quadrados (com ou sem revisão) e o texto "9 de 12 semanas". Sem contador de
  sequência e sem vermelho por semana perdida (Kim et al. 2016). Embaixo, "Como está o sistema" com
  os mesmos `HealthCard` do dashboard (mesmos tons) e o histórico em `Table` paginada; a linha abre
  um `Drawer` com os passos feitos e pulados e as notas.
- **Durante:** cabeçalho com "Revisão da semana", há quanto tempo começou, progresso `N/10` e
  "Pausar". À esquerda, trilho com um `Steps` vertical por fase; clicar num passo vai até ele, e o
  passo pulado mostra "Pulado". No centro, o card do passo: fase e número, título, a pergunta do
  passo, o conteúdo e o rodapé com "Anterior", "Pular" e **"Concluir passo"** (primário,
  `Ctrl+Enter`). "Abrir a tela" no cabeçalho do card leva à tela completa e a revisão continua de
  onde estava. À direita (a partir de `xxl`; abaixo do card antes disso): "Sistema nesta revisão",
  com cada indicador no começo → agora, e "Notas da revisão", salvas sozinhas.
- **O que cada passo traz:**
  - Coletar, Esvaziar a cabeça, Semana que passou e Próximas semanas: um campo de captura (Enter
    manda para o Inbox) e a lista do que foi capturado nesta revisão. Semana que passou mostra
    também as sessões, as tarefas concluídas e os eventos dos últimos 7 dias (usa a consulta por
    intervalo da F4-b1);
  - Processar o Inbox: cada item com Próxima, Aguardando, Someday, Feito (< 2 min) e Excluir;
    vazio vira "Inbox zero" em tom positivo;
  - Próximas ações e Aguardando: ordenadas pela mais parada, com chip âmbar "parada há N dias"
    acima do limiar (14 e 7 dias); Aguardando mostra de quem se espera e tem "Recebi" e "Cobrar"
    (cria a ação de cobrança no Inbox);
  - Projetos: próxima ação de cada projeto ativo; sem ela, um `Select` define uma das tarefas
    abertas como próxima; menu para mover para someday ou concluir;
  - Someday: tarefas e projetos someday com "Ativar";
  - Pensar adiante: texto livre, uma ideia por linha, "Mandar para o Inbox" e atalho para
    Horizontes.
- **Fechar a revisão:** resumo (Inbox no começo → agora, coletados, processados, projetos com
  próxima ação nova, cobranças, tarefas tiradas das listas), duração e os passos sem marcar.
  Dá para concluir com passos pulados: a confirmação diz que eles ficam registrados como pulados
  ("uma revisão parcial vale mais que nenhuma"). O histórico guarda passos feitos e pulados.
- **Retomar:** a revisão em andamento fica no banco. Sair da tela ("Abrir a tela" ou a sidebar) e
  voltar cai de novo no passo em que estava. Pausada, ou ao abrir o app de novo, a entrada mostra um
  `Alert` "Revisão em andamento · N de 10 · próximo: …" com "Retomar" (primário) e "Descartar"
  (confirma, e avisa que o que mudou nas tarefas continua mudado).
- **Lembrete:** o ponto âmbar no item da navegação aparece só depois de 7 dias sem revisão.
- **Responsivo:** trilho a partir de `lg`; abaixo disso, um `Select` agrupado por fase com ✓ e –
  no lugar do trilho. As ações das linhas mostram texto a partir de `lg` e só ícone com tooltip
  abaixo.
- **Backend novo:** `checklist_state` guarda `done` ou `skipped` por passo. As chaves dos oito
  passos antigos migram para as dez novas (`collect`, `inbox`, `mind`, `next`, `past`, `upcoming`,
  `waiting`, `projects`, `someday`, `creative`); revisão antiga aparece no histórico sobre 8.
  Também: contadores da sessão, o passo atual (para retomar), o retrato dos indicadores no início
  (`start_health`, base do "Sistema nesta revisão"), a semana que passou (`review:pastWeek`),
  descartar a revisão em andamento, data da última mudança de status para "parada há N dias", e a
  revisão concluída com passos pulados. Dados em `docs/ui/07-revisao-semanal.md`.

### Dashboard

O dashboard responde duas perguntas, nessa ordem: **o sistema está em dia?** e **para onde foi o
tempo?** Toda métrica abre o que ela conta (E4). Base: NN/g (comprimento e posição leem melhor que
área e ângulo), Kim et al. 2016 (enquadramento neutro), Mark et al. 2014 (foco varia por hora e dia).

- **Duas seções.** "Agora" mostra o estado atual e não tem filtro. "No período" começa com a linha
  de filtros, e os filtros valem para tudo abaixo dela; nenhum card tem filtro próprio.
- **Saúde do sistema** (Agora): seis cartões clicáveis em grade — Inbox para processar (com o item
  mais antigo e a taxa processada na semana), Projetos sem próxima ação (novo), Projetos parados (>
  7 dias), Aguardando sem resposta (> 7 dias), Prazos vencidos (novo) e Revisão semanal (dias desde
  a última). Ícone num quadrado tingido, com os tons do `HealthCard`: **em dia** usa as cores de
  Executando com `CircleCheck`; **atenção**, as de Aguardando com o ícone do indicador; **erro**, as
  de Urgente, **só** para prazo vencido; **neutro**, as de Inbox, para o que só informa (Someday).
  Valor em 20/600. Cada cartão leva à lista já filtrada (rotas em `HEALTH_TARGETS`, ver Tabela de
  tarefas e Projetos). Os limiares são os mesmos da revisão
  semanal e tudo vem de uma consulta só (`review:healthIndicators`), para as duas telas nunca
  discordarem. A consulta traz oito indicadores: Inbox, sem próxima ação, projetos parados (> 7
  dias), aguardando (> 7 dias), próximas paradas (> 14 dias), prazos vencidos, someday e dias desde
  a última revisão. O dashboard mostra seis (sem próximas paradas e someday); a revisão mostra seis
  (sem projetos parados e a própria revisão). Título e texto de cada indicador são os mesmos nas duas telas
  (`healthItems.ts`), e o ponto âmbar da Revisão na sidebar usa a mesma regra do cartão (mais de 7
  dias de calendário desde a última concluída). "Há mais de N dias" conta da última mudança de
  status, não da última edição.
- **Tarefas abertas por status** (Agora): barras horizontais ordenadas pelo fluxo, chip do status
  ao lado, contagem e %. Substitui o funil, que punha Aguardando como etapa depois de Executando.
- **Filtros** (No período): `Segmented` 7 dias / 30 dias / 90 dias / 12 meses (padrão 30),
  `RangePicker` para período livre e `Select` de projeto. "Exportar PDF" fica na mesma linha e
  exporta o período escolhido. Ao trocar o filtro, o conteúdo fica com 55% de opacidade até os
  dados novos chegarem, sem skeleton e sem pulo de layout.
- **Tempo focado** (o único número herói da tela, 48px, sans, algarismos proporcionais): total do
  período, diferença para o período anterior e média por dia útil. Embaixo, colunas por dia (até
  31 dias), por semana (até 120) ou por mês. Colunas na cor recuada e a atual (hoje, esta semana,
  este mês) na cor primária. Ao lado, três números: tarefas concluídas, sessões de foco e média por
  sessão, cada um com a diferença para o período anterior.
- **Diferenças são neutras.** Seta e texto secundário, sem verde nem vermelho: menos horas não é
  erro (Kim et al. 2016).
- **Barras horizontais ordenadas** no lugar de toda pizza e rosca: "Para onde foi o tempo" (com
  `Segmented` Projeto / Área / Contexto no cabeçalho do card — troca a visão, não filtra), "Tarefas
  com mais tempo" (oito), "Por categoria" e "Por nível de energia". Uma cor só; a identidade vem do
  ponto do projeto, do chip ou do medidor de energia. Cada linha mostra tempo e %, e clicar abre o
  projeto, a tarefa ou a lista filtrada. "Por categoria" mostra "N tarefas" em cada linha e, quando
  time leak passa de 10% do tempo do período, uma frase avisa. "Por nível de energia" mostra a
  média por tarefa.
- **Quando você foca** (novo): heatmap dia da semana × hora (6h–23h) com a escala sequencial, para
  achar os horários bons para tarefas de energia alta. Precisa de consulta nova sobre o início das
  sessões.
- **Constância**: o heatmap anual de hoje, agora com rótulo de mês e de dia da semana, a escala
  sequencial dos tokens e o período do filtro. Hoje fica contornado.
- **Todo gráfico** tem tooltip no hover e no foco do teclado, e um botão "Ver como tabela" no
  cabeçalho do card (acessibilidade e números exatos). Cada card tem `RegionBoundary` próprio.
- **Vazio:** período sem sessão mostra um `Empty` só no lugar dos gráficos, com atalhos "Todos os
  projetos" e "Ver 12 meses". A seção Agora continua visível.
- **Sai do dashboard:** o painel "Em execução agora" (o timer já está no Header e na barra de
  status), o gráfico "Tempo por status" (tempo somado pelo status atual da tarefa não responde
  nada útil) e o título "Dashboard Avançado".
- **Biblioteca:** nenhuma. Colunas, barras horizontais, cartões e heatmaps são HTML com tokens
  (`CHART_COLORS`), o que já dá tooltip no foco do teclado e o "Ver como tabela" sem adaptação. O
  Recharts saiu do projeto na F7-b3.
- **Período livre** vai até 365 dias (o `RangePicker` não deixa passar disso e a consulta recusa).
- **Responsivo:** grade `Row`/`Col` — dois cards por linha a partir de `lg`, herói + números lado a
  lado a partir de `xl` (16/8) e os dois heatmaps em 14/10 a partir de `xl`. No celular os filtros
  ocupam a largura toda e os heatmaps rolam na horizontal dentro do card.

### Janelas auxiliares

Captura rápida e timer flutuante (protótipo: `#janelas`). Seguem o tema e a densidade da janela
principal, com os mesmos tokens e fontes; nada de cor fixa (o timer era sempre escuro, a captura
sempre branca com uma tarja verde). As duas são um cartão `elevated` com borda `borderStrong` e
raio 12 ocupando a janela transparente inteira, sem moldura e sempre no topo. **Sem sombra:** a
janela não tem sobra em volta do cartão para desenhá-la; a borda separa do que está atrás.

- **Captura rápida** (400×140, centrada a 1/3 da altura): cabeçalho de 36px que arrasta a janela,
  com `Inbox` + "Capturar para o Inbox" e o fechar (`X`, botão `text` só com ícone, tooltip
  "Fechar (Esc)"); `Input` "O que precisa ser feito?" (grande; médio na densidade compacta) com
  foco ao abrir; rodapé com `Kbd` "Enter captura · Esc fecha" e o primário "Capturar"
  (desabilitado vazio). Capturado troca o corpo por `CircleCheck` em `success`, "Capturado no
  Inbox" e o texto em cinza (`role="status"`), e fecha sozinha em 1,2 s. Erro mantém o texto no
  campo e troca as teclas do rodapé por "Não foi possível capturar. Tente de novo." em `error`
  (`role="alert"`), sem mudar a altura. Perder o foco ou `Esc` fecha. Cria só o nome, no Inbox.
- **Timer flutuante** (300px, canto superior direito, aparece ao minimizar ou fechar a janela
  principal com timer rodando): uma linha de 44px por timer, até 5 (depois rola), com o ponto ao
  vivo (`LiveDot`), o nome (um botão sem moldura, focável, que abre a tarefa na janela principal),
  o tempo em Geist Mono tabular 14/600 e pausar (`Pause`, botão `text` só com ícone, tooltip e
  `aria-label` "Pausar <nome>", sem vermelho, como na pílula do header). A linha de time leak ganha
  o fundo do nível, como na lista. Rodapé de 44px em `surface`: "N em andamento", "Pausar todos"
  (só com mais de um) e "Abrir CrafyTask" (`Maximize2`). Antes do primeiro dado, uma linha
  "Carregando os timers…". Arrasta pelo rodapé e pelos espaços das linhas; o nome e os botões são
  `no-drag` (no Electron, clique em região de arraste não chega ao elemento).

## 9. Modo escuro

- Preferência Sistema / Claro / Escuro, aplicada no main por `nativeTheme.themeSource`, para as
  três janelas (principal, timer flutuante, captura rápida) mudarem juntas. O renderer lê
  `prefers-color-scheme` e escolhe `darkAlgorithm` ou `defaultAlgorithm`.
- Padrão: seguir o sistema. Polaridade clara lê melhor com fonte pequena (Piepenbrock 2013/2014),
  por isso o claro é o tema de referência e o escuro é cuidado com o mesmo rigor, não uma inversão.
- Fundo cinza-violeta escuro, nunca preto. Elevação por luminosidade (`bg` < `surface` <
  `elevated`), cores dessaturadas e mais claras, texto em três níveis.
- Tiptap e Excalidraw recebem fundo, texto e borda dos tokens (via variáveis CSS).
- O terminal embutido é escuro nos dois temas, com paleta fixa tirada dos tokens escuros: fundo
  `#15141D` (`sider`), texto e cursor `#ECEAF6` (`text`), metadado `#8C89A1` (`text3`) e sucesso
  `#4CD69A` (`success`). Ela mora em `theme/semantic.ts` como `TERMINAL` (F7-c).
- O padrão é seguir o sistema. O seletor fica no menu de aparência do header, em Configurações →
  Aparência e na paleta de comandos. Ele ficou escondido até a F7-d3, enquanto havia tela sem
  tokens escuros.

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
- **Edição no lugar** (nome e descrição da tarefa e do projeto, resultado desejado, título da página
  do caderno, nome e descrição do modal Nova tarefa): `Input`/`TextArea` `variant="borderless"` com
  8px de respiro dos lados e margem negativa de 8px (`lib/inlineEdit.ts`, `.ct-inline-edit` no
  protótipo). Em repouso o texto fica alinhado com o resto da tela; no foco o contorno tem folga e o
  texto não encosta nele. Nunca `padding: 0` nesses campos.
- **Ações reveladas no hover** continuam em listas densas, mas também ficam acessíveis pelo teclado
  (foco mostra) e pelo menu de contexto.
- **Estado vazio:** diz o que significa e o próximo passo. Inbox vazio: "Inbox zerado. Tudo
  processado."
- **Confirmação:** destrutiva sempre (inclui área e meta, E6), cita quantos itens e o que não
  acontece (o modelo é a confirmação de exclusão de tag).
- **Alerta GTD inline:** `Alert` com ação, como "Sem próxima ação definida · Definir" nos projetos e
  "N itens para processar" no topo do inbox.
- **Cabeçalho de seção** (`SectionHeader`, criado na F3-c): rótulo 11/600 em maiúsculas com
  `letter-spacing: .08em`, uma linha em `border` até o fim e, à direita, um número em mono (total,
  contagem). Usado no inspetor, no dashboard e na revisão.
- **Tecla** (`Kbd`, criado na F7-d1, a partir do `.ct-kbd` do protótipo): tecla em mono 12px, borda
  `borderStrong` mais grossa embaixo, fundo `bg`. Usado onde um atalho aparece como texto
  (Configurações, captura, rodapé do modal Nova tarefa).
- **Atalho no tooltip:** todo controle que tem atalho diz o atalho no tooltip: "Buscar e comandos
  (Ctrl+K)", "Modo foco (Esc sai)", "Terminais (Ctrl+')".
- **Anel de foco:** elemento clicável próprio (que não é componente do antd) usa o `:focus-visible`
  global: contorno de 2px na cor primária, afastado 2px.

## 12. Movimento

Durações de 160ms (`motionDurationMid`) e 240ms (`motionDurationSlow`). O único movimento contínuo
é o ponto verde de "executando". Tudo respeita `prefers-reduced-motion`: sem pulso, sem transição
de layout.

## 13. Palavras

Um nome por coisa: **Tags** (não "Fonte / Tag"), **Arquivo** (não "Arquivo Morto"), **Contextos e
tags** na navegação. Verbos que dizem o que acontece: "Capturar", "Planejar para hoje", "Arquivar".
Erros dizem o que houve e o que fazer, sem pedir desculpa.

## 14. Proibido

- Paleta padrão do antd, inclusive as cores prontas de `Tag` (`color="blue"`, `"success"` e
  afins): tag de estado é neutra, com o ponto do `Badge status`. Cor de marca como fundo
  decorativo, gradiente decorativo (gradiente funcional, como a linha da grade ou a sessão em
  andamento no calendário, pode).
- Pizza, rosca e funil em gráfico; status, categoria ou energia como cor de série.
- Hex solto e classe de cor do Tailwind em componente.
- CSS mirando classes internas `.ant-*` (o DOM interno muda entre versões); customizar por token,
  `classNames` e `styles`.
- `message`, `Modal.confirm` e `notification` estáticos.
- `h-screen` em página; fonte ou imagem remota; status só com cor.

## 15. Stack e verificação

- `antd@^6.7` e React 19 (a v6 não precisa do patch de React 19), `cssVar` ligado, `hashed: false`.
- Tokens de componente do shell no `buildTheme`: `Layout.headerPadding` `'0 16px'` e
  `Menu.itemMarginInline` 8. Em `tokens.ts`, `colorTextQuaternary` recebe o mesmo `text3`.
- Tailwind v4 só para layout, com `@layer theme, base, antd, components, utilities;` antes do
  `@import 'tailwindcss'` e `StyleProvider layer` no antd. O preflight continua ligado.
- `npm run design:audit` confere o que do protótipo já existe no código
  ([checklist](prototipo/checklist.json)). Itens visuais só fecham com a validação do usuário no
  app rodando.
