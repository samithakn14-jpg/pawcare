BEGIN;

DO $$
DECLARE
  bucket_is_public BOOLEAN;
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION 'public.users must exist before applying the pet-care video migration.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name IN ('role', 'status')
    GROUP BY table_name
    HAVING COUNT(*) = 2
  ) THEN
    RAISE EXCEPTION 'public.users must contain role and status columns before applying the pet-care video migration.';
  END IF;

  SELECT public INTO bucket_is_public
  FROM storage.buckets
  WHERE id = 'pet-care-videos';

  IF FOUND AND bucket_is_public THEN
    RAISE EXCEPTION 'The pet-care-videos bucket already exists as public. Review it manually; this migration requires a private bucket.';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.pet_care_videos (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT        NOT NULL,
  description   TEXT,
  category      TEXT        NOT NULL
                            CHECK (category IN (
                              'Dog Care',
                              'Cat Care',
                              'Pet Nutrition',
                              'Pet Training',
                              'Pet Health',
                              'Vaccination Awareness'
                            )),
  video_url     TEXT        NOT NULL,
  thumbnail_url TEXT,
  is_public     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pet_care_videos
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
DECLARE
  missing_columns TEXT;
BEGIN
  SELECT string_agg(required.column_name, ', ')
    INTO missing_columns
  FROM (
    VALUES ('id'), ('title'), ('description'), ('category'),
      ('video_url'), ('thumbnail_url'), ('created_at'), ('is_public')
  ) AS required(column_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pet_care_videos'
      AND column_name = required.column_name
  );

  IF missing_columns IS NOT NULL THEN
    RAISE EXCEPTION
      'public.pet_care_videos is missing required columns (%); review the existing table before applying this migration.',
      missing_columns;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS pet_care_videos_public_category_created_idx
  ON public.pet_care_videos (category, created_at DESC)
  WHERE is_public = TRUE;

ALTER TABLE public.pet_care_videos ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.pet_care_videos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pet_care_videos TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pet_care_videos'
      AND policyname = 'Public can read public pet-care videos'
  ) THEN
    CREATE POLICY "Public can read public pet-care videos"
      ON public.pet_care_videos
      FOR SELECT
      TO anon, authenticated
      USING (is_public = TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pet_care_videos'
      AND policyname = 'Active admins can manage pet-care videos'
  ) THEN
    CREATE POLICY "Active admins can manage pet-care videos"
      ON public.pet_care_videos
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.users AS profile
          WHERE profile.id = (SELECT auth.uid())
            AND profile.role = 'admin'
            AND profile.status = 'active'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.users AS profile
          WHERE profile.id = (SELECT auth.uid())
            AND profile.role = 'admin'
            AND profile.status = 'active'
        )
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'pet-care-videos') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'pet-care-videos',
      'pet-care-videos',
      FALSE,
      104857600,
      ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp']
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public can read published pet-care video files'
  ) THEN
    CREATE POLICY "Public can read published pet-care video files"
      ON storage.objects
      FOR SELECT
      TO anon, authenticated
      USING (
        bucket_id = 'pet-care-videos'
        AND EXISTS (
          SELECT 1
          FROM public.pet_care_videos AS video
          WHERE video.is_public = TRUE
            AND (video.video_url = name OR video.thumbnail_url = name)
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Active admins can upload pet-care video files'
  ) THEN
    CREATE POLICY "Active admins can upload pet-care video files"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'pet-care-videos'
        AND EXISTS (
          SELECT 1
          FROM public.users AS profile
          WHERE profile.id = (SELECT auth.uid())
            AND profile.role = 'admin'
            AND profile.status = 'active'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Active admins can update pet-care video files'
  ) THEN
    CREATE POLICY "Active admins can update pet-care video files"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'pet-care-videos'
        AND EXISTS (
          SELECT 1
          FROM public.users AS profile
          WHERE profile.id = (SELECT auth.uid())
            AND profile.role = 'admin'
            AND profile.status = 'active'
        )
      )
      WITH CHECK (
        bucket_id = 'pet-care-videos'
        AND EXISTS (
          SELECT 1
          FROM public.users AS profile
          WHERE profile.id = (SELECT auth.uid())
            AND profile.role = 'admin'
            AND profile.status = 'active'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Active admins can delete pet-care video files'
  ) THEN
    CREATE POLICY "Active admins can delete pet-care video files"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'pet-care-videos'
        AND EXISTS (
          SELECT 1
          FROM public.users AS profile
          WHERE profile.id = (SELECT auth.uid())
            AND profile.role = 'admin'
            AND profile.status = 'active'
        )
      );
  END IF;
END;
$$;

COMMIT;
