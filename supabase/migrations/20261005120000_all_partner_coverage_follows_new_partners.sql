-- Agent coverage: an account that covers every partner keeps covering every
-- partner, including the ones created after it was set up.
--
-- WHAT WAS WRONG
--
-- Before 29 Aug the agent form saved "every state" as a named list of the
-- partners that existed that day. The 28 Aug backfill kept every named list
-- as explicit_partners, so those accounts stopped growing: on 5 Oct nine
-- managers who hold all 37 states were missing between 53 and 86 partners
-- each, and could neither see nor sell for them. Two further gaps would bring
-- it back later:
--
--   * Choosing "by partner" and ticking every partner saves the same frozen
--     list today.
--   * State coverage matches organizations.state as free text. A partner saved
--     with a state spelled differently from the canonical list would reach no
--     one by state, including the accounts meant to cover everything.
--
-- WHAT THIS DOES
--
--   1. Resolver: an agent on state coverage who holds every state in
--      nigeria_states covers every organization (less exclusions), whatever
--      its state is spelled as. Agents holding some states are unchanged.
--   2. Save: an explicit list that holds every organization is stored as state
--      coverage over every state, so "all partners" stays all partners.
--   3. Backfill: explicit lists that held every partner existing when they
--      were written (99% or more, which allows for the test partner the old
--      form left out) and whose agent holds every state move to state coverage.
--      Named lists that are a genuine pick are left alone; widening those is
--      still a decision taken one account at a time.
--
-- Named rows are kept. Coverage ignores them under state coverage, so undo is
-- the mode set back for the agents recorded in section 4.

-- ---------------------------------------------------------------------------
-- 1. The rule
-- ---------------------------------------------------------------------------

create or replace function public.acsl_agent_org_scope(p_agent_ids uuid[])
 returns table(agent_id uuid, organization_id uuid, source text)
 language sql
 stable
 set search_path to 'public'
as $function$
  with agents as (
    select distinct unnest(p_agent_ids) as id
  ),
  effective as (
    select a.id,
           coalesce(
             s.mode,
             case when exists (
                    select 1 from public.acsl_agent_organizations o
                     where o.agent_id = a.id
                  )
                  then 'explicit_partners'
                  else 'state_coverage'
             end
           ) as mode
      from agents a
      left join public.acsl_agent_scope s on s.agent_id = a.id
  ),
  -- Holding every canonical state means every partner. The first condition
  -- keeps an unreadable or empty state list from turning everyone into this.
  everywhere as (
    select e.id
      from effective e
     where e.mode = 'state_coverage'
       and exists (select 1 from public.nigeria_states)
       and not exists (
             select 1 from public.nigeria_states ns
              where not exists (
                      select 1 from public.acsl_agent_states st
                       where st.agent_id = e.id
                         and st.state = ns.name
                    )
           )
  ),
  explicit as (
    select e.id as agent_id, o.organization_id, 'explicit'::text as source
      from effective e
      join public.acsl_agent_organizations o on o.agent_id = e.id
     where e.mode = 'explicit_partners'
  ),
  all_partners as (
    select w.id as agent_id, org.id as organization_id, 'state'::text as source
      from everywhere w
     cross join public.organizations org
     where not exists (
             select 1 from public.acsl_agent_organization_exclusions x
              where x.agent_id = w.id
                and x.organization_id = org.id
           )
  ),
  by_state as (
    select e.id as agent_id, org.id as organization_id, 'state'::text as source
      from effective e
      join public.acsl_agent_states st on st.agent_id = e.id
      join public.organizations org on org.state = st.state
     where e.mode = 'state_coverage'
       and e.id not in (select id from everywhere)
       and not exists (
             select 1 from public.acsl_agent_organization_exclusions x
              where x.agent_id = e.id
                and x.organization_id = org.id
           )
  )
  -- An agent resolves under exactly one branch, so the union cannot produce
  -- two sources for one pair. Grouping is belt and braces against a future
  -- branch being added without thinking about it.
  select u.agent_id, u.organization_id, min(u.source) as source
    from (
      select * from explicit
      union all select * from all_partners
      union all select * from by_state
    ) u
   group by u.agent_id, u.organization_id
$function$;

-- The reverse answer must agree. Its candidates came from a matching state
-- name, which an every-state agent no longer needs, so they are added here.
create or replace function public.acsl_agents_covering_org(p_org_id uuid)
returns table (agent_id uuid, source text)
language sql
stable
security invoker
set search_path = public
as $$
  with candidates as (
    select o.agent_id from public.acsl_agent_organizations o where o.organization_id = p_org_id
    union
    select s.agent_id
      from public.acsl_agent_states s
      join public.organizations org on org.id = p_org_id and org.state = s.state
    union
    select s.agent_id
      from public.acsl_agent_states s
      join public.nigeria_states ns on ns.name = s.state
     group by s.agent_id
    having count(distinct s.state) = (select count(*) from public.nigeria_states)
  ),
  scoped as (
    select * from public.acsl_agent_org_scope(array(select agent_id from candidates))
  )
  select sc.agent_id, sc.source
    from scoped sc
   where sc.organization_id = p_org_id
$$;

-- ---------------------------------------------------------------------------
-- 2. Saving "every partner"
-- ---------------------------------------------------------------------------

create or replace function public.acsl_set_agent_scope(
  p_agent_id uuid,
  p_mode text,
  p_states text[],
  p_org_ids uuid[],
  p_excluded_org_ids uuid[],
  p_actor uuid
)
 returns void
 language plpgsql
 security invoker
 set search_path to 'public'
as $function$
declare
  v_role text;
begin
  -- The target must be an agent. Anything else is a caller mistake worth
  -- refusing loudly rather than writing rows nobody will ever read.
  select role into v_role from public.profiles where id = p_agent_id;
  if v_role is null then
    raise exception 'No such profile: %', p_agent_id using errcode = '23503';
  end if;
  if v_role not in ('acsl_agent', 'acsl_agent_manager', 'super_admin_agent') then
    raise exception 'Profile % is a % and cannot hold agent scope', p_agent_id, v_role
      using errcode = '22023';
  end if;

  if p_mode is not null and p_mode not in ('state_coverage', 'explicit_partners') then
    raise exception 'Unknown coverage mode: %', p_mode using errcode = '22023';
  end if;

  /*
   * A named list that holds every partner means "every partner", and a list
   * cannot grow by itself. Store it as every state instead, which the resolver
   * reads as every partner, so partners created later arrive without anyone
   * editing the account. The list is still written below, so switching the
   * account back to "by partner" shows what was ticked.
   */
  if p_mode = 'explicit_partners'
     and coalesce(array_length(p_org_ids, 1), 0) > 0
     and exists (select 1 from public.nigeria_states)
     and not exists (
           select 1 from public.organizations o
            where not coalesce(o.id = any (p_org_ids), false)
         )
  then
    p_mode := 'state_coverage';
    -- Every partner was ticked, so an exclusion left over from an earlier
    -- state setup would take away a partner the admin chose.
    p_excluded_org_ids := '{}'::uuid[];
    p_states := array(
      select distinct s
        from unnest(coalesce(p_states, '{}'::text[])
                    || array(select ns.name from public.nigeria_states ns)) as s
    );
  end if;

  insert into public.acsl_agent_scope (agent_id, mode, updated_by, updated_at)
  values (p_agent_id, p_mode, p_actor, now())
  on conflict (agent_id) do update
    set mode = excluded.mode,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;

  /*
   * Replace all three lists.
   *
   * Deliberately replace rather than merge: the caller sends the whole
   * intended state, which is what the UI has in front of it, and a merge would
   * make "remove this partner" impossible to express.
   *
   * Both modes' rows are kept whichever mode is set. Coverage ignores the ones
   * that do not apply, so an agent switched from state to explicit and back
   * gets exactly what they had. That reversibility is what makes it safe to
   * try a switch on one live account.
   */
  delete from public.acsl_agent_states where agent_id = p_agent_id;
  if p_states is not null and array_length(p_states, 1) > 0 then
    insert into public.acsl_agent_states (agent_id, state, assigned_by)
    select p_agent_id, s, p_actor
      from unnest(p_states) as s
     where btrim(s) <> ''
    on conflict (agent_id, state) do nothing;
  end if;

  delete from public.acsl_agent_organizations where agent_id = p_agent_id;
  if p_org_ids is not null and array_length(p_org_ids, 1) > 0 then
    insert into public.acsl_agent_organizations (agent_id, organization_id, assigned_by)
    select distinct p_agent_id, o, p_actor
      from unnest(p_org_ids) as o
    on conflict (agent_id, organization_id) do nothing;
  end if;

  delete from public.acsl_agent_organization_exclusions where agent_id = p_agent_id;
  if p_excluded_org_ids is not null and array_length(p_excluded_org_ids, 1) > 0 then
    insert into public.acsl_agent_organization_exclusions (agent_id, organization_id, excluded_by)
    select distinct p_agent_id, o, p_actor
      from unnest(p_excluded_org_ids) as o
    on conflict (agent_id, organization_id) do nothing;
  end if;
end;
$function$;

revoke all on function public.acsl_set_agent_scope(uuid, text, text[], uuid[], uuid[], uuid) from "anon", "authenticated";
grant execute on function public.acsl_set_agent_scope(uuid, text, text[], uuid[], uuid[], uuid) to "service_role";

-- ---------------------------------------------------------------------------
-- 3. Backfill: the accounts already frozen
-- ---------------------------------------------------------------------------

create table if not exists public."acsl_scope_all_partners_20261005" (
  agent_id uuid primary key,
  listed integer not null,
  existing_when_listed integer not null,
  list_written_at timestamptz not null,
  converted_at timestamptz not null default now()
);
alter table public."acsl_scope_all_partners_20261005" enable row level security;
revoke all on public."acsl_scope_all_partners_20261005" from "anon", "authenticated";
grant select on public."acsl_scope_all_partners_20261005" to "service_role";

with lists as (
  select s.agent_id,
         count(a.organization_id) as listed,
         max(a.assigned_at) as list_written_at
    from public.acsl_agent_scope s
    join public.acsl_agent_organizations a on a.agent_id = s.agent_id
   where s.mode = 'explicit_partners'
   group by s.agent_id
),
measured as (
  select l.*,
         (select count(*) from public.organizations o
           where o.created_at <= l.list_written_at) as existing_when_listed
    from lists l
)
insert into public."acsl_scope_all_partners_20261005" (agent_id, listed, existing_when_listed, list_written_at)
select m.agent_id, m.listed, m.existing_when_listed, m.list_written_at
  from measured m
 where m.existing_when_listed > 0
   and m.listed * 100 >= m.existing_when_listed * 99
   and exists (select 1 from public.nigeria_states)
   and not exists (
         select 1 from public.nigeria_states ns
          where not exists (
                  select 1 from public.acsl_agent_states st
                   where st.agent_id = m.agent_id
                     and st.state = ns.name
                )
       )
on conflict (agent_id) do nothing;

update public.acsl_agent_scope s
   set mode = 'state_coverage',
       updated_at = now(),
       updated_by = null
  from public."acsl_scope_all_partners_20261005" c
 where s.agent_id = c.agent_id
   and s.mode = 'explicit_partners';

-- ---------------------------------------------------------------------------
-- 4. Undo
-- ---------------------------------------------------------------------------
--
--   update public.acsl_agent_scope s set mode = 'explicit_partners', updated_at = now()
--     from public."acsl_scope_all_partners_20261005" c where s.agent_id = c.agent_id;
--
-- then re-run the function bodies from 20260828120000 (acsl_agent_org_scope,
-- acsl_agents_covering_org) and 20260828160000 (acsl_set_agent_scope).
