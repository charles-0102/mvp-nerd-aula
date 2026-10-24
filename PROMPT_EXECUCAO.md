# Prompt de execução — Central MVP

## Como iniciar a demonstração

Abra esta pasta como projeto no Codex. Mostre os três documentos à turma e envie a mensagem abaixo para começar:

> Leia integralmente AGENTS.md, PRD.md e PROMPT_EXECUCAO.md nesta pasta. Execute o pedido de implementação descrito em PROMPT_EXECUCAO.md, seguindo as regras operacionais de AGENTS.md e os requisitos e critérios de aceite de PRD.md. Desenvolva e verifique a versão local até a entrega, sem publicar nem enviar código a um repositório remoto.

Os documentos públicos têm funções diferentes; os valores do ambiente ficam no `.env` local, que não deve ser aberto ou projetado durante a aula:

| Documento | O que estabelece |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Como operar: projeto Supabase autorizado, acesso pela CLI, migrations, preservação do banco compartilhado e preferência pelo navegador integrado. |
| [PRD.md](PRD.md) | O que construir: visão, personas, jornadas, escopo, regras, suposições e critérios de aceite. |
| [PROMPT_EXECUCAO.md](PROMPT_EXECUCAO.md) | O trabalho a executar agora: stack, etapas de implementação, verificações e entrega local. |

Esta pasta foi preparada com documentos para reconstruir a aplicação em aula. Eles não contêm valores reais de contas ou ambientes e não configuram a CLI sozinhos. O `.env` local guarda a configuração preparada separadamente; confira sua presença e consistência sem imprimir seu conteúdo. A configuração não comprova que esta nova pasta já possui código, dependências ou vínculo local com o Supabase. Referências a migrações e verificações anteriores são contexto; confira o estado atual antes de agir.

## Pedido para o agente

Implemente nesta pasta a primeira versão local da **Central de Demandas da Equipe**, em português brasileiro, usando integralmente o PRD como referência. O objetivo é demonstrar o caminho de um pedido do aluno até o atendimento pelo instrutor, com dados reais persistidos e regras verificadas no serviço.

Leia os três documentos antes de alterar arquivos ou acessar o banco. Inspecione a pasta e preserve os documentos e qualquer trabalho existente. Construa o código nesta pasta; não copie automaticamente a aplicação pronta de outra pasta do Desktop. A estrutura remota da dinâmica pode ser reutilizada quando estiver compatível, conforme `AGENTS.md`.

Apresente um plano curto, execute as etapas e explique brevemente as decisões para uma turma iniciante. Não se limite a uma proposta ou a um protótipo visual. Não pare para pedir confirmação de decisões já registradas; solicite intervenção somente para uma dependência real, uma decisão essencial não definida ou uma operação fora do alcance autorizado. Se surgir uma contradição, explicite-a antes de modificar a decisão afetada.

## Stack e arquitetura

| Camada | Escolha |
| --- | --- |
| Interface | React + TypeScript + Vite. |
| Navegação | React Router, com entrada do solicitante em `/` e acesso administrativo em `/admin`. |
| Apresentação | CSS responsivo, rótulos claros, foco visível, uso por teclado e boa leitura em celular e computador. |
| Ferramentas locais | Node.js e npm em versões compatíveis com as dependências escolhidas; registrar versões e manter lockfile. |
| Dados | PostgreSQL do Supabase real, com RLS, privilégios mínimos e funções RPC para as operações protegidas. |
| Integração | Cliente oficial `@supabase/supabase-js`; somente configuração pública no frontend. |
| Administrador | Supabase Auth com a conta existente indicada por `ADMIN_EMAIL` no `.env` e perfil administrativo próprio da dinâmica. |
| Solicitante | Identificação somente por e-mail e credencial própria por navegador, conforme `AGENTS.md`; sem criar alunos no Supabase Auth. |
| Verificação | Testes de regras e componentes, por exemplo Vitest e Testing Library, mais testes SQL em banco descartável e chamadas HTTP reais para conferir permissões. |
| Hospedagem futura | Frontend preparado para Vercel; GitHub pela conta indicada por `GITHUB_ACCOUNT` no `.env`, conforme `AGENTS.md`. O repositório da Central deve ser identificado antes da conexão; publicação e envio ao remoto ficam para pedido posterior. |

O frontend conversa diretamente com os serviços autorizados do Supabase. As regras de acesso e integridade ficam no banco, além das validações da interface. Não criar um servidor próprio na Vercel apenas para separar camadas. Não acrescentar tempo real obrigatório, SLA, recuperação de aluno por e-mail, classificação por IA ou outras funcionalidades fora do PRD.

## Etapas de execução

### 1. Conferir o contexto e preparar o ambiente

- Leia especialmente as decisões confirmadas, as suposições reversíveis e os critérios CA-L01 a CA-L26 do PRD. Ana e Beto representam solicitantes; Rui representa o administrador exercido pelo instrutor. Não invente contas ou senhas de demonstração.
- Confira a CLI e reutilize sua autenticação quando válida. Se for necessário login, siga `supabase login --no-browser` e abra o link no navegador integrado, visível para o instrutor. Login no painel e autenticação da CLI são verificações separadas.
- Confira o projeto, o prefixo e o schema privado nas variáveis `SUPABASE_PROJECT_REF`, `SUPABASE_DATABASE_PREFIX` e `SUPABASE_PRIVATE_SCHEMA` do `.env`. O destino e a conta GitHub já foram escolhidos; não pedir novamente outro projeto ou outra conta. Compare internamente com o acesso real e não reproduza esses valores nos Markdown ou na apresentação.
- Vincule esta pasta ao destino e confira os metadados antes de qualquer escrita. Refazer a pasta do zero não significa que o banco esteja vazio. Reutilize objetos compatíveis e preserve os registros existentes.
- Prepare a aplicação sem apagar os Markdown. Preserve `.gitignore` e o `.env` local já preparado; `.env.example` deve conter somente nomes de variáveis sem valores. Não copiar credenciais ou `.temp` de outro projeto nem expor dados operacionais no frontend. Somente as variáveis públicas necessárias usam o prefixo `VITE_`. Se uma configuração depender do instrutor, avance no trabalho independente e informe a necessidade concreta.

### 2. Estabelecer dados e regras de acesso

- Inspecione assinaturas, retornos, tabelas e permissões das funções existentes antes de integrar a nova interface. Documente a estrutura efetivamente utilizada.
- Salve SQL reproduzível em `supabase/migrations/`. Execute somente as alterações necessárias pelo procedimento de `AGENTS.md`. Não repetir criação já aplicada, não usar reset remoto nem sincronizar indiscriminadamente o histórico compartilhado.
- Preserve o fluxo do aluno: informar e-mail, receber um acesso independente e começar sem demandas nesse novo acesso. Recarregar no mesmo navegador mantém os registros; informar o mesmo e-mail em outro navegador não recupera o histórico.
- Reutilize a conta e o perfil administrativo corretos quando já existirem. O e-mail declarado por um aluno nunca concede administração.
- Implemente no serviço autoria, número e horários confiáveis, limites de texto, transições válidas, isolamento, bloqueio após conclusão e recusa de campos ou comentários de decisão forjados.
- Garanta atomicidade entre abertura Crítica e justificativa, e entre revisão de prioridade e comentário de decisão. Use versão esperada para rejeitar telas desatualizadas, com o tratamento de conflito descrito no `AGENTS.md`.

### 3. Construir as jornadas completas

- Solicitante: identificação por e-mail, lista própria, abertura, detalhes, comentários antes da conclusão, filtro por situação, contagens e atualização manual da consulta.
- Administrador: login e saída, lista de todas as demandas da equipe, detalhes, comentários, revisão justificada de prioridade, avanço de situação e abertura de demandas próprias sob as mesmas regras.
- Use as quatro prioridades, Média pré-selecionada e justificativa obrigatória para abertura Crítica. Explique a convenção de bloqueio sem alternativa temporária; não inferir criticidade pelo texto.
- Preserve Aberta → Em andamento → Concluída, sem pular etapas nem reabrir. Depois de concluída, permitir consulta e bloquear novas escritas para ambos os perfis.
- Respeite os limites do PRD: título 120, descrição 2.000 e comentário/justificativa 1.000 caracteres. Valide na interface e no serviço; não aceitar campos obrigatórios vazios ou somente com espaços.
- Mostre prioridade atual, situação, autoria, horários e os comentários de decisão com antes, depois e motivo. Manter a mesma prioridade não gera revisão. Textos salvos não podem ser editados ou excluídos.
- Inclua estados de carregamento, salvamento, sucesso, erro, acesso negado, sessão administrativa encerrada, lista vazia e filtro sem resultados. Não apresentar falha de consulta como zero comprovado.
- Preserve os campos e motivos em falhas. Em uma tela desatualizada, explique a recusa e atualize os dados. Só mostre sucesso depois da confirmação de persistência; em resultado incerto, oriente consultar antes de repetir.

### 4. Verificar com evidências

Execute os critérios locais aplicáveis e registre resultado por identificador: passou, falhou ou não foi verificado, com evidência e motivo. Não marcar um critério inteiro como aprovado se uma de suas condições ficou sem teste.

Use como história principal:

1. Ana informa seu e-mail, começa com lista vazia, abre **“Solicitar teclado e mouse”** com prioridade Média e encontra o pedido após recarregar.
2. Beto, com acesso independente, não encontra nem comenta o pedido de Ana, também por rota direta e chamadas ao serviço. Repetir o e-mail de Ana não une os históricos.
3. O instrutor entra como administrador, revisa para Alta com **“Sem itens disponíveis para trabalhar.”**, inicia o atendimento e responde.
4. Ana atualiza e vê a prioridade, a justificativa, a resposta e o andamento.
5. O instrutor conclui. Ambos continuam consultando; comentários, revisões e reabertura são recusados, inclusive por uma tela desatualizada.

Verifique também as outras prioridades, a demanda própria do administrador, justificativas inválidas, manutenção da mesma prioridade, conflitos entre telas, filtros e contagens, autoria, saída administrativa e tentativas diretas de burlar as regras. Use chave pública e acessos representativos para testar as permissões dos clientes.

Teste falhas transacionais deliberadas somente em banco descartável. Não instalar gatilhos de teste no banco compartilhado. Dados fictícios devem ser identificados e limitados à dinâmica. Não copiar resultados de testes da implementação anterior como se tivessem sido executados nesta reconstrução.

Execute build e testes proporcionais ao risco, abra a aplicação local no navegador integrado e confira o comportamento observável. Verifique tela pequena e teclado; diferencie inspeção de viewport de teste em celular físico. Se faltar acesso, login humano ou dispositivo para alguma verificação, registre a pendência sem simular integração concluída.

### 5. Entregar a versão local e preparar a etapa seguinte

- Entregue código, arquivos SQL, testes pertinentes, lockfile, configuração pública de exemplo e um `README.md` com instruções reproduzíveis de instalação, execução e acesso.
- Documente o destino por referência às variáveis locais, sem seus valores reais, e registre o que foi reutilizado e o que foi aplicado no banco. Registre as migrations e resultados conforme `AGENTS.md`.
- Informe os endereços locais de solicitante e administrador, sem identificadores reais de contas ou URLs de infraestrutura, os comandos para iniciar a aplicação e os resultados dos critérios de aceite, incluindo pendências.
- Prepare o frontend para publicação futura na Vercel, inclusive rotas do SPA e variáveis públicas. Não publicar, criar repositório remoto ou fazer push nesta execução.
- Prepare a geração futura de QR code e link escrito para a URL pública real da raiz do solicitante, definida em `PUBLIC_APP_URL`. Não gerar um QR definitivo para localhost, para `/admin` ou contendo credenciais.
- Liste CA-P01 a CA-P03 como verificações da etapa publicada: URL pública, celular novo, leitura do QR e participação na rede da turma. Não prometer capacidade simultânea sem ensaio.

## Resultado esperado para a aula

Uma aplicação local funcional, ligada ao Supabase real, que permita demonstrar o pedido do aluno e o atendimento do administrador. Os três Markdown devem permanecer legíveis na raiz para mostrar à turma como produto, instruções operacionais e pedido de execução orientaram o trabalho. A entrega deve distinguir claramente o que foi implementado e verificado do que ainda depende da publicação ou de uma interação externa.
