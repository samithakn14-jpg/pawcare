/**
 * routes/admin.js
 * Full admin panel routes — all endpoints require admin role.
 *
 * Sections:
 *   Users         – GET /users, PUT /users/:id/status
 *   Pets          – GET /pets, POST /pets, PUT /pets/:id, DELETE /pets/:id
 *   Shelters      – GET /shelters, POST /shelters, PUT /shelters/:id,
 *                   PUT /shelters/:id/verify, DELETE /shelters/:id
 *   Applications  – GET /applications, PUT /applications/:id/status
 *   Appointments  – GET /appointments, PUT /appointments/:id/status
 *   Reviews       – GET /reviews, DELETE /reviews/:id
 *   Videos        – POST /videos, PUT /videos/:id, DELETE /videos/:id
 *   Stats         – GET /stats
 *   Notifications – POST /notifications/send
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateUser, requireAdmin, requireServiceRole } = require('../middleware/auth');

const router = express.Router();

// All routes in this file require authentication + admin role
router.use(authenticateUser, requireAdmin, requireServiceRole);

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------
function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return false;
  }
  return true;
}

// ===========================================================================
// STATS
// ===========================================================================

/**
 * GET /api/admin/stats
 * Returns aggregate counts for the dashboard.
 */
router.get('/stats', async (req, res) => {
  try {
    const [
      usersResult,
      petsResult,
      sheltersResult,
      applicationsResult,
      appointmentsResult,
      pendingResult,
      availableResult,
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('pets').select('*', { count: 'exact', head: true }).eq('is_listed', true),
      supabaseAdmin.from('shelters').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('adoption_applications').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true }),
      supabaseAdmin
        .from('adoption_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabaseAdmin
        .from('pets')
        .select('*', { count: 'exact', head: true })
        .eq('adoption_status', 'available')
        .eq('is_listed', true),
    ]);

    const queryError = [
      usersResult.error,
      petsResult.error,
      sheltersResult.error,
      applicationsResult.error,
      appointmentsResult.error,
      pendingResult.error,
      availableResult.error,
    ].find(Boolean);
    if (queryError) {
      console.error('[admin GET /stats] Supabase query failed:', queryError);
      return res.status(500).json({ success: false, message: 'Could not load admin dashboard statistics' });
    }

    return res.status(200).json({
      success: true,
      data: {
        users: usersResult.count || 0,
        pets: petsResult.count || 0,
        shelters: sheltersResult.count || 0,
        adoption_applications: applicationsResult.count || 0,
        appointments: appointmentsResult.count || 0,
        pending_applications: pendingResult.count || 0,
        available_pets: availableResult.count || 0,
      },
    });
  } catch (err) {
    console.error('[admin GET /stats]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ===========================================================================
// USERS
// ===========================================================================

/**
 * GET /api/admin/users
 */
router.get('/users', async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('users')
      .select('*, full_name:name', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (role) query = query.eq('role', role);
    if (status) query = query.eq('status', status);
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
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
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit)),
      },
    });
  } catch (err) {
    console.error('[admin GET /users]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * PUT /api/admin/users/:id/status
 */
router.put(
  '/users/:id/status',
  [body('status').isIn(['active', 'suspended', 'banned']).withMessage('Invalid status')],
  async (req, res) => {
    if (!validate(req, res)) return;

    const { id } = req.params;
    const { status } = req.body;

    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(error.code === 'PGRST116' ? 404 : 500).json({
          success: false,
          message: error.code === 'PGRST116' ? 'User not found' : error.message,
        });
      }

      return res.status(200).json({ success: true, message: `User status set to "${status}"`, data });
    } catch (err) {
      console.error('[admin PUT /users/:id/status]', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ===========================================================================
// PETS
// ===========================================================================

/**
 * GET /api/admin/pets
 */
router.get('/pets', async (req, res) => {
  try {
    const { species, adoption_status, shelter_id, search, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('pets')
      .select(
        `
        *,
        shelters ( id, name ),
        pet_images ( id, image_url, is_primary )
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (species && species.toLowerCase() !== 'dog') {
      return res.status(400).json({ success: false, message: 'Only dogs are available on this platform' });
    }
    query = query.eq('species', 'dog');
    if (adoption_status) query = query.eq('adoption_status', adoption_status);
    if (shelter_id) query = query.eq('shelter_id', shelter_id);
    if (search) {
      query = query.or(`name.ilike.%${search}%,breed.ilike.%${search}%`);
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
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit)),
      },
    });
  } catch (err) {
    console.error('[admin GET /pets]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /api/admin/pets
 */
router.post(
  '/pets',
  [
    body('name').trim().notEmpty().withMessage('Pet name is required'),
    body('species').equals('dog').withMessage('Only dogs can be listed'),
    body('shelter_id').optional({ values: 'falsy' }).isUUID(),
    body('age_years').optional().isInt({ min: 0, max: 100 }),
    body('age_months').optional().isInt({ min: 0, max: 11 }),
    body('adoption_fee').optional().isFloat({ min: 0 }).withMessage('Adoption fee must be a non-negative amount in rupees'),
    body('gender').optional({ values: 'falsy' }).isIn(['male', 'female']),
    body('size').optional({ values: 'falsy' }).isIn(['small', 'medium', 'large', 'extra_large']),
    body('primary_image')
      .optional({ values: 'falsy' })
      .isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage('Pet image must be an HTTP or HTTPS URL'),
    body('adoption_status')
      .optional()
      .isIn(['available', 'pending', 'adopted']),
    body('vaccination_status')
      .optional()
      .isBoolean()
      .toBoolean(),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;

    const {
      name, species, breed, age_years, age_months, gender, size, color,
      description, location, adoption_fee, adoption_status,
      vaccination_status, shelter_id, primary_image,
    } = req.body;

    try {
      const { data: pet, error } = await supabaseAdmin
        .from('pets')
        .insert({
          name,
          species,
          breed: breed || null,
          age_years: age_years !== undefined ? Number(age_years) : 0,
          age_months: age_months !== undefined ? Number(age_months) : 0,
          gender: gender || null,
          size: size || null,
          color: color || null,
          description: description || null,
          location: location || null,
          adoption_fee: adoption_fee !== undefined ? Number(adoption_fee) : 0,
          adoption_status: adoption_status || 'available',
          vaccination_status: vaccination_status === true || vaccination_status === 'true',
          shelter_id: shelter_id || null,
          primary_image: primary_image || null,
          is_listed: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ success: false, message: error.message });
      }

      return res.status(201).json({ success: true, message: 'Pet created', data: pet });
    } catch (err) {
      console.error('[admin POST /pets]', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

/**
 * PUT /api/admin/pets/:id
 */
router.put('/pets/:id', [
  body('adoption_fee').optional().isFloat({ min: 0 }).withMessage('Adoption fee must be a non-negative amount in rupees'),
  body('name').optional().trim().isLength({ min: 1, max: 120 }),
  body('age_years').optional().isInt({ min: 0, max: 100 }),
  body('age_months').optional().isInt({ min: 0, max: 11 }),
  body('gender').optional().isIn(['male', 'female']),
  body('size').optional().isIn(['small', 'medium', 'large', 'extra_large']),
  body('primary_image')
    .optional({ values: 'falsy' })
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Pet image must be an HTTP or HTTPS URL'),
  body('adoption_status').optional().isIn(['available', 'pending', 'adopted']),
  body('vaccination_status').optional().isBoolean().toBoolean(),
  body('is_listed').optional().isBoolean().toBoolean(),
], async (req, res) => {
  if (!validate(req, res)) return;

  const allowedFields = [
    'name', 'species', 'breed', 'age_years', 'age_months', 'gender', 'size', 'color',
    'description', 'location', 'adoption_fee', 'adoption_status',
    'vaccination_status', 'shelter_id', 'primary_image', 'is_listed',
  ];

  const updates = {};
  allowedFields.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  if (updates.adoption_fee !== undefined) updates.adoption_fee = Number(updates.adoption_fee);
  if (updates.age_years !== undefined) updates.age_years = Number(updates.age_years);
  if (updates.age_months !== undefined) updates.age_months = Number(updates.age_months);
  if (updates.vaccination_status !== undefined) updates.vaccination_status = updates.vaccination_status === true || updates.vaccination_status === 'true';
  if (updates.is_listed !== undefined) updates.is_listed = updates.is_listed === true || updates.is_listed === 'true';

  if (updates.species !== undefined && updates.species !== 'dog') {
    return res.status(400).json({ success: false, message: 'Only dogs can be listed' });
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ success: false, message: 'No fields to update' });
  }
  updates.updated_at = new Date().toISOString();

  try {
    const { data: pet, error } = await supabaseAdmin
      .from('pets')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      return res.status(error.code === 'PGRST116' ? 404 : 500).json({
        success: false,
        message: error.code === 'PGRST116' ? 'Pet not found' : error.message,
      });
    }

    return res.status(200).json({ success: true, message: 'Pet updated', data: pet });
  } catch (err) {
    console.error('[admin PUT /pets/:id]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/pets/:id
 */
router.delete('/pets/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('pets')
      .update({ is_listed: false, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('id')
      .single();

    if (error) {
      return res.status(error.code === 'PGRST116' ? 404 : 500).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, message: 'Pet listing archived', data });
  } catch (err) {
    console.error('[admin DELETE /pets/:id]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ===========================================================================
// VACCINATION RECORDS
// ===========================================================================

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const isValidDateOnly = value => DATE_ONLY_PATTERN.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

router.get('/vaccinations', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('vaccination_records')
      .select('*, pets ( id, name, breed )')
      .order('vaccination_date', { ascending: false })
      .limit(200);
    if (error) {
      console.error('[admin GET /vaccinations]', error);
      return res.status(500).json({ success: false, message: 'Vaccination records could not be loaded.' });
    }
    return res.status(200).json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[admin GET /vaccinations]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post(
  '/vaccinations',
  [
    body('pet_id').isUUID().withMessage('Choose a valid pet'),
    body('vaccine_name').trim().isLength({ min: 1, max: 160 }).withMessage('Vaccine name is required'),
    body('vaccination_date').matches(DATE_ONLY_PATTERN).custom(isValidDateOnly).withMessage('Enter a valid vaccination date'),
    body('next_due_date').optional({ values: 'falsy' }).matches(DATE_ONLY_PATTERN).custom(isValidDateOnly).withMessage('Enter a valid next due date'),
    body('administered_by').optional({ values: 'falsy' }).trim().isLength({ max: 160 }),
    body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;
    if (req.body.next_due_date && req.body.next_due_date < req.body.vaccination_date) {
      return res.status(400).json({ success: false, message: 'Next due date must not be earlier than the vaccination date.' });
    }
    try {
      const { data: pet, error: petError } = await supabaseAdmin
        .from('pets')
        .select('id')
        .eq('id', req.body.pet_id)
        .maybeSingle();
      if (petError) {
        console.error('[admin POST /vaccinations] Pet lookup failed:', petError);
        return res.status(500).json({ success: false, message: 'Could not verify the selected pet.' });
      }
      if (!pet) return res.status(404).json({ success: false, message: 'Pet not found.' });

      const { data, error } = await supabaseAdmin
        .from('vaccination_records')
        .insert({
          pet_id: req.body.pet_id,
          vaccine_name: req.body.vaccine_name.trim(),
          vaccination_date: req.body.vaccination_date,
          next_due_date: req.body.next_due_date || null,
          administered_by: req.body.administered_by?.trim() || null,
          notes: req.body.notes?.trim() || null,
        })
        .select()
        .single();
      if (error) {
        console.error('[admin POST /vaccinations] Insert failed:', error);
        return res.status(500).json({ success: false, message: 'Vaccination record could not be saved.' });
      }
      return res.status(201).json({ success: true, message: 'Vaccination record created.', data });
    } catch (err) {
      console.error('[admin POST /vaccinations]', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

router.put(
  '/vaccinations/:id',
  [
    body('vaccine_name').optional().trim().isLength({ min: 1, max: 160 }),
    body('vaccination_date').optional().matches(DATE_ONLY_PATTERN).custom(isValidDateOnly),
    body('next_due_date').optional({ values: 'falsy' }).matches(DATE_ONLY_PATTERN).custom(isValidDateOnly),
    body('administered_by').optional({ values: 'falsy' }).trim().isLength({ max: 160 }),
    body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;
    const allowed = ['vaccine_name', 'vaccination_date', 'next_due_date', 'administered_by', 'notes'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key] || null;
    }
    if (!Object.keys(updates).length) {
      return res.status(400).json({ success: false, message: 'Provide at least one field to update.' });
    }
    if (updates.vaccine_name !== undefined) updates.vaccine_name = updates.vaccine_name?.trim();
    if (updates.administered_by) updates.administered_by = updates.administered_by.trim();
    if (updates.notes) updates.notes = updates.notes.trim();

    try {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from('vaccination_records')
        .select('id, vaccination_date, next_due_date')
        .eq('id', req.params.id)
        .maybeSingle();
      if (existingError) {
        console.error('[admin PUT /vaccinations/:id] Lookup failed:', existingError);
        return res.status(500).json({ success: false, message: 'Could not load vaccination record.' });
      }
      if (!existing) return res.status(404).json({ success: false, message: 'Vaccination record not found.' });
      const vaccinationDate = updates.vaccination_date || existing.vaccination_date;
      const nextDueDate = updates.next_due_date !== undefined ? updates.next_due_date : existing.next_due_date;
      if (nextDueDate && nextDueDate < vaccinationDate) {
        return res.status(400).json({ success: false, message: 'Next due date must not be earlier than the vaccination date.' });
      }

      const { data, error } = await supabaseAdmin
        .from('vaccination_records')
        .update(updates)
        .eq('id', req.params.id)
        .select()
        .maybeSingle();
      if (error) {
        console.error('[admin PUT /vaccinations/:id] Update failed:', error);
        return res.status(500).json({ success: false, message: 'Vaccination record could not be updated.' });
      }
      if (!data) return res.status(404).json({ success: false, message: 'Vaccination record not found.' });
      return res.status(200).json({ success: true, message: 'Vaccination record updated.', data });
    } catch (err) {
      console.error('[admin PUT /vaccinations/:id]', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ===========================================================================
// SHELTERS
// ===========================================================================

/**
 * GET /api/admin/shelters
 */
router.get('/shelters', async (req, res) => {
  try {
    const { is_verified, search, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('shelters')
      .select('*, is_verified:verified', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (is_verified !== undefined) query = query.eq('verified', is_verified === 'true');
    if (search) query = query.or(`name.ilike.%${search}%,location.ilike.%${search}%`);

    const { data, error, count } = await query;

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      pagination: { total: count, page: Number(page), limit: Number(limit), totalPages: Math.ceil(count / Number(limit)) },
    });
  } catch (err) {
    console.error('[admin GET /shelters]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /api/admin/shelters
 */
router.post(
  '/shelters',
  [
    body('name').trim().notEmpty().withMessage('Shelter name is required'),
    body('location').trim().notEmpty().withMessage('Location is required'),
    body('email').optional().isEmail(),
    body('phone').optional().trim(),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;

    const { name, location, email, phone, website, description, logo_url, address } = req.body;

    try {
      const { data: shelter, error } = await supabaseAdmin
        .from('shelters')
        .insert({
          name,
          location,
          address: address || location,
          email: email || null,
          phone: phone || null,
          website: website || null,
          description: description || null,
          image: logo_url || null,
          verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('*, is_verified:verified')
        .single();

      if (error) {
        return res.status(500).json({ success: false, message: error.message });
      }

      return res.status(201).json({ success: true, message: 'Shelter created', data: shelter });
    } catch (err) {
      console.error('[admin POST /shelters]', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

/**
 * PUT /api/admin/shelters/:id
 */
router.put('/shelters/:id', async (req, res) => {
  const fieldMap = {
    name: 'name',
    location: 'location',
    address: 'address',
    email: 'email',
    phone: 'phone',
    website: 'website',
    description: 'description',
    logo_url: 'image',
  };
  const updates = {};
  Object.entries(fieldMap).forEach(([field, column]) => {
    if (req.body[field] !== undefined) updates[column] = req.body[field];
  });

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ success: false, message: 'No fields to update' });
  }
  updates.updated_at = new Date().toISOString();

  try {
    const { data, error } = await supabaseAdmin
      .from('shelters')
      .update(updates)
      .eq('id', req.params.id)
      .select('*, is_verified:verified')
      .single();

    if (error) {
      return res.status(error.code === 'PGRST116' ? 404 : 500).json({
        success: false,
        message: error.code === 'PGRST116' ? 'Shelter not found' : error.message,
      });
    }

    return res.status(200).json({ success: true, message: 'Shelter updated', data });
  } catch (err) {
    console.error('[admin PUT /shelters/:id]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * PUT /api/admin/shelters/:id/verify
 */
router.put('/shelters/:id/verify', async (req, res) => {
  const { is_verified = true } = req.body;
  const verified = is_verified === true || is_verified === 'true';

  try {
    const { data, error } = await supabaseAdmin
      .from('shelters')
      .update({ verified, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('*, is_verified:verified')
      .single();

    if (error) {
      return res.status(error.code === 'PGRST116' ? 404 : 500).json({
        success: false,
        message: error.code === 'PGRST116' ? 'Shelter not found' : error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Shelter ${verified ? 'verified' : 'unverified'}`,
      data,
    });
  } catch (err) {
    console.error('[admin PUT /shelters/:id/verify]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/shelters/:id
 */
router.delete('/shelters/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from('shelters').delete().eq('id', req.params.id);

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, message: 'Shelter deleted' });
  } catch (err) {
    console.error('[admin DELETE /shelters/:id]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ===========================================================================
// ADOPTION APPLICATIONS
// ===========================================================================

const ADOPTION_STATUSES = ['pending', 'under_review', 'reviewing', 'approved', 'rejected', 'cancelled'];
const DATABASE_ADOPTION_STATUSES = { reviewing: 'under_review' };

/**
 * GET /api/admin/applications
 */
router.get('/applications', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('adoption_applications')
      .select(
        `
        *,
        created_at:application_date,
        users ( id, full_name:name, email, phone ),
        pets ( id, name, species, breed, shelters ( id, name ) )
      `,
        { count: 'exact' }
      )
      .order('application_date', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (status && ADOPTION_STATUSES.includes(status)) {
      query = query.eq('status', DATABASE_ADOPTION_STATUSES[status] || status);
    }

    const { data, error, count } = await query;

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      pagination: { total: count, page: Number(page), limit: Number(limit), totalPages: Math.ceil(count / Number(limit)) },
    });
  } catch (err) {
    console.error('[admin GET /applications]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * PUT /api/admin/applications/:id/status
 */
router.put(
  '/applications/:id/status',
  [body('status').isIn(ADOPTION_STATUSES).withMessage('Invalid status')],
  async (req, res) => {
    if (!validate(req, res)) return;

    const { id } = req.params;
    const { status: requestedStatus, admin_notes } = req.body;
    const status = DATABASE_ADOPTION_STATUSES[requestedStatus] || requestedStatus;

    try {
      const { data: app, error: fetchErr } = await supabaseAdmin
        .from('adoption_applications')
        .select('id, user_id, pet_id, pets(name)')
        .eq('id', id)
        .single();

      if (fetchErr || !app) {
        return res.status(404).json({ success: false, message: 'Application not found' });
      }

      const { data: updated, error } = await supabaseAdmin
        .from('adoption_applications')
        .update({ status, admin_notes: admin_notes || null, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) return res.status(500).json({ success: false, message: error.message });

      if (status === 'approved') {
        await supabaseAdmin
          .from('pets')
          .update({ adoption_status: 'adopted', updated_at: new Date().toISOString() })
          .eq('id', app.pet_id);
      }

      // Notify user
      const msgs = {
        under_review: `Your application for ${app.pets?.name} is under review.`,
        approved: `Your adoption of ${app.pets?.name} has been approved!`,
        rejected: `Your application for ${app.pets?.name} was not approved.`,
        cancelled: `Your application for ${app.pets?.name} has been cancelled.`,
      };
      if (msgs[status]) {
        await supabaseAdmin.from('notifications').insert({
          user_id: app.user_id,
          title: `Application ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: msgs[status],
          type: 'info',
          related_type: 'adoption',
          related_id: id,
          created_at: new Date().toISOString(),
        });
      }

      return res.status(200).json({ success: true, message: `Status updated to "${status}"`, data: updated });
    } catch (err) {
      console.error('[admin PUT /applications/:id/status]', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ===========================================================================
// APPOINTMENTS
// ===========================================================================

const APPOINTMENT_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];

/**
 * GET /api/admin/appointments
 */
router.get('/appointments', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('appointments')
      .select(
        `
        *,
        users ( id, full_name:name, email, phone ),
        pets ( id, name, species ),
        shelters ( id, name, location )
      `,
        { count: 'exact' }
      )
      .order('appointment_date', { ascending: true })
      .range(offset, offset + Number(limit) - 1);

    if (status && APPOINTMENT_STATUSES.includes(status)) query = query.eq('status', status);

    const { data, error, count } = await query;

    if (error) return res.status(500).json({ success: false, message: error.message });

    return res.status(200).json({
      success: true,
      data: data || [],
      pagination: { total: count, page: Number(page), limit: Number(limit), totalPages: Math.ceil(count / Number(limit)) },
    });
  } catch (err) {
    console.error('[admin GET /appointments]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * PUT /api/admin/appointments/:id/status
 */
router.put(
  '/appointments/:id/status',
  [body('status').isIn(APPOINTMENT_STATUSES).withMessage('Invalid status')],
  async (req, res) => {
    if (!validate(req, res)) return;

    const { id } = req.params;
    const { status, admin_notes } = req.body;

    try {
      const { data: appt, error: fetchErr } = await supabaseAdmin
        .from('appointments')
        .select('id, user_id, pet_name, clinic_name, pets(name), shelters(name)')
        .eq('id', id)
        .single();

      if (fetchErr || !appt) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }

      const { data: updated, error } = await supabaseAdmin
        .from('appointments')
        .update({ status, admin_notes: admin_notes || null, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) return res.status(500).json({ success: false, message: error.message });

      const statusLabels = { confirmed: 'confirmed', completed: 'completed', cancelled: 'cancelled', no_show: 'marked as no-show' };
      if (statusLabels[status]) {
        await supabaseAdmin.from('notifications').insert({
          user_id: appt.user_id,
          title: `Appointment ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: `Your appointment with ${appt.pets?.name || appt.pet_name || 'your pet'} at ${appt.shelters?.name || appt.clinic_name || 'the shelter'} has been ${statusLabels[status]}.`,
          type: 'info',
          related_type: 'appointment',
          related_id: id,
          created_at: new Date().toISOString(),
        });
      }

      return res.status(200).json({ success: true, message: `Status updated to "${status}"`, data: updated });
    } catch (err) {
      console.error('[admin PUT /appointments/:id/status]', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ===========================================================================
// REVIEWS
// ===========================================================================

/**
 * GET /api/admin/reviews
 */
router.get('/reviews', async (req, res) => {
  try {
    const { shelter_id, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('reviews')
      .select(
        `
        *,
        users ( id, full_name:name, email ),
        shelters ( id, name )
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (shelter_id) query = query.eq('shelter_id', shelter_id);

    const { data, error, count } = await query;

    if (error) return res.status(500).json({ success: false, message: error.message });

    return res.status(200).json({
      success: true,
      data: data || [],
      pagination: { total: count, page: Number(page), limit: Number(limit), totalPages: Math.ceil(count / Number(limit)) },
    });
  } catch (err) {
    console.error('[admin GET /reviews]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/reviews/:id
 */
router.delete('/reviews/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from('reviews').delete().eq('id', req.params.id);

    if (error) return res.status(500).json({ success: false, message: error.message });

    return res.status(200).json({ success: true, message: 'Review deleted' });
  } catch (err) {
    console.error('[admin DELETE /reviews/:id]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ===========================================================================
// VIDEOS (admin CRUD – public read is in routes/videos.js)
// ===========================================================================

/**
 * POST /api/admin/videos
 */
router.post(
  '/videos',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('youtube_url').isURL({ protocols: ['https'], require_protocol: true }).custom(value => {
      const host = new URL(value).hostname;
      if (!['youtube.com', 'www.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
        throw new Error('Video URL must be a YouTube URL.');
      }
      return true;
    }).withMessage('A valid HTTPS YouTube URL is required'),
    body('youtube_id').trim().matches(/^[A-Za-z0-9_-]{6,20}$/).withMessage('A valid YouTube video ID is required'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('thumbnail_url').optional().isURL({ protocols: ['https'], require_protocol: true }),
    body('duration').optional().trim().isLength({ max: 20 }),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;

    const { title, youtube_url, youtube_id, category, description, thumbnail_url, duration } = req.body;

    try {
      const { data: video, error } = await supabaseAdmin
        .from('videos')
        .insert({
          title, youtube_url, youtube_id, category,
          description: description || null,
          thumbnail_url: thumbnail_url || null,
          duration: duration || null,
        })
        .select()
        .single();

      if (error) return res.status(500).json({ success: false, message: error.message });

      return res.status(201).json({ success: true, message: 'Video created', data: video });
    } catch (err) {
      console.error('[admin POST /videos]', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

/**
 * PUT /api/admin/videos/:id
 */
router.put('/videos/:id', [
  body('title').optional().trim().notEmpty(),
  body('youtube_url').optional().isURL({ protocols: ['https'], require_protocol: true }).custom(value => {
    const host = new URL(value).hostname;
    if (!['youtube.com', 'www.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
      throw new Error('Video URL must be a YouTube URL.');
    }
    return true;
  }),
  body('youtube_id').optional().trim().matches(/^[A-Za-z0-9_-]{6,20}$/),
  body('category').optional().trim().notEmpty(),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('thumbnail_url').optional().isURL({ protocols: ['https'], require_protocol: true }),
  body('duration').optional().trim().isLength({ max: 20 }),
], async (req, res) => {
  if (!validate(req, res)) return;
  const allowed = ['title', 'youtube_url', 'youtube_id', 'category', 'description', 'thumbnail_url', 'duration'];
  const updates = {};
  allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ success: false, message: 'No fields to update' });
  }
  try {
    const { data, error } = await supabaseAdmin
      .from('videos')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      return res.status(error.code === 'PGRST116' ? 404 : 500).json({
        success: false,
        message: error.code === 'PGRST116' ? 'Video not found' : error.message,
      });
    }

    return res.status(200).json({ success: true, message: 'Video updated', data });
  } catch (err) {
    console.error('[admin PUT /videos/:id]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/videos/:id
 */
router.delete('/videos/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from('videos').delete().eq('id', req.params.id);

    if (error) return res.status(500).json({ success: false, message: error.message });

    return res.status(200).json({ success: true, message: 'Video deleted' });
  } catch (err) {
    console.error('[admin DELETE /videos/:id]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ===========================================================================
// NOTIFICATIONS – send to user(s)
// ===========================================================================

/**
 * POST /api/admin/notifications/send
 * Body: { user_ids: string[] | 'all', title, message, type?, related_type?, related_id? }
 */
router.post(
  '/notifications/send',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
    body('user_ids').notEmpty().withMessage('user_ids is required (array or "all")'),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;

    const {
      user_ids,
      title,
      message,
      type: requestedType = 'info',
      related_type,
      related_id,
      reference_id,
    } = req.body;
    const type = requestedType === 'system' ? 'info' : requestedType;

    if (!['info', 'success', 'warning', 'error'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid notification type' });
    }

    try {
      let targetIds = [];

      if (user_ids === 'all') {
        const { data: users, error: usersErr } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('status', 'active');

        if (usersErr) {
          return res.status(500).json({ success: false, message: usersErr.message });
        }
        targetIds = (users || []).map((u) => u.id);
      } else if (Array.isArray(user_ids)) {
        targetIds = user_ids;
      } else {
        return res.status(400).json({
          success: false,
          message: 'user_ids must be an array of IDs or the string "all"',
        });
      }

      if (targetIds.length === 0) {
        return res.status(400).json({ success: false, message: 'No target users found' });
      }

      const now = new Date().toISOString();
      const notifications = targetIds.map((user_id) => ({
        user_id,
        title,
        message,
        type,
        related_type: related_type || null,
        related_id: related_id || reference_id || null,
        is_read: false,
        created_at: now,
      }));

      // Insert in batches of 500 to avoid payload limits
      const BATCH_SIZE = 500;
      for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
        const batch = notifications.slice(i, i + BATCH_SIZE);
        const { error } = await supabaseAdmin.from('notifications').insert(batch);
        if (error) {
          console.error('[admin POST /notifications/send] Batch error:', error.message);
          return res.status(500).json({ success: false, message: 'Failed to send notifications' });
        }
      }

      return res.status(200).json({
        success: true,
        message: `Notification sent to ${targetIds.length} user(s)`,
        recipients: targetIds.length,
      });
    } catch (err) {
      console.error('[admin POST /notifications/send]', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

module.exports = router;
