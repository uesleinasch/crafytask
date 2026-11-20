# Notas e desenho

Toda tarefa tem um painel à direita, no detalhe, com duas abas: **Notas** (editor rico) e
**Desenho** (Excalidraw). As páginas dos [cadernos](cadernos.md) usam o mesmo painel.

## Notas

O editor salva sozinho enquanto você digita. Recursos:

| Recurso | Como usar |
| --- | --- |
| Comandos | digite `/` e escolha: Título 1/2/3, Lista, Lista numerada, Checklist, Citação, Código, Divisor, Tabela, Imagem (navegue com ↑ ↓ e `Enter`) |
| Formatação | selecione texto: negrito, itálico, tachado, código, marca-texto, tamanho da fonte, link |
| Menções | digite `@` e busque uma tarefa, projeto, contexto ou página de caderno; clicar na menção abre o item |
| Reordenar blocos | passe o mouse à esquerda de um bloco e arraste pela alça |
| Tabelas | botão direito dentro da tabela: adicionar/excluir linha e coluna, mesclar, dividir |
| Imagens | cole ou arraste um arquivo de imagem |

As imagens ficam na pasta de dados do app (`notes-assets/`) e são referenciadas nas notas pelo
esquema `ticktask-asset://`.

### Modos de leitura

O botão **Modo foco**, ao lado das abas, deixa só o editor na tela, com o texto numa coluna de
leitura. `Esc` volta ao modo normal.

### Salvar fora do app

- **Salvar local** — na primeira vez pergunta onde salvar e grava a nota como Markdown, com
  cabeçalho YAML e as imagens copiadas ao lado. Depois disso, cada salvamento automático
  reexporta o arquivo.
- **Salvar e sincronizar** — força o salvamento e envia a nota para o Notion (quando a
  [integração](../integracoes/notion.md) está configurada).

Em tarefas importadas do [Jira](../integracoes/jira.md), as notas espelham a descrição da issue:
editar as notas atualiza a descrição no Jira.

## Desenho

A aba **Desenho** abre um quadro **Excalidraw** em português. Ele salva sozinho e, junto com o
desenho, gera uma imagem PNG — é ela que vai para o Notion, para a exportação local e para
assistentes de IA via MCP (ferramenta `read_drawing`).

O editor de desenho é carregado só quando você abre a aba, então a primeira abertura pode levar
um instante.
