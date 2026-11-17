---
name: design-crafytask
description: Direção de design do CrafyTask. Use antes de mexer em qualquer tela, componente visual, cor, fonte, espaçamento, tema escuro ou layout responsivo do renderer; ao executar uma subtarefa da refatoração visual para Ant Design; ao mudar a identidade visual; e quando pedirem para conferir se o protótipo foi implementado ("auditar design", "o que falta do protótipo", "design:audit").
---

# Direção de design do CrafyTask

Esta skill constrói e mantém a identidade visual do CrafyTask. Ela vale só para este repositório.

## Fontes da verdade (nesta ordem)

1. `docs/design/guia-de-design.md` — regras: paleta, tipografia, densidade, shell, responsividade, tema escuro, componentes antd e o que é proibido.
2. `docs/design/prototipo/index.html` — o protótipo navegável (publicado no link em `checklist.json`). Mostra como as regras ficam juntas.
3. `docs/design/prototipo/checklist.json` — o que do protótipo precisa existir no código, por fase.
4. `docs/design/plano-de-refatoracao.md` — ordem das fases e o que cada uma entrega.
5. `docs/design/pesquisa/` — por que cada regra existe. Leia quando for propor mudança de regra.
6. `docs/ui/` — como a interface atual funciona. Leia a tela antes de mexer nela (regra do CLAUDE.md).

Se código e guia discordam, o guia vence. Se o guia está errado, mude o guia primeiro (veja "Manter").

## Construir: ao mexer em tela ou componente

1. Leia a seção do guia que trata do elemento e a tela correspondente em `docs/ui/`.
2. Use componente do Ant Design antes de escrever um. Só crie componente próprio quando o antd não tiver equivalente, e monte-o sobre os tokens.
3. Cor sempre de token: `theme.useToken()` ou as variáveis CSS do antd (`cssVar`), e as cores de domínio de `src/renderer/src/theme/semantic.ts`. Nada de hex solto em componente nem classe de cor do Tailwind (`bg-slate-*`, `text-blue-*`...).
4. Status, categoria e energia aparecem com ícone e texto, nunca só com cor.
5. Toda região que pode quebrar sozinha (rota, editor Tiptap, Excalidraw, terminal, gráfico) fica dentro de `RegionBoundary`.
6. Pense nas larguras do guia (de 480px até monitor largo). Use `Grid.useBreakpoint()` e `Row`/`Col`/`Flex` do antd. Página usa `h-full`, nunca `h-screen`.
7. Confira os dois temas e as duas densidades pelos tokens. Nada pode ter cor que só funciona num tema.
8. Tempo, ids e contadores usam a fonte mono tabular.
9. Rode `npm run typecheck && npm run lint` e `npm run design:audit -- --fase=<fase>` da fase em que está trabalhando.
10. Peça ao usuário para validar o visual no app rodando (`npm run dev`). Não automatize o navegador. Teste verde não é validação visual.

## Verificar: o protótipo foi implementado?

```bash
npm run design:audit                 # tudo, agrupado por fase
npm run design:audit -- --fase=F2    # uma fase
npm run design:audit -- --pendentes  # só o que falta
npm run design:audit -- --json       # para processar
npm run design:audit -- --strict     # sai com erro se faltar item automático
```

- `✓` passou, `✗` falta, `○` item manual esperando o usuário.
- Itens `manual` só passam quando o usuário confirma o visual. Aí você grava `"validado": "AAAA-MM-DD"` no item do `checklist.json`. Nunca marque sem a confirmação dele.
- Ao relatar, liste o que falta por fase e diga quais itens manuais esperam validação.

## Manter: quando a direção muda

Mudança de regra (nova cor, outro raio, nova tela, novo padrão) atualiza tudo junto, no mesmo PR:

1. `docs/design/guia-de-design.md` — a regra e o motivo (cite a pesquisa quando houver).
2. `src/renderer/src/theme/` — tokens e cores semânticas (quando a fase F0 já existir).
3. `docs/design/prototipo/index.html` — se a mudança é visível, ajuste o protótipo e republique no mesmo artifact (link em `checklist.json`).
4. `docs/design/prototipo/checklist.json` — novo item ou item ajustado, com verificação automática quando der. Rode o script para ver se o item novo funciona.
5. `docs/ui/` — a tela que mudou.

Paleta nova precisa passar contraste WCAG AA (4,5:1 para texto, 3:1 para ícone e borda de controle) nos dois temas. Calcule antes de propor.

## Proibido

- Usar a paleta padrão do antd (azul `#1677ff`) ou deixar `colorPrimary` sem definir.
- Renomear identificadores da era TickTask (ver "Rebrand: só visual" no CLAUDE.md).
- Buscar fonte ou asset remoto: o app é offline e a CSP bloqueia. Fontes vêm de `@fontsource`.
- Efeito global no escopo de módulo sem a guarda de `stores/timerWindow.ts`: as três janelas carregam o mesmo bundle.
- Comentário narrativo no código. A justificativa fica no guia.
