/**
 * middleware/auth.js
 * Express middleware for Supabase JWT authentication.
 *
 * Exported middleware:
 *   authenticateUser – requires a valid Bearer token; attaches user to req.user
 *   requireAdmin     – must run AFTER authenticateUser; rejects non-admins
 *   optionalAuth     – attaches user if a valid token is present, otherwise continues
 */

const { supabaseAdmin, hasServiceRoleKey } = require('../config/supabase');

// ---------------------------------------------------------------------------
// Helper: extract and verify the Bearer JWT from the Authorization header
// ---------------------------------------------------------------------------
async function verifyToken(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'No token provided' };
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return { user: null, error: 'Malformed authorization header' };
  }

  try {
    // Verify the JWT against Supabase
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data?.user) {
      return { user: null, error: error?.message || 'Invalid token' };
    }

    // Fetch extended profile from the public users table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('[auth] Profile fetch error:', profileError.message);
      return { user: null, error: 'Unable to verify account status', status: 503 };
    }

    if (!profile || profile.status !== 'active') {
      return { user: null, error: 'This account is unavailable. Contact support.', status: 403 };
    }

    return {
      user: {
        ...data.user,
        profile,
        role: profile.role,
      },
      token,
      error: null,
    };
  } catch (err) {
    return { user: null, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// authenticateUser
// Rejects requests that do not carry a valid Bearer token.
// ---------------------------------------------------------------------------
async function authenticateUser(req, res, next) {
  const { user, token, error, status } = await verifyToken(req);

  if (error || !user) {
    return res.status(status || 401).json({
      success: false,
      message: error || 'Authentication required',
    });
  }

  req.user = user;
  req.token = token;
  next();
}

// ---------------------------------------------------------------------------
// requireAdmin
// Must be chained AFTER authenticateUser.
// Rejects users whose role is not 'admin'.
// ---------------------------------------------------------------------------
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (req.user.role !== 'admin' || req.user.profile?.status !== 'active') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }

  next();
}

function requireServiceRole(req, res, next) {
  if (!hasServiceRoleKey) {
    return res.status(503).json({
      success: false,
      message: 'This data operation is unavailable until SUPABASE_SERVICE_ROLE_KEY is configured on the server.',
    });
  }

  next();
}

// ---------------------------------------------------------------------------
// optionalAuth
// Tries to authenticate; continues regardless of outcome.
// req.user will be null for unauthenticated requests.
// ---------------------------------------------------------------------------
async function optionalAuth(req, res, next) {
  const { user, token } = await verifyToken(req);
  req.user = user || null;
  req.token = token || null;
  next();
}

module.exports = { authenticateUser, requireAdmin, requireServiceRole, optionalAuth };
