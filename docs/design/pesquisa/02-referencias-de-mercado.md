# Referências de mercado: padrões dos apps de produtividade

Padrões observados em apps de tarefas/produtividade e em guias de UX (NN/g, Material, Linear,
Refactoring UI). Para cada um: o que é, a fonte e se o CrafyTask deve **adotar**, **adaptar** ou
**evitar**.

## 1. Captura rápida em qualquer lugar

- **Things 3**: _Quick Entry_ abre por atalho global (`Ctrl Space` por padrão) sem sair do app
  atual; `Esc` descarta, `⌘ Return` salva e fecha. A variante _Autofill_ guarda o link do conteúdo
  que estava aberto ([Cultured Code](https://culturedcode.com/things/support/articles/2249437/)).
- **Todoist**: _Quick Add_ com linguagem natural para datas ("tomorrow at 4 PM") e símbolos:
  `#` projeto, `/` seção, `%` rótulo, `p1`–`p3` prioridade, `!` lembrete; atalho `Q` no app e
  atalho global no desktop ([Todoist](https://www.todoist.com/help/articles/use-task-quick-add-in-todoist-va4Lhpzz)).
- **Akiflow**: _command bar_ global (`Ctrl+E` por padrão) e `Ctrl+K` dentro do app; Enter manda
  para o inbox ([Akiflow](https://product.akiflow.com/articles/6483573-command-bar)).

**Para o CrafyTask — adotar e expandir.** Já existe `Ctrl+Shift+Space`. Vale adicionar sintaxe
inline compatível com o vocabulário GTD (`@contexto`, `#projeto`, datas em pt-BR), com prévia dos
tokens reconhecidos como chips antes de salvar. A ciência por trás está em
[01-gtd-e-cognicao.md](01-gtd-e-cognicao.md) (Bellotti: o problema é o esforço).

## 2. Teclado primeiro e paleta de comandos

- A heurística 7 de Nielsen ("Flexibility and efficiency of use") defende atalhos escondidos do
  novato que aceleram o especialista ([NN/g](https://www.nngroup.com/articles/ten-usability-heuristics/)).
- Akiflow: `T` abre Hoje, `I` abre o Inbox ([Akiflow](https://akiflow.com/features/keyboard-shortcuts/)).
- Linear redesenhou o app pensando em Electron e browser ao mesmo tempo, e alinhou rótulos,
  ícones e botões da barra lateral para reduzir ruído
  ([Linear](https://linear.app/blog/how-we-redesigned-the-linear-ui)).

**Adotar.** Paleta `Ctrl+K` com: navegar para telas, buscar tasks/páginas, ações sobre a task em
foco (mudar status, iniciar timer, mover de projeto). Atalhos de letra única para navegação com
uma folha de atalhos em `?`. O antd não tem componente de paleta de comandos; é componente
próprio sobre `Modal` + `Input` + lista (ver [04-ant-design.md](04-ant-design.md)).

## 3. Perspectivas: a mesma base, várias visões

- **OmniFocus**: perspectivas padrão Inbox, Projects, Tags (contextos), Forecast (datas junto da
  agenda), Flagged, Review e perspectivas personalizadas
  ([Omni Group](https://support.omnigroup.com/documentation/omnifocus/mac/4.0/en/perspectives/)).
- **Bellotti et al. (2004)** pedem visões de dia, semana e projeto, com filtros e ordenação
  ([DOI](https://doi.org/10.1145/985692.985785)).

**Adaptar.** O CrafyTask já tem lista, plano do dia, calendário, projetos, horizontes e revisão.
A refatoração deve dar a essas telas a **mesma linguagem** (mesmo item de task, mesmo menu de
ações, mesmos filtros) para que trocar de visão não custe reaprender. Filtros salvos ("minhas
perspectivas") são um passo natural depois.

## 4. Planejamento diário e timeboxing

- **Sunsama**: ritual de planejamento diário em passos (dizer o que importa, montar o dia, revisar
  e travar), estimativas de tempo por tarefa, blocos protegidos na agenda e horário de fim do dia
  ([Sunsama](https://www.sunsama.com/features/daily-planning)).
- **TickTick**: timer Pomodoro/foco ligado à task e Matriz de Eisenhower, ambos desligados por
  padrão e ativados nas configurações ([central de ajuda](https://help.ticktick.com/);
  [análise da AppleInsider](https://appleinsider.com/articles/23/01/10/ticktick-6420-review-prioritized-to-do-list-with-focus-timer)).

**Adaptar.** O plano do dia é o "plano específico" que Masicampo e Baumeister mostram liberar a
mente. Vale mostrar a soma das estimativas contra as horas livres do dia e avisar (sem alarme
vermelho) quando o plano não cabe. Recursos avançados (matriz, pomodoro) atrás de opção, como no
TickTick, para não poluir a tela padrão.

## 5. Revisão semanal guiada

- OmniFocus tem a perspectiva **Review** para checar o andamento dos projetos
  ([Omni Group](https://support.omnigroup.com/documentation/omnifocus/mac/4.0/en/perspectives/)).
- Heylighen e Vidal: o controle volta quando a revisão é semanal e sistemática
  ([pré-print](http://pespmc1.vub.ac.be/Papers/GTD-cognition.pdf)).

**Adotar.** Usar `Steps` do antd para o fluxo de revisão, com progresso e "retomar de onde parei".

## 6. Densidade e ruído visual

- **Linear (2024)**: o redesenho buscou "reduzir ruído visual" na barra lateral, abas, cabeçalhos
  e painéis, aumentar a hierarquia e a densidade da navegação e **limitar a cor da marca** no
  chrome, por um visual mais neutro. O tema claro e o escuro passaram a sair de 3 variáveis (cor
  base, cor de destaque, contraste) em LCH, e a hierarquia de superfícies vem de níveis de
  elevação ([Linear](https://linear.app/blog/how-we-redesigned-the-linear-ui)). Tipografia:
  Inter Display nos títulos, Inter no corpo (mesma fonte).
- **Matthew Ström, "UI Density"**: densidade é o **valor** entregue dividido pelo tempo e espaço
  que a interface ocupa; distingue densidade visual, de informação, de design e temporal
  ([artigo](https://mattstromawn.com/writing/ui-density/)). A densidade temporal (velocidade)
  conta tanto quanto a visual.
- **Refactoring UI**: precisa de mais cinzas do que parece (8–10 tons), 5–10 tons por cor
  primária/destaque, e não gerar tons com `lighten()`/`darken()` na hora
  ([Refactoring UI](https://www.refactoringui.com/previews/building-your-color-palette)).

**Adotar.** Usuário que passa o dia no app pede densidade média-alta e chrome neutro. Cor de marca
só em ação primária, seleção e foco. Oferecer densidade "Confortável/Compacta" (o antd tem
`compactAlgorithm`).

## 7. Abas, segmented e navegação

**NN/g, "Tabs, Used Right"** (Evan Sunwall, 2024) — [artigo](https://www.nngroup.com/articles/tabs-used-right/):

- Quanto menos abas, melhor; rótulos curtos (1–2 palavras) e em linguagem simples.
- Não misturar abas de navegação com abas de conteúdo no mesmo controle.
- Pelo menos **dois indicadores** na aba selecionada (ex.: sublinhado + negrito); abas não
  selecionadas legíveis.
- **Uma linha só**; abas que transbordam para carrossel/menu perdem descoberta.
- Abas não servem quando a pessoa precisa **comparar** conteúdo entre elas.

O próprio antd separa: `Tabs` comum "para aspectos funcionais de uma página", `Tabs` tipo card
para muitas visões fecháveis e botões de rádio para abas secundárias
([antd Tabs](https://ant.design/components/tabs)); `Segmented` é para escolher uma opção entre
várias quando a troca muda o conteúdo de uma área ([antd Segmented](https://ant.design/components/segmented)).

**Para as abas de status do CrafyTask (6 status):**

- Seis abas com contagem estão no limite. Em largura ampla, `Tabs` com contagem discreta e dois
  indicadores de seleção. Abaixo de ~`md`, trocar para `Segmented` só com ícones + tooltip, ou um
  `Select`, em vez de deixar o `Tabs` cair no menu de overflow (que a NN/g desaconselha).
- Status também é **dado da task** (badge/tag), então a aba e o badge devem usar o mesmo par
  ícone + cor + rótulo.

## 8. Estados vazios, indicadores e notificações

- **NN/g, estados vazios** (Kate Kaplan, 2021): usar o estado vazio para (1) comunicar o status do
  sistema (carregando, erro ou realmente vazio), (2) dar dicas de aprendizado e (3) oferecer o
  caminho direto para a tarefa principal ([artigo](https://www.nngroup.com/articles/empty-state-interface-design/)).
- **NN/g, indicadores × validações × notificações** (Kim Flaherty, 2024): indicadores são
  passivos e ficam perto do elemento; notificações que exigem ação podem ser intrusivas; toast
  serve para aviso passivo e é ruim para erro
  ([artigo](https://www.nngroup.com/articles/indicators-validations-notifications/)).

**Adotar.** Inbox vazio é uma vitória ("inbox zero"), não um erro: mensagem positiva e o atalho de
captura. Lista filtrada vazia diz qual filtro esconde as tasks e oferece "limpar filtros". Sync do
Notion/Google/Jira: indicador passivo na barra de status; só erro que exige ação vira
`notification` com botão.

## 9. Dashboard

**NN/g, "Dashboards: Making Charts and Graphs Easier to Understand"**: dashboards são para leitura
rápida; comprimento e posição 2D são os atributos pré-atentivos mais precisos para quantidade;
área e ângulo são piores; cor serve para destacar
([artigo](https://www.nngroup.com/articles/dashboards-preattentive/)).

**Adotar.** Barras e linhas em vez de pizza/rosca; uma cor neutra para a série e a cor de marca
só para o destaque. Enquadramento positivo do tempo (ver TimeAware em
[01-gtd-e-cognicao.md](01-gtd-e-cognicao.md)).

## 10. O que evitar

| Padrão                                                         | Por quê                                                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Gamificação agressiva (sequências, vermelho para meta perdida) | Enquadramento negativo aumenta estresse (Kim et al., 2016)                                  |
| Toasts para tudo                                               | Notificação passiva já custa atenção (Stothart et al., 2015); toast é ruim para erro (NN/g) |
| Muitas abas ou abas que transbordam                            | NN/g, "Tabs, Used Right"                                                                    |
| Badges coloridos em todo metadado                              | Cor guia a atenção (Wolfe e Horowitz, 2004); se tudo tem cor, nada se destaca               |
| Recursos avançados ligados por padrão                          | TickTick deixa matriz e pomodoro opt-in; Bellotti: o custo é o esforço                      |
| Cara padrão do framework                                       | Ver [04-ant-design.md](04-ant-design.md): tokens + semantic `classNames`                    |
