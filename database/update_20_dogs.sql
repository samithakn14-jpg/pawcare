-- ============================================================
-- PetCare Connect - 20 Dogs Update Script
-- ============================================================
-- Updates only the 20 fixed-ID sample dogs with photos and adoption fees.
-- Do not use this sample-data script to modify production pet records.
-- Existing pet_images rows outside those sample pets are preserved.
-- ============================================================

-- Ensure adoption_fee column exists with non-negative check
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS adoption_fee NUMERIC(10,2) NOT NULL DEFAULT 0;

-- 1. Bruno — Golden Retriever (Mumbai) — ₹1,500
UPDATE public.pets
SET 
  name = 'Bruno',
  species = 'dog',
  breed = 'Golden Retriever',
  primary_image = 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&auto=format&fit=crop&q=80',
  adoption_fee = 1500,
  location = 'Mumbai',
  adoption_status = 'available'
WHERE id = '22222222-0000-0000-0000-000000000001';

-- 2. Rani — Labrador Mix (New Delhi) — ₹1,000
UPDATE public.pets
SET 
  name = 'Rani',
  species = 'dog',
  breed = 'Labrador Mix',
  primary_image = 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=800&auto=format&fit=crop&q=80',
  adoption_fee = 1000,
  location = 'New Delhi',
  adoption_status = 'available'
WHERE id = '22222222-0000-0000-0000-000000000002';

-- 3. Max — German Shepherd (Bangalore) — ₹1,200
UPDATE public.pets
SET 
  name = 'Max',
  species = 'dog',
  breed = 'German Shepherd',
  primary_image = 'https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=800&auto=format&fit=crop&q=80',
  adoption_fee = 1200,
  location = 'Bangalore',
  adoption_status = 'available'
WHERE id = '22222222-0000-0000-0000-000000000003';

-- 4. Coco — Indian Pariah Dog / Indie (Chennai) — ₹800
UPDATE public.pets
SET 
  name = 'Coco',
  species = 'dog',
  breed = 'Indian Pariah Dog',
  primary_image = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop&q=80',
  adoption_fee = 800,
  location = 'Chennai',
  adoption_status = 'available'
WHERE id = '22222222-0000-0000-0000-000000000004';

-- 5. Rocky — Beagle (Pune) — ₹1,000
UPDATE public.pets
SET 
  name = 'Rocky',
  species = 'dog',
  breed = 'Beagle',
  primary_image = 'https://images.unsplash.com/photo-1505628346881-b72b27e84530?w=800&auto=format&fit=crop&q=80',
  adoption_fee = 1000,
  location = 'Pune',
  adoption_status = 'available'
WHERE id = '22222222-0000-0000-0000-000000000005';

-- 6. Simba — Indie Puppy (Mumbai) — ₹500
UPDATE public.pets
SET 
  name = 'Simba',
  species = 'dog',
  breed = 'Indian Pariah Dog',
  primary_image = 'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=800&auto=format&fit=crop&q=80',
  adoption_fee = 500,
  location = 'Mumbai',
  adoption_status = 'available'
WHERE id = '22222222-0000-0000-0000-000000000006';

-- 7. Daisy — Indie Tan (Mumbai) — ₹750
UPDATE public.pets
SET 
  name = 'Daisy',
  species = 'dog',
  breed = 'Indie',
  primary_image = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=80',
  adoption_fee = 750,
  location = 'Mumbai',
  adoption_status = 'available'
WHERE id = '22222222-0000-0000-0000-000000000007';

-- 8. Milo — Shih Tzu (New Delhi) — ₹1,800
UPDATE public.pets
SET 
  name = 'Milo',
  species = 'dog',
  breed = 'Shih Tzu',
  primary_image = 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&auto=format&fit=crop&q=80',
  adoption_fee = 1800,
  location = 'New Delhi',
  adoption_status = 'available'
WHERE id = '22222222-0000-0000-0000-000000000008';

-- 9. Zara — Border Collie (Bangalore) — ₹1,500
UPDATE public.pets
SET 
  name = 'Zara',
  species = 'dog',
  breed = 'Border Collie',
  primary_image = 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800&auto=format&fit=crop&q=80',
  adoption_fee = 1500,
  location = 'Bangalore',
  adoption_status = 'available'
WHERE id = '22222222-0000-0000-0000-000000000009';

-- 10. Ollie — Dachshund (Chennai) — ₹1,200
UPDATE public.pets
SET 
  name = 'Ollie',
  species = 'dog',
  breed = 'Dachshund',
  primary_image = 'https://images.unsplash.com/photo-1612195583950-b8fd34c87093?w=800&auto=format&fit=crop&q=80',
  adoption_fee = 1200,
  location = 'Chennai',
  adoption_status = 'available'
WHERE id = '22222222-0000-0000-0000-000000000010';

-- 11. Maya — Indie Puppy (Pune) — ₹500
UPDATE public.pets
SET 
  name = 'Maya',
  species = 'dog',
  breed = 'Indie',
  primary_image = 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80',
  adoption_fee = 500,
  location = 'Pune',
  adoption_status = 'available'
WHERE id = '22222222-0000-0000-0000-000000000011';

-- 12. Thor — Boxer (Mumbai) — ₹1,600
UPDATE public.pets
SET 
  name = 'Thor',
  species = 'dog',
  breed = 'Boxer',
  primary_image = 'https://images.unsplash.com/photo-1546975490-a79abdd54533?w=800&auto=format&fit=crop&q=80',
  adoption_fee = 1600,
  location = 'Mumbai',
  adoption_status = 'available'
WHERE id = '22222222-0000-0000-0000-000000000012';

-- 13. Ruby — Cocker Spaniel (New Delhi) — ₹1,400
UPDATE public.pets
SET 
  name = 'Ruby',
  species = 'dog',
  breed = 'Cocker Spaniel',
  primary_image = 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=800&auto=format&fit=crop&q=80',
  adoption_fee = 1400,
  location = 'New Delhi',
  adoption_status = 'available'
WHERE id = '22222222-0000-0000-0000-000000000013';

-- 14. Benny — Pug (Bangalore) — ₹1,100
UPDATE public.pets
SET 
  name = 'Benny',
  species = 'dog',
  breed = 'Pug',
  primary_image = 'https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?w=800&auto=format&fit=crop&q=80',
  adoption_fee = 1100,
  location = 'Bangalore',
  adoption_status = 'available'
WHERE id = '22222222-0000-0000-0000-000000000014';

-- 15. Nala — Great Dane (Chennai) — ₹2,500
UPDATE public.pets
SET 
  name = 'Nala',
  species = 'dog',
  breed = 'Great Dane',
  primary_image = 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&auto=format&fit=crop&q=80',
  adoption_fee = 2500,
  location = 'Chennai',
  adoption_status = 'available'
WHERE id = '22222222-0000-0000-0000-000000000015';

-- 16. Finn — Australian Shepherd (Pune) — ₹1,800
UPDATE public.pets
SET 
  name = 'Finn',
  species = 'dog',
  breed = 'Australian Shepherd',
  primary_image = 'https://images.unsplash.com/photo-1503256207526-0d5d80fa2f47?w=800&auto=format&fit=crop&q=80',
  adoption_fee = 1800,
  location = 'Pune',
  adoption_status = 'available'
WHERE id = '22222222-0000-0000-0000-000000000016';

-- 17. Penny — Poodle Mix (Mumbai) — ₹1,200
UPDATE public.pets
SET 
  name = 'Penny',
  species = 'dog',
  breed = 'Poodle Mix',
  primary_image = 'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=800&auto=format&fit=crop&q=80',
  adoption_fee = 1200,
  location = 'Mumbai',
  adoption_status = 'available'
WHERE id = '22222222-0000-0000-0000-000000000017';

-- 18. Koda — Siberian Husky (New Delhi) — ₹2,200
UPDATE public.pets
SET 
  name = 'Koda',
  species = 'dog',
  breed = 'Siberian Husky',
  primary_image = 'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?w=800&auto=format&fit=crop&q=80',
  adoption_fee = 2200,
  location = 'New Delhi',
  adoption_status = 'available'
WHERE id = '22222222-0000-0000-0000-000000000018';

-- 19. Rosie — Corgi / Dachshund Mix (Bangalore) — ₹1,300
UPDATE public.pets
SET 
  name = 'Rosie',
  species = 'dog',
  breed = 'Dachshund Mix',
  primary_image = 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=800&auto=format&fit=crop&q=80',
  adoption_fee = 1300,
  location = 'Bangalore',
  adoption_status = 'available'
WHERE id = '22222222-0000-0000-0000-000000000019';

-- 20. Ace — Doberman Pinscher (Chennai) — ₹2,000
UPDATE public.pets
SET 
  name = 'Ace',
  species = 'dog',
  breed = 'Doberman Pinscher',
  primary_image = 'https://images.unsplash.com/photo-1568572933382-74d440642117?w=800&auto=format&fit=crop&q=80',
  adoption_fee = 2000,
  location = 'Chennai',
  adoption_status = 'available'
WHERE id = '22222222-0000-0000-0000-000000000020';

-- Refresh existing primary-image rows only for the fixed-ID sample dogs.
UPDATE public.pet_images AS image
SET image_url = pet.primary_image
FROM public.pets AS pet
WHERE image.pet_id = pet.id
  AND image.is_primary = TRUE
  AND pet.id BETWEEN
    '22222222-0000-0000-0000-000000000001'::UUID AND
    '22222222-0000-0000-0000-000000000020'::UUID;

-- Add a primary-image row only when a sample dog does not already have one.
INSERT INTO public.pet_images (pet_id, image_url, is_primary)
SELECT pet.id, pet.primary_image, TRUE
FROM public.pets AS pet
WHERE pet.id BETWEEN
    '22222222-0000-0000-0000-000000000001'::UUID AND
    '22222222-0000-0000-0000-000000000020'::UUID
  AND pet.primary_image IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.pet_images AS image
    WHERE image.pet_id = pet.id
      AND image.is_primary = TRUE
  );

-- Verification query
SELECT id, name, breed, species, adoption_fee, primary_image FROM public.pets ORDER BY name ASC;
