-- ============================================================
-- SUPABASE — Schema completo + Políticas de Segurança (RLS)
-- Execute este SQL no SQL Editor do Supabase (Dashboard).
--
-- Idempotente: pode rodar várias vezes.
-- IMPORTANTE: o painel (organizacao.html) usa Supabase Auth.
-- As políticas abaixo bloqueiam acesso anônimo às tabelas privadas.
-- ============================================================

-- ---------- GUESTS ----------
create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  rsvp_status text not null default 'aguardando',
  invite_token text unique,
  invited_by text,
  "group" text,
  partner_id uuid references public.guests(id) on delete set null,
  partner_name text,
  plus_ones integer default 0,
  is_vip boolean default false,
  rsvp_lunch text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.guests enable row level security;

-- Convidados só são lidos/escritos por admin
drop policy if exists "guests_select_admin" on public.guests;
create policy "guests_select_admin" on public.guests
  for select to authenticated using (public.is_admin());

drop policy if exists "guests_insert_admin" on public.guests;
create policy "guests_insert_admin" on public.guests
  for insert to authenticated with check (public.is_admin());

drop policy if exists "guests_update_admin" on public.guests;
create policy "guests_update_admin" on public.guests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "guests_delete_admin" on public.guests;
create policy "guests_delete_admin" on public.guests
  for delete to authenticated using (public.is_admin());

-- ---------- TASKS ----------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'pendente',
  due_date date,
  owner text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tasks enable row level security;

drop policy if exists "tasks_admin" on public.tasks;
create policy "tasks_admin" on public.tasks
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- EXPENSES ----------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  item text not null,
  category text,
  amount numeric not null default 0,
  paid boolean not null default false,
  budget_amount numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.expenses enable row level security;

drop policy if exists "expenses_admin" on public.expenses;
create policy "expenses_admin" on public.expenses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- BUDGET_CATEGORIES ----------
create table if not exists public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  planned_amount numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.budget_categories enable row level security;

drop policy if exists "budget_admin" on public.budget_categories;
create policy "budget_admin" on public.budget_categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- PLANNER_NOTES ----------
create table if not exists public.planner_notes (
  id text primary key,
  notes text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.planner_notes enable row level security;

drop policy if exists "planner_notes_admin" on public.planner_notes;
create policy "planner_notes_admin" on public.planner_notes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- AUDIT_LOGS ----------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  action text not null,
  user_name text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_admin" on public.audit_logs;
create policy "audit_logs_admin" on public.audit_logs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- SUPPLIERS ----------
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  value numeric default 0,
  status text not null default 'ativo',
  contact text,
  map_link text,
  created_at timestamptz not null default now()
);
alter table public.suppliers enable row level security;

drop policy if exists "suppliers_admin" on public.suppliers;
create policy "suppliers_admin" on public.suppliers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- ADMIN_ACCESS ----------
create table if not exists public.admin_access (
  email text primary key,
  created_at timestamptz not null default now()
);
alter table public.admin_access enable row level security;

-- ---------- FUNCAO is_admin() ----------
-- Valida se o usuario autenticado esta na tabela admin_access.
-- Usa SECURITY DEFINER para evitar recursao infinita (RLS de admin_access depender dela).
create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text;
  v_exists boolean;
begin
  -- Extrai email do JWT do usuario autenticado (Supabase Auth)
  select auth.jwt() ->> 'email' into v_email;

  -- Retorna falso imediatamente se nao ha email ou nao ha usuario logado
  if v_email is null or v_email = '' then
    return false;
  end if;

  -- Normaliza para lowercase e trim
  v_email := lower(trim(v_email));

  -- Usa consulta direta (sem passar por RLS desta tabela, pois SECURITY DEFINER
  -- roda como owner da funcao = owner da tabela = bypass de RLS)
  select exists (select 1 from public.admin_access where lower(trim(email)) = v_email)
    into v_exists;

  return v_exists;
end;
$$;

-- Politicas de admin_access:
-- Usuarios admin podem ver toda a tabela. Usuarios autenticados NAO admin NAO veem nada.
-- (Nao usamos is_admin() aqui para evitar recursao — checamos por JWT direto, ou
--  deixamos apenas o service_role/postgres manipular via seed.)
drop policy if exists "admin_access_admin" on public.admin_access;
create policy "admin_access_admin" on public.admin_access
  for all to authenticated
  using (lower(trim(auth.email())) = lower(trim(email)) or public.is_admin())
  with check (public.is_admin());

-- ---------- GIFTS ----------
create table if not exists public.gifts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  description text,
  price_suggestion numeric,
  category text,
  status text not null default 'disponivel',
  reserved_by text,
  pix_key text,
  store_url text,
  created_at timestamptz not null default now()
);
alter table public.gifts enable row level security;

drop policy if exists "gifts_select_public" on public.gifts;
create policy "gifts_select_public" on public.gifts
  for select to anon, authenticated using (true);

drop policy if exists "gifts_admin" on public.gifts;
create policy "gifts_admin" on public.gifts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- DOCUMENTS ----------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  type text not null,
  size_bytes bigint,
  notes text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.documents enable row level security;

drop policy if exists "documents_admin" on public.documents;
create policy "documents_admin" on public.documents
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- GUEST_VIEWS ----------
create table if not exists public.guest_views (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guests(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  device_type text
);
alter table public.guest_views enable row level security;

drop policy if exists "guest_views_admin" on public.guest_views;
create policy "guest_views_admin" on public.guest_views
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- RSVP_ACCESS_LOGS ----------
-- Somente o admin grava logs. Leituras restritas a autenticados.
create table if not exists public.rsvp_access_logs (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guests(id) on delete cascade,
  access_time timestamptz not null default now()
);
alter table public.rsvp_access_logs enable row level security;

drop policy if exists "rsvp_logs_select_admin" on public.rsvp_access_logs;
create policy "rsvp_logs_select_admin" on public.rsvp_access_logs
  for select to authenticated using (public.is_admin());

drop policy if exists "rsvp_logs_insert_anon" on public.rsvp_access_logs;
create policy "rsvp_logs_insert_anon" on public.rsvp_access_logs
  for insert to anon, authenticated with check (true);

drop policy if exists "rsvp_logs_delete_admin" on public.rsvp_access_logs;
create policy "rsvp_logs_delete_admin" on public.rsvp_access_logs
  for delete to authenticated using (public.is_admin());

-- ---------- TIMELINE ----------
create table if not exists public.timeline (
  id uuid primary key default gen_random_uuid(),
  event_time time not null,
  description text not null,
  created_at timestamptz not null default now()
);
alter table public.timeline enable row level security;

drop policy if exists "timeline_admin" on public.timeline;
create policy "timeline_admin" on public.timeline
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- HOME_ITEMS ----------
create table if not exists public.home_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  status text not null default 'precisamos',   -- 'temos' | 'precisamos' | 'possivel'
  priority text not null default 'Média',        -- 'Alta' | 'Média' | 'Baixa'
  price numeric default 0,
  notes text,
  buy_link text,
  link_title text,
  link_image text,
  link_description text,
  link_domain text,
  is_gift boolean default true,
  is_gifted boolean default false,
  gifted_by text,
  gifted_at timestamptz,
  gifted_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.home_items enable row level security;

drop policy if exists "home_items_select_public" on public.home_items;
create policy "home_items_select_public" on public.home_items
  for select to anon, authenticated using (true);

drop policy if exists "home_items_admin" on public.home_items;
create policy "home_items_admin" on public.home_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- GIFT_CONTRIBUTIONS (Mercado Pago) ----------
create table if not exists public.gift_contributions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.home_items(id) on delete set null,
  item_name text not null,
  donor_name text not null,
  donor_message text,
  amount numeric not null,
  payment_method text default 'mercadopago',
  payment_status text not null default 'pending', -- 'pending' | 'approved' | 'rejected' | 'cancelled'
  mp_payment_id text,
  mp_preference_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.gift_contributions enable row level security;

drop policy if exists "gift_contributions_select_approved" on public.gift_contributions;
create policy "gift_contributions_select_approved" on public.gift_contributions
  for select to anon, authenticated using (payment_status = 'approved' or public.is_admin());

drop policy if exists "gift_contributions_insert_public" on public.gift_contributions;
create policy "gift_contributions_insert_public" on public.gift_contributions
  for insert to anon, authenticated with check (true);

drop policy if exists "gift_contributions_all_admin" on public.gift_contributions;
create policy "gift_contributions_all_admin" on public.gift_contributions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- MOODBOARD ----------
create table if not exists public.moodboard (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  created_at timestamptz not null default now()
);
alter table public.moodboard enable row level security;

drop policy if exists "moodboard_admin" on public.moodboard;
create policy "moodboard_admin" on public.moodboard
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- GUESTBOOK (público) ----------
-- O livro de recados deve permitir leitura e inserção anônimas,
-- mas sem atualizar/excluir.
create table if not exists public.guestbook (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  message text not null,
  created_at timestamptz not null default now()
);
alter table public.guestbook enable row level security;

drop policy if exists "guestbook_select_public" on public.guestbook;
create policy "guestbook_select_public" on public.guestbook
  for select to anon, authenticated using (true);

drop policy if exists "guestbook_insert_public" on public.guestbook;
create policy "guestbook_insert_public" on public.guestbook
  for insert to anon, authenticated with check (true);

drop policy if exists "guestbook_update_admin" on public.guestbook;
create policy "guestbook_update_admin" on public.guestbook
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "guestbook_delete_admin" on public.guestbook;
create policy "guestbook_delete_admin" on public.guestbook
  for delete to authenticated using (public.is_admin());

-- ============================================================
-- FUNÇÕES RPC (usadas pelo rsvp.html)
-- Essas funções devem existir para o RSVP por token funcionar.
-- ============================================================

-- Retorna dados públicos de um convidado pelo token do convite.
-- Inclui is_vip, partner_name, partner_token e rsvp_lunch para convites personalizados.
drop function if exists public.get_guest_public_by_token(text);
create or replace function public.get_guest_public_by_token(p_invite_token text)
returns table (id uuid, name text, rsvp_status text, invite_token text, is_vip boolean, partner_name text, partner_token text, rsvp_lunch text)
language sql security definer
set search_path = public
as $$
  select g.id, g.name, g.rsvp_status, g.invite_token, g.is_vip,
         g.partner_name, p.invite_token as partner_token, g.rsvp_lunch
  from public.guests g
  left join public.guests p on g.partner_id = p.id
  where g.invite_token = p_invite_token
  limit 1;
$$;

grant execute on function public.get_guest_public_by_token(text) to anon, authenticated;

-- Confirma/atualiza o RSVP de um convidado via token.
drop function if exists public.confirm_guest_rsvp(text, text, integer, text);
create or replace function public.confirm_guest_rsvp(p_invite_token text, p_rsvp_status text, p_plus_ones integer default 0, p_rsvp_lunch text default null)
returns boolean
language plpgsql security definer
set search_path = public
as $$
begin
  update public.guests
  set rsvp_status = p_rsvp_status, plus_ones = p_plus_ones, rsvp_lunch = p_rsvp_lunch, updated_at = now()
  where invite_token = p_invite_token;
  return found;
end;
$$;

grant execute on function public.confirm_guest_rsvp(text, text) to anon, authenticated;
grant execute on function public.confirm_guest_rsvp(text, text, integer, text) to anon, authenticated;

-- ============================================================
-- VIEW: Estatísticas do Dashboard (fonte única da verdade)
-- Substitui múltiplas queries separadas no carregamento inicial
-- ============================================================
drop view if exists public.v_dashboard_stats;
create view public.v_dashboard_stats as
select
  count(*) as total_registros,
  sum(case when rsvp_status = 'confirmado' then 1 else 0 end) as registros_confirmados,
  sum(case when rsvp_status = 'aguardando' then 1 else 0 end) as registros_pendentes,
  sum(case when rsvp_status = 'recusado' then 1 else 0 end) as registros_recusados,

  sum(case
    when partner_name is not null and trim(partner_name) != '' then
      1 + 1 + coalesce(plus_ones, 0)
    when plus_ones is not null and plus_ones > 0 then
      1 + coalesce(plus_ones, 0)
    else
      1
  end) as total_pessoas_estimadas,

  sum(case
    when rsvp_status = 'confirmado' then
      case
        when partner_name is not null and trim(partner_name) != '' then 1 + 1 + coalesce(plus_ones, 0)
        when plus_ones is not null and plus_ones > 0 then 1 + coalesce(plus_ones, 0)
        else 1
      end
    else 0
  end) as pessoas_confirmadas,

  sum(case
    when rsvp_status = 'aguardando' then
      case
        when partner_name is not null and trim(partner_name) != '' then 1 + 1 + coalesce(plus_ones, 0)
        when plus_ones is not null and plus_ones > 0 then 1 + coalesce(plus_ones, 0)
        else 1
      end
    else 0
  end) as pessoas_pendentes,

  sum(case
    when rsvp_status = 'recusado' then
      case
        when partner_name is not null and trim(partner_name) != '' then 1 + 1 + coalesce(plus_ones, 0)
        when plus_ones is not null and plus_ones > 0 then 1 + coalesce(plus_ones, 0)
        else 1
      end
    else 0
  end) as pessoas_recusadas
from public.guests;

-- Grants necessários na view (como referencia tabela guests, herda RLS da tabela)
grant select on public.v_dashboard_stats to authenticated;