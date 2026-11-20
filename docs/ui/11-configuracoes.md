# Configurações — `/settings`

`src/renderer/src/pages/SettingsPage.tsx` (navegação, cabeçalho e conteúdo) + uma seção por
arquivo em `src/renderer/src/components/settings/`. Desenho no guia (§8 "Configurações") e no
protótipo (rota `#ajustes`).

## Função

Preferências do app e as integrações (Notion, Google Calendar, Jira, servidor MCP). Acessível pelo
item **Configurações** no rodapé da sidebar.

## Estrutura

```
┌ [Buscar configuração]  ┬ [▣] Título  (● estado)                         ┐
│ APLICATIVO             │ frase do que a seção faz                       │
│ ⚙ Geral                │ ┌ Card "Inicialização" ───────────────────┐    │
│ ▣ Terminal             │ │ Título da linha          [Switch]       │    │
│ ▤ Backup               │ │ descrição curta                         │    │
│ INTEGRAÇÕES            │ ├─────────────────────────────────────────┤    │
│ 📖 Notion            ● │ │ ...                                     │    │
│ 📅 Google Calendar   ● │ └─────────────────────────────────────────┘    │
│ 🔌 Jira              ● │                                    até 780px  │
│ ⎓ Servidor MCP       ● │                                                │
│ ⓘ Sobre                │                                                │
└────────────────────────┴────────────────────────────────────────────────┘
```

- **Navegação** de 232px, fixa ao rolar: `Input` "Buscar configuração" (filtra por nome e
  palavras-chave, como "worklog" ou "porta") e `Menu` agrupado em **Aplicativo**, **Integrações**
  e Sobre. Integração leva um `Badge` de estado (conectado/rodando, desligado, falha), com o texto no
  tooltip. Abaixo de `md` a navegação vira um `Select` agrupado.
- A seção aberta persiste em `localStorage` (`settings.section`, via `usePersistedState`).
- **Cabeçalho da seção** (`SettingsHeader`): ícone em quadrado `colorPrimaryBg`, título, `Tag` com o
  ponto do `Badge` (integrações) e uma frase do que a seção faz.
- **Conteúdo** com largura máxima de 780px, dentro do `PageContainer` e de um `RegionBoundary` por
  seção. Enquanto os estados carregam (`notionGetConfig`, `gcalGetStatus`, `jiraGetStatus`,
  `mcpGetStatus`, `appGetAutostart` em paralelo), aparece um `Spin`; a navegação já está lá.
- A página é dona dos estados e os repassa às seções com um callback de mudança. Por isso o ponto
  na navegação muda no mesmo instante em que a seção conecta ou desliga algo.

## Peças compartilhadas (`components/settings/`)

| Peça | Papel |
| --- | --- |
| `SettingsCard` | `Card` pequeno com título, que agrupa linhas relacionadas ("Inicialização", "Servidor") |
| `SettingRow` | título e descrição à esquerda, controle à direita (`Switch`, `Input`, botão); quebra para baixo quando falta espaço; `vertical` põe o controle embaixo |
| `SettingsHeader` | cabeçalho da seção, descrito acima |
| `Kbd` / `KeyCombo` (`components/shell/Kbd.tsx`) | teclas em `<kbd>` mono com borda (guia §11) |
| `SetupGuide`, `GuideLink`, `GuideField` (`SetupGuide.tsx`) | guia de configuração das integrações, descrito abaixo; link externo com ícone e rótulo de campo dentro do passo |
| `settingsStatus.ts` | puro e testado: estado de cada integração, `STATUS_BADGE`, tipo `NotionConfig`, `errorMessage` (tira o prefixo `Error invoking remote method…`) |

### `SetupGuide`

`Steps` vertical do antd. Cada passo é **manual** (botão "Marcar como feito" / "Desmarcar"; os ids
ficam no `localStorage` sob a chave da seção) ou **automático** (`autoDone`, derivado do estado
real — ex.: credenciais salvas, conta conectada). O **primeiro passo não feito** é o atual
(`process`); os feitos ficam `finish`. O conteúdo de todos os passos fica aberto, com os campos
dentro do passo (largura até 420px). Avisos são `Alert` (`warning`/`info`). Lógica em
`stepProgress.ts` (pura, testada).

Sem a integração conectada, o guia fica num card "Configurar a conexão". Conectada, ele vai para um
`Collapse` fechado abaixo dos cards, para trocar credenciais. Mensagens de resultado usam
`App.useApp().message`; ações destrutivas (limpar, desconectar) passam por `Popconfirm` que diz o
que sai do CrafyTask e o que continua no serviço.

## Seções

### Geral

- Card **Inicialização**: `Switch` "Iniciar o CrafyTask com o sistema". Se o sistema recusar, aviso
  de erro; senão, aviso de confirmação.
- Card **Janela e bandeja**: "Fechar a janela não encerra o app" (`Tag` "Comportamento fixo") e
  "Captura rápida" com o atalho em `KeyCombo` (`Ctrl` ou `⌘` conforme a plataforma), só
  informativo.

### Terminal

Card **Terminal embutido**: shell (`Input` mono, salva ao sair do campo ou no Enter; vazio usa o
`$SHELL`), `Switch` "Iniciar o timer no primeiro comando" e o atalho do painel (`Ctrl` + `'`).
Valores em `localStorage` (`lib/terminalPrefs.ts`).

### Backup

`BackupSection.tsx` carrega o próprio estado (`backupGetStatus`); a página não o conhece.

- Card **Pasta de backup**: a pasta em mono, **Escolher pasta / Trocar** (diálogo do sistema) e
  **Fazer backup agora** (desabilitado sem pasta). A pasta fica em `userData/backup-config.json`.
- O backup cria um snapshot `AAAA-MM-DD_HHMMSS/` na pasta: `ticktask.db` copiado com `db.backup()`
  (consistente com o app aberto, já inclui o WAL), `notes-assets/`, `drawings/`,
  `notion-config.json`, `mcp-config.json` e um `MANIFEST.txt` com as contagens e o sha256 de cada
  arquivo. O snapshot é montado em `.partial` e só ganha o nome final quando termina.
- Card **Backups nesta pasta**: `Table` do mais recente para o mais antigo (criado em, tarefas,
  projetos, tamanho, **Restaurar**). **Restaurar de outra pasta…** no cabeçalho do card aceita
  qualquer pasta com `ticktask.db`.
- Restaurar sempre passa por `backup:inspect` (abre o banco só leitura e roda `integrity_check`) e
  por um `modal.confirm` com as contagens, dizendo o que acontece (dados atuais para pre-restore,
  reinício) e o que não volta (conexão com o Google). Confirmado, o main para o MCP e o agendador,
  fecha o banco, move os dados atuais para `userData/pre-restore-<carimbo>/`, copia o snapshot e
  reinicia com `app.relaunch()` (sem `--hidden`). Se a cópia falhar, os dados antigos voltam.
- `Alert`s: o que vai no backup e o aviso de que ele contém a API Key do Notion e o token do MCP.
- O token do Google não entra: ele é cifrado pelo keyring do sistema e não abre em outra máquina.
- O mesmo formato é lido e gerado por `scripts/ticktask-backup.sh` (`backup`, `list`,
  `restore`), que funciona sem o app.

### Notion

- **Sem banco criado** → `SetupGuide` (`settings.notion.steps`):
  1. Criar a integração (link para `notion.so/my-integrations`).
  2. API Key + **Testar conexão** (salva antes de testar). Automático: feito quando há chave salva e
     o teste passou ou o banco já existe.
  3. Conectar a integração a uma página (⋯ → Conexões → Adicionar conexões) + aviso de que ela só
     enxerga páginas conectadas.
  4. Page ID opcional + **Criar banco GTD APP**. Automático: feito quando há `databaseId`.
- **Com banco** → card **Banco conectado**: id do banco em mono, última sincronização e **Abrir no
  Notion** (`app:openExternal`); `Switch` de auto-sync (salva na hora); **Sincronizar agora**;
  **Limpar** (com `Popconfirm` — só apaga o `notion-config.json`, nada no Notion). Abaixo, o
  `Collapse` "Guia de configuração e troca da API key" com os mesmos passos.
- Os antigos blocos azul/âmbar de ajuda no pé da página viraram o passo 3.

### Google Calendar

- **Não conectado** → `SetupGuide` (`settings.gcal.steps`) com o guia do Google Cloud embutido:
  1. Criar projeto · 2. Ativar a Calendar API · 3. Branding (com aviso: **não enviar logo**, exige
  verificação) · 4. Audience → Publish app (aviso: em Testing o acesso expira em 7 dias) ·
  5. Client "Desktop app" — os campos **Client ID** e **Client Secret** ficam dentro deste passo,
  com "Salvar credenciais" quando editados (automático: credenciais salvas) · 6. **Conectar com o
  Google** (automático: conectado), com a instrução Avançado → Acessar CrafyTask.
- **Conectado** → card **Agenda TickTask**: `Switch` de auto-sync, **Ressincronizar**,
  **Desconectar** (com `Popconfirm`: a agenda "TickTask", os eventos e as tarefas continuam) e o
  `Collapse` "Guia de configuração e troca de credenciais".
- O secret nunca volta ao renderer: o campo mostra `•••••••• (salvo)`.

### Jira

- Cards: **Conta** (site, e-mail, token e **Desconectar**), **Boards** (só conectado), **Destino das
  tasks importadas** e **Opções**. Desconectar passa por `Popconfirm`: saem site, e-mail, token e
  boards; as tasks importadas e as issues continuam.
- Autenticação por **site Jira Cloud + e-mail + API token** (Basic auth). O token vai para o
  `safeStorage`; o campo mostra `•••••••• (salvo)` e nunca volta ao renderer. Trocar site ou e-mail
  exige um token novo. "Salvar e testar" valida com `/myself`.
- **Boards**: "Carregar boards" (no cabeçalho do card) lista os boards do site agrupados por espaço (nome + chave; boards
  sem espaço, como os de usuário, vão para "Sem espaço" no fim); checkboxes escolhem quais
  alimentam o app.
- **Importar agora**: traz as issues atribuídas a você nos boards marcados (abertas, ou concluídas
  nos últimos 30 dias) e mostra a contagem. Issue já concluída não vira task nova. Em
  re-importação atualiza nome e link; o prazo só quando a issue tem um (prazo local não é apagado).
- **Status separados**: a task guarda o status do Jira em `tasks.jira_status`, à parte do status
  local. A importação só atualiza o status Jira; mover a task no CrafyTask não mexe no Jira. O status
  no Jira muda pelo seletor "Jira" do card, da tabela e do detalhe.
- **Descrição**: a descrição da issue entra nas notas da task, e editar as notas atualiza a
  descrição no Jira.
- Excluir uma task importada não impede que ela volte na próxima importação; para tirá-la da
  frente, arquive.
- **Projeto por espaço**: "Projeto padrão" e uma linha por espaço conhecido (dos boards marcados e
  das issues já importadas, chave em mono), numa `Table` com um `Select` de projeto por linha. Task nova vai
  para o projeto do espaço, senão para o padrão; task já vinculada **sem projeto** recebe o do espaço
  na importação, mas uma task movida para outro projeto não é tocada. Mapeamento para projeto
  apagado é ignorado. Fica em `jira-config.json` (`spaceProjects`, chave do espaço → id).
- **Status inicial das tasks novas**: `Table` com os status vistos na última importação e um
  `Select` de status local (`StatusChip`) por linha. Só vale
  quando a importação cria a task. "Padrão da categoria" usa a categoria Jira (A fazer → Inbox, Em
  andamento → Executando, Concluído → Finalizada); uma escolha explícita vence.
- **Importação automática** (card Boards): 15 min / 30 min / 1 h (só roda com board escolhido).
- **Opções**: "Registrar o tempo no Jira (worklog)" e "Sincronizar tasks do Jira com o Notion"
  (opt-in: tasks do Jira só vão ao Notion se ligado, inclusive no sync em lote e no ressync após
  mudança de tag).
- **Worklog** (opt-in): ligar grava `worklogSince` (agora) em `jira-config.json`. A partir daí, cada
  sessão encerrada de 1 min ou mais (play/pause ou tempo manual) em task vinculada vira um worklog
  na issue (`adjustEstimate=auto`), e o id volta para `time_entries.jira_worklog_id`. Tempo anterior
  a ligar nunca é enviado. "Zerar" o timer apaga no Jira os worklogs que o app criou. Ajustar o
  total direto ("definir tempo total") não gera worklog — não há sessão para enviar.

### Servidor MCP

- Card **Servidor**: `Switch` com o estado na descrição: "Desligado", `Rodando em 127.0.0.1:{porta}`
  ou a falha na porta (texto de erro).
- Card **Registrar no Claude Code**: o comando num bloco mono copiável (`Typography.Paragraph
  copyable`) e a dica para remover o registro antigo `ticktask`. O comando registra a **ponte
  stdio** (`mcp-bridge`), que lê o token de `mcp-config.json` a cada mensagem: ele não contém o
  token e continua valendo depois de regenerar.
- **Regenerar** (perigo) pede confirmação dizendo o que acontece (o token atual deixa de valer e
  param os clientes configurados à mão por HTTP com ele) e o que não acontece (a ponte registrada
  continua, as tarefas não mudam).
- Falhas ao ler o estado de uma integração não derrubam a página: a seção mostra um `Alert` de erro e
  a navegação, o ponto vermelho "Erro ao ler". Enquanto carrega, nenhum ponto aparece.

### Sobre

Card **Versões** (`Descriptions`): CrafyTask (`app:getVersion`), Electron, Chromium e Node
(`window.electron.process.versions`) em mono, e o link da documentação (abre no navegador).

## O que falta

- A seção **Aparência** (tema e densidade) entra na F7-d3.
- Nenhuma configuração de **comportamento**: jornada de trabalho (fixa em 8h no plano do dia),
  limiares de time leak (1h/30min/0), janela da grade do calendário (dia inteiro,
  00:00–24:00), intervalo do auto-sync de notas (60s), atalho global (fixo).
- Backup só manual: não há backup automático periódico nem limpeza de snapshots antigos.
