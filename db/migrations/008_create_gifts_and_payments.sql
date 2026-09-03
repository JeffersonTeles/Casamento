-- ============================================================
-- MIGRAÇÃO 008 — Presentes, Contribuições e Mercado Pago
-- ============================================================

-- 1. Adicionar colunas de presente na tabela home_items se não existirem
ALTER TABLE public.home_items
  ADD COLUMN IF NOT EXISTS is_gift boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_gifted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS gifted_by text,
  ADD COLUMN IF NOT EXISTS gifted_at timestamptz,
  ADD COLUMN IF NOT EXISTS gifted_message text;

-- 2. Permitir leitura pública (anon) dos itens de presentes
DROP POLICY IF EXISTS "home_items_select_public" ON public.home_items;
CREATE POLICY "home_items_select_public" ON public.home_items
  FOR SELECT TO anon, authenticated USING (true);

-- 3. Criar tabela de contribuições de presentes
CREATE TABLE IF NOT EXISTS public.gift_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES public.home_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  donor_name text NOT NULL,
  donor_message text,
  amount numeric NOT NULL,
  payment_method text DEFAULT 'mercadopago',
  payment_status text NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'cancelled'
  mp_payment_id text,
  mp_preference_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gift_contributions ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para gift_contributions
-- Anon e autenticados podem ver contribuições aprovadas (mural de mensagens)
DROP POLICY IF EXISTS "gift_contributions_select_approved" ON public.gift_contributions;
CREATE POLICY "gift_contributions_select_approved" ON public.gift_contributions
  FOR SELECT TO anon, authenticated
  USING (payment_status = 'approved' OR public.is_admin());

-- Anon pode inserir nova contribuição pendente
DROP POLICY IF EXISTS "gift_contributions_insert_public" ON public.gift_contributions;
CREATE POLICY "gift_contributions_insert_public" ON public.gift_contributions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Admin tem controle total
DROP POLICY IF EXISTS "gift_contributions_all_admin" ON public.gift_contributions;
CREATE POLICY "gift_contributions_all_admin" ON public.gift_contributions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
