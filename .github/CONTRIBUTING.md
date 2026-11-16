# Guia de contribuição

Obrigado por querer contribuir com o CrafyTask.

## Ambiente

```bash
git clone https://github.com/uesleinasch/crafytask.git
cd crafytask
npm install   # instala dependências e ativa os hooks de .githooks/
npm run dev
```

Antes de abrir o PR: `npm run typecheck && npm run test`. Mexeu na documentação? Rode
`uvx --with mkdocs-material mkdocs build --strict -d /tmp/site`.

## Branches

- `production` é a branch padrão: todo trabalho sai dela e volta para ela por PR (squash).
- `main` recebe só `production`, depois de cada release.
- Nomes seguem [Conventional Branch](https://conventionalbranch.org): `feature/<descricao>`,
  `bugfix/<descricao>`, `hotfix/<descricao>`, `chore/<descricao>`, `release/vX.Y.Z` — minúsculas,
  números e hífens.

## Commits e PRs

- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/): `<tipo>(escopo)!: descrição`,
  imperativa, minúscula, sem ponto final. Tipos: feat, fix, perf, refactor, docs, test, build, ci,
  style, chore, revert.
- O título do PR vira o commit em `production` e segue o mesmo formato.
- Não inclua trailers de coautoria de ferramentas de IA (`Co-Authored-By: Claude…` e similares),
  nem em commits nem na descrição do PR. O hook `commit-msg`, o `pre-push` e o CI recusam.

## Releases

Cada versão tem uma página em `docs/releases/vX.Y.Z.md`, que vira o corpo da GitHub Release. O
passo a passo está no [CLAUDE.md](../CLAUDE.md) (seção "Fluxo de release").
