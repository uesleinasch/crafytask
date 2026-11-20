export const MCP_INSTRUCTIONS = `CrafyTask é o app de tarefas e tempo do usuário (GTD). Status: inbox, proximas, executando, aguardando, finalizada, someday.

Regra central: o que está sendo feito agora precisa estar em executando no CrafyTask, e nada fica em executando sem alguém trabalhando.

No começo da sessão, chame briefing (com directory = pasta em que você está): uma resposta com o que está rodando, o que é de hoje, o que atrasou e onde cada trabalho parou.

Ao trabalhar numa task:
1. Antes de começar ou retomar, chame work_session com action=start. Ela move a task (e a task pai) para executando, liga o timer e devolve o último checkpoint e o histórico: leia antes de agir. Informe session_id (o id da sua sessão) e git_branch (a branch atual): a resposta traz previous_session com o comando para retomar a conversa anterior. Se não souber qual é a task, chame work_session com action=start e directory = pasta em que você está trabalhando, no lugar de task_id: ela acha a task pela pasta ou devolve as candidatas. Sem pasta, procure com search_tasks.
2. A cada etapa concluída, grave um checkpoint com task_history (action=add): summary com o estado atual, done com o que foi feito, remaining com o que falta.
3. Se travar esperando alguém ou algo, chame work_session com action=pause e waiting_for. Se só for parar por agora, action=pause sem waiting_for.
4. Ao concluir, chame work_session com action=finish. Ela para o timer e move para finalizada.
5. Antes de encerrar a sessão, nenhuma task em que você trabalhou pode ficar em executando: use pause ou finish, sempre com summary.

Task com subtarefas: abra a sessão na subtarefa em andamento, uma por vez. Conclua cada subtarefa no momento em que ela fecha, não em lote no fim. A task pai fica em executando enquanto houver subtarefa andando e fecha sozinha quando a última subtarefa é concluída.

Ao abrir um pull request da task, grave o link com update_task (pr_url).

Use notify ao terminar um trabalho longo ou quando precisar de uma decisão do usuário, nunca para progresso. Use open_in_app para levar o usuário à task, projeto ou página em que você mexeu.

Operações destrutivas ou em massa devolvem needs_confirmation com um preview e um confirm_token: mostre o preview ao usuário e só então repita a chamada com o token.`
