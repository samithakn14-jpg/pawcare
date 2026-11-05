BEGIN;

DO $$
DECLARE
  matching_video_count INTEGER;
BEGIN
  SELECT COUNT(*)
    INTO matching_video_count
  FROM public.videos AS video
  JOIN (
    VALUES
      ('ea3f621e-600e-4abb-b8e1-b65be611b209'::UUID, 'omg5DVPWLjA'),
      ('25defe45-47ed-42f2-93ba-9ec686d53346'::UUID, 'eKp_JCFjBM4'),
      ('df039ef7-4239-4256-97f6-281b9de59772'::UUID, 'T3EdDCVPv-E'),
      ('b427b964-b6e2-456c-ac21-e75760a1bac5'::UUID, '8dVbBXLMmkE')
  ) AS expected(id, youtube_id)
    ON video.id = expected.id
   AND video.youtube_id = expected.youtube_id;

  IF matching_video_count <> 4 THEN
    RAISE EXCEPTION
      'Expected exactly four unchanged PetCare Connect video rows, found %; no video rows were changed.',
      matching_video_count;
  END IF;
END;
$$;

UPDATE public.videos AS video
SET
  title = replacement.title,
  category = replacement.category,
  description = replacement.description,
  youtube_url = 'https://www.youtube.com/embed/' || replacement.youtube_id,
  youtube_id = replacement.youtube_id,
  thumbnail_url = 'https://img.youtube.com/vi/' || replacement.youtube_id || '/hqdefault.jpg',
  duration = NULL
FROM (
  VALUES
    (
      'ea3f621e-600e-4abb-b8e1-b65be611b209'::UUID,
      'omg5DVPWLjA',
      'Dog Grooming Steps for Dummies',
      'Dog Grooming and Hygiene',
      'Go Groomer demonstrates dog grooming steps. Use appropriate tools, work gently, and consult a professional groomer for difficult mats or nail care.',
      '3GIbxJJMbCw'
    ),
    (
      '25defe45-47ed-42f2-93ba-9ec686d53346'::UUID,
      'eKp_JCFjBM4',
      'Pet Food Basics: Choosing the Right Diet for Your Dog or Cat with Dr. Lisa Weeth',
      'Pet Food and Nutrition',
      'The Schwarzman Animal Medical Center presents a discussion of pet-food basics with veterinary nutritionist Dr. Lisa Weeth. Consult your veterinarian for nutrition advice specific to your pet.',
      'JUsLlxXWch0'
    ),
    (
      'df039ef7-4239-4256-97f6-281b9de59772'::UUID,
      'T3EdDCVPv-E',
      'Understanding dog vaccinations - Purina',
      'Pet Vaccination and Health',
      'Purina Australia provides an educational overview of dog vaccinations. Your veterinarian can recommend a vaccination schedule for your dog and local health risks.',
      '0zyNzDtBCfI'
    ),
    (
      'b427b964-b6e2-456c-ac21-e75760a1bac5'::UUID,
      '8dVbBXLMmkE',
      'Behavior & Training Tips: Positive Reinforcement',
      'Dog Training and Behavior',
      'San Diego Humane Society shares behavior and training tips using positive reinforcement. Adapt training to your dog and consult a qualified behavior professional for safety concerns.',
      'nQC2XH-0HEM'
    )
) AS replacement(id, expected_youtube_id, title, category, description, youtube_id)
WHERE video.id = replacement.id
  AND video.youtube_id = replacement.expected_youtube_id;

SELECT id, title, category, youtube_id, youtube_url, thumbnail_url
FROM public.videos
WHERE id IN (
  'ea3f621e-600e-4abb-b8e1-b65be611b209'::UUID,
  '25defe45-47ed-42f2-93ba-9ec686d53346'::UUID,
  'df039ef7-4239-4256-97f6-281b9de59772'::UUID,
  'b427b964-b6e2-456c-ac21-e75760a1bac5'::UUID
)
ORDER BY category;

COMMIT;
