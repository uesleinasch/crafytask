# Cadernos

A tela **Cadernos** guarda anotações livres, que não pertencem a nenhuma tarefa — atas de reunião,
referências, estudos. A organização é a do OneNote:

```
Caderno → Seção → Página → Subpágina → Sub-subpágina
```

Cada página tem as mesmas abas **Notas** e **Desenho** das tarefas (veja
[Notas e desenho](notas-e-desenho.md)).

## Criar a estrutura

1. Clique em **Cadernos** na barra superior.
2. **+ Novo caderno** (coluna da esquerda): nome e cor. Todo caderno novo já vem com a seção
   **Geral**.
3. **+** nas abas do topo cria outra seção.
4. **+ Nova página** cria uma página na seção aberta.

Passe o mouse sobre uma página para ver as ações:

- **Nova subpágina** — até dois níveis abaixo da página.
- **Promover** — sobe um nível.
- **Tornar subpágina da anterior** — vira filha da página de cima.
- **Excluir** — apaga a página e as subpáginas (definitivo, pede confirmação).

Arraste uma página para reordenar (as subpáginas vão junto) ou solte-a sobre a aba de outra seção
para movê-la. Cadernos e seções também se reordenam arrastando.

## Escrever

O título salva sozinho, assim como notas e desenho. **Maximizar** e **Zen** escondem a estrutura e
deixam só o texto; `Esc` volta.

## Buscar e referenciar

- A **busca** no cabeçalho procura em todos os cadernos, pelo título e pelo texto das páginas.
  Use as setas e `Enter` para abrir; `Esc` fecha.
- Nas notas de uma tarefa (ou de outra página), digite `@` e o nome da página para criar uma
  **menção**; clicar nela abre a página.

## Exportar

- **Página** — botão **Exportar** na aba Notas: salva um `.md` com cabeçalho (título, caderno,
  seção, datas), o texto e o desenho; imagens e o `.excalidraw` vão para `assets/` ao lado.
- **Caderno** — ícone de download ao passar o mouse sobre o caderno: escolha uma pasta e o app cria
  uma pasta por seção, um `.md` por página e as subpáginas em pastas com o nome da página mãe.

## Notion

Com a [integração com o Notion](../integracoes/notion.md) configurada, os cadernos viram uma
hierarquia de páginas sob uma página raiz chamada **Cadernos TickTask** (o nome antigo foi mantido
para não duplicar a raiz em quem já sincronizava). Com o auto-sync ligado, criar, renomear, editar
e mover sincronizam sozinhos; o botão **Sincronizar com o Notion** da página e o ícone de
sincronizar do caderno funcionam mesmo com o auto-sync desligado.

Limites da API do Notion:

- mover uma página para outro lugar arquiva a antiga no Notion e cria outra (links antigos deixam
  de valer);
- a ordem das páginas no Notion é a de criação;
- com o auto-sync desligado, excluir no app não arquiva nada no Notion.

## Com um assistente de IA

As ferramentas MCP `list_notebooks`, `search_pages`, `read_page`, `create_page`, `write_page` e
`delete_page` permitem que um assistente leia e escreva nos cadernos. Veja
[Ferramentas MCP](../comandos/ferramentas-mcp.md).
