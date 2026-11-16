# Fluxo git

## Branches fixas

| Branch | Papel |
| --- | --- |
| `production` | branch **padrão**. Todo trabalho sai dela e volta para ela por PR. É de onde as versões são publicadas. |
| `main` | **espelho estável**: atualizada só depois de cada release, por PR `production` → `main`. |

Nunca se commita direto em nenhuma das duas (o hook `pre-commit` recusa).

## Branches de trabalho

Os nomes seguem o [Conventional Branch](https://conventionalbranch.org):

| Prefixo | Para quê | Exemplo |
| --- | --- | --- |
| `feature/` | funcionalidade nova | `feature/export-csv` |
| `bugfix/` | correção | `bugfix/timer-float-congela` |
| `hotfix/` | correção urgente | `hotfix/crash-ao-abrir` |
| `chore/` | manutenção, dependências, build | `chore/atualiza-electron` |
| `release/` | preparação de uma versão | `release/v3.15.0` |

Regras: só minúsculas, números e hífens; ponto só na versão do `release/vX.Y.Z`. Os aliases
`feat/` e `fix/` também são aceitos.

## Commits

[Conventional Commits 1.0.0](https://www.conventionalcommits.org/pt-br/v1.0.0/):

```
<tipo>(escopo)!: descrição no imperativo, minúscula, sem ponto final
```

Tipos: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `style`, `chore`,
`revert`. Exemplos:

```
feat(tasks): adiciona menu de contexto nas tarefas da lista
fix(timer): para o float quando a janela principal fecha
docs(releases): adiciona a página da v3.15.0
```

Mensagens de commit **não** podem ter trailer de coautoria de IA (`Co-Authored-By: Claude…`,
Copilot, etc.) nem assinatura de ferramenta de IA.

## Pull requests

1. Crie a branch a partir de `production` atualizada:

    ```bash
    git switch production && git pull
    git switch -c feature/minha-mudanca
    ```

2. Commits granulares, no formato acima.
3. Abra o PR para **`production`**. O título do PR vira o commit (merge **squash**), então segue o
   mesmo formato de Conventional Commits.
4. A CI valida branch de origem × destino, título, ausência de trailer de IA, typecheck, testes e
   o build da documentação.

PRs para `main` só são aceitos vindos de `production`.

## Hooks locais

Os hooks em `.githooks/` são ativados pelo `npm install` (script `prepare`, que roda
`git config core.hooksPath .githooks`):

| Hook | Verifica |
| --- | --- |
| `pre-commit` | não deixa commitar em `production`/`main`; valida o nome da branch |
| `commit-msg` | título em Conventional Commits; recusa trailer de coautoria e assinatura de IA |
| `pre-push` | valida o nome da branch de destino e recusa commits com trailer de IA |

## Publicar uma versão

1. **Branch de release** a partir de `production`:

    ```bash
    git switch production && git pull
    git switch -c release/v3.16.0
    ```

2. Crie a página da versão em `docs/releases/v3.16.0.md` (use a da versão anterior como modelo) e
   adicione-a no topo de `docs/releases/index.md` e no `nav` do `mkdocs.yml`. Não mexa no
   `version` do `package.json`: a versão vem da tag.
3. PR de `release/v3.16.0` para `production` (squash).
4. Com o PR integrado, crie a **tag anotada** no HEAD de `production` e envie:

    ```bash
    git switch production && git pull
    git tag -a v3.16.0 -m "v3.16.0"
    git push origin v3.16.0
    ```

5. A tag dispara o workflow de release, que:
    - confere que a tag é anotada, está em `production` e que existe `docs/releases/v3.16.0.md`;
    - roda a CI;
    - gera o `.deb` e o AppImage;
    - publica a GitHub Release com título `v3.16.0`, usando a página da versão como texto, mais a
      tabela de downloads e o changelog dos commits.

6. Por fim, PR de `production` para `main` (merge **commit**, não squash), para o espelho estável
   acompanhar a versão publicada.

A documentação é republicada no GitHub Pages a cada push em `production` que mexa em `docs/` ou no
`mkdocs.yml`.
