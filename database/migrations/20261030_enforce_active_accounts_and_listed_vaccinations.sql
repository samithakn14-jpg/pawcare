BEGIN;

DO $$
BEGIN
  IF to_regclass('public.users') IS NULL
     OR to_regclass('public.pets') IS NULL
     OR to_regclass('public.vaccination_records') IS NULL THEN
    RAISE EXCEPTION
      'Required PetCare Connect tables are missing; apply the base schema first.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.pets'::regclass
      AND attname = 'is_listed'
      AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION
      'Column public.pets.is_listed is missing; apply 20261030_add_pets_is_listed.sql first.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;

DO $$
DECLARE
  policy_spec RECORD;
  policy_sql TEXT;
BEGIN
  FOR policy_spec IN
    SELECT * FROM (VALUES
      ('vaccination_records', 'Public read vaccination_records', 'SELECT',
        'EXISTS (SELECT 1 FROM public.pets p WHERE p.id = pet_id AND p.is_listed = true)', NULL),
      ('users', 'Users read own profile', 'SELECT',
        'auth.uid() = id AND public.is_active_user()', NULL),
      ('users', 'Users update own profile', 'UPDATE',
        'auth.uid() = id AND public.is_active_user()',
        'auth.uid() = id AND role = ''user'' AND status = ''active'''),
      ('saved_pets', 'Users manage saved pets', 'ALL',
        'auth.uid() = user_id AND public.is_active_user()',
        'auth.uid() = user_id AND public.is_active_user()'),
      ('adoption_applications', 'Users read own applications', 'SELECT',
        'auth.uid() = user_id AND public.is_active_user()', NULL),
      ('adoption_applications', 'Users insert applications', 'INSERT', NULL,
        'auth.uid() = user_id AND public.is_active_user()'),
      ('appointments', 'Users manage own appointments', 'ALL',
        'auth.uid() = user_id AND public.is_active_user()',
        'auth.uid() = user_id AND public.is_active_user()'),
      ('notifications', 'Users read own notifications', 'SELECT',
        'auth.uid() = user_id AND public.is_active_user()', NULL),
      ('notifications', 'Users update own notifications', 'UPDATE',
        'auth.uid() = user_id AND public.is_active_user()',
        'auth.uid() = user_id AND public.is_active_user()'),
      ('reviews', 'Users insert reviews', 'INSERT', NULL,
        'auth.uid() = user_id AND public.is_active_user()'),
      ('support_conversations', 'Users read own support conversations', 'SELECT',
        'auth.uid() = user_id AND public.is_active_user()', NULL),
      ('support_conversations', 'Users create own support conversations', 'INSERT',
        NULL, 'auth.uid() = user_id AND public.is_active_user()'),
      ('support_messages', 'Users read messages in own support conversations', 'SELECT',
        'public.is_active_user() AND EXISTS (SELECT 1 FROM public.support_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid())',
        NULL),
      ('support_messages', 'Users send messages in own support conversations', 'INSERT',
        NULL,
        'public.is_active_user() AND sender_id = auth.uid() AND sender_role = ''user'' AND EXISTS (SELECT 1 FROM public.support_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid())')
    ) AS policies(table_name, policy_name, command, using_expression, check_expression)
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = policy_spec.table_name
        AND policyname = policy_spec.policy_name
    ) THEN
      policy_sql := format(
        'ALTER POLICY %I ON public.%I',
        policy_spec.policy_name, policy_spec.table_name
      );
    ELSE
      policy_sql := format(
        'CREATE POLICY %I ON public.%I FOR %s',
        policy_spec.policy_name, policy_spec.table_name, policy_spec.command
      );
    END IF;

    IF policy_spec.using_expression IS NOT NULL THEN
      policy_sql := policy_sql || format(' USING (%s)', policy_spec.using_expression);
    END IF;
    IF policy_spec.check_expression IS NOT NULL THEN
      policy_sql := policy_sql || format(' WITH CHECK (%s)', policy_spec.check_expression);
    END IF;

    EXECUTE policy_sql;
  END LOOP;
END;
$$;

COMMIT;
