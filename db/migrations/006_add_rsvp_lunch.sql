-- Migration: Adicionar rsvp_lunch e atualizar RPCs para salvar a escolha do almoço
-- Execute este SQL no SQL Editor do Supabase Dashboard
-- Data: 2026-08-30

-- 1. Garantir que a coluna existe
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS rsvp_lunch text;

-- 2. Atualizar o RPC de confirmação para aceitar e salvar a escolha do almoço
CREATE OR REPLACE FUNCTION public.confirm_guest_rsvp(p_invite_token text, p_rsvp_status text, p_plus_ones integer DEFAULT 0, p_rsvp_lunch text DEFAULT null)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.guests
  SET rsvp_status = p_rsvp_status, plus_ones = p_plus_ones, rsvp_lunch = p_rsvp_lunch, updated_at = now()
  WHERE invite_token = p_invite_token;
  RETURN found;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_guest_rsvp(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_guest_rsvp(text, text, integer, text) TO anon, authenticated;

-- 3. Atualizar o RPC de leitura para retornar rsvp_lunch
DROP FUNCTION IF EXISTS public.get_guest_public_by_token(text);
CREATE OR REPLACE FUNCTION public.get_guest_public_by_token(p_invite_token text)
RETURNS TABLE (
  id uuid,
  name text,
  rsvp_status text,
  invite_token text,
  is_vip boolean,
  partner_name text,
  partner_token text,
  rsvp_lunch text
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
    p.invite_token AS partner_token,
    g.rsvp_lunch
  FROM public.guests g
  LEFT JOIN public.guests p ON g.partner_id = p.id
  WHERE g.invite_token = p_invite_token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_public_by_token(text) TO anon, authenticated;
