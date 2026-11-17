# Script de backup

`scripts/ticktask-backup.sh` faz backup e restauração dos dados **sem o app** — útil para rotinas
agendadas (cron), para restaurar quando o app não abre ou para levar os dados para outra máquina.
Ele usa o mesmo formato de snapshot da tela **Configurações → Backup**, então os dois leem os
backups um do outro.

O script fica no repositório:
[scripts/ticktask-backup.sh](https://github.com/uesleinasch/crafytask/blob/production/scripts/ticktask-backup.sh).
Copie-o para a pasta onde quer guardar os backups.

Requisito: `python3` com o módulo `sqlite3` (já vem no Python padrão do Ubuntu/Debian).

## Uso

```bash
./ticktask-backup.sh backup            # cria um snapshot novo ao lado do script
./ticktask-backup.sh list              # lista os snapshots
./ticktask-backup.sh restore [pasta]   # restaura o snapshot indicado (padrão: o mais recente)
```

| Variável | Padrão | Para quê |
| --- | --- | --- |
| `TICKTASK_DATA_DIR` | `~/.config/ticktask` | pasta de dados do app |
| `TICKTASK_BACKUP_ROOT` | a pasta do script | onde ficam os snapshots |

Exemplo, guardando os backups num disco externo:

```bash
TICKTASK_BACKUP_ROOT=/media/$USER/backup/crafytask ./ticktask-backup.sh backup
```

## O que ele faz

**backup**

- copia o `ticktask.db` com a API de backup do SQLite — cópia consistente mesmo com o app aberto,
  já incorporando o arquivo `-wal`;
- verifica a integridade da cópia (`PRAGMA integrity_check`);
- copia `notes-assets/`, `drawings/`, `notion-config.json` e `mcp-config.json`;
- grava um `MANIFEST.txt` com contagens e o sha256 de cada arquivo;
- cria a pasta `AAAA-MM-DD_HHMMSS/`.

**restore**

- recusa rodar com o app aberto (feche pela bandeja → **Sair**);
- verifica a integridade do banco do snapshot e pede confirmação;
- move os dados atuais para `pre-restore-<data>/` dentro da pasta de dados;
- copia o banco, as pastas e as configurações do snapshot.

!!! note
    A verificação de "app aberto" só funciona com a pasta de dados padrão. Se você usa
    `TICKTASK_DATA_DIR` apontando para outra pasta, feche o app antes de restaurar.

As configurações do Google Calendar e do Jira não entram no backup: os tokens são cifrados pelo
chaveiro do sistema e não abririam em outra máquina.
