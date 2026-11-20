# Como contribuir

Contribuições são bem-vindas: correções, melhorias de documentação e novas funcionalidades.
Para mudanças grandes, abra uma [issue](https://github.com/uesleinasch/crafytask/issues) antes,
para combinar a abordagem.

## Preparar o ambiente

```bash
git clone https://github.com/uesleinasch/crafytask.git
cd crafytask
npm install
npm run dev
```

O `npm install` roda o script `prepare`, que aponta o git para os hooks de `.githooks/`
(`git config core.hooksPath .githooks`). Eles validam o nome da branch e a mensagem de commit antes
de você chegar ao PR. Veja [Fluxo git](fluxo-git.md).

O dev usa uma pasta de dados separada (`~/.config/ticktask-dev/`), então não mexe no seu app
instalado. Detalhes em [Scripts npm](../comandos/scripts-npm.md).

## Antes de abrir o PR

```bash
npm run typecheck
npm run lint
npm run test
```

A CI roda typecheck, testes e `mkdocs build --strict` em todo PR. Se você mexeu numa tela, confira
no app de verdade — testes verdes no jsdom não garantem o comportamento no navegador.

## Convenções de código

- Mude só o que a tarefa pede; prefira código simples a esperto.
- Comentário só para restrição que o código não consegue mostrar (acoplamento com outro arquivo,
  comportamento não óbvio de biblioteca, decisão de segurança).
- Páginas em `*Page.tsx`, hooks em `useX.ts`, stores em `xStore.ts`. Componentes de interface vêm do
  Ant Design, com ícones lucide; cores só de token (`src/renderer/src/theme/`), nunca classe de cor do
  Tailwind nem hex solto.
- Textos da interface em português.
- Antes de inventar cor, raio ou espaçamento, consulte os
  [design tokens](../ui/14-design-tokens.md), que mostram onde cada um mora em `theme/`; as regras estão no [guia de design](../design/guia-de-design.md).
- Antes de mexer numa tela, leia o documento dela no [Mapa da interface](../ui/README.md).
- Lógica nova que dependa de `electron` ou `better-sqlite3`: extraia a parte pura para um módulo
  ao lado e teste esse módulo.
- Não rode `prettier --write` em arquivos legados inteiros; formate só o que você criou.

## Documentação

Este site é feito com [MkDocs Material](https://squidfunk.github.io/mkdocs-material/) a partir da
pasta `docs/` e publicado no GitHub Pages a cada push em `production`. Para ver localmente:

```bash
pip install -r requirements-docs.txt
mkdocs serve
```

Ou, sem instalar nada globalmente, com o [uv](https://docs.astral.sh/uv/):

```bash
uvx --with mkdocs-material mkdocs serve
```

O build da CI usa `--strict`: link quebrado vira erro. Links para arquivos fora de `docs/` devem ser
absolutos (`https://github.com/uesleinasch/crafytask/blob/production/<caminho>`).
