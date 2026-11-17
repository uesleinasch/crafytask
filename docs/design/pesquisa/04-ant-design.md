# Ant Design: como funciona e como customizar

Pesquisa feita em novembro de 2026 na documentação oficial (ant.design) e no registro npm.

## 1. Versão e compatibilidade com React 19

| Item          | Situação                                                                                                                                                        |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Última versão | **antd 6.7.1** (16/11/2026) — [changelog](https://ant.design/changelog)                                                                                         |
| v6.0.0        | Publicada em 21/11/2025 (npm); anúncio oficial em 22/11/2025 — [issue #55804](https://github.com/ant-design/ant-design/issues/55804)                            |
| React exigido | `>= 18`; v6 "não suporta mais React 17 ou anterior" — [guia de migração v6](https://ant.design/docs/react/migration-v6)                                         |
| React 19      | Suportado nativamente. O pacote `@ant-design/v5-patch-for-react-19` "não é mais necessário" — [guia de migração v6](https://ant.design/docs/react/migration-v6) |
| Ícones        | `@ant-design/icons` **v6** obrigatório com antd 6 (v6 dos ícones não funciona com antd 5)                                                                       |
| Navegadores   | Só modernos; IE removido. Electron consta na tabela de ambientes suportados — [Introdução](https://ant.design/docs/react/introduce)                             |
| v5            | Ramo `5.x-stable` com 1 ano de manutenção só para bugs graves — [issue #55804](https://github.com/ant-design/ant-design/issues/55804)                           |

O CrafyTask usa React `^19.1.1`, Tailwind `^4.1.17` e Electron `^38`. **Recomendação: antd `^6.7`
com `@ant-design/icons` `^6`**, sem patch de compatibilidade. Começar direto na v6 evita a
migração v5 → v6 depois (APIs renomeadas, DOM interno alterado).

Outras novidades da v6 que importam aqui
([issue #55804](https://github.com/ant-design/ant-design/issues/55804)):

- **CSS variables por padrão** ("pure CSS Variables mode"): trocar de tema fica barato.
- **Estrutura semântica** em todos os componentes: `classNames` e `styles` por parte interna,
  configuráveis por componente ou globalmente no `ConfigProvider`.
- **React Compiler** ligado nos bundles `antd.js`; usuários ESM podem optar.
- `zeroRuntime` (opcional): gera o CSS sem custo em tempo de execução, com
  `@ant-design/static-style-extract`.
- Blur da máscara de Modal/Drawer ligado em 6.0–6.2 e **desligado por padrão desde 6.3**
  ([migração v6](https://ant.design/docs/react/migration-v6)).

## 2. O sistema de tokens

Fonte: [Customize Theme](https://ant.design/docs/react/customize-theme).

- **Seed tokens** (sementes): a intenção de design. Lista documentada: `colorPrimary`,
  `colorSuccess`, `colorWarning`, `colorError`, `colorInfo`, `colorLink`, `colorTextBase`,
  `colorBgBase`, `fontFamily`, `fontFamilyCode`, `fontSize`, `borderRadius`, `lineWidth`,
  `lineType`, `wireframe`, `controlHeight`, `sizeUnit`, `sizeStep`, `sizePopupArrow`,
  `opacityImage`, `focusOutline`, `zIndexBase`, `zIndexPopupBase`, `motion`, `motionBase`,
  `motionUnit`, as curvas `motionEase*` e as cores pré-definidas (`blue`, `purple`...).
- **Map tokens**: derivados das sementes pelo **algoritmo** (ex.: `colorPrimaryBg`).
- **Alias tokens**: derivados dos map tokens e usados em lote pelos componentes (ex.: `colorLink`).
- **Component tokens**: ajustam um componente só (ex.: `Segmented.itemSelectedBg`,
  `Segmented.trackBg`).

**Algoritmos**: `theme.defaultAlgorithm`, `theme.darkAlgorithm`, `theme.compactAlgorithm`,
combináveis (`algorithm: [darkAlgorithm, compactAlgorithm]`). Em componente, `algorithm: true`
aplica o algoritmo global aos tokens daquele componente.

**`ConfigProvider` `theme`**: `token`, `components`, `algorithm`, `inherit` (padrão `true`),
`cssVar` (`prefix`, `key`), `hashed` (padrão `true`), `zeroRuntime` (padrão `false`, desde 6.0).

**Detalhes que mordem**:

- Trocar `theme` de `undefined` para objeto **remonta** os componentes; usar `{}` em vez de
  `undefined`.
- `message`, `Modal` e `notification` **estáticos** não leem o contexto do `ConfigProvider`
  (tema, idioma). Usar `App.useApp()` ou os hooks (`Modal.useModal`).
- `theme.useToken()` dá os tokens em componentes React; `theme.getDesignToken(config)` dá os
  tokens fora do React (útil para Tiptap, Excalidraw, xterm e gráficos).
- `ConfigProvider` aninhado aplica tema local; o que não mudar é herdado.
- Com CSS variables, se só há uma versão do antd na página, a documentação indica que dá para
  usar `hashed: false` junto (página "CSS Variables" da
  [documentação v5](https://5x.ant.design/docs/react/css-variables/); na v6 o modo é o padrão).
- O [Theme Editor](https://ant.design/theme-editor) ajuda a testar sementes.

## 3. Como fugir da "cara de antd"

O visual padrão vem de 4 coisas: o azul `#1677ff`, o raio, a fonte do sistema e os detalhes dos
componentes (sublinhado das abas, sombras, foco). Para trocar de verdade:

1. **Sementes próprias**: `colorPrimary` (tom da marca que passa AA, ver
   [03-cor-acessibilidade-e-modo-escuro.md](03-cor-acessibilidade-e-modo-escuro.md)),
   `colorInfo` diferente do roxo, `colorTextBase`/`colorBgBase` levemente puxados para o matiz da
   marca, `fontFamily` própria empacotada, `fontFamilyCode` para timer/terminal, `borderRadius`
   da identidade, `wireframe: false`.
2. **Sobrescrever map/alias tokens** de superfície e texto com a escala OKLCH própria
   (`colorBgLayout`, `colorBgContainer`, `colorBgElevated`, `colorBorder`, `colorText*`), nos dois
   temas, em vez de confiar só no algoritmo.
3. **Component tokens** nos componentes que dão personalidade: `Layout` (fundo do Sider/Header),
   `Menu` (item selecionado), `Tabs` (barra/indicador), `Segmented`, `Button`, `Tag`, `Card`,
   `Table` (altura de linha).
4. **Semantic `classNames`/`styles`** para ajustes estruturais, em vez de CSS mirando `.ant-*`
   internos. A v6 mudou o DOM interno e avisa que estilos que miram nós internos podem quebrar
   ([migração v6](https://ant.design/docs/react/migration-v6)). O blog oficial mostra Tailwind
   aplicado via `classNames` nas partes do componente
   ([Semantic beauty](https://ant.design/docs/blog/semantic-beauty)).
5. **Movimento**: ajustar `motionUnit`/`motionBase` e desligar (`motion: false`) quando
   `prefers-reduced-motion`.
6. **Componentes de identidade próprios**, construídos sobre primitivas antd: item de task,
   badge de status, timer, paleta de comandos, captura rápida.

## 4. Componentes que resolvem problemas do CrafyTask

| Necessidade                                                       | Componente                   | Nota da doc                                                                                                                                                 |
| ----------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toasts, notificações, confirmações com tema                       | `App` + `App.useApp()`       | Envolver o topo; `App` dentro do `ConfigProvider`; evitar aninhar — [App](https://ant.design/components/app)                                                |
| Casca com barra lateral                                           | `Layout`, `Layout.Sider`     | `breakpoint`, `collapsible`, `collapsedWidth` (padrão 80; `0` mostra gatilho especial), `width` padrão 200 — [Layout](https://ant.design/components/layout) |
| Abas de status                                                    | `Tabs`                       | `size`, `more` (menu de overflow), `destroyOnHidden`, `indicator` — [Tabs](https://ant.design/components/tabs)                                              |
| Alternar visão (lista/quadro/calendário), status em tela estreita | `Segmented`                  | Ícone sem rótulo vira item só-ícone; `block`; navegação por setas com `name` — [Segmented](https://ant.design/components/segmented)                         |
| Painéis redimensionáveis (lista + detalhe, notas + desenho)       | `Splitter`                   | `min`/`max`, `collapsible`, `lazy`, `destroyOnHidden` (6.4) — [Splitter](https://ant.design/components/splitter)                                            |
| Tela de erro de região                                            | `Result`                     | `status` `error`/`warning`/`500`..., `extra` para botões — [Result](https://ant.design/components/result)                                                   |
| Layout responsivo                                                 | `Grid`, `Grid.useBreakpoint` | Breakpoints na seção 6 — [Grid](https://ant.design/components/grid)                                                                                         |

Não existe no antd: paleta de comandos, editor rico, calendário semanal com blocos de tempo
arrastáveis no nível do CrafyTask. Esses continuam próprios (ou de bibliotecas atuais) e recebem
os tokens via CSS variables.

## 5. Convivência com Tailwind v4

Fonte: [Compatible style](https://ant.design/docs/react/compatible-style).

- Desde 5.17, `<StyleProvider layer>` coloca todo o CSS do antd em `@layer antd` (desligado por
  padrão). Precisa do `ConfigProvider` em volta.
- Ordem de camadas para Tailwind v4, declarada **antes** do `@import 'tailwindcss'`:

```css
@layer theme, base, antd, components, utilities;
@import 'tailwindcss';
```

- Assim o preflight (`base`) fica abaixo do antd e as utilities do Tailwind ficam acima, podendo
  sobrescrever o antd sem `!important`.
- O antd usa `:where()` (Chrome 88+) e propriedades lógicas (Chrome 89+) por padrão — sem problema
  no Electron 38.
- Desligar o preflight do Tailwind quebra estilos base do próprio Tailwind; a ordem de camadas
  resolve o conflito sem isso ([discussão de comunidade](https://dev.to/fabiobiondi/react-antd-and-tailwind-fix-css-conflicts-5542)).

**Ponte de tokens**: com CSS variables (prefixo padrão `ant`), os tokens viram variáveis como
`--ant-color-primary`. Os utilitários Tailwind (`@theme`) e os componentes não-antd (Tiptap,
Excalidraw, xterm, gráficos) devem ler **as mesmas variáveis**, para haver uma fonte única de
verdade. Confira os nomes gerados no DevTools antes de fixar.

## 6. Breakpoints

| Nome | Grid (`Col`, `useBreakpoint`) | `Layout.Sider` `breakpoint` |
| ---- | ----------------------------- | --------------------------- |
| xs   | < 576 px                      | 480 px                      |
| sm   | ≥ 576                         | 576                         |
| md   | ≥ 768                         | 768                         |
| lg   | ≥ 992                         | 992                         |
| xl   | ≥ 1200                        | 1200                        |
| xxl  | ≥ 1600                        | 1600                        |
| xxxl | ≥ 1920 (desde 6.3)            | 1920                        |

Fontes: [Grid](https://ant.design/components/grid) e [Layout](https://ant.design/components/layout).
Os valores podem ser trocados por tokens `screen*` (desde 5.1). Note que o `xs` do Sider (480)
difere do `xs` do Grid. Breakpoints são **de viewport**; para componentes dentro de painéis
redimensionáveis, ver container queries em
[05-resiliencia-e-responsividade.md](05-resiliencia-e-responsividade.md).

## 7. Ícones: `@ant-design/icons` × lucide

- O antd traz `@ant-design/icons` como dependência e o usa nos ícones internos (fechar, setas,
  carregando). Eles vão para o bundle de qualquer forma.
- Os componentes aceitam qualquer `ReactNode` como ícone; o `Segmented`, por exemplo, documenta
  `<svg>` de biblioteca de terceiros alinhado ao rótulo ([Segmented](https://ant.design/components/segmented)).
- O CrafyTask já usa `lucide-react` (atual: 1.x no npm). **Sugestão**: manter lucide nos ícones do
  produto (traço consistente, já conhecido) e aceitar os ícones internos do antd. Ajustar
  `strokeWidth`/tamanho do lucide para ficar próximo do peso visual dos ícones internos.

## 8. Riscos

| Risco                                                  | Mitigação                                                                                                                                                                                                                                       |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dois sistemas (shadcn/Radix + antd) durante a migração | Tokens únicos em CSS variables; migrar por tela/região; remover Radix por componente substituído                                                                                                                                                |
| Preflight do Tailwind × reset do antd                  | `StyleProvider layer` + ordem `@layer` acima                                                                                                                                                                                                    |
| Bundle maior; as 3 janelas carregam o **mesmo** bundle | antd é tree-shakable em ESM ([Introdução](https://ant.design/docs/react/introduce)); `React.lazy` nas telas pesadas (Calendário, Dashboard, Configurações); manter float e captura rápida com o mínimo de componentes; considerar `zeroRuntime` |
| CSS-in-JS em runtime custando no boot                  | CSS variables (padrão v6) reduzem recálculo na troca de tema; `zeroRuntime` elimina o runtime                                                                                                                                                   |
| Customização frágil mirando `.ant-*`                   | Só tokens e `classNames`/`styles` semânticos                                                                                                                                                                                                    |
| Métodos estáticos sem tema                             | `App.useApp()`                                                                                                                                                                                                                                  |
| `dayjs` entra como dependência dos pickers do antd     | O `package.json` atual não tem lib de datas; adotar `dayjs` (com locale pt-BR) como a única, em vez de somar outra                                                                                                                              |
| Idioma                                                 | `ConfigProvider locale={ptBR}` (`antd/locale/pt_BR`) e locale do dayjs                                                                                                                                                                          |
| Componentes não-antd fora do tema                      | Ler `--ant-*` ou `theme.getDesignToken`                                                                                                                                                                                                         |
