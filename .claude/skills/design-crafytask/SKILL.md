---
name: design-crafytask
description: Direção de design do CrafyTask. Use antes de mexer em qualquer tela, componente visual, cor, fonte, espaçamento, gráfico, tema escuro ou layout responsivo do renderer; ao executar uma subtarefa da refatoração visual para Ant Design (F0–F9); ao mudar a identidade visual; e quando pedirem para conferir se o protótipo foi implementado ("auditar design", "o que falta do protótipo", "design:audit").
---

# Direção de design do CrafyTask

Esta skill constrói e mantém a identidade visual do CrafyTask. Ela vale só para este repositório.

## Fontes da verdade

1. `docs/design/prototipo/index.html` — o protótipo navegável que o usuário aprovou (publicado no link em `checklist.json`). Mostra como as regras ficam juntas, tela por tela.
2. `docs/design/guia-de-design.md` — as regras: paleta, tipografia, forma, ícones, shell, telas, modo escuro, componentes antd e o que é proibido.
3. `docs/design/plano-de-refatoracao.md` — fases, subtarefas (uma por PR), onde o código mora e o que cada subtarefa fecha.
4. `docs/design/prototipo/checklist.json` — o que do protótipo precisa existir no código, conferido por `npm run design:audit`.
5. `docs/design/index.md` e `docs/adr/0002-ant-design.md` — visão geral e a decisão de usar o antd.
6. `docs/design/pesquisa/` — por que cada regra existe. Leia ao propor mudança de regra.
7. `docs/ui/` — como a interface **atual** funciona (legado). Leia a tela antes de mexer nela; `docs/ui/14-design-tokens.md` descreve as cores antigas, não as novas.

Desempate: guia e protótipo discordando, vale o protótipo e o guia é corrigido no mesmo PR. Código e guia discordando, vale o guia.

## Onde está cada tela no guia

- §3 Cor (base, domínio GTD, time leak, energia, gráficos), §4 Tipografia, §5 Forma, §6 Ícones.
- §7 AppShell: sidebar, Header, paleta Ctrl+K, barra de status, RegionBoundary, modo foco, detalhe da task.
- §8 Responsividade e telas: Tabela de tarefas, Projetos (lista e detalhe), Horizontes, Contextos e tags, Configurações, Arquivo, Hoje, Calendário, Revisão semanal, Dashboard.
- §9 Modo escuro, §10 componentes atuais → antd, §11 padrões de tela, §14 proibido.
- Cadernos, Terminal, timer flutuante e captura rápida não têm protótipo: seguem tokens, §7 e os padrões das outras telas.

## Construir: ao mexer em tela ou componente

1. Leia a seção do guia da tela, a tela no protótipo e o doc dela em `docs/ui/`. Use as pastas de "Onde o código mora" do plano.
2. Use componente do Ant Design antes de escrever um. Só crie componente próprio quando o antd não tiver equivalente, e monte-o sobre os tokens.
3. Cor sempre de token: `theme.useToken()`, as variáveis CSS do antd (`cssVar`) e as cores de domínio de `src/renderer/src/theme/semantic.ts`. Nada de hex solto nem classe de cor do Tailwind.
4. Ícones são **lucide** (`lucide-react`), com os nomes do guia §6/§7. O protótipo usa `@ant-design/icons` só porque roda de CDN: não copie esses imports.
5. Status, categoria e energia aparecem com ícone e texto, nunca só com cor.
6. Toda região que pode quebrar sozinha (rota, editor Tiptap, Excalidraw, terminal, cada gráfico) fica dentro de `RegionBoundary`.
7. Pense nas larguras do guia (de 400px até monitor largo). Use `Grid.useBreakpoint()` e `Row`/`Col`/`Flex`. Página usa `h-full`, nunca `h-screen`.
8. Confira os dois temas e as duas densidades pelos tokens. Nada pode ter cor que só funciona num tema.
9. Tempo, ids e contadores usam Geist Mono tabular; números de painel (dashboard) usam Geist proporcional.
10. Gráfico novo ou paleta nova: carregue a skill `dataviz` e rode o `validate_palette.js` dela nos dois temas, com as superfícies do guia. Barra ordenada no lugar de pizza, rosca ou funil.
11. Rode `npm run typecheck && npm run lint && npm run test` e `npm run design:audit -- --fase=<fase>`.
12. Antes de abrir o PR, rode o agente `design-reviewer` (`.claude/agents/design-reviewer.md`) sobre o diff da branch e trate o que ele apontar. Recurso do protótipo que não existe no código nem tem subtarefa vira subtarefa nova do épico #745 no CrafyTask.
13. Peça ao usuário para validar o visual no app rodando (`npm run dev`). Não automatize o navegador. Teste verde não é validação visual.

## Verificar: o protótipo foi implementado?

```bash
npm run design:audit                 # tudo, agrupado por fase
npm run design:audit -- --fase=F2    # uma fase
npm run design:audit -- --pendentes  # só o que falta (vale também com --json)
npm run design:audit -- --json       # para processar
npm run design:audit -- --strict     # sai com erro 1 se faltar item automático
```

- `✓` passou, `✗` falta, `○` item manual esperando o usuário, `◆` guarda (algo que já existe e não pode sumir; não conta no progresso).
- `checklist.json` inválido (chave errada, regex quebrada, `validado` fora de `AAAA-MM-DD`) sai com erro 2 antes de auditar.
- Itens `manual` só passam quando o usuário confirma o visual. Aí você grava `"validado": "AAAA-MM-DD"` no item. Nunca marque sem a confirmação dele. `--strict` não falha por item manual.
- Ao relatar, liste o que falta por fase e diga quais itens manuais esperam validação.

## Manter: quando a direção muda

Mudança de regra (nova cor, outro raio, nova tela, novo padrão) atualiza tudo junto, no mesmo PR:

1. `docs/design/guia-de-design.md` — a regra e o motivo (cite a pesquisa quando houver).
2. `src/renderer/src/theme/` — tokens e cores semânticas (quando a fase F0 já existir).
3. `docs/design/prototipo/index.html` — se a mudança é visível, ajuste o protótipo e republique no mesmo artifact (link em `checklist.json`).
4. `docs/design/prototipo/checklist.json` — item novo ou ajustado, com verificação automática quando der; cite o id na coluna "Fecha" do plano. Rode o script para ver se o item funciona e se não passa por engano no código atual.
5. `docs/design/plano-de-refatoracao.md` e a subtarefa correspondente no CrafyTask (#745).
6. `docs/ui/` — a tela que mudou, quando o código mudar.

Paleta nova precisa passar contraste WCAG AA (4,5:1 para texto, 3:1 para ícone e borda de controle) nos dois temas. Calcule antes de propor.

## Proibido (espelha o §14 do guia)

- Paleta padrão do antd (azul `#1677ff`) ou `colorPrimary` sem definir; cor de marca como fundo decorativo; gradiente decorativo.
- Hex solto e classe de cor do Tailwind em componente.
- CSS mirando classes internas `.ant-*`; customize por token, `classNames` e `styles`.
- `message`, `Modal.confirm` e `notification` estáticos: use `App.useApp()`.
- Pizza, rosca e funil; status, categoria ou energia como cor de série de gráfico.
- Status só com cor; vermelho fora de erro e prazo vencido.
- `h-screen` em página; fonte ou asset remoto (o app é offline e a CSP bloqueia; fontes vêm de `@fontsource`).
- Renomear identificadores da era TickTask (ver "Rebrand: só visual" no CLAUDE.md).
- Efeito global no escopo de módulo sem a guarda de `stores/timerWindow.ts`: as três janelas carregam o mesmo bundle.
- Comentário narrativo no código. A justificativa fica no guia.
