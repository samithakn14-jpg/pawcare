# PetCare Connect

PetCare Connect is a static HTML/CSS/JavaScript frontend backed by an Express API and Supabase (Auth and PostgreSQL).

**Tagline:** Adopt with Love. Care with Knowledge.

## Project objectives

- Connect people with dogs and verified shelter partners.
- Support adoption applications, pet-care education, veterinary appointments, and account notifications.
- Keep account-owned data protected with Supabase Auth, backend authorization, and PostgreSQL Row Level Security (RLS).
- Keep privileged Supabase credentials on the backend only.

## Existing modules

The project contains pages and API routes for pet adoption, pet details, shelter discovery, food and medicine information, health and vaccination records, veterinary appointments, boarding, educational videos, account access, notifications, support, and admin management. Availability of live data and privileged actions depends on the configured Supabase project and applied migrations; see the [final testing report](./docs/FINAL_TESTING_REPORT.md) for what was actually verified in this workspace.

## Technology stack

- Frontend: HTML, CSS, JavaScript, Bootstrap 5
- Backend: Node.js and Express
- Database, authentication, and content storage: Supabase PostgreSQL, Supabase Auth, and Supabase Storage
- The Pet Care Videos page combines the existing curated YouTube catalog with administrator-uploaded video files in a private Supabase Storage bucket.

## Prerequisites

- Node.js 18 or later and npm
- A Supabase project

## Supabase database setup

1. Create a Supabase project and open **SQL Editor** in its dashboard.
2. Run [`database/schema.sql`](./database/schema.sql) first.
3. Run [`database/seed.sql`](./database/seed.sql) second to add five sample shelters, ten available dogs, 19 validated curated YouTube videos, and informational content.

The schema is designed for a new project and careful reruns against the matching schema. It does not delete pet rows, but it may add or adjust schema objects; review it before applying to an existing database. The seed uses fixed IDs and `ON CONFLICT DO NOTHING`; it does not overwrite existing records. Treat it as sample data, not a production data-repair script.

The schema enables Row Level Security (RLS). Public catalog reads and user-owned records are governed by the policies in the schema. A configured backend service-role key is used only for privileged server-side operations; it must never be included in frontend files.

### Set up administrator-uploaded Pet Care Videos

After confirming the existing `public.users` table has `role` and `status` columns, run [`database/migrations/20261030_add_pet_care_video_storage.sql`](./database/migrations/20261030_add_pet_care_video_storage.sql) in the intended Supabase project's SQL Editor. It creates `public.pet_care_videos`, the private `pet-care-videos` bucket, and additive RLS policies; it does not delete or rewrite existing video rows. The migration stops if a bucket with that name already exists as public so its visibility can be reviewed rather than silently weakened.

The `video_url` and `thumbnail_url` columns store object paths inside the private bucket. The backend creates short-lived signed URLs only for public catalog rows; private rows are returned only to an active admin. The API validates video signatures and accepts MP4, WebM, and MOV files up to 100 MB, plus optional JPEG, PNG, or WebP thumbnails up to 5 MB. Admin upload, edit, and delete operations require a valid active admin session and the backend-only `SUPABASE_SERVICE_ROLE_KEY`. Never add that key to the frontend.

After applying the migration, restart the existing backend process safely so it loads `backend/routes/pet-care-videos.js`, then open `http://localhost:3000/videos.html`. Public visitors can browse published uploads. Signed-in admins see the upload and management controls. Do not mark upload, playback, edit, or deletion as tested until each operation has been run with a dedicated test admin account and disposable test video.

For an existing database, do not blindly rerun the base schema or seed scripts. Inspect the live schema first and apply only the required migration. The `database/update_20_dogs.sql` script is sample-data maintenance for the fixed sample pet IDs; it is not a production migration.

### Apply the account and vaccination security migration

For an existing database, first apply the base schema if it has not already been applied. If `public.pets.is_listed` is missing, apply [`database/migrations/20261030_add_pets_is_listed.sql`](./database/migrations/20261030_add_pets_is_listed.sql) first. Then open Supabase Dashboard → **SQL Editor**, run [`database/migrations/20261030_enforce_active_accounts_and_listed_vaccinations.sql`](./database/migrations/20261030_enforce_active_accounts_and_listed_vaccinations.sql) as one script, and confirm the query completes. The migration is transactional and rerunnable. It does not update or delete user, pet, vaccination, or other application records. It changes RLS policies so suspended/banned users cannot access user-owned records or update their status back to active, and public vaccination records are visible only for listed pets. Review any custom policies on those tables as well; additional permissive policies can independently grant access.

In Supabase Dashboard → **Authentication → Providers → Email**, keep email confirmation enabled in production. Set the project **Site URL** and allowed redirect URLs to the actual frontend URL. The backend registration route uses Supabase's normal signup flow and returns a session only when the project allows immediate sign-in. If the production project has confirmation disabled, registration rejects and cleans up the newly created account instead of silently bypassing verification. Local development may leave confirmation disabled for convenient testing.

To verify the policies without changing real accounts, use dedicated test users. A regular active account should be able to read and update only its own profile and records. An admin can temporarily set a test account's `public.users.status` to `suspended` in SQL Editor; that account should receive HTTP 403 from protected backend endpoints and should no longer read or write its private records through Supabase. Restore the test profile to `active` afterward. Public pet vaccination records should be returned only when the associated pet has `is_listed = true`.

## Environment and frontend configuration

Copy the backend example file and fill in the values from **Supabase Dashboard → Project Settings → API**:

```powershell
Copy-Item backend\.env.example backend\.env
```

Required backend variables for the public API:

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public or publishable key |

Backend variable required for registration cleanup, adoption API writes, admin operations, and Pet Care video uploads/management:

| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key for server-side operations only. Keep it in `backend/.env`; never expose it in frontend files. |

The admin API requires this key because it performs privileged writes that bypass RLS; it still verifies the caller's active admin account. In `backend/.env`, set `SUPABASE_SERVICE_ROLE_KEY` to the service-role/secret key from the same Supabase project (Dashboard → **Project Settings → API Keys**). Do not send the key in chat, add it to frontend files, or commit `backend/.env`. Restart the backend after changing it.

Other backend variables:

| Variable | Purpose |
| --- | --- |
| `PORT` | API port; defaults to `3000` |
| `FRONTEND_URL` | Browser origin allowed by CORS; use `http://localhost:3000` locally |
| `OPENAI_API_KEY` | Optional; enables the OpenAI-backed chatbot |
| `OPENAI_MODEL` | Optional; defaults to `gpt-4o-mini` |
| `OPENAI_API_URL` | Optional compatible chat-completions endpoint |

The static frontend does not read `.env` files. Its Supabase JavaScript client uses the project URL and public publishable/anon key in [`frontend/js/config.js`](./frontend/js/config.js); update those public values if you change Supabase projects. The backend reads `SUPABASE_URL` and `SUPABASE_ANON_KEY` (or `SUPABASE_PUBLISHABLE_KEY`) from `backend/.env`. Keep these values on the same Supabase project. Express serves both the frontend and API on port 3000, so the browser uses the same-origin `/api` path.

The anon/public or publishable key is designed for browser use with RLS enabled. **Never put the service-role key or an OpenAI secret in frontend files or commit them.** The root `.gitignore` excludes root `.env*` files and `backend/.env`. For production, set `NODE_ENV=production` and set `FRONTEND_URL` to the exact HTTPS origin serving the frontend; the API refuses to start without it and does not allow development localhost origins in production. Keep production secrets in the hosting provider's secret/environment settings, not in a deployed frontend bundle.

## Run locally

In PowerShell at the project root, install backend dependencies and start Express:

```powershell
Set-Location backend
npm.cmd ci
npm.cmd run dev
```

Open the existing frontend from the Express server (do not open the HTML file directly):

<http://localhost:3000/adopt.html>

The same server serves `frontend/` and `/api`. Check the page and configured Supabase project from another PowerShell terminal:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
Invoke-RestMethod http://localhost:3000/api/test-supabase
```

The Supabase check is read-only and reports `isListedColumnVerified: true` only if the configured project's `public.pets.is_listed` column can be queried. The backend defaults to port 3000. Set `PORT` in `backend/.env` to override it.

If that check reports that `pets.is_listed` does not exist, verify the database catalog in the same project's Supabase SQL Editor before rerunning any migration:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pets'
  AND column_name = 'is_listed';
```

If the query returns no rows, apply [`database/migrations/20261030_add_pets_is_listed.sql`](./database/migrations/20261030_add_pets_is_listed.sql). It adds the column if missing and does not change pet records. If the SQL query returns the column but the API check still fails, reload the PostgREST schema cache with `NOTIFY pgrst, 'reload schema';` in SQL Editor and retry the read-only API check.

## Test registration, login, and logout

1. In Supabase, enable the **Email** provider under **Authentication → Providers**. For confirmation testing, set the project Site URL to `http://localhost:3000` and add that origin to the redirect URL allow-list. Keep email confirmation enabled in production.
2. Apply [`database/migrations/20261030_enforce_active_accounts_and_listed_vaccinations.sql`](./database/migrations/20261030_enforce_active_accounts_and_listed_vaccinations.sql) to an existing project as described above.
3. Open `http://localhost:3000/register.html`, create a test account with a valid email, a phone number containing 10–15 digits, and a password of at least 6 characters. Confirm the email if prompted. Registration now goes through the backend; the Auth trigger in `database/schema.sql` creates the matching `public.users` profile.
4. Log in at `http://localhost:3000/login.html`. A successful login opens the protected dashboard; invalid credentials and unconfirmed email are shown on the form. Reload the page to verify the Supabase session persists.
5. Use **Log out** in the navigation. The app clears its local session and user-specific cached data. Opening `dashboard.html` after logout should redirect to login; signing in again should restore only that account's data.
6. To verify ownership, create two test accounts and insert a schema-valid test application for only one (the SQL example under **Adoption application test data** can do this). Log into each account and check the dashboard. The application and profile should appear only for their owner. The schema enables RLS and scopes `public.users` reads/updates and `public.adoption_applications` reads/inserts to `auth.uid()` and the active-account check; the backend application endpoints also bind queries to the authenticated user. Never use a service-role key for browser-side testing.

## Adoption application uniqueness migration

The schema includes a partial unique index so each user can have only one `pending` or `under_review` application for a pet. Before applying the index to an existing database, inspect for conflicts:

```sql
SELECT user_id, pet_id, array_agg(status ORDER BY status) AS statuses, COUNT(*) AS application_count
FROM public.adoption_applications
WHERE user_id IS NOT NULL
  AND pet_id IS NOT NULL
  AND status IN ('pending', 'under_review')
GROUP BY user_id, pet_id
HAVING COUNT(*) > 1;
```

If rows are returned, review and resolve those records according to your business rules before continuing; do not delete data blindly. If none are returned, apply:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_unique_active_user_pet
ON public.adoption_applications (user_id, pet_id)
WHERE user_id IS NOT NULL
  AND pet_id IS NOT NULL
  AND status IN ('pending', 'under_review');
```

No table recreation is required. The API also checks for an existing active application and returns HTTP 409 for concurrent duplicate submissions.

## Test pet adoption applications

1. Configure `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env` and apply the active-application unique index after the preflight query above returns no rows.
2. Start the backend and frontend using **Run locally**, then log in with a test account.
3. Open Adopt, choose a pet, and click **Adopt Now**. The selected pet should be preselected on the existing application form.
4. Try continuing with missing details or a reason shorter than 50 characters. The form should prevent submission. Complete the required applicant details, experience questions, and agreements, then submit. The success dialog displays the saved application ID.
5. Open **My Applications** from the dashboard. The new pet, submission date, and `Pending` status should appear. The dashboard reads this list through the authenticated `GET /api/adoptions` endpoint.
6. Submit another application for the same pet from the same account. The API should reject it with a duplicate-application message; only one active application can exist for that user and pet.
7. Sign in as a different test account and open its dashboard. It must not show the first account's application. To verify status rendering, use an admin account to update the application to `approved` or `rejected` and reload the owner's dashboard.

## Create an administrator

Do not create admin rows with made-up IDs or expose admin privileges through public signup.

1. Create a normal user in the Supabase Dashboard under **Authentication → Users** (set the user's email and password). Creating the Auth user fires the schema trigger, which creates the corresponding `public.users` profile.
2. In the SQL Editor, grant the role to that exact account by email:

   ```sql
   UPDATE public.users AS profile
   SET role = 'admin'
   FROM auth.users AS account
   WHERE account.id = profile.id
     AND lower(account.email) = lower('admin@example.com')
   RETURNING profile.id, profile.email, profile.role;
   ```

   Replace the example email. Confirm that exactly the intended account is returned with role `admin`, then sign in through the application. To revoke access, update that profile's role to `user`.

The backend reads the role from `public.users`. The service-role key bypasses RLS, so keep it private and only grant admin to trusted accounts.

## Admin dashboard and pet listings

The admin pages are `http://localhost:3000/admin/index.html` (dashboard and application review), `http://localhost:3000/admin/pets.html` (pet management), and `http://localhost:3000/admin/support.html` (existing support inbox). Each page checks the signed-in profile for the `admin` role. Every admin data API also verifies the Supabase access token and role on the Node.js backend; requests are rejected if the user is not an administrator. The dashboard reads data only from the existing `/api/admin` endpoints.

For an existing database created before pet-listing archival was added, inspect the `public.pets` columns first in Supabase SQL Editor:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pets'
ORDER BY ordinal_position;

SELECT COUNT(*) AS pet_count_before FROM public.pets;
```

Check that there is no existing column representing listing visibility or archival under another name before proceeding. The project schema and admin API use `is_listed`; this is a `BOOLEAN NOT NULL DEFAULT TRUE`. The default makes existing pets listed when the column is added, without deleting or recreating pet records. If your live schema has a differently named visibility/archive column, stop and review its meaning before applying this migration; do not blindly add a second flag. If `is_listed` already exists with a different type, nullability, or default, stop and review it rather than assuming `IF NOT EXISTS` will reconcile it.

Run [`database/migrations/20261030_add_pets_is_listed.sql`](./database/migrations/20261030_add_pets_is_listed.sql) in SQL Editor. It uses `ADD COLUMN IF NOT EXISTS`, changes only the `public.pets` table and its `Public read pets` policy, and does not drop any table, policy, or pet record. It creates that policy only if it is missing; otherwise it updates its predicate to show listed pets only. The migration is safe to rerun. The base [`database/schema.sql`](./database/schema.sql) already includes the same column definition and policy for new databases.

After it succeeds, verify the type/default and existing row count:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pets'
  AND column_name = 'is_listed';

SELECT COUNT(*) AS pet_count FROM public.pets;
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'pets'
  AND policyname = 'Public read pets';
```

In Supabase SQL Editor, select your project and open a new query. Run the preflight queries and note the pet count; review the columns for an existing visibility/archive flag. If no equivalent column exists, paste and run the migration file as one script. Confirm it completes successfully, then run the verification queries above and compare the pet count with the pre-migration count. Keep the migration transaction intact; it either commits all of its changes or none. It does not update, delete, or recreate pet rows.

Admin pet create/edit/archive operations use the existing `pets` table. **Archive** sets `is_listed = false` instead of deleting a pet, preserving adoption application records and their pet references. Only listed pets remain visible through the public catalog policy; admin listings use the authenticated backend.

Set `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env` and restart the Node.js API before using admin data features. Keep the key exclusively on the server. Admin API routes explicitly return HTTP 503 when it is missing; they never fall back to exposing privileged access in the browser. The browser continues to use only the Supabase anon/publishable key with RLS enabled. The existing user-owned profile and adoption-application RLS policies remain in force; privileged admin access is mediated by backend role checks.

### Test admin access and features

1. Complete **Create an administrator** above, configure the backend service-role key, restart the backend (`Set-Location backend; npm.cmd run dev`), and serve the frontend as described in **Run locally**.
2. Open `http://localhost:3000/admin/index.html` while signed out. You should be sent to login. Sign in as the admin account; the dashboard should show counts for pets, available pets, applications, pending applications, and registered profiles.
3. Use **Manage pets** to create a test dog with a name, optional details, and an HTTPS image URL. Confirm the new row appears and is listed. Archive it; it should remain in the admin pet list with archived status, disappear from the public Adopt catalog, and retain any associated applications. Select **Archived pets** and restore it; confirm its status returns to listed and it reappears in the public catalog. This exercises the admin `DELETE /api/admin/pets/:id` archive route and `PUT /api/admin/pets/:id` restore route (the latter sends `{ "is_listed": true }`).
4. From a regular account, submit an adoption application for a listed pet. Return to the admin dashboard and verify the applicant, pet, date, and pending status. Choose **Approve** or **Reject**, confirm the action, and verify the updated badge. The applicant should see the updated status on their own dashboard.
5. In a separate browser session, try the admin pages and call an admin API as a signed-out user (expect HTTP 401), then as a logged-in non-admin user (expect HTTP 403). Admin UI role checks are only for presentation; the backend checks must reject these requests independently. Without the server-side service-role key, an authenticated admin data request should return HTTP 503 until it is configured.

## Pet health: appointments and vaccinations

The health module reuses `public.appointments`, `public.vaccination_records`, `public.pets`, and `public.shelters`; it does not create tables or require a schema migration. Open `http://localhost:3000/health.html` while signed in to request veterinary appointments and view or cancel your own appointment history. The pet profile at `pet-detail.html?id=<pet-uuid>` displays that pet's vaccination history. Admins can add or edit records at `http://localhost:3000/admin/vaccinations.html`.

The schema has no separate veterinarian or clinic directory. The booking page therefore lists existing shelter partners whose `services` include veterinary care, vaccination, or animal health, with their existing contact details and service hours. These are partner listings, not a guarantee of an on-duty veterinarian or available appointment slot; users should confirm details with the provider. The optional veterinarian name can be entered when known.

The existing RLS rules allow users to manage only their own appointments (`auth.uid() = user_id`) and permit public reads of pet vaccination history. Vaccination records are pet health information associated with public pet listings, not individual account records; no direct client insert or update policy is added. Creating and editing those records is restricted to authenticated admins by the Node.js `/api/admin/vaccinations` routes. Appointment APIs derive the user ID from the verified Supabase token, filter history and cancellation by that ID, and require the backend service-role key for their server-side database operations. Keep `SUPABASE_SERVICE_ROLE_KEY` only in `backend/.env`; never add it to the frontend.

Bookings reject past/invalid date and time values, unlisted pets, partners without listed veterinary services, and an occupied pending/confirmed clinic slot. The existing schema has no appointment duration, so conflicts are checked for the exact clinic, date, and start time. To make the conflict check safe against two simultaneous requests, first inspect existing active duplicate slots:

```sql
SELECT shelter_id, appointment_date, appointment_time, COUNT(*) AS active_bookings
FROM public.appointments
WHERE shelter_id IS NOT NULL
  AND status IN ('pending', 'confirmed')
GROUP BY shelter_id, appointment_date, appointment_time
HAVING COUNT(*) > 1;
```

If the query returns rows, resolve those scheduling conflicts deliberately before adding this optional constraint. If it returns no rows, apply:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_unique_active_provider_slot
ON public.appointments (shelter_id, appointment_date, appointment_time)
WHERE shelter_id IS NOT NULL
  AND status IN ('pending', 'confirmed');
```

This index only prevents duplicate start times at a provider; it does not model appointment lengths or overlapping intervals.

### Test appointments and vaccination records

1. Make sure `backend/.env` has the Supabase URL, public key, and server-side `SUPABASE_SERVICE_ROLE_KEY`, then restart the backend and serve the frontend using **Run locally**. The vaccination and appointment APIs return an explicit configuration/auth error if their requirements are not met.
2. Log in with a regular test account and open `http://localhost:3000/health.html`. Check that pet options and veterinary-service partner cards display. If a partner has phone, email, service hours, or services in its existing shelter row, confirm those details are shown.
3. Choose a pet, a listed provider, a future date and time, and a reason of at least three characters. Submit and confirm a success message and a Pending appointment in history. Try an earlier date/time and confirm it is rejected. Request the same provider/date/time again; after applying the optional unique index above, it should return a conflict response rather than create a duplicate.
4. Cancel a future Pending appointment and confirm its status changes to Cancelled. A second account should not see that appointment; if it tries to cancel using the first account's appointment ID, the API should respond as not found. Completed, cancelled, and past appointments cannot be cancelled by the user.
5. On a test pet profile, review the Vaccination records section and dates. To test record entry, sign in as an admin and open `/admin/vaccinations.html`; add a test vaccine name/date, optional due date, administering clinician, and notes. Edit it and verify the updated values appear on that pet's public profile. Do not enter fabricated medical history for real animals.
6. Verify authorization with requests made without a token:

   ```powershell
   curl.exe -i http://localhost:3000/api/appointments
   curl.exe -i http://localhost:3000/api/admin/vaccinations
   ```

   Both should return HTTP 401. To check admin-only routes as a signed-in regular user, use that account's own access token locally (do not paste it into chat or commit it):

   ```powershell
   curl.exe -i -H "Authorization: Bearer YOUR_REGULAR_USER_ACCESS_TOKEN" http://localhost:3000/api/appointments/all
   curl.exe -i -H "Authorization: Bearer YOUR_REGULAR_USER_ACCESS_TOKEN" http://localhost:3000/api/admin/vaccinations
   ```

   Both should return HTTP 403. A regular user may read public vaccine details on a pet profile but cannot create or edit records.

## Test Pet Care Services

The Food, Medicine, Boarding, and Videos pages use the existing public catalog APIs and tables. The current schema already enables RLS and allows public `SELECT` on `food_information`, `medicine_information`, `boarding_services`, and `videos`; no table recreation, migration, or policy change is required. Public reads use the backend's anon/public Supabase client. Do not put a service-role key in the frontend.

The existing food and medicine seed records are dog-focused. The Food page includes general, clearly labeled guidance for both dogs and cats, but cat-specific database entries will not appear until you add curated records. The video page builds filters from the categories returned by the existing video APIs, so older catalog categories remain visible. No provider, medicine, or video records are fabricated by the frontend. Boarding listings are not verified or endorsed.

### Repair unavailable pet-care videos

The four original video IDs in Supabase each returned YouTube oEmbed HTTP 404. The proposed replacement IDs returned oEmbed HTTP 200, and their embed and thumbnail URLs returned HTTP 200. Candidate iframe players initialized in the localhost browser, but playback did not advance during the test; playback is therefore **not confirmed**. No deployed website was available for testing.

To update only the four existing rows, first verify that the expected record IDs and original YouTube IDs are still present. Then open Supabase Dashboard → **SQL Editor** and run [`database/migrations/20261030_replace_unavailable_pet_videos.sql`](./database/migrations/20261030_replace_unavailable_pet_videos.sql) as one script. Its transaction aborts if the four target rows have changed, then updates only those rows' title, category, description, YouTube URL/ID, and thumbnail. It clears the old duration values rather than carrying potentially incorrect durations forward. It does not insert, delete, or change other video records. Review the four-row result set after it commits.

The proposed videos are:

- Dog Grooming and Hygiene — **Dog Grooming Steps for Dummies** (Go Groomer), `3GIbxJJMbCw`
- Pet Food and Nutrition — **Pet Food Basics: Choosing the Right Diet for Your Dog or Cat with Dr. Lisa Weeth** (The Schwarzman Animal Medical Center), `JUsLlxXWch0`
- Pet Vaccination and Health — **Understanding dog vaccinations - Purina** (Purina Australia), `0zyNzDtBCfI`
- Dog Training and Behavior — **Behavior & Training Tips: Positive Reinforcement** (San Diego Humane Society), `nQC2XH-0HEM`

The page uses `https://www.youtube-nocookie.com/embed/<video-id>` and the `strict-origin-when-cross-origin` referrer policy. Error 153 occurred when an embed URL was opened directly without its enclosing page; Google documents that the player requires a Referer. The page iframe is embedded in the local website and passes an origin referrer policy. After applying the video update, reload the page and press Play in each card. Confirm that the player visibly plays and its playback time advances; an HTTP 200 response, thumbnail, or Play control alone is not a playback pass. Test again on the deployed HTTPS origin after deployment.

### Add dog-training videos

The live catalog previously had one row each under the old categories `Grooming`, `Health & Wellness`, `Puppy Care`, and `Training`. The three reviewed training records described below have since been inserted into Supabase. A read through the existing `/api/videos` endpoint returned all three rows with the expected category, ID, embed URL, and thumbnail URL.

Three public candidate videos were found and checked. Each video ID returned YouTube oEmbed metadata with the expected title/channel; each embed and thumbnail URL returned HTTP 200:

- **Behavior & Training Tips: Positive Reinforcement** — San Diego Humane Society — `nQC2XH-0HEM`
- **Teach your dog to ‘sit’ the force-free way** — RSPCA South Australia — `Q1AskPZXWR8`
- **Teach your dog to ‘come’ the force-free way** — RSPCA South Australia — `FEskt702hyk`

In localhost, the `nQC2XH-0HEM` iframe initialized but did not advance after a Play attempt. The other candidates were not verified as playable. **None is confirmed as playable.** The three records were added to Supabase on 2026-10-30 and subsequently verified through `GET /api/videos`; the database migration file is retained as the repeat-safe SQL record. Confirm in the browser that each iframe's playback advances before marking any of them PASS. Test the deployed site separately after it exists.

The older video rows were not deleted or changed. The public catalog combines the four existing YouTube category filters with the six Supabase Storage categories: Dog Care, Cat Care, Pet Nutrition, Pet Training, Pet Health, and Vaccination Awareness.

1. Configure `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`, then start the backend and frontend using **Run locally**. The service-role key stays on the server and is needed for authenticated support-enquiry writes.
2. Visit `http://localhost:3000/food.html`. Check the Dog Food and Cat Food filters, the separate general feeding tips, and the database-backed listing cards. If no cat entries exist, the filter should show an empty state rather than treating dog food as cat food.
3. Visit `http://localhost:3000/medicine.html`. Review the dog/cat filters and prominent veterinarian warning. Medicine names, purposes, and precautions come from the existing database; the page gives no dosage or treatment instructions. A species without records should show an empty state.
4. Visit `http://localhost:3000/boarding.html`. Check that provider cards show their listed details, accepted pet types, and facilities, along with the listing verification disclaimer. If there are no listings, the page shows an empty state.
5. Sign in, choose a listed provider and accepted pet type, enter your name, pet name, a drop-off date today or later, a later pick-up date, and optional care needs. Accept the consent checkbox and submit. Confirm a success message with the support conversation reference. This creates a private support conversation for the authenticated account; it is an enquiry, **not** a booking or reservation, and details are not sent directly to the provider. Try a pet type not accepted by the selected listing, an earlier drop-off date, a pick-up date on/before drop-off, and submission without consent to confirm validation.
6. Submit the same request without signing in. The page should take you to login; the API itself also returns HTTP 401 without a valid token. A signed-in request without the backend service-role key returns an explicit HTTP 503 rather than appearing successful. A regular user can read only their own support conversation through the existing authenticated support endpoints.
7. Visit `http://localhost:3000/videos.html`. The page combines the four curated YouTube categories with six Pet Care Storage categories. Storage uploads use native browser playback controls. Sign in with an active admin to view upload/edit/delete controls after applying the storage migration and restarting the backend. Confirm playback advances before recording a video as working.

Useful public API checks after starting the backend:

```powershell
curl.exe -i http://localhost:3000/api/food
curl.exe -i http://localhost:3000/api/medicine
curl.exe -i http://localhost:3000/api/boarding
curl.exe -i http://localhost:3000/api/videos
curl.exe -i -X POST http://localhost:3000/api/support/conversations -H "Content-Type: application/json" -d '{"message":"test"}'
```

The four catalog requests should return HTTP 200. The unauthenticated support request should return HTTP 401. No database changes are required for these tests.

## Adoption application test data

The seed intentionally does not insert adoption applications: each application must reference a real `auth.users` account and a real pet. To add one for local testing, first create an Auth user and run the seed. Then run the following in the Supabase SQL Editor, replacing the email with that Auth user's email. It selects an actually available seeded dog and avoids adding another pending application for the same user and dog.

```sql
DO $$
DECLARE
  applicant_id uuid;
  applicant_name text;
  applicant_email text;
  applicant_phone text;
  dog_id uuid;
BEGIN
  SELECT id
  INTO applicant_id
  FROM auth.users
  WHERE lower(email) = lower('YOUR_AUTH_USER_EMAIL');

  IF applicant_id IS NULL THEN
    RAISE EXCEPTION 'Create the Auth user first and replace YOUR_AUTH_USER_EMAIL';
  END IF;

  SELECT name, email, phone
  INTO applicant_name, applicant_email, applicant_phone
  FROM public.users
  WHERE id = applicant_id;

  IF applicant_email IS NULL THEN
    RAISE EXCEPTION 'The Auth user has no public.users profile; check the schema trigger';
  END IF;

  SELECT id
  INTO dog_id
  FROM public.pets
  WHERE name = 'Bruno' AND adoption_status = 'available'
  LIMIT 1;

  IF dog_id IS NULL THEN
    RAISE EXCEPTION 'No available seeded dog named Bruno was found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.adoption_applications
    WHERE user_id = applicant_id
      AND pet_id = dog_id
      AND status = 'pending'
  ) THEN
    INSERT INTO public.adoption_applications (
      user_id, pet_id, full_name, email, phone, address, reason, status
    ) VALUES (
      applicant_id,
      dog_id,
      COALESCE(applicant_name, 'Local test applicant'),
      applicant_email,
      COALESCE(applicant_phone, '0000000000'),
      'Local development test address',
      'Local development test application',
      'pending'
    );
  ELSE
    RAISE NOTICE 'A pending application for this user and dog already exists';
  END IF;
END;
$$;
```

This SQL runs as the database owner in SQL Editor. Do not use fake `user_id` values. The adoption form requires a Supabase session and submits through the authenticated backend adoption endpoint, which assigns the application to the verified user. The SQL example remains useful for creating test applications directly in the database.

## Supabase Storage

The current app stores image URLs in database columns and seeded examples use remote URLs. No frontend or backend code uploads to Supabase Storage, so the project does not need a bucket or Storage policies for the documented setup. Add a bucket and narrowly scoped policies when an upload feature is implemented; do not enable public writes as a workaround.

## Project layout

- `frontend/` — static pages, styles, browser configuration, and scripts
- `frontend/admin/` — administrator dashboard pages and scripts
- `backend/server.js` — Express server, health checks, and route registration
- `backend/config/`, `backend/middleware/` — Supabase clients and authentication/authorization
- `backend/routes/` — auth, pets, adoptions, appointments, shelters, care content, admin, and support APIs
- `database/schema.sql` — tables, indexes, RLS policies, and Auth profile trigger
- `database/migrations/` — additive listing, account/RLS, and video data migrations
- `database/seed.sql` — one-time sample catalog and informational data
- `docs/TEST_CASES.md`, `docs/FINAL_TESTING_REPORT.md` — test scenarios and observed results

## API overview

The API is mounted at `/api`. The health endpoints are `GET /api/health` and `GET /api/test-supabase`. Feature route groups include `/api/auth`, `/api/pets`, `/api/adoptions`, `/api/appointments`, `/api/shelters`, `/api/videos`, `/api/pet-care-videos`, `/api/food`, `/api/medicine`, `/api/boarding`, `/api/notifications`, `/api/admin`, `/api/support`, and `/api/chat`. Pet Care Storage videos are listed at `GET /api/pet-care-videos`; active admins use the same route for multipart `POST`, `PUT /:id`, and `DELETE /:id` operations. Protected operations require a Supabase access token; administrator operations also require an active admin profile and a backend-only service-role key.

## Final verification and known limitations

See the [test case matrix](./docs/TEST_CASES.md) and [final testing report](./docs/FINAL_TESTING_REPORT.md). In the current connected Supabase project, a read-only query returned PostgreSQL error `42703` for `pets.is_listed`. The additive migration exists but **has not been applied**. Do not rely on archive/restore or newly updated API filters until that migration has been run and verified. The current backend environment also lacks `SUPABASE_SERVICE_ROLE_KEY`, so registration, authenticated data operations, and admin CRUD could not be exercised. No user or pet records were created or changed during testing.

The older video rows still include YouTube IDs which returned HTTP 404 from YouTube oEmbed and showed “Video unavailable” in the browser. Three additional Dog Training and Behavior records now exist in Supabase and are returned by `/api/videos`, but playback is not confirmed. The new Storage migration is prepared but not applied; upload and file playback are therefore not yet available.

## Deploying the frontend with Vercel

1. Apply and verify the required Supabase migrations in the correct project before deploying.
2. Deploy `frontend/` as a static Vercel project (no build command; output directory `.`).
3. Update `frontend/js/config.js` so `API_BASE_URL` points to the HTTPS URL of the deployed backend, not `localhost`.
4. Deploy the existing Express backend to a Node.js host, or explicitly adapt it to Vercel Functions; the current static frontend deployment does not host `backend/server.js`.
5. Configure backend environment variables on the backend host: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NODE_ENV=production`, and `FRONTEND_URL` set to the exact Vercel origin. Configure optional chatbot keys only on the backend.
6. Keep the Supabase service-role key out of Vercel frontend environment variables and all browser assets. The browser may contain only the public publishable/anon key and public API URL.
7. Set Supabase Auth Site URL and allowed redirect URLs to the deployed frontend origin, and verify CORS, email confirmation, RLS, and protected routes against dedicated test accounts before opening access.
8. Re-run the tests in the test matrix against the deployed services. Do not treat deployment or a health check alone as proof that authentication, admin actions, database writes, or video playback work.
