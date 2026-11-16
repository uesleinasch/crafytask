# Terminal embutido

Cada tarefa pode ter um **diretório de trabalho** e um **comando inicial**. O terminal abre um
painel no rodapé da janela, no estilo do VS Code, já naquela pasta e digita o comando. É útil para
tarefas de desenvolvimento: abrir a tarefa, abrir o terminal e o projeto já está rodando.

## Configurar uma tarefa

1. No detalhe da tarefa, em **Diretório de trabalho**, clique em **Escolher** e selecione a pasta.
2. Opcional: em **Comando ao abrir o terminal**, informe o comando (por exemplo, `npm run dev` ou
   `claude`).
3. Clique no botão laranja **Terminal**, ao lado de **Notas**.

Esses dois campos ficam só no seu computador: não vão para o Notion nem para o Jira.

## Usar o painel

| Ação | Como |
| --- | --- |
| Mostrar / esconder o painel | `Ctrl + '` (a tecla à esquerda do 1; no teclado US, `` Ctrl + ` ``) ou o botão laranja na barra superior |
| Tela cheia | `Ctrl + Shift + '` ou o botão `⤢` |
| Nova sessão da mesma tarefa | `+` |
| Dividir lado a lado | botão **Dividir**; botão direito numa aba → **Abrir à direita** |
| Renomear a aba | duplo clique no nome (ou botão direito → **Renomear**) |
| Cor e ícone da aba | botão direito → **Cor ▸** / **Ícone ▸** |
| Encerrar a sessão | `×` na aba (pede confirmação se há processo rodando) |
| Reiniciar uma sessão encerrada | **Reiniciar** |
| Nova linha sem enviar | `Shift + Enter` (útil no Claude Code e em outros programas de terminal) |

Esconder o painel não mata nada: as sessões continuam rodando, inclusive com a janela fechada na
bandeja, e ao voltar o painel reexibe a saída recente. Uma aba com ponto laranja tem um processo
em execução; riscada, o processo terminou.

As sessões terminam quando você sai do app (**Sair** na bandeja) ou quando a tarefa é excluída.

## Preferências

Em **Configurações → Geral → Terminal**:

- **Shell** — em branco usa o `$SHELL` do sistema.
- **Iniciar o timer no primeiro comando** — o primeiro `Enter` de cada sessão inicia o timer da
  tarefa, se ele não estiver rodando. Um aviso oferece **Parar**.
