# Cor, acessibilidade e modo escuro

Regras para montar a paleta própria do CrafyTask e o modo escuro. Os números de contraste da
seção 4 foram calculados nesta pesquisa (fórmula de luminância relativa da WCAG 2.x e conversão
sRGB → OKLCH); confira com uma ferramenta antes de fixar os tokens.

## 1. O que a WCAG 2.2 exige

A WCAG 2.2 é Recomendação W3C desde 12/12/2024 ([W3C](https://www.w3.org/TR/WCAG22/)).

| Critério                     | Nível | Regra                                                                                                                          |
| ---------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1.4.1 Uso de cor             | A     | Cor não pode ser o **único** meio de passar informação                                                                         |
| 1.4.3 Contraste mínimo       | AA    | Texto ≥ **4.5:1** (texto grande ≥ 3:1)                                                                                         |
| 1.4.6 Contraste melhorado    | AAA   | Texto ≥ 7:1                                                                                                                    |
| 1.4.11 Contraste não textual | AA    | Componentes de UI e gráficos ≥ **3:1** contra a cor vizinha                                                                    |
| 1.4.10 Reflow                | AA    | Sem rolagem em duas direções (referência: 320 px de largura)                                                                   |
| 2.4.7 Foco visível           | AA    | Indicador de foco visível para teclado                                                                                         |
| 2.4.11 Foco não encoberto    | AA    | O elemento focado não pode ficar totalmente escondido                                                                          |
| 2.5.8 Tamanho de alvo mínimo | AA    | Alvo ≥ **24×24 px** CSS (com exceções) ([Understanding](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)) |
| 2.3.3 Animação por interação | AAA   | Movimento disparado por interação pode ser desligado                                                                           |

**Para o CrafyTask**: meta AA em tudo. Status, prioridade e categoria sempre com **ícone ou
rótulo** além da cor (1.4.1). Bordas de input e ícones de ação ≥ 3:1 (1.4.11). Botões só-ícone
com área ≥ 24 px mesmo na densidade compacta (2.5.8). Respeitar `prefers-reduced-motion`
(o antd aceita `token.motion: false`, ver [04-ant-design.md](04-ant-design.md)).

## 2. APCA: usar como apoio, não como norma

- O APCA mede contraste de luminosidade (Lc) de forma perceptualmente uniforme e é sensível à
  polaridade. Faixas sugeridas: **Lc 90** preferido para texto corrido, **Lc 75** mínimo para
  colunas de texto, **Lc 60** mínimo para outro texto de conteúdo, **Lc 45** para títulos grandes
  e pictogramas finos, **Lc 30** mínimo para qualquer texto e ícones sólidos grandes, **Lc 15**
  limite de "invisível" para não-texto ([APCA in a Nutshell](https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell)).
- O rascunho da WCAG 3 (Working Draft de 10/09/2026) **não** define algoritmo de contraste: o
  texto diz que "o algoritmo de contraste usado na WCAG 3 ainda será determinado"
  ([W3C](https://www.w3.org/TR/wcag-3.0/)).

**Decisão sugerida**: cumprir a WCAG 2.2 AA (normativa) e usar o APCA para ajustar o **modo
escuro**, onde, segundo a documentação do APCA, a fórmula da WCAG 2 superestima o contraste de
cores escuras.

## 3. Construir a paleta em OKLCH

- Em OKLCH, o `L` é luminosidade **percebida**: duas cores com o mesmo `L` parecem igualmente
  claras, o que não acontece no HSL. Isso deixa o contraste previsível e permite gerar paletas
  por fórmula; LCH tem desvio de matiz em azuis/roxos (270–330), o OKLCH não
  ([Evil Martians](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl)).
  **Atenção**: o roxo da marca (`#705EFF`, matiz ≈ 282) cai justo nessa faixa, então use OKLCH,
  não LCH.
- O Linear gera tema claro e escuro a partir de 3 entradas (base, destaque, contraste) em LCH,
  e o contraste vira opção de alto contraste ([Linear](https://linear.app/blog/how-we-redesigned-the-linear-ui)).
- Refactoring UI: 8–10 cinzas, 5–10 tons por cor; não criar tons com `lighten()` na hora
  ([Refactoring UI](https://www.refactoringui.com/previews/building-your-color-palette)).
- O gerador do antd (`@ant-design/colors`) produz 10 tons por cor e tem modo escuro com cor de
  fundo ([GitHub](https://github.com/ant-design/ant-design-colors)); a marca usa o 6º tom como cor
  principal ([antd Colors](https://ant.design/docs/spec/colors)). A documentação não diz que o
  algoritmo é perceptual; por isso a recomendação é **gerar a escala fora do antd (OKLCH) e
  injetar os tons como tokens**, em vez de depender do algoritmo padrão para a cara do app.

### Receita

1. **Neutros** (10–12 tons): croma baixo (≈ 0.005–0.015) puxado para o matiz da marca (≈ 282),
   para o cinza "conversar" com o roxo. Um conjunto para claro e outro para escuro.
2. **Marca** (10 tons): mesmo matiz, `L` de ≈ 0.97 a ≈ 0.32, croma máximo perto do meio e menor
   nas pontas (os extremos saem do gamut sRGB com croma alto).
3. **Funcionais**: sucesso, aviso, erro, informação — cada um com escala própria. Evitar que
   "informação" seja azul parecido com o roxo da marca.
4. **Status GTD**: 6 cores **com ícone e rótulo**. Diferenciar por luminosidade além do matiz,
   para quem tem deficiência vermelho-verde.
5. Validar todas as combinações texto/fundo nos dois temas (AA) e simular daltonismo.

## 4. O roxo `#705EFF` na prática

Cálculos desta pesquisa:

| Cor               | OKLCH (L C H)   | Contraste com branco | Contraste com `#141414` |
| ----------------- | --------------- | -------------------- | ----------------------- |
| `#705EFF` (marca) | 0.592 0.229 282 | **4.44:1**           | 4.15:1                  |
| `#6854F1`         | 0.56 0.224 282  | 5.09:1               | 3.62:1                  |
| `#5D49DF`         | 0.52 0.218 282  | 6.03:1               | 3.06:1                  |
| `#8482F2`         | 0.66 0.162 282  | 3.25:1               | 5.66:1                  |
| `#9798FC`         | 0.72 0.144 282  | 2.56:1               | 7.20:1                  |

Consequências:

- **Texto branco sobre `#705EFF` dá 4.44:1 e não passa AA (4.5:1)** para texto normal. Passa para
  texto grande e para não-texto (3:1). Para botão primário com texto branco no tema claro, usar um
  tom um pouco mais escuro (≈ `L 0.56`, `#6854F1`) ou fixar o texto do botão em ≥ 14 px negrito
  (ainda conta como texto normal pela WCAG; o tom mais escuro é a saída segura).
- **No tema escuro**, a marca pura sobre fundo quase preto fica em ≈ 4.2:1. Para texto/links em
  roxo, usar um tom mais claro e menos saturado (≈ `L 0.66–0.72`). Isso coincide com a regra do
  Material de usar tons dessaturados no escuro (seção 6).
- A cor de logo (`text-brand`) pode continuar `#705EFF`: o logo em Denk One é texto grande.

## 5. Semântica de cor para status e prioridade

- Cor é atributo que guia a atenção ([Wolfe e Horowitz, 2004](https://doi.org/10.1038/nrn1411)).
  Usar cor forte só onde a atenção é desejada.
- Cerca de **8% dos homens** de origem europeia e ≈ 0.4% das mulheres têm deficiência vermelho-
  verde ([Birch, 2012](https://doi.org/10.1364/JOSAA.29.000313)). Num app de uso diário por um dev,
  é probabilidade real.
- NN/g: indicador perto do elemento, ícone + cor para validação
  ([artigo](https://www.nngroup.com/articles/indicators-validations-notifications/)).

Sugestão de papéis (o guia de design decide os valores):

| Status       | Papel visual                       | Observação                                                    |
| ------------ | ---------------------------------- | ------------------------------------------------------------- |
| `inbox`      | neutro                             | Não precisa chamar atenção, só a contagem                     |
| `proximas`   | informativo frio                   | Lista de trabalho                                             |
| `executando` | marca (roxo) + indicador vivo      | O único status "quente"; casa com o timer                     |
| `aguardando` | âmbar                              | Bloqueio externo; atenção moderada                            |
| `someday`    | neutro esmaecido                   | Fora do foco                                                  |
| `finalizada` | verde dessaturado + ícone de check | Texto pode ficar com contraste menor, mas ≥ 4.5:1 se for lido |

Vermelho fica reservado para **erro e prazo vencido**. Prioridade usa ícone/forma (setas, barras)
com pouca cor, para não competir com o status.

Hoje as cores de status estão espalhadas e divergentes (ver `docs/ui/14-design-tokens.md` e
`docs/ui/15-inconsistencias.md`). A refatoração deve ter **uma** tabela de tokens de status usada
por aba, badge, calendário e dashboard.

## 6. Modo escuro: como montar

**Claro ou escuro por padrão?**

- Revisões da literatura mostram que, com visão normal, o desempenho de leitura tende a ser
  melhor em **polaridade positiva** (texto escuro em fundo claro), e a vantagem cresce quando a
  fonte é menor; a NN/g não recomenda escuro como padrão para o público geral, mas recomenda
  **fortemente** oferecer a troca ([NN/g, Budiu 2020](https://www.nngroup.com/articles/dark-mode/)).
- Piepenbrock et al. (2013) acharam vantagem da polaridade positiva em jovens e idosos
  ([DOI](https://doi.org/10.1080/00140139.2013.790485)); em 2014, pupila menor e melhor revisão de
  texto com polaridade positiva, compatível com efeito da luminância da tela
  ([DOI](https://doi.org/10.1080/00140139.2014.948496)).

**Decisão sugerida**: padrão = **seguir o sistema**; opção "Sistema / Claro / Escuro" nas
Configurações. No Electron, `nativeTheme.themeSource` aceita `system`, `light` ou `dark` e faz o
`prefers-color-scheme` do CSS obedecer ([Electron nativeTheme](https://www.electronjs.org/docs/latest/api/native-theme)).

**Regras de construção** (Material Design, tema escuro):

- Fundo base **cinza muito escuro, não preto puro** (o Material usa `#121212`)
  ([codelab Material](https://codelabs.developers.google.com/codelabs/design-material-darktheme/index.html)).
- **Elevação por luminosidade**: quanto mais alta a superfície, mais clara ela fica (overlay
  branco de 0% a 16% no Material), já que sombra quase não aparece no escuro
  ([Material 2, Dark theme](https://m2.material.io/design/color/dark-theme)).
- **Dessaturar** as cores: cores saturadas "vibram" contra fundo escuro e cansam
  ([codelab Material](https://codelabs.developers.google.com/codelabs/design-material-darktheme/index.html)).
- Texto em níveis de ênfase (o Material usa branco a 87%, 60% e 38%), e não branco puro em
  tudo, que ofusca ([codelab Material](https://codelabs.developers.google.com/codelabs/design-material-darktheme/index.html);
  [Google Design](https://design.google/library/material-design-dark-theme)).
- **Não inverter** a paleta clara: o escuro é um tema próprio, com seus tokens de superfície
  (fundo, painel, card, popover, modal), cada um um degrau mais claro.
- Como a vantagem da polaridade positiva cresce com fonte pequena, no escuro evitar texto abaixo
  de 12 px e dar um pouco mais de peso/contraste ao texto secundário.

**No antd**: `theme.darkAlgorithm` deriva os tokens de mapa a partir das sementes; dá para
combinar com `compactAlgorithm` ([antd, Customize Theme](https://ant.design/docs/react/customize-theme)).
O algoritmo escuro é ponto de partida: as superfícies e a escala da marca devem vir dos tokens
próprios desta seção.

## 7. Checklist

- [ ] Texto ≥ 4.5:1 nos dois temas; não-texto ≥ 3:1.
- [ ] Nenhum status/prioridade só por cor.
- [ ] Botão primário com texto branco usando tom ≥ 4.5:1 (não o `#705EFF` puro).
- [ ] Escala de neutros e de marca em OKLCH, 10+ tons, com variante escura dessaturada.
- [ ] Superfícies escuras com elevação por luminosidade.
- [ ] Foco visível com contraste ≥ 3:1 em todo componente (inclusive editor, terminal, Excalidraw).
- [ ] Simulação de protanopia/deuteranopia nas telas de lista, calendário e dashboard.
- [ ] Tema "Sistema/Claro/Escuro" ligado a `nativeTheme.themeSource`.
