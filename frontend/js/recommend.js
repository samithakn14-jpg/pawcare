// ============================================================
// PetCare Connect - Pet Recommendation Engine
// ============================================================
// A multi-step quiz that scores real pets from the database
// based on the user's lifestyle answers and recommends the
// best matches.
//
// Depends on: config.js, main.js
// ============================================================

// ============================================================
// QUIZ CONFIGURATION
// Each question has an id, text, icon, and array of options.
// Each option carries a "scores" object that maps pet traits
// to a numeric score contribution.
// ============================================================

const QUIZ_QUESTIONS = [
    {
        id: 'home',
        text: 'What type of home do you live in?',
        icon: '🏠',
        subtitle: 'This helps us match pets to your space.',
        options: [
            { value: 'apartment', label: '🏢 Apartment / Flat',   scores: { small_space: 10, small_dog: 4 } },
            { value: 'house',     label: '🏡 House with a yard',  scores: { outdoor: 8, dog: 4 } },
            { value: 'farm',      label: '🌾 Farm / Large space', scores: { outdoor: 10, dog: 5, large_dog: 5 } }
        ]
    },
    {
        id: 'experience',
        text: 'What is your pet ownership experience?',
        icon: '🎓',
        subtitle: 'Be honest — we want the best match for you!',
        options: [
            { value: 'first_time',   label: '🌱 First-time owner',     scores: { low_maintenance: 8 } },
            { value: 'some',         label: '📚 Some experience',       scores: { moderate: 6 } },
            { value: 'experienced',  label: '⭐ Experienced owner',     scores: { any_experience: 5, dog: 2 } }
        ]
    },
    {
        id: 'time',
        text: 'How much time can you spend with your pet daily?',
        icon: '⏰',
        subtitle: 'On an average workday.',
        options: [
            { value: 'low',      label: '⌚ Less than 1 hour',  scores: { low_time: 10 } },
            { value: 'moderate', label: '🕐 1 to 3 hours',      scores: { moderate_time: 8, dog: 2 } },
            { value: 'high',     label: '🕒 More than 3 hours', scores: { high_time: 10, dog: 5 } }
        ]
    },
    {
        id: 'activity',
        text: 'How active is your lifestyle?',
        icon: '🏃',
        subtitle: 'We want your pet to match your energy!',
        options: [
            { value: 'low',      label: '🛋️ I prefer relaxing at home',    scores: { low_energy: 10 } },
            { value: 'moderate', label: '🚶 I go on occasional walks',      scores: { moderate_energy: 8, small_dog: 3 } },
            { value: 'high',     label: '🏋️ I\'m very active / sporty',    scores: { high_energy: 10, dog: 5, large_dog: 3 } }
        ]
    },
    {
        id: 'family',
        text: 'What is your household situation?',
        icon: '👨‍👩‍👧',
        subtitle: 'Some pets do better in certain environments.',
        options: [
            { value: 'single',   label: '🙋 Living alone',            scores: { independent_pet: 5 } },
            { value: 'couple',   label: '👫 Couple (no children)',    scores: { social_pet: 5, dog: 2 } },
            { value: 'family',   label: '👨‍👩‍👧 Family with children',  scores: { family_friendly: 8, dog: 4 } },
            { value: 'seniors',  label: '👴 Senior / Elderly',        scores: { low_energy: 5, small_dog: 3 } }
        ]
    }
];

// ============================================================
// TRAIT SCORING TABLE
// Pets are scored against trait values from quiz answers.
// Each pet from the DB is scored based on its species, size,
// and energy level matching the user's preferences.
// ============================================================

/**
 * Score a single pet against the accumulated quiz scores.
 *
 * @param {object} pet - Pet object from Supabase
 * @param {object} scores - Accumulated score map from quiz answers
 * @returns {number} Total compatibility score for this pet
 */
const scorePet = (pet, scores) => {
    let total = 0;

    const species = pet.species?.toLowerCase();
    const size = pet.size?.toLowerCase();
    const energyLevel = pet.energy_level?.toLowerCase();

    // Species match score
    if (species && scores[species]) total += scores[species];

    // Size preferences
    if (size === 'small' && scores.small_dog)  total += scores.small_dog;
    if (size === 'large' && scores.large_dog)  total += scores.large_dog;
    if ((size === 'small' || size === 'medium') && scores.small_space) total += 6;

    // Energy level matching
    if (energyLevel === 'low'      && scores.low_energy)      total += scores.low_energy;
    if (energyLevel === 'moderate' && scores.moderate_energy) total += scores.moderate_energy;
    if (energyLevel === 'high'     && scores.high_energy)     total += scores.high_energy;

    // Family-friendly pets
    if (pet.is_good_with_kids && scores.family_friendly)      total += scores.family_friendly;

    // Dogs benefit from owners with time for daily exercise and interaction.
    if (species === 'dog' && scores.high_time) total += 4;

    // Outdoor pets
    if (pet.needs_outdoor && scores.outdoor) total += scores.outdoor;

    // Low maintenance boost
    if (pet.experience_required === 'beginner' && scores.low_maintenance) total += 5;
    if (pet.experience_required === 'any'      && scores.any_experience)  total += 3;

    return total;
};

// ============================================================
// RECOMMENDATION QUIZ STATE
// ============================================================

const QuizState = {
    currentStep: 0,
    answers: {},       // { questionId: optionValue }
    scores: {},        // Accumulated trait scores
    results: [],       // Scored pets from database
    containerId: null  // Target DOM container
};

// ============================================================
// RENDER FUNCTIONS
// ============================================================

/**
 * Initialize the recommendation quiz inside a container.
 * Call this on the recommend.html page.
 *
 * @param {string} containerId - ID of the container element
 */
const initRecommendQuiz = (containerId = 'recommend-container') => {
    QuizState.containerId = containerId;
    QuizState.currentStep = 0;
    QuizState.answers = {};
    QuizState.scores = {};
    QuizState.results = [];

    renderQuizStep();
};

/**
 * Render the current quiz step inside the container.
 */
const renderQuizStep = () => {
    const container = document.getElementById(QuizState.containerId);
    if (!container) return;

    const question = QUIZ_QUESTIONS[QuizState.currentStep];
    const totalSteps = QUIZ_QUESTIONS.length;
    const progressPercent = Math.round((QuizState.currentStep / totalSteps) * 100);

    // Build options HTML
    const optionsHTML = question.options.map(option => `
        <button class="quiz-option-btn"
                data-value="${option.value}"
                onclick="selectQuizOption('${question.id}', '${option.value}', ${JSON.stringify(option.scores).replace(/"/g, '&quot;')}, this)">
            <span class="option-label">${option.label}</span>
        </button>
    `).join('');

    container.innerHTML = `
        <div class="quiz-card" style="max-width:600px; margin:0 auto;">

            <!-- Progress Bar -->
            <div class="quiz-progress mb-4">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <small class="text-muted fw-semibold">Step ${QuizState.currentStep + 1} of ${totalSteps}</small>
                    <small class="text-muted">${progressPercent}% complete</small>
                </div>
                <div class="progress" style="height:8px; border-radius:4px;">
                    <div class="progress-bar bg-primary progress-bar-striped progress-bar-animated"
                         style="width:${progressPercent}%; border-radius:4px; transition: width 0.5s ease;"></div>
                </div>
            </div>

            <!-- Question Card -->
            <div class="card border-0 shadow-sm p-4 p-md-5" style="border-radius:20px;">
                <!-- Icon -->
                <div class="text-center mb-3">
                    <div style="font-size:3.5rem; line-height:1;">${question.icon}</div>
                </div>

                <!-- Question Text -->
                <h3 class="text-center fw-bold mb-2" style="font-size:1.4rem;">${question.text}</h3>
                <p class="text-center text-muted mb-4">${question.subtitle || ''}</p>

                <!-- Options Grid -->
                <div class="quiz-options-grid d-flex flex-column gap-3">
                    ${optionsHTML}
                </div>

                <!-- Navigation Buttons -->
                <div class="d-flex justify-content-between mt-4">
                    ${QuizState.currentStep > 0 ? `
                    <button class="btn btn-outline-secondary rounded-pill px-4"
                            onclick="quizGoBack()">
                        ← Back
                    </button>` : '<div></div>'}

                    <div id="quiz-next-btn-wrapper"></div>
                </div>
            </div>
        </div>
    `;

    // Add quiz option styles if not already added
    injectQuizStyles();
};

/**
 * Inject CSS for quiz options if not already present.
 */
const injectQuizStyles = () => {
    if (document.getElementById('quiz-styles')) return;

    const style = document.createElement('style');
    style.id = 'quiz-styles';
    style.textContent = `
        .quiz-option-btn {
            background: white;
            border: 2px solid #e0e0e0;
            border-radius: 14px;
            padding: 14px 20px;
            font-size: 15px;
            font-weight: 500;
            color: #333;
            text-align: left;
            cursor: pointer;
            transition: all 0.25s ease;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .quiz-option-btn:hover {
            border-color: #667eea;
            background: #f0f4ff;
            transform: translateX(4px);
        }
        .quiz-option-btn.selected {
            border-color: #667eea;
            background: linear-gradient(135deg, #667eea15, #764ba215);
            color: #667eea;
            font-weight: 600;
        }
        .quiz-result-card {
            border: none;
            border-radius: 16px;
            overflow: hidden;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
        }
        .quiz-result-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 12px 30px rgba(0,0,0,0.12);
        }
        .compatibility-bar {
            height: 8px;
            border-radius: 4px;
            background: #e0e0e0;
            overflow: hidden;
        }
        .compatibility-fill {
            height: 100%;
            border-radius: 4px;
            background: linear-gradient(90deg, #667eea, #764ba2);
            transition: width 1s ease;
        }
    `;
    document.head.appendChild(style);
};

/**
 * Handle user selecting a quiz option.
 * Called by the inline onclick on each option button.
 *
 * @param {string} questionId - The question's id
 * @param {string} value - The selected option's value
 * @param {object} scores - Score contributions from this option
 * @param {HTMLElement} btn - The clicked button element
 */
const selectQuizOption = (questionId, value, scoresJSON, btn) => {
    // Mark the selected option
    document.querySelectorAll('.quiz-option-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    // Parse scores (may come as string from onclick attribute)
    const optionScores = typeof scoresJSON === 'string'
        ? JSON.parse(scoresJSON.replace(/&quot;/g, '"'))
        : scoresJSON;

    // Store the answer
    QuizState.answers[questionId] = value;

    // Accumulate scores
    Object.entries(optionScores).forEach(([trait, points]) => {
        QuizState.scores[trait] = (QuizState.scores[trait] || 0) + points;
    });

    // Show next button after selection
    const nextWrapper = document.getElementById('quiz-next-btn-wrapper');
    if (nextWrapper) {
        const isLastStep = QuizState.currentStep === QUIZ_QUESTIONS.length - 1;
        nextWrapper.innerHTML = `
            <button class="btn btn-primary rounded-pill px-4 fw-semibold"
                    onclick="${isLastStep ? 'submitQuiz()' : 'quizNextStep()'}"
                    style="background:linear-gradient(135deg,#667eea,#764ba2); border:none;">
                ${isLastStep ? '🔍 Find My Match!' : 'Next →'}
            </button>
        `;
    }
};

/**
 * Go to the next quiz question.
 */
const quizNextStep = () => {
    const currentQuestion = QUIZ_QUESTIONS[QuizState.currentStep];

    // Ensure user answered the current question
    if (!QuizState.answers[currentQuestion.id]) {
        if (window.showToast) showToast('Please select an option to continue!', 'warning');
        return;
    }

    QuizState.currentStep++;
    renderQuizStep();
};

/**
 * Go back to the previous quiz question.
 */
const quizGoBack = () => {
    if (QuizState.currentStep > 0) {
        QuizState.currentStep--;
        renderQuizStep();
    }
};

/**
 * Submit the quiz and fetch/score pets from Supabase.
 * Shows loading, fetches available pets, scores them, and renders results.
 */
const submitQuiz = async () => {
    const container = document.getElementById(QuizState.containerId);
    if (!container) return;

    // Show loading state
    container.innerHTML = `
        <div class="text-center py-5">
            <div style="font-size:4rem; margin-bottom:1.5rem; animation: spin 2s linear infinite;">🐾</div>
            <h4 class="fw-bold">Finding your perfect match...</h4>
            <p class="text-muted">Analyzing your preferences...</p>
        </div>
        <style>
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
    `;

    try {
        const sb = window.PAWCARE_CONFIG?.supabase;
        if (!sb) throw new Error('Supabase not configured');

        const { data: pets, error } = await sb
            .from('pets')
            .select('*')
            .eq('adoption_status', 'available')
            .eq('is_listed', true)
            .limit(50);
        if (error) throw error;

        if (!pets || pets.length === 0) {
            renderNoResults();
            return;
        }

        // Score each pet
        const scoredPets = pets.map(pet => ({
            ...pet,
            compatibilityScore: scorePet(pet, QuizState.scores)
        }));

        // Sort by score (highest first), take top 6
        scoredPets.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
        QuizState.results = scoredPets.slice(0, 6);

        // Calculate max possible score for percentage display
        const maxScore = Math.max(...scoredPets.map(p => p.compatibilityScore)) || 1;

        renderResults(QuizState.results, maxScore);

    } catch (error) {
        console.error('Quiz submit error:', error);
        container.innerHTML = `
            <div class="text-center py-5">
                <div style="font-size:3rem;">😔</div>
                <h4 class="fw-bold mt-3">Something went wrong</h4>
                <p class="text-muted">${error.message || 'Could not load pets. Please try again.'}</p>
                <button class="btn btn-primary rounded-pill px-4 mt-2" onclick="initRecommendQuiz('${QuizState.containerId}')">
                    Try Again
                </button>
            </div>
        `;
    }
};

/**
 * Render the quiz results grid.
 *
 * @param {Array} pets - Scored pet objects
 * @param {number} maxScore - The highest score (for percentage calculation)
 */
const renderResults = (pets, maxScore) => {
    const container = document.getElementById(QuizState.containerId);
    if (!container) return;

    const formatAge = window.PawCareUtils?.formatAge || ((y, m) => `${y}y ${m}m`);
    const sanitize  = window.sanitizeInput || (s => s);

    const petCardsHTML = pets.map(pet => {
        const compat = Math.min(100, Math.round((pet.compatibilityScore / maxScore) * 100));
        const compatColor = compat >= 80 ? '#28a745' : compat >= 50 ? '#ffc107' : '#6c757d';
        const imageUrl = pet.photos?.[0] || pet.primary_image || pet.photo_url
            || `https://via.placeholder.com/300x200?text=${encodeURIComponent(pet.name)}`;
        const ageText = formatAge(pet.age_years || 0, pet.age_months || 0);

        return `
        <div class="col-lg-4 col-md-6 mb-4">
            <div class="card quiz-result-card h-100">
                <!-- Pet Image -->
                <div style="height:200px; overflow:hidden; position:relative;">
                    <img src="${imageUrl}" alt="${sanitize(pet.name)}"
                         style="width:100%;height:100%;object-fit:cover;"
                         onerror="this.src='https://via.placeholder.com/300x200?text=No+Photo'">

                    <!-- Compatibility Badge -->
                    <div style="position:absolute;top:12px;right:12px;background:white;border-radius:24px;
                                padding:4px 12px;font-size:13px;font-weight:700;color:${compatColor};
                                box-shadow:0 2px 10px rgba(0,0,0,0.15);">
                        ${compat}% Match
                    </div>
                </div>

                <!-- Card Body -->
                <div class="card-body p-3">
                    <h5 class="fw-bold mb-1">${sanitize(pet.name)}</h5>
                    <p class="text-muted small mb-2">
                        ${pet.breed ? sanitize(pet.breed) + ' · ' : ''}
                        ${ageText}
                        ${pet.gender ? ' · ' + pet.gender : ''}
                    </p>

                    <!-- Compatibility Bar -->
                    <div class="d-flex align-items-center gap-2 mb-3">
                        <span class="text-muted" style="font-size:12px;white-space:nowrap;">Compatibility</span>
                        <div class="compatibility-bar flex-grow-1">
                            <div class="compatibility-fill"
                                 style="width:${compat}%;background:linear-gradient(90deg,${compatColor},${compatColor}99);">
                            </div>
                        </div>
                        <span style="font-size:12px;font-weight:700;color:${compatColor};">${compat}%</span>
                    </div>

                    <!-- Pet Tags -->
                    <div class="d-flex flex-wrap gap-1 mb-3">
                        ${pet.is_vaccinated ? '<span class="badge bg-success bg-opacity-10 text-success" style="font-size:11px;">💉 Vaccinated</span>' : ''}
                        ${pet.is_neutered   ? '<span class="badge bg-info bg-opacity-10 text-info" style="font-size:11px;">✂️ Neutered</span>' : ''}
                        ${pet.is_good_with_kids ? '<span class="badge bg-warning bg-opacity-10 text-warning" style="font-size:11px;">👶 Kid-friendly</span>' : ''}
                    </div>
                    <p class="fw-bold mb-3">💰 ${window.PawCareUtils.formatAdoptionFee(pet.adoption_fee)}</p>

                    <a href="pet-detail.html?id=${encodeURIComponent(pet.id)}"
                       class="btn btn-primary w-100 rounded-pill fw-semibold"
                       style="background:linear-gradient(135deg,#667eea,#764ba2);border:none;font-size:14px;">
                        View ${sanitize(pet.name)} →
                    </a>
                </div>
            </div>
        </div>
        `;
    }).join('');

    container.innerHTML = `
        <!-- Header -->
        <div class="text-center mb-5">
            <div style="font-size:3rem;">🎉</div>
            <h2 class="fw-bold mt-3 mb-2">Your Perfect Matches!</h2>
            <p class="text-muted" style="max-width:500px;margin:auto;">
                Based on your lifestyle, we think these pets would be perfect for you.
                Remember — every pet deserves love regardless of their match score! 💛
            </p>
        </div>

        <!-- Pet Results Grid -->
        <div class="row">
            ${petCardsHTML}
        </div>

        <!-- Disclaimer -->
        <div class="alert alert-info border-0 rounded-4 mt-3" style="background:#f0f4ff;">
            <div class="d-flex gap-3">
                <span style="font-size:1.8rem;">💡</span>
                <div>
                    <strong>Note:</strong> These recommendations are based on your questionnaire answers
                    and general pet traits. We strongly encourage you to <strong>visit the shelter</strong>
                    and spend time with a pet before making your final decision. 
                    The best match is the one you connect with in person! 🐾
                </div>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="text-center mt-4 d-flex flex-wrap gap-3 justify-content-center">
            <button class="btn btn-outline-primary rounded-pill px-5"
                    onclick="initRecommendQuiz('${QuizState.containerId}')">
                🔄 Retake Quiz
            </button>
            <a href="adopt.html" class="btn btn-primary rounded-pill px-5"
               style="background:linear-gradient(135deg,#667eea,#764ba2);border:none;">
                🐾 Browse All Pets
            </a>
        </div>
    `;

    // Animate compatibility bars on load
    setTimeout(() => {
        document.querySelectorAll('.compatibility-fill').forEach(bar => {
            const width = bar.style.width;
            bar.style.width = '0%';
            requestAnimationFrame(() => { bar.style.width = width; });
        });
    }, 100);
};

/**
 * Show message when no results are found.
 */
const renderNoResults = () => {
    const container = document.getElementById(QuizState.containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="text-center py-5">
            <div style="font-size:4rem;">🔍</div>
            <h4 class="fw-bold mt-3">No matches found</h4>
            <p class="text-muted">We don't have any pets matching your preferences right now.</p>
            <p class="text-muted">New pets are added regularly, so check back soon!</p>
            <div class="d-flex gap-3 justify-content-center mt-4">
                <button class="btn btn-outline-primary rounded-pill px-4"
                        onclick="initRecommendQuiz('${QuizState.containerId}')">
                    Retake Quiz
                </button>
                <a href="adopt.html" class="btn btn-primary rounded-pill px-4">
                    Browse All Pets
                </a>
            </div>
        </div>
    `;
};

// ============================================================
// GLOBAL EXPORTS
// ============================================================

window.initRecommendQuiz = initRecommendQuiz;
window.selectQuizOption  = selectQuizOption;
window.quizNextStep      = quizNextStep;
window.quizGoBack        = quizGoBack;
window.submitQuiz        = submitQuiz;

window.PawCareRecommend = {
    initRecommendQuiz,
    QUIZ_QUESTIONS,
    scorePet
};

console.log('🐾 PetCare Recommendation Engine loaded');
