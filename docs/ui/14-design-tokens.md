# Design tokens

A fonte da verdade das cores, fontes, raios e densidade é **`src/renderer/src/theme/`**. As regras
de uso (quando cada cor aparece, contraste, modo escuro, o que é proibido) estão no
[guia de design](../design/guia-de-design.md), §3 a §5, §9 e §14. Este documento só mostra onde
cada coisa mora e como ela chega à tela; os valores ficam no código.

---

## 1. Arquivos

| Arquivo | O que tem |
| --- | --- |
| `theme/tokens.ts` | `PALETTE` (claro e escuro, mesmas chaves), `FONT_FAMILY`/`FONT_FAMILY_CODE` e `seedTokens(mode)`, que traduz a paleta em seed tokens do antd |
| `theme/semantic.ts` | cores de domínio, uma versão por tema (seção 3) |
| `theme/buildTheme.ts` | `buildTheme(mode, density)`: algoritmo claro/escuro, compacto, seed tokens, tokens por componente e `cssVar` |
| `theme/ThemeProvider.tsx` | `ConfigProvider` + `App` do antd, preferências, tema do sistema e envio ao main |
| `theme/themeSettings.ts` | chaves `ticktask:theme` e `ticktask:density`, contexto e `useThemeSettings()` |
| `shared/themePreference.ts` | tipos `ThemePreference`/`ThemeMode`/`Density`, padrões e `resolveThemeMode` (compartilhado com o main) |

Testes: `contrast.test.ts` confere o contraste WCAG dos pares de cor, `buildTheme.test.ts` o tema
montado e `timeLeak.test.ts` a escala de time leak.

## 2. Paleta e seed tokens

`PALETTE.light` e `PALETTE.dark` têm as mesmas chaves: fundo (`bg`), superfície (`surface`,
`elevated`, `sider`), bordas (`border`, `borderStrong`), três níveis de texto (`text`, `text2`,
`text3`), primária (`primary`, `primarySoft`, `onPrimary`), `brand` (a cor da logo), estados de
hover (`hover`, `rowHover`), `track` e os quatro estados (`success`, `warning`, `error`, `info`).

`seedTokens(mode)` liga essas chaves aos tokens do antd (`colorPrimary`, `colorBgLayout`,
`colorBgContainer`, `colorBorder`, `colorText*` etc.) e fixa o resto:

| Token | Valor |
| --- | --- |
| `fontSize` | 14 |
| `borderRadius` / `SM` / `LG` / `XS` | 8 / 6 / 12 / 4 |
| `motionDurationMid` / `Slow` | 160ms / 240ms |
| `boxShadowSecondary` | a única sombra do app, para tudo que flutua |

`buildTheme` acrescenta tokens por componente (`Layout`, `Menu`, `Tabs`, `Table`, `Card`,
`Segmented`, `Statistic`), por exemplo o header de 52px, o item de menu selecionado em
`primarySoft` e o padding das células da tabela, que encolhe na densidade compacta.

No componente, a cor vem de `theme.useToken()`; quando depende do tema e não é token do antd, de
`PALETTE[mode]` com o `mode` de `useThemeSettings()` (é o caso da cor da logo).

## 3. Cores semânticas (`theme/semantic.ts`)

| Export | Para quê |
| --- | --- |
| `STATUS_COLORS` | `fg`/`bg` dos seis status de tarefa, lidos pelo `StatusChip` |
| `CATEGORY_COLORS` | urgente, prioridade e time leak (`normal` não tem cor), lidos pelo `CategoryChip` |
| `PROJECT_STATUS_COLORS` | status de projeto, reaproveitando os de tarefa |
| `TIME_LEAK_SCALE`, `timeLeakLevel`, `timeLeakBackground` | os três fundos de time leak e o cálculo do nível pelos limites das preferências |
| `ENERGY_BARS`, `ENERGY_LABELS` | barras cheias e rótulo de cada nível de energia (o `EnergyMeter` usa a cor primária) |
| `CHART_COLORS` | gráficos: cor única, apagada, escala sequencial (heatmaps) e categórica |
| `HORIZON_COLORS` | escala única H0–H5 dos horizontes |
| `CAL_BLOCK_COLORS` | fundo e borda dos blocos de tempo do calendário |
| `USER_COLORS`, `USER_COLOR_NAMES`, `userColorTint` | as dez cores que o usuário escolhe para projeto, contexto, tag, caderno e aba do terminal, com nome legível e o tom claro de fundo |
| `TERMINAL` | paleta fixa do terminal, escuro nos dois temas, tirada de `PALETTE.dark` |

As cores, menos `USER_COLORS` e `TERMINAL`, têm uma versão por tema.

## 4. Tema e densidade

- **Tema:** `ticktask:theme` em `localStorage` (`system`, `light`, `dark`; padrão `system`). Com
  `system`, o `ThemeProvider` segue `prefers-color-scheme`. A janela principal manda a preferência
  ao main (`app:setThemeSource`) para o `nativeTheme`; as três janelas se atualizam pelo evento
  `storage`.
- **Densidade:** `ticktask:density` (`comfortable` ou `compact`; padrão `comfortable`). A compacta
  soma `theme.compactAlgorithm`, passa `componentSize="small"` ao `ConfigProvider` e fixa
  `controlHeightSM` em 24.
- Escolha em Configurações → Aparência, no menu de aparência do header ou na paleta de comandos.

## 5. Variáveis CSS (`--ant-*`) e `main.css`

`buildTheme` liga o `cssVar` do antd com prefixo `ant` e chave fixa `ct-theme`; o `ThemeProvider`
põe a classe `ct-theme` no `<html>`. Por isso as variáveis `--ant-color-primary`,
`--ant-color-border-secondary`, `--ant-color-bg-elevated`, `--ant-font-family-code` etc. valem na
janela toda, inclusive nos popups do editor e nas janelas auxiliares.

`src/renderer/src/assets/main.css` usa só essas variáveis para cor: as classes `ct-*` (calendário,
horizontes, janelas auxiliares, terminal, cadernos, `ct-kbd`, `ct-live`), o anel de foco global
(`:focus-visible` em botão, link e `[tabindex]` próprios, 2px na cor primária) e os estilos do
Tiptap. A ordem das camadas é `@layer theme, base, antd, components, utilities`, e o `main.tsx`
envolve o app em `StyleProvider layer`: os estilos do antd ficam acima do preflight do Tailwind e
abaixo das utilidades.

## 6. Fontes

Empacotadas (o app é offline e a CSP não busca fonte remota) e importadas no topo de `main.tsx`:

| Fonte | Pacote | Onde |
| --- | --- | --- |
| Geist | `@fontsource-variable/geist` | interface (`fontFamily` do antd, `--font-sans` do Tailwind) |
| Geist Mono | `@fontsource-variable/geist-mono` | números, tempo, ids e teclas (`fontFamilyCode`, `--font-mono`) |
| Denk One | `@fontsource/denk-one` | só a logo "CrafyTask" na sidebar (`font-brand`) |

Tamanhos e pesos: guia §4.

## 7. Raios

O raio dos componentes vem dos tokens do antd (seção 2). Nenhum componente usa classe `rounded-*`
do Tailwind; as regras próprias do `main.css` usam `var(--ant-border-radius-*)` ou um valor fixo do
guia (§5).

## 8. O que o `main.css` traz além das classes `.ct-*`

- `@layer theme, base, antd, components, utilities` e o `@import 'tailwindcss'` (Tailwind só para
  layout);
- `@theme inline` com as fontes (`--font-sans`, `--font-mono`, `--font-brand`); a cor da logo vem
  de `PALETTE[mode].brand`;
- a camada `base`: fundo e texto do `body` por `var(--ant-color-bg-layout)` e
  `var(--ant-color-text)`, e o contorno de foco em `--ant-color-primary`.

As variáveis do shadcn (`:root`/`.dark`, `--background`, `--chart-*`, `--sidebar-*`, `--radius`)
saíram na F9-a.

## Antes da F0

Até a refatoração visual, as cores eram classes de cor do Tailwind escritas à mão em cada tela,
sobre as variáveis do shadcn, sem tema escuro. Status tinha duas paletas, categoria quatro (time
leak era amarelo em três lugares e roxo em dois), o dashboard e o calendário tinham cópias locais,
havia cinco raios e cinco sombras em uso e os tokens de fonte apontavam para variáveis que não
existiam. O catálogo dessas divergências, com a fase que resolveu cada uma, está em
[15](15-inconsistencias.md). O guia original (`ui-ux/TickTask - Design System & Guia de Estilo.md`)
é histórico.
