// ============================================================
// PetCare Connect - Pet Browsing & Adoption Module
// ============================================================
// Handles the adoption listing page: loading pets from Supabase,
// filtering, searching, saving, and pagination.
//
// Depends on: config.js, main.js, auth.js
// ============================================================

// ============================================================
// FILTER STATE
// Tracks the current active filters and search query
// ============================================================

const FilterState = {
    species: 'dog',
    size: '',             // e.g., 'small', 'medium', 'large'
    age_range: '',        // e.g., 'puppy', 'adult', 'senior'
    gender: '',           // 'male' or 'female'
    search: '',           // text search
    shelter_id: '',       // filter by specific shelter
    sort: 'newest',       // 'newest', 'oldest', 'name_asc'
    page: 0,             // current page (0-indexed)
    hasMore: true        // whether more pages exist
};

const PETS_PER_PAGE = window.PAWCARE_CONFIG?.PETS_PER_PAGE || 12;

// ============================================================
// CORE LOADING FUNCTION
// ============================================================

/**
 * Fetch pets from Supabase with the current filters applied.
 * Supports species, size, gender, age range, text search, and pagination.
 *
 * @param {object} [filters=FilterState] - Filter options to apply
 * @param {boolean} [append=false] - If true, append to existing cards (Load More)
 * @returns {Array} Array of pet objects
 */
const loadPets = async (filters = FilterState, append = false) => {
    const apiBase = window.PAWCARE_CONFIG.API_BASE_URL;
    const sb = window.PAWCARE_CONFIG?.supabase;

    const gridId = 'pets-grid';
    if (!append) showLoading(gridId, 'Finding loving dogs...');

    // 1. Try Backend API first (Node.js Express + Supabase)
    try {
        const queryParams = new URLSearchParams({
            species: 'dog',
            page: (filters.page || 0) + 1,
            limit: PETS_PER_PAGE,
        });

        if (filters.gender) queryParams.set('gender', filters.gender);
        if (filters.search?.trim()) queryParams.set('search', filters.search.trim());
        if (filters.shelter_id) queryParams.set('shelter_id', filters.shelter_id);
        if (filters.sort === 'name_asc') {
            queryParams.set('sort_by', 'name');
            queryParams.set('sort_order', 'asc');
        } else if (filters.sort === 'oldest') {
            queryParams.set('sort_by', 'created_at');
            queryParams.set('sort_order', 'asc');
        } else {
            queryParams.set('sort_by', 'created_at');
            queryParams.set('sort_order', 'desc');
        }

        const res = await fetch(`${apiBase}/pets?${queryParams.toString()}`);
        if (res.ok) {
            const result = await res.json();
            if (result.success && Array.isArray(result.data)) {
                const total = result.pagination?.total ?? result.data.length;
                FilterState.hasMore = ((filters.page || 0) + 1) * PETS_PER_PAGE < total;
                updateLoadMoreButton(FilterState.hasMore, total);
                renderPetCards(result.data, append, total);
                return result.data;
            }
        }
    } catch (apiErr) {
        console.warn('Backend API request failed, falling back to direct Supabase client:', apiErr.message);
    }

    // 2. Direct Supabase Client Query Fallback
    if (sb) {
        try {
            let query = sb
                .from('pets')
                .select(`
                    *,
                    shelters ( id, name, location, address )
                `, { count: 'exact' })
                .eq('adoption_status', 'available')
                .eq('species', 'dog');
            query = query.eq('is_listed', true);

            if (filters.size) query = query.eq('size', filters.size);
            if (filters.gender) query = query.eq('gender', filters.gender);
            if (filters.shelter_id) query = query.eq('shelter_id', filters.shelter_id);

            if (filters.age_range) {
                if (filters.age_range === 'puppy')  query = query.lt('age_years', 1);
                if (filters.age_range === 'young')  query = query.gte('age_years', 1).lt('age_years', 3);
                if (filters.age_range === 'adult')  query = query.gte('age_years', 3).lt('age_years', 8);
                if (filters.age_range === 'senior') query = query.gte('age_years', 8);
            }

            if (filters.search?.trim()) {
                const term = filters.search.trim();
                query = query.or(`name.ilike.%${term}%,breed.ilike.%${term}%,description.ilike.%${term}%`);
            }

            if (filters.sort === 'name_asc') {
                query = query.order('name', { ascending: true });
            } else if (filters.sort === 'oldest') {
                query = query.order('created_at', { ascending: true });
            } else {
                query = query.order('created_at', { ascending: false });
            }

            const from = filters.page * PETS_PER_PAGE;
            const to   = from + PETS_PER_PAGE - 1;
            query = query.range(from, to);

            const { data: pets, error, count } = await query;
            if (error) throw error;

            FilterState.hasMore = (from + PETS_PER_PAGE) < (count || 0);
            updateLoadMoreButton(FilterState.hasMore, count || 0);
            renderPetCards(pets || [], append, count || 0);
            return pets || [];
        } catch (sbErr) {
            console.error('Supabase direct query failed:', sbErr);
        }
    }

    // 3. Failure display with retry button
    if (!append) {
        const container = document.getElementById(gridId);
        if (container) {
            container.innerHTML = window.PawCareUtils?.getEmptyStateHTML(
                '🐕',
                'Unable to load dogs',
                'We could not reach the server. Please check your connection and try again.',
                '<button class="btn btn-primary rounded-pill px-4" onclick="loadPets()">Retry</button>'
            ) || '<p class="text-center text-muted py-5">Error loading dogs. <button class="btn btn-link" onclick="loadPets()">Retry</button></p>';
        }
    }
    showToast('Failed to load dogs. Please check your connection.', 'error');
    return [];
};

// ============================================================
// RENDER FUNCTIONS
// ============================================================

/**
 * Render pet cards into the grid container.
 *
 * @param {Array} pets - Array of pet objects from Supabase
 * @param {boolean} [append=false] - Append to existing content (Load More)
 * @param {number} [totalCount=0] - Total matching count
 */
const renderPetCards = (pets, append = false, totalCount = 0) => {
    const container = document.getElementById('pets-grid');
    if (!container) return;

    // Remove loading spinner if present
    hideLoading('pets-grid');

    // Handle empty results
    if (!append && (!pets || pets.length === 0)) {
        container.innerHTML = window.PawCareUtils?.getEmptyStateHTML(
            '🔍',
            'No pets found',
            FilterState.search
                ? `No pets match "${FilterState.search}". Try a different search or remove some filters.`
                : 'No pets match your filters. Try adjusting them!',
            `<div class="d-flex gap-3 justify-content-center flex-wrap">
                <button class="btn btn-outline-primary rounded-pill px-4" onclick="clearFilters()">Clear Filters</button>
                <a href="#" class="btn btn-primary rounded-pill px-4" onclick="loadPets()">Refresh</a>
            </div>`
        ) || '';
        updateResultsCount(0);
        return;
    }

    // Build HTML string for all pet cards
    const getPetCard = window.PawCareUtils?.getPetCardHTML || fallbackPetCardHTML;
    const cardsHTML = pets.map(pet => getPetCard(pet)).join('');

    if (append) {
        // Remove placeholder "loading more" indicator if present
        const loadingMore = container.querySelector('.loading-more');
        if (loadingMore) loadingMore.remove();
        // Append new cards
        container.insertAdjacentHTML('beforeend', cardsHTML);
    } else {
        // Replace content
        container.innerHTML = `<div class="row" id="pets-row">${cardsHTML}</div>`;
    }

    // Update results counter
    updateResultsCount(totalCount);

    // Trigger AOS re-init for new elements
    if (typeof AOS !== 'undefined') AOS.refresh();
};

/**
 * Fallback pet card if main.js is not loaded.
 * @param {object} pet
 * @returns {string} HTML
 */
const fallbackPetCardHTML = (pet) => `
    <div class="col-md-4 mb-4">
        <div class="card h-100 shadow-sm">
            <div class="card-body">
                <h5>${pet.name}</h5>
                <p class="text-muted">${pet.species} · ${pet.breed || ''}</p>
                <a href="pet-detail.html?id=${encodeURIComponent(pet.id)}" class="btn btn-primary btn-sm">View Details</a>
            </div>
        </div>
    </div>
`;

/**
 * Update the results counter display (e.g., "Showing 12 of 45 pets").
 * @param {number} total
 */
const updateResultsCount = (total) => {
    const el = document.getElementById('results-count');
    if (!el) return;

    const showing = Math.min(
        (FilterState.page + 1) * PETS_PER_PAGE,
        total
    );

    if (total === 0) {
        el.textContent = 'No pets found';
    } else {
        el.textContent = `Showing ${showing} of ${total} pets`;
    }
};

/**
 * Update the Load More button visibility.
 * @param {boolean} hasMore
 * @param {number} total
 */
const updateLoadMoreButton = (hasMore, total) => {
    const btn = document.getElementById('load-more-btn');
    if (!btn) return;
    btn.style.display = hasMore ? 'block' : 'none';
};

// ============================================================
// FILTER INITIALIZATION
// ============================================================

/**
 * Initialize all filter controls (species, size, age, gender, sort).
 * Reads filter buttons and select dropdowns and attaches handlers.
 */
const initFilters = () => {
    // --- Species filter pills ---
    document.querySelectorAll('[data-filter-species]').forEach(btn => {
        btn.addEventListener('click', () => {
            const value = btn.getAttribute('data-filter-species');

            // Toggle active state
            document.querySelectorAll('[data-filter-species]').forEach(b => b.classList.remove('active', 'btn-primary'));
            btn.classList.add('active', 'btn-primary');

            // Apply filter
            FilterState.species = value === 'all' ? '' : value;
            FilterState.page = 0;
            updateURLParams();
            loadPets(FilterState);
        });
    });

    // --- Size filter ---
    const sizeFilter = document.getElementById('filter-size');
    if (sizeFilter) {
        sizeFilter.addEventListener('change', () => {
            FilterState.size = sizeFilter.value;
            FilterState.page = 0;
            updateURLParams();
            loadPets(FilterState);
        });
    }

    // --- Age range filter ---
    const ageFilter = document.getElementById('filter-age');
    if (ageFilter) {
        ageFilter.addEventListener('change', () => {
            FilterState.age_range = ageFilter.value;
            FilterState.page = 0;
            updateURLParams();
            loadPets(FilterState);
        });
    }

    // --- Gender filter ---
    const genderFilter = document.getElementById('filter-gender');
    if (genderFilter) {
        genderFilter.addEventListener('change', () => {
            FilterState.gender = genderFilter.value;
            FilterState.page = 0;
            updateURLParams();
            loadPets(FilterState);
        });
    }

    // --- Sort order ---
    const sortFilter = document.getElementById('filter-sort');
    if (sortFilter) {
        sortFilter.addEventListener('change', () => {
            FilterState.sort = sortFilter.value;
            FilterState.page = 0;
            loadPets(FilterState);
        });
    }

    // Read any pre-set filters from URL query params
    readURLParams();
};

// ============================================================
// SEARCH
// ============================================================

/**
 * Initialize the search input with debounced handling.
 * Triggers a new load when user stops typing.
 */
const initSearch = () => {
    const searchInput = document.getElementById('pet-search');
    if (!searchInput) return;

    const debouncedSearch = window.PawCareUtils?.debounce
        ? window.PawCareUtils.debounce(handleSearch, 450)
        : handleSearch;

    searchInput.addEventListener('input', debouncedSearch);

    // Clear search on button click
    const clearBtn = document.getElementById('search-clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            FilterState.search = '';
            FilterState.page = 0;
            clearBtn.style.display = 'none';
            loadPets(FilterState);
        });
    }

    // Show/hide clear button
    searchInput.addEventListener('input', () => {
        if (clearBtn) clearBtn.style.display = searchInput.value ? 'block' : 'none';
    });
};

/**
 * Handle search input changes.
 */
const handleSearch = () => {
    const searchInput = document.getElementById('pet-search');
    if (!searchInput) return;

    FilterState.search = searchInput.value.trim();
    FilterState.page = 0;
    updateURLParams();
    loadPets(FilterState);
};

// ============================================================
// SAVE (FAVOURITE) PETS
// ============================================================

/**
 * Toggle saving/unsaving a pet (store in localStorage).
 * Updates the heart icon and shows a toast.
 *
 * @param {string} petId - The pet's UUID
 * @param {HTMLElement} [btn] - The heart button element to update
 */
const toggleSavePet = (petId, btn) => {
    const key = 'pawcare_saved_pets';
    let saved = JSON.parse(localStorage.getItem(key) || '[]');

    const isSaved = saved.includes(petId);

    if (isSaved) {
        // Remove from saved
        saved = saved.filter(id => id !== petId);
        localStorage.setItem(key, JSON.stringify(saved));

        if (btn) {
            btn.innerHTML = '<span style="font-size:18px;line-height:1;">🤍</span>';
            btn.title = 'Save this pet';
        }
        showToast('Removed from saved pets', 'info', 2000);

    } else {
        // Add to saved with heart animation
        saved.push(petId);
        localStorage.setItem(key, JSON.stringify(saved));

        if (btn) {
            btn.innerHTML = '<span style="font-size:18px;line-height:1;">❤️</span>';
            btn.title = 'Remove from saved';

            // Bounce animation
            btn.style.transform = 'scale(1.4)';
            setTimeout(() => { btn.style.transform = ''; }, 300);
        }
        showToast('❤️ Pet saved! View in your dashboard.', 'success', 2500);

        // If user is logged in, also save to database
        savePetToDatabase(petId);
    }
};

/**
 * Save a pet to the user's saved_pets in Supabase (if logged in).
 * @param {string} petId
 */
const savePetToDatabase = async (petId) => {
    const sb = window.PAWCARE_CONFIG?.supabase;
    if (!sb) return;

    try {
        const { data: { session } } = await sb.auth.getSession();
        if (!session?.user) return; // Not logged in — localStorage is enough

        await sb.from('saved_pets').upsert({
            user_id: session.user.id,
            pet_id: petId,
            saved_at: new Date().toISOString()
        }, { onConflict: 'user_id,pet_id' });

    } catch (error) {
        // Silently fail - localStorage already updated
        console.warn('Failed to sync saved pet to database:', error.message);
    }
};

// ============================================================
// LOAD MORE (PAGINATION)
// ============================================================

/**
 * Load the next page of pets and append them to the grid.
 */
const loadMore = async () => {
    if (!FilterState.hasMore) return;

    const btn = document.getElementById('load-more-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status"></span>
            Loading...
        `;
    }

    FilterState.page++;
    await loadPets(FilterState, true);

    if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Load More Pets 🐾';
    }
};

// ============================================================
// URL PARAMETER MANAGEMENT
// (Allows shareable filtered URLs)
// ============================================================

/**
 * Update the browser URL to reflect the current filters
 * without reloading the page.
 */
const updateURLParams = () => {
    const params = new URLSearchParams();

    if (FilterState.species)  params.set('species', FilterState.species);
    if (FilterState.size)     params.set('size', FilterState.size);
    if (FilterState.age_range) params.set('age', FilterState.age_range);
    if (FilterState.gender)   params.set('gender', FilterState.gender);
    if (FilterState.search)   params.set('q', FilterState.search);

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', params.toString() ? newUrl : window.location.pathname);
};

/**
 * Read filters from the current URL query parameters
 * and apply them to FilterState. Called on page load.
 */
const readURLParams = () => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('species')) FilterState.species = params.get('species');
    if (params.get('size'))    FilterState.size    = params.get('size');
    if (params.get('age'))     FilterState.age_range = params.get('age');
    if (params.get('gender'))  FilterState.gender  = params.get('gender');
    if (params.get('q'))       FilterState.search  = params.get('q');

    // Reflect URL params in the UI elements
    if (FilterState.search) {
        const searchInput = document.getElementById('pet-search');
        if (searchInput) searchInput.value = FilterState.search;
    }

    if (FilterState.species) {
        const btn = document.querySelector(`[data-filter-species="${FilterState.species}"]`);
        if (btn) {
            document.querySelectorAll('[data-filter-species]').forEach(b => b.classList.remove('active', 'btn-primary'));
            btn.classList.add('active', 'btn-primary');
        }
    }
};

/**
 * Clear all active filters and reload pets.
 */
const clearFilters = () => {
    FilterState.species = 'dog';
    FilterState.size = '';
    FilterState.age_range = '';
    FilterState.gender = '';
    FilterState.search = '';
    FilterState.sort = 'newest';
    FilterState.page = 0;

    // Reset UI elements
    const searchInput = document.getElementById('pet-search');
    if (searchInput) searchInput.value = '';

    document.querySelectorAll('[data-filter-species]').forEach(b => b.classList.remove('active', 'btn-primary'));
    const dogBtn = document.querySelector('[data-filter-species="dog"]');
    if (dogBtn) dogBtn.classList.add('active', 'btn-primary');

    ['filter-size', 'filter-age', 'filter-gender', 'filter-sort'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    updateURLParams();
    loadPets(FilterState);
};

// ============================================================
// AUTO-INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the adopt page
    if (!document.getElementById('pets-grid')) return;

    // Initialize filter controls
    initFilters();

    // Initialize search input
    initSearch();

    // Load initial pet listings
    loadPets(FilterState);

    // Load More button
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMore);
    }

    console.log('🐾 Adopt page initialized');
});

// ============================================================
// GLOBAL EXPORTS
// ============================================================

window.toggleSavePet = toggleSavePet;
window.clearFilters  = clearFilters;
window.loadMore      = loadMore;

window.PawCareAdopt = {
    loadPets,
    renderPetCards,
    initFilters,
    initSearch,
    toggleSavePet,
    loadMore,
    clearFilters,
    FilterState
};
