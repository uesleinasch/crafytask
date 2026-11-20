# Janelas auxiliares

Duas janelas sem moldura e um ícone de bandeja. As duas janelas carregam **o mesmo bundle do
renderer** que a janela principal, diferenciando-se pelo hash da URL — o que significa que qualquer
efeito colateral executado no escopo de módulo roda três vezes.

As duas seguem o guia de design (§8 "Janelas auxiliares") e o protótipo (`#janelas`): o mesmo
`ThemeProvider` da janela principal, então tema (claro, escuro ou do sistema) e densidade valem para
as três janelas. Nenhuma cor fixa.

## O cartão

As duas são um cartão `.ct-aux-win` (em `main.css`) que ocupa a janela transparente inteira:

- fundo `colorBgElevated`, borda de 1px em `colorBorder` (o `borderStrong` dos tokens), raio 12;
- **sem sombra**: a janela não tem sobra em volta do cartão para desenhá-la; a borda separa o
  cartão do que está atrás. As duas janelas são criadas com `hasShadow: false`;
- a página chama `useAuxWindow()`, que põe a classe `aux-window` no `<body>`. Ela zera o fundo de
  `body` e `#root` e fixa a altura em `100vh`. Sem ela, o fundo do tema aparece nos cantos
  arredondados.

No Electron, clique dentro de uma região de arraste (`-webkit-app-region: drag`) não chega ao
elemento. Por isso o arraste fica só em cabeçalho, linhas e rodapé, e todo `button` dentro deles é
`no-drag` pela própria regra do CSS.

---

# Timer flutuante — `/float`

`src/renderer/src/pages/FloatTimerPage.tsx` · janela criada em `src/main/index.ts`

## Função

Manter os cronômetros visíveis e controláveis quando a janela principal está minimizada ou escondida.

## Quando aparece

Decidido no processo principal, não pelo renderer:

| Evento na janela principal | Efeito |
| --- | --- |
| **Minimizar** | mostra o float **se houver timer rodando** |
| **Fechar** (que na verdade esconde) | idem |
| **Restaurar** | esconde o float |
| **Focar** | esconde o float |

Sem nenhum timer ativo, o float nunca aparece.

## Geometria

| Propriedade | Valor |
| --- | --- |
| Largura | **300px** fixa |
| Altura | `linhas × 44 + 44 (rodapé) + 2 (bordas)`, com no mínimo 1 e **no máximo 5** linhas |
| Posição inicial | canto superior direito da área útil, com 20px de margem |
| Janela | sem moldura, transparente, sempre no topo, fora da barra de tarefas, não redimensionável, arrastável, sem sombra |

Acima de 5 timers a lista rola dentro da altura máxima. A janela só é redimensionada quando o número
de linhas muda — redimensionar a cada tique repintaria a janela transparente sem necessidade.

## Aparência

```
┌──────────────────────────────────────┐
│ ● Nome da tarefa         02:32:10  ⏸ │
│ ● Reunião diária         01:13:00  ⏸ │  ← fundo de time leak
├──────────────────────────────────────┤
│ 2 em andamento     ⏸ Pausar todos  ⤢ │
└──────────────────────────────────────┘
```

### Linha de timer (44px)

- `LiveDot` (ponto verde que pulsa; parado com `prefers-reduced-motion`);
- nome da tarefa como botão sem moldura (`.ct-aux-name`), focável, truncado, que fica na cor
  primária no hover. Tooltip "Abrir a tarefa no CrafyTask"; o clique chama `float:openTask`;
- tempo em Geist Mono tabular, 14/600;
- **Pausar**: botão `text` só com ícone (`Pause`), tooltip "Pausar", `aria-label` "Pausar <nome>".
  Sem vermelho, como na pílula de timers do header.

Tarefa de categoria `time_leak` ganha o fundo do nível (`timeLeakBackground`), com os mesmos
limiares da lista: `useTimeLeakThresholds()`, das preferências de fluxo de trabalho.

### Rodapé (44px)

Fundo `colorBgContainer`, borda de cima em `colorBorderSecondary`:

- esquerda: "N em andamento";
- **Pausar todos** (`Pause` + texto), só com mais de um timer;
- **Abrir CrafyTask**: botão-ícone (`Maximize2`) com tooltip; chama `float:restore`.

### Estado de espera

Antes do primeiro `float:update`, uma linha "Carregando os timers…" em texto secundário.

## Comunicação

O float **não consulta o banco**. Ele escuta dois eventos vindos do processo principal:

- `float:update` — lista de `FloatTimerData` (`{ taskId, taskName, category, seconds }`, em
  `shared/types.ts`), emitida a cada tique pelo `timerStore` da janela principal. A categoria serve
  ao nível de time leak;
- `float:clear` — limpa a lista.

E emite quatro comandos:

| Canal | Efeito |
| --- | --- |
| `float:restore` | mostra a janela principal (restaura, mostra e foca, mesmo escondida na bandeja) |
| `float:openTask(taskId)` | mostra a janela principal e manda `app:navigate` com `/task/<id>`; o `useShellEvents` navega |
| `float:stopTimer(taskId)` | pausa o timer da tarefa |
| `float:stopAll` | pausa todos |

Mostrar a janela principal a foca, e o foco esconde o float.

Consequência: se a janela principal for fechada de fato (não escondida), o float congela.

---

# Captura rápida — `/quick-capture`

`src/renderer/src/pages/QuickCapturePage.tsx`

## Função

Capturar um pensamento para o Inbox em poucos segundos, sem trocar de aplicativo — o gesto que
sustenta o "mind like water" do GTD.

## Como abre

- **Atalho global**, `Ctrl/Cmd + Shift + Space` por padrão, trocado em Configurações → Geral
  (`app_prefs`). Em X11 o app registra no `globalShortcut`; no GNOME com Wayland vira um atalho
  personalizado do GNOME que roda o app com `--quick-capture`;
- item **"Captura rápida"** no menu da bandeja.

## Geometria

400×140, centrada horizontalmente e posicionada a 1/3 da altura da tela. Sem moldura, transparente,
sempre no topo, fora da barra de tarefas, sem sombra. **Fecha ao perder o foco** (no main) e com
`Esc` (no renderer, em qualquer ponto da janela).

## Aparência

```
┌────────────────────────────────────────────┐
│ 📥 Capturar para o Inbox                ×  │  ← 36px, arrasta
│ [O que precisa ser feito?                ] │
│ Enter captura · Esc fecha       [Capturar] │
└────────────────────────────────────────────┘
```

- **Cabeçalho (36px):** `Inbox` em `colorTextTertiary` + "Capturar para o Inbox" em negrito;
  fechar à direita (`X`, botão `text` só com ícone, tooltip "Fechar (Esc)"). É a única área de
  arraste.
- **Campo:** `Input` do antd, grande (médio na densidade compacta), placeholder e `aria-label`
  "O que precisa ser feito?". Foco ao abrir (`autoFocus` e um `focus()` 100ms depois, para quando a
  janela aparece depois de montar).
- **Rodapé:** `Kbd` "Enter captura · Esc fecha" e o primário pequeno **Capturar**, desabilitado com
  o campo vazio e em `loading` enquanto grava.

## Estados

| Estado | O que muda |
| --- | --- |
| Capturado | o corpo vira `CircleCheck` em `colorSuccess`, "Capturado no Inbox" e o texto em cinza (`role="status"`); a janela fecha sozinha em **1,2 s** |
| Erro | o texto fica no campo (`status="error"`) e o rodapé troca as teclas por "Não foi possível capturar. Tente de novo." em `danger` (`role="alert"`), sem mudar a altura. Digitar volta ao normal |

O `quickCapture:capture` não fecha mais a janela: quem fecha é o renderer, depois da confirmação.

## O que a captura cria

Uma tarefa apenas com o nome, status `inbox` e categoria padrão. Sem projeto, contexto, prazo ou
tag — o processamento fica para depois, como manda o método.

A criação emite `tasks:refresh`, então a lista de tarefas da janela principal se atualiza sozinha,
e mostra uma notificação do sistema.

---

# Ícone de bandeja

`src/main/tray.ts`

Ícone de 32px com tooltip "CrafyTask". Menu de contexto:

| Item | Ação |
| --- | --- |
| Abrir CrafyTask | restaura e foca a janela principal (e esconde o float) |
| Captura rápida | abre a janela de captura |
| — | separador |
| Sair | encerra o app de fato |

Clique simples no ícone equivale a "Abrir CrafyTask".

A bandeja é o que sustenta dois comportamentos que a interface principal não explica:

1. **Fechar a janela não encerra o app** — o único aviso está numa nota de rodapé em `/settings`.
2. **Com a inicialização automática ligada, o app sobe direto na bandeja**, sem abrir janela.
