-- Somente metadados; nenhum registro de aluno é consultado.
-- Retorna um único resultado, compatível com a CLI e com o SQL Editor.
select jsonb_build_object(
  'database', current_database(),
  'role', current_user,
  'collisions', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select n.nspname as schema, c.relname as name from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where c.relname like 'dinamica_nerd_aula_%' or n.nspname='dinamica_nerd_aula_private'
    union all
    select n.nspname, p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where p.proname like 'dinamica_nerd_aula_%' or n.nspname='dinamica_nerd_aula_private'
    union all
    select nspname, nspname from pg_namespace where nspname='dinamica_nerd_aula_private'
  ) x),
  'relations', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select n.nspname as schema, c.relname as name, c.relkind, c.relrowsecurity as rls,
      has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_select,
      has_table_privilege('authenticated', c.oid, 'INSERT,UPDATE,DELETE') as authenticated_write
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','storage','cursos_nerd') and c.relkind in ('r','v','m','p')
      and c.relname not like 'dinamica_nerd_aula_%'
  ) x),
  'policies', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select schemaname, tablename, policyname, roles, cmd, qual, with_check from pg_policies
    where schemaname in ('public','storage','cursos_nerd') and tablename not like 'dinamica_nerd_aula_%'
  ) x),
  'auth_triggers', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select t.tgname, pg_get_triggerdef(t.oid) as definition, pg_get_functiondef(t.tgfoid) as function_definition
    from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='auth' and c.relname='users' and not t.tgisinternal
  ) x),
  'functions', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select p.oid::regprocedure::text as name, p.prosecdef as security_definer,
      has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('public','cursos_nerd') and p.proname not like 'dinamica_nerd_aula_%'
      and p.prosecdef and has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ) x)
) as preflight;
