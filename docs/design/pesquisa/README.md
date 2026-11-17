# Pesquisa de UI/UX para a refatoração visual

Base de pesquisa para a refatoração do CrafyTask para **Ant Design** com paleta própria, AppShell
resiliente, responsividade de ~360 px a monitores largos e modo escuro. Feita em novembro de 2026. Cada afirmação aponta para a fonte; a lista completa está em [referencias.md](referencias.md).

Este conjunto **não** é o guia de design: é o insumo dele. O estado atual da interface está em
`docs/ui/` (em especial `14-design-tokens.md` e `15-inconsistencias.md`).

## Documentos

| Documento                                                                        | Conteúdo                                                                                                                                                    |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [01-gtd-e-cognicao.md](01-gtd-e-cognicao.md)                                     | GTD como cognição distribuída, Zeigarnik e planos, gestão de tarefas (CHI), interrupção e retomada, controle de tempo e estresse, Hick/Fitts, cor e atenção |
| [02-referencias-de-mercado.md](02-referencias-de-mercado.md)                     | Things, Todoist, Akiflow, OmniFocus, Sunsama, TickTick, Linear; NN/g sobre abas, estados vazios, notificações e dashboards; o que adotar e evitar           |
| [03-cor-acessibilidade-e-modo-escuro.md](03-cor-acessibilidade-e-modo-escuro.md) | WCAG 2.2, APCA, paleta em OKLCH, o roxo `#705EFF` na prática, semântica de status, daltonismo, modo escuro                                                  |
| [04-ant-design.md](04-ant-design.md)                                             | antd 6: versão, React 19, tokens, `ConfigProvider`, `App`, Tailwind v4, breakpoints, ícones, riscos                                                         |
| [05-resiliencia-e-responsividade.md](05-resiliencia-e-responsividade.md)         | Error boundaries, AppShell por regiões, viewport × container queries, tabela de breakpoints                                                                 |
| [referencias.md](referencias.md)                                                 | Todas as fontes, com DOI quando há                                                                                                                          |

## Conclusões principais

1. **O problema é o esforço, não a priorização.** Pessoas priorizam bem; o custo de manter o
   sistema é o que as faz desistir ([Bellotti et al., 2004](https://doi.org/10.1145/985692.985785);
   [Kamsin et al., 2012](https://doi.org/10.1145/2212776.2212457)).
   _Implicação:_ captura de uma linha com sintaxe inline, edição inline, bons padrões, zero campo obrigatório.

2. **Capturar alivia; planejar libera.** Um plano específico elimina a intrusão de metas abertas,
   mesmo sem fazer a tarefa ([Masicampo e Baumeister, 2011](https://doi.org/10.1037/a0024192)).
   _Implicação:_ processar o inbox pede próxima ação + contexto + quando, em poucos cliques; o plano do dia ganha destaque.

3. **O app é memória externa e gatilho de ação.** O GTD funciona porque desloca memória e
   gatilhos para o ambiente ([Heylighen e Vidal, 2008](https://doi.org/10.1016/j.lrp.2008.09.004)).
   _Implicação:_ estado sempre visível (inbox, executando, aguardando), busca rápida, contexto como filtro de primeira classe.

4. **Retomar custa caro; pistas visuais ajudam.** Janelas pouco visíveis atrasam a volta à
   tarefa ([Iqbal e Horvitz, 2007](https://doi.org/10.1145/1240624.1240730)); tarefas retomadas
   são as longas e difíceis ([Czerwinski et al., 2004](https://doi.org/10.1145/985692.985715)).
   _Implicação:_ cada task mostra o "ponto de retomada" (última nota, sessão, terminal); timer flutuante é pista, não enfeite.

5. **Notificação custa atenção mesmo sem clique.** ([Stothart et al., 2015](https://doi.org/10.1037/xhp0000100);
   [Mark et al., 2008](https://doi.org/10.1145/1357054.1357072)).
   _Implicação:_ toast só para o que exige ação; sync e status como indicadores passivos; avisos em pontos de quebra.

6. **Medir tempo com enquadramento negativo funciona, mas estressa.**
   ([Kim et al., 2016](https://doi.org/10.1145/2858036.2858428)).
   _Implicação:_ dashboard neutro/positivo por padrão; vermelho só para erro e prazo vencido.

7. **Cor guia a atenção; cor sozinha exclui.** ([Wolfe e Horowitz, 2004](https://doi.org/10.1038/nrn1411);
   ~8% dos homens com deficiência vermelho-verde, [Birch, 2012](https://doi.org/10.1364/JOSAA.29.000313);
   [WCAG 1.4.1](https://www.w3.org/TR/WCAG22/)).
   _Implicação:_ chrome neutro, cor forte só em ação primária/executando/erro; status sempre com ícone + rótulo.

8. **`#705EFF` com texto branco dá 4.44:1 e não passa AA.** (cálculo em
   [03-cor-acessibilidade-e-modo-escuro.md](03-cor-acessibilidade-e-modo-escuro.md)).
   _Implicação:_ `colorPrimary` de botão ≈ `#6854F1` (5.1:1) no claro; tom mais claro e dessaturado (≈ `#8482F2`) no escuro; `#705EFF` fica no logo.

9. **Paleta em OKLCH, não HSL nem LCH.** Luminosidade percebida previsível e sem desvio de matiz
   na faixa do roxo ([Evil Martians](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl);
   [Linear](https://linear.app/blog/how-we-redesigned-the-linear-ui)).
   _Implicação:_ gerar neutros (levemente roxos) e marca fora do antd e injetar como tokens nos dois temas.

10. **Claro por padrão para leitura; escuro como opção de primeira classe.** Polaridade positiva
    lê melhor, sobretudo em fonte pequena ([NN/g](https://www.nngroup.com/articles/dark-mode/);
    [Piepenbrock et al., 2013](https://doi.org/10.1080/00140139.2013.790485)).
    _Implicação:_ seguir o sistema (`nativeTheme.themeSource`), escuro com cinza (não preto), elevação por luminosidade, cores dessaturadas, texto ≥ 12 px.

11. **Densidade é valor por tempo e espaço.** ([Ström](https://mattstromawn.com/writing/ui-density/);
    [Linear](https://linear.app/blog/how-we-redesigned-the-linear-ui)).
    _Implicação:_ densidade média-alta por padrão, opção Compacta (`compactAlgorithm`), alvos ≥ 24 px ([WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)), velocidade como parte do design.

12. **Seis abas de status estão no limite.** Poucas abas, rótulo curto, dois indicadores de
    seleção, uma linha, sem overflow ([NN/g](https://www.nngroup.com/articles/tabs-used-right/)).
    _Implicação:_ `Tabs` em `lg+`; `Segmented` só-ícone ou `Select` abaixo de `md`; mesmo ícone/cor de status na aba e no badge.

13. **Teclado primeiro para quem vive no app.** ([Nielsen, heurística 7](https://www.nngroup.com/articles/ten-usability-heuristics/);
    [Things](https://culturedcode.com/things/support/articles/2249437/); [Akiflow](https://product.akiflow.com/articles/6483573-command-bar)).
    _Implicação:_ paleta `Ctrl+K` própria, atalhos de letra, folha de atalhos em `?`, captura global com sintaxe inline.

14. **antd 6 é a escolha certa para React 19.** v6.7.1 é a atual; exige React ≥ 18 e dispensa o
    patch de React 19; CSS variables por padrão ([migração v6](https://ant.design/docs/react/migration-v6);
    [anúncio](https://github.com/ant-design/ant-design/issues/55804)).
    _Implicação:_ `antd@^6.7` + `@ant-design/icons@^6`; customizar por tokens e `classNames` semânticos, nunca por `.ant-*`.

15. **Uma região quebrada não pode levar o app.** Erros de render não capturados derrubam a UI;
    boundaries não pegam erro assíncrono ([React](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)).
    _Implicação:_ boundary por região (Sider, Header, rota, editor, desenho, terminal, float) com `Result` + "Tentar de novo"; `showBoundary` para erros de IPC; `render-process-gone` tratado no main.

## Recomendações-resumo para o guia de design

- **Paleta**: neutros OKLCH com matiz ≈ 282 e croma baixo; marca em 10 tons a partir de
  `#705EFF`; funcionais separados do roxo; 6 tokens de status com ícone. Tokens únicos em CSS
  variables lidos por antd, Tailwind, Tiptap, Excalidraw, xterm e gráficos.
- **Tipografia**: Denk One só no logo. Uma fonte de UI legível empacotada localmente (o app é
  offline e a CSP bloqueia fontes remotas), no padrão de Inter/Inter Display que o Linear usa;
  números tabulares no timer; fonte mono para terminal e código (`fontFamilyCode`). Corpo em 14 px
  (o padrão do antd), nada abaixo de 12 px, sobretudo no escuro.
- **Densidade**: padrão médio (`controlHeight` 32) com opção Compacta; linha de task enxuta,
  metadados secundários em texto, não em badges.
- **Navegação**: `Layout.Sider` persistente e recolhível em todas as rotas; abas de status
  adaptativas; paleta de comandos; captura rápida.
- **AppShell**: `ConfigProvider` → `App` → boundary raiz → `Layout` com boundaries por região;
  breakpoints do antd para a casca e container queries para os componentes; `minWidth` da janela
  reduzido para a meta de ~360 px.
