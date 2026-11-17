# ADR 0002 — Ant Design na interface

- Status: proposto
- Data: 2026-11-17

## Contexto

A interface usa Tailwind v4 com primitivos shadcn/Radix. O levantamento em `docs/ui/15-inconsistencias.md`
mostra o custo disso: três paletas para status, cinco raios, quatro cores de ação primária, três
primitivos shadcn instalados e nunca usados (cada tela reimplementou o seu), tema escuro definido e
desligado, navegação só na home e nenhuma proteção contra falha de uma tela derrubar o app. A janela
mínima de 800px impede qualquer layout estreito.

## Decisão

- Adotar **Ant Design 6** (`antd@^6.7`, React 19 sem patch) como biblioteca de componentes, com
  `ConfigProvider` e `cssVar`.
- **Paleta própria**, nunca a padrão do antd: tokens em `src/renderer/src/theme/` (base, status,
  categoria, energia, time leak, gráficos), descritos no [guia de design](../design/guia-de-design.md).
- **AppShell** com `Layout`/`Sider`/`Header` e `RegionBoundary` (`react-error-boundary` + `Result`)
  por região e por ilha pesada (Tiptap, Excalidraw, terminal, gráficos).
- **Tailwind v4 continua só para layout**, em camada CSS abaixo do antd; classes de cor saem.
- **Lucide continua** como conjunto de ícones do produto.
- **Modo escuro** pelos algoritmos do antd, com a preferência aplicada no main por
  `nativeTheme.themeSource`.
- Migração **por tela**, em fases F0 a F9 ([plano](../design/plano-de-refatoracao.md)), medida pelo
  `npm run design:audit`.

## Alternativas consideradas

- **Continuar com shadcn/Radix e consertar as inconsistências.** Resolve cor e raio, mas não traz
  tabela com seleção e colunas responsivas, formulários, `Result`, `Grid.useBreakpoint`, algoritmos
  de tema escuro e compacto. Tudo isso teria que ser escrito e mantido aqui.
- **Mantine, MUI ou Fluent.** Viáveis. O antd foi escolhido pelo pedido do projeto e pela cobertura
  de componentes densos de dados (Table, Tree, Form, Segmented, Splitter), que é o núcleo de um app
  de tarefas.

## Consequências

- O bundle cresce; as três janelas carregam o mesmo renderer, então telas pesadas ficam em
  `React.lazy` e as janelas auxiliares importam o mínimo. Medir `out/renderer` antes e depois da F0.
- Customização só por tokens, `classNames` e `styles`: CSS sobre `.ant-*` quebra entre versões.
- Feedback (toast, confirmação) passa por `App.useApp()`; `sonner` e os diálogos Radix saem na F9.
- `docs/ui/` precisa ser reescrito ao fim da migração (F9).
