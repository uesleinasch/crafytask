# Google Calendar

Leva para uma agenda do Google os **blocos de tempo**, as **datas agendadas** e os **prazos** das
tarefas que você escolher. A sincronização vai só do CrafyTask para o Google.

O app cria uma agenda secundária própria, chamada **TickTask**, e só tem permissão sobre as agendas
que ele mesmo criou (escopo `calendar.app.created`): ele não lê nem altera suas outras agendas.

## Configurar (uma vez, uns 10 minutos)

O Google exige que você crie seu próprio cliente OAuth. Em **Configurações → Google Calendar**, o
guia abre cada link no navegador:

1. **Criar um projeto no Google Cloud** — em
   [Novo projeto](https://console.cloud.google.com/projectcreate), entre com a conta cuja agenda vai
   receber os eventos e crie um projeto (por exemplo, `CrafyTask`). Não precisa de faturamento.
2. **Ativar a Google Calendar API** — abra a
   [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
   com o projeto selecionado e clique em **Ativar**.
3. **Branding** — em [Branding](https://console.cloud.google.com/auth/branding), clique em
   **Get started**: nome `CrafyTask`, seu e-mail de suporte, público **External** e seu e-mail de
   contato.

    !!! warning
        Não envie logo: com logo, o Google passa a exigir a verificação do app.

4. **Audience: publicar o app** — em
   [Audience](https://console.cloud.google.com/auth/audience), clique em **Publish app** para o
   status virar *In production*. Não envie para verificação.

    !!! warning
        Em *Testing* o Google derruba o acesso a cada 7 dias. Se não puder publicar, adicione seu
        e-mail em *Test users* e reconecte toda semana.

5. **Criar o client "Desktop app"** — em
   [Clients](https://console.cloud.google.com/auth/clients), clique em **Create client**, escolha
   **Desktop app** (não "Web application") e copie o ID e a chave secreta. Cole **Client ID** e
   **Client Secret** no app e clique em **Salvar credenciais**. O Google mostra a chave secreta
   completa só nessa hora; se perder, gere outra no próprio client.
6. **Conectar** — o navegador abre no login do Google. Na tela "O Google não verificou este app",
   clique em **Avançado** → **Acessar CrafyTask** (ou o nome que você deu no passo 3) e permita o
   acesso à agenda.

## Escolher o que vai para a agenda

A sincronização é **por tarefa**. No detalhe da tarefa, seção **Agenda**, ligue **Google
Calendar**. Desligar apaga os eventos daquela tarefa.

Para cada tarefa marcada:

| No CrafyTask | Na agenda TickTask |
| --- | --- |
| Bloco de tempo | evento com hora |
| Programado para | evento de dia inteiro — ou com hora, se a tarefa tem Início/Fim |
| Prazo | evento de dia inteiro — ou com hora, se o prazo tem hora |
| Tarefa finalizada | o título ganha `✓ ` |
| Tarefa excluída ou desmarcada | os eventos são apagados |

Em **Configurações → Google Calendar** ficam **Sincronização automática** (atualiza a agenda a
cada mudança nas tarefas marcadas), **Ressincronizar todas** e **Desconectar**.

## Limites

- Só envia: editar ou apagar o evento no Google não muda a tarefa (e a próxima sincronização
  recria o evento).
- Desconectar **não** apaga a agenda TickTask no Google.
- O token fica cifrado pelo chaveiro do sistema e **não entra no backup** — em outro computador,
  conecte de novo.
- A agenda continua se chamando **TickTask** para quem já usava a integração.
