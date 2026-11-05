BEGIN;

DO $$
BEGIN
  IF to_regclass('public.pets') IS NULL THEN
    RAISE EXCEPTION 'Table public.pets does not exist; apply the base schema first.';
  END IF;
END;
$$;

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS is_listed BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pets'
      AND policyname = 'Public read pets'
  ) THEN
    ALTER POLICY "Public read pets"
      ON public.pets
      USING (is_listed = TRUE);
  ELSE
    CREATE POLICY "Public read pets"
      ON public.pets
      FOR SELECT
      USING (is_listed = TRUE);
  END IF;
END;
$$;

COMMIT;
