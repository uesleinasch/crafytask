# Identidade visual

Planejamento da refatoração visual do CrafyTask: sair de Tailwind + shadcn para Ant Design com
paleta própria, um AppShell que isola falhas, layout responsivo e modo escuro. Nada aqui está
implementado ainda; o plano diz a ordem.

| Documento                                          | Para que serve                                                                                                              |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [Guia de design](guia-de-design.md)                | As regras: cor, tipografia, forma, shell, responsividade, modo escuro, componentes                                          |
| [Plano de refatoração](plano-de-refatoracao.md)    | Fases F0 a F9, subtarefas, dependências e riscos                                                                            |
| [Protótipo](prototipo/index.html)                  | Página navegável em Ant Design com dados de exemplo ([versão publicada](https://claude.ai/artifact/Vvt5YdciJdFX6ut1sqfbAm)) |
| [Checklist do protótipo](prototipo/checklist.json) | O que do protótipo precisa existir no código, lido pelo `npm run design:audit`                                              |
| [Pesquisa](pesquisa/README.md)                     | Papers, referências de mercado, cor e acessibilidade, Ant Design, resiliência                                               |
| [ADR 0002](../adr/0002-ant-design.md)              | A decisão de adotar o Ant Design                                                                                            |

## Telas do protótipo

| Tela                               | Rota no protótipo       | Seção do guia        | Fase       |
| ---------------------------------- | ----------------------- | -------------------- | ---------- |
| Tarefas (lista, cards, Kanban)     | `#tarefas`              | §8 Tabela de tarefas | F2         |
| Detalhe da tarefa e modo foco      | `#tarefa`               | §7 Detalhe da task   | F3         |
| Hoje                               | `#hoje`                 | §8 Hoje              | F4-a       |
| Calendário                         | `#calendario`           | §8 Calendário        | F4-b       |
| Projetos e detalhe do projeto      | `#projetos`, `#projeto` | §8 Projetos          | F5-a, F5-e |
| Horizontes                         | `#horizontes`           | §8 Horizontes        | F5-b       |
| Revisão semanal                    | `#revisao`              | §8 Revisão semanal   | F5-c       |
| Contextos e tags                   | `#rotulos`              | §8 Contextos e tags  | F6-a       |
| Arquivo                            | `#arquivo`              | §8 Arquivo           | F6-b       |
| Cadernos                           | `#cadernos`             | §8 Cadernos          | F7-a       |
| Dashboard                          | `#dashboard`            | §8 Dashboard         | F7-b       |
| Configurações                      | `#ajustes`              | §8 Configurações     | F7-d1–d3   |
| Identidade visual (paleta e tipos) | `#identidade`           | §3 e §4              | F0         |

Terminal, timer flutuante e captura rápida não têm protótipo: seguem os tokens, o §7 e os
padrões das outras telas.

## Conferir o progresso

```bash
npm run design:audit                 # tudo, por fase
npm run design:audit -- --fase=F1    # uma fase
npm run design:audit -- --pendentes  # só o que falta
npm run design:audit -- --strict     # erro se faltar item automático
```

`✓` passou, `✗` falta, `○` espera o usuário conferir o visual no app, `◆` guarda (o que já existe
e não pode sumir; não conta no progresso).

## Manter a direção

A skill do projeto `design-crafytask` (em `.claude/skills/`) é carregada pelo Claude Code antes de
mexer em qualquer tela. Ela manda seguir o guia, verificar com o script e, quando uma regra muda,
atualizar junto o guia, os tokens, o protótipo, o checklist e `docs/ui/`.
