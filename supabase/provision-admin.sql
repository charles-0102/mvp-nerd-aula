-- Executar como operador autorizado, no projeto NERD já conferido.
-- Antes: criar a conta não anônima em Authentication > Users ou escolher uma conta
-- existente autorizada. O próprio instrutor define a senha; não colocá-la neste arquivo.
-- Substituir apenas o UUID e nome abaixo. Os placeholders causam erro sem gravar.
begin;
do $$
declare
  chosen_id uuid := 'SUBSTITUIR-PELO-UUID-DO-ADMIN';
  chosen_name text := 'SUBSTITUIR-PELO-NOME';
  chosen_email text;
begin
  if chosen_name = 'SUBSTITUIR-PELO-NOME' or length(btrim(chosen_name)) not between 1 and 254 then
    raise exception 'Defina o nome de exibição do administrador.';
  end if;
  select email into chosen_email from auth.users
  where id = chosen_id and coalesce(is_anonymous, false) = false and email_confirmed_at is not null;
  if chosen_email is null then raise exception 'Conta confirmada e não anônima não encontrada.'; end if;
  -- Uma colisão exige análise: nunca promover automaticamente um perfil de aluno.
  insert into public.dinamica_nerd_aula_profiles(id, auth_user_id, role, email, display_name)
  values (chosen_id, chosen_id, 'admin', chosen_email, btrim(chosen_name));
end;
$$;
commit;
