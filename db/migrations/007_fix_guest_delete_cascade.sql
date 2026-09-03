-- Garantir a função is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_exists boolean;
BEGIN
  SELECT auth.jwt() ->> 'email' INTO v_email;

  IF v_email IS NULL OR v_email = '' THEN
    RETURN false;
  END IF;

  v_email := lower(trim(v_email));

  SELECT EXISTS (SELECT 1 FROM public.admin_access WHERE lower(trim(email)) = v_email)
    INTO v_exists;

  RETURN v_exists;
END;
$$;

-- 1. guests.partner_id -> ON DELETE SET NULL
ALTER TABLE public.guests
  DROP CONSTRAINT IF EXISTS guests_partner_id_fkey;

ALTER TABLE public.guests
  ADD CONSTRAINT guests_partner_id_fkey
  FOREIGN KEY (partner_id) REFERENCES public.guests(id) ON DELETE SET NULL;

-- 2. guest_views.guest_id -> ON DELETE CASCADE
ALTER TABLE public.guest_views
  DROP CONSTRAINT IF EXISTS guest_views_guest_id_fkey;

ALTER TABLE public.guest_views
  ADD CONSTRAINT guest_views_guest_id_fkey
  FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE CASCADE;

-- 3. rsvp_access_logs.guest_id -> ON DELETE CASCADE
ALTER TABLE public.rsvp_access_logs
  DROP CONSTRAINT IF EXISTS rsvp_access_logs_guest_id_fkey;

ALTER TABLE public.rsvp_access_logs
  ADD CONSTRAINT rsvp_access_logs_guest_id_fkey
  FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE CASCADE;

-- 4. Garantir política de DELETE para rsvp_access_logs
DROP POLICY IF EXISTS "rsvp_logs_delete_admin" ON public.rsvp_access_logs;
CREATE POLICY "rsvp_logs_delete_admin" ON public.rsvp_access_logs
  FOR DELETE TO authenticated USING (public.is_admin());
