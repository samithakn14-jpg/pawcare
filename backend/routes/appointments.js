/**
 * routes/appointments.js
 * Appointment booking and management endpoints.
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateUser, requireAdmin, requireServiceRole } = require('../middleware/auth');

const router = express.Router();

const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
const APPOINTMENT_TYPES = ['meet_greet', 'vet_visit', 'grooming', 'training', 'general'];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function isFutureLocalSlot(date, time, timezoneOffsetMinutes) {
  if (!DATE_PATTERN.test(date) || !TIME_PATTERN.test(time)) return false;
  const parsed = Number.isInteger(timezoneOffsetMinutes)
    ? new Date(Date.parse(`${date}T${time}:00Z`) + timezoneOffsetMinutes * 60_000)
    : new Date(`${date}T${time}:00`);
  return Number.isFinite(parsed.getTime()) && parsed > new Date();
}

function isValidDate(value) {
  return DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

// ---------------------------------------------------------------------------
// GET /api/appointments/providers
// Existing shelter partners may offer veterinary services. This does not
// imply that every shelter is a veterinary clinic or that a vet is assigned.
// ---------------------------------------------------------------------------
router.get('/providers', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('shelters')
      .select('id, name, description, address, location, phone, email, website, verified, opening_hours, services')
      .order('name', { ascending: true })
      .limit(100);

    if (error) {
      console.error('[appointments GET /providers]', error);
      return res.status(500).json({ success: false, message: 'Veterinary service providers could not be loaded.' });
    }

    const providers = (data || []).filter(provider =>
      (provider.services || []).some(service => /veterinar|vet(?:erinary)?\b|vaccin|animal health|clinic/i.test(service))
    );
    return res.status(200).json({ success: true, data: providers });
  } catch (err) {
    console.error('[appointments GET /providers]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/appointments
// Book a new appointment (authenticated).
// ---------------------------------------------------------------------------
router.post(
  '/',
  authenticateUser,
  requireServiceRole,
  [
    body('pet_id').isUUID().withMessage('Choose a valid pet'),
    body('shelter_id').isUUID().withMessage('Choose a valid clinic or shelter partner'),
    body('appointment_date').matches(DATE_PATTERN).withMessage('Choose a valid appointment date'),
    body('appointment_time').matches(TIME_PATTERN).withMessage('Choose a valid appointment time'),
    body('appointment_type')
      .isIn(APPOINTMENT_TYPES)
      .withMessage(`Type must be one of: ${APPOINTMENT_TYPES.join(', ')}`),
    body('timezone_offset_minutes').optional().isInt({ min: -840, max: 840 }).toInt(),
    body('reason').trim().isLength({ min: 3, max: 500 }).withMessage('Reason must be between 3 and 500 characters'),
    body('veterinarian').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
    body('notes').optional().trim().isLength({ max: 1000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      pet_id, shelter_id, appointment_date, appointment_time,
      appointment_type, reason, veterinarian, notes, timezone_offset_minutes,
    } = req.body;
    const user_id = req.user.id;

    try {
      // Ensure pet exists
      const { data: pet, error: petError } = await supabaseAdmin
        .from('pets')
        .select('id, name, species, is_listed')
        .eq('id', pet_id)
        .single();

      if (petError) {
        if (petError.code === 'PGRST116') {
          return res.status(404).json({ success: false, message: 'Pet not found' });
        }
        console.error('[appointments POST /] Pet query failed:', petError);
        return res.status(500).json({ success: false, message: 'Could not verify pet listing status.' });
      }

      if (!pet || pet.is_listed === false) {
        return res.status(404).json({ success: false, message: 'Pet not found' });
      }

      // Ensure shelter exists
      const { data: shelter, error: shelterError } = await supabaseAdmin
        .from('shelters')
        .select('id, name, services')
        .eq('id', shelter_id)
        .single();

      if (shelterError || !shelter) {
        return res.status(404).json({ success: false, message: 'Clinic or shelter partner not found' });
      }

      if (!(shelter.services || []).some(service => /veterinar|vet(?:erinary)?\b|vaccin|animal health|clinic/i.test(service))) {
        return res.status(400).json({ success: false, message: 'This partner does not list veterinary services.' });
      }

      const { data: profile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('name')
        .eq('id', user_id)
        .single();

      if (profileError || !profile) {
        return res.status(500).json({ success: false, message: 'Failed to load user profile' });
      }

      if (!isValidDate(appointment_date) || !isFutureLocalSlot(appointment_date, appointment_time, timezone_offset_minutes)) {
        return res.status(400).json({
          success: false,
          message: 'Choose a valid appointment date and a time in the future.',
        });
      }

      const { data: conflictingAppointments, error: conflictError } = await supabaseAdmin
        .from('appointments')
        .select('id')
        .eq('shelter_id', shelter_id)
        .eq('appointment_date', appointment_date)
        .eq('appointment_time', `${appointment_time}:00`)
        .in('status', ['pending', 'confirmed'])
        .limit(1);

      if (conflictError) {
        console.error('[appointments POST /] Conflict check failed:', conflictError);
        return res.status(500).json({ success: false, message: 'Could not verify appointment availability.' });
      }
      if (conflictingAppointments?.length) {
        return res.status(409).json({ success: false, message: 'That clinic already has an appointment at this time. Choose another slot.' });
      }

      const { data: appointment, error } = await supabaseAdmin
        .from('appointments')
        .insert({
          user_id,
          pet_id,
          shelter_id,
          appointment_type,
          pet_name: pet.name,
          pet_type: pet.species,
          owner_name: profile.name,
          veterinarian: veterinarian || null,
          clinic_name: shelter.name,
          appointment_date,
          appointment_time: `${appointment_time}:00`,
          reason: reason.trim(),
          notes: notes || null,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select(
          `
          *,
          pets ( id, name, species, breed ),
          shelters ( id, name, location, phone )
        `
        )
        .single();

      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({
            success: false,
            message: 'That clinic already has an appointment at this time. Choose another slot.',
          });
        }
        return res.status(500).json({ success: false, message: error.message });
      }

      // Notify the user
      await supabaseAdmin.from('notifications').insert({
        user_id,
        title: 'Appointment Booked',
        message: `Your ${appointment_type.replace(/_/g, ' ')} appointment for ${pet.name} at ${shelter.name} has been requested.`,
        type: 'info',
        related_type: 'appointment',
        related_id: appointment.id,
        created_at: new Date().toISOString(),
      });

      return res.status(201).json({
        success: true,
        message: 'Appointment booked successfully',
        data: appointment,
      });
    } catch (err) {
      console.error('[appointments POST /]', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/appointments/:id/cancel
// Users may cancel only their own future pending or confirmed appointments.
// ---------------------------------------------------------------------------
router.patch(
  '/:id/cancel',
  authenticateUser,
  requireServiceRole,
  [body('timezone_offset_minutes').optional().isInt({ min: -840, max: 840 }).toInt()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  try {
    const { data: appointment, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select('id, user_id, appointment_date, appointment_time, status')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (fetchError) {
      console.error('[appointments PATCH /:id/cancel] Lookup failed:', fetchError);
      return res.status(500).json({ success: false, message: 'Could not load appointment.' });
    }
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found.' });
    if (!['pending', 'confirmed'].includes(appointment.status)) {
      return res.status(409).json({ success: false, message: 'Only pending or confirmed appointments can be cancelled.' });
    }

    const time = String(appointment.appointment_time).slice(0, 5);
    if (!isFutureLocalSlot(appointment.appointment_date, time, req.body.timezone_offset_minutes)) {
      return res.status(409).json({ success: false, message: 'Past appointments cannot be cancelled.' });
    }

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', appointment.id)
      .eq('user_id', req.user.id)
      .in('status', ['pending', 'confirmed'])
      .select()
      .maybeSingle();

    if (error) {
      console.error('[appointments PATCH /:id/cancel] Update failed:', error);
      return res.status(500).json({ success: false, message: 'Appointment could not be cancelled.' });
    }
    if (!data) return res.status(409).json({ success: false, message: 'Appointment status changed; refresh and try again.' });

    return res.status(200).json({ success: true, message: 'Appointment cancelled.', data });
  } catch (err) {
    console.error('[appointments PATCH /:id/cancel]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
  }
);

// ---------------------------------------------------------------------------
// GET /api/appointments
// Get the authenticated user's appointments.
// ---------------------------------------------------------------------------
router.get('/', authenticateUser, requireServiceRole, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('appointments')
      .select(
        `
        *,
        pets ( id, name, species, breed, pet_images ( image_url, is_primary ) ),
        shelters ( id, name, location, phone )
      `,
        { count: 'exact' }
      )
      .eq('user_id', req.user.id)
      .order('appointment_date', { ascending: true })
      .range(offset, offset + Number(limit) - 1);

    if (status && VALID_STATUSES.includes(status)) {
      query = query.eq('status', status);
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
    console.error('[appointments GET /]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/appointments/all   (Admin)
// Get all appointments across all users.
// ---------------------------------------------------------------------------
router.get('/all', authenticateUser, requireAdmin, requireServiceRole, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('appointments')
      .select(
        `
        *,
        users ( id, full_name:name, email, phone ),
        pets ( id, name, species, breed ),
        shelters ( id, name, location )
      `,
        { count: 'exact' }
      )
      .order('appointment_date', { ascending: true })
      .range(offset, offset + Number(limit) - 1);

    if (status && VALID_STATUSES.includes(status)) {
      query = query.eq('status', status);
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
    console.error('[appointments GET /all]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/appointments/:id/status   (Admin)
// Update the status of an appointment.
// ---------------------------------------------------------------------------
router.put(
  '/:id/status',
  authenticateUser,
  requireAdmin,
  requireServiceRole,
  [
    body('status')
      .isIn(VALID_STATUSES)
      .withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),
    body('admin_notes').optional().trim().isLength({ max: 500 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { status, admin_notes } = req.body;

    try {
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('appointments')
        .select('id, user_id, appointment_type, pet_name, clinic_name, pets(name), shelters(name)')
        .eq('id', id)
        .single();

      if (fetchError || !existing) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }

      const { data: updated, error } = await supabaseAdmin
        .from('appointments')
        .update({
          status,
          admin_notes: admin_notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ success: false, message: error.message });
      }

      // Notify the user
      const statusLabels = {
        confirmed: 'confirmed',
        completed: 'completed',
        cancelled: 'cancelled',
        no_show: 'marked as no-show',
      };

      if (statusLabels[status]) {
        const petName = existing.pets?.name || existing.pet_name || 'your pet';
        const shelterName = existing.shelters?.name || existing.clinic_name || 'the shelter';
        await supabaseAdmin.from('notifications').insert({
          user_id: existing.user_id,
          title: `Appointment ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: `Your appointment with ${petName} at ${shelterName} has been ${statusLabels[status]}.`,
          type: 'info',
          related_type: 'appointment',
          related_id: id,
          created_at: new Date().toISOString(),
        });
      }

      return res.status(200).json({
        success: true,
        message: `Appointment status updated to "${status}"`,
        data: updated,
      });
    } catch (err) {
      console.error('[appointments PUT /:id/status]', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

module.exports = router;
