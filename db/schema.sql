-- ============================================================
-- SUPABASE — Políticas de Segurança (RLS)
-- Execute este SQL no SQL Editor do Supabase (Dashboard).
--
-- IMPORTANTE: o painel (organizacao.html) agora usa Supabase Auth.
-- As políticas abaixo bloqueiam acesso anônimo às tabelas privadas.
-- ============================================================

-- ---------- GUESTS ----------
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
alter table public.tasks enable row level security;

drop policy if exists "tasks_admin" on public.tasks;
create policy "tasks_admin" on public.tasks
  for all to authenticated using (true) with check (true);

-- ---------- EXPENSES ----------
alter table public.expenses enable row level security;

drop policy if exists "expenses_admin" on public.expenses;
create policy "expenses_admin" on public.expenses
  for all to authenticated using (true) with check (true);

-- ---------- BUDGET_CATEGORIES ----------
alter table public.budget_categories enable row level security;

drop policy if exists "budget_admin" on public.budget_categories;
create policy "budget_admin" on public.budget_categories
  for all to authenticated using (true) with check (true);

-- ---------- PLANNER_NOTES ----------
alter table public.planner_notes enable row level security;

drop policy if exists "planner_notes_admin" on public.planner_notes;
create policy "planner_notes_admin" on public.planner_notes
  for all to authenticated using (true) with check (true);

-- ---------- AUDIT_LOGS ----------
alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_admin" on public.audit_logs;
create policy "audit_logs_admin" on public.audit_logs
  for all to authenticated using (true) with check (true);

-- ---------- SUPPLIERS ----------
alter table public.suppliers enable row level security;

drop policy if exists "suppliers_admin" on public.suppliers;
create policy "suppliers_admin" on public.suppliers
  for all to authenticated using (true) with check (true);

-- ---------- TIMELINE ----------
alter table public.timeline enable row level security;

drop policy if exists "timeline_admin" on public.timeline;
create policy "timeline_admin" on public.timeline
  for all to authenticated using (true) with check (true);

-- ---------- MOODBOARD ----------
alter table public.moodboard enable row level security;

drop policy if exists "moodboard_admin" on public.moodboard;
create policy "moodboard_admin" on public.moodboard
  for all to authenticated using (true) with check (true);

-- ---------- GUESTBOOK (público) ----------
-- O livro de recados deve permitir leitura e inserção anônimas,
-- mas sem atualizar/excluir.
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

-- ---------- RSVP_ACCESS_LOGS ----------
-- Somente o admin grava logs. Leituras restritas a autenticados.
alter table public.rsvp_access_logs enable row level security;

drop policy if exists "rsvp_logs_select_admin" on public.rsvp_access_logs;
create policy "rsvp_logs_select_admin" on public.rsvp_access_logs
  for select to authenticated using (true);

drop policy if exists "rsvp_logs_insert_anon" on public.rsvp_access_logs;
create policy "rsvp_logs_insert_anon" on public.rsvp_access_logs
  for insert to anon, authenticated with check (true);

-- ============================================================
-- FUNÇÕES RPC (usadas pelo rsvp.html)
-- Essas funções devem existir para o RSVP por token funcionar.
-- ============================================================

-- Retorna dados públicos de um convidado pelo token do convite.
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
