# Terminal embutido

Painel de terminal no rodapé da janela principal, por task, no estilo do VS Code. Cada task pode
ter um **diretório de trabalho** (`tasks.working_dir`) e um **comando inicial**
(`tasks.start_command`); o terminal abre nessa pasta e digita o comando.

O projeto também pode ter um diretório (`projects.working_dir`, editado no detalhe do projeto). A
task sem diretório próprio **herda** o do projeto: o campo mostra o caminho com a etiqueta *do
projeto*, e **Alterar** grava um diretório só da task. Com diretório próprio e projeto com
diretório, o botão `↶` limpa o da task e volta a herdar. A regra é `effectiveWorkingDir`
(`shared/workingDir.ts`, testada), usada no renderer e no `terminal:create`. O comando inicial
continua sendo só da task.

## Onde aparece

- **Detalhe da tarefa** — botão laranja **Terminal** ao lado de **Notas** e o campo
  **Diretório de trabalho** na coluna esquerda (ver [02-detalhe-da-tarefa.md](02-detalhe-da-tarefa.md)).
- **TitleBar** — botão laranja com o número de terminais abertos, em **todas** as rotas, só quando
  há pelo menos uma sessão. Alterna o painel.
- **Atalho** `Ctrl + '` (a tecla à esquerda do 1; no teclado US é `` Ctrl + ` ``). É local do
  renderer, não `globalShortcut`, e funciona mesmo com o foco dentro do terminal.
- **Configurações → Geral → Terminal** — shell (vazio = `$SHELL`, PowerShell no Windows) e o
  toggle **Iniciar o timer no primeiro comando**. Os dois ficam em `localStorage`
  (`terminal.shell`, `terminal.autoTimer`).

## Painel (`components/terminal/TerminalPanel.tsx`)

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
  **Restaurar nome** no mesmo menu também. O nome padrão é o da task; várias sessões da mesma task
  ganham `(n)`. O nome vive na sessão, no main (`terminal:customize`, até 60 caracteres), sobrevive à
  navegação e ao **Reiniciar**, e morre com a sessão.
- Botões do cabeçalho: `+` abre outro terminal da task focada num **grupo novo**; **Dividir**
  (`Columns2`) abre um terminal novo **no grupo focado**, à direita do focado; `×` encerra o
  terminal focado — pede confirmação se há processo rodando. Encerrar **não** desvincula o diretório
  da task.
- **Lista à direita** (só com 2+ terminais): um item por terminal, na ordem dos grupos; terminais
  do mesmo grupo ficam ligados por `┌ ├ └`. O focado tem fundo `slate-800`, os outros do grupo
  visível um fundo mais leve. Clicar foca (e mostra o grupo); `×` aparece no hover; duplo clique
  renomeia. O menu do botão direito é o mesmo do cabeçalho (`TerminalSessionMenu.tsx`):
  Renomear, Restaurar nome, **Separar do grupo** (move o terminal para um grupo próprio logo depois),
  **Cor ▸** (a paleta `DEFAULT_COLORS`, ou "Sem cor": faixa de 2px à esquerda do item e cor do ícone)
  e **Ícone ▸** (um dos 12 do catálogo `shared/terminalTab.ts`). O main só aceita hex de 6 dígitos
  e ícone do catálogo (`normalizeTabColor`/`normalizeTabIcon`, testados). Ponto laranja = processo
  em foreground diferente do shell (consulta a cada 2s com o painel aberto). Riscado = processo
  encerrado; aí aparece **Reiniciar**, que troca a sessão no mesmo lugar do grupo.
- Grupo dividido: cada painel tem um cabeçalho fino com ícone e nome (borda laranja no focado).
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

- As sessões vivem no **main** (`src/main/terminal.ts` + `terminalSessions.ts`) e sobrevivem à
  navegação e ao fechar a janela (que só esconde para o tray). Morrem ao **Sair** do app e quando
  a task é apagada (inclusive pelo MCP).
- **Shift + Enter** envia `ESC + CR` (o "Alt+Enter" dos terminais) em vez do CR puro que o xterm
  manda nas duas teclas. Claude Code e outras TUIs entendem como nova linha sem enviar; no zsh é o
  `self-insert-unmeta` (quebra a linha no buffer). Regra pura em `terminalKeys.ts` (testada).
- O primeiro Enter de cada sessão inicia o timer da task se ele não estiver rodando e o toggle
  estiver ligado; o toast oferece **Parar**.
- Diretório que deixou de existir ou shell configurado inválido viram toast; o shell inválido cai
  no padrão do sistema.
