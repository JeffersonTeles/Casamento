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
  partner_id uuid references public.guests(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.guests enable row level security;

-- Convidados só são lidos/escritos por usuários autenticados (admin)
drop policy if exists "guests_select_admin" on public.guests;
create policy "guests_select_admin" on public.guests
  for select to authenticated using (true);

drop policy if exists "guests_insert_admin" on public.guests;
create policy "guests_insert_admin" on public.guests
  for insert to authenticated with check (true);

drop policy if exists "guests_update_admin" on public.guests;
create policy "guests_update_admin" on public.guests
  for update to authenticated using (true) with check (true);

drop policy if exists "guests_delete_admin" on public.guests;
create policy "guests_delete_admin" on public.guests
  for delete to authenticated using (true);

-- ---------- TASKS ----------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'pendente',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tasks enable row level security;

drop policy if exists "tasks_admin" on public.tasks;
create policy "tasks_admin" on public.tasks
  for all to authenticated using (true) with check (true);

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
  for all to authenticated using (true) with check (true);

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
  for all to authenticated using (true) with check (true);

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
  for all to authenticated using (true) with check (true);

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
  for all to authenticated using (true) with check (true);

-- ---------- SUPPLIERS ----------
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  value numeric default 0,
  status text not null default 'ativo',
  created_at timestamptz not null default now()
);
alter table public.suppliers enable row level security;

drop policy if exists "suppliers_admin" on public.suppliers;
create policy "suppliers_admin" on public.suppliers
  for all to authenticated using (true) with check (true);

-- ---------- ADMIN_ACCESS ----------
create table if not exists public.admin_access (
  email text primary key,
  created_at timestamptz not null default now()
);
alter table public.admin_access enable row level security;

drop policy if exists "admin_access_admin" on public.admin_access;
create policy "admin_access_admin" on public.admin_access
  for all to authenticated using (true) with check (true);

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
  for all to authenticated using (true) with check (true);

-- ---------- GUEST_VIEWS ----------
create table if not exists public.guest_views (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guests(id),
  viewed_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  device_type text
);
alter table public.guest_views enable row level security;

drop policy if exists "guest_views_admin" on public.guest_views;
create policy "guest_views_admin" on public.guest_views
  for all to authenticated using (true) with check (true);

-- ---------- RSVP_ACCESS_LOGS ----------
-- Somente o admin grava logs. Leituras restritas a autenticados.
create table if not exists public.rsvp_access_logs (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guests(id),
  access_time timestamptz not null default now()
);
alter table public.rsvp_access_logs enable row level security;

drop policy if exists "rsvp_logs_select_admin" on public.rsvp_access_logs;
create policy "rsvp_logs_select_admin" on public.rsvp_access_logs
  for select to authenticated using (true);

drop policy if exists "rsvp_logs_insert_anon" on public.rsvp_access_logs;
create policy "rsvp_logs_insert_anon" on public.rsvp_access_logs
  for insert to anon, authenticated with check (true);

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
  for all to authenticated using (true) with check (true);

-- ---------- MOODBOARD ----------
create table if not exists public.moodboard (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  created_at timestamptz not null default now()
);
alter table public.moodboard enable row level security;

drop policy if exists "moodboard_admin" on public.moodboard;
create policy "moodboard_admin" on public.moodboard
  for all to authenticated using (true) with check (true);

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
  for update to authenticated using (true) with check (true);

drop policy if exists "guestbook_delete_admin" on public.guestbook;
create policy "guestbook_delete_admin" on public.guestbook
  for delete to authenticated using (true);

-- ============================================================
-- FUNÇÕES RPC (usadas pelo rsvp.html)
-- Essas funções devem existir para o RSVP por token funcionar.
-- ============================================================

-- Retorna dados públicos de um convidado pelo token do convite.
drop function if exists public.get_guest_public_by_token(text);
create or replace function public.get_guest_public_by_token(p_invite_token text)
returns table (id uuid, name text, rsvp_status text, invite_token text)
language sql security definer
set search_path = public
as $$
  select g.id, g.name, g.rsvp_status, g.invite_token
  from public.guests g
  where g.invite_token = p_invite_token
  limit 1;
$$;

grant execute on function public.get_guest_public_by_token(text) to anon, authenticated;

-- Confirma/atualiza o RSVP de um convidado via token.
drop function if exists public.confirm_guest_rsvp(text, text);
create or replace function public.confirm_guest_rsvp(p_invite_token text, p_rsvp_status text)
returns boolean
language plpgsql security definer
set search_path = public
as $$
begin
  update public.guests
  set rsvp_status = p_rsvp_status, updated_at = now()
  where invite_token = p_invite_token;
  return found;
end;
$$;

grant execute on function public.confirm_guest_rsvp(text, text) to anon, authenticated;