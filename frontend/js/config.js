// ============================================================
// PetCare Connect - Supabase Configuration
// ============================================================
// This file initializes the Supabase client which is used
// throughout the frontend for authentication and database queries.
//
// HOW TO SET UP:
// 1. Go to https://supabase.com and create a free account
// 2. Create a new project
// 3. Go to Settings > API
// 4. Copy your Project URL and anon/public key
// 5. Replace the placeholder values below
// ============================================================

(function initializePetCareConfig() {
/**
 * Your Supabase project URL
 * Example: 'https://abcdefghijklmnop.supabase.co'
 */
const SUPABASE_URL = 'https://vpliwuomrptrfjbjskzw.supabase.co';

/**
 * Your Supabase anonymous (public) key
 * This key is safe to expose in frontend code - it has limited permissions
 */
const SUPABASE_ANON_KEY = 'sb_publishable_13Z8gY_rHRplljYEs7jIMg__BprTs68';

/**
 * Base URL for your backend Express API
 * Change this when deploying to production
 */
const API_BASE_URL = (() => {
    const { hostname, origin, port, protocol } = window.location;
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';

    if (protocol === 'file:' || origin === 'null' || (isLocalHost && port !== '3000')) {
        return 'http://localhost:3000/api';
    }

    return `${origin}/api`;
})();

// ============================================================
// Initialize Supabase Client
// The Supabase library is loaded via CDN in HTML files
// Make sure to include this in your HTML before config.js:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// ============================================================

let supabaseClient;
const hasSupabaseConfig =
    SUPABASE_URL.startsWith('https://') &&
    !SUPABASE_URL.includes('YOUR_SUPABASE') &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE');

try {
    // window.supabase is provided by the Supabase CDN script
    if (hasSupabaseConfig && window.supabase && typeof window.supabase.createClient === 'function') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                // Automatically refresh the session token before it expires
                autoRefreshToken: true,
                // Store session in localStorage so user stays logged in across tabs
                persistSession: true,
                // Detect session from URL (needed for magic links / OAuth)
                detectSessionInUrl: true
            }
        });
        console.log('✅ Supabase client initialized successfully');
    } else if (!hasSupabaseConfig) {
        console.warn('Supabase is not configured. Add real values to frontend/js/config.js before using database features.');
    } else {
        console.error('❌ Supabase CDN not loaded. Make sure to include the Supabase script tag before config.js');
    }
} catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error.message);
}

// ============================================================
// App-Wide Configuration Object
// Access anywhere via: window.PAWCARE_CONFIG.supabase
// ============================================================

window.PAWCARE_CONFIG = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    API_BASE_URL,
    supabase: supabaseClient,

    // Application metadata
    APP_NAME: 'PetCare Connect',
    APP_VERSION: '1.0.0',

    // Pagination defaults
    PETS_PER_PAGE: 12,
    REVIEWS_PER_PAGE: 10,

    // Supported pet species
    SPECIES: ['dog'],

    // Adoption application statuses
    APPLICATION_STATUSES: ['pending', 'under_review', 'approved', 'rejected', 'withdrawn'],

    // Appointment statuses
    APPOINTMENT_STATUSES: ['scheduled', 'confirmed', 'completed', 'cancelled'],

    // User roles
    ROLES: {
        USER: 'user',
        ADMIN: 'admin',
        SHELTER_STAFF: 'shelter_staff'
    }
};

// Make supabase directly accessible as a shorthand
window.supabaseClient = supabaseClient;

// 20 Dog Profiles with unique photos and amounts in Indian Rupees (₹)
window.DEMO_PETS = [
  {
    id: '22222222-0000-0000-0000-000000000001', name: 'Bruno', species: 'dog', breed: 'Golden Retriever',
    age_years: 3, age_months: 0, gender: 'male', size: 'large', color: 'Golden', location: 'Mumbai',
    status: 'available', adoption_status: 'available', adoption_fee: 1500, vaccinated: true, dewormed: true, neutered: true,
    shelter_name: 'Paws & Hearts Animal Shelter',
    primary_image: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&auto=format&fit=crop&q=80',
    photo_url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&auto=format&fit=crop&q=80',
    description: 'Bruno is an affectionate, playful Golden Retriever who loves fetch and swimming. He is house-trained and gets along wonderfully with children and other dogs.'
  },
  {
    id: '22222222-0000-0000-0000-000000000002', name: 'Rani', species: 'dog', breed: 'Labrador Mix',
    age_years: 1, age_months: 6, gender: 'female', size: 'medium', color: 'Black', location: 'New Delhi',
    status: 'available', adoption_status: 'available', adoption_fee: 1000, vaccinated: true, dewormed: true, neutered: true,
    shelter_name: 'Delhi Animal Welfare Society',
    primary_image: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=800&auto=format&fit=crop&q=80',
    photo_url: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=800&auto=format&fit=crop&q=80',
    description: 'Rani is a young Labrador mix rescued from a Delhi roadside. She is incredibly smart and has already learnt basic commands. She is gentle with children.'
  },
  {
    id: '22222222-0000-0000-0000-000000000003', name: 'Max', species: 'dog', breed: 'German Shepherd',
    age_years: 5, age_months: 0, gender: 'male', size: 'large', color: 'Black and Tan', location: 'Bangalore',
    status: 'available', adoption_status: 'available', adoption_fee: 1200, vaccinated: true, dewormed: true, neutered: false,
    shelter_name: 'Bangalore Pet Rescue Foundation',
    primary_image: 'https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=800&auto=format&fit=crop&q=80',
    photo_url: 'https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=800&auto=format&fit=crop&q=80',
    description: 'Max is a dignified, loyal German Shepherd. He is deeply devoted once he bonds with his family and makes an excellent companion.'
  },
  {
    id: '22222222-0000-0000-0000-000000000004', name: 'Coco', species: 'dog', breed: 'Indian Pariah Dog',
    age_years: 2, age_months: 3, gender: 'female', size: 'medium', color: 'Fawn', location: 'Chennai',
    status: 'available', adoption_status: 'available', adoption_fee: 800, vaccinated: true, dewormed: true, neutered: true,
    shelter_name: 'Chennai Companion Animal Shelter',
    primary_image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop&q=80',
    photo_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop&q=80',
    description: 'Coco is a street-rescued Indie dog full of life and love. She is extremely adaptable, thrives in apartments, and has a playful demeanour.'
  },
  {
    id: '22222222-0000-0000-0000-000000000005', name: 'Rocky', species: 'dog', breed: 'Beagle',
    age_years: 4, age_months: 0, gender: 'male', size: 'small', color: 'Tricolour', location: 'Pune',
    status: 'available', adoption_status: 'available', adoption_fee: 1000, vaccinated: true, dewormed: true, neutered: false,
    shelter_name: 'Pune Furry Friends Rescue',
    primary_image: 'https://images.unsplash.com/photo-1505628346881-b72b27e84530?w=800&auto=format&fit=crop&q=80',
    photo_url: 'https://images.unsplash.com/photo-1505628346881-b72b27e84530?w=800&auto=format&fit=crop&q=80',
    description: 'Rocky is a curious, nose-led Beagle who loves sniffing out adventures. He is great with other pets and has a hilarious, cheerful personality.'
  },
  {
    id: '22222222-0000-0000-0000-000000000006', name: 'Simba', species: 'dog', breed: 'Indian Pariah Dog',
    age_years: 0, age_months: 4, gender: 'male', size: 'small', color: 'Cream', location: 'Mumbai',
    status: 'available', adoption_status: 'available', adoption_fee: 500, vaccinated: true, dewormed: true, neutered: false,
    shelter_name: 'Paws & Hearts Animal Shelter',
    primary_image: 'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=800&auto=format&fit=crop&q=80',
    photo_url: 'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=800&auto=format&fit=crop&q=80',
    description: 'Simba is an adorable 4-month-old Indie pup who was found abandoned. He is playful, bottle-fed, and loves chasing toys and cuddling.'
  },
  {
    id: '22222222-0000-0000-0000-000000000007', name: 'Daisy', species: 'dog', breed: 'Indie',
    age_years: 1, age_months: 2, gender: 'female', size: 'medium', color: 'Tan', location: 'Mumbai',
    status: 'available', adoption_status: 'available', adoption_fee: 750, vaccinated: true, dewormed: true, neutered: false,
    shelter_name: 'Paws & Hearts Animal Shelter',
    primary_image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=80',
    photo_url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=80',
    description: 'Daisy is a gentle, playful Indie who enjoys leisurely walks and greeting new human friends.'
  },
  {
    id: '22222222-0000-0000-0000-000000000008', name: 'Milo', species: 'dog', breed: 'Shih Tzu',
    age_years: 3, age_months: 5, gender: 'male', size: 'small', color: 'White and Brown', location: 'New Delhi',
    status: 'available', adoption_status: 'available', adoption_fee: 1800, vaccinated: true, dewormed: true, neutered: true,
    shelter_name: 'Delhi Animal Welfare Society',
    primary_image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&auto=format&fit=crop&q=80',
    photo_url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&auto=format&fit=crop&q=80',
    description: 'Milo is an affectionate little companion who loves quiet evenings, gentle brushing, and cozy indoor naps.'
  },
  {
    id: '22222222-0000-0000-0000-000000000009', name: 'Zara', species: 'dog', breed: 'Border Collie',
    age_years: 2, age_months: 0, gender: 'female', size: 'medium', color: 'Black and White', location: 'Bangalore',
    status: 'available', adoption_status: 'available', adoption_fee: 1500, vaccinated: true, dewormed: true, neutered: true,
    shelter_name: 'Bangalore Pet Rescue Foundation',
    primary_image: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800&auto=format&fit=crop&q=80',
    photo_url: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800&auto=format&fit=crop&q=80',
    description: 'Zara is an exceptionally bright, agile dog who loves agility games, frisbee, and outdoor adventures.'
  },
  {
    id: '22222222-0000-0000-0000-000000000010', name: 'Ollie', species: 'dog', breed: 'Dachshund',
    age_years: 4, age_months: 1, gender: 'male', size: 'small', color: 'Red', location: 'Chennai',
    status: 'available', adoption_status: 'available', adoption_fee: 1200, vaccinated: true, dewormed: true, neutered: false,
    shelter_name: 'Chennai Companion Animal Shelter',
    primary_image: 'https://images.unsplash.com/photo-1612195583950-b8fd34c87093?w=800&auto=format&fit=crop&q=80',
    photo_url: 'https://images.unsplash.com/photo-1612195583950-b8fd34c87093?w=800&auto=format&fit=crop&q=80',
    description: 'Ollie is a curious little dog with a big personality and a passion for exploring the garden.'
  },
  {
    id: '22222222-0000-0000-0000-000000000011', name: 'Maya', species: 'dog', breed: 'Indie',
    age_years: 0, age_months: 7, gender: 'female', size: 'small', color: 'Brown', location: 'Pune',
    status: 'available', adoption_status: 'available', adoption_fee: 500, vaccinated: true, dewormed: true, neutered: false,
    shelter_name: 'Pune Furry Friends Rescue',
    primary_image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80',
    photo_url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80',
    description: 'Maya is a sweet puppy learning her basic cues, eager to please, and full of bubbly affection.'
  },
  {
    id: '22222222-0000-0000-0000-000000000012', name: 'Thor', species: 'dog', breed: 'Boxer',
    age_years: 3, age_months: 8, gender: 'male', size: 'large', color: 'Fawn', location: 'Mumbai',
    status: 'available', adoption_status: 'available', adoption_fee: 1600, vaccinated: true, dewormed: true, neutered: true,
    shelter_name: 'Paws & Hearts Animal Shelter',
    primary_image: 'https://images.unsplash.com/photo-1546975490-a79abdd54533?w=800&auto=format&fit=crop&q=80',
    photo_url: 'https://images.unsplash.com/photo-1546975490-a79abdd54533?w=800&auto=format&fit=crop&q=80',
    description: 'Thor is an energetic, humorous Boxer who loves to bounce around, play tug-of-war, and snuggle up.'
  },
  {
    id: '22222222-0000-0000-0000-000000000013', name: 'Ruby', species: 'dog', breed: 'Cocker Spaniel',
    age_years: 5, age_months: 0, gender: 'female', size: 'medium', color: 'Golden', location: 'New Delhi',
    status: 'available', adoption_status: 'available', adoption_fee: 1400, vaccinated: true, dewormed: true, neutered: true,
    shelter_name: 'Delhi Animal Welfare Society',
    primary_image: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=800&auto=format&fit=crop&q=80',
    photo_url: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=800&auto=format&fit=crop&q=80',
    description: 'Ruby has silky golden ears, a calm disposition, and a loving gaze that melts everyone who meets her.'
  },
  {
    id: '22222222-0000-0000-0000-000000000014', name: 'Benny', species: 'dog', breed: 'Pug',
    age_years: 2, age_months: 6, gender: 'male', size: 'small', color: 'Fawn', location: 'Bangalore',
    status: 'available', adoption_status: 'available', adoption_fee: 1100, vaccinated: true, dewormed: true, neutered: false,
    shelter_name: 'Bangalore Pet Rescue Foundation',
    primary_image: 'https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?w=800&auto=format&fit=crop&q=80',
    photo_url: 'https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?w=800&auto=format&fit=crop&q=80',
    description: 'Benny is a charming Pug who will gladly curl up at your feet while you study or work from home.'
  },
  {
    id: '22222222-0000-0000-0000-000000000015', name: 'Nala', species: 'dog', breed: 'Great Dane',
    age_years: 1, age_months: 11, gender: 'female', size: 'extra_large', color: 'Blue', location: 'Chennai',
    status: 'available', adoption_status: 'available', adoption_fee: 2500, vaccinated: true, dewormed: true, neutered: false,
    shelter_name: 'Chennai Companion Animal Shelter',
    primary_image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&auto=format&fit=crop&q=80',
    photo_url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&auto=format&fit=crop&q=80',
    description: 'Nala is a majestic, gentle giant with a quiet nature who loves relaxing walks and expansive beds.'
  },
  {
    id: '22222222-0000-0000-0000-000000000016', name: 'Finn', species: 'dog', breed: 'Australian Shepherd',
    age_years: 2, age_months: 9, gender: 'male', size: 'large', color: 'Blue Merle', location: 'Pune',
    status: 'available', adoption_status: 'available', adoption_fee: 1800, vaccinated: true, dewormed: true, neutered: true,
    shelter_name: 'Pune Furry Friends Rescue',
    primary_image: 'https://images.unsplash.com/photo-1503256207526-0d5d80fa2f47?w=800&auto=format&fit=crop&q=80',
    photo_url: 'https://images.unsplash.com/photo-1503256207526-0d5d80fa2f47?w=800&auto=format&fit=crop&q=80',
    description: 'Finn has mesmerizing eyes and limitless curiosity. He thrives with active companions who enjoy training.'
  },
  {
    id: '22222222-0000-0000-0000-000000000017', name: 'Penny', species: 'dog', breed: 'Poodle Mix',
    age_years: 6, age_months: 3, gender: 'female', size: 'small', color: 'Apricot', location: 'Mumbai',
    status: 'available', adoption_status: 'available', adoption_fee: 1200, vaccinated: true, dewormed: true, neutered: true,
    shelter_name: 'Paws & Hearts Animal Shelter',
    primary_image: 'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=800&auto=format&fit=crop&q=80',
    photo_url: 'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=800&auto=format&fit=crop&q=80',
    description: 'Penny is a hypoallergenic, low-shedding poodle mix who loves lap sitting and polite greetings.'
  },
  {
    id: '22222222-0000-0000-0000-000000000018', name: 'Koda', species: 'dog', breed: 'Siberian Husky',
    age_years: 3, age_months: 2, gender: 'male', size: 'large', color: 'Grey and White', location: 'New Delhi',
    status: 'available', adoption_status: 'available', adoption_fee: 2200, vaccinated: true, dewormed: true, neutered: false,
    shelter_name: 'Delhi Animal Welfare Society',
    primary_image: 'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?w=800&auto=format&fit=crop&q=80',
    photo_url: 'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?w=800&auto=format&fit=crop&q=80',
    description: 'Koda is a vocal, friendly Siberian Husky who loves morning runs, cool weather, and playtime.'
  },
  {
    id: '22222222-0000-0000-0000-000000000019', name: 'Rosie', species: 'dog', breed: 'Dachshund Mix',
    age_years: 1, age_months: 4, gender: 'female', size: 'small', color: 'Chocolate', location: 'Bangalore',
    status: 'available', adoption_status: 'available', adoption_fee: 1300, vaccinated: true, dewormed: true, neutered: false,
    shelter_name: 'Bangalore Pet Rescue Foundation',
    primary_image: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=800&auto=format&fit=crop&q=80',
    photo_url: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=800&auto=format&fit=crop&q=80',
    description: 'Rosie is a cheerful short-legged explorer who adores soft squeaky toys and morning garden walks.'
  },
  {
    id: '22222222-0000-0000-0000-000000000020', name: 'Ace', species: 'dog', breed: 'Doberman Pinscher',
    age_years: 4, age_months: 6, gender: 'male', size: 'large', color: 'Black and Rust', location: 'Chennai',
    status: 'available', adoption_status: 'available', adoption_fee: 2000, vaccinated: true, dewormed: true, neutered: true,
    shelter_name: 'Chennai Companion Animal Shelter',
    primary_image: 'https://images.unsplash.com/photo-1568572933382-74d440642117?w=800&auto=format&fit=crop&q=80',
    photo_url: 'https://images.unsplash.com/photo-1568572933382-74d440642117?w=800&auto=format&fit=crop&q=80',
    description: 'Ace is an athletic, alert, deeply loyal Doberman who bonds closely with his primary family members.'
  }
];

window.PAWCARE_CONFIG.DEMO_PETS = window.DEMO_PETS;

console.log(`🐾 ${window.PAWCARE_CONFIG.APP_NAME} v${window.PAWCARE_CONFIG.APP_VERSION} - Config loaded with 20 dog profiles`);
})();
