# Scripts npm

Para quem roda o CrafyTask a partir do código. Pré-requisitos: Node.js 22 e as ferramentas de
compilação para os módulos nativos (`better-sqlite3`, `node-pty`) — no Ubuntu,
`sudo apt install build-essential python3`.

```bash
git clone https://github.com/uesleinasch/crafytask.git
cd crafytask
npm install        # também ativa os hooks git de .githooks/
npm run dev
```

## Referência

| Comando | O que faz |
| --- | --- |
| `npm run dev` | roda o app com hot reload (electron-vite) |
| `npm run start` | abre uma prévia do app já compilado |
| `npm run build` | typecheck + compila para `out/` |
| `npm run build:linux` | compila e empacota `.deb` e AppImage em `dist/` (**não** roda o typecheck) |
| `npm run build:unpack` | build + `electron-builder --dir` (app desempacotado, sem instalador) |
| `npm run dist` | build + `electron-builder` com a configuração padrão |
| `npm run typecheck` | `tsc` nos dois projetos (`typecheck:node` e `typecheck:web`) |
| `npm run typecheck:node` / `typecheck:web` | só o processo main/preload, ou só o renderer |
| `npm run lint` | ESLint com cache |
| `npm run format` | Prettier em todo o repositório (veja o aviso abaixo) |
| `npm run test` | testes com Vitest, uma vez |
| `npm run test:watch` | Vitest em modo observação |

Rodar um arquivo ou um caso de teste específico:

```bash
npx vitest run src/main/taskQuery.test.ts
npx vitest run src/main/taskQuery.test.ts -t "nome do caso"
```

Antes de abrir um PR, rode `npm run typecheck && npm run lint && npm run test`.

!!! warning "Não formate arquivos inteiros"
    O `lint` acusa avisos antigos do Prettier no repositório. Não rode `prettier --write` num
    arquivo legado inteiro só para calá-los: isso reescreve centenas de linhas e esconde a mudança
    real. Formate só os arquivos que você criou.

## Pasta de dados no desenvolvimento

`npm run dev` e `npm run start` usam uma pasta de dados própria, `~/.config/ticktask-dev/`, em vez
da do app instalado: o banco começa vazio e o dev roda ao lado da instância instalada. Para usar
outra pasta, em qualquer build:

```bash
TICKTASK_USER_DATA=/tmp/crafytask-teste npm run dev
```

Não copie `notion-config.json` nem `mcp-config.json` para a pasta de dev: o dev escreveria no mesmo
Notion e disputaria a porta do MCP.

!!! tip "Ubuntu 24.04+"
    O Electron baixado pelo npm não tem o perfil AppArmor do `.deb`. Se `npm run dev` abortar por
    causa do sandbox, rode com `ELECTRON_DISABLE_SANDBOX=1 npm run dev`.
