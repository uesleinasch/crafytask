# Notion

Envia suas tarefas para um banco de dados no Notion chamado **GTD APP**, com as notas e o desenho
de cada tarefa no corpo da página. Os [cadernos](../guias/cadernos.md) também podem ir para o
Notion. A sincronização é do **CrafyTask para o Notion**: o que você editar no Notion não volta
para o app.

## Configurar

Em **Configurações → Notion**:

1. **Criar a integração no Notion.** Em
   [notion.so/my-integrations](https://www.notion.so/my-integrations), crie uma integração do tipo
   **Internal** e copie o *Internal Integration Secret*.
2. **Colar a API Key e testar.** Cole o segredo (começa com `ntn_`) e clique em
   **Testar conexão**.
3. **Conectar a integração a uma página.** No Notion, abra a página onde o banco deve ficar,
   clique em **⋯** (canto superior direito) → **Conexões** → **Adicionar conexões** e escolha a sua
   integração.

    !!! warning
        A integração só enxerga páginas conectadas a ela. Erros de "página não encontrada" vêm
        deste passo.

4. **Criar o banco GTD APP.** Opcionalmente informe o *Page ID* da página do passo 3; em branco, o
   banco é criado na primeira página conectada à integração. Clique em **Criar banco GTD APP**.

## Usar

Com o banco criado, a seção mostra o id do banco e a última sincronização, e oferece:

- **Sincronização automática** — sincroniza ao criar, editar ou excluir tarefas.
- **Sincronizar todas as tarefas** — envia tudo de uma vez (útil na primeira vez).
- **Salvar e sincronizar**, no painel de notas da tarefa — envia aquela nota na hora.
- **Limpar configurações** — remove a API Key e o vínculo com o banco do app. **Nada é apagado no
  Notion.**

Com as notas abertas e o Notion configurado, alterações pendentes também são enviadas a cada 60
segundos.

## O que vai para o Notion

Cada tarefa vira uma página no banco **GTD APP** com estas propriedades:

| Propriedade | Origem |
| --- | --- |
| Nome, Descrição | nome e descrição da tarefa |
| Status, Categoria | status GTD e categoria |
| Fonte/Tags, Contextos, Projeto | tags, contextos e projeto |
| Link Externo, Jira Key | link externo e chave da issue (tarefas do Jira) |
| Tempo Total (min), Limite (min), Em Execução | tempo registrado, limite e se o timer está rodando |
| Arquivada, Criado em, Atualizado em | estado e datas |
| ID Local | id da tarefa no app — é como o app encontra a página de novo |

O corpo da página recebe as notas (convertidas para blocos do Notion, com as imagens enviadas) e o
PNG do desenho.

## Limites

- Só envia; não lê alterações feitas no Notion.
- Tarefas importadas do Jira só vão ao Notion se você ligar **Sincronizar tasks do Jira com o
  Notion** em [Configurações → Jira](jira.md#opcoes).
- Diretório de trabalho e comando do terminal são locais e não são enviados.
- Cadernos: mover uma página arquiva a antiga e cria outra no Notion; a ordem das páginas no
  Notion é a de criação. Veja [Cadernos](../guias/cadernos.md#notion).
- O banco continua se chamando **GTD APP** e a raiz dos cadernos **Cadernos TickTask**, para que
  quem já sincronizava continue no mesmo lugar.
