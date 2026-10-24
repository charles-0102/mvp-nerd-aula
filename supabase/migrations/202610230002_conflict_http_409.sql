-- Conflito de negócio retorna HTTP 409; não deve disparar retries de serialização.
-- https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions
begin;
create or replace function public.dinamica_nerd_aula_revise_priority(p_request_id uuid,p_priority text,p_reason text,p_expected_version integer,p_expected_priority text)
returns public.dinamica_nerd_aula_requests language plpgsql security definer set search_path='' as $$
declare actor public.dinamica_nerd_aula_profiles := dinamica_nerd_aula_private.actor(); r public.dinamica_nerd_aula_requests; reason text; previous text;
begin
  if actor.role<>'admin' then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  select * into r from public.dinamica_nerd_aula_requests where id=p_request_id for update;
  if not found then raise exception 'NOT_FOUND_OR_DENIED' using errcode='42501'; end if;
  if r.version is distinct from p_expected_version or r.priority is distinct from p_expected_priority then raise exception 'STALE_REQUEST' using errcode='PT409'; end if;
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
create or replace function public.dinamica_nerd_aula_advance_status(p_request_id uuid,p_next_status text,p_expected_version integer)
returns public.dinamica_nerd_aula_requests language plpgsql security definer set search_path='' as $$
declare actor public.dinamica_nerd_aula_profiles := dinamica_nerd_aula_private.actor(); r public.dinamica_nerd_aula_requests;
begin
  if actor.role<>'admin' then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  select * into r from public.dinamica_nerd_aula_requests where id=p_request_id for update;
  if not found then raise exception 'NOT_FOUND_OR_DENIED' using errcode='42501'; end if;
  if r.version is distinct from p_expected_version then raise exception 'STALE_REQUEST' using errcode='PT409'; end if;
  if p_next_status is null or not ((r.status='open' and p_next_status='in_progress') or (r.status='in_progress' and p_next_status='completed')) then
    raise exception 'INVALID_TRANSITION' using errcode='22023';
  end if;
  update public.dinamica_nerd_aula_requests set status=p_next_status,version=version+1 where id=r.id returning * into r;
  return r;
end;
$$;

commit;
