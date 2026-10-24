# Central de Demandas da Equipe

Primeira versão local em React, TypeScript e Vite, conectada ao Supabase real. O [PRD](PRD.md) é a referência de produto. O solicitante informa somente o e-mail; apenas o administrador faz login. O histórico do solicitante pertence à sessão deste navegador, mesmo quando duas pessoas informam o mesmo e-mail.

**Estado da integração:** o projeto compartilhado autorizado é identificado pelas variáveis operacionais no `.env` local. As duas migrações da dinâmica foram aplicadas e a conta indicada por `ADMIN_EMAIL` recebeu o perfil administrativo correspondente. `.env.local` mantém as variáveis públicas usadas pelo aplicativo existente. Login, atendimento e saída administrativos foram verificados no navegador integrado. Nenhuma configuração global de Auth ou objeto preexistente foi alterado. Os resultados abaixo se referem à implementação anterior; devem ser repetidos ao reconstruir a aplicação.

## Configuração e apresentação da aula

Os valores de projeto, conta GitHub, e-mail administrativo, URLs e prefixos ficam no `.env` local ignorado pelo Git. Consulte `.env.example` apenas para os nomes. Não abrir ou projetar `.env`, `.env.local` ou relatórios privados durante a aula. Variáveis `VITE_*` são públicas no navegador; arquivos de ambiente não substituem RLS nem o armazenamento seguro de credenciais.

## Abrir localmente

Requer Node.js 20.19+ e npm. **Nesta pasta, `.env.local` já está configurado: basta executar `npm run dev`.** Para uma cópia nova do projeto, use o lockfile e prepare as variáveis:

```sh
npm ci
cp .env.example .env.local
```

Preencha `.env.local` com a URL e uma chave **publishable** (ou a chave legada **anon**) do projeto compartilhado confirmado:

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Os campos acima ficam vazios na documentação; use os valores locais já configurados. Nunca preencha com `service_role`, `sb_secret_`, senha do banco ou token da CLI. Variáveis `VITE_` são públicas no navegador. A configuração recusa formatos de chave privilegiada antes de servir ou construir o frontend.

```sh
npm run dev
```

Abra o endereço local exibido pelo Vite, normalmente `http://127.0.0.1:5173`. A entrada pública fica em `/`; a administrativa, em `/admin`. Reinicie o Vite depois de alterar `.env.local`.

## Preparar o Supabase autorizado

O instrutor autorizou o projeto compartilhado indicado por `SUPABASE_PROJECT_REF` e o escopo definido por `SUPABASE_DATABASE_PREFIX` no `.env`. Compare esses valores internamente com o destino real antes de executar SQL; mantenha os valores fora deste README.

1. Para reproduzir a preparação em um ambiente autorizado, entre na CLI com `supabase login --no-browser`, abrindo o link no navegador integrado ao chat. Confira nome e referência do destino. Esta pasta já está vinculada ao projeto acima.
2. Execute [supabase/preflight.sql](supabase/preflight.sql) antes da migração para conferir colisões e os metadados de acesso. O relatório lê estrutura, políticas e gatilhos, sem consultar conteúdo de alunos.
3. A inspeção identificou tabelas de outras aplicações acessíveis pelo papel `authenticated` e um gatilho em `auth.users` que cria perfis em outro schema. Por isso **não habilitar Anonymous Sign-Ins e não criar usuários Auth para participantes**. O acesso dos alunos usa uma credencial de navegador própria, validada nas funções da dinâmica. Isso não corrige as permissões antigas do projeto; apenas evita conceder o papel autenticado da infraestrutura aos alunos ou acionar o gatilho existente.
4. A migration inicial em [supabase/migrations](supabase/migrations) e a migration seguinte de conflitos HTTP 409 na mesma pasta já foram aplicadas neste projeto. Em outro destino autorizado, execute as transações completas **nessa ordem**. Não reaplique a criação inicial: a colisão de nomes deve causar erro. A correção seguinte usa `PT409` para recusar operações desatualizadas, evitando as repetições automáticas indevidas do código `40001` no PostgREST 14, conforme a [documentação de diagnóstico do Supabase](https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions).
5. Provisione o administrador existente conforme a próxima seção e configure as duas variáveis públicas. Nenhuma senha foi criada ou alterada nesta entrega.
6. Teste a capacidade e o acesso na rede da aula antes da publicação. O cadastro público não restringe a participação a quem está na sala; não há promessa de carga ilimitada.

Não executar `db reset`, seed geral, limpeza de usuários, alteração de privilégios globais nem migrações de outros aplicativos. Não usar `db push` indiscriminadamente em um projeto compartilhado com histórico remoto diferente. Os dois arquivos SQL desta entrega podem ser aplicados isoladamente no SQL Editor, preservando os demais objetos. Arquivos em `tests/` são exclusivos do banco descartável local e **não devem ser executados no projeto compartilhado**.

## Acessos de Ana, Beto e Rui

**Ana e Beto são personas**, não contas com senhas fixas. Cada participante abre a página pública em um navegador/perfil independente e informa seu e-mail. Duas abas comuns do mesmo navegador compartilham a mesma identidade; use perfis independentes para testar isolamento. O e-mail é declarado, não verificado, e nunca é usado para recuperar histórico ou promover alguém a administrador.

O cadastro ocorre pela função `${SUPABASE_DATABASE_PREFIX}register_participant`, que cria somente um perfil de solicitante da dinâmica e entrega uma credencial aleatória de posse. Ela fica no armazenamento local do navegador; apenas seu hash fica na tabela privada de sessões. As chamadas de consulta e gravação enviam a credencial no corpo da requisição, nunca na URL. Não existe usuário de aluno no Supabase Auth. Ao retornar pelo mesmo navegador, o participante conserva o acesso enquanto os dados locais e a sessão forem válidos. Trocar de dispositivo, limpar os dados ou perder a sessão inicia outro histórico vazio; os registros anteriores permanecem no banco. Não há senha, confirmação por e-mail nem função de recuperação para alunos.

**Rui representa o administrador escolhido pelo instrutor.** A conta escolhida está em `ADMIN_EMAIL`; a conta existente confirmada já está vinculada ao perfil indicado por `ADMIN_DISPLAY_NAME`. Para outro administrador autorizado, prefira uma conta existente e confirmada em Authentication → Users. Criar nova conta neste projeto aciona um gatilho de outro aplicativo, portanto exige avaliar esse efeito antes. O instrutor define a senha diretamente no serviço, sem incluí-la no código, SQL, chat ou logs. Depois de confirmar a conta, copie o UUID, substitua os dois marcadores de [provision-admin.sql](supabase/provision-admin.sql) e execute esse arquivo como operador autorizado. Ele cria apenas o perfil administrativo da dinâmica, exige uma conta confirmada não anônima e recusa colisões. Não promover um cadastro de aluno nem confiar em metadados enviados pelo cliente.

Entre em `/admin` com essa conta. O login administrativo e a credencial do participante usam chaves locais separadas. A saída administrativa encerra somente sua sessão local e não provoca uma saída global nos demais aplicativos do projeto compartilhado. Não existe cadastro administrativo público nem credencial de demonstração embutida.

## Regras e estrutura

São criadas três tabelas `public.${SUPABASE_DATABASE_PREFIX}profiles`, `public.${SUPABASE_DATABASE_PREFIX}requests` e `public.${SUPABASE_DATABASE_PREFIX}comments`, além da tabela privada de hashes `${SUPABASE_PRIVATE_SCHEMA}.participant_sessions` e de funções/índices com o prefixo da dinâmica.

- RLS recusa acesso direto às tabelas por visitantes e libera consultas ao administrador validado. O solicitante consulta exclusivamente por funções que validam sua credencial e filtram por autoria. Contagens respeitam esse mesmo escopo e independem do filtro visual.
- Clientes não recebem INSERT, UPDATE ou DELETE direto nas tabelas, inclusive quando o perfil da aplicação é administrador. As gravações passam por funções com validação, autoria e horários confiáveis. Consulte [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) e [funções de banco](https://supabase.com/docs/guides/database/functions).
- Criação Crítica grava pedido e justificativa juntos. Revisão de prioridade grava valor atual, versão e comentário de decisão na mesma transação. Manter a prioridade não cria comentário.
- Bloqueios de linha serializam revisão, comentário e avanço de situação. Versão esperada e prioridade anterior recusam revisões desatualizadas, inclusive quando um valor mudou e depois voltou ao anterior.
- Só há Aberta → Em andamento → Concluída. Concluída permanece consultável e recusa comentários, revisões e reabertura. Textos salvos não são editáveis ou excluíveis.
- Os limites são 120 caracteres de título, 2.000 de descrição e 1.000 de comentário/justificativa. A interface valida e as funções validam novamente.
- Para o administrador, a verificação de sessão consulta `auth.sessions`. Para o solicitante, verifica o hash e a ausência de revogação na tabela privada própria. Uma credencial revogada perde acesso; não há expiração automática ou recuperação por e-mail nesta versão. A saída administrativa foi verificada no navegador: remove o painel e retorna à entrada, inclusive após recarregar.

Atualizações são manuais pelo botão de consulta. Não há servidor próprio, tempo real obrigatório, SLA ou histórico geral de eventos. O QR code não contém uma identidade ou permissão.

## Verificações locais

```sh
npm test
npm run build
npm audit
```

Os testes de domínio verificam limites, mensagens e configuração pública. Os testes de componentes usam respostas controladas apenas no ambiente de teste: verificam exigência de motivo Crítico, bloqueio durante envio, ausência de sucesso falso e preservação de e-mail, campos e comentários em falhas. Eles não comprovam autenticação ou persistência HTTP.

Para testar a migração e as permissões em um PostgreSQL real descartável, tenha PostgreSQL 15+ (`initdb`, `pg_ctl`, `psql`) no PATH:

```sh
npm run test:database
```

O script cria um banco temporário em `/tmp`, inicia apenas em loopback, aplica todas as migrações em ordem e executa os casos SQL. Encerra o servidor ao sair e mostra o caminho dos logs. Nunca usa a URL do projeto compartilhado. As identidades e o contexto de JWT são fixtures: a execução de SQL, RLS, transações e recusas de operações é real; a autenticação HTTP não faz parte desse teste.

Os casos incluem isolamento de Ana/Beto, repetição de e-mail, impossibilidade de promover perfil/forjar decisão, limites, transições, leitura após conclusão, revisão obsoleta com versão intermediária, saída revogando acesso e falha deliberada na inserção do comentário para comprovar rollback de abertura Crítica e revisão. As operações desatualizadas são testadas sequencialmente; não declarar que foi realizado teste de carga ou disputa simultânea entre múltiplas conexões.

## Resultado das verificações — 23/10/2026

| Camada | Resultado observado |
| --- | --- |
| Frontend | 11 testes passaram; compilação TypeScript e build de produção passaram; `npm audit` não encontrou vulnerabilidades nas dependências instaladas nessa execução. |
| PostgreSQL descartável | Testes SQL passaram com permissões reais, transações, versões desatualizadas e rollback por falha deliberada na gravação das justificativas. Incluem revogação de credenciais e sessão administrativa simulada. |
| HTTP do Supabase real | 31 verificações passaram usando somente a chave pública e credenciais próprias de participantes. Incluem cadastro, histórico vazio, e-mail repetido, persistência em novo cliente, quatro prioridades, justificativa Crítica, comentários, isolamento de detalhe/conversa/contagens e recusa de escrita direta/decisão forjada. Informar o e-mail do administrador continuou criando apenas solicitante. |
| Interface com login real | O administrador entrou com sua conta existente. O pedido fictício de teclado e mouse persistiu após recarregar; houve comentário do solicitante, revisão Média → Alta com o motivo combinado, Alta → Crítica e Crítica → Alta, resposta administrativa e avanço até Concluída. Confirmar a mesma prioridade não acrescentou revisão. |
| Telas desatualizadas | Duas abas administrativas com a mesma sessão testaram versões diferentes: a revisão antiga foi recusada e o motivo permaneceu preenchido. O solicitante tentou comentar depois da conclusão em outra aba: recebeu a recusa, a situação foi atualizada e o texto não enviado permaneceu visível. Não foi um teste de carga simultânea. |
| Demanda própria e saída | O administrador abriu um pedido próprio Crítico: ausência de motivo foi recusada; motivo válido gerou o pedido Aberto e o comentário obrigatório. A saída administrativa removeu o painel e a recarga manteve a exigência de login. |
| Lista e apresentação | Filtro Em andamento apresentou estado vazio com totais ainda em 1 Aberta, 0 Em andamento e 1 Concluída; Todas restaurou os dois registros. Navegação por Enter e filtro por Espaço funcionaram; layout do filtro e foco foram inspecionados em viewport estreito. Isso não substitui a jornada completa em celular físico e teclado. |
| Preservação do projeto compartilhado | Comparação de metadados antes/depois: 96 relações, 133 políticas, 1 gatilho de `auth.users` e 45 funções existentes mantiveram os metadados consultados. Não é uma auditoria de todo o banco nem corrige permissões antigas. |

Relatórios e capturas locais ficam em `artifacts/`, fora do Git. Os dados fictícios do teste HTTP foram removidos pelos seus IDs. Permanecem dois exemplos criados pela interface, com títulos explicitamente marcados como teste: um concluído com prioridade Alta e outro aberto com prioridade Crítica. São registros persistidos, não números simulados no painel.

Para repetir apenas o teste HTTP do solicitante no projeto confirmado:

```sh
node scripts/verify-supabase.mjs --run
```

O comando cria dados fictícios e gera `artifacts/supabase-http-report.json` e `artifacts/cleanup-http-test.sql`. A limpeza não é automática: confira o SQL gerado, que contém apenas os IDs dessa execução, antes de executá-lo com acesso de operador. Esse teste não faz login administrativo nem obtém sua senha.

### Limites e verificações restantes

Os critérios CA-L01 a CA-L26 estão no PRD. Há evidências combinadas de interface, HTTP e SQL, mas não se declara que cada variação foi repetida manualmente em todos os ambientes.

- **CA-L08 e CA-L26:** isolamento e e-mail repetido foram verificados via HTTP real com credenciais independentes. Falta repetir a jornada visual completa de Ana e Beto em dois perfis/dispositivos independentes, incluindo tentativa de abrir a rota do outro. Abas comuns compartilham o mesmo acesso de participante.
- **CA-L24:** falta executar as jornadas completas em celular físico e somente por teclado; a inspeção responsiva e a navegação pontual não cobrem todo esse critério.
- **CA-L01, CA-L07, CA-L13 e CA-L23:** saída real foi verificada; expiração/revogação e falhas transacionais foram exercitadas no banco descartável, e preservação de campos em testes de componentes. Falta ensaio manual de perda de rede durante gravação e expiração natural de sessão. As chamadas RPC têm limite de espera de 20 segundos e orientam consultar antes de repetir quando o resultado for incerto.
- **CA-P01 a CA-P03:** dependem de publicação autorizada, URL pública, QR definitivo, celular novo e rede da turma. Não foram executados. Não houve ensaio de capacidade com a turma.

A injeção de falha de comentário usada no teste de atomicidade fica restrita ao banco descartável; nenhum gatilho de teste foi instalado no banco compartilhado.

## Publicação futura e QR code

O frontend permanece local. O repositório de código é indicado por `GITHUB_REPOSITORY` no `.env`; enviar código ao GitHub não publica automaticamente o site. `.gitignore` exclui `.env*` (exceto o exemplo), dependências, build, logs locais de ferramentas e artefatos. Antes de versionar, revise o diff e confirme que não há segredos. Criação de repositório remoto e push seguem o pedido específico do instrutor.

Quando houver autorização para publicar na Vercel, use preset Vite, instalação `npm ci`, build `npm run build`, saída `dist` e as duas variáveis públicas do projeto correto. `vercel.json` contém o fallback de rotas para o SPA. Verifique navegação direta e recarga de `/admin` e `/demandas/:id`. Confira Site URL/redirects de Auth com cuidado por serem compartilhados com outras aplicações; este fluxo não depende de magic link para alunos. Não substituir URLs existentes indiscriminadamente.

Depois de obter o endereço HTTPS público real da raiz do solicitante:

```sh
npm run qr -- https://SEU-DOMINIO-PUBLICADO/
```

O gerador salva `artifacts/qr-code.png`, `artifacts/qr-code.svg` e `artifacts/link-da-aula.txt` para projeção e alternativa escrita. Ele recusa localhost/IP, caminhos administrativos, parâmetros, fragmentos e credenciais. Não publica o site nem verifica automaticamente a disponibilidade do domínio. O QR definitivo ainda não foi gerado, pois a URL pública não existe nesta etapa.

Executar CA-P01 a CA-P03 antes da aula: abrir por celular e computador, ler o QR em celular novo, iniciar apenas com e-mail, enviar a demanda, acompanhar pelo administrador e testar o acesso da turma na rede prevista. `localhost` no celular aponta para o próprio celular e não atende à aula.
