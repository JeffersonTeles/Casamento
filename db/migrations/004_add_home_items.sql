-- ============================================================
-- MIGRAÇÃO 004 — Tabela home_items (Casa & Móveis)
-- Execute este SQL no SQL Editor do Supabase.
-- Idempotente: pode rodar várias vezes com segurança.
-- ============================================================

create table if not exists public.home_items (
  id               uuid    primary key default gen_random_uuid(),
  name             text    not null,
  category         text,
  status           text    not null default 'precisamos',   -- 'temos' | 'precisamos'
  priority         text    not null default 'Média',        -- 'Alta' | 'Média' | 'Baixa'
  price            numeric default 0,
  notes            text,
  buy_link         text,
  link_title       text,
  link_image       text,
  link_description text,
  link_domain      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.home_items enable row level security;

drop policy if exists "home_items_admin" on public.home_items;
create policy "home_items_admin" on public.home_items
  for all to authenticated using (true) with check (true);
