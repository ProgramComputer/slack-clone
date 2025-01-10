/**
 * AUTH HOOKS
 * Create an auth hook to add a custom claim to the access token jwt.
 */

-- Create or replace the auth hook function
-- https://supabase.com/docs/guides/auth/auth-hooks#hook-custom-access-token
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
  DECLARE
    claims jsonb;
    user_role public.app_role;
  BEGIN
    -- Check if the user is marked as admin in the profiles table
    SELECT role INTO user_role FROM public.user_roles WHERE user_id = (event->>'user_id')::uuid;

    claims := event->'claims';

    IF user_role IS NOT NULL THEN
      -- Set the claim
      claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
    ELSE 
      claims := jsonb_set(claims, '{user_role}', 'null');
    END IF;

    -- Update the 'claims' object in the original event
    event := jsonb_set(event, '{claims}', claims);

    -- Return the modified or original event
    RETURN event;
  END;
$$;

-- Adjust privileges
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon;

-- Grant and revoke as necessary on public.user_roles
GRANT SELECT ON TABLE public.user_roles TO supabase_auth_admin;

REVOKE ALL ON TABLE public.user_roles FROM authenticated, anon;

-- Policy for supabase_auth_admin to read user_roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow auth admin to read user roles' AND tablename = 'user_roles'
  ) THEN
    CREATE POLICY "Allow auth admin to read user roles" ON public.user_roles
    AS PERMISSIVE FOR SELECT
    TO supabase_auth_admin
    USING (true);
  END IF;
END$$;
