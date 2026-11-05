/**
 * routes/shelters.js
 * Shelter listing, detail, and review endpoints.
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateUser, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/shelters
// List shelters with optional verified filter and pagination.
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { verified, search, page = 1, limit = 12 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('shelters')
      .select('*, is_verified:verified', { count: 'exact' })
      .order('name', { ascending: true })
      .range(offset, offset + Number(limit) - 1);

    if (verified !== undefined) {
      query = query.eq('verified', verified === 'true');
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,location.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[shelters GET /] Supabase query failed:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }

    const shelterIds = (data || []).map((shelter) => shelter.id);
    const petCounts = new Map();
    if (shelterIds.length > 0) {
      const { data: availablePets, error: petsError } = await supabase
        .from('pets')
        .select('shelter_id')
        .in('shelter_id', shelterIds)
        .eq('adoption_status', 'available')
        .eq('is_listed', true);

      if (petsError) {
        console.error('[shelters GET /] Available pet count query failed:', petsError);
        return res.status(500).json({ success: false, message: 'Could not load shelter pet counts.' });
      }

      for (const pet of availablePets || []) {
        petCounts.set(pet.shelter_id, (petCounts.get(pet.shelter_id) || 0) + 1);
      }
    }

    const shelters = (data || []).map((shelter) => ({
      ...shelter,
      city: shelter.city || shelter.location,
      pet_count: petCounts.get(shelter.id) || 0,
    }));

    return res.status(200).json({
      success: true,
      data: shelters,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit)),
      },
    });
  } catch (err) {
    console.error('[shelters GET /]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/shelters/:id
// Get a shelter with its pets and reviews.
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: shelter, error } = await supabase
      .from('shelters')
      .select(
        `
        *,
        pets (
          id, name, species, breed, age:age_years, gender, adoption_status,
          pet_images ( id, image_url, is_primary )
        ),
        shelter_reviews:reviews (
          id, rating, comment, created_at,
          users ( id, full_name:name, avatar_url:profile_image )
        )
      `
      )
      .eq('id', id)
      .single();

    if (error || !shelter) {
      return res.status(404).json({ success: false, message: 'Shelter not found' });
    }

    // Compute average rating
    const reviews = shelter.shelter_reviews || [];
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : null;

    return res.status(200).json({
      success: true,
      data: { ...shelter, average_rating: avgRating, review_count: reviews.length },
    });
  } catch (err) {
    console.error('[shelters GET /:id]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/shelters/:id/reviews
// Get paginated reviews for a shelter.
// ---------------------------------------------------------------------------
router.get('/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Verify shelter exists
    const { data: shelter, error: shelterError } = await supabase
      .from('shelters')
      .select('id, name')
      .eq('id', id)
      .single();

    if (shelterError || !shelter) {
      return res.status(404).json({ success: false, message: 'Shelter not found' });
    }

    const { data: reviews, error, count } = await supabase
      .from('reviews')
      .select(
        `
        id, rating, comment, created_at,
        users ( id, full_name:name, avatar_url:profile_image )
      `,
        { count: 'exact' }
      )
      .eq('shelter_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(200).json({
      success: true,
      data: reviews || [],
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit)),
      },
    });
  } catch (err) {
    console.error('[shelters GET /:id/reviews]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/shelters/:id/reviews
// Add a review for a shelter (authenticated users only, one review per shelter).
// ---------------------------------------------------------------------------
router.post(
  '/:id/reviews',
  authenticateUser,
  [
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    body('comment').optional().trim().isLength({ max: 1000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id: shelter_id } = req.params;
    const { rating, comment } = req.body;
    const user_id = req.user.id;

    try {
      // Verify shelter exists
      const { data: shelter, error: shelterError } = await supabaseAdmin
        .from('shelters')
        .select('id')
        .eq('id', shelter_id)
        .single();

      if (shelterError || !shelter) {
        return res.status(404).json({ success: false, message: 'Shelter not found' });
      }

      // Check for duplicate review
      const { data: existing } = await supabaseAdmin
        .from('reviews')
        .select('id')
        .eq('shelter_id', shelter_id)
        .eq('user_id', user_id)
        .maybeSingle();

      if (existing) {
        return res
          .status(409)
          .json({ success: false, message: 'You have already reviewed this shelter' });
      }

      const { data: review, error } = await supabaseAdmin
        .from('reviews')
        .insert({
          shelter_id,
          user_id,
          rating,
          comment: comment || null,
          created_at: new Date().toISOString(),
        })
        .select(
          `
          id, rating, comment, created_at,
          users ( id, full_name:name, avatar_url:profile_image )
        `
        )
        .single();

      if (error) {
        return res.status(500).json({ success: false, message: error.message });
      }

      return res.status(201).json({
        success: true,
        message: 'Review submitted',
        data: review,
      });
    } catch (err) {
      console.error('[shelters POST /:id/reviews]', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

module.exports = router;
