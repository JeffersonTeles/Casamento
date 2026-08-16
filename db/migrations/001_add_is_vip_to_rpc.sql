-- Migration: Adicionar is_vip ao RPC get_guest_public_by_token
-- Execute este SQL no SQL Editor do Supabase Dashboard
-- Data: 2026-08-16

-- 1. Garantir que a coluna is_vip existe na tabela guests
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS is_vip boolean DEFAULT false;

-- 2. Atualizar o RPC para retornar is_vip
DROP FUNCTION IF EXISTS public.get_guest_public_by_token(text);
CREATE OR REPLACE FUNCTION public.get_guest_public_by_token(p_invite_token text)
RETURNS TABLE (id uuid, name text, rsvp_status text, invite_token text, is_vip boolean)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id, g.name, g.rsvp_status, g.invite_token, g.is_vip
  FROM public.guests g
  WHERE g.invite_token = p_invite_token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_public_by_token(text) TO anon, authenticated;
