# Cadernos

Rota `/notebooks` (`pages/NotebooksPage.tsx`). Anotações livres no molde do OneNote:
**Caderno → Seção → Página**, com até 2 níveis de subpágina. Cada página tem as mesmas abas
**Notas** (Tiptap) e **Desenho** (Excalidraw) do detalhe da tarefa. Decisões de modelo em
[`docs/adr/0001-cadernos.md`](../adr/0001-cadernos.md).

Entrada: item **Cadernos** (`NotebookTabs`) da sidebar, no grupo Conhecimento. Desenho no guia
(`docs/design/guia-de-design.md` §8 "Cadernos") e no protótipo (rota `#cadernos`).

## Layout

Altura total (`.ct-nb` em `main.css`): as colunas rolam por dentro, a página não.

```
┌──────────────┬──────────────────────────────────────────────────────────────┐
│ [Buscar…   ] │ [● Geral] [● Reuniões] [+]                          [⋯]      │ ← SectionTabs
│ CADERNOS     │ ┌ PÁGINAS  + Nova ┐ ┌ Título da página ──────────────────┐   │
│ ▤ Trabalho ⋯ │ │ ▾ Página 1      │ │ criada 10/11/2026 14:02 · editada … │   │
│ ▤ Pessoal    │ │   ├ Subpágina   │ │ Notas  Desenho          ⤓  ⟳  ⤢    │   │
│              │ │ Página 2        │ │ (Tiptap ou Excalidraw)              │   │
│ + Novo cad.  │ └─────────────────┘ └─────────────────────────────────────┘   │
└──────────────┴──────────────────────────────────────────────────────────────┘
  NotebookList        PageTree               PageEditor (TaskWorkspace)
```

| Região             | Componente                   | Comportamento                                                                                                                 |
| ------------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Coluna de cadernos | `notebooks/NotebookList.tsx` | A partir de `lg`. Busca (`PageSearch`), `Menu` dos cadernos, `⋯` no hover e no botão direito, arrastar reordena, Novo caderno |
| Barra estreita     | `NotebookSelect`             | Abaixo de `lg`: `Select` do caderno (Novo caderno no fim da lista), `⋯` e a busca; abaixo de `md`, botão **Páginas**          |
| Abas de seção      | `notebooks/SectionTabs.tsx`  | `Tabs` `editable-card`: ponto na cor, `+` cria, `⋯` da aba ativa e botão direito, arrastar reordena, aceita página solta      |
| Páginas            | `notebooks/PageTree.tsx`     | `Tree` com linhas-guia, subpáginas recolhíveis e arrastar; card de 280px, ou `Drawer` abaixo de `md`                          |
| Editor             | `notebooks/PageEditor.tsx`   | Título (autosave 500 ms), datas e o `TaskWorkspace` da tarefa (abas, ações, Modo foco) com dono `{ kind: 'page' }`            |

Menu do caderno: Sincronizar com o Notion, Exportar em Markdown, Editar, Mover para cima/baixo,
Excluir. Menu da seção: Editar, Mover para a esquerda/direita, Excluir. Criar e editar caderno ou
seção usa `NameColorDialog` (nome e a paleta `USER_COLORS`; uma cor antiga fora dela continua
oferecida). Caderno novo já vem com a seção **Geral**. Vazios mostram `Empty` com o próximo passo.

## Páginas e subpáginas

Menu da página (`⋯` no hover e botão direito), além do botão **Nova subpágina** no hover:

- **Nova subpágina** (`FilePlus2`) — só até o 2º nível.
- **Promover** (`IndentDecrease`) — sobe um nível, logo depois do pai.
- **Tornar subpágina da anterior** (`IndentIncrease`) — vira o último filho da irmã de cima; some
  quando passaria do limite.
- **Mover para cima / para baixo** — troca de lugar com a irmã vizinha (`shiftPlacement`).
- **Mover para a seção ▸** — leva a página e a subárvore para o fim da raiz de outra seção.
- **Excluir** — leva as subpáginas junto.

Arrastar (HTML5, do `Tree` do antd):

- Na fresta entre páginas: vira irmã, antes ou depois (`treeDropPlacement`). Soltar logo abaixo de
  uma página aberta com filhas a torna a primeira filha.
- Sobre uma página: vira a última filha dela.
- O `allowDrop` recusa o que passaria de 2 níveis ou cairia na própria subárvore.
- Sobre uma **aba de seção**: move a página (e a subárvore) para o fim da raiz daquela seção. A aba
  ganha um contorno tracejado enquanto a página está por cima. Se a página aberta foi junto, a tela
  segue para a seção nova.

As regras de árvore ficam em `src/shared/notebookTree.ts` (puro e testado), usado pelo renderer e
pelo main, que revalida tudo em `movePage`. Reordenar cadernos e seções usa `moveIdOnto`/`shiftId`
(`notebooks/notebookUi.ts`, testado).

## Edição e troca de página

- Notas e desenho salvam com o mesmo debounce da task (400 ms e 800 ms).
- Antes de trocar de página, seção ou caderno, a tela chama `flush()` do editor: título, notas e
  desenho pendentes são gravados antes de desmontar.
- O editor é montado com `key={pageId}`; trocar de página recria Tiptap/Excalidraw.
- **Modo foco** (o mesmo da tarefa, sem timer): o editor ocupa a janela; Esc ou **Sair** voltam.
  Substituiu os antigos Maximizar e Zen.

A árvore de páginas e o editor ficam cada um num `RegionBoundary` ("páginas", "página"), e dentro
dele os editores de notas e de desenho têm o seu. O `PageEditor` guarda o último JSON salvo
(`savedNotes`/`savedDrawing`), para que remontar o editor (trocar de aba ou "Tentar de novo") não
volte ao conteúdo de quando a página abriu.

Excluir confirma com `modal.confirm` dizendo quantas seções e páginas vão junto (conta pelo IPC na
hora), que as tarefas não mudam e que no Notion as páginas vão para o arquivo só com o envio
automático ligado.

## Preferências persistidas (`localStorage`)

| Chave                                                | Conteúdo                                            |
| ---------------------------------------------------- | --------------------------------------------------- |
| `ticktask.notebooks.notebook` / `.section` / `.page` | Última seleção. Se o id sumiu, cai no primeiro item |
| `ticktask.notebooks.tab`                             | Aba Notas/Desenho                                   |

## Dados

- Canais `notebook:*`, `section:*`, `page:*` (`src/main/notebookIpc.ts`). Toda mutação de estrutura
  emite `notebooks:refresh`; o hook `useNotebooks` recarrega com esse evento, não por conta própria.
- Salvar notas/desenho não emite refresh (a lista não mostra nada que mude com isso).
- Imagens coladas vão para `note_assets` com `page_id`; o PNG do desenho para
  `userData/drawings/pages/<pageId>.png`.
- Excluir é definitivo, com confirmação. Apaga os PNGs dos desenhos das páginas atingidas.

## Notion

Hierarquia de páginas sob uma raiz **Cadernos TickTask** (📚), criada dentro da página configurada
no Notion (ou na primeira acessível). Abaixo dela: caderno (📓) → seção (📑) → página (📄), com as
subpáginas aninhadas. O id da raiz fica em `notion-config.json` (`notebooksRootPageId`); se sumir
de lá, a raiz é procurada pelo título antes de criar outra.

- **Automático** (com o auto-sync do Notion ligado): criar, renomear, salvar notas/desenho/título e
  mover agendam o sync do item com 3 s de debounce. Excluir arquiva a página no Notion (arquivar o
  caderno arquiva tudo abaixo).
- **Manual**: botão **Salvar e sincronizar com o Notion** na aba Notas da página, e **Sincronizar
  com o Notion** no menu `⋯` do caderno, que sobe o caderno inteiro (seções e páginas). Funciona com o auto-sync
  desligado, desde que a API key esteja configurada.
- O corpo da página é reescrito a cada sync (notas + PNG do desenho no fim), preservando os blocos
  de subpágina.
- Avisos pelos mesmos eventos `notion:sync*` das tasks.

Limitações:

- A API não move página entre pais: mover no CrafyTask arquiva a página no Notion e cria outra no
  lugar novo (com as subpáginas). Links antigos para ela deixam de valer.
- A ordem das páginas no Notion é a de criação; reordenar no CrafyTask não reflete lá.
- Numa página com subpáginas, o corpo fica abaixo dos links das subpáginas.
- Com o auto-sync desligado, excluir não arquiva nada no Notion.

## Busca e menções

- **Busca** (`notebooks/PageSearch.tsx`, `AutoComplete`): no topo da coluna de cadernos, ou na
  barra abaixo de `lg`. Procura em todos os cadernos, pelo título e pelo texto das notas, com
  debounce de 250 ms. Até 30 resultados, título que bate primeiro, com caderno › seção e um
  trecho. Setas + Enter escolhem; Esc fecha.
- O texto vem da coluna `notebook_pages.search_text`, derivada do JSON a cada save
  (`notesPlainText.ts`). Páginas criadas antes da coluna são preenchidas na migração.
- **Menção `@`**: o `@` das notas (de task ou de página) sugere páginas também. Clicar no chip abre
  `/notebooks?page=<id>`; a tela localiza caderno e seção (`page:locate`), salva a página aberta e
  troca a seleção.

## Exportar

- **Página**: botão **Exportar a página em Markdown** (`Download`) na aba Notas → diálogo de salvar `.md`. Frontmatter (título,
  caderno, seção, datas), as notas em Markdown e o desenho no fim; imagens e o `.excalidraw` vão
  para `assets/` ao lado do arquivo.
- **Caderno**: **Exportar em Markdown** no menu `⋯` do caderno → escolher uma pasta. Cria `<caderno>/` com uma pasta por
  seção, um `.md` por página e as subpáginas numa pasta com o nome da página mãe; imagens de todas
  as páginas num `assets/` comum. Nomes repetidos ganham " (2)". Regras em `notebookExportPlan.ts`.

## MCP

`list_notebooks`, `search_pages`, `read_page`, `create_page`, `write_page` e `delete_page` (ver
[`docs/mcp-server.md`](../mcp-server.md)). Escritas pelo MCP também recarregam a tela e agendam o
sync com o Notion.
