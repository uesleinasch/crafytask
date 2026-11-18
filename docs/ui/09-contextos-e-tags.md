# Contextos e tags — `/contexts` e `/tags`

`src/renderer/src/pages/LabelsPage.tsx` · `src/renderer/src/components/labels/` ·
`src/renderer/src/hooks/useLabels.ts`

Uma tela só para as duas taxonomias, com os mesmos recursos (guia §8 "Contextos e tags"). As duas
rotas montam a mesma página: `/contexts` abre a aba **Contextos** e `/tags` a aba **Tags**. Trocar de
aba troca a rota (`replace`) e limpa a busca e o "Só sem uso". O título no Header é "Contextos e tags"
nas duas.

## Função

- **Contextos** — *onde* ou *com o que* uma ação pode ser feita. Uma tarefa pode ter vários; o
  filtro por contexto na lista é o que torna o conceito útil. Oito são criados na primeira execução
  (`@computador` 💻, `@telefone` 📱, `@reunião` 👥, `@email` 📧, `@leitura` 📖, `@compras` 🛒,
  `@casa` 🏠, `@escritório` 🏢).
- **Tags** — rótulos livres que nascem enquanto se digita no `TagInput`, então variações de grafia
  viram tags diferentes. A tela serve para limpar e **mesclar**.

## Dados

`useLabels` lê `context:listWithUsage` e `tag:listWithUsage` juntos e relê a cada `tasks:refresh`.
Cada rótulo traz `task_count` (tarefas com ele) e `open_count` (as não finalizadas e não
arquivadas), contados no SQL (`contextQueries.ts`, `tagQueries.ts`). Falha de leitura vai para o
`RegionBoundary` da rota. As regras puras (busca, ordenação, texto de uso, nome repetido, rota da
lista filtrada) ficam em `components/labels/labels.ts`, com teste.

## Abas e barra

- `Tabs` com ícone (`MapPin` / `Tags`) e o total de cada uma em mono.
- Uma frase do que é cada um, em texto secundário.
- Busca por nome (`Input` com `Search`), ordenar (`Mais usados`, `Nome`, `Menos usados`; desempate
  pelo nome), `Checkbox` **Só sem uso** com o contador, `Segmented` Cards/Tabela (salvo em
  `ticktask:labelsView`; some abaixo de `md`, onde é sempre Cards) e **Novo contexto**/**Nova tag**
  (só o ícone abaixo de `sm`).

## Cards e tabela

- **Card** (grade de `minmax(230px, 1fr)`): marca de 40px — contexto com o emoji num quadrado com a
  cor a ~14% (`userColorTint`), tag com o ponto de 12px da cor —, nome (tag com `#`) e "em N
  tarefas · M abertas" ou "não usado/não usada". Clicar abre a lista filtrada; sem uso, abre a
  edição. `⋯` e botão direito abrem o menu.
- **Tabela:** rótulo (marca de 28px + nome clicável), Tarefas, Abertas (mono), `⋯`. Botão direito na
  linha abre o mesmo menu.
- **Menu:** Ver tarefas (`ListTodo`, desabilitado sem uso) · Editar (`Pencil`) · Mesclar em…
  (`Merge`, desabilitado com menos de dois) · Excluir… (`Trash2`, perigo).
- Vazio: `Empty` com "Nenhum contexto ainda." / "Nenhuma tag ainda." ou "Nada com esses filtros.".

**Ver tarefas** navega para `/?context=<id>` ou `/?tag=<id>`; a lista de tarefas lê a query
(`labelFilterFromSearch`), aplica o filtro e muda a aba de status para **Todas**.

## Criar e editar (`LabelEditModal`)

- Em edição com uso: "O novo nome vale para as N tarefas que já usam este contexto/esta tag."
- Nome (`#` inicial da tag é ignorado). Nome igual a outro do mesmo tipo, sem diferenciar
  maiúsculas, é recusado com "Já existe … com esse nome. Use Mesclar." — no renderer e, ao renomear,
  também no main (`updateTag`, `assertContextNameFree`).
- Ícone (só contexto): 18 emojis em botões de 36px; o escolhido ganha borda e fundo primários.
- Cor: as dez `USER_COLORS` de `theme/semantic.ts`. Cor gravada fora delas continua valendo e
  aparece na prévia, sem nenhum círculo marcado. Novo rótulo começa em `#2A62D6` e, contexto, em 💻.
- **Prévia** ao vivo da marca e do nome, nos dois tipos.

## Mesclar (`LabelMergeModal`)

"As **N tarefas** com X passam para o destino, e **X** deixa de existir" (ou "não está em nenhuma
tarefa e deixa de existir"). `Select` com busca, listando os outros rótulos com o uso em mono.
Contextos usam `context:merge` (novo); tags, `tag:merge`. As tarefas afetadas são reenviadas ao
Notion quando o auto-sync está ligado. Ao concluir: "Mesclado em Y: N tarefas atualizadas".

## Excluir

`modal.confirm` de `App.useApp()`: "Excluir X?" e "O contexto/A tag sai de N tarefas. As tarefas em
si não são afetadas." ou "Este contexto não está/Esta tag não está em nenhuma tarefa.".
