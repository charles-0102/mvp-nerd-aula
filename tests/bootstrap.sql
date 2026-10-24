-- Apenas PostgreSQL descartável criado por scripts/test-database.sh.
-- Simula o contexto de identidade assinado pelo Supabase; não simula o banco nem as regras.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users(id uuid primary key, email text, is_anonymous boolean not null default false);
create table auth.sessions(id uuid primary key, user_id uuid not null references auth.users(id), not_after timestamptz);
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated;
