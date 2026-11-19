# Horizontes GTD — `/horizons`

`src/renderer/src/pages/HorizonsPage.tsx` · `components/horizons/` (`HorizonChip.tsx`,
`AreaModal.tsx`, `GoalModal.tsx`, `horizonDrafts.ts` e `horizonLevels.ts`, puro e testado).

## Função

Reunir numa página só as **seis alturas de perspectiva** do GTD, da ação de hoje ao propósito, e
deixar navegar de um nível para outro. Aqui se criam e editam áreas de foco e metas; o resto leva
para as telas de cada coisa.

## Barra

- **Filtro por área** (`Select`, "Todas as áreas"): escolhida uma área, todos os níveis mostram só o
  que é dela — ações de hoje dos projetos da área, projetos ativos da área, a própria área e as metas
  dela. Metas sem área aparecem em todas. Ao lado, o texto explica o recorte ("Mostrando ações,
  projetos e metas de Carreira. Metas sem área aparecem em todas.").
- **Nova área** e **Nova meta** (primário; abre em H3 já com a área filtrada).

## Escala e trilho

Cada nível tem o chip `H0`…`H5` (`HorizonChip`) na escala violeta de `HORIZON_COLORS`
(`theme/semantic.ts`, contraste AA testado), mais clara na ação e mais escura no propósito. Os
níveis são `Card` neutros. A partir de `lg`, um **trilho** à esquerda (fixo ao rolar) lista H0–H5;
clicar rola até o nível com `scrollIntoView` (sem âncora de URL: o app roteia pelo hash).

## Níveis

Cada `Card` mostra o chip, o nome, o contador em mono e o subtítulo; H2 a H5 têm **Adicionar**.

- **H0 · Próximas ações** ("O que está planejado para hoje"): tarefas abertas de hoje
  (`schedule:getForDate`). A linha inteira abre a tarefa (o nome é o link para o teclado), projeto, prazo em mono (âmbar hoje, vermelho
  vencido) e o botão do timer (iniciar/pausar; desabilitado se bloqueada), com o ponto pulsante
  quando roda. Vazio: "Nada planejado para hoje." com **Abrir o plano do dia**.
- **H1 · Projetos** ("Resultados em andamento"): projetos ativos com ponto da cor, nome (a linha
  abre o projeto), etiqueta da área (sem filtro), próxima ação ou o chip "Sem próxima ação" e o progresso
  `feitas/total`. Vazio com **Abrir projetos**.
- **H2 · Áreas de foco** ("Responsabilidades e papéis"): cards com emoji, nome, descrição e "N
  projetos · M metas" (projetos ativos). Clicar no card liga ou desliga o filtro (o card filtrado
  ganha a borda da cor primária). Menu (`⋯` e botão direito): Ver só esta área nos horizontes · Ver
  projetos da área (abre `/projects?q={área}`, a busca já procura por área) · Editar · Excluir…, que confirma e diz quantos projetos e metas ficam sem área.
- **H3 · Metas** (1 a 2 anos, 🎯), **H4 · Visão** (3 a 5 anos, 🔭), **H5 · Propósito** (princípios,
  ✨): emoji do nível, nome, etiqueta da área ("todas as áreas" sem área; clicar filtra) e
  descrição com as quebras de linha. Menu: Editar · Mover para ▸ (H3/H4/H5, com ✓ no atual) ·
  Excluir… ("Só esta meta é apagada; áreas e projetos não mudam."). **Adicionar** abre o diálogo já
  no nível da seção.

## Diálogos

- **Nova / Editar área de foco:** grade de 12 emojis (rádio), nome e descrição.
- **Nova meta, visão ou propósito / Editar:** `Segmented` H3/H4/H5, nome, área (`Select`, "Sem área
  (vale para todas)") e descrição.

Erro ao salvar aparece numa mensagem e o diálogo continua aberto.

## Dados

`area:list`, `goal:list`, `project:list` (com a próxima ação e as contagens, ver
`05-projetos.md`) e `schedule:getForDate` de hoje, numa leitura só dentro do `RegionBoundary` da
rota; relê em `tasks:refresh` e depois de cada gravação. O recorte por área é de `filterByArea`
(`horizonLevels.ts`).
