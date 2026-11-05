/**
 * routes/auth.js
 * Authentication routes – register, login, profile management.
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase, supabaseAdmin, createPublicAuthClient } = require('../config/supabase');
const { authenticateUser, requireServiceRole } = require('../middleware/auth');

const router = express.Router();

function withProfileAliases(profile) {
  return {
    ...profile,
    full_name: profile.name,
    avatar_url: profile.profile_image,
  };
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('full_name').trim().isLength({ min: 2, max: 120 }).withMessage('Full name must be between 2 and 120 characters'),
  body('phone').trim().notEmpty().withMessage('Phone number is required')
    .bail()
    .matches(/^[\d()+\s-]{10,18}$/).withMessage('Enter a valid phone number')
    .bail()
    .custom(value => {
      const digits = value.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 15;
    }).withMessage('Phone number must contain 10 to 15 digits'),
  body('address').optional().trim().isLength({ max: 500 }),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
];

function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
}

function validateAndRequireServiceRole(req, res, next) {
  if (handleValidationErrors(req, res)) return;
  return requireServiceRole(req, res, next);
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// Creates a Supabase auth user and inserts a profile row in `users`.
// ---------------------------------------------------------------------------
router.post('/register', registerValidation, validateAndRequireServiceRole, async (req, res) => {
  const { email, password, full_name, phone, address } = req.body;

  try {
    const authClient = createPublicAuthClient();
    const { data: authData, error: authError } = await authClient.auth.signUp({
        email,
        password,
        options: {
          data: { full_name, phone, address },
        },
      });

    if (authError) {
      return res.status(400).json({ success: false, message: authError.message });
    }

    if (!authData.user) {
      return res.status(400).json({ success: false, message: 'Registration failed. Please try again.' });
    }

    // Supabase returns a session when email confirmation is disabled.
    // Do not allow this configuration in production.
    if (process.env.NODE_ENV === 'production' && authData.session) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      if (deleteError) {
        console.error('[auth/register] Failed to remove unverified production account:', deleteError.message);
        return res.status(500).json({
          success: false,
          message: 'Email confirmation is required in production. Account cleanup failed; contact support.',
        });
      }

      return res.status(503).json({
        success: false,
        message: 'Registration is temporarily unavailable because email confirmation is disabled. Please contact support.',
      });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select()
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      if (deleteError) {
        console.error('[auth/register] Failed to remove account without a profile:', deleteError.message);
      }
      console.error('[auth/register] Failed to load trigger-created user profile:', profileError.message);
      return res
        .status(500)
        .json({ success: false, message: 'Failed to create user profile' });
    }

    return res.status(201).json({
      success: true,
      message: authData.session
        ? 'Registration successful'
        : 'Account created successfully! Please check your email to verify your account.',
      data: {
        user: withProfileAliases(profile),
        session: authData.session,
      },
    });
  } catch (err) {
    console.error('[auth/register]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// Authenticates with Supabase and returns the user profile.
// ---------------------------------------------------------------------------
router.post('/login', loginValidation, validateAndRequireServiceRole, async (req, res) => {
  const { email, password } = req.body;

  try {
    const authClient = createPublicAuthClient();
    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ success: false, message: error.message });
    }

    // Fetch full profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      return res
        .status(500)
        .json({ success: false, message: 'Failed to load user profile' });
    }

    if (profile.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'This account is unavailable. Contact support.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: withProfileAliases(profile),
        session: data.session,
      },
    });
  } catch (err) {
    console.error('[auth/login]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/profile
// Returns the authenticated user's profile.
// ---------------------------------------------------------------------------
router.get('/profile', authenticateUser, requireServiceRole, async (req, res) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    return res.status(200).json({ success: true, data: withProfileAliases(profile) });
  } catch (err) {
    console.error('[auth/profile GET]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/auth/profile
// Updates the authenticated user's profile fields.
// ---------------------------------------------------------------------------
router.put('/profile', authenticateUser, requireServiceRole, async (req, res) => {
  const fieldMap = {
    full_name: 'name',
    phone: 'phone',
    address: 'address',
    avatar_url: 'profile_image',
    bio: 'bio',
  };
  const updates = {};

  Object.entries(fieldMap).forEach(([field, column]) => {
    if (req.body[field] !== undefined) {
      updates[column] = req.body[field];
    }
  });

  if (Object.keys(updates).length === 0) {
    return res
      .status(400)
      .json({ success: false, message: 'No valid fields provided for update' });
  }

  updates.updated_at = new Date().toISOString();

  try {
    const { data: profile, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) {
      return res
        .status(500)
        .json({ success: false, message: 'Failed to update profile' });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated',
      data: withProfileAliases(profile),
    });
  } catch (err) {
    console.error('[auth/profile PUT]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/change-password
// Changes the authenticated user's password via Supabase admin API.
// ---------------------------------------------------------------------------
router.post(
  '/change-password',
  authenticateUser,
  requireServiceRole,
  [
    body('new_password')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    const { new_password } = req.body;

    try {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        req.user.id,
        { password: new_password }
      );

      if (error) {
        return res
          .status(400)
          .json({ success: false, message: error.message });
      }

      return res
        .status(200)
        .json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
      console.error('[auth/change-password]', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

module.exports = router;
