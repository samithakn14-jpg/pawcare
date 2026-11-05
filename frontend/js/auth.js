// ============================================================
// PetCare Connect - Authentication Module
// ============================================================
// Handles all user authentication: login, register, logout,
// session management, and navbar state updates.
//
// Depends on: config.js (must be loaded first)
// ============================================================

/**
 * Get the Supabase client from global config
 * @returns {object} Supabase client instance
 */
const getSupabase = () => window.PAWCARE_CONFIG?.supabase;

const getSafeRedirect = (candidate, fallback = 'dashboard.html') => {
    try {
        const target = new URL(candidate || fallback, window.location.origin);
        if (target.origin !== window.location.origin) return fallback;
        return `${target.pathname}${target.search}${target.hash}`;
    } catch (error) {
        console.warn('Invalid post-authentication redirect:', error);
        return fallback;
    }
};

const clearUserScopedBrowserData = () => {
    sessionStorage.removeItem('pawcare_user');
    sessionStorage.removeItem('pawcare_redirect_after_login');
    localStorage.removeItem('pawcare_saved_pets');
    localStorage.removeItem('pawcare_applications');
};

// ============================================================
// CORE AUTH FUNCTIONS
// ============================================================

/**
 * Initialize authentication state listener.
 * This runs on every page load and:
 * - Checks if user is logged in
 * - Updates the navbar accordingly
 * - Handles admin redirects
 */
const initAuth = async () => {
    const sb = getSupabase();
    if (!sb) {
        console.error('Authentication is unavailable because Supabase is not configured.');
        updateNavbar(null, null);
        return;
    }

    const applySession = async session => {
        if (session?.user) {
            updateNavbar(session.user, null);
            const profile = await getUserProfile(session.user.id);
            if (profile?.status !== 'active') {
                clearUserScopedBrowserData();
                const { error } = await sb.auth.signOut({ scope: 'local' });
                if (error) {
                    console.error('Unable to sign out an inactive account:', error);
                }
                return;
            }
            updateNavbar(session.user, profile);
            await updateNotificationBadge(session.user.id);

            if (profile?.role === 'admin' && window.location.pathname.includes('dashboard.html')) {
                window.location.href = 'admin/index.html';
            }
        } else {
            updateNavbar(null, null);
        }
    };

    sb.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION') return;
        updateNavbar(session?.user || null, null);
        if (event === 'SIGNED_OUT') {
            clearUserScopedBrowserData();
            if (window.location.pathname.includes('dashboard.html')) {
                window.location.href = 'login.html';
                return;
            }
        }

        // Supabase auth callbacks run while its internal lock is held. Defer
        // profile/database requests until the callback has returned.
        window.setTimeout(() => {
            void applySession(session).catch(error => {
                console.error('Unable to apply the updated authentication session:', error);
            });
        }, 0);
    });

    try {
        const { data, error } = await sb.auth.getSession();
        if (error) throw error;
        await applySession(data.session);
    } catch (error) {
        console.error('Unable to initialize the authentication session:', error);
        updateNavbar(null, null);
    }
};

/**
 * Register a new user account.
 * Creates a Supabase Auth account; the database trigger creates its profile.
 *
 * @param {string} name - Full name of the user
 * @param {string} email - User's email address
 * @param {string} phone - User's phone number
 * @param {string} password - Chosen password (min 6 characters)
 * @returns {object} { success: boolean, user: object|null, error: string|null }
 */
const registerUser = async (name, email, phone, password) => {
    const sb = getSupabase();
    const apiBase = window.PAWCARE_CONFIG?.API_BASE_URL;
    if (!sb || !apiBase) return { success: false, error: 'Configuration error. Please try again.' };

    const normalizedName = String(name || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPhone = String(phone || '').trim();
    const phoneDigits = normalizedPhone.replace(/\D/g, '');

    if (normalizedName.length < 2 || normalizedName.length > 120) {
        return { success: false, error: 'Please enter a name between 2 and 120 characters.' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
        return { success: false, error: 'Please enter a valid email address.' };
    }
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
        return { success: false, error: 'Enter a valid phone number with 10 to 15 digits.' };
    }
    if (typeof password !== 'string' || password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    try {
        const response = await fetch(`${apiBase}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: normalizedEmail,
                password,
                full_name: normalizedName,
                phone: normalizedPhone
            })
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
            const validationError = result.errors?.[0]?.msg;
            throw new Error(validationError || result.message || 'Registration failed. Please try again.');
        }

        if (result.data?.session) {
            const { error: sessionError } = await sb.auth.setSession({
                access_token: result.data.session.access_token,
                refresh_token: result.data.session.refresh_token
            });
            if (sessionError) {
                throw new Error(`Account created, but sign-in could not be completed: ${sessionError.message}`);
            }
        }

        return {
            success: true,
            user: result.data?.user || null,
            session: result.data?.session || null,
            message: result.data?.session
                ? 'Your account is ready.'
                : result.message
        };

    } catch (error) {
        console.error('Registration error:', error);

        // Provide friendly error messages for common issues
        let message = 'Registration failed. Please try again.';
        if (error.message?.includes('already registered') || error.message?.includes('already been registered')) {
            message = 'An account with this email already exists. Please login instead.';
        } else if (error.message?.includes('Email confirmation is required')) {
            message = error.message;
        } else if (error.message?.includes('Account created, but sign-in could not be completed')) {
            message = error.message;
        } else if (error.message?.includes('fetch')) {
            message = 'Unable to reach the registration service. Please try again.';
        } else if (error.message?.includes('Password should be at least')) {
            message = 'Password must be at least 6 characters long.';
        } else if (error.message?.includes('invalid email')) {
            message = 'Please enter a valid email address.';
        }

        return { success: false, error: message };
    }
};

/**
 * Log in an existing user.
 * Authenticates with Supabase and redirects to dashboard.
 *
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @param {string} [redirectTo='dashboard.html'] - Where to redirect after login
 * @returns {object} { success: boolean, user: object|null, error: string|null }
 */
const loginUser = async (email, password, redirectTo = 'dashboard.html') => {
    const sb = getSupabase();
    if (!sb) return { success: false, error: 'Configuration error. Please try again.' };

    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
        return { success: false, error: 'Please enter a valid email address.' };
    }
    if (typeof password !== 'string' || password.length === 0) {
        return { success: false, error: 'Please enter your password.' };
    }

    try {
        const { data, error } = await sb.auth.signInWithPassword({
            email: normalizedEmail,
            password
        });

        if (error) throw error;
        if (!data.user) throw new Error('Login failed. Please try again.');

        // Fetch the user's profile to get role
        const profile = await getUserProfile(data.user.id);
        if (profile?.status !== 'active') {
            const { error: signOutError } = await sb.auth.signOut({ scope: 'local' });
            if (signOutError) {
                console.error('Unable to sign out an inactive account:', signOutError);
            }
            throw new Error('This account is unavailable. Contact support.');
        }
        sessionStorage.removeItem('pawcare_redirect_after_login');

        // Redirect admin to admin panel, regular users to dashboard
        if (profile?.role === 'admin') {
            window.location.href = 'admin/index.html';
        } else {
            window.location.href = getSafeRedirect(redirectTo);
        }

        return { success: true, user: data.user };

    } catch (error) {
        console.error('Login error:', error);

        let message = 'Login failed. Please try again.';
        if (error.message?.includes('Invalid login credentials')) {
            message = 'Incorrect email or password. Please try again.';
        } else if (error.message?.includes('Email not confirmed')) {
            message = 'Please verify your email address before logging in.';
        } else if (error.message?.includes('This account is unavailable')) {
            message = error.message;
        } else if (error.message?.includes('Too many requests')) {
            message = 'Too many login attempts. Please wait a few minutes and try again.';
        }

        return { success: false, error: message };
    }
};

/**
 * Log out the current user.
 * Clears local authentication state and redirects to home page.
 */
const logoutUser = async () => {
    const sb = getSupabase();
    if (!sb) {
        return { success: false, error: 'Could not sign out because authentication is unavailable.' };
    }

    try {
        const { error } = await sb.auth.signOut({ scope: 'local' });
        if (error) throw error;
    } catch (error) {
        console.error('Logout failed:', error);
        return { success: false, error: error.message || 'Could not sign out. Please try again.' };
    }

    clearUserScopedBrowserData();
    const homePage = window.location.pathname.includes('/admin/') ? '../index.html' : 'index.html';
    window.location.href = homePage;
    return { success: true };
};

/**
 * Get the currently logged-in user from the active Supabase session.
 *
 * @returns {object|null} User object or null if not logged in
 */
const getCurrentUser = async () => {
    const sb = getSupabase();
    if (!sb) return null;

    try {
        const { data, error } = await sb.auth.getSession();
        if (error) throw error;
        return data.session?.user || null;
    } catch (error) {
        console.error('Error getting current user:', error);
        throw error;
    }
};

// ============================================================
// PROFILE FUNCTIONS
// ============================================================

/**
 * Fetch a user's profile from the users table.
 *
 * @param {string} userId - The user's UUID from Supabase Auth
 * @returns {object|null} User profile object or null
 */
const getUserProfile = async (userId) => {
    const sb = getSupabase();
    if (!sb || !userId) return null;

    try {
        const { data, error } = await sb
            .from('users')
            .select('id,name,email,phone,role,status,profile_image,address,occupation,bio,created_at,updated_at')
            .eq('id', userId)
            .single();

        if (error) {
            // PGRST116 = row not found (normal for new users)
            if (error.code !== 'PGRST116') {
                console.warn('Error fetching user profile:', error.message);
            }
            return null;
        }

        return data;
    } catch (error) {
        console.error('Profile fetch error:', error);
        return null;
    }
};

// ============================================================
// NAVBAR MANAGEMENT
// ============================================================

/**
 * Update the navigation bar based on the user's authentication state.
 * Shows/hides relevant nav items (Login, Register, Dashboard, Logout).
 *
 * @param {object|null} user - Supabase user object (null if not logged in)
 * @param {object|null} profile - User profile from database (null if not logged in)
 */
const updateNavbar = (user, profile) => {
    // Elements shown only when logged OUT
    const guestElements = document.querySelectorAll('.nav-guest');
    // Elements shown only when logged IN
    const authElements = document.querySelectorAll('.nav-auth');
    // Elements shown only for admins
    const adminElements = document.querySelectorAll('.nav-admin');
    // User display name element
    const userNameEl = document.getElementById('nav-user-name');
    // User avatar element
    const userAvatarEl = document.getElementById('nav-user-avatar');

    if (user) {
        // --- Logged In State ---
        guestElements.forEach(el => el.style.display = 'none');
        authElements.forEach(el => el.style.display = '');

        // Show admin-specific nav items
        if (profile?.role === 'admin') {
            adminElements.forEach(el => el.style.display = '');
        } else {
            adminElements.forEach(el => el.style.display = 'none');
        }

        // Set user display name
        if (userNameEl) {
            const displayName = profile?.full_name
                || user.user_metadata?.full_name
                || user.email?.split('@')[0]
                || 'User';
            userNameEl.textContent = displayName;
        }

        // Set user avatar initials
        if (userAvatarEl) {
            const name = profile?.full_name || user.user_metadata?.full_name || '?';
            const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            userAvatarEl.textContent = initials;
        }

    } else {
        // --- Logged Out State ---
        guestElements.forEach(el => el.style.display = '');
        authElements.forEach(el => el.style.display = 'none');
        adminElements.forEach(el => el.style.display = 'none');
    }
};

/**
 * Update the notification count badge in the navbar.
 *
 * @param {string} userId - The current user's ID
 */
const updateNotificationBadge = async (userId) => {
    const sb = getSupabase();
    if (!sb || !userId) return;

    try {
        const { count, error } = await sb
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) return;

        const badge = document.getElementById('notification-badge');
        const mobileCount = document.getElementById('notification-count');

        if (badge) {
            if (count > 0) {
                badge.textContent = count > 9 ? '9+' : count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }

        if (mobileCount) {
            mobileCount.textContent = count > 0 ? `(${count})` : '';
        }

    } catch (error) {
        console.warn('Error fetching notification count:', error);
    }
};

// ============================================================
// ROUTE GUARDS
// ============================================================

/**
 * Protect a page - redirects to login if user is not authenticated.
 * Call this at the top of any page that requires login.
 *
 * @param {string} [redirectTo='/login.html'] - Where to redirect unauthenticated users
 * @returns {object|null} User object if authenticated
 */
const requireAuth = async (redirectTo = 'login.html') => {
    const user = await getCurrentUser();

    if (!user) {
        // Save the intended destination so we can redirect back after login
        const currentPath = window.location.pathname + window.location.search;
        sessionStorage.setItem('pawcare_redirect_after_login', currentPath);

        const loginUrl = new URL(getSafeRedirect(redirectTo, 'login.html'), window.location.href);
        loginUrl.searchParams.set('redirect', getSafeRedirect(currentPath));
        window.location.href = loginUrl.href;
        return null;
    }

    return user;
};

/**
 * Protect an admin-only page.
 * Redirects non-admin users to the home page.
 *
 * @returns {object|null} User + profile if admin, null otherwise
 */
const requireAdmin = async () => {
    const user = await getCurrentUser();

    if (!user) {
        window.location.href = 'login.html';
        return null;
    }

    const profile = await getUserProfile(user.id);

    if (profile?.role !== 'admin') {
        // Not an admin - redirect to home
        alert('Access denied. This area is for administrators only.');
        const homePage = window.location.pathname.includes('/admin/') ? '../index.html' : 'index.html';
        window.location.href = homePage;
        return null;
    }

    return { user, profile };
};

// ============================================================
// LOGOUT BUTTON SETUP
// ============================================================

/**
 * Attach logout handler to all elements with [data-logout] attribute.
 * Call this after DOM is ready.
 */
const setupLogoutButtons = () => {
    document.querySelectorAll('[data-logout]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const confirmed = confirm('Are you sure you want to logout?');
            if (confirmed) {
                const result = await logoutUser();
                if (!result.success) alert(result.error);
            }
        });
    });
};

// ============================================================
// AUTO-INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize auth on every page
    await initAuth();

    // Setup logout button listeners
    setupLogoutButtons();

    // Handle post-login redirect (if user was sent to login page)
    const sb = getSupabase();
    if (!sb) return;
    try {
        const { data, error } = await sb.auth.getSession();
        if (error) throw error;
        const redirectPath = sessionStorage.getItem('pawcare_redirect_after_login');
        if (data.session?.user && redirectPath && window.location.pathname.includes('login')) {
            sessionStorage.removeItem('pawcare_redirect_after_login');
            window.location.href = getSafeRedirect(redirectPath);
        }
    } catch (error) {
        console.error('Unable to check for a pending post-login redirect:', error);
    }
});

// Make auth functions globally available
window.PawCareAuth = {
    initAuth,
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    getUserProfile,
    updateNavbar,
    updateNotificationBadge,
    requireAuth,
    requireAdmin,
    setupLogoutButtons
};
