# Google Calendar

Leva para uma agenda do Google os **blocos de tempo**, as **datas agendadas** e os **prazos** das
tarefas que você escolher. A sincronização vai só do CrafyTask para o Google.

O app cria uma agenda secundária própria, chamada **TickTask**, e só tem permissão sobre as agendas
que ele mesmo criou (escopo `calendar.app.created`): ele não lê nem altera suas outras agendas.

## Conectar

Em **Configurações → Google**, clique em **Conectar com Google**. O navegador abre no login do
Google: entre com a conta cuja agenda vai receber os eventos e permita o acesso à agenda. Na tela
"O Google não verificou este app", clique em **Avançado** → **Acessar CrafyTask**.

Conectado, a seção mostra a conta e as **Permissões**:

- **Agenda** — a agenda TickTask (escopo `calendar.app.created`).
- **Google Drive** — clique em **Permitir** quando quiser. O app só vê os arquivos que ele mesmo
  criar no seu Drive (escopo `drive.file`).

Para tirar uma permissão, desconecte a conta: o Google revoga o acesso todo de uma vez. A
[política de privacidade](../privacidade.md) diz o que o app faz com cada permissão.

### Usar um cliente OAuth próprio

Quem prefere um projeto seu no Google Cloud abre **Avançado: usar um cliente OAuth próprio** na
mesma seção. O guia passa por:

1. **Criar um projeto no Google Cloud** — em
   [Novo projeto](https://console.cloud.google.com/projectcreate). Não precisa de faturamento.
2. **Ativar as APIs** — a
   [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
   e, para o Drive, a [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com).
3. **Branding** — em [Branding](https://console.cloud.google.com/auth/branding): nome, e-mail de
   suporte, público **External**, e-mail de contato, página inicial, política de privacidade e
   domínio autorizado.

    !!! warning
        Não envie logo: com logo, o Google passa a exigir a verificação do app.

4. **Audience: publicar o app** — em
   [Audience](https://console.cloud.google.com/auth/audience), clique em **Publish app** para o
   status virar *In production*. Não envie para verificação.

    !!! warning
        Em *Testing* o Google derruba o acesso a cada 7 dias.

5. **Criar o client "Desktop app"** — em
   [Clients](https://console.cloud.google.com/auth/clients), escolha **Desktop app**, copie o ID e
   a chave secreta e cole no app. O Google mostra a chave secreta completa só nessa hora.
6. **Conectar com o cliente próprio**.

Trocar entre o cliente do CrafyTask e um próprio desconecta a conta e cria uma agenda TickTask
nova: cada cliente só enxerga a agenda que ele mesmo criou.

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

Em **Configurações → Google**, card **Agenda TickTask**, ficam **Sincronização automática** (atualiza a agenda a
cada mudança nas tarefas marcadas) e **Ressincronizar todas**.

## Limites

- Só envia: editar ou apagar o evento no Google não muda a tarefa (e a próxima sincronização
  recria o evento).
- Desconectar **não** apaga a agenda TickTask no Google.
- O token fica cifrado pelo chaveiro do sistema e **não entra no backup** — em outro computador,
  conecte de novo.
- A agenda continua se chamando **TickTask** para quem já usava a integração.
