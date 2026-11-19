# Terminal embutido

Painel de terminal no rodapé da janela principal, por task ou por projeto, no estilo do VS Code. Cada task pode
ter um **diretório de trabalho** (`tasks.working_dir`) e um **comando inicial**
(`tasks.start_command`); o terminal abre nessa pasta e digita o comando.

O projeto também pode ter um diretório (`projects.working_dir`, editado no detalhe do projeto). A
task sem diretório próprio **herda** o do projeto: o campo mostra o caminho com a etiqueta *do
projeto*, e **Alterar** grava um diretório só da task. Com diretório próprio e projeto com
diretório, o botão `↶` limpa o da task e volta a herdar. A regra é `effectiveWorkingDir`
(`shared/workingDir.ts`, testada), usada no renderer e no `terminal:create`. O comando inicial
continua sendo só da task.

Toda sessão tem um **dono** (`TerminalOwner = { kind: 'task' | 'project', id }`): `terminal:create`
recebe o dono, e a sessão de projeto abre em `projects.working_dir`, sem comando inicial. O id da
sessão leva o tipo (`t12-1`, `p3-1`). Ao excluir, as sessões do dono morrem: `task:delete`,
`task:bulkDelete` e `delete_tasks` (`disposeTerminalsForTasks`), `project:delete` e o
`manage_structure` do MCP (`disposeTerminalsForProjects`, via `afterProjectDeleted`).

## Onde aparece

- **Detalhe da tarefa** — botão **Terminal** (`TerminalTaskButton`) nas ações do cabeçalho e o
  campo **Diretório de trabalho** (ver [02-detalhe-da-tarefa.md](02-detalhe-da-tarefa.md)).
- **Detalhe do projeto** — botão `SquareTerminal` no cabeçalho, ao lado do `⋯`, só quando o projeto
  tem diretório (tooltip "Terminal em {diretório}"). Abre ou foca a sessão do projeto; com ela já em
  foco, esconde o painel (`TerminalProjectButton`, `aria-pressed`).
- **Sidebar** — item **Terminais** no rodapé, em todas as rotas, com o número de sessões abertas.
  Alterna o painel; fica desabilitado sem sessão.
- **Atalho** `Ctrl + '` (a tecla à esquerda do 1; no teclado US é `` Ctrl + ` ``). É local do
  renderer, não `globalShortcut`, e funciona mesmo com o foco dentro do terminal.
- **Configurações → Geral → Terminal** — shell (vazio = `$SHELL`, PowerShell no Windows) e o
  toggle **Iniciar o timer no primeiro comando**. Os dois ficam em `localStorage`
  (`terminal.shell`, `terminal.autoTimer`).

## Painel (`components/terminal/TerminalPanel.tsx`)

O painel é escuro nos dois temas: fica dentro de um `ConfigProvider` com `buildTheme('dark', densidade,
'ct-term-theme')`, então botões, tooltips, menus e a confirmação do antd saem escuros mesmo no tema
claro. As cores vêm de `TERMINAL` em `theme/semantic.ts` (tirada de `PALETTE.dark`: fundo `sider`
`#15141D`, texto e cursor `text`, metadado `text3`, destaque `primary`, mais as 16 cores ANSI do
xterm, todas com contraste AA sobre o fundo, testado em `contrast.test.ts`). As classes `ct-term-*`
de `main.css` leem essas cores por variáveis CSS postas no `<section>`. Fonte do xterm: Geist Mono
(`FONT_FAMILY_CODE`). O menu do botão direito é um `Dropdown` do antd (`trigger: contextMenu`) e a
confirmação de encerrar, um `Modal`.

```
┌──────────────────────────────────────────────────────────────────────┐ ← alça (arrastar)
│ ▣ ● Front (1)                                       +  ◫  ×  ⤢  ⌄ │
├───────────────────────────────┬──────────────────────┬───────────────┤
│ ~/repo $ npm run dev          │ ~/repo $ _           │ ┌ Front (1)   │
│ ...                           │                      │ └ Front (2)   │
│                               │                      │   API         │
└───────────────────────────────┴──────────────────────┴───────────────┘
```

Modelo do VS Code: os terminais vivem em **grupos**; um grupo é um ou mais terminais lado a lado.
As regras de grupo (criar, dividir, remover, separar, reiniciar no mesmo lugar, reconciliar com o
main) são puras, em `stores/terminalPanes.ts` (testadas).

- Irmão de `<main>` em `App.tsx`; empurra o conteúdo para cima. Altura arrastável entre 120px e
  70% da janela, guardada em `terminal.height`.
- **Cabeçalho**: ícone, ponto de atividade e nome do terminal focado. **Duplo clique** no nome (ou
  botão direito → **Renomear**) troca o nome: Enter salva, Esc cancela, vazio volta ao padrão;
  **Restaurar nome** no mesmo menu também. O nome padrão é o da task ou do projeto; várias sessões do mesmo dono
  ganham `(n)`. O nome vive na sessão, no main (`terminal:customize`, até 60 caracteres), sobrevive à
  navegação e ao **Reiniciar**, e morre com a sessão.
- Botões do cabeçalho: `+` abre outro terminal do dono focado (task ou projeto) num **grupo novo**; **Dividir**
  (`Columns2`) abre um terminal novo **no grupo focado**, à direita do focado; `×` encerra o
  terminal focado — pede confirmação se há processo rodando. Encerrar **não** desvincula o diretório
  do dono.
- **Lista à direita** (só com 2+ terminais): um item por terminal, na ordem dos grupos; terminais
  do mesmo grupo ficam ligados por `┌ ├ └`. O focado e os outros do grupo visível têm o fundo de hover da paleta;
  o focado com o texto mais claro. Cada item é focável (Enter ou Espaço foca o terminal). Clicar foca (e mostra o grupo); `×` aparece no hover; duplo clique
  renomeia. O menu do botão direito é o mesmo do cabeçalho (`TerminalSessionMenu.tsx`):
  Renomear, Restaurar nome, **Separar do grupo** (move o terminal para um grupo próprio logo depois),
  **Cor ▸** (a paleta `USER_COLORS`, ou "Sem cor": faixa de 2px à esquerda do item e cor do ícone)
  e **Ícone ▸** (um dos 12 do catálogo `shared/terminalTab.ts`). O main só aceita hex de 6 dígitos
  e ícone do catálogo (`normalizeTabColor`/`normalizeTabIcon`, testados). Ponto na cor de destaque = processo
  em foreground diferente do shell (consulta a cada 2s com o painel aberto). Riscado = processo
  encerrado; aí aparece **Reiniciar**, que troca a sessão no mesmo lugar do grupo.
- Grupo dividido: cada painel tem um cabeçalho fino com ícone e nome (borda na cor de destaque no focado).
  Clicar num painel foca o terminal. As divisórias arrastam; cada painel fica com pelo menos 10% do
  grupo. As proporções valem enquanto o app está aberto.
- `⤢` (ou `Ctrl + Shift + '`) põe o terminal em **tela cheia**: cobre a janela inteira, inclusive
  a TitleBar (`fixed inset-0`). O mesmo botão (`⤡`) restaura. Esconder o painel sai da tela cheia.
- `⌄` (ou o atalho) esconde o painel sem matar nada.
- **Um xterm por sessão, sempre montado**: trocar de terminal, esconder o painel ou ir para tela
  cheia só esconde (`display: none`) os que não aparecem. Ao reaparecer, o xterm refaz o fit e se
  redesenha. Desmontar e reexibir a saída gravada quebrava TUIs como o Claude Code (tela
  alternativa, cursor posicionado). A reexibição dos ~200 KB guardados no main só acontece quando o
  renderer monta do zero (abrir o app com sessões vivas, recarregar a janela).

## Comportamento que não aparece no JSX

- Cada `TerminalView` fica dentro de um `RegionBoundary` ("terminal", com fundo de superfície no
  fallback): se o xterm quebra, só aquela sessão mostra "Esta área falhou"; "Tentar de novo"
  remonta a view, que repõe o buffer da sessão.

- As sessões vivem no **main** (`src/main/terminal.ts` + `terminalSessions.ts`) e sobrevivem à
  navegação e ao fechar a janela (que só esconde para o tray). Morrem ao **Sair** do app e quando
  a task ou o projeto dono é apagado (inclusive pelo MCP).
- **Shift + Enter** envia `ESC + CR` (o "Alt+Enter" dos terminais) em vez do CR puro que o xterm
  manda nas duas teclas. Claude Code e outras TUIs entendem como nova linha sem enviar; no zsh é o
  `self-insert-unmeta` (quebra a linha no buffer). Regra pura em `terminalKeys.ts` (testada).
- O primeiro Enter de cada sessão de task inicia o timer da task se ele não estiver rodando e o toggle
  estiver ligado (sessão de projeto não tem timer); a notificação (`notification` do antd) oferece **Parar**.
- Diretório que deixou de existir ou shell configurado inválido viram toast; o shell inválido cai
  no padrão do sistema.
