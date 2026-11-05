BEGIN;

-- ============================================================
-- 1. SHELTERS (5 records)
-- ============================================================

INSERT INTO public.shelters (
  id, name, description, address, location, phone, email, website,
  image, cover_image, verified, opening_hours, services
) VALUES
(
  '11111111-0000-0000-0000-000000000001',
  'Paws & Hearts Animal Shelter',
  'A community rescue shelter caring for dogs and helping them find permanent homes.',
  '12 Andheri West, Mumbai, Maharashtra 400053',
  'Mumbai',
  '+91 22 2345 6789',
  'hello@pawsandhearts.example',
  NULL,
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600',
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1200',
  TRUE,
  '{
    "monday":    {"open": "09:00", "close": "18:00"},
    "tuesday":   {"open": "09:00", "close": "18:00"},
    "wednesday": {"open": "09:00", "close": "18:00"},
    "thursday":  {"open": "09:00", "close": "18:00"},
    "friday":    {"open": "09:00", "close": "18:00"},
    "saturday":  {"open": "10:00", "close": "17:00"},
    "sunday":    {"open": "10:00", "close": "15:00"}
  }'::JSONB,
  ARRAY['Adoption', 'Foster Care', 'Veterinary Check-ups', 'Grooming', 'Microchipping', 'Behavioural Training']
),

-- 2 ─ Delhi (verified)
(
  '11111111-0000-0000-0000-000000000002',
  'Delhi Animal Welfare Society',
  'A government-recognised NGO dedicated to rescuing, rehabilitating, and rehoming stray and abandoned dogs across the National Capital Region.',
  'House No. 7, Block C, Lajpat Nagar II, New Delhi 110024',
  'New Delhi',
  '+91 11 4567 8901',
  'contact@daws.in',
  'https://daws.in',
  'https://images.unsplash.com/photo-1601758174493-45d0a4d3e407?w=600',
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1200',
  TRUE,
  '{
    "monday":    {"open": "08:30", "close": "17:30"},
    "tuesday":   {"open": "08:30", "close": "17:30"},
    "wednesday": {"open": "08:30", "close": "17:30"},
    "thursday":  {"open": "08:30", "close": "17:30"},
    "friday":    {"open": "08:30", "close": "17:30"},
    "saturday":  {"open": "09:00", "close": "14:00"},
    "sunday":    {"open": "closed", "close": "closed"}
  }'::JSONB,
  ARRAY['Adoption', 'Rescue Operations', 'Sterilisation Programme', 'Vaccination Drives', 'Animal Birth Control']
),

-- 3 ─ Bangalore (verified)
(
  '11111111-0000-0000-0000-000000000003',
  'Bangalore Pet Rescue Foundation',
  'A volunteer-driven shelter in the heart of Bengaluru, specialising in senior pet adoption and rescue of animals from high-kill situations.',
  '15/A, 3rd Cross, Indiranagar, Bengaluru, Karnataka 560038',
  'Bangalore',
  '+91 80 2345 6789',
  'hello@blrpetrescue.org',
  'https://blrpetrescue.org',
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600',
  'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=1200',
  TRUE,
  '{
    "monday":    {"open": "10:00", "close": "19:00"},
    "tuesday":   {"open": "10:00", "close": "19:00"},
    "wednesday": {"open": "10:00", "close": "19:00"},
    "thursday":  {"open": "10:00", "close": "19:00"},
    "friday":    {"open": "10:00", "close": "19:00"},
    "saturday":  {"open": "09:00", "close": "18:00"},
    "sunday":    {"open": "09:00", "close": "18:00"}
  }'::JSONB,
  ARRAY['Adoption', 'Senior Pet Rehoming', 'Foster Care', 'Veterinary Partnerships', 'Community Education']
),

-- 4 ─ Chennai (unverified — newly registered)
(
  '11111111-0000-0000-0000-000000000004',
  'Chennai Companion Animal Shelter',
  'A community shelter run by local volunteers focused on improving the lives of abandoned and injured animals in Chennai and surrounding districts.',
  '22, Gandhi Street, T. Nagar, Chennai, Tamil Nadu 600017',
  'Chennai',
  '+91 44 6789 0123',
  'ccas.chennai@gmail.com',
  NULL,
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600',
  'https://images.unsplash.com/photo-1592754862816-1a21a4ea2281?w=1200',
  FALSE,
  '{
    "monday":    {"open": "09:00", "close": "17:00"},
    "tuesday":   {"open": "09:00", "close": "17:00"},
    "wednesday": {"open": "09:00", "close": "17:00"},
    "thursday":  {"open": "09:00", "close": "17:00"},
    "friday":    {"open": "09:00", "close": "17:00"},
    "saturday":  {"open": "09:00", "close": "13:00"},
    "sunday":    {"open": "closed", "close": "closed"}
  }'::JSONB,
  ARRAY['Adoption', 'Rescue', 'Basic Veterinary Care', 'Fostering']
),

-- 5 ─ Pune (unverified)
(
  '11111111-0000-0000-0000-000000000005',
  'Pune Furry Friends Rescue',
  'A passionate group of animal lovers running a small but impactful shelter in Pune, focusing on dogs rescued from the streets of PCMC and PMC areas.',
  'Survey No. 88, Near Wakad Bridge, Wakad, Pune, Maharashtra 411057',
  'Pune',
  '+91 98907 65432',
  'punefurryfriends@outlook.com',
  NULL,
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=600',
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1200',
  FALSE,
  '{
    "monday":    {"open": "10:00", "close": "18:00"},
    "tuesday":   {"open": "10:00", "close": "18:00"},
    "wednesday": {"open": "10:00", "close": "18:00"},
    "thursday":  {"open": "10:00", "close": "18:00"},
    "friday":    {"open": "10:00", "close": "18:00"},
    "saturday":  {"open": "10:00", "close": "16:00"},
    "sunday":    {"open": "closed", "close": "closed"}
  }'::JSONB,
  ARRAY['Adoption', 'Street Animal Rescue', 'Sterilisation', 'Vaccination']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. PETS (10 dog records)
-- ============================================================

INSERT INTO public.pets (
  id, shelter_id, name, species, breed,
  age_years, age_months, gender, size, color,
  description, personality, health_status,
  vaccination_status, deworming_status, neutered_status,
  adoption_status, adoption_requirements, location,
  primary_image, featured, adoption_fee
) VALUES

-- ── DOGS ─────────────────────────────────────────────────────

-- Dog 1: Bruno — Golden Retriever, Mumbai
(
  '22222222-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000001',
  'Bruno',
  'dog', 'Golden Retriever',
  3, 0, 'male', 'large', 'Golden',
  'Bruno is an affectionate, playful Golden Retriever who loves fetch and swimming. He was surrendered by a family relocating abroad. He is house-trained and gets along wonderfully with children and other dogs.',
  ARRAY['playful', 'affectionate', 'energetic', 'good with kids', 'social'],
  'Excellent – up to date on all vaccinations and recently dewormed.',
  TRUE, TRUE, TRUE,
  'available',
  'Requires a home with a garden or regular outdoor exercise. Experience with large breeds preferred.',
  'Mumbai',
  'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&auto=format&fit=crop&q=80',
  TRUE, 1500
),

-- Dog 2: Rani — Labrador Mix, Delhi
(
  '22222222-0000-0000-0000-000000000002',
  '11111111-0000-0000-0000-000000000002',
  'Rani',
  'dog', 'Labrador Mix',
  1, 6, 'female', 'medium', 'Black',
  'Rani is a young Labrador mix rescued from a Delhi roadside. She is incredibly smart and has already learnt basic commands. She is gentle with children and loves cuddling on the couch after a good walk.',
  ARRAY['gentle', 'smart', 'trainable', 'cuddly', 'calm'],
  'Good – vaccinated, dewormed, and spayed.',
  TRUE, TRUE, TRUE,
  'available',
  'First-time pet owners welcome. Apartment-friendly if given 2 daily walks.',
  'New Delhi',
  'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=800&auto=format&fit=crop&q=80',
  TRUE, 1000
),

-- Dog 3: Max — German Shepherd, Bangalore
(
  '22222222-0000-0000-0000-000000000003',
  '11111111-0000-0000-0000-000000000003',
  'Max',
  'dog', 'German Shepherd',
  5, 0, 'male', 'large', 'Black and Tan',
  'Max is a dignified, loyal German Shepherd who served as a guard dog before his owner passed away. He needs an experienced handler but is deeply devoted once he bonds with his family. Currently undergoing basic re-socialisation training.',
  ARRAY['loyal', 'protective', 'intelligent', 'calm', 'trainable'],
  'Good – vaccinated. Mildly arthritic in left hind leg; managed with supplements.',
  TRUE, TRUE, FALSE,
  'available',
  'Experienced dog owners only. Not suitable for homes with small children under 5.',
  'Bangalore',
  'https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=600',
  FALSE, 1200
),

-- Dog 4: Coco — Indie/Desi Dog, Chennai
(
  '22222222-0000-0000-0000-000000000004',
  '11111111-0000-0000-0000-000000000004',
  'Coco',
  'dog', 'Indian Pariah Dog',
  2, 3, 'female', 'medium', 'Fawn',
  'Coco is a street-rescued Indie dog full of life and love. She is extremely adaptable, thrives in apartments, and has a playful demeanour. She does well with other dogs and enjoys long morning runs.',
  ARRAY['adaptable', 'playful', 'independent', 'energetic', 'friendly'],
  'Good – vaccinated and spayed.',
  TRUE, TRUE, TRUE,
  'available',
  'Suitable for first-time owners. Benefits from socialisation classes.',
  'Chennai',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600',
  FALSE, 800
),

-- Dog 5: Rocky — Beagle, Pune
(
  '22222222-0000-0000-0000-000000000005',
  '11111111-0000-0000-0000-000000000005',
  'Rocky',
  'dog', 'Beagle',
  4, 0, 'male', 'small', 'Tricolour',
  'Rocky is a curious, nose-led Beagle who loves sniffing out adventures. He was found wandering near Wakad and is now fully rehabilitated. He is great with other pets and has a hilarious personality.',
  ARRAY['curious', 'friendly', 'funny', 'food-motivated', 'social'],
  'Excellent – all vaccinations complete.',
  TRUE, TRUE, FALSE,
  'available',
  'Needs a securely fenced yard or vigilant leash management. Very food motivated — easy to train.',
  'Pune',
  'https://images.unsplash.com/photo-1505628346881-b72b27e84530?w=600',
  TRUE, 1000
),

-- Dog 6: Simba — Indie Puppy, Mumbai
(
  '22222222-0000-0000-0000-000000000006',
  '11111111-0000-0000-0000-000000000001',
  'Simba',
  'dog', 'Indian Pariah Dog',
  0, 4, 'male', 'small', 'Cream',
  'Simba is an adorable 4-month-old Indie pup who was found abandoned near Andheri station. He is playful, bottle-fed, and fully weaned. He loves chasing toys and sleeping in laps.',
  ARRAY['playful', 'curious', 'affectionate', 'energetic'],
  'Good – first set of vaccinations done.',
  TRUE, TRUE, FALSE,
  'available',
  'Puppy socialisation class recommended within the first month.',
  'Mumbai',
  'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=600',
  FALSE, 500
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.pets (
  id, shelter_id, name, species, breed,
  age_years, age_months, gender, size, color,
  description, personality, health_status,
  vaccination_status, deworming_status, neutered_status,
  adoption_status, adoption_requirements, location,
  primary_image, featured, adoption_fee
) SELECT *
FROM (VALUES
('22222222-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000001', 'Daisy', 'dog', 'Indie', 1, 2, 'female', 'medium', 'Tan', 'Daisy is a gentle, playful Indie who enjoys walks and meeting new people.', ARRAY['gentle', 'playful', 'social'], 'Healthy and vaccinated.', TRUE, TRUE, FALSE, 'available', 'A loving home with daily walks.', 'Mumbai', 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=80', FALSE, 750),
('22222222-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000002', 'Milo', 'dog', 'Shih Tzu', 3, 5, 'male', 'small', 'White and Brown', 'Milo is an affectionate companion who loves quiet evenings and short walks.', ARRAY['affectionate', 'calm', 'friendly'], 'Healthy and vaccinated.', TRUE, TRUE, TRUE, 'available', 'Regular grooming required.', 'New Delhi', 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&auto=format&fit=crop&q=80', FALSE, 1800),
('22222222-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000003', 'Zara', 'dog', 'Border Collie', 2, 0, 'female', 'medium', 'Black and White', 'Zara is a bright, energetic dog who loves training games and outdoor adventures.', ARRAY['intelligent', 'energetic', 'trainable'], 'Healthy and vaccinated.', TRUE, TRUE, TRUE, 'available', 'Active home preferred.', 'Bangalore', 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800&auto=format&fit=crop&q=80', FALSE, 1500),
('22222222-0000-0000-0000-000000000010', '11111111-0000-0000-0000-000000000004', 'Ollie', 'dog', 'Dachshund', 4, 1, 'male', 'small', 'Red', 'Ollie is a curious little dog with a big personality and a love of sniffing walks.', ARRAY['curious', 'brave', 'affectionate'], 'Healthy and vaccinated.', TRUE, TRUE, FALSE, 'available', 'Provide regular, gentle exercise.', 'Chennai', 'https://images.unsplash.com/photo-1612195583950-b8fd34c87093?w=800&auto=format&fit=crop&q=80', FALSE, 1200),
('22222222-0000-0000-0000-000000000011', '11111111-0000-0000-0000-000000000005', 'Maya', 'dog', 'Indie', 0, 7, 'female', 'small', 'Brown', 'Maya is a playful puppy who is learning her basic cues and enjoys toys.', ARRAY['playful', 'curious', 'sweet'], 'Healthy; puppy vaccine series in progress.', FALSE, TRUE, FALSE, 'available', 'Puppy training and veterinary follow-up required.', 'Pune', 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80', FALSE, 500),
('22222222-0000-0000-0000-000000000012', '11111111-0000-0000-0000-000000000001', 'Thor', 'dog', 'Boxer', 3, 8, 'male', 'large', 'Fawn', 'Thor is a goofy, energetic dog who enjoys playtime and human company.', ARRAY['loyal', 'goofy', 'energetic'], 'Healthy and vaccinated.', TRUE, TRUE, TRUE, 'available', 'Daily exercise and companionship.', 'Mumbai', 'https://images.unsplash.com/photo-1546975490-a79abdd54533?w=800&auto=format&fit=crop&q=80', FALSE, 1600),
('22222222-0000-0000-0000-000000000013', '11111111-0000-0000-0000-000000000002', 'Ruby', 'dog', 'Cocker Spaniel', 5, 0, 'female', 'medium', 'Golden', 'Ruby is a gentle, friendly dog who likes relaxed walks and attention.', ARRAY['gentle', 'friendly', 'affectionate'], 'Healthy and vaccinated.', TRUE, TRUE, TRUE, 'available', 'Regular coat care recommended.', 'New Delhi', 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=800&auto=format&fit=crop&q=80', FALSE, 1400),
('22222222-0000-0000-0000-000000000014', '11111111-0000-0000-0000-000000000003', 'Benny', 'dog', 'Pug', 2, 6, 'male', 'small', 'Fawn', 'Benny is a charming companion with an easygoing nature and a playful side.', ARRAY['charming', 'playful', 'easygoing'], 'Healthy; monitor breathing in hot weather.', TRUE, TRUE, FALSE, 'available', 'Keep exercise moderate in warm weather.', 'Bangalore', 'https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?w=800&auto=format&fit=crop&q=80', FALSE, 1100),
('22222222-0000-0000-0000-000000000015', '11111111-0000-0000-0000-000000000004', 'Nala', 'dog', 'Great Dane', 1, 11, 'female', 'extra_large', 'Blue', 'Nala is a gentle giant who enjoys calm company and leisurely walks.', ARRAY['gentle', 'calm', 'affectionate'], 'Healthy and vaccinated.', TRUE, TRUE, FALSE, 'available', 'Large-dog experience and room to stretch.', 'Chennai', 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&auto=format&fit=crop&q=80', FALSE, 2500),
('22222222-0000-0000-0000-000000000016', '11111111-0000-0000-0000-000000000005', 'Finn', 'dog', 'Australian Shepherd', 2, 9, 'male', 'large', 'Blue Merle', 'Finn is an active, smart dog who thrives on training and outdoor activities.', ARRAY['active', 'smart', 'loyal'], 'Healthy and vaccinated.', TRUE, TRUE, TRUE, 'available', 'An active home with daily enrichment.', 'Pune', 'https://images.unsplash.com/photo-1503256207526-0d5d80fa2f47?w=800&auto=format&fit=crop&q=80', FALSE, 1800),
('22222222-0000-0000-0000-000000000017', '11111111-0000-0000-0000-000000000001', 'Penny', 'dog', 'Poodle Mix', 6, 3, 'female', 'small', 'Apricot', 'Penny is a bright and friendly senior dog who enjoys gentle companionship.', ARRAY['bright', 'friendly', 'gentle'], 'Healthy and vaccinated.', TRUE, TRUE, TRUE, 'available', 'Gentle exercise and regular grooming.', 'Mumbai', 'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=800&auto=format&fit=crop&q=80', FALSE, 1200),
('22222222-0000-0000-0000-000000000018', '11111111-0000-0000-0000-000000000002', 'Koda', 'dog', 'Siberian Husky', 3, 2, 'male', 'large', 'Grey and White', 'Koda is a social, energetic dog who loves active outdoor time.', ARRAY['energetic', 'curious', 'social'], 'Healthy and vaccinated.', TRUE, TRUE, FALSE, 'available', 'Experienced, active home with secure fencing.', 'New Delhi', 'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?w=800&auto=format&fit=crop&q=80', FALSE, 2200),
('22222222-0000-0000-0000-000000000019', '11111111-0000-0000-0000-000000000003', 'Rosie', 'dog', 'Dachshund Mix', 1, 4, 'female', 'small', 'Chocolate', 'Rosie is a confident young dog who loves gentle play and exploring.', ARRAY['sweet', 'playful', 'confident'], 'Healthy and vaccinated.', TRUE, TRUE, FALSE, 'available', 'Safe indoor space and daily walks.', 'Bangalore', 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=800&auto=format&fit=crop&q=80', FALSE, 1300),
('22222222-0000-0000-0000-000000000020', '11111111-0000-0000-0000-000000000004', 'Ace', 'dog', 'Doberman Pinscher', 4, 6, 'male', 'large', 'Black and Rust', 'Ace is a loyal, alert dog who responds well to patient, consistent training.', ARRAY['loyal', 'alert', 'trainable'], 'Healthy and vaccinated.', TRUE, TRUE, TRUE, 'available', 'Experienced owner and structured exercise.', 'Chennai', 'https://images.unsplash.com/photo-1568572933382-74d440642117?w=800&auto=format&fit=crop&q=80', FALSE, 2000)
) AS seed(
  id, shelter_id, name, species, breed, age_years, age_months, gender,
  size, color, description, personality, health_status, vaccination_status,
  deworming_status, neutered_status, adoption_status, adoption_requirements,
  location, primary_image, featured, adoption_fee
)
WHERE seed.id IN (
  '22222222-0000-0000-0000-000000000007',
  '22222222-0000-0000-0000-000000000008',
  '22222222-0000-0000-0000-000000000009',
  '22222222-0000-0000-0000-000000000010'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. PET_IMAGES (at least one per pet)
-- ============================================================

INSERT INTO public.pet_images (pet_id, image_url, is_primary)
SELECT seed.pet_id::uuid, seed.image_url, seed.is_primary
FROM (VALUES

-- Bruno (Dog 1)
('22222222-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600', TRUE),
('22222222-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1601758174774-e0b7fcf7d346?w=600', FALSE),
('22222222-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=600', FALSE),

-- Rani (Dog 2)
('22222222-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=600', TRUE),
('22222222-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1529472119196-cb724127b930?w=600', FALSE),

-- Max (Dog 3)
('22222222-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=600', TRUE),
('22222222-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?w=600', FALSE),
('22222222-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1568572933382-74d440642117?w=600', FALSE),

-- Coco (Dog 4)
('22222222-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600', TRUE),
('22222222-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=600', FALSE),

-- Rocky (Dog 5)
('22222222-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1505628346881-b72b27e84530?w=600', TRUE),
('22222222-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1544568100-847a948585b9?w=600', FALSE),

-- Simba (Dog 6)
('22222222-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=600', TRUE),

-- Additional dog listings
('22222222-0000-0000-0000-000000000007', 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=80', TRUE),
('22222222-0000-0000-0000-000000000008', 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&auto=format&fit=crop&q=80', TRUE),
('22222222-0000-0000-0000-000000000009', 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800&auto=format&fit=crop&q=80', TRUE),
('22222222-0000-0000-0000-000000000010', 'https://images.unsplash.com/photo-1612195583950-b8fd34c87093?w=800&auto=format&fit=crop&q=80', TRUE),
('22222222-0000-0000-0000-000000000011', 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80', TRUE),
('22222222-0000-0000-0000-000000000012', 'https://images.unsplash.com/photo-1546975490-a79abdd54533?w=800&auto=format&fit=crop&q=80', TRUE),
('22222222-0000-0000-0000-000000000013', 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=800&auto=format&fit=crop&q=80', TRUE),
('22222222-0000-0000-0000-000000000014', 'https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?w=800&auto=format&fit=crop&q=80', TRUE),
('22222222-0000-0000-0000-000000000015', 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&auto=format&fit=crop&q=80', TRUE),
('22222222-0000-0000-0000-000000000016', 'https://images.unsplash.com/photo-1503256207526-0d5d80fa2f47?w=800&auto=format&fit=crop&q=80', TRUE),
('22222222-0000-0000-0000-000000000017', 'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=800&auto=format&fit=crop&q=80', TRUE),
('22222222-0000-0000-0000-000000000018', 'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?w=800&auto=format&fit=crop&q=80', TRUE),
('22222222-0000-0000-0000-000000000019', 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=800&auto=format&fit=crop&q=80', TRUE),
('22222222-0000-0000-0000-000000000020', 'https://images.unsplash.com/photo-1568572933382-74d440642117?w=800&auto=format&fit=crop&q=80', TRUE)
) AS seed(pet_id, image_url, is_primary)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.pet_images AS existing
  WHERE existing.pet_id = seed.pet_id::uuid
    AND existing.image_url = seed.image_url
)
AND EXISTS (
  SELECT 1
  FROM public.pets AS pet
  WHERE pet.id = seed.pet_id::uuid
);

-- ============================================================
-- 4. VACCINATION_RECORDS (for vaccinated pets)
-- ============================================================

INSERT INTO public.vaccination_records (
  pet_id, vaccine_name, vaccination_date, next_due_date,
  administered_by, notes
) SELECT seed.pet_id::uuid, seed.vaccine_name, seed.vaccination_date::date,
         seed.next_due_date::date, seed.administered_by, seed.notes
FROM (VALUES

-- Bruno
('22222222-0000-0000-0000-000000000001', 'DHPPiL (Distemper, Hepatitis, Parvovirus, Para-influenza, Leptospirosis)', '2024-03-10', '2025-03-10', 'Dr. Priya Sharma, Andheri Pet Clinic', 'Annual booster due March 2025.'),
('22222222-0000-0000-0000-000000000001', 'Rabies',                                                                   '2024-03-10', '2027-03-10', 'Dr. Priya Sharma, Andheri Pet Clinic', '3-year rabies vaccine administered.'),
('22222222-0000-0000-0000-000000000001', 'Kennel Cough (Bordetella)',                                                '2024-06-15', '2025-06-15', 'Dr. Priya Sharma, Andheri Pet Clinic', 'Intra-nasal vaccine; recommended before boarding.'),

-- Rani
('22222222-0000-0000-0000-000000000002', 'DHPPiL',  '2024-08-22', '2025-08-22', 'Dr. Amit Verma, Delhi Animal Welfare Clinic', 'Combined 5-in-1 vaccine.'),
('22222222-0000-0000-0000-000000000002', 'Rabies',  '2024-08-22', '2025-08-22', 'Dr. Amit Verma, Delhi Animal Welfare Clinic', 'Annual rabies booster.'),

-- Max
('22222222-0000-0000-0000-000000000003', 'DHPPiL',                '2024-01-05', '2025-01-05', 'Dr. Kavitha Rao, Indiranagar Vet Centre', 'Arthritis supplement also prescribed — Synoquin EFA.'),
('22222222-0000-0000-0000-000000000003', 'Rabies',                '2024-01-05', '2027-01-05', 'Dr. Kavitha Rao, Indiranagar Vet Centre', '3-year vaccine.'),
('22222222-0000-0000-0000-000000000003', 'Kennel Cough (Bordetella)', '2024-04-20', '2025-04-20', 'Dr. Kavitha Rao, Indiranagar Vet Centre', NULL),

-- Coco
('22222222-0000-0000-0000-000000000004', 'DHPPiL', '2024-05-18', '2025-05-18', 'Dr. Subramanian, T. Nagar Vet Hospital', NULL),
('22222222-0000-0000-0000-000000000004', 'Rabies',  '2024-05-18', '2025-05-18', 'Dr. Subramanian, T. Nagar Vet Hospital', NULL),

-- Rocky
('22222222-0000-0000-0000-000000000005', 'DHPPiL',             '2024-02-28', '2025-02-28', 'Dr. Neha Joshi, Wakad Pet Hospital', NULL),
('22222222-0000-0000-0000-000000000005', 'Rabies',             '2024-02-28', '2027-02-28', 'Dr. Neha Joshi, Wakad Pet Hospital', '3-year vaccine.'),
('22222222-0000-0000-0000-000000000005', 'Leptospirosis booster', '2024-02-28', '2025-02-28', 'Dr. Neha Joshi, Wakad Pet Hospital', 'High-risk outdoor dog.'),

-- Simba (first puppy shots only)
('22222222-0000-0000-0000-000000000006', 'DHPPi (6-week puppy shot)', '2026-07-15', '2026-09-15', 'Dr. Priya Sharma, Andheri Pet Clinic', 'Second shot due at 10 weeks.'),

-- Additional dogs receive vaccination records through their shelters.
('22222222-0000-0000-0000-000000000007', 'DHPPiL', '2025-01-15', '2026-01-15', 'Dr. Priya Sharma, Andheri Pet Clinic', 'Annual booster.'),
('22222222-0000-0000-0000-000000000008', 'DHPPiL', '2025-02-15', '2026-02-15', 'Dr. Amit Verma, Delhi Animal Welfare Clinic', 'Annual booster.'),
('22222222-0000-0000-0000-000000000009', 'DHPPiL', '2025-03-15', '2026-03-15', 'Dr. Kavitha Rao, Indiranagar Vet Centre', 'Annual booster.'),
('22222222-0000-0000-0000-000000000010', 'DHPPiL', '2025-04-15', '2026-04-15', 'Dr. Subramanian, T. Nagar Vet Hospital', 'Annual booster.'),
('22222222-0000-0000-0000-000000000012', 'DHPPiL', '2025-05-15', '2026-05-15', 'Dr. Priya Sharma, Andheri Pet Clinic', 'Annual booster.')
) AS seed(pet_id, vaccine_name, vaccination_date, next_due_date, administered_by, notes)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.vaccination_records AS existing
  WHERE existing.pet_id = seed.pet_id::uuid
    AND existing.vaccine_name = seed.vaccine_name
    AND existing.vaccination_date = seed.vaccination_date::date
)
AND EXISTS (
  SELECT 1
  FROM public.pets AS pet
  WHERE pet.id = seed.pet_id::uuid
);

-- ============================================================
-- 5. FOOD_INFORMATION (4 records)
-- ============================================================

INSERT INTO public.food_information (
  food_name, pet_type, category, benefits, feeding_info,
  safety_info, is_dangerous, image
)
SELECT seed.food_name, seed.pet_type, seed.category, seed.benefits,
       seed.feeding_info, seed.safety_info, seed.is_dangerous, seed.image
FROM (VALUES

(
  'Premium Puppy Kibble',
  'dog',
  'Commercial Dry Food',
  'Formulated with DHA for brain development, calcium for strong bones, and controlled protein levels ideal for puppies (under 12 months). Supports healthy growth and immune system development.',
  'Puppies aged 8–16 weeks: 4 meals per day. 4–6 months: 3 meals per day. 6–12 months: 2 meals per day. Always follow manufacturer''s feeding guide based on projected adult weight. Ensure fresh water is always available.',
  'Choose AAFCO or BIS (India) certified brands. Store in a cool, dry place. Avoid leaving wet or uneaten food out for more than 30 minutes to prevent bacterial growth.',
  FALSE,
  'https://images.unsplash.com/photo-1589924691995-400dc9a4437c?w=400'
),

(
  'Adult Dog Dry Food (Chicken & Rice)',
  'dog',
  'Commercial Dry Food',
  'High-quality protein from real chicken supports muscle maintenance. Rice provides easily digestible carbohydrates for sustained energy. Omega-6 fatty acids promote a shiny coat and healthy skin.',
  'Adult dogs (1–7 years): Feed twice daily. Use weight-appropriate portion sizes — typically 1–3 cups per day for medium breeds. Adjust based on activity level and body condition score.',
  'Transition gradually from puppy food over 7–10 days to avoid digestive upset. Avoid free-feeding to prevent obesity. Monitor weight monthly.',
  FALSE,
  'https://images.unsplash.com/photo-1599443015574-be5fe8a05783?w=400'
),

(
  'Home-Cooked Chicken and Vegetable Meal',
  'dog',
  'Home-Cooked Food',
  'Boiled chicken (no bones) provides lean protein. Carrots, green beans, and sweet potato offer vitamins, minerals, and dietary fibre. Low in additives — ideal for dogs with food sensitivities.',
  'Serve at room temperature. Can replace up to 50% of daily kibble intake. Ensure the meal is nutritionally balanced — consult a vet nutritionist for a balanced homemade diet plan if feeding long-term.',
  'Never add onions, garlic, salt, or seasonings — all are toxic to dogs. Remove all bones before serving. Avoid grapes, raisins, and macadamia nuts. Cooked food should be stored refrigerated and used within 3 days.',
  FALSE,
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400'
),

(
  'Chocolate & Grapes — DANGEROUS FOODS',
  'dog',
  'Toxic / Dangerous Foods',
  'NO benefits — these foods are TOXIC to dogs and must be kept strictly out of reach at all times.',
  'Do NOT feed these to your dog under any circumstances. Even small amounts can cause life-threatening toxicity.',
  'CHOCOLATE contains theobromine and caffeine, causing vomiting, diarrhoea, seizures, and cardiac arrest. GRAPES & RAISINS can cause acute kidney failure. OTHER DANGEROUS FOODS: onions, garlic, xylitol (sweetener), macadamia nuts, avocado, raw yeast dough, alcohol. If accidental ingestion occurs, contact your veterinarian or an animal poison helpline IMMEDIATELY.',
  TRUE,
  'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400'
)
) AS seed(food_name, pet_type, category, benefits, feeding_info, safety_info, is_dangerous, image)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.food_information AS existing
  WHERE existing.food_name = seed.food_name
);

-- ============================================================
-- 6. MEDICINE_INFORMATION (5 records)
-- ============================================================

INSERT INTO public.medicine_information (
  medicine_name, pet_type, purpose, precautions, general_info, image
)
SELECT seed.medicine_name, seed.pet_type, seed.purpose, seed.precautions,
       seed.general_info, seed.image
FROM (VALUES

(
  'Frontline Plus (Fipronil + S-Methoprene) — Flea & Tick Treatment',
  'dog',
  'Monthly topical spot-on treatment that kills adult fleas, flea eggs, flea larvae, and ticks. Effective against Rhipicephalus, Amblyomma, and Ixodes tick species commonly found in India.',
  '⚠️ ALWAYS CONSULT A VETERINARIAN BEFORE USE. Do not apply to puppies under 8 weeks. Keep children away from the treated area until dry (approx. 24 hours). Avoid contact with eyes and mouth. Not for use on sick, debilitated, or underweight dogs.',
  'Apply between the shoulder blades directly to the skin, not the fur. Part the hair before application. Bathe your pet 48 hours before or after application for best efficacy. Repeat every 30 days or as directed by your vet. Store below 25°C away from direct sunlight. Dispose of used applicators safely.',
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400'
),

(
  'Drontal (Praziquantel + Pyrantel) — Broad-Spectrum Dewormer',
  'dog',
  'Oral tablet dewormer used against roundworms, hookworms, whipworms, and tapeworms in dogs. Commonly used for routine deworming and before/after travel or boarding.',
  '⚠️ ALWAYS CONSULT A VETERINARIAN BEFORE USE. Dosage is strictly weight-based — do not estimate. Follow your veterinarian''s guidance for puppies, pregnant or lactating dogs.',
  'Administer with or without food. Puppies need a veterinarian-guided deworming schedule. Adult dog frequency depends on parasite risk and veterinary advice. Keep a deworming log.',
  'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
),

(
  'Amoxicillin — Broad-Spectrum Antibiotic',
  'dog',
  'Oral antibiotic from the penicillin family used to treat bacterial infections including skin infections (pyoderma), urinary tract infections (UTIs), respiratory infections, and dental abscesses.',
  '⚠️ PRESCRIPTION ONLY — NEVER ADMINISTER WITHOUT A VETERINARIAN''S PRESCRIPTION AND EXPLICIT DOSAGE INSTRUCTIONS. Do not use if your pet has a known allergy to penicillin-class antibiotics. Complete the full prescribed course even if symptoms improve early — stopping early may lead to antibiotic resistance. Never use leftover antibiotics from a previous prescription or from a human medicine cabinet.',
  'Typically administered orally every 8–12 hours. Can be given with food to reduce stomach upset. Common side effects include mild diarrhoea or vomiting. Severe allergic reactions (facial swelling, hives, difficulty breathing) are rare but require immediate emergency veterinary attention. Store at room temperature away from moisture.',
  'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400'
),

(
  'Meloxicam (Metacam) — NSAID Pain Relief & Anti-Inflammatory',
  'dog',
  'Non-steroidal anti-inflammatory drug (NSAID) used to manage pain and inflammation associated with musculoskeletal disorders, post-surgical pain, osteoarthritis, and acute injuries.',
  '⚠️ PRESCRIPTION ONLY — NEVER ADMINISTER WITHOUT VETERINARY GUIDANCE. NEVER give human NSAIDs (ibuprofen, naproxen, aspirin) to dogs — they can be highly toxic and potentially fatal. Not suitable for dogs with kidney disease, liver disease, heart failure, or gastrointestinal ulcers. Always administer with food. Monitor for vomiting, diarrhoea, blood in stool, increased thirst, or lethargy.',
  'Do not combine with corticosteroids or other NSAIDs. Regular blood work (kidney and liver panels) may be recommended during long-term use. If your dog seems in pain, do not attempt to manage it yourself — consult a vet promptly.',
  'https://images.unsplash.com/photo-1576671081837-49000212a370?w=400'
),

(
  'Pet-Tab Plus — Multivitamin & Mineral Supplement',
  'dog',
  'Daily nutritional supplement providing essential vitamins (A, B-complex, C, D, E) and minerals (calcium, phosphorus, zinc) to support overall health, coat quality, bone strength, and immune function.',
  '⚠️ Consult your veterinarian before adding any supplement to your pet''s diet, especially if your pet is on prescription food or has a medical condition. Excessive vitamin supplementation can be harmful — more is not always better. Fat-soluble vitamins (A, D, E, K) can accumulate to toxic levels if over-supplemented. Do not substitute supplements for a balanced diet or veterinary treatment.',
  'Chewable tablets that most pets accept as a treat. Dose varies by pet size and species — follow label directions or vet advice. Best given at the same time each day, preferably with a meal. Store in a cool, dry place with the lid tightly closed. Particularly beneficial for senior pets, underweight rescues, or those on homemade diets.',
  'https://images.unsplash.com/photo-1550572017-edd951b55104?w=400'
)
) AS seed(medicine_name, pet_type, purpose, precautions, general_info, image)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.medicine_information AS existing
  WHERE existing.medicine_name = seed.medicine_name
);

-- ============================================================
-- 7. BOARDING_SERVICES (5 records)
-- ============================================================

INSERT INTO public.boarding_services (
  name, description, location, address, phone, email,
  price_range, facilities, pet_types_accepted, rating, image
)
SELECT seed.name, seed.description, seed.location, seed.address, seed.phone,
       seed.email, seed.price_range, seed.facilities, seed.pet_types_accepted,
       seed.rating, seed.image
FROM (VALUES

(
  'Pawsome Pet Resort',
  'A luxury dog boarding facility in Mumbai offering spacious private suites, 24/7 staff supervision, and a dedicated play area. Personalised care plans are available for senior or special-needs dogs.',
  'Mumbai',
  '78, Linking Road, Bandra West, Mumbai, Maharashtra 400050',
  '+91 98201 11223',
  'bookings@pawsomeresort.in',
  '₹1,200 – ₹2,500 per night',
  ARRAY['Private Suites', 'AC Rooms', '24/7 Staff', 'Outdoor Play Area', 'Grooming', 'Webcam Access', 'Daily Report Card', 'Veterinary Tie-up'],
  ARRAY['dogs'],
  4.8,
  'https://images.unsplash.com/photo-1601758124096-519d017ec3e5?w=600'
),

(
  'Happy Tails Home Boarding',
  'A family-run dog boarding service in Indiranagar, Bangalore where dogs are treated as part of the family. Small groups (max 4 dogs at a time) ensure personalised attention.',
  'Bangalore',
  '12, 9th Main, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038',
  '+91 99800 44556',
  'happytails.blr@gmail.com',
  '₹600 – ₹1,000 per night',
  ARRAY['Home Environment', 'Daily Walks', 'Feeding to Schedule', 'Evening Play Sessions', 'Photo Updates', 'Small Groups Only'],
  ARRAY['dogs'],
  4.6,
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600'
),

(
  'Capital Canine Club',
  'Delhi''s premier dog boarding and training facility. Offers both day care and overnight boarding with optional obedience training add-ons. Large outdoor exercise area and indoor climate-controlled kennels.',
  'New Delhi',
  'Plot 14, Pocket B, Vasant Kunj, New Delhi 110070',
  '+91 11 2610 3344',
  'info@capitalcanineclub.in',
  '₹800 – ₹1,800 per night',
  ARRAY['Day Care', 'Overnight Boarding', 'Training Classes', 'Grooming Salon', 'Outdoor Exercise Area', 'Climate-Controlled Kennels', 'Vet on Call'],
  ARRAY['dogs'],
  4.5,
  'https://images.unsplash.com/photo-1601758174774-e0b7fcf7d346?w=600'
),

(
  'Chennai Dog Boarding Centre',
  'Chennai dog boarding facility with CCTV monitoring and daily health checks.',
  'Chennai',
  '45, Cenotaph Road, Teynampet, Chennai, Tamil Nadu 600018',
  '+91 44 4567 2233',
  'meowaowoof.chn@gmail.com',
  '₹500 – ₹1,200 per night',
  ARRAY['Private Dog Suites', 'CCTV Monitoring', 'Daily Health Check', 'Individual Feeding', 'Grooming on Request', 'Air-Conditioned Units'],
  ARRAY['dogs'],
  4.3,
  'https://images.unsplash.com/photo-1592754862816-1a21a4ea2281?w=600'
),

(
  'Pune Pet Palace',
  'An affordable yet quality boarding facility in Wakad, Pune. Ideal for budget-conscious pet parents who don''t want to compromise on care. Provides structured routines, regular feeds, and daily exercise.',
  'Pune',
  'Unit 5, Spectrum Complex, Wakad, Pune, Maharashtra 411057',
  '+91 98907 77889',
  'punepetpalace@outlook.com',
  '₹400 – ₹900 per night',
  ARRAY['Structured Daily Routine', 'Regular Feeding Schedule', 'Daily Exercise', 'Basic Grooming', 'WhatsApp Updates', 'Affordable Rates'],
  ARRAY['dogs'],
  4.1,
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=600'
)
) AS seed(name, description, location, address, phone, email, price_range, facilities, pet_types_accepted, rating, image)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.boarding_services AS existing
  WHERE existing.name = seed.name
);

-- ============================================================
-- 8. VIDEOS
-- ============================================================

WITH seed_rows (title, description, category, youtube_id) AS (
VALUES

(
  'Free Dog Training Series: Lesson 1 (Sit and Drop)',
  'RSPCA South Australia demonstrates force-free cues for teaching a dog to sit and drop.',
  'Dog Training and Behavior',
  'NFSkzAuCjcI'
),
(
  'Teach your dog to sit the force-free way',
  'RSPCA South Australia demonstrates a reward-based method for teaching a dog to sit.',
  'Dog Training and Behavior',
  'Q1AskPZXWR8'
),
(
  'Teach Your Dog Sit (Hand Signal and Verbal Cue)',
  'Peach on a Leash demonstrates how to teach a dog a sit cue using a hand signal and verbal cue.',
  'Dog Training and Behavior',
  'Kqi9ekjEtOU'
),
(
  'How to Teach Your Dog Sit, Down, and Stand',
  'Nate Schoemer demonstrates how to train a dog to respond to sit, down, and stand cues.',
  'Dog Training and Behavior',
  '1asUjHLB-A0'
),
(
  '3 Easy Ways to Train Sit, Stay and Down (Force Free)',
  'Zak George demonstrates force-free ways to teach sit, stay, and down.',
  'Dog Training and Behavior',
  'dvha29ZZiMA'
),
(
  'How to Train Drop It',
  'Kikopup demonstrates a reward-based method for teaching a dog to release an item.',
  'Dog Training and Behavior',
  'gZvkyAFi7tc'
),
(
  'How to Teach a Dog to Sit',
  'Top Dog Tips demonstrates a basic method for teaching a dog to sit.',
  'Dog Training and Behavior',
  'EDgi2sLlWAU'
),
(
  'Behavior & Training Tips: Positive Reinforcement',
  'San Diego Humane Society shares practical tips for teaching dogs with positive reinforcement.',
  'Dog Training and Behavior',
  'nQC2XH-0HEM'
),
(
  'What Actually Is Positive Reinforcement Dog Training?',
  'An introduction to reward-based dog training and how positive reinforcement supports learning.',
  'Dog Training and Behavior',
  'KcIER93BORQ'
),
(
  'Teach your dog to come the force-free way',
  'RSPCA South Australia demonstrates a force-free approach to teaching a dog to come when called.',
  'Dog Training and Behavior',
  'FEskt702hyk'
),
(
  'Dog Grooming Steps for Dummies',
  'Go Groomer demonstrates a step-by-step overview of routine dog grooming.',
  'Grooming',
  '3GIbxJJMbCw'
),
(
  'At-Home Grooming',
  'RSPCA Victoria shares guidance for grooming a dog safely at home.',
  'Grooming',
  'ANPmACd3Eiw'
),
(
  'New Puppy?! Your First Veterinary Visit. What to Expect.',
  'A veterinarian explains what to expect at a puppy''s first veterinary visit.',
  'Puppy Care',
  'juMGkBEX7pc'
),
(
  'When to Bring a Pet in for Emergency Veterinary Care',
  'MedVet explains when a pet may need emergency veterinary care.',
  'Health & Wellness',
  '0DC_1nw-yYs'
),
(
  'How can I make sure my pet''s heart is healthy?',
  'VCA Animal Hospitals explains ways to support your pet''s heart health.',
  'Health & Wellness',
  'DvGcXjJwtCA'
),
(
  'Your Complete First Week Puppy Training Plan',
  'McCann Dog Training shares a practical training plan for a puppy''s first week at home.',
  'Puppy Care',
  'ckWzAqJEhKg'
),
(
  'Cat body language',
  'Cats Protection explains common cat body-language signals and what they can mean.',
  'Cat Care',
  'ZI-usLLWerI'
),
(
  'Pet Food Basics: Choosing the Right Diet for Your Dog or Cat',
  'The Schwarzman Animal Medical Center discusses how to choose an appropriate diet for a pet.',
  'Pet Nutrition',
  'JUsLlxXWch0'
),
(
  '2022 AAHA Canine Vaccination Guidelines',
  'The American Animal Hospital Association reviews its canine vaccination guidelines.',
  'Vaccination Awareness',
  '6BWFYcV349M'
)
),
deleted AS (
  DELETE FROM public.videos
  WHERE youtube_id IN (SELECT youtube_id FROM seed_rows)
     OR youtube_id IN (
       'omg5DVPWLjA',
       '8dVbBXLMmkE',
       'eKp_JCFjBM4',
       'T3EdDCVPv-E'
     )
  RETURNING youtube_id
)

INSERT INTO public.videos (
  title, description, category, youtube_id, youtube_url, thumbnail_url
)
SELECT
  seed.title,
  seed.description,
  seed.category,
  seed.youtube_id,
  'https://www.youtube.com/embed/' || seed.youtube_id,
  'https://img.youtube.com/vi/' || seed.youtube_id || '/hqdefault.jpg'
FROM seed_rows AS seed
CROSS JOIN (SELECT COUNT(*) FROM deleted) AS cleanup;

-- ============================================================
-- 9. REVIEWS (sample reviews for shelters)
-- NOTE: user_id values below are placeholders for testing only.
--       In production these will reference real auth.users UUIDs.
--       These inserts will fail if the referenced users do not
--       exist — comment them out if running against a fresh DB
--       without seeded auth users.
-- ============================================================

-- Uncomment and replace UUIDs with real user IDs to test reviews:
-- INSERT INTO public.reviews (user_id, shelter_id, rating, comment) VALUES
-- ('YOUR-USER-UUID-HERE', '11111111-0000-0000-0000-000000000001', 5, 'Amazing shelter! The staff at Paws & Hearts were incredibly knowledgeable and caring. Bruno was perfectly socialised and healthy when we adopted him. Highly recommend!'),
-- ('YOUR-USER-UUID-HERE', '11111111-0000-0000-0000-000000000001', 4, 'Great facility and friendly volunteers. Slightly long paperwork process but totally worth it. Our adopted dog is thriving.'),
-- ('YOUR-USER-UUID-HERE', '11111111-0000-0000-0000-000000000002', 5, 'Delhi Animal Welfare Society runs such a professional operation. The adoption counsellor spent over an hour helping us find the right match for our family.'),
-- ('YOUR-USER-UUID-HERE', '11111111-0000-0000-0000-000000000003', 5, 'Bangalore Pet Rescue Foundation changed our lives. We adopted a senior dog, Max, and he is absolutely wonderful. The staff''s dedication to the animals is remarkable.'),
-- ('YOUR-USER-UUID-HERE', '11111111-0000-0000-0000-000000000004', 3, 'Good intentions, but the facility is small and a little cramped. The volunteers are passionate though. Would like to see better infrastructure as they grow.'),
-- ('YOUR-USER-UUID-HERE', '11111111-0000-0000-0000-000000000005', 4, 'Pune Furry Friends Rescue does amazing work with limited resources. Rocky is the best Beagle! The adoption home check was thorough and reassuring.');

-- ============================================================
-- END OF SEED DATA
-- ============================================================

COMMIT;
