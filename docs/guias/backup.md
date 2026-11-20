# Backup e restauração

Seus dados vivem só no seu computador, em `~/.config/ticktask/`. Faça backups com frequência —
especialmente antes de atualizar o app.

## Fazer um backup

1. Abra **Configurações → Backup**.
2. Em **Pasta de backup**, clique em **Escolher pasta** (de preferência um disco externo ou uma pasta
   sincronizada com a nuvem).
3. Clique em **Fazer backup agora**.

Cada backup é uma pasta com data e hora (`AAAA-MM-DD_HHMMSS/`) contendo:

| Item | Conteúdo |
| --- | --- |
| `ticktask.db` | o banco inteiro, copiado de forma consistente mesmo com o app aberto |
| `notes-assets/` | imagens das notas |
| `drawings/` | imagens dos desenhos |
| `notion-config.json`, `mcp-config.json` | configurações do Notion e do MCP |
| `MANIFEST.txt` | contagens e o sha256 de cada arquivo |

!!! warning "O que não entra no backup"
    As configurações do **Google Calendar** e do **Jira** ficam de fora: os tokens são cifrados
    pelo chaveiro do sistema e não abririam em outra máquina. Depois de restaurar em outro
    computador, conecte essas duas integrações de novo.

## Backup automático

Ligue **Backup automático** em **Configurações → Backup** (precisa de uma pasta escolhida). Com o
app aberto, ele confere a cada hora e cria um backup quando a pasta ainda não tem nenhum do dia,
seja manual ou automático. Ligar já faz o de hoje, se faltar.

Ele guarda os **14 backups automáticos** mais recentes e apaga os mais antigos. Os backups que você
fez à mão, com **Fazer backup agora**, nunca são apagados.

## Restaurar

1. Em **Configurações → Backup**, a lista **Backups nesta pasta** mostra os snapshots do mais
   recente para o mais antigo. Clique em **Restaurar** no desejado — ou em **Restaurar de outra
   pasta…** para escolher qualquer pasta que tenha um `ticktask.db`.
2. O app verifica a integridade do banco e mostra as contagens para você confirmar.
3. Confirmado, o app guarda os dados atuais em `~/.config/ticktask/pre-restore-<data>/`, copia o
   backup e reinicia. Se a cópia falhar, os dados anteriores voltam.

## Sem o app

O mesmo formato é lido e gerado pelo script `scripts/ticktask-backup.sh`, que funciona com o app
fechado (ou até sem ele instalado). Veja [Script de backup](../comandos/backup.md).
