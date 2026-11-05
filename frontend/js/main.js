// ============================================================
// PetCare Connect - Main Utility Functions
// ============================================================
// Shared helper functions used across all pages.
// Includes UI utilities, animations, validators, and formatters.
//
// Depends on: config.js (must be loaded first)
// ============================================================

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

/** Track active toasts to avoid stacking too many */
let activeToastCount = 0;
const MAX_TOASTS = 3;

/**
 * Show a Bootstrap-style toast notification at the top-right of the screen.
 *
 * @param {string} message - The message to display
 * @param {'success'|'error'|'warning'|'info'} type - Toast style/color
 * @param {number} [duration=4000] - How long to show the toast (ms)
 */
const showToast = (message, type = 'info', duration = 4000) => {
    // Limit simultaneous toasts
    if (activeToastCount >= MAX_TOASTS) return;

    // Icon map for each toast type
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    // Color classes (using Bootstrap 5 utility classes)
    const colorMap = {
        success: 'bg-success text-white',
        error: 'bg-danger text-white',
        warning: 'bg-warning text-dark',
        info: 'bg-primary text-white'
    };

    // Ensure a toast container exists in the DOM
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-width: 350px;
        `;
        document.body.appendChild(container);
    }

    // Build the toast element
    const toast = document.createElement('div');
    toast.className = `pawcare-toast ${colorMap[type] || colorMap.info}`;
    toast.style.cssText = `
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 14px 18px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        font-size: 14px;
        font-weight: 500;
        line-height: 1.4;
        transform: translateX(120%);
        transition: transform 0.3s ease, opacity 0.3s ease;
        opacity: 0;
        cursor: pointer;
        word-break: break-word;
    `;
    toast.innerHTML = `
        <span style="font-size:18px; flex-shrink:0;">${icons[type] || icons.info}</span>
        <span style="flex:1;">${sanitizeInput(message)}</span>
        <button onclick="this.closest('.pawcare-toast').remove(); activeToastCount--;"
                style="background:none;border:none;color:inherit;font-size:18px;cursor:pointer;padding:0;line-height:1;margin-left:4px;"
                title="Close">×</button>
    `;

    container.appendChild(toast);
    activeToastCount++;

    // Slide in animation
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        });
    });

    // Click to dismiss
    toast.addEventListener('click', () => {
        dismissToast(toast);
    });

    // Auto dismiss after duration
    setTimeout(() => {
        dismissToast(toast);
    }, duration);
};

/**
 * Animate out and remove a toast element.
 * @param {HTMLElement} toast
 */
const dismissToast = (toast) => {
    if (!toast || !toast.parentNode) return;
    toast.style.transform = 'translateX(120%)';
    toast.style.opacity = '0';
    setTimeout(() => {
        toast.remove();
        activeToastCount = Math.max(0, activeToastCount - 1);
    }, 300);
};

// ============================================================
// LOADING SPINNERS
// ============================================================

/**
 * Show a loading spinner inside a container element.
 * Replaces the container's content with a spinner.
 *
 * @param {string} containerId - The ID of the container element
 * @param {string} [message='Loading...'] - Optional loading message
 */
const showLoading = (containerId, message = 'Loading...') => {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="loading-wrapper d-flex flex-column align-items-center justify-content-center py-5"
             style="min-height: 200px;">
            <div class="paw-loader mb-3">
                <div class="spinner-border text-primary" role="status" style="width:3rem;height:3rem;">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
            <p class="text-muted mb-0">${sanitizeInput(message)}</p>
        </div>
    `;
};

/**
 * Remove the loading spinner from a container.
 * Called after data has been loaded and rendered.
 *
 * @param {string} containerId - The ID of the container element
 */
const hideLoading = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const loader = container.querySelector('.loading-wrapper');
    if (loader) loader.remove();
};

// ============================================================
// DATE AND AGE FORMATTING
// ============================================================

/**
 * Format a date string into a human-readable format.
 *
 * @param {string} dateString - ISO date string from database
 * @param {boolean} [includeTime=false] - Whether to include the time
 * @returns {string} Formatted date string (e.g., "January 15, 2024")
 */
const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return 'Unknown date';

    try {
        const date = new Date(dateString);

        if (isNaN(date.getTime())) return 'Invalid date';

        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };

        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }

        return date.toLocaleDateString('en-IN', options);
    } catch {
        return 'Unknown date';
    }
};

/**
 * Get a relative time string (e.g., "2 days ago", "just now").
 *
 * @param {string} dateString - ISO date string
 * @returns {string} Relative time string
 */
const timeAgo = (dateString) => {
    if (!dateString) return '';

    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

    return formatDate(dateString);
};

/**
 * Format pet age from years and months into a readable string.
 *
 * @param {number} years - Age in years (can be 0)
 * @param {number} months - Additional months (0-11)
 * @returns {string} Formatted age (e.g., '2 years 3 months', '5 months', 'Puppy')
 */
const formatAge = (years, months) => {
    const y = parseInt(years) || 0;
    const m = parseInt(months) || 0;

    if (y === 0 && m === 0) return 'Baby / Newborn';
    if (y === 0 && m === 1) return '1 month';
    if (y === 0) return `${m} months`;
    if (y === 1 && m === 0) return '1 year';
    if (m === 0) return `${y} years`;
    if (y === 1) return `1 year ${m} month${m > 1 ? 's' : ''}`;

    return `${y} years ${m} month${m > 1 ? 's' : ''}`;
};

// ============================================================
// STATUS BADGES
// ============================================================

/**
 * Return an HTML badge for adoption application or appointment status.
 * Uses Bootstrap badge classes.
 *
 * @param {string} status - Status value from database
 * @returns {string} HTML string for the badge
 */
const getStatusBadge = (status) => {
    const statusConfig = {
        // Application statuses
        pending:       { class: 'bg-warning text-dark', label: 'Pending',        icon: '⏳' },
        under_review:  { class: 'bg-info text-dark',    label: 'Under Review',   icon: '🔍' },
        approved:      { class: 'bg-success',            label: 'Approved',       icon: '✅' },
        rejected:      { class: 'bg-danger',             label: 'Rejected',       icon: '❌' },
        withdrawn:     { class: 'bg-secondary',          label: 'Withdrawn',      icon: '↩️' },
        // Appointment statuses
        scheduled:     { class: 'bg-primary',            label: 'Scheduled',      icon: '📅' },
        confirmed:     { class: 'bg-success',            label: 'Confirmed',      icon: '✅' },
        completed:     { class: 'bg-secondary',          label: 'Completed',      icon: '🎉' },
        cancelled:     { class: 'bg-danger',             label: 'Cancelled',      icon: '❌' },
        // Pet statuses
        available:     { class: 'bg-success',            label: 'Available',      icon: '🐾' },
        adopted:       { class: 'bg-secondary',          label: 'Adopted',        icon: '🏠' },
        fostered:      { class: 'bg-info text-dark',     label: 'Fostered',       icon: '💛' },
        medical_hold:  { class: 'bg-warning text-dark',  label: 'Medical Hold',   icon: '🏥' }
    };

    const config = statusConfig[status?.toLowerCase()] || {
        class: 'bg-light text-dark',
        label: status || 'Unknown',
        icon: '❓'
    };

    return `<span class="badge ${config.class} rounded-pill px-3 py-1">
                ${config.icon} ${config.label}
            </span>`;
};

// ============================================================
// PET HELPERS
// ============================================================

/**
 * Return an emoji icon for a pet species.
 *
 * @param {string} species - Pet species (dog)
 * @returns {string} Emoji character
 */
const getPetSpeciesIcon = (species) => {
    return species?.toLowerCase() === 'dog' ? '🐶' : '🐾';
};

const formatAdoptionFee = (fee) => {
    if (fee === null || fee === undefined || fee === '') return 'Contact shelter for fee';
    const amount = Number(fee);
    if (!Number.isFinite(amount) || amount < 0) return 'Contact shelter for fee';
    if (amount === 0) return 'No adoption fee';
    return `${new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(amount)} adoption fee`;
};

/**
 * Generate the complete HTML for a pet card.
 * Used in the adoption listings and saved pets grid.
 *
 * @param {object} pet - Pet object from Supabase
 * @returns {string} Complete card HTML string
 */
const getPetCardHTML = (pet) => {
    // Determine if pet is saved (from localStorage)
    const savedPets = JSON.parse(localStorage.getItem('pawcare_saved_pets') || '[]');
    const isSaved = savedPets.includes(pet.id);

    // Fallback image if no photo
    const imageUrl = pet.photos?.[0]
        || pet.photo_url
        || `https://via.placeholder.com/300x220?text=${encodeURIComponent(pet.name || 'Pet')}`;

    // Format age display
    const ageDisplay = pet.age_years !== undefined
        ? formatAge(pet.age_years, pet.age_months)
        : (pet.age || 'Unknown age');

    return `
        <div class="col-lg-3 col-md-4 col-sm-6 mb-4 pet-card-wrapper" data-pet-id="${pet.id}">
            <div class="card pet-card h-100 border-0 shadow-sm"
                 style="border-radius: 16px; overflow: hidden; transition: transform 0.3s ease, box-shadow 0.3s ease;"
                 onmouseenter="this.style.transform='translateY(-6px)'; this.style.boxShadow='0 16px 40px rgba(0,0,0,0.12)'"
                 onmouseleave="this.style.transform=''; this.style.boxShadow=''">

                <!-- Pet Image -->
                <div class="position-relative" style="height: 200px; overflow: hidden;">
                    <img src="${imageUrl}"
                         alt="${sanitizeInput(pet.name)}"
                         class="card-img-top w-100 h-100"
                         style="object-fit: cover;"
                         onerror="this.src='https://via.placeholder.com/300x220?text=No+Photo'">

                    <!-- Save / Heart Button -->
                    <button class="btn btn-light save-pet-btn position-absolute"
                            style="top:10px; right:10px; width:36px; height:36px; border-radius:50%; padding:0; display:flex; align-items:center; justify-content:center; box-shadow: 0 2px 8px rgba(0,0,0,0.15);"
                            onclick="toggleSavePet('${pet.id}', this)"
                            title="${isSaved ? 'Remove from saved' : 'Save this pet'}">
                        <span style="font-size:18px; line-height:1;">${isSaved ? '❤️' : '🤍'}</span>
                    </button>

                    <!-- Species Badge -->
                    <span class="badge position-absolute"
                          style="bottom:10px; left:10px; background:rgba(0,0,0,0.6); color:white; border-radius:20px; padding:4px 10px;">
                        ${getPetSpeciesIcon(pet.species)} ${capitalize(pet.species || 'Pet')}
                    </span>
                </div>

                <!-- Card Body -->
                <div class="card-body px-3 py-3">
                    <div class="d-flex justify-content-between align-items-start mb-1">
                        <h5 class="card-title fw-bold mb-0" style="font-size:1.05rem;">${sanitizeInput(pet.name)}</h5>
                        ${getStatusBadge(pet.adoption_status || 'available')}
                    </div>

                    <p class="text-muted small mb-2">
                        ${pet.breed ? sanitizeInput(pet.breed) + ' • ' : ''}
                        ${ageDisplay}
                        ${pet.gender ? ` • ${capitalize(pet.gender)}` : ''}
                    </p>
                    <p class="fw-bold mb-2">💰 ${formatAdoptionFee(pet.adoption_fee)}</p>

                    ${pet.description ? `
                    <p class="card-text text-muted" style="font-size:0.85rem; line-height:1.5; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">
                        ${sanitizeInput(pet.description)}
                    </p>` : ''}

                    <!-- Tags: vaccinated, neutered etc -->
                    <div class="d-flex flex-wrap gap-1 mb-3">
                        ${pet.is_vaccinated ? '<span class="badge bg-success bg-opacity-10 text-success" style="font-size:0.7rem;">💉 Vaccinated</span>' : ''}
                        ${pet.is_neutered ? '<span class="badge bg-info bg-opacity-10 text-info" style="font-size:0.7rem;">✂️ Neutered</span>' : ''}
                        ${pet.is_house_trained ? '<span class="badge bg-primary bg-opacity-10 text-primary" style="font-size:0.7rem;">🏠 House Trained</span>' : ''}
                    </div>

                    <a href="pet-detail.html?id=${encodeURIComponent(pet.id)}"
                       class="btn btn-primary w-100 rounded-pill fw-semibold"
                       style="font-size:0.9rem;">
                        View Details
                    </a>
                </div>
            </div>
        </div>
    `;
};

/**
 * Capitalize the first letter of a string.
 * @param {string} str
 * @returns {string}
 */
const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
};

// ============================================================
// COUNTER ANIMATIONS
// ============================================================

/**
 * Animate numeric counters when they scroll into view.
 * Look for elements with [data-count] attribute and animate
 * them from 0 to the target number.
 */
const initializeCounters = () => {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const animateCounter = (el) => {
        const target = parseInt(el.getAttribute('data-count')) || 0;
        const duration = 1800;
        const step = 30; // Update every 30ms
        const increment = target / (duration / step);
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                el.textContent = target.toLocaleString('en-IN') + (el.getAttribute('data-suffix') || '+');
                clearInterval(timer);
            } else {
                el.textContent = Math.floor(current).toLocaleString('en-IN') + (el.getAttribute('data-suffix') || '+');
            }
        }, step);
    };

    // Use IntersectionObserver so animation plays when element is visible
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.dataset.animated) {
                entry.target.dataset.animated = 'true';
                animateCounter(entry.target);
            }
        });
    }, { threshold: 0.3 });

    counters.forEach(counter => observer.observe(counter));
};

// ============================================================
// PAW PRINT ANIMATIONS
// ============================================================

/**
 * Create floating paw print emojis that drift up the screen.
 * Called for decorative effect on the hero section.
 */
const initializePawAnimations = () => {
    const container = document.getElementById('paw-animations-container') || document.body;

    const createPaw = () => {
        const paw = document.createElement('div');
        paw.textContent = '🐾';
        paw.style.cssText = `
            position: fixed;
            font-size: ${Math.random() * 20 + 14}px;
            left: ${Math.random() * 100}vw;
            bottom: -50px;
            opacity: 0;
            z-index: 0;
            pointer-events: none;
            animation: floatPaw ${Math.random() * 4 + 5}s ease-in forwards;
            transform: rotate(${Math.random() * 60 - 30}deg);
        `;
        container.appendChild(paw);

        // Remove after animation completes
        paw.addEventListener('animationend', () => paw.remove());
    };

    // Add keyframe styles if not already added
    if (!document.getElementById('paw-keyframes')) {
        const style = document.createElement('style');
        style.id = 'paw-keyframes';
        style.textContent = `
            @keyframes floatPaw {
                0%   { bottom: -50px; opacity: 0; }
                10%  { opacity: 0.6; }
                90%  { opacity: 0.3; }
                100% { bottom: 110vh; opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // Create paws periodically
    const interval = setInterval(createPaw, 1800);

    // Stop after 30 seconds to save performance
    setTimeout(() => clearInterval(interval), 30000);
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Debounce a function - delays execution until user stops calling it.
 * Useful for search inputs to avoid firing on every keystroke.
 *
 * @param {Function} func - The function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced version of the function
 *
 * @example
 * const debouncedSearch = debounce(searchPets, 400);
 * searchInput.addEventListener('input', debouncedSearch);
 */
const debounce = (func, wait = 300) => {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), wait);
    };
};

/**
 * Sanitize a string to prevent XSS (Cross-Site Scripting) attacks.
 * Converts HTML special characters to safe entities.
 *
 * @param {string} str - The string to sanitize
 * @returns {string} Sanitized string
 */
const sanitizeInput = (str) => {
    if (typeof str !== 'string') return String(str ?? '');
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

/**
 * Validate an email address format.
 *
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid format
 */
const isValidEmail = (email) => {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
};

/**
 * Validate an Indian phone number.
 * Accepts formats: +91XXXXXXXXXX, 91XXXXXXXXXX, or 10-digit mobile numbers
 *
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
const isValidPhone = (phone) => {
    if (!phone || typeof phone !== 'string') return false;
    // Remove spaces, dashes, parentheses
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    // Indian mobile: optional +91 or 91, then 10 digits starting with 6-9
    const phoneRegex = /^(\+?91)?[6-9]\d{9}$/;
    return phoneRegex.test(cleaned);
};

/**
 * Generate a unique application ID string.
 * Format: PAW-YYYYMMDD-XXXXXX (random suffix)
 *
 * @returns {string} Unique application ID
 *
 * @example
 * generateApplicationId() // → "PAW-20240115-A3F9K2"
 */
const generateApplicationId = () => {
    const now = new Date();
    const dateStr = now.getFullYear().toString()
        + String(now.getMonth() + 1).padStart(2, '0')
        + String(now.getDate()).padStart(2, '0');

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomStr = Array.from({ length: 6 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
    ).join('');

    return `PAW-${dateStr}-${randomStr}`;
};

/**
 * Copy text to the clipboard and show a toast confirmation.
 *
 * @param {string} text - Text to copy
 * @param {string} [successMessage='Copied to clipboard!'] - Message to show on success
 */
const copyToClipboard = async (text, successMessage = 'Copied to clipboard!') => {
    try {
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(text);
        } else {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
        showToast(successMessage, 'success', 2000);
    } catch (error) {
        showToast('Failed to copy. Please copy manually.', 'error');
    }
};

// ============================================================
// SCROLL UTILITIES
// ============================================================

/**
 * Smooth scroll to a section on the same page.
 *
 * @param {string} sectionId - The ID of the element to scroll to (without #)
 * @param {number} [offset=80] - Extra offset from the top (for fixed navbar)
 */
const scrollToSection = (sectionId, offset = 80) => {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const top = section.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
};

/**
 * Add a shadow to the navbar when the user scrolls down.
 * Makes the navbar visually separate from content.
 */
const initNavbarScroll = () => {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    const handleScroll = () => {
        if (window.scrollY > 50) {
            navbar.classList.add('navbar-scrolled');
            navbar.style.boxShadow = '0 2px 20px rgba(0,0,0,0.1)';
        } else {
            navbar.classList.remove('navbar-scrolled');
            navbar.style.boxShadow = '';
        }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Run once on load
};

/**
 * Make all anchor links (<a href="#section">) scroll smoothly.
 */
const initSmoothScroll = () => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const href = anchor.getAttribute('href');
            if (href === '#' || href.length < 2) return;

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const offset = document.querySelector('.navbar')?.offsetHeight || 80;
                const top = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });
};

/**
 * Initialize AOS (Animate On Scroll) library if it is loaded.
 * AOS is an optional CDN library for scroll-triggered animations.
 */
const initAOS = () => {
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 600,
            once: true,        // Only animate once (not on scroll back up)
            easing: 'ease-out-cubic',
            offset: 80
        });
        console.log('✅ AOS initialized');
    }
};

// ============================================================
// EMPTY STATE HELPERS
// ============================================================

/**
 * Generate HTML for an empty state (no results).
 *
 * @param {string} icon - Emoji icon
 * @param {string} title - Main message
 * @param {string} [subtitle] - Optional sub-message
 * @param {string} [actionHtml] - Optional button HTML
 * @returns {string} Empty state HTML
 */
const getEmptyStateHTML = (icon, title, subtitle = '', actionHtml = '') => `
    <div class="empty-state text-center py-5 px-4">
        <div style="font-size: 4rem; margin-bottom: 1rem;">${icon}</div>
        <h4 class="fw-bold text-dark mb-2">${sanitizeInput(title)}</h4>
        ${subtitle ? `<p class="text-muted mb-4" style="max-width:360px; margin:auto;">${sanitizeInput(subtitle)}</p>` : ''}
        ${actionHtml || ''}
    </div>
`;

// ============================================================
// DOCUMENT READY INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize navbar scroll effect on all pages
    initNavbarScroll();

    // Initialize smooth scrolling for anchor links
    initSmoothScroll();

    // Initialize AOS if available
    initAOS();

    // Initialize stat counters if they exist on this page
    initializeCounters();

    // Initialize paw animations if hero section exists
    if (document.getElementById('hero') || document.querySelector('.hero-section')) {
        // Delay slightly to avoid interfering with page load
        setTimeout(initializePawAnimations, 2000);
    }

    console.log('🐾 PetCare Connect - Main utilities loaded');
});

// ============================================================
// GLOBAL EXPORTS
// ============================================================

window.PawCareUtils = {
    // Toasts
    showToast,
    dismissToast,
    // Loading
    showLoading,
    hideLoading,
    // Formatters
    formatDate,
    timeAgo,
    formatAge,
    // Badges
    getStatusBadge,
    // Pet helpers
    getPetSpeciesIcon,
    formatAdoptionFee,
    getPetCardHTML,
    capitalize,
    // Animations
    initializeCounters,
    initializePawAnimations,
    // Utilities
    debounce,
    sanitizeInput,
    isValidEmail,
    isValidPhone,
    generateApplicationId,
    copyToClipboard,
    // Scroll
    scrollToSection,
    initNavbarScroll,
    initSmoothScroll,
    initAOS,
    // UI helpers
    getEmptyStateHTML
};

// Also expose commonly-used functions directly on window for convenience
window.showToast = showToast;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.sanitizeInput = sanitizeInput;
window.formatAdoptionFee = formatAdoptionFee;
window.formatAge = formatAge;
window.getStatusBadge = getStatusBadge;
