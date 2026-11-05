/**
 * routes/adoptions.js
 * Adoption application endpoints for users and admins.
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateUser, requireAdmin, requireServiceRole } = require('../middleware/auth');

const router = express.Router();

const VALID_STATUSES = ['pending', 'under_review', 'reviewing', 'approved', 'rejected', 'cancelled'];
const DATABASE_STATUSES = { reviewing: 'under_review' };

// ---------------------------------------------------------------------------
// POST /api/adoptions
// Submit a new adoption application (authenticated).
// ---------------------------------------------------------------------------
router.post(
  '/',
  authenticateUser,
  requireServiceRole,
  [
    body('pet_id').isUUID().withMessage('A valid pet_id is required'),
    body('message').optional().trim().isLength({ max: 2000 }),
    body('living_situation')
      .optional()
      .trim()
      .isLength({ max: 500 }),
    body('has_other_pets').optional().isBoolean().toBoolean(),
    body('has_children').optional().isBoolean().toBoolean(),
    body('experience_with_pets')
      .trim()
      .notEmpty()
      .withMessage('Pet experience is required')
      .isLength({ max: 1000 }),
    body('reason')
      .trim()
      .isLength({ min: 50, max: 2000 })
      .withMessage('Reason for adoption must be between 50 and 2000 characters'),
    body('full_name').trim().isLength({ min: 2, max: 120 }).withMessage('A valid full name is required'),
    body('email').optional().isEmail(),
    body('phone').trim().isLength({ min: 7, max: 20 }).withMessage('A valid phone number is required'),
    body('address').trim().isLength({ min: 10, max: 500 }).withMessage('A valid address is required'),
    body('home_type').optional().isIn([
      'apartment',
      'house_with_yard',
      'house_without_yard',
      'farm',
      'other',
    ]),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      pet_id,
      message,
      living_situation,
      has_other_pets,
      has_children,
      experience_with_pets,
      full_name,
      email,
      phone,
      address,
      reason,
      home_type,
    } = req.body;
    const user_id = req.user.id;

    try {
      // Verify pet exists and is available
      const { data: pet, error: petError } = await supabaseAdmin
        .from('pets')
        .select('id, name, species, adoption_status, shelter_id, is_listed')
        .eq('id', pet_id)
        .single();

      if (petError) {
        if (petError.code === 'PGRST116') {
          return res.status(404).json({ success: false, message: 'Pet not found' });
        }
        console.error('[adoptions POST /] Pet query failed:', petError);
        return res.status(500).json({ success: false, message: 'Could not verify pet listing status' });
      }

      if (!pet || pet.is_listed === false) {
        return res.status(404).json({ success: false, message: 'Pet not found' });
      }

      if (pet.species !== 'dog') {
        return res.status(400).json({ success: false, message: 'Only dogs are available for adoption' });
      }

      if (pet.adoption_status !== 'available') {
        return res.status(400).json({
          success: false,
          message: `This pet is not available for adoption (status: ${pet.adoption_status})`,
        });
      }

      // Check for existing pending/reviewing application for the same pet
      const { data: duplicate, error: duplicateError } = await supabaseAdmin
        .from('adoption_applications')
        .select('id')
        .eq('user_id', user_id)
        .eq('pet_id', pet_id)
        .in('status', ['pending', 'under_review'])
        .maybeSingle();

      if (duplicateError) {
        console.error('[adoptions POST /] Duplicate application check failed:', duplicateError);
        return res.status(500).json({ success: false, message: 'Could not verify existing applications' });
      }

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'You already have an active application for this pet',
        });
      }

      const applicant = req.user.profile || {};
      const applicationReason = reason || message || 'No additional message provided.';
      const applicantDetails = {
        full_name: full_name || applicant.name || req.user.user_metadata?.full_name || req.user.email || 'PetCare user',
        email: req.user.email || email || '',
        phone: phone || applicant.phone || '',
        address: address || applicant.address || '',
      };

      if (!applicantDetails.phone || !applicantDetails.address) {
        return res.status(400).json({
          success: false,
          message: 'Phone and address are required. Add them to your profile or include them with the application.',
        });
      }

      const { data: application, error } = await supabaseAdmin
        .from('adoption_applications')
        .insert({
          user_id,
          pet_id,
          ...applicantDetails,
          reason: applicationReason,
          home_type: home_type || null,
          pet_experience: experience_with_pets || null,
          living_situation: living_situation || null,
          status: 'pending',
          has_other_pets: has_other_pets ?? null,
          has_children: has_children ?? null,
          updated_at: new Date().toISOString(),
        })
        .select(
          `
          *,
          created_at:application_date,
          pets (
            id, name, species, breed,
            pet_images ( image_url, is_primary ),
            shelters ( id, name )
          )
        `
        )
        .single();

      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({
            success: false,
            message: 'You already have an active application for this pet',
          });
        }
        return res.status(500).json({ success: false, message: error.message });
      }

      // Create notification for the user
      await supabaseAdmin.from('notifications').insert({
        user_id,
        title: 'Application Submitted',
        message: `Your adoption application for ${pet.name} has been submitted and is under review.`,
        type: 'info',
        related_type: 'adoption',
        related_id: application.id,
        created_at: new Date().toISOString(),
      });

      return res.status(201).json({
        success: true,
        message: 'Application submitted successfully',
        data: application,
      });
    } catch (err) {
      console.error('[adoptions POST /]', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/adoptions
// Get the authenticated user's applications.
// ---------------------------------------------------------------------------
router.get('/', authenticateUser, requireServiceRole, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('adoption_applications')
      .select(
        `
        *,
        created_at:application_date,
        pets (
          id, name, species, breed,
          pet_images ( image_url, is_primary ),
          shelters ( id, name, location )
        )
      `,
        { count: 'exact' }
      )
      .eq('user_id', req.user.id)
      .order('application_date', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (status && VALID_STATUSES.includes(status)) {
      query = query.eq('status', DATABASE_STATUSES[status] || status);
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
    console.error('[adoptions GET /]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/adoptions/all   (Admin)
// Get all applications across all users.
// ---------------------------------------------------------------------------
router.get('/all', authenticateUser, requireAdmin, requireServiceRole, async (req, res) => {
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
        pets (
          id, name, species, breed,
          pet_images ( image_url, is_primary ),
          shelters ( id, name, location )
        )
      `,
        { count: 'exact' }
      )
      .order('application_date', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (status && VALID_STATUSES.includes(status)) {
      query = query.eq('status', DATABASE_STATUSES[status] || status);
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
    console.error('[adoptions GET /all]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/adoptions/:id
// Get a single application (owner or admin).
// ---------------------------------------------------------------------------
router.get('/:id', authenticateUser, requireServiceRole, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: application, error } = await supabaseAdmin
      .from('adoption_applications')
      .select(
        `
        *,
        created_at:application_date,
        users ( id, full_name:name, email, phone, address ),
        pets (
          *,
          shelters ( id, name, location, phone ),
          pet_images ( id, image_url, is_primary )
        )
      `
      )
      .eq('id', id)
      .single();

    if (error || !application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Allow only owner or admin
    if (application.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.status(200).json({ success: true, data: application });
  } catch (err) {
    console.error('[adoptions GET /:id]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/adoptions/:id/status   (Admin)
// Update the status of an adoption application.
// ---------------------------------------------------------------------------
router.put(
  '/:id/status',
  authenticateUser,
  requireAdmin,
  requireServiceRole,
  [
    body('status').isIn(VALID_STATUSES).withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),
    body('admin_notes').optional().trim().isLength({ max: 1000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { status: requestedStatus, admin_notes } = req.body;
    const status = DATABASE_STATUSES[requestedStatus] || requestedStatus;

    try {
      const { data: application, error: fetchError } = await supabaseAdmin
        .from('adoption_applications')
        .select('id, user_id, pet_id, status, pets(name)')
        .eq('id', id)
        .single();

      if (fetchError || !application) {
        return res.status(404).json({ success: false, message: 'Application not found' });
      }

      const { data: updated, error } = await supabaseAdmin
        .from('adoption_applications')
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

      // If approved, update pet adoption status
      if (status === 'approved') {
        await supabaseAdmin
          .from('pets')
          .update({ adoption_status: 'adopted', updated_at: new Date().toISOString() })
          .eq('id', application.pet_id);
      }

      // Notify the applicant
      const petName = application.pets?.name || 'your selected pet';
      const notificationMessages = {
        under_review: `Your adoption application for ${petName} is now being reviewed.`,
        approved: `Congratulations! Your adoption application for ${petName} has been approved!`,
        rejected: `We're sorry, your adoption application for ${petName} was not approved.`,
        cancelled: `Your adoption application for ${petName} has been cancelled.`,
      };

      if (notificationMessages[status]) {
        await supabaseAdmin.from('notifications').insert({
          user_id: application.user_id,
          title: `Application ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: notificationMessages[status],
          type: 'info',
          related_type: 'adoption',
          related_id: id,
          created_at: new Date().toISOString(),
        });
      }

      return res.status(200).json({
        success: true,
        message: `Application status updated to "${status}"`,
        data: updated,
      });
    } catch (err) {
      console.error('[adoptions PUT /:id/status]', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

module.exports = router;
