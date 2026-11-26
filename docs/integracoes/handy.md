# Ditado (Handy)

O [Handy](https://github.com/cjpais/Handy) é um app de código aberto que transcreve a sua fala no
próprio computador, sem mandar áudio para fora. O CrafyTask instala, liga e atualiza o Handy por
você e recebe o texto ditado: você aperta o atalho, fala, aperta de novo, e o texto aparece no
campo em que o cursor está — nome da tarefa, notas, captura rápida, busca, terminal.

Fica em **Configurações → Integrações → Ditado (Handy)**. Só no Linux (x86_64 e ARM64).

## Como ligar

1. **Instalar** baixa a versão oficial mais recente do Handy no GitHub (cerca de 120 MB). Antes de
   rodar qualquer coisa, o CrafyTask confere a assinatura do arquivo com a chave pública que o
   próprio Handy usa nas atualizações; se não bater, nada é instalado.
2. Ligue **Ditado por voz**. Na primeira vez a janela do Handy abre para você escolher o modelo de
   transcrição (o download do modelo é feito pelo Handy) e liberar o microfone.
3. Use o atalho **Ditar** (padrão `Ctrl+Alt+Espaço`): aperte para começar a falar e de novo para
   parar. **Definir atalho** troca a combinação.

Com outro programa em foco, o texto vai para a área de transferência e um aviso diz para colar com
`Ctrl+V`.

## O que o CrafyTask ajusta no Handy

O resto da configuração (modelo, microfone, idioma, sons, pós-processamento) é do Handy: **Abrir o
Handy** abre a janela dele. Para o texto chegar ao CrafyTask, alguns ajustes são refeitos a cada vez
que o Handy é iniciado pelo CrafyTask:

| Ajuste do Handy | Valor | Por quê |
| --- | --- | --- |
| Método de colar | script externo do CrafyTask | o texto é entregue ao CrafyTask, que digita no campo |
| Enviar Enter após colar | desligado | o Enter chegaria antes do texto |
| Iniciar com o sistema | desligado | o CrafyTask é que inicia o Handy |
| Procurar atualizações | desligado | a atualização é feita em Configurações |
| Atalho de transcrever | o atalho **Ditar** | uma combinação só nos dois apps |

## Atualizar

**Procurar atualização** consulta a última release do Handy no GitHub; havendo versão nova, o botão
vira **Atualizar**, que baixa, confere a assinatura e troca a versão instalada, reiniciando o Handy
se ele estava ligado. Nada do Handy é modificado: o CrafyTask usa o pacote oficial e as interfaces
públicas dele (opções de linha de comando e configurações), então cada versão nova funciona sem
mudança no CrafyTask.

## Desligar e remover

Desligar **Ditado por voz** fecha o Handy e remove o atalho. Os arquivos do Handy ficam na pasta de
dados do CrafyTask (`handy/`); os modelos e o histórico ficam na pasta do próprio Handy
(`~/.local/share/com.pais.handy`).
