/**
 * routes/boarding.js
 * Boarding / pet hotel service listing endpoints.
 */

const express = require('express');
const { supabase } = require('../config/supabase');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/boarding
// List boarding services with optional filters.
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const {
      location,
      pet_type,
      search,
      page = 1,
      limit = 12,
    } = req.query;

    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 12));
    const offset = (pageNumber - 1) * pageSize;

    let query = supabase
      .from('boarding_services')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (location) query = query.ilike('location', `%${String(location).replace(/[%_,]/g, ' ').slice(0, 100)}%`);
    if (pet_type) {
      const normalizedType = String(pet_type).toLowerCase().replace(/s$/, '');
      query = query.overlaps('pet_types_accepted', [normalizedType, `${normalizedType}s`]);
    }
    if (search) {
      const term = String(search).replace(/[,%()]/g, ' ').trim().slice(0, 100);
      if (term) query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
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
    console.error('[boarding GET /]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/boarding/:id
// Get a single boarding service with full details.
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const { data: service, error } = await supabase
      .from('boarding_services')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !service) {
      return res
        .status(404)
        .json({ success: false, message: 'Boarding service not found' });
    }

    return res.status(200).json({ success: true, data: service });
  } catch (err) {
    console.error('[boarding GET /:id]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
