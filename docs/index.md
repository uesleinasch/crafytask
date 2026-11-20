# CrafyTask

**Tarefas e controle de tempo no estilo GTD, local-first, para Linux.**

CrafyTask é um aplicativo desktop (Electron) para organizar trabalho pessoal e profissional com o
método **GTD** (*Getting Things Done*) e medir o tempo gasto em cada tarefa. Tudo fica num banco
SQLite no seu computador; as integrações com Notion, Google Calendar, Jira e assistentes de IA via
MCP são opcionais.

[Instalar](instalacao.md){ .md-button .md-button--primary }
[Ver releases](releases/index.md){ .md-button }

!!! note "CrafyTask é o novo nome do TickTask"
    A partir da [v3.15.0](releases/v3.15.0.md) o app se chama CrafyTask. A mudança é só visual:
    a pasta de dados, o banco e os identificadores técnicos continuam com o nome antigo, então quem
    atualiza do TickTask mantém tudo. Veja [Instalação](instalacao.md#atualizar-a-partir-do-ticktask).

## Destaques

- **GTD completo** — Inbox, próximas ações, aguardando, someday/maybe, contextos (`@computador`,
  `@telefone`…), projetos com resultado desejado, áreas de foco, metas e os seis horizontes de
  perspectiva.
- **Captura rápida de qualquer lugar** — `Ctrl + Shift + Space` (ou o atalho que você escolher em
  Configurações → Geral) abre uma janelinha que joga o
  pensamento direto no Inbox.
- **Timer por tarefa** — vários cronômetros ao mesmo tempo, sessões registradas, limite de tempo
  com alerta, timer flutuante sempre no topo quando a janela está minimizada.
- **Planejamento** — plano do dia, visão da semana, calendário com *time blocking* e arraste para
  reagendar, horários de início/fim e prazos com notificação.
- **Revisão semanal guiada** — checklist de 8 passos com indicadores de saúde do sistema e
  histórico.
- **Notas ricas e desenho por tarefa** — editor com comando `/`, menções `@`, tabelas e imagens;
  um quadro Excalidraw em cada tarefa.
- **Cadernos** — anotações livres em Caderno → Seção → Página, no estilo OneNote.
- **Terminal embutido** — cada tarefa pode ter pasta de trabalho e comando inicial; abas, divisão
  lado a lado e timer que começa no primeiro comando.
- **Integrações** — [Notion](integracoes/notion.md), [Google Calendar](integracoes/google-calendar.md),
  [Jira](integracoes/jira.md) e um [servidor MCP](integracoes/mcp.md) para Claude Code e outros
  clientes.
- **Seus dados, no seu disco** — SQLite local, backup e restauração pela interface ou por
  [script](comandos/backup.md).

## Por onde começar

| Quero… | Vá para |
| --- | --- |
| Instalar o app | [Instalação](instalacao.md) |
| Entender como usar o GTD no app | [Fluxo GTD no CrafyTask](guias/fluxo-gtd.md) |
| Medir tempo | [Timer e controle de tempo](guias/timer.md) |
| Ligar Notion, Google, Jira ou um assistente de IA | [Integrações](integracoes/index.md) |
| Saber o que mudou | [Releases](releases/index.md) |
| Rodar o código ou contribuir | [Desenvolvimento](desenvolvimento/index.md) |

## Plataforma

CrafyTask é distribuído para **Linux**, em dois formatos: pacote **`.deb`** (Debian, Ubuntu e
derivados) e **AppImage** (qualquer distribuição). Os instaladores ficam na página de
[releases do GitHub](https://github.com/uesleinasch/crafytask/releases).

O código é aberto, sob licença MIT:
[github.com/uesleinasch/crafytask](https://github.com/uesleinasch/crafytask).
