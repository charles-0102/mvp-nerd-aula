-- Conferir o projeto autorizado no .env antes de executar esta migration.
-- Apenas objetos novos da aula; não altera Auth, gatilhos ou políticas existentes.
-- Sem IF NOT EXISTS: uma colisão interrompe a transação.
begin;
create schema dinamica_nerd_aula_private;
revoke all on schema dinamica_nerd_aula_private from public;
grant usage on schema dinamica_nerd_aula_private to authenticated;

create table public.dinamica_nerd_aula_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id),
  role text not null check (role in ('requester','admin')),
  email text not null check (length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  display_name text not null check (length(btrim(display_name)) between 1 and 254),
  created_at timestamptz not null default now(),
  check ((role='admin' and auth_user_id is not null) or (role='requester' and auth_user_id is null))
);
-- Participantes não são usuários do Auth compartilhado. O e-mail não é único.
-- O segredo permanece só no navegador; o banco armazena apenas seu hash.
create table dinamica_nerd_aula_private.participant_sessions (
  token_hash text primary key check (length(token_hash)=64),
  profile_id uuid not null unique references public.dinamica_nerd_aula_profiles(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
revoke all on dinamica_nerd_aula_private.participant_sessions from public, anon, authenticated;
alter table dinamica_nerd_aula_private.participant_sessions enable row level security;

create table public.dinamica_nerd_aula_requests (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('DEM-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  title text not null check (length(btrim(title)) between 1 and 120),
  description text not null check (length(btrim(description)) between 1 and 2000),
  author_id uuid not null references public.dinamica_nerd_aula_profiles(id),
  author_label text not null,
  status text not null default 'open' check (status in ('open','in_progress','completed')),
  priority text not null check (priority in ('low','medium','high','critical')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now()
);
create index dinamica_nerd_aula_requests_author_idx on public.dinamica_nerd_aula_requests(author_id,created_at desc);
create table public.dinamica_nerd_aula_comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.dinamica_nerd_aula_requests(id),
  author_id uuid not null references public.dinamica_nerd_aula_profiles(id),
  author_label text not null,
  body text not null check (length(btrim(body)) between 1 and 1000),
  kind text not null check (kind in ('comment','critical_opening','priority_change')),
  previous_priority text,
  new_priority text,
  created_at timestamptz not null default now(),
  check ((kind <> 'priority_change' and previous_priority is null and new_priority is null) or
    (kind='priority_change' and previous_priority is not null and new_priority is not null
      and previous_priority in ('low','medium','high','critical') and new_priority in ('low','medium','high','critical')
      and previous_priority<>new_priority))
);
create index dinamica_nerd_aula_comments_request_idx on public.dinamica_nerd_aula_comments(request_id,created_at);

create function dinamica_nerd_aula_private.active_uid() returns uuid
language sql stable security definer set search_path='' as $$
  select s.user_id from auth.sessions s where s.id::text=(select auth.jwt()->>'session_id')
    and s.user_id=(select auth.uid()) and (s.not_after is null or s.not_after>now()) limit 1;
$$;
create function dinamica_nerd_aula_private.is_admin() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.dinamica_nerd_aula_profiles p
    where p.auth_user_id=dinamica_nerd_aula_private.active_uid() and p.role='admin'
      and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false);
$$;
create function dinamica_nerd_aula_private.actor(p_token text default null) returns public.dinamica_nerd_aula_profiles
language plpgsql stable security definer set search_path='' as $$
declare p public.dinamica_nerd_aula_profiles;
begin
  if dinamica_nerd_aula_private.is_admin() then
    select * into p from public.dinamica_nerd_aula_profiles where auth_user_id=dinamica_nerd_aula_private.active_uid();
    return p;
  end if;
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'SESSION_REQUIRED' using errcode='42501'; end if;
  select profile.* into p from dinamica_nerd_aula_private.participant_sessions s
    join public.dinamica_nerd_aula_profiles profile on profile.id=s.profile_id
    where s.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and s.revoked_at is null and profile.role='requester';
  if not found then raise exception 'SESSION_REQUIRED' using errcode='42501'; end if;
  return p;
end;
$$;
create function dinamica_nerd_aula_private.clean_text(value text, maximum integer) returns text
language plpgsql immutable set search_path='' as $$
declare cleaned text := btrim(value,E' \t\n\r\f\v' || U&'\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF');
begin
  if cleaned is null or length(cleaned) not between 1 and maximum then raise exception 'INVALID_TEXT' using errcode='22023'; end if;
  return cleaned;
end;
$$;

alter table public.dinamica_nerd_aula_profiles enable row level security;
alter table public.dinamica_nerd_aula_requests enable row level security;
alter table public.dinamica_nerd_aula_comments enable row level security;
create policy dinamica_nerd_aula_profiles_read on public.dinamica_nerd_aula_profiles for select to authenticated
  using ((select dinamica_nerd_aula_private.is_admin()));
create policy dinamica_nerd_aula_requests_read on public.dinamica_nerd_aula_requests for select to authenticated
  using ((select dinamica_nerd_aula_private.is_admin()));
create policy dinamica_nerd_aula_comments_read on public.dinamica_nerd_aula_comments for select to authenticated
  using ((select dinamica_nerd_aula_private.is_admin()));
revoke all on public.dinamica_nerd_aula_profiles, public.dinamica_nerd_aula_requests, public.dinamica_nerd_aula_comments from public,anon,authenticated;
grant select on public.dinamica_nerd_aula_profiles, public.dinamica_nerd_aula_requests, public.dinamica_nerd_aula_comments to authenticated;

create function public.dinamica_nerd_aula_register_participant(p_email text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.dinamica_nerd_aula_profiles; email_value text := dinamica_nerd_aula_private.clean_text(p_email,254);
  token text := replace(gen_random_uuid()::text || gen_random_uuid()::text,'-','');
begin
  if email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'INVALID_EMAIL' using errcode='22023'; end if;
  insert into public.dinamica_nerd_aula_profiles(role,email,display_name) values('requester',email_value,email_value) returning * into p;
  insert into dinamica_nerd_aula_private.participant_sessions(token_hash,profile_id)
    values(encode(sha256(convert_to(token,'UTF8')),'hex'),p.id);
  return jsonb_build_object('profile',to_jsonb(p),'token',token);
end;
$$;
create function public.dinamica_nerd_aula_current_profile(p_token text default null) returns public.dinamica_nerd_aula_profiles
language sql stable security definer set search_path='' as $$ select dinamica_nerd_aula_private.actor(p_token); $$;

create function public.dinamica_nerd_aula_list_requests(p_token text default null,p_offset integer default 0)
returns setof public.dinamica_nerd_aula_requests language plpgsql stable security definer set search_path='' as $$
declare actor public.dinamica_nerd_aula_profiles := dinamica_nerd_aula_private.actor(p_token);
begin
  if p_offset is null or p_offset<0 then raise exception 'INVALID_OFFSET' using errcode='22023'; end if;
  return query select r.* from public.dinamica_nerd_aula_requests r
    where actor.role='admin' or r.author_id=actor.id order by r.created_at desc,r.id desc limit 500 offset p_offset;
end;
$$;
create function public.dinamica_nerd_aula_get_request(p_request_id uuid,p_token text default null)
returns public.dinamica_nerd_aula_requests language plpgsql stable security definer set search_path='' as $$
declare actor public.dinamica_nerd_aula_profiles := dinamica_nerd_aula_private.actor(p_token); r public.dinamica_nerd_aula_requests;
begin
  select * into r from public.dinamica_nerd_aula_requests where id=p_request_id and (actor.role='admin' or author_id=actor.id);
  if not found then raise exception 'NOT_FOUND_OR_DENIED' using errcode='42501'; end if;
  return r;
end;
$$;
create function public.dinamica_nerd_aula_list_comments(p_request_id uuid,p_token text default null,p_offset integer default 0)
returns setof public.dinamica_nerd_aula_comments language plpgsql stable security definer set search_path='' as $$
begin
  perform public.dinamica_nerd_aula_get_request(p_request_id,p_token);
  if p_offset is null or p_offset<0 then raise exception 'INVALID_OFFSET' using errcode='22023'; end if;
  return query select * from public.dinamica_nerd_aula_comments where request_id=p_request_id order by created_at,id limit 500 offset p_offset;
end;
$$;
create function public.dinamica_nerd_aula_counts(p_token text default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor public.dinamica_nerd_aula_profiles := dinamica_nerd_aula_private.actor(p_token);
begin
  return (select jsonb_build_object('open',count(*) filter(where status='open'), 'in_progress',count(*) filter(where status='in_progress'),
    'completed',count(*) filter(where status='completed')) from public.dinamica_nerd_aula_requests where actor.role='admin' or author_id=actor.id);
end;
$$;
create function public.dinamica_nerd_aula_create_request(p_title text,p_description text,p_priority text,p_reason text default null,p_token text default null)
returns public.dinamica_nerd_aula_requests language plpgsql security definer set search_path='' as $$
declare actor public.dinamica_nerd_aula_profiles := dinamica_nerd_aula_private.actor(p_token); r public.dinamica_nerd_aula_requests; reason text;
begin
  if p_priority is null or p_priority not in ('low','medium','high','critical') then raise exception 'INVALID_PRIORITY' using errcode='22023'; end if;
  if p_priority='critical' then reason:=dinamica_nerd_aula_private.clean_text(p_reason,1000); end if;
  loop
    insert into public.dinamica_nerd_aula_requests(title,description,priority,author_id,author_label)
    values(dinamica_nerd_aula_private.clean_text(p_title,120),dinamica_nerd_aula_private.clean_text(p_description,2000),p_priority,actor.id,actor.display_name)
    on conflict (number) do nothing returning * into r;
    exit when found;
  end loop;
  if p_priority='critical' then
    insert into public.dinamica_nerd_aula_comments(request_id,author_id,author_label,body,kind) values(r.id,actor.id,actor.display_name,reason,'critical_opening');
  end if;
  return r;
end;
$$;
create function public.dinamica_nerd_aula_add_comment(p_request_id uuid,p_body text,p_token text default null)
returns public.dinamica_nerd_aula_comments language plpgsql security definer set search_path='' as $$
declare actor public.dinamica_nerd_aula_profiles := dinamica_nerd_aula_private.actor(p_token); r public.dinamica_nerd_aula_requests; c public.dinamica_nerd_aula_comments;
begin
  select * into r from public.dinamica_nerd_aula_requests where id=p_request_id for update;
  if not found or (r.author_id<>actor.id and actor.role<>'admin') then raise exception 'NOT_FOUND_OR_DENIED' using errcode='42501'; end if;
  if r.status='completed' then raise exception 'REQUEST_COMPLETED' using errcode='22023'; end if;
  insert into public.dinamica_nerd_aula_comments(request_id,author_id,author_label,body,kind)
    values(r.id,actor.id,actor.display_name,dinamica_nerd_aula_private.clean_text(p_body,1000),'comment') returning * into c;
  return c;
end;
$$;
create function public.dinamica_nerd_aula_revise_priority(p_request_id uuid,p_priority text,p_reason text,p_expected_version integer,p_expected_priority text)
returns public.dinamica_nerd_aula_requests language plpgsql security definer set search_path='' as $$
declare actor public.dinamica_nerd_aula_profiles := dinamica_nerd_aula_private.actor(); r public.dinamica_nerd_aula_requests; reason text; previous text;
begin
  if actor.role<>'admin' then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  select * into r from public.dinamica_nerd_aula_requests where id=p_request_id for update;
  if not found then raise exception 'NOT_FOUND_OR_DENIED' using errcode='42501'; end if;
  if r.version is distinct from p_expected_version or r.priority is distinct from p_expected_priority then raise exception 'STALE_REQUEST' using errcode='40001'; end if;
  if r.status='completed' then raise exception 'REQUEST_COMPLETED' using errcode='22023'; end if;
  if p_priority is null or p_priority not in ('low','medium','high','critical') then raise exception 'INVALID_PRIORITY' using errcode='22023'; end if;
  if r.priority=p_priority then return r; end if;
  reason:=dinamica_nerd_aula_private.clean_text(p_reason,1000); previous:=r.priority;
  update public.dinamica_nerd_aula_requests set priority=p_priority,version=version+1 where id=r.id returning * into r;
  insert into public.dinamica_nerd_aula_comments(request_id,author_id,author_label,body,kind,previous_priority,new_priority)
    values(r.id,actor.id,actor.display_name,reason,'priority_change',previous,p_priority);
  return r;
end;
$$;
create function public.dinamica_nerd_aula_advance_status(p_request_id uuid,p_next_status text,p_expected_version integer)
returns public.dinamica_nerd_aula_requests language plpgsql security definer set search_path='' as $$
declare actor public.dinamica_nerd_aula_profiles := dinamica_nerd_aula_private.actor(); r public.dinamica_nerd_aula_requests;
begin
  if actor.role<>'admin' then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  select * into r from public.dinamica_nerd_aula_requests where id=p_request_id for update;
  if not found then raise exception 'NOT_FOUND_OR_DENIED' using errcode='42501'; end if;
  if r.version is distinct from p_expected_version then raise exception 'STALE_REQUEST' using errcode='40001'; end if;
  if p_next_status is null or not ((r.status='open' and p_next_status='in_progress') or (r.status='in_progress' and p_next_status='completed')) then
    raise exception 'INVALID_TRANSITION' using errcode='22023';
  end if;
  update public.dinamica_nerd_aula_requests set status=p_next_status,version=version+1 where id=r.id returning * into r;
  return r;
end;
$$;

revoke all on all functions in schema dinamica_nerd_aula_private from public,anon,authenticated;
grant execute on function dinamica_nerd_aula_private.active_uid(),dinamica_nerd_aula_private.is_admin() to authenticated;
-- Limitar privilégios apenas às funções novas, sem alterar defaults globais.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'dinamica\_nerd\_aula\_%' escape '\'
  loop
    execute format('revoke all on function %s from public, anon, authenticated',f.signature);
    execute format('grant execute on function %s to authenticated',f.signature);
  end loop;
end;
$$;
grant execute on function public.dinamica_nerd_aula_register_participant(text),
  public.dinamica_nerd_aula_current_profile(text), public.dinamica_nerd_aula_list_requests(text,integer),
  public.dinamica_nerd_aula_get_request(uuid,text), public.dinamica_nerd_aula_list_comments(uuid,text,integer),
  public.dinamica_nerd_aula_counts(text), public.dinamica_nerd_aula_create_request(text,text,text,text,text),
  public.dinamica_nerd_aula_add_comment(uuid,text,text) to anon;
commit;
