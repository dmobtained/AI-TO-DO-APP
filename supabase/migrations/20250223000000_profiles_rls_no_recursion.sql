-- Fix: infinite recursion in policy for relation 'profiles'
-- Oorzaak: een policy op profiles die is_admin_user() aanroept; die functie leest zelf uit profiles → recursie.
-- Oplossing: alle policies op profiles droppen en alleen de veilige (geen is_admin_user) opnieuw aanmaken.

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Verwijder eventuele extra policies (bijv. handmatig toegevoegd: "admins kunnen alle profielen lezen")
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

-- Alleen deze twee: geen functie die profiles leest
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

COMMENT ON TABLE public.profiles IS 'User profile; RLS: alleen eigen rij lezen/updaten (geen is_admin_user op deze tabel).';
