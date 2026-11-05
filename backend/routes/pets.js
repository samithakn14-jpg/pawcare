/**
 * routes/pets.js
 * Pet listing, detail, save/unsave, and recommendation endpoints.
 */

const express = require('express');
const { supabase, supabaseAdmin, hasServiceRoleKey } = require('../config/supabase');
const { authenticateUser, optionalAuth, requireServiceRole } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// Helper: build the filter query for pet listings
// ---------------------------------------------------------------------------
function applyPetFilters(query, filters) {
  const {
    species,
    breed,
    age_min,
    age_max,
    gender,
    location,
    size,
    shelter_id,
    vaccination_status,
    adoption_status,
    search,
  } = filters;

  if (breed) query = query.ilike('breed', `%${breed}%`);
  if (gender) query = query.eq('gender', gender);
  if (location) query = query.ilike('location', `%${location}%`);
  if (size) query = query.eq('size', size);
  if (shelter_id) query = query.eq('shelter_id', shelter_id);
  if (vaccination_status) query = query.eq('vaccination_status', vaccination_status);
  if (adoption_status) query = query.eq('adoption_status', adoption_status);
  if (age_min !== undefined) query = query.gte('age_years', Number(age_min));
  if (age_max !== undefined) query = query.lte('age_years', Number(age_max));
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,breed.ilike.%${search}%,description.ilike.%${search}%`
    );
  }

  return query;
}

// ---------------------------------------------------------------------------
// GET /api/pets
// List all pets with optional filters and pagination.
// ---------------------------------------------------------------------------
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      species,
      breed,
      age_min,
      age_max,
      gender,
      location,
      size,
      shelter_id,
      vaccination_status,
      adoption_status,
      search,
      page = 1,
      limit = 12,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    if (species && species.toLowerCase() !== 'dog') {
      return res.status(400).json({ success: false, message: 'Only dogs are available on this platform' });
    }
    const sortKey = sort_by === 'age' ? 'age_years' : sort_by;
    const allowedSortFields = ['created_at', 'name', 'age_years', 'adoption_fee', 'species'];
    const sortField = allowedSortFields.includes(sortKey) ? sortKey : 'created_at';
    const ascending = sort_order === 'asc';

    let query = supabase
      .from('pets')
      .select(
        `
        *,
        shelters ( id, name, location, phone ),
        pet_images ( id, image_url, is_primary )
      `,
        { count: 'exact' }
      )
      .order(sortField, { ascending })
      .eq('species', 'dog')
      .eq('is_listed', true)
      .range(offset, offset + Number(limit) - 1);

    query = applyPetFilters(query, {
      species,
      breed,
      age_min,
      age_max,
      gender,
      location,
      size,
      shelter_id,
      vaccination_status,
      adoption_status,
      search,
    });

    const { data, error, count } = await query;

    if (error) {
      console.error('[pets GET /] Supabase query failed:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }

    // If user is authenticated, annotate which pets they've saved
    let savedPetIds = new Set();
    if (req.user && hasServiceRoleKey) {
      const { data: saved } = await supabaseAdmin
        .from('saved_pets')
        .select('pet_id')
        .eq('user_id', req.user.id);
      if (saved) savedPetIds = new Set(saved.map((s) => s.pet_id));
    }

    const pets = (data || []).map((pet) => ({
      ...pet,
      is_saved: savedPetIds.has(pet.id),
    }));

    return res.status(200).json({
      success: true,
      data: pets,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit)),
      },
    });
  } catch (err) {
    console.error('[pets GET /]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/pets/saved
// Get the authenticated user's saved pets.
// Must be defined BEFORE /:id to avoid route conflict.
// ---------------------------------------------------------------------------
router.get('/saved', authenticateUser, requireServiceRole, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('saved_pets')
      .select(
        `
        id,
        created_at,
        pets (
          *,
          shelters ( id, name, location ),
          pet_images ( id, image_url, is_primary )
        )
      `
      )
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const pets = (data || []).map((row) => ({
      ...row.pets,
      saved_at: row.created_at,
      saved_record_id: row.id,
    }));

    return res.status(200).json({ success: true, data: pets });
  } catch (err) {
    console.error('[pets GET /saved]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/pets/recommended
// Lightweight recommendation engine – score pets by matching user preferences.
// Query params: species, breed, age_min, age_max, gender, limit
// ---------------------------------------------------------------------------
router.get('/recommended', optionalAuth, async (req, res) => {
  try {
    const {
      species,
      breed,
      age_min,
      age_max,
      gender,
      limit = 6,
    } = req.query;

    // Fetch a broader pool to score
    let query = supabase
      .from('pets')
      .select(
        `
        *,
        shelters ( id, name, location ),
        pet_images ( id, image_url, is_primary )
      `
      )
      .eq('adoption_status', 'available')
      .eq('species', 'dog')
      .eq('is_listed', true)
      .limit(100);

    if (species && species.toLowerCase() !== 'dog') {
      return res.status(400).json({ success: false, message: 'Only dogs are available on this platform' });
    }

    const { data: pets, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    // Score each pet
    const scored = (pets || []).map((pet) => {
      let score = 0;
      if (breed && pet.breed?.toLowerCase().includes(breed.toLowerCase())) score += 3;
      if (gender && pet.gender === gender) score += 2;
      if (age_min !== undefined && pet.age >= Number(age_min)) score += 1;
      if (age_max !== undefined && pet.age <= Number(age_max)) score += 1;
      return { ...pet, score };
    });

    // Sort by score descending, then by creation date
    scored.sort((a, b) => b.score - a.score || new Date(b.created_at) - new Date(a.created_at));

    return res.status(200).json({
      success: true,
      data: scored.slice(0, Number(limit)),
    });
  } catch (err) {
    console.error('[pets GET /recommended]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/pets/:id
// Get a single pet with full details.
// ---------------------------------------------------------------------------
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: pet, error } = await supabase
      .from('pets')
      .select(
        `
        *,
        shelters ( * ),
        pet_images ( id, image_url, is_primary, created_at ),
        vaccination_records ( id, vaccine_name, vaccination_date, next_due_date, administered_by, notes )
      `
      )
      .eq('id', id)
      .eq('is_listed', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ success: false, message: 'Pet not found' });
      }
      console.error('[pets GET /:id] Pet query failed:', error);
      return res.status(500).json({ success: false, message: 'Could not load pet details' });
    }

    if (!pet) {
      return res.status(404).json({ success: false, message: 'Pet not found' });
    }

    let is_saved = false;
    if (req.user && hasServiceRoleKey) {
      const { data: saved } = await supabaseAdmin
        .from('saved_pets')
        .select('id')
        .eq('user_id', req.user.id)
        .eq('pet_id', id)
        .maybeSingle();
      is_saved = !!saved;
    }

    return res.status(200).json({ success: true, data: { ...pet, is_saved } });
  } catch (err) {
    console.error('[pets GET /:id]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/pets/:id/save
// Toggle save/unsave a pet for the authenticated user.
// ---------------------------------------------------------------------------
router.put('/:id/save', authenticateUser, requireServiceRole, async (req, res) => {
  try {
    const { id: pet_id } = req.params;
    const user_id = req.user.id;

    // Check if pet exists
    const { data: pet, error: petError } = await supabaseAdmin
      .from('pets')
      .select('id, is_listed')
      .eq('id', pet_id)
      .single();

    if (petError) {
      if (petError.code === 'PGRST116') {
        return res.status(404).json({ success: false, message: 'Pet not found' });
      }
      console.error('[pets PUT /:id/save] Pet query failed:', petError);
      return res.status(500).json({ success: false, message: 'Could not verify pet listing status' });
    }

    if (!pet || pet.is_listed === false) {
      return res.status(404).json({ success: false, message: 'Pet not found' });
    }

    // Check if already saved
    const { data: existing } = await supabaseAdmin
      .from('saved_pets')
      .select('id')
      .eq('user_id', user_id)
      .eq('pet_id', pet_id)
      .maybeSingle();

    if (existing) {
      // Unsave
      await supabaseAdmin.from('saved_pets').delete().eq('id', existing.id);
      return res.status(200).json({ success: true, saved: false, message: 'Pet unsaved' });
    } else {
      // Save
      await supabaseAdmin
        .from('saved_pets')
        .insert({ user_id, pet_id, created_at: new Date().toISOString() });
      return res.status(200).json({ success: true, saved: true, message: 'Pet saved' });
    }
  } catch (err) {
    console.error('[pets PUT /:id/save]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
