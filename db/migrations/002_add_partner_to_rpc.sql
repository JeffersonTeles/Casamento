-- Migration: Adicionar partner_name e atualizar RPC
-- Execute este SQL no SQL Editor do Supabase Dashboard
-- Data: 2026-08-16

-- 1. Garantir que as colunas existem
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.guests(id);
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS partner_name text;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS is_vip boolean DEFAULT false;

-- 2. Atualizar o RPC para retornar partner_name e partner_token
DROP FUNCTION IF EXISTS public.get_guest_public_by_token(text);
CREATE OR REPLACE FUNCTION public.get_guest_public_by_token(p_invite_token text)
RETURNS TABLE (
  id uuid,
  name text,
  rsvp_status text,
  invite_token text,
  is_vip boolean,
  partner_name text,
  partner_token text
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    g.id,
    g.name,
    g.rsvp_status,
    g.invite_token,
    g.is_vip,
    g.partner_name,
    p.invite_token AS partner_token
  FROM public.guests g
  LEFT JOIN public.guests p ON g.partner_id = p.id
  WHERE g.invite_token = p_invite_token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_public_by_token(text) TO anon, authenticated;
