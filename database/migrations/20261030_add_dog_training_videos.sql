BEGIN;

DO $$
DECLARE
  conflicting_video_count INTEGER;
BEGIN
  IF to_regclass('public.videos') IS NULL THEN
    RAISE EXCEPTION 'Table public.videos does not exist; apply the base schema first.';
  END IF;

  SELECT COUNT(*)
    INTO conflicting_video_count
  FROM public.videos AS video
  JOIN (
    VALUES
      (
        'nQC2XH-0HEM',
        'Behavior & Training Tips: Positive Reinforcement',
        'Dog Training and Behavior'
      ),
      (
        'Q1AskPZXWR8',
        'Teach your dog to ‘sit’ the force-free way',
        'Dog Training and Behavior'
      ),
      (
        'FEskt702hyk',
        'Teach your dog to ‘come’ the force-free way',
        'Dog Training and Behavior'
      )
  ) AS expected(youtube_id, title, category)
    ON video.youtube_id = expected.youtube_id
   AND (video.title <> expected.title OR video.category <> expected.category);

  IF conflicting_video_count > 0 THEN
    RAISE EXCEPTION
      'A candidate YouTube ID already exists with different metadata; review those rows before applying this migration.';
  END IF;
END;
$$;

INSERT INTO public.videos (title, description, category, youtube_url, youtube_id, thumbnail_url)
SELECT
  candidate.title,
  candidate.description,
  candidate.category,
  'https://www.youtube.com/embed/' || candidate.youtube_id,
  candidate.youtube_id,
  'https://img.youtube.com/vi/' || candidate.youtube_id || '/hqdefault.jpg'
FROM (
  VALUES
    (
      'Behavior & Training Tips: Positive Reinforcement',
      'San Diego Humane Society shares behavior and training tips using positive reinforcement. Adapt training to your dog and consult a qualified behavior professional for safety concerns.',
      'Dog Training and Behavior',
      'nQC2XH-0HEM'
    ),
    (
      'Teach your dog to ‘sit’ the force-free way',
      'RSPCA South Australia demonstrates a force-free method for teaching a dog to sit. Keep training sessions positive and suited to your dog.',
      'Dog Training and Behavior',
      'Q1AskPZXWR8'
    ),
    (
      'Teach your dog to ‘come’ the force-free way',
      'RSPCA South Australia demonstrates a force-free approach to teaching a dog to come when called. Practice safely in a controlled environment.',
      'Dog Training and Behavior',
      'FEskt702hyk'
    )
) AS candidate(title, description, category, youtube_id)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.videos AS existing
  WHERE existing.youtube_id = candidate.youtube_id
);

SELECT id, title, category, youtube_id, youtube_url, thumbnail_url
FROM public.videos
WHERE youtube_id IN ('nQC2XH-0HEM', 'Q1AskPZXWR8', 'FEskt702hyk')
ORDER BY title;

COMMIT;
