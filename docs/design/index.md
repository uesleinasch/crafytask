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

## Conferir o progresso

```bash
npm run design:audit                 # tudo, por fase
npm run design:audit -- --fase=F1    # uma fase
npm run design:audit -- --pendentes  # só o que falta
npm run design:audit -- --strict     # erro se faltar item automático
```

`✓` passou, `✗` falta, `○` espera o usuário conferir o visual no app.

## Manter a direção

A skill do projeto `design-crafytask` (em `.claude/skills/`) é carregada pelo Claude Code antes de
mexer em qualquer tela. Ela manda seguir o guia, verificar com o script e, quando uma regra muda,
atualizar junto o guia, os tokens, o protótipo, o checklist e `docs/ui/`.
