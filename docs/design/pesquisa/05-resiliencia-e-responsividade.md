# Resiliência e responsividade: AppShell, error boundaries e breakpoints

## 1. O que muda hoje

- A janela principal abre com 1024×700 e tem `minWidth: 800`, `minHeight: 600`
  (`src/main/index.ts`). Para chegar à meta de **~360 px**, o `minWidth` precisa cair; sem isso,
  todo o trabalho de responsividade estreita fica invisível na janela principal.
- A navegação principal só aparece no `TitleBar` da rota `/` (ver `docs/ui/00-visao-geral.md`).
  Um AppShell com barra lateral persistente resolve isso.
- O renderer não tem `ErrorBoundary`. Um erro de render em qualquer componente derruba a tela
  inteira: por padrão, um erro de render não capturado faz o React remover a UI da tela
  ([React](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)).

## 2. Error boundaries: o que capturam e o que não

Da documentação do React ([Component](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)):

- Capturam erros **de render** (e de ciclo de vida) dos filhos, inclusive distantes.
- **Não** capturam: handlers de evento, código assíncrono (`setTimeout`, promessas), SSR e erros no
  próprio boundary. Exceção: erros dentro de `startTransition` são capturados.
- Ainda não há boundary em componente de função; a doc indica `react-error-boundary`.
- Granularidade: "não precisa envolver cada componente"; ponha boundary onde faz sentido mostrar
  uma mensagem de erro (no exemplo da doc: a lista de conversas e cada mensagem, mas não cada avatar).

**react-error-boundary** ([GitHub](https://github.com/bvaughn/react-error-boundary)) — versão
6.1.6 no npm, peer `react ^18 || ^19`:

- `ErrorBoundary` com `fallback`, `FallbackComponent` ou `fallbackRender`; `onError` para log;
  `onReset`; `resetKeys` (quando mudam, o boundary reseta).
- `useErrorBoundary()` devolve `showBoundary(error)` e `resetBoundary()`: é como levar erros
  **assíncronos** (IPC que falhou num hook) para o boundary mais próximo.

**React 19, raiz**: `createRoot(container, { onCaughtError, onUncaughtError, onRecoverableError })`
recebe callbacks para erros capturados, não capturados e recuperados
([createRoot](https://react.dev/reference/react-dom/client/createRoot)). É o ponto único para
mandar todo erro ao main process (log em arquivo) via IPC.

## 3. AppShell proposto

```text
ConfigProvider (tema, locale pt-BR, tokens)
└─ App (antd: message / notification / modal com tema)
   └─ ErrorBoundary RAIZ  → Result status="500" + "Recarregar janela"
      └─ Layout
         ├─ Sider          → ErrorBoundary (fallback: barra mínima com links fixos)
         ├─ Layout
         │  ├─ Header      → ErrorBoundary (fallback: título + busca desativada)
         │  ├─ Content     → ErrorBoundary POR ROTA, resetKeys=[pathname]
         │  │   └─ painéis pesados com boundary próprio:
         │  │      editor de notas (Tiptap), desenho (Excalidraw, lazy),
         │  │      gráficos do dashboard, calendário, painel Jira
         │  └─ Painel do terminal → ErrorBoundary próprio (xterm/node-pty)
         └─ FloatingTimer/overlays → ErrorBoundary próprio (silencioso)
```

Regras:

- **Uma região quebrada não leva as outras.** Se o editor de notas falha, a task continua
  visível e o timer continua rodando.
- Fallback padrão com `Result` do antd: título curto em linguagem simples, botão "Tentar de novo"
  (`resetErrorBoundary`), botão "Copiar detalhes" (mensagem + `componentStack`). Mensagem sem
  código cru, como pede a heurística 9 de Nielsen
  ([NN/g](https://www.nngroup.com/articles/ten-usability-heuristics/)); detalhes técnicos atrás
  de um `Collapse`.
- `resetKeys` com a rota (e o id da task, nos painéis de task): navegar para outra tela limpa o
  erro sem recarregar.
- Erros de IPC em hooks: `try/catch` + `showBoundary` quando a região não consegue renderizar
  sem o dado; senão, `message.error` via `App.useApp()` e a região mostra estado vazio com
  "Tentar de novo" (ver estados vazios em [02-referencias-de-mercado.md](02-referencias-de-mercado.md)).
- `React.lazy` + `Suspense` com skeleton do antd nas regiões pesadas; boundary **por fora** do
  `Suspense` para pegar falha de carregamento do chunk.
- Janelas auxiliares (float, captura rápida) têm o próprio boundary raiz e **não** importam o
  shell completo: o bundle é o mesmo, então tudo que roda em escopo de módulo roda três vezes
  (ver CLAUDE.md, `stores/timerWindow.ts`).

**No main process (Electron)**:

- `webContents` emite `render-process-gone` quando o renderer "desaparece inesperadamente",
  normalmente por crash ou kill ([webContents](https://www.electronjs.org/docs/latest/api/web-contents)).
  Tratar com log + recarregar a janela + aviso discreto ao voltar.
- `BrowserWindow` emite `unresponsive`/`responsive` quando a página trava e volta
  ([BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window)). Útil para avisar e
  oferecer recarregar.

## 4. Responsividade: viewport × container

No Electron, a viewport **é** a janela. Então os breakpoints do antd (media queries) respondem ao
tamanho da janela, o que serve para a **casca**. Mas o conteúdo vive em painéis de largura
variável (lista + detalhe com `Splitter`, painel do terminal, notas + desenho). Ali a largura do
painel importa mais que a da janela.

- **Container queries**: `container-type: inline-size` no painel e `@container (width > 700px)`
  nos filhos; unidades `cqi`/`cqw` relativas ao container
  ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)).
  O Chromium do Electron 38 suporta.
- Regra prática: **media query (antd `useBreakpoint`) para o shell; container query para
  componentes** (item de task, card, cabeçalho de painel, barra de filtros).

## 5. Breakpoints recomendados para o CrafyTask

Usar os do antd ([Grid](https://ant.design/components/grid), [Layout](https://ant.design/components/layout)),
sem inventar outros. Comportamento sugerido:

| Faixa da janela | Breakpoint antd | Sider                                             | Lista + detalhe                                    | Abas de status                   | Outros                                          |
| --------------- | --------------- | ------------------------------------------------- | -------------------------------------------------- | -------------------------------- | ----------------------------------------------- |
| 360–575         | xs              | Oculto (`collapsedWidth={0}`), abre como `Drawer` | Uma coluna; detalhe em tela cheia com "voltar"     | `Select` ou `Segmented` só-ícone | Toolbar vira menu `...`; terminal em tela cheia |
| 576–767         | sm              | Oculto ou só ícones                               | Uma coluna                                         | `Segmented` só-ícone + tooltip   | Calendário em visão de dia                      |
| 768–991         | md              | Só ícones (≈ 64 px)                               | Uma coluna; detalhe em `Drawer` largo              | `Tabs` com rótulo curto          | Calendário em 3 dias                            |
| 992–1199        | lg              | Expandido (≈ 220–240 px), recolhível              | `Splitter` lista/detalhe                           | `Tabs` completas + contagem      | —                                               |
| 1200–1599       | xl              | Expandido                                         | `Splitter` com detalhe maior                       | `Tabs`                           | Notas e desenho lado a lado opcional            |
| ≥ 1600          | xxl/xxxl        | Expandido                                         | Três colunas possíveis (navegação, lista, detalhe) | `Tabs`                           | Limitar largura de leitura do texto das notas   |

Notas:

- O `Layout.Sider` com `breakpoint="lg"` recolhe sozinho abaixo de 992 px e chama `onBreakpoint`;
  com `collapsedWidth={0}` mostra o gatilho especial
  ([Layout](https://ant.design/components/layout)). A doc do antd sugere largura de barra lateral
  na fórmula `200 + 8n`.
- Guardar o estado "recolhido" da barra e o tamanho dos painéis (`usePersistedState`, como já é
  feito em preferências de visão).
- WCAG 1.4.10 (Reflow) pede conteúdo sem rolagem em duas direções em ~320 px de largura
  ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)): a meta de 360 px fica perto disso. Tabelas e
  calendário podem rolar no eixo horizontal **dentro** do seu container, não a página.
- Alvos ≥ 24 px (WCAG 2.5.8) mesmo no modo compacto e na faixa xs.

## 6. Checklist do AppShell

- [ ] `minWidth` da janela principal reduzido para a meta (≈ 360 px).
- [ ] `ConfigProvider` → `App` → boundary raiz → `Layout`.
- [ ] Boundary por região (Sider, Header, rota, editor, desenho, terminal, gráficos, float).
- [ ] `resetKeys` por rota e por task.
- [ ] `onCaughtError`/`onUncaughtError` no `createRoot` enviando ao log do main.
- [ ] `render-process-gone` e `unresponsive` tratados no main.
- [ ] Navegação principal no Sider em todas as rotas (não só em `/`).
- [ ] Container queries nos componentes que vivem em painéis redimensionáveis.
- [ ] Estado de Sider e Splitter persistido.
