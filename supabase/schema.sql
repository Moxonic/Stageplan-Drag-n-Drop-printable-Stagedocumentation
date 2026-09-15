-- supabase/schema.sql — everything StagePlanner keeps on the server.
--
-- Paste into the Supabase SQL editor and run. Safe to run again after changes:
-- tables are created if missing, functions and policies are replaced.
--
-- Accounts are Supabase's own auth.users. Everything below hangs off them with
-- "on delete cascade", so deleting an account (supabase/functions/delete-account)
-- deletes its profile, its shows, its crew links and the teams it created.
--
-- Row level security does the enforcing. The app only ever holds the public
-- anon key and the signed-in person's token; the service_role key lives in the
-- Edge Functions and nowhere else.


-- ===========================================================================
-- Settings: the day billing started
-- ===========================================================================

create table if not exists public.app_settings (
    id                  boolean primary key default true check (id),
    billing_launched_at timestamptz
);
insert into public.app_settings (id) values (true) on conflict (id) do nothing;
alter table public.app_settings enable row level security;
-- No policies: read only through the functions below.

-- The day paid plans start. Everyone who signed up before this moment keeps
-- the paid features free for good, and the app tells them so. Run it once,
-- on launch day:
--   update public.app_settings set billing_launched_at = now();


-- ===========================================================================
-- Profiles: the plan field
-- ===========================================================================

create table if not exists public.profiles (
    id                 uuid primary key references auth.users (id) on delete cascade,
    plan               text not null default 'free' check (plan in ('free', 'pro')),
    stripe_customer_id text unique,
    plan_renews_at     timestamptz,
    created_at         timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "read your own profile" on public.profiles;
create policy "read your own profile" on public.profiles
    for select to authenticated using (id = (select auth.uid()));
-- No insert, update or delete policies: the signup trigger and the Stripe
-- webhook (service role) are the only writers. Nobody can make themselves pro.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
    insert into public.profiles (id, created_at)
    values (new.id, coalesce(new.created_at, now()))
    on conflict (id) do nothing;
    return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- accounts made before this file was run
insert into public.profiles (id, created_at)
select id, created_at from auth.users
on conflict (id) do nothing;

-- 'pro' when paying, 'grandfathered' when they signed up while it was free
-- (which is everyone, until billing_launched_at is set), otherwise 'free'.
create or replace function public.effective_plan(p_user uuid)
returns text language sql stable security definer set search_path = '' as $$
    select case
        when p.plan = 'pro' then 'pro'
        when s.billing_launched_at is null or p.created_at < s.billing_launched_at then 'grandfathered'
        else 'free'
    end
    from public.profiles p cross join public.app_settings s
    where p.id = p_user
$$;

create or replace function public.has_paid_features(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
    select coalesce(public.effective_plan(p_user) in ('pro', 'grandfathered'), false)
$$;

-- What the app reads to decide what to show.
create or replace function public.my_plan()
returns json language sql stable security definer set search_path = '' as $$
    select json_build_object(
        'plan', p.plan,
        'effective', public.effective_plan(p.id),
        'billing_live', s.billing_launched_at is not null and s.billing_launched_at <= now(),
        'renews_at', p.plan_renews_at,
        'has_billing', p.stripe_customer_id is not null
    )
    from public.profiles p cross join public.app_settings s
    where p.id = auth.uid()
$$;


-- ===========================================================================
-- Shared bits
-- ===========================================================================

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
    new.updated_at := now();
    return new;
end $$;

-- Every write to a show bumps its revision, so two machines saving the same
-- show notice each other instead of overwriting.
create or replace function public.bump_revision()
returns trigger language plpgsql set search_path = '' as $$
begin
    new.updated_at := now();
    new.rev := old.rev + 1;
    return new;
end $$;


-- ===========================================================================
-- Shows: the show document, one row per show
-- ===========================================================================

create table if not exists public.shows (
    id         uuid primary key default gen_random_uuid(),
    owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
    title      text not null default '',
    doc        jsonb not null,
    rev        bigint not null default 1,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint shows_doc_size check (pg_column_size(doc) < 10485760)
);
create index if not exists shows_owner_updated on public.shows (owner_id, updated_at desc);
alter table public.shows enable row level security;

drop trigger if exists shows_revision on public.shows;
create trigger shows_revision before update on public.shows
    for each row execute function public.bump_revision();

drop policy if exists "read your shows" on public.shows;
drop policy if exists "add your shows" on public.shows;
drop policy if exists "change your shows" on public.shows;
drop policy if exists "delete your shows" on public.shows;
create policy "read your shows" on public.shows
    for select to authenticated using (owner_id = (select auth.uid()));
create policy "add your shows" on public.shows
    for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "change your shows" on public.shows
    for update to authenticated
    using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "delete your shows" on public.shows
    for delete to authenticated using (owner_id = (select auth.uid()));


-- ===========================================================================
-- Crew links: a show handed over by link
-- ===========================================================================

create table if not exists public.show_links (
    token      text primary key default (
                   replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
    show_id    uuid not null references public.shows (id) on delete cascade,
    created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
    created_at timestamptz not null default now()
);
create index if not exists show_links_show on public.show_links (show_id);
alter table public.show_links enable row level security;

drop policy if exists "read links to your shows" on public.show_links;
drop policy if exists "make links to your shows" on public.show_links;
drop policy if exists "delete links to your shows" on public.show_links;
create policy "read links to your shows" on public.show_links
    for select to authenticated using (
        exists (select 1 from public.shows s where s.id = show_id and s.owner_id = (select auth.uid())));
create policy "make links to your shows" on public.show_links
    for insert to authenticated with check (
        created_by = (select auth.uid()) and
        exists (select 1 from public.shows s where s.id = show_id and s.owner_id = (select auth.uid())));
create policy "delete links to your shows" on public.show_links
    for delete to authenticated using (
        exists (select 1 from public.shows s where s.id = show_id and s.owner_id = (select auth.uid())));

-- Anyone signed in who holds the token sees the latest version of that show,
-- and nothing else: not the owner, not their other shows.
create or replace function public.open_show_link(p_token text)
returns table (show_id uuid, title text, doc jsonb, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
    select s.id, s.title, s.doc, s.updated_at
    from public.show_links l
    join public.shows s on s.id = l.show_id
    where l.token = p_token and auth.uid() is not null
$$;


-- ===========================================================================
-- Teams: a venue and its crew
-- ===========================================================================

create table if not exists public.teams (
    id         uuid primary key default gen_random_uuid(),
    name       text not null check (length(trim(name)) between 1 and 120),
    created_by uuid not null references auth.users (id) on delete cascade,
    created_at timestamptz not null default now()
);

create table if not exists public.team_members (
    team_id  uuid not null references public.teams (id) on delete cascade,
    user_id  uuid not null references auth.users (id) on delete cascade,
    role     text not null default 'member' check (role in ('owner', 'member')),
    email    text not null default '',
    added_at timestamptz not null default now(),
    primary key (team_id, user_id)
);
create index if not exists team_members_user on public.team_members (user_id);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

-- Security definer, so a policy on team_members can ask about team_members
-- without recursing into itself.
create or replace function public.is_team_member(p_team uuid)
returns boolean language sql stable security definer set search_path = '' as $$
    select exists (select 1 from public.team_members m
                   where m.team_id = p_team and m.user_id = auth.uid())
$$;

create or replace function public.is_team_owner(p_team uuid)
returns boolean language sql stable security definer set search_path = '' as $$
    select exists (select 1 from public.team_members m
                   where m.team_id = p_team and m.user_id = auth.uid() and m.role = 'owner')
$$;

-- A team's shared library can be written to while its creator's plan includes teams.
create or replace function public.team_has_paid_features(p_team uuid)
returns boolean language sql stable security definer set search_path = '' as $$
    select coalesce((select public.has_paid_features(t.created_by) from public.teams t where t.id = p_team), false)
$$;

drop policy if exists "members see the team" on public.teams;
drop policy if exists "owners rename the team" on public.teams;
drop policy if exists "owners delete the team" on public.teams;
create policy "members see the team" on public.teams
    for select to authenticated using (public.is_team_member(id));
create policy "owners rename the team" on public.teams
    for update to authenticated using (public.is_team_owner(id)) with check (public.is_team_owner(id));
create policy "owners delete the team" on public.teams
    for delete to authenticated using (public.is_team_owner(id));
-- No insert policy: teams are made through create_team(), which checks the plan.

drop policy if exists "members see each other" on public.team_members;
drop policy if exists "leave, or be removed by the owner" on public.team_members;
create policy "members see each other" on public.team_members
    for select to authenticated using (public.is_team_member(team_id));
create policy "leave, or be removed by the owner" on public.team_members
    for delete to authenticated using (
        (user_id = (select auth.uid()) and role <> 'owner') or
        (public.is_team_owner(team_id) and user_id <> (select auth.uid())));
-- No insert or update policy: people are added through add_team_member().

create or replace function public.create_team(p_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
    v_team  uuid;
    v_email text;
begin
    if auth.uid() is null then
        raise exception 'Not signed in' using errcode = '42501';
    end if;
    if not public.has_paid_features(auth.uid()) then
        raise exception 'Teams come with the paid plan.' using errcode = '42501';
    end if;
    if coalesce(trim(p_name), '') = '' then
        raise exception 'Name the team.';
    end if;

    select email into v_email from auth.users where id = auth.uid();
    insert into public.teams (name, created_by) values (trim(p_name), auth.uid()) returning id into v_team;
    insert into public.team_members (team_id, user_id, role, email)
    values (v_team, auth.uid(), 'owner', coalesce(v_email, ''));
    return v_team;
end $$;

create or replace function public.add_team_member(p_team uuid, p_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare
    v_user  uuid;
    v_email text;
begin
    if not public.is_team_owner(p_team) then
        raise exception 'Only the team owner can add people.' using errcode = '42501';
    end if;
    if not public.team_has_paid_features(p_team) then
        raise exception 'Teams come with the paid plan.' using errcode = '42501';
    end if;

    select id, email into v_user, v_email
    from auth.users
    where lower(email) = lower(trim(p_email))
    limit 1;

    if v_user is null then
        raise exception 'No StagePlanner account uses that email yet. Ask them to sign in once, then add them.';
    end if;

    insert into public.team_members (team_id, user_id, role, email)
    values (p_team, v_user, 'member', coalesce(v_email, ''))
    on conflict (team_id, user_id) do nothing;
end $$;


-- ===========================================================================
-- The team's stage library and storage lists
-- ===========================================================================

create table if not exists public.team_stages (
    id         uuid primary key default gen_random_uuid(),
    team_id    uuid not null references public.teams (id) on delete cascade,
    name       text not null check (length(trim(name)) between 1 and 200),
    config     jsonb not null,
    updated_by uuid default auth.uid() references auth.users (id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (team_id, name)
);

create table if not exists public.team_storage (
    id         uuid primary key default gen_random_uuid(),
    team_id    uuid not null references public.teams (id) on delete cascade,
    name       text not null check (length(trim(name)) between 1 and 200),
    items      jsonb not null default '[]'::jsonb,
    custom     jsonb not null default '[]'::jsonb,
    updated_by uuid default auth.uid() references auth.users (id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists team_storage_team on public.team_storage (team_id);

alter table public.team_stages enable row level security;
alter table public.team_storage enable row level security;

drop trigger if exists team_stages_touch on public.team_stages;
create trigger team_stages_touch before update on public.team_stages
    for each row execute function public.touch_updated_at();
drop trigger if exists team_storage_touch on public.team_storage;
create trigger team_storage_touch before update on public.team_storage
    for each row execute function public.touch_updated_at();

drop policy if exists "members read team stages" on public.team_stages;
drop policy if exists "members add team stages" on public.team_stages;
drop policy if exists "members change team stages" on public.team_stages;
drop policy if exists "members delete team stages" on public.team_stages;
create policy "members read team stages" on public.team_stages
    for select to authenticated using (public.is_team_member(team_id));
create policy "members add team stages" on public.team_stages
    for insert to authenticated
    with check (public.is_team_member(team_id) and public.team_has_paid_features(team_id));
create policy "members change team stages" on public.team_stages
    for update to authenticated
    using (public.is_team_member(team_id))
    with check (public.is_team_member(team_id) and public.team_has_paid_features(team_id));
create policy "members delete team stages" on public.team_stages
    for delete to authenticated using (public.is_team_member(team_id));

drop policy if exists "members read team storage" on public.team_storage;
drop policy if exists "members add team storage" on public.team_storage;
drop policy if exists "members change team storage" on public.team_storage;
drop policy if exists "members delete team storage" on public.team_storage;
create policy "members read team storage" on public.team_storage
    for select to authenticated using (public.is_team_member(team_id));
create policy "members add team storage" on public.team_storage
    for insert to authenticated
    with check (public.is_team_member(team_id) and public.team_has_paid_features(team_id));
create policy "members change team storage" on public.team_storage
    for update to authenticated
    using (public.is_team_member(team_id))
    with check (public.is_team_member(team_id) and public.team_has_paid_features(team_id));
create policy "members delete team storage" on public.team_storage
    for delete to authenticated using (public.is_team_member(team_id));


-- ===========================================================================
-- Who may call what
-- ===========================================================================

-- Supabase grants new functions to anon as well; none of these are for
-- visitors who are not signed in.
revoke execute on function
    public.effective_plan(uuid),
    public.has_paid_features(uuid),
    public.my_plan(),
    public.open_show_link(text),
    public.is_team_member(uuid),
    public.is_team_owner(uuid),
    public.team_has_paid_features(uuid),
    public.create_team(text),
    public.add_team_member(uuid, text)
from public, anon;

grant execute on function
    public.effective_plan(uuid),
    public.has_paid_features(uuid),
    public.my_plan(),
    public.open_show_link(text),
    public.is_team_member(uuid),
    public.is_team_owner(uuid),
    public.team_has_paid_features(uuid),
    public.create_team(text),
    public.add_team_member(uuid, text)
to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;


-- ===========================================================================
-- Numbers worth watching (the rest is in PostHog)
-- ===========================================================================

-- Stage 2 is done when you can name the people who opened a show on a second machine.
-- PostHog has the per-device view; this is who has shows in the account at all:
-- select u.email, count(s.*) as shows, max(s.updated_at) as last_saved
--   from auth.users u join public.shows s on s.owner_id = u.id
--  group by u.email order by last_saved desc limit 10;

-- Paying accounts
-- select count(*) filter (where plan = 'pro') as paying, count(*) as accounts from public.profiles;

-- A table from an earlier, home-made usage log, if it was ever created:
-- drop table if exists public.events;
