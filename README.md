# CrafyTask

[![CI](https://github.com/uesleinasch/crafytask/actions/workflows/ci.yml/badge.svg?branch=production)](https://github.com/uesleinasch/crafytask/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/uesleinasch/crafytask?label=release&color=705EFF)](https://github.com/uesleinasch/crafytask/releases/latest)
[![Docs](https://img.shields.io/badge/docs-MkDocs-705EFF)](https://uesleinasch.github.io/crafytask/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

CrafyTask (antigo TickTask) é um app desktop para Linux de tarefas e controle de tempo no estilo
GTD (Getting Things Done). É local-first: tudo fica num banco SQLite na sua máquina, e as
integrações são opcionais.

**Documentação completa:** https://uesleinasch.github.io/crafytask/

## Funcionalidades

- **GTD completo**: inbox, próximas ações, aguardando, algum dia, contextos, projetos, áreas,
  metas/horizontes e revisão semanal guiada.
- **Tempo**: timer por tarefa (vários ao mesmo tempo), timer flutuante, time blocks no calendário e
  relatórios.
- **Tarefas ricas**: subtarefas, dependências, recorrência, tags, prazos com hora, notas em editor
  rico (tabelas, imagens, menções `@`) e um desenho Excalidraw por tarefa.
- **Cadernos**: caderno → seção → página, com as mesmas notas e desenhos.
- **Terminal embutido** por tarefa, com pasta de trabalho e comando inicial.
- **Integrações**: Notion, Google Calendar, Jira Cloud e servidor MCP para assistentes como o
  Claude Code.
- **Captura rápida** global (`Ctrl+Shift+Espaço`), bandeja do sistema, início com o sistema e
  backup/restauração.

## Instalação

Baixe o pacote da [última release](https://github.com/uesleinasch/crafytask/releases/latest):

```bash
# Debian / Ubuntu
sudo apt install ./crafytask-<versão>.deb

# Qualquer distribuição
chmod +x crafytask-<versão>.AppImage
./crafytask-<versão>.AppImage
```

Quem já usa o TickTask pode instalar por cima: o pacote faz upgrade e os dados continuam na mesma
pasta (`~/.config/TickTask App`). Detalhes, inclusive o perfil AppArmor do Ubuntu 24.04+, na
[documentação](https://uesleinasch.github.io/crafytask/).

## Desenvolvimento

Requer Node.js 22 e as ferramentas de build do `node-gyp` (Python 3.11, `make`, `g++`).

```bash
git clone https://github.com/uesleinasch/crafytask.git
cd crafytask
npm install          # também ativa os git hooks de .githooks/
npm run dev          # app com hot reload, numa pasta de dados separada (~/.config/ticktask-dev)
npm run test         # vitest
npm run typecheck
npm run build:linux  # gera .deb e AppImage em dist/
```

Documentação local: `uvx --with mkdocs-material mkdocs serve`.

Arquitetura, convenções e fluxo de trabalho: [CLAUDE.md](CLAUDE.md) e
[guia de contribuição](.github/CONTRIBUTING.md).

## Fluxo de contribuição (resumo)

- Branches saem de `production` e seguem [Conventional Branch](https://conventionalbranch.org):
  `feature/…`, `bugfix/…`, `hotfix/…`, `chore/…`, `release/vX.Y.Z`.
- Commits e títulos de PR em [Conventional Commits](https://www.conventionalcommits.org/).
- PR para `production` (squash). Releases saem de tags `vX.Y.Z` em `production`; depois,
  `production` é levada para `main` por PR.
- Trailers de coautoria de IA não são aceitos (hooks e CI recusam).

## Licença

[MIT](LICENSE).
