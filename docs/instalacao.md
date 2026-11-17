# Instalação

CrafyTask é distribuído só para **Linux**, em dois formatos. Os dois saem de cada versão publicada
em [github.com/uesleinasch/crafytask/releases](https://github.com/uesleinasch/crafytask/releases),
com o nome `crafytask-<versão>.deb` e `crafytask-<versão>.AppImage`.

| Formato | Para quem | Atualização |
| --- | --- | --- |
| `.deb` | Debian, Ubuntu, Linux Mint, Pop!_OS e derivados | instale o `.deb` novo por cima |
| AppImage | qualquer distribuição, sem instalar nada no sistema | baixe o arquivo novo e troque o antigo |

!!! tip "Qual escolher?"
    No Ubuntu e derivados, prefira o `.deb`: ele instala o perfil AppArmor que o sandbox do
    Chromium precisa no Ubuntu 24.04+, cria o atalho no menu e o comando `ticktask` no terminal.

## Pacote `.deb`

=== "Terminal"

    ```bash
    # troque 3.15.0 pela versão que você baixou
    sudo apt install ./crafytask-3.15.0.deb
    ```

=== "Interface gráfica"

    Dê dois cliques no arquivo `.deb` e confirme a instalação no instalador de pacotes da sua
    distribuição.

O que o pacote instala:

- o app em `/opt/TickTask App/`;
- o comando `ticktask` em `/usr/bin` (via `update-alternatives`);
- a entrada **CrafyTask** no menu de aplicativos;
- no Ubuntu 24.04+, um perfil AppArmor em `/etc/apparmor.d/ticktask` (veja abaixo).

Para remover: `sudo apt remove ticktask`. Remover o pacote **não** apaga seus dados.

!!! info "Por que o pacote se chama `ticktask`?"
    O nome do pacote Debian, do executável e da pasta de dados continuam os do TickTask, para que a
    atualização substitua a instalação antiga sem duplicar o app nem perder dados. O nome que você
    vê na tela é CrafyTask.

## AppImage

```bash
chmod +x crafytask-3.15.0.AppImage
./crafytask-3.15.0.AppImage
```

O AppImage precisa da biblioteca FUSE 2. Se ele não abrir com um erro sobre `libfuse.so.2`:

```bash
sudo apt install libfuse2t64   # Ubuntu 24.04+
sudo apt install libfuse2      # Ubuntu 22.04 e anteriores
```

## Ubuntu 24.04+: AppArmor e o sandbox do Chromium

A partir do Ubuntu 24.04 o kernel vem com `kernel.apparmor_restrict_unprivileged_userns=1`: um
processo só pode criar *user namespaces* — que o sandbox do Chromium usa — se um perfil AppArmor
liberar isso. Sem o perfil, o app aborta logo ao abrir.

**Com o `.deb` isso já está resolvido.** O script de pós-instalação
(`build/linux/after-install.sh`) grava um perfil em `/etc/apparmor.d/ticktask` que só concede
`userns` ao executável em `/opt/TickTask App/ticktask` e o carrega com `apparmor_parser`. Se não
for possível carregar o perfil, o script cai para o `chrome-sandbox` com SUID, que também funciona.

**Com o AppImage** não há etapa de instalação, então nada disso acontece. Se o AppImage fechar
logo ao abrir (no terminal aparece algo sobre *sandbox* ou *namespace*), escolha uma saída:

- use o `.deb` (recomendado no Ubuntu);
- ou rode sem o sandbox do Chromium, aceitando a perda dessa camada de isolamento:

    ```bash
    ./crafytask-3.15.0.AppImage --no-sandbox
    ```

## Primeira execução

- O app abre na tela **Tarefas**, com o Inbox vazio e oito contextos padrão já criados
  (`@computador`, `@telefone`, `@reunião`, `@email`, `@leitura`, `@compras`, `@casa`,
  `@escritório`).
- **Fechar a janela não encerra o app**: ele continua no ícone da bandeja, com timers e servidor
  MCP rodando. Para sair de verdade, use **Sair** no menu da bandeja.
- Em **Configurações → Geral** você pode ligar **Iniciar o CrafyTask com o sistema**: o app sobe
  direto na bandeja ao fazer login, sem abrir janela.

## Onde ficam os dados

Tudo fica na pasta de dados do app:

```
~/.config/ticktask/
├── ticktask.db          # banco SQLite (tarefas, projetos, tempo, cadernos…)
├── notes-assets/        # imagens coladas nas notas
├── drawings/            # PNG gerado de cada desenho
├── notion-config.json   # integração com o Notion
├── gcal-config.json     # integração com o Google Calendar (token cifrado)
├── jira-config.json     # integração com o Jira (token cifrado)
├── mcp-config.json      # porta e token do servidor MCP
└── mcp-bridge.js        # ponte stdio do MCP, recopiada a cada inicialização
```

A variável de ambiente `TICKTASK_USER_DATA=<pasta>` troca a pasta de dados em qualquer build — útil
para testar com um banco separado. Veja [Backup e restauração](guias/backup.md) para guardar essa
pasta com segurança.

## Atualizar a partir do TickTask

CrafyTask é o TickTask com outro nome. A atualização é direta:

1. (Recomendado) Faça um backup em **Configurações → Backup → Fazer backup agora**.
2. Feche o app pelo ícone da bandeja → **Sair**.
3. Instale o `.deb` do CrafyTask por cima (`sudo apt install ./crafytask-<versão>.deb`). Como o
   pacote continua se chamando `ticktask`, o apt trata como atualização e substitui o anterior.
   Quem usava AppImage só troca o arquivo.
4. Abra o CrafyTask. Tarefas, tempo registrado, notas, desenhos, cadernos e integrações estão lá.

Os dados são mantidos porque **nada do que identifica a pasta de dados mudou**:

| Item | Nome (não muda) |
| --- | --- |
| Pasta de dados | `~/.config/ticktask/` (no modo de desenvolvimento, `~/.config/ticktask-dev/`) |
| Banco | `ticktask.db` |
| Variável para trocar a pasta | `TICKTASK_USER_DATA` |
| Esquema das imagens nas notas | `ticktask-asset://` |
| Pacote deb e executável | `ticktask` |
| Script de backup | `scripts/ticktask-backup.sh` |
| Agenda no Google Calendar | "TickTask" |
| Banco no Notion / raiz dos cadernos | "GTD APP" / "Cadernos TickTask" |

Por isso as integrações continuam funcionando sem reconfigurar: o Notion segue escrevendo no mesmo
banco e o Google na mesma agenda.

O servidor MCP é a exceção: agora se registra como `crafytask`. O registro antigo
(`claude mcp add ticktask …`) continua funcionando; para trocar, rode
`claude mcp remove ticktask --scope user` e registre de novo com o comando de **Configurações →
Servidor MCP** (ver [MCP](integracoes/mcp.md)).
