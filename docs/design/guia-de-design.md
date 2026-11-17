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

- **Navegação** em todas as rotas, agrupada:
  - Fluxo: Tarefas (contador do inbox), Hoje (contador do plano), Calendário, Revisão semanal.
  - Organizar: Projetos, Horizontes, Contextos e tags.
  - Conhecimento: Cadernos, Dashboard.
  - Rodapé: Arquivo, Configurações (com rótulo, não só ícone).
    Isso substitui os doze botões do `TitleBar` que só existiam na home e os quatro botões "Voltar"
    (B1, B2, B4). Voltar fica só em telas de detalhe (task, projeto), como botão `text` com o nome do
    destino.
- **Header (52px):** título da tela; campo "Capturar para o Inbox…" (Enter grava, mesmo IPC da
  captura rápida); pílula com os timers rodando (popover com pausar e abrir); busca `Ctrl+K`; menu
  de aparência; botão primário "Nova tarefa". Abaixo de `sm` a captura sai do header e vai para a
  paleta de comandos.
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

## 8. Responsividade

Breakpoints do antd para a casca; container queries para componentes dentro de painéis
redimensionáveis (notas, terminal). A janela principal passa a aceitar `minWidth` 400 (hoje 800,
o que impede ver qualquer layout estreito).

| Faixa            | Sider                           | Header                              | Lista de tarefas                                     | Detalhe da task                          |
| ---------------- | ------------------------------- | ----------------------------------- | ---------------------------------------------------- | ---------------------------------------- |
| `< 576` (xs)     | `Drawer` pelo botão de menu     | sem captura, "Nova tarefa" só ícone | status em `Select`, cards                            | abas Timer / Notas / Dados               |
| `576–767` (sm)   | `Drawer`                        | captura volta                       | status em `Select`, cards                            | abas                                     |
| `768–991` (md)   | recolhido, 64px                 | sem pílula de timers no texto       | `Tabs` com contadores, tabela com colunas essenciais | 2 colunas: dados + (timer, notas)        |
| `992–1199` (lg)  | recolhido, 64px (pode expandir) | completo                            | + status                                             | 2 colunas                                |
| `1200–1599` (xl) | aberto, 232px                   | completo + atalho visível           | + projeto, energia                                   | 3 colunas: dados 320 · timer · notas 40% |
| `≥ 1600` (xxl)   | aberto                          | completo                            | + contextos                                          | 3 colunas: dados 380 · timer · notas     |

As abas de status são o centro da lista e continuam abas (não viram menu) enquanto couberem numa
linha: seis status mais "Todas" estão no limite recomendado pela NN/g. Abaixo de `md` viram `Select`
com o mesmo ícone, rótulo e contador.

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
