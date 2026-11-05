/**
 * routes/food.js
 * Pet food information endpoints.
 */

const express = require('express');
const { supabase } = require('../config/supabase');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/food
// List food information entries, filterable by pet_type.
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { pet_type, category, search, page = 1, limit = 20 } = req.query;
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
    const offset = (pageNumber - 1) * pageSize;

    let query = supabase
      .from('food_information')
      .select('*', { count: 'exact' })
      .order('food_name', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (pet_type) query = query.eq('pet_type', String(pet_type).toLowerCase());
    if (category) query = query.eq('category', category);
    if (search) {
      const term = String(search).replace(/[,%()]/g, ' ').trim().slice(0, 100);
      if (term) query = query.or(`food_name.ilike.%${term}%,benefits.ilike.%${term}%,feeding_info.ilike.%${term}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      pagination: {
        total: count,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (err) {
    console.error('[food GET /]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/food/:id
// Get a single food item by ID.
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const { data: item, error } = await supabase
      .from('food_information')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !item) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    return res.status(200).json({ success: true, data: item });
  } catch (err) {
    console.error('[food GET /:id]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
