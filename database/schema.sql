-- ============================================================
-- PetCare Connect - Supabase PostgreSQL Schema
-- ============================================================
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- This script is designed for a new database or a careful rerun against the
-- matching schema. IF NOT EXISTS alone does not reconcile existing objects.
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- USERS table
-- Mirrors auth.users; auto-populated via trigger on_auth_user_created
CREATE TABLE IF NOT EXISTS public.users (
  id              UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name            TEXT        NOT NULL,
  email           TEXT        UNIQUE,
  phone           TEXT,
  role            TEXT        DEFAULT 'user'
                              CHECK (role IN ('user', 'admin', 'shelter_manager')),
  status          TEXT        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'suspended', 'banned')),
  profile_image   TEXT,
  address         TEXT,
  occupation      TEXT,
  bio             TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Supabase Auth also supports phone-only users, whose auth email is NULL.
ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND conname = 'users_status_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_status_check
      CHECK (status IN ('active', 'suspended', 'banned')) NOT VALID;
  END IF;
END;
$$;

COMMENT ON TABLE public.users IS
  'Extended user profiles. One row per auth.users entry, created automatically via trigger.';

-- ─────────────────────────────────────────────────────────────
-- SHELTERS table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shelters (
  id              UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  name            TEXT        NOT NULL,
  description     TEXT,
  address         TEXT        NOT NULL,
  location        TEXT        NOT NULL,
  phone           TEXT,
  email           TEXT,
  website         TEXT,
  image           TEXT,
  cover_image     TEXT,
  verified        BOOLEAN     DEFAULT FALSE,
  opening_hours   JSONB,
  services        TEXT[],
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.shelters IS
  'Animal rescue shelters and adoption centres registered on PetCare Connect.';
ALTER TABLE public.shelters
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────
-- PETS table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pets (
  id                      UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  shelter_id              UUID        REFERENCES public.shelters(id) ON DELETE SET NULL,
  name                    TEXT        NOT NULL,
  species                 TEXT        NOT NULL
                                      CHECK (species = 'dog'),
  breed                   TEXT,
  age_years               INTEGER     DEFAULT 0,
  age_months              INTEGER     DEFAULT 0,
  gender                  TEXT        CHECK (gender IN ('male', 'female')),
  size                    TEXT        CHECK (size IN ('small', 'medium', 'large', 'extra_large')),
  color                   TEXT,
  description             TEXT,
  personality             TEXT[],
  health_status           TEXT,
  vaccination_status      BOOLEAN     DEFAULT FALSE,
  deworming_status        BOOLEAN     DEFAULT FALSE,
  neutered_status         BOOLEAN     DEFAULT FALSE,
  adoption_status         TEXT        DEFAULT 'available'
                                      CHECK (adoption_status IN ('available', 'pending', 'adopted')),
  adoption_fee            NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (adoption_fee >= 0),
  adoption_requirements   TEXT,
  location                TEXT,
  primary_image           TEXT,
  featured                BOOLEAN     DEFAULT FALSE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS adoption_fee NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS is_listed BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.pets'::regclass
      AND conname = 'pets_adoption_fee_check'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.pets WHERE adoption_fee < 0
    ) THEN
      ALTER TABLE public.pets
        ADD CONSTRAINT pets_adoption_fee_check CHECK (adoption_fee >= 0);
    ELSE
      RAISE NOTICE
        'pets_adoption_fee_check was not added because negative legacy fees exist; review those rows before adding the constraint.';
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.pets'::regclass
      AND conname = 'pets_species_check'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.pets WHERE species IS DISTINCT FROM 'dog'
    ) THEN
      ALTER TABLE public.pets
        ADD CONSTRAINT pets_species_check CHECK (species = 'dog');
    ELSE
      RAISE NOTICE
        'pets_species_check was not added because non-dog or NULL species rows exist; no pet rows were deleted. Review the legacy rows before adding this dog-only constraint.';
    END IF;
  END IF;
END;
$$;

COMMENT ON TABLE public.pets IS
  'Dogs available (or previously available) for adoption via PetCare Connect.';

-- ─────────────────────────────────────────────────────────────
-- PET_IMAGES table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pet_images (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  pet_id      UUID        REFERENCES public.pets(id) ON DELETE CASCADE,
  image_url   TEXT        NOT NULL,
  is_primary  BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.pet_images IS
  'Additional photo gallery images for a pet listing.';

-- ─────────────────────────────────────────────────────────────
-- SAVED_PETS table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saved_pets (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID        REFERENCES public.users(id) ON DELETE CASCADE,
  pet_id      UUID        REFERENCES public.pets(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, pet_id)
);

COMMENT ON TABLE public.saved_pets IS
  'Wishlist / favourited pets per user.';

-- ─────────────────────────────────────────────────────────────
-- ADOPTION_APPLICATIONS table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.adoption_applications (
  id                      UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id                 UUID        REFERENCES public.users(id) ON DELETE CASCADE,
  pet_id                  UUID        REFERENCES public.pets(id) ON DELETE SET NULL,
  full_name               TEXT        NOT NULL,
  email                   TEXT        NOT NULL,
  phone                   TEXT        NOT NULL,
  address                 TEXT        NOT NULL,
  occupation              TEXT,
  home_type               TEXT        CHECK (home_type IN (
                                        'apartment',
                                        'house_with_yard',
                                        'house_without_yard',
                                        'farm',
                                        'other'
                                      )),
  pet_experience          TEXT,
  previous_pets           TEXT,
  reason                  TEXT        NOT NULL,
  living_situation        TEXT,
  family_members          INTEGER,
  has_children            BOOLEAN     DEFAULT FALSE,
  has_other_pets          BOOLEAN     DEFAULT FALSE,
  other_pets_description  TEXT,
  agreement               BOOLEAN     DEFAULT FALSE,
  status                  TEXT        DEFAULT 'pending'
                                      CHECK (status IN (
                                        'pending',
                                        'under_review',
                                        'approved',
                                        'rejected',
                                        'cancelled'
                                      )),
  admin_notes             TEXT,
  application_date        TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.adoption_applications
  ADD COLUMN IF NOT EXISTS living_situation TEXT;
ALTER TABLE public.adoption_applications
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
-- This narrow replacement enables the already-supported cancelled status.
-- The broader constraint is installed first and validated in this same block.
DECLARE
  existing_definition TEXT;
  expanded_definition TEXT;
  expanded_constraint_exists BOOLEAN;
  existing_check_is_expected BOOLEAN;
BEGIN
  SELECT pg_get_constraintdef(oid)
    INTO existing_definition
    FROM pg_constraint
   WHERE conrelid = 'public.adoption_applications'::regclass
     AND conname = 'adoption_applications_status_check'
     AND contype = 'c';

  SELECT pg_get_constraintdef(oid)
    INTO expanded_definition
    FROM pg_constraint
   WHERE conrelid = 'public.adoption_applications'::regclass
     AND conname = 'adoption_applications_status_check_expanded'
     AND contype = 'c';
  expanded_constraint_exists := expanded_definition IS NOT NULL;

  IF expanded_constraint_exists AND (
    position('pending' IN lower(expanded_definition)) = 0 OR
    position('under_review' IN lower(expanded_definition)) = 0 OR
    position('approved' IN lower(expanded_definition)) = 0 OR
    position('rejected' IN lower(expanded_definition)) = 0 OR
    position('cancelled' IN lower(expanded_definition)) = 0
  ) THEN
    RAISE EXCEPTION
      'Existing adoption_applications_status_check_expanded does not match the expected statuses; inspect and migrate it manually.';
  END IF;

  existing_check_is_expected :=
    existing_definition IS NOT NULL
    AND position('pending' IN lower(existing_definition)) > 0
    AND position('under_review' IN lower(existing_definition)) > 0
    AND position('approved' IN lower(existing_definition)) > 0
    AND position('rejected' IN lower(existing_definition)) > 0;

  IF existing_definition IS NULL THEN
    IF NOT expanded_constraint_exists THEN
      ALTER TABLE public.adoption_applications
        ADD CONSTRAINT adoption_applications_status_check_expanded
        CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'cancelled'))
        NOT VALID;
    END IF;
    ALTER TABLE public.adoption_applications
      VALIDATE CONSTRAINT adoption_applications_status_check_expanded;
  ELSIF position('pending' IN lower(existing_definition)) > 0
    AND position('under_review' IN lower(existing_definition)) > 0
    AND position('approved' IN lower(existing_definition)) > 0
    AND position('rejected' IN lower(existing_definition)) > 0
    AND position('cancelled' IN lower(existing_definition)) > 0 THEN
    NULL;
  ELSIF existing_check_is_expected
    AND position('cancelled' IN lower(existing_definition)) = 0 THEN
    IF NOT expanded_constraint_exists THEN
      ALTER TABLE public.adoption_applications
        ADD CONSTRAINT adoption_applications_status_check_expanded
        CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'cancelled'))
        NOT VALID;
    END IF;
    ALTER TABLE public.adoption_applications
      DROP CONSTRAINT adoption_applications_status_check;
    ALTER TABLE public.adoption_applications
      VALIDATE CONSTRAINT adoption_applications_status_check_expanded;
  ELSE
    RAISE EXCEPTION
      'Existing adoption_applications_status_check has unexpected rules; inspect and migrate it manually.';
  END IF;
END;
$$;

COMMENT ON TABLE public.adoption_applications IS
  'Adoption applications submitted by registered users for specific pets.';

-- ─────────────────────────────────────────────────────────────
-- VACCINATION_RECORDS table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vaccination_records (
  id               UUID  DEFAULT uuid_generate_v4() PRIMARY KEY,
  pet_id           UUID  REFERENCES public.pets(id) ON DELETE CASCADE,
  vaccine_name     TEXT  NOT NULL,
  vaccination_date DATE  NOT NULL,
  next_due_date    DATE,
  administered_by  TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.vaccination_records IS
  'Official vaccination history for individual pets.';

-- ─────────────────────────────────────────────────────────────
-- APPOINTMENTS table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
  id                UUID  DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id           UUID  REFERENCES public.users(id) ON DELETE CASCADE,
  pet_id            UUID  REFERENCES public.pets(id) ON DELETE SET NULL,
  shelter_id        UUID  REFERENCES public.shelters(id) ON DELETE SET NULL,
  appointment_type  TEXT  CHECK (appointment_type IN (
                            'meet_greet', 'vet_visit', 'grooming', 'training', 'general'
                          )),
  pet_name          TEXT  NOT NULL,
  pet_type          TEXT  NOT NULL,
  owner_name        TEXT  NOT NULL,
  veterinarian      TEXT,
  clinic_name       TEXT,
  appointment_date  DATE  NOT NULL,
  appointment_time  TIME  NOT NULL,
  reason            TEXT  NOT NULL,
  status            TEXT  DEFAULT 'pending'
                          CHECK (status IN (
                            'pending',
                            'confirmed',
                            'cancelled',
                            'completed',
                            'no_show'
                          )),
  notes             TEXT,
  admin_notes       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shelter_id UUID REFERENCES public.shelters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS appointment_type TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.appointments'::regclass
      AND conname = 'appointments_status_check'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_status_check
      CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show'))
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.appointments'::regclass
      AND conname = 'appointments_appointment_type_check'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_appointment_type_check
      CHECK (appointment_type IS NULL OR appointment_type IN (
        'meet_greet', 'vet_visit', 'grooming', 'training', 'general'
      )) NOT VALID;
  END IF;
END;
$$;

COMMENT ON TABLE public.appointments IS
  'Vet appointment bookings made by users through PetCare Connect.';

-- ─────────────────────────────────────────────────────────────
-- REVIEWS table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id          UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID    REFERENCES public.users(id) ON DELETE CASCADE,
  shelter_id  UUID    REFERENCES public.shelters(id) ON DELETE CASCADE,
  rating      INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.reviews IS
  'Star ratings and comments left by users for shelters.';

-- ─────────────────────────────────────────────────────────────
-- FOOD_INFORMATION table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.food_information (
  id            UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  food_name     TEXT    NOT NULL,
  pet_type      TEXT    NOT NULL,
  category      TEXT    NOT NULL,
  benefits      TEXT,
  feeding_info  TEXT,
  safety_info   TEXT,
  is_dangerous  BOOLEAN DEFAULT FALSE,
  image         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.food_information IS
  'Curated dog food guide entries — safe foods, dangerous foods, and feeding tips.';

-- ─────────────────────────────────────────────────────────────
-- MEDICINE_INFORMATION table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.medicine_information (
  id              UUID  DEFAULT uuid_generate_v4() PRIMARY KEY,
  medicine_name   TEXT  NOT NULL,
  pet_type        TEXT  NOT NULL,
  purpose         TEXT,
  precautions     TEXT,
  general_info    TEXT,
  image           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.medicine_information IS
  'General medicine information for pet owners. Always consult a vet before administering.';

-- ─────────────────────────────────────────────────────────────
-- BOARDING_SERVICES table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.boarding_services (
  id                  UUID      DEFAULT uuid_generate_v4() PRIMARY KEY,
  name                TEXT      NOT NULL,
  description         TEXT,
  location            TEXT      NOT NULL,
  address             TEXT,
  phone               TEXT,
  email               TEXT,
  price_range         TEXT,
  facilities          TEXT[],
  pet_types_accepted  TEXT[],
  rating              DECIMAL(2,1),
  image               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.boarding_services IS
  'Dog boarding / day-care services listed on PetCare Connect.';

-- ─────────────────────────────────────────────────────────────
-- VIDEOS table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.videos (
  id            UUID  DEFAULT uuid_generate_v4() PRIMARY KEY,
  title         TEXT  NOT NULL,
  description   TEXT,
  category      TEXT  NOT NULL,
  youtube_url   TEXT  NOT NULL,
  youtube_id    TEXT  NOT NULL,
  thumbnail_url TEXT,
  duration      TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.videos IS
  'Curated YouTube pet-care videos organised by category.';

-- ─────────────────────────────────────────────────────────────
-- NOTIFICATIONS table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id            UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID    REFERENCES public.users(id) ON DELETE CASCADE,
  title         TEXT    NOT NULL,
  message       TEXT    NOT NULL,
  type          TEXT    DEFAULT 'info'
                        CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read       BOOLEAN DEFAULT FALSE,
  related_type  TEXT,
  related_id    UUID,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.notifications IS
  'In-app notifications dispatched to individual users.';

-- ─────────────────────────────────────────────────────────────
-- SUPPORT CONVERSATIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.support_conversations (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name   TEXT        NOT NULL,
  user_email  TEXT        NOT NULL,
  subject     TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open', 'resolved')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.support_conversations IS
  'Private support conversations between signed-in users and PetCare Connect admins.';
ALTER TABLE public.support_conversations
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.support_messages (
  id               UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id  UUID        NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role      TEXT        NOT NULL CHECK (sender_role IN ('user', 'admin')),
  content          TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.support_messages IS
  'User questions and admin replies in private support conversations.';

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_pets_species          ON public.pets(species);
CREATE INDEX IF NOT EXISTS idx_pets_adoption_status  ON public.pets(adoption_status);
CREATE INDEX IF NOT EXISTS idx_pets_shelter_id       ON public.pets(shelter_id);
CREATE INDEX IF NOT EXISTS idx_pet_images_pet_id     ON public.pet_images(pet_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_id  ON public.adoption_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_pet_id   ON public.adoption_applications(pet_id);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id  ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_pet_id   ON public.appointments(pet_id);
CREATE INDEX IF NOT EXISTS idx_appointments_shelter_id ON public.appointments(shelter_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_pets_user_id    ON public.saved_pets(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_shelter_id    ON public.reviews(shelter_id);
CREATE INDEX IF NOT EXISTS idx_vacc_records_pet_id   ON public.vaccination_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_user_id ON public.support_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_status_updated ON public.support_conversations(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_conversation_created ON public.support_messages(conversation_id, created_at);

-- A user may have at most one active application per pet, including concurrent submissions.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.adoption_applications
    WHERE user_id IS NOT NULL
      AND pet_id IS NOT NULL
      AND status IN ('pending', 'under_review')
    GROUP BY user_id, pet_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Duplicate active adoption applications exist. Resolve them before creating idx_applications_unique_active_user_pet.';
  END IF;

  CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_unique_active_user_pet
    ON public.adoption_applications(user_id, pet_id)
    WHERE user_id IS NOT NULL
      AND pet_id IS NOT NULL
      AND status IN ('pending', 'under_review');
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelters              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_images            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_pets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adoption_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccination_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_information      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_information  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boarding_services     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages      ENABLE ROW LEVEL SECURITY;

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

-- Policies are created if absent and altered in place if already present.
-- This avoids duplicate-policy errors while keeping reruns aligned to these
-- user-scoped predicates. Public SELECT is intentional for catalog content.
DO $$
DECLARE
  policy_spec RECORD;
  policy_sql TEXT;
BEGIN
  FOR policy_spec IN
    SELECT * FROM (VALUES
      ('shelters', 'Public read shelters', 'SELECT', 'true', NULL),
      ('pets', 'Public read pets', 'SELECT', 'is_listed = true', NULL),
      ('pet_images', 'Public read pet_images', 'SELECT', 'true', NULL),
      ('vaccination_records', 'Public read vaccination_records', 'SELECT',
        'EXISTS (SELECT 1 FROM public.pets p WHERE p.id = pet_id AND p.is_listed = true)', NULL),
      ('reviews', 'Public read reviews', 'SELECT', 'true', NULL),
      ('food_information', 'Public read food_information', 'SELECT', 'true', NULL),
      ('medicine_information', 'Public read medicine_information', 'SELECT', 'true', NULL),
      ('boarding_services', 'Public read boarding_services', 'SELECT', 'true', NULL),
      ('videos', 'Public read videos', 'SELECT', 'true', NULL),
      ('users', 'Users read own profile', 'SELECT',
        'auth.uid() = id AND public.is_active_user()', NULL),
      ('users', 'Users update own profile', 'UPDATE',
        'auth.uid() = id AND public.is_active_user()',
        'auth.uid() = id AND role = ''user'' AND status = ''active'''),
      ('users', 'Users insert own profile', 'INSERT', NULL,
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

-- ============================================================
-- NOTE: Admin / shelter-manager full access is handled via
--       Supabase service-role key on the server side only.
--       Never place a service-role/secret key in frontend code.
--       The service role bypasses RLS automatically.
-- ============================================================

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create a public.users row whenever a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(btrim(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(btrim(NEW.raw_user_meta_data->>'name'), ''),
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'User ' || left(NEW.id::text, 8)
    ),
    NULLIF(NEW.email, ''),
    NULLIF(btrim(NEW.raw_user_meta_data->>'phone'), '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  existing_function_oid OID;
  existing_trigger_type SMALLINT;
  existing_trigger_enabled "char";
BEGIN
  SELECT tgfoid, tgtype, tgenabled
    INTO existing_function_oid, existing_trigger_type, existing_trigger_enabled
  FROM pg_trigger
  WHERE tgrelid = 'auth.users'::regclass
    AND tgname = 'on_auth_user_created'
    AND NOT tgisinternal;

  IF existing_function_oid IS NULL THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  ELSIF existing_function_oid <> 'public.handle_new_user()'::regprocedure THEN
    RAISE EXCEPTION
      'Trigger auth.users.on_auth_user_created exists but calls a different function; inspect and migrate it manually.';
  ELSIF existing_trigger_type <> 5 THEN
    RAISE EXCEPTION
      'Trigger auth.users.on_auth_user_created has an unexpected event; inspect and migrate it manually.';
  ELSIF existing_trigger_enabled IN ('D', 'R') THEN
    ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
  END IF;
END;
$$;

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply updated_at trigger only where it is missing; never drop existing triggers.
DO $$
DECLARE
  tbl TEXT;
  existing_function_oid OID;
  existing_trigger_type SMALLINT;
  existing_trigger_enabled "char";
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'users',
    'shelters',
    'pets',
    'adoption_applications',
    'appointments',
    'support_conversations'
  ]
  LOOP
    EXECUTE format(
      'SELECT tgfoid, tgtype, tgenabled FROM pg_trigger
       WHERE tgrelid = %L::regclass
         AND tgname = %L
         AND NOT tgisinternal',
      format('public.%I', tbl), 'trg_set_updated_at'
    ) INTO existing_function_oid, existing_trigger_type, existing_trigger_enabled;

    IF existing_function_oid IS NULL THEN
      EXECUTE format(
        'CREATE TRIGGER trg_set_updated_at
           BEFORE UPDATE ON public.%I
           FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
        tbl
      );
    ELSIF existing_function_oid <> 'public.set_updated_at()'::regprocedure THEN
      RAISE EXCEPTION
        'Trigger public.%.trg_set_updated_at exists but calls a different function; inspect and migrate it manually.',
        tbl;
    ELSIF existing_trigger_type <> 19 THEN
      RAISE EXCEPTION
        'Trigger public.%.trg_set_updated_at has an unexpected event; inspect and migrate it manually.',
        tbl;
    ELSIF existing_trigger_enabled IN ('D', 'R') THEN
      EXECUTE format(
        'ALTER TABLE public.%I ENABLE TRIGGER trg_set_updated_at',
        tbl
      );
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- END OF SCHEMA
-- ============================================================
