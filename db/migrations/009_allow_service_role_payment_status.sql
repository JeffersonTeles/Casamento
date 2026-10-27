-- ============================================================
-- MIGRAÇÃO 009 — Trigger de pagamento: liberar service_role
-- ============================================================
-- O trigger enforce_pending_payment forçava 'pending' para qualquer
-- INSERT de quem não é admin, inclusive o backend (service_role),
-- impedindo o webhook de registrar pagamentos aprovados.
-- Visitantes (anon/authenticated não-admin) continuam forçados a 'pending'.

CREATE OR REPLACE FUNCTION public.enforce_pending_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT public.is_admin() THEN
    NEW.payment_status := 'pending';
    NEW.mp_payment_id := COALESCE(NEW.mp_payment_id, 'pending-' || gen_random_uuid()::text);
  END IF;
  RETURN NEW;
END;
$function$;

