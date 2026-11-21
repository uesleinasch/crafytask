# Privacidade

Atualizada em 21/11/2026.

O CrafyTask é um app de desktop que guarda tudo no seu computador. Não existe servidor do
CrafyTask: tarefas, notas, desenhos e tempo ficam no banco local do app, e nada é enviado para nós.

## Conta Google

Conectar o Google é opcional. Ao conectar, o app pede só estas permissões:

| Permissão                     | Para quê                                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `calendar.app.created`        | Criar e manter uma agenda "TickTask" com os eventos das tarefas que você marcar. O app não lê suas outras agendas. |
| `drive.file`                  | Criar e ler apenas os arquivos que o próprio CrafyTask colocar no seu Google Drive.                          |
| `openid` e `userinfo.email`   | Mostrar em Configurações qual conta está conectada.                                                         |

Os dados vão direto do seu computador para as APIs do Google. Eles não passam por servidor do
CrafyTask, não são vendidos, não são compartilhados com terceiros e não são usados para publicidade
nem para treinar modelos de IA.

O uso e a transferência de informações recebidas das APIs do Google seguem a
[Política de Dados do Usuário dos Serviços de API do Google](https://developers.google.com/terms/api-services-user-data-policy),
incluindo os requisitos de Uso Limitado.

O token de acesso fica cifrado no seu computador (pelo chaveiro do sistema) e não entra nos
backups do app.

## Como desconectar

Em **Configurações → Google → Desconectar**, ou em
[myaccount.google.com/permissions](https://myaccount.google.com/permissions). Desconectar não
apaga o que já foi criado na agenda "TickTask" nem no Drive; você pode apagar por lá.

## Outras integrações

Notion e Jira também são opcionais e usam credenciais que você mesmo informa. Os dados vão do seu
computador direto para esses serviços.

## Contato

Dúvidas ou pedidos sobre privacidade: abra uma issue em
[github.com/uesleinasch/crafytask/issues](https://github.com/uesleinasch/crafytask/issues).
