// ============================================================
// PetCare Connect - Chatbot Module
// ============================================================
// An AI-powered chatbot for pet adoption, care, and shelter questions.
// Depends on: config.js, main.js
// ============================================================

/**
 * Knowledge base object.
 * Each entry has an array of keywords and an array of possible responses.
 * When a user message contains one of the keywords, a random response is chosen.
 */
const CHATBOT_KNOWLEDGE_BASE = {

    // ── Greetings ────────────────────────────────────────────
    greeting: {
        keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'namaste', 'hii', 'helo'],
        responses: [
            "Hello there! 🐾 I'm Pawsy, your PetCare Connect assistant! How can I help you today?",
            "Hi! Welcome to PetCare Connect! 😊 I'm here to help with any questions about pet adoption, care, or our shelter.",
            "Hey! Great to see you! 🐶 What can I help you with today?"
        ]
    },

    // ── Adoption Process ─────────────────────────────────────
    adoptionProcess: {
        keywords: ['adopt', 'adoption', 'apply', 'application', 'how to adopt', 'process', 'procedure', 'steps'],
        responses: [
            "🐾 **Adoption Process at PetCare Connect:**\n\n1. **Browse Pets** – Find a pet you love on our Adopt page\n2. **Apply Online** – Fill out the adoption application form\n3. **Review** – Our team reviews your application (3-5 days)\n4. **Home Visit** – We may schedule a quick home check\n5. **Approval** – Get notified via email\n6. **Meet & Greet** – Visit the shelter to meet your new pet\n7. **Take Home** – Complete the adoption paperwork 🎉\n\nWould you like to browse available pets?",
            "Adopting is easy! Just go to our **Adopt** page, find a pet, and click **Apply**. Our team will contact you within 3-5 business days. Any other questions?"
        ]
    },

    // ── Adoption Requirements ────────────────────────────────
    requirements: {
        keywords: ['requirement', 'eligible', 'eligibility', 'qualification', 'criteria', 'who can adopt', 'can i adopt', 'need'],
        responses: [
            "📋 **Adoption Requirements:**\n\n✅ Must be 18 years or older\n✅ Valid government ID (Aadhaar/PAN/Passport)\n✅ Stable income or proof of support\n✅ Consent from all family members\n✅ Suitable living environment for the pet\n\nSome pets may have additional requirements based on their size or breed. Any questions?"
        ]
    },

    // ── Adoption Fee ─────────────────────────────────────────
    adoptionFee: {
        keywords: ['fee', 'cost', 'price', 'charge', 'money', 'paid', 'free', 'how much'],
        responses: [
            "💰 **Adoption Fees:**\n\nFees vary by shelter and pet type, but typically include:\n- Vaccination & health check\n- Microchipping\n- Spay/Neuter (if applicable)\n- Initial deworming\n\nCheck the individual pet listing for exact fees. Some pets are available for free to approved families! 🐾"
        ]
    },

    // ── Pet Care - General ───────────────────────────────────
    petCare: {
        keywords: ['care', 'take care', 'look after', 'maintain', 'pet care', 'caring', 'tips'],
        responses: [
            "🐶 **Dog Care Tips:**\n\n🍽️ **Food** – Provide fresh water daily and age-appropriate dog food\n🏥 **Vet Visits** – Regular checkups and recommended vaccines\n🚶 **Exercise** – Daily walks and playtime\n❤️ **Love** – Spend quality time with your dog\n🛁 **Grooming** – Regular baths, nail trims, and brushing\n🏠 **Safe Space** – Provide a comfortable resting area\n\nWould you like specific dog-care tips?"
        ]
    },

    // ── Dog Care ─────────────────────────────────────────────
    dogCare: {
        keywords: ['dog', 'puppy', 'canine'],
        responses: [
            "🐶 **Dog care basics:** Provide fresh water, complete food suited to your dog's life stage, daily activity appropriate for their age and health, reward-based training, regular grooming, and routine veterinary checkups. Keep vaccinations and parasite prevention on the schedule your veterinarian recommends. Puppies, seniors, and dogs with health conditions may need individualized care."
        ]
    },

    // ── Training and behavior ────────────────────────────────
    training: {
        keywords: ['train', 'training', 'obedience', 'command', 'barking', 'biting', 'chewing', 'aggressive', 'aggression', 'anxiety', 'fear', 'scared'],
        responses: [
            "🐕 **Training and behavior:** Use short, frequent sessions and reward the behavior you want with treats, praise, or play. Keep cues consistent, provide daily exercise and enrichment, and avoid punishment, which can increase fear. For sudden behavior changes, pain, or aggression, consult your veterinarian and a qualified reward-based trainer."
        ]
    },

    // ── Puppy care and toilet training ────────────────────────
    puppyCare: {
        keywords: ['puppy', 'new puppy', 'toilet train', 'potty train', 'house train', 'crate train', 'teething'],
        responses: [
            "🐾 **Puppy basics:** Arrange a veterinary check and ask about vaccinations, parasite prevention, and a suitable diet. Offer frequent toilet breaks after waking, meals, and play; reward toileting outside immediately. Socialize gradually and positively, provide safe chew toys, and keep dangerous foods and small objects out of reach. Your vet can tailor advice to your puppy's age and health."
        ]
    },

    // ── Exercise and enrichment ──────────────────────────────
    exercise: {
        keywords: ['exercise', 'walk', 'walking', 'play', 'bored', 'energy', 'enrichment'],
        responses: [
            "🐕 **Exercise and enrichment:** A dog's needs depend on age, breed, health, and weather. Build up walks and play gradually, offer sniffing games and food puzzles, and provide fresh water and rest. Avoid strenuous exercise in heat or for puppies until your veterinarian advises it. If your dog struggles to breathe, becomes weak, or overheats, seek urgent veterinary care."
        ]
    },

    // ── Parasite prevention ──────────────────────────────────
    parasites: {
        keywords: ['flea', 'fleas', 'tick', 'ticks', 'worm', 'worms', 'deworm', 'deworming', 'parasite'],
        responses: [
            "🩺 **Fleas, ticks, and worms:** Use only dog-specific prevention recommended by your veterinarian; some products for other animals or people can be toxic to dogs. Check your dog's coat after outdoor time and keep parasite-prevention records. Ask your vet which product and schedule suit your dog's age, weight, health, and local risks."
        ]
    },

    // ── Dog health ───────────────────────────────────────────
    health: {
        keywords: ['health', 'symptom', 'symptoms', 'itch', 'itching', 'diarrhea', 'lethargic', 'limping', 'skin', 'ear infection', 'eye'],
        responses: [
            "🩺 I can share general information, but I can't diagnose your dog. Contact a veterinarian for new, persistent, or worsening symptoms, and don't give human medicines unless a vet specifically instructs you. Seek urgent veterinary care for breathing difficulty, collapse, seizures, severe bleeding, suspected poisoning, or repeated vomiting."
        ]
    },

    // ── Choosing a breed ──────────────────────────────────────
    breed: {
        keywords: ['breed', 'which dog', 'best dog', 'good dog', 'small dog', 'large dog', 'apartment dog', 'family dog'],
        responses: [
            "🐕 **Choosing a dog:** Focus on the individual dog's energy, temperament, adult size, grooming needs, and health—not appearance alone. Consider your schedule, home, experience, and ability to provide exercise and care. Breed can offer clues, but every dog is an individual; meet the dog and ask the shelter about its known behavior and needs."
        ]
    },

    // ── Food / Diet ──────────────────────────────────────────
    food: {
        keywords: ['food', 'feed', 'eat', 'diet', 'feeding', 'nutrition', 'meal'],
        responses: [
            "🍽️ **Dog Nutrition Tips:**\n\n**Dog-safe foods** may include plain cooked chicken, rice, carrots, blueberries, and sweet potato. Introduce new foods carefully and keep portions appropriate.\n\n**⚠️ Never feed dogs:**\n❌ Chocolate\n❌ Onion & garlic\n❌ Grapes & raisins\n❌ Avocado\n❌ Xylitol (artificial sweetener)\n❌ Macadamia nuts\n❌ Alcohol\n❌ Raw dough\n\nAlways consult your vet for a specific diet plan! 🏥"
        ]
    },

    // ── Dental care ──────────────────────────────────────────
    dentalCare: {
        keywords: ['teeth', 'tooth', 'dental', 'brush teeth', 'bad breath', 'chew'],
        responses: [
            "🦷 **Dog dental care:** Use a toothbrush and toothpaste made for dogs; human toothpaste can be harmful if swallowed. Start gently, letting your dog get used to having their mouth handled, and reward calm behavior. Dental chews may help but don't replace brushing. Ask your veterinarian to check for tartar, pain, or persistent bad breath."
        ]
    },

    // ── Safe and unsafe foods ────────────────────────────────
    foodSafety: {
        keywords: ['chocolate', 'grape', 'raisin', 'onion', 'garlic', 'xylitol', 'toxic food', 'safe food', 'safe foods', 'foods safe for dogs', 'can dogs eat', 'unsafe for dogs', 'unsafe food', 'unsafe foods', 'foods unsafe for dogs', 'dangerous food'],
        responses: [
            "🍫 **Food safety:** Chocolate, grapes and raisins, onions and garlic, and products containing xylitol can be dangerous to dogs. Keep them out of reach. If your dog may have eaten a toxin, contact a veterinarian or animal poison service promptly; don't wait for symptoms or induce vomiting unless a professional tells you to."
        ]
    },

    // ── Socialization ─────────────────────────────────────────
    socialization: {
        keywords: ['socialize', 'socialization', 'other dogs', 'strangers', 'introduce', 'meeting dogs'],
        responses: [
            "🐾 **Socializing your dog:** Introduce new people, dogs, places, and sounds gradually and at a distance where your dog remains relaxed. Pair calm experiences with treats or praise and allow your dog to move away. Avoid forcing greetings. If your dog shows fear or aggression, ask a veterinarian or qualified reward-based behavior professional for a safe plan."
        ]
    },

    // ── Separation-related behavior ──────────────────────────
    separation: {
        keywords: ['separation anxiety', 'left alone', 'alone at home', 'whining when', 'destroys when', 'separation'],
        responses: [
            "🏠 **When a dog struggles to be alone:** Start with very short, calm absences and increase the time only while your dog stays comfortable. Provide a safe resting area and suitable enrichment, but don't punish distress. Video can help you notice signs. Speak with your veterinarian or a qualified behavior professional, especially if the distress is severe or sudden."
        ]
    },

    // ── Heat safety ───────────────────────────────────────────
    heatSafety: {
        keywords: ['hot weather', 'heatstroke', 'heat stroke', 'overheating', 'hot outside', 'cool down'],
        responses: [
            "☀️ **Keep dogs safe in heat:** Walk during cooler hours, provide shade and fresh water, and never leave a dog in a parked car. Heavy panting, drooling, weakness, vomiting, confusion, or collapse may signal heatstroke. Move the dog to a cooler place and contact an emergency veterinarian immediately; don't delay care."
        ]
    },

    // ── Vaccination ──────────────────────────────────────────
    vaccination: {
        keywords: ['vaccine', 'vaccination', 'vaccinate', 'shot', 'immunization', 'inject'],
        responses: [
            "💉 **Dog Vaccination Guide:**\n\nCore vaccines commonly include Rabies, Distemper, Parvovirus, and Adenovirus. Your veterinarian will recommend a schedule based on your dog's age, health, lifestyle, and local regulations. Puppies generally begin vaccinations at 6–8 weeks, followed by boosters as advised by the vet.\n\n💡 Vaccination protects dogs from serious infectious diseases. Keep records and ask your vet when boosters are due. 🎉"
        ]
    },

    // ── Emergency ────────────────────────────────────────────
    emergency: {
        keywords: ['emergency', 'sick', 'injury', 'hurt', 'bleeding', 'not eating', 'vomit', 'seizure', 'not breathing', 'poison', 'choked', 'unconscious', 'accident'],
        responses: [
            "🚨 **This sounds like an emergency!**\n\n**Please contact a veterinarian immediately!**\n\n📞 **Emergency Steps:**\n1. Stay calm and keep your pet calm\n2. Call your nearest vet or emergency animal clinic\n3. Do NOT give human medication to pets\n4. Keep your pet warm and still during transport\n\n🏥 **Common Emergency Animal Clinics:**\nSearch 'emergency vet near me' on Google Maps\n\n⚠️ I'm a chatbot and cannot provide medical advice. **Please see a vet!**"
        ]
    },

    // ── Shelter Info ─────────────────────────────────────────
    shelterInfo: {
        keywords: ['shelter', 'contact', 'location', 'address', 'where', 'visit', 'come', 'office', 'phone number', 'email'],
        responses: [
            "📍 **PetCare Connect Contact Info:**\n\n🏠 **Location:** Sira, Tumakuru, Karnataka, India\n\n⏰ **General Hours:**\nMon-Sat: 9:00 AM – 6:00 PM\nSunday: 10:00 AM – 4:00 PM\n\n📞 **How to Reach Us:**\n• Phone: +91 63620 4336\n• Email: samithakn14@gmail.com\n\nWant to schedule a shelter visit? 🐾"
        ]
    },

    // ── Working Hours ────────────────────────────────────────
    hours: {
        keywords: ['hours', 'timing', 'open', 'close', 'working', 'time', 'schedule', 'when'],
        responses: [
            "⏰ **Our Working Hours:**\n\nMonday – Saturday: 9:00 AM to 6:00 PM\nSunday: 10:00 AM to 4:00 PM\nPublic Holidays: Closed (check our website)\n\nYou can also book an appointment online 24/7! 📅"
        ]
    },

    // ── Grooming ─────────────────────────────────────────────
    grooming: {
        keywords: ['groom', 'grooming', 'bath', 'bathe', 'wash', 'brush', 'nail', 'trim', 'haircut'],
        responses: [
            "✂️ **Dog Grooming Tips:**\n\n• Brush: Daily for long coats, weekly for short\n• Bath: Every 4-6 weeks (or when smelly!)\n• Nails: Trim every 3-4 weeks\n• Ears: Check weekly for redness/odor\n\n💡 Start grooming routines early so your dog gets comfortable with it."
        ]
    },

    // ── Finding Pets ─────────────────────────────────────────
    findPet: {
        keywords: ['find', 'search', 'browse', 'look for', 'where to find', 'see pets', 'available'],
        responses: [
            "🔍 **Finding Your Perfect Dog:**\n\n1. Go to the **Adopt** page from the navigation menu\n2. Use filters to narrow down by age, size, location, or shelter\n3. Use the **Recommend a Pet** feature for personalized suggestions!\n4. Save dogs you love using the ❤️ button\n\nYou can also try our **Find My Pet** recommendation quiz! 🧩"
        ]
    },

    // ── Dashboard / Account ──────────────────────────────────
    account: {
        keywords: ['account', 'dashboard', 'login', 'sign up', 'register', 'profile', 'my account', 'logged in'],
        responses: [
            "👤 **Your PetCare Connect Account:**\n\n🔑 **Login/Register:** Click the button in the top-right navbar\n\n📊 **Your Dashboard lets you:**\n• Track your adoption applications\n• View scheduled appointments\n• Save favorite pets\n• Read notifications\n• Update your profile\n\nAlready have an account? Log in from the navbar! 😊"
        ]
    },

    // ── Application Status ───────────────────────────────────
    applicationStatus: {
        keywords: ['status', 'application status', 'check status', 'my application', 'pending', 'approved', 'rejected'],
        responses: [
            "📋 **Check Your Application Status:**\n\n1. Log into your account\n2. Go to your **Dashboard**\n3. Click on the **Applications** tab\n\nYou'll see all your applications with their current status:\n⏳ Pending → 🔍 Under Review → ✅ Approved / ❌ Rejected\n\nYou'll also get email notifications when your status changes!"
        ]
    },

    // ── Appointment ──────────────────────────────────────────
    appointment: {
        keywords: ['appointment', 'book', 'booking', 'visit', 'schedule', 'meet', 'meeting'],
        responses: [
            "📅 **Booking an Appointment:**\n\n1. Find a pet you like on the **Adopt** page\n2. Click on the pet to view details\n3. Click **Book Appointment** or **Schedule Visit**\n4. Choose your preferred date and time\n5. Add any notes for the shelter\n\nYou'll receive a confirmation email! Check your **Dashboard → Appointments** to manage bookings. 🐾"
        ]
    },

    // ── Volunteer / Foster ───────────────────────────────────
    volunteer: {
        keywords: ['volunteer', 'foster', 'help', 'donate', 'support', 'contribute', 'sponsor'],
        responses: [
            "💛 **Ways to Help Animals:**\n\n🐾 **Fostering:** Provide a temporary home for a pet until they're adopted\n🤝 **Volunteering:** Help at shelter events, walks, socializing animals\n💰 **Donating:** Every rupee helps with food, medical care, and shelter maintenance\n📣 **Spreading Awareness:** Share our pets on social media!\n\nUse the **Contact** page to express your interest in volunteering or fostering. We'd love your help! 🙏"
        ]
    },

    // ── Thank you / Bye ──────────────────────────────────────
    farewell: {
        keywords: ['bye', 'goodbye', 'thank you', 'thanks', 'that\'s all', 'thats all', 'ok thanks', 'great thanks'],
        responses: [
            "Thank you for chatting with me! 🐾 Have a wonderful day and happy pet parenting! 😊",
            "Goodbye! Don't forget to share the love with your furry friends! 🐶🐱💕",
            "You're welcome! Feel free to come back if you have more questions. Happy adopting! 🎉"
        ]
    },

    // ── Default fallback ─────────────────────────────────────
    default: {
        responses: [
            "Hmm, I'm not sure about that! 🤔 Here are some things I can help with:\n\n🐾 Adoption process & requirements\n🏥 Pet health & vaccination\n🍽️ Pet food & nutrition\n✂️ Grooming tips\n📍 Shelter information\n📅 Booking appointments\n\nOr feel free to **Contact Us** for detailed help!",
            "That's a great question! I might not have the answer to that one. 😅\n\nTry asking about:\n• How to adopt a pet\n• Pet care tips\n• Vaccination schedules\n• Shelter contact info\n\nOr use our **Contact Form** to reach our team!",
            "I didn't quite understand that. Could you rephrase it? 😊\n\nI can help with **adoption**, **pet care**, **food**, **grooming**, and **shelter info**!"
        ]
    }
};

const DOG_KNOWLEDGE_TOPICS = new Set([
    'dogCare', 'petCare', 'food', 'foodSafety', 'vaccination', 'emergency',
    'grooming', 'training', 'puppyCare', 'exercise', 'parasites', 'health',
    'dentalCare', 'socialization', 'separation', 'heatSafety', 'breed'
]);
const DOG_CONTEXT_KEYWORDS = [
    'dog', 'puppy', 'puppies', 'canine', 'bark', 'barking', 'leash',
    'paws', 'paw', 'crate', 'kibble', 'flea', 'fleas', 'tick', 'ticks',
    'groom', 'grooming', 'vaccination', 'vaccine', 'training', 'train',
    'toilet train', 'potty train', 'dog food', 'pet food'
];

function matchesChatKeyword(message, keyword) {
    const normalizedKeyword = keyword.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const phrasePattern = normalizedKeyword
        .split(' ')
        .map((word, index, words) => index === words.length - 1 ? `${word}s?` : word)
        .join('\\s+');
    return new RegExp(`\\b${phrasePattern}\\b`).test(message);
}

// ============================================================
// CHATBOT CLASS
// ============================================================

class ChatBot {
    constructor() {
        this.isOpen = false;
        this.messageHistory = [];
        this.typingTimeout = null;
        this.isTyping = false;
        this.supportMode = false;
        this.supportConversationId = null;
        this.supportMessageIds = new Set();
        this.supportPollTimer = null;
        this.isRequesting = false;
    }

    /**
     * Initialize the chatbot by injecting HTML into the DOM.
     * Call this after DOM is ready.
     */
    init() {
        if (document.getElementById('chatbotWidget')) return;

        this.injectStyles();
        this.injectHTML();
        this.bindEvents();

        // Small bounce animation on the button after page load
        setTimeout(() => {
            const btn = document.getElementById('chatbot-toggle');
            if (btn) {
                btn.style.animation = 'chatbotBounce 0.6s ease 3';
            }
        }, 3000);
    }

    /**
     * Inject required CSS styles for the chatbot widget.
     */
    injectStyles() {
        if (document.getElementById('chatbot-styles')) return;

        const style = document.createElement('style');
        style.id = 'chatbot-styles';
        style.textContent = `
            /* === Chatbot Container === */
            #chatbot-widget {
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 10000;
                font-family: 'Segoe UI', sans-serif;
            }

            /* === Toggle Button === */
            #chatbot-toggle {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea, #764ba2);
                border: none;
                color: white;
                font-size: 26px;
                cursor: pointer;
                box-shadow: 0 6px 20px rgba(102,126,234,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                position: relative;
            }

            #chatbot-toggle .chatbot-paw-icon {
                width: 27px;
                height: 27px;
            }

            #chatbot-toggle.chat-open .chatbot-paw-icon,
            #chatbot-toggle.chat-open #chatbot-dot {
                display: none;
            }

            #chatbot-toggle.chat-open::after {
                content: '×';
                font-size: 28px;
                line-height: 1;
            }

            #chatbot-toggle:hover {
                transform: scale(1.1);
                box-shadow: 0 10px 28px rgba(102,126,234,0.6);
            }

            /* Notification dot on toggle */
            #chatbot-dot {
                position: absolute;
                top: 4px;
                right: 4px;
                width: 12px;
                height: 12px;
                background: #ff4757;
                border-radius: 50%;
                border: 2px solid white;
                display: block;
                animation: chatbotPulse 1.5s infinite;
            }

            /* === Chat Window === */
            #chatbot-window {
                position: fixed;
                bottom: 96px;
                right: 24px;
                width: 360px;
                max-height: 520px;
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.2);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                transform: scale(0.8) translateY(20px);
                opacity: 0;
                pointer-events: none;
                transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease;
            }

            #chatbot-window.open {
                transform: scale(1) translateY(0);
                opacity: 1;
                pointer-events: all;
            }

            /* === Header === */
            #chatbot-header {
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                padding: 16px 18px;
                display: flex;
                align-items: center;
                gap: 12px;
                flex-shrink: 0;
            }

            .chatbot-avatar {
                width: 42px;
                height: 42px;
                background: rgba(255,255,255,0.2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 22px;
                flex-shrink: 0;
            }

            .chatbot-name { font-weight: 700; font-size: 15px; }
            .chatbot-status { font-size: 12px; opacity: 0.85; }

            #chatbot-close {
                margin-left: auto;
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }

            #chatbot-close:hover { background: rgba(255,255,255,0.35); }

            /* === Messages Area === */
            #chatbot-messages {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                scroll-behavior: smooth;
                background: #f8f9fa;
            }

            #chatbot-messages::-webkit-scrollbar { width: 4px; }
            #chatbot-messages::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }

            /* === Message Bubbles === */
            .chat-message {
                display: flex;
                gap: 8px;
                align-items: flex-end;
                max-width: 90%;
            }

            .chat-message.user { align-self: flex-end; flex-direction: row-reverse; }
            .chat-message.bot  { align-self: flex-start; }
            .chat-message.agent { align-self: flex-start; }

            .message-bubble {
                padding: 10px 14px;
                border-radius: 18px;
                font-size: 13.5px;
                line-height: 1.5;
                white-space: pre-wrap;
                word-break: break-word;
                max-width: 260px;
            }

            .chat-message.bot .message-bubble,
            .chat-message.agent .message-bubble {
                background: white;
                color: #333;
                border-bottom-left-radius: 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.07);
            }

            .chat-message.user .message-bubble {
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                border-bottom-right-radius: 4px;
            }

            .bot-avatar-mini {
                width: 28px;
                height: 28px;
                background: linear-gradient(135deg, #667eea, #764ba2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                flex-shrink: 0;
            }

            /* === Typing Indicator === */
            .typing-indicator {
                display: flex;
                gap: 5px;
                align-items: center;
                padding: 12px 16px;
                background: white;
                border-radius: 18px;
                border-bottom-left-radius: 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.07);
                width: fit-content;
            }

            .typing-dot {
                width: 8px;
                height: 8px;
                background: #b0b0b0;
                border-radius: 50%;
                animation: typingBounce 1.2s infinite;
            }

            .typing-dot:nth-child(2) { animation-delay: 0.2s; }
            .typing-dot:nth-child(3) { animation-delay: 0.4s; }

            /* === Quick Replies === */
            #chatbot-quick-replies {
                padding: 10px 12px 0;
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                background: #f8f9fa;
            }

            .quick-reply-btn {
                background: white;
                border: 1.5px solid #667eea;
                color: #667eea;
                padding: 5px 12px;
                border-radius: 20px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
                white-space: nowrap;
            }

            .quick-reply-btn:hover {
                background: #667eea;
                color: white;
            }
            .quick-reply-btn.support-action { border-color: #2f855a; color: #276749; }
            .quick-reply-btn.support-action:hover { background: #2f855a; color: white; }

            /* === Input Area === */
            #chatbot-input-area {
                padding: 12px;
                border-top: 1px solid #eee;
                display: flex;
                gap: 8px;
                background: white;
                flex-shrink: 0;
            }

            #chatbot-input {
                flex: 1;
                border: 1.5px solid #e0e0e0;
                border-radius: 24px;
                padding: 8px 16px;
                font-size: 13.5px;
                outline: none;
                transition: border-color 0.2s;
            }

            #chatbot-input:focus { border-color: #667eea; }

            #chatbot-send {
                width: 38px;
                height: 38px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea, #764ba2);
                border: none;
                color: white;
                font-size: 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.15s;
                flex-shrink: 0;
            }

            #chatbot-send:hover { transform: scale(1.1); }

            /* === Keyframes === */
            @keyframes chatbotBounce {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.15); }
            }

            @keyframes chatbotPulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.3); opacity: 0.6; }
            }

            @keyframes typingBounce {
                0%, 60%, 100% { transform: translateY(0); }
                30% { transform: translateY(-6px); }
            }

            /* === Mobile responsive === */
            @media (max-width: 480px) {
                #chatbot-window {
                    width: calc(100vw - 20px);
                    right: 10px;
                    bottom: 80px;
                    max-height: 60vh;
                }
                #chatbot-widget { right: 10px; bottom: 10px; }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Inject the chatbot HTML structure into the page body.
     */
    injectHTML() {
        const quickReplies = [
            { label: '🐕 Training', message: 'How do I train my dog?' },
            { label: '🍫 Safe foods', message: 'Which foods are unsafe for dogs?' },
            { label: '🐾 Puppy care', message: 'How do I care for a new puppy?' },
            { label: '✂️ Grooming', message: 'How often should I groom my dog?' },
            { label: '💉 Vaccines', message: 'What vaccines does my dog need?' },
            { label: '☀️ Heat safety', message: 'How can I keep my dog safe in hot weather?' },
            { label: '👩‍💻 Ask the team', action: 'support' },
            { label: '🤖 Back to Pawsy', action: 'bot' }
        ];

        const quickReplyHTML = quickReplies
            .map(qr => `<button class="quick-reply-btn${qr.action === 'support' ? ' support-action' : ''}"${qr.action ? ` data-action="${qr.action}"` : ` data-message="${qr.message}"`}>${qr.label}</button>`)
            .join('');

        const html = `
        <div id="chatbot-widget">
            <!-- Toggle Button -->
            <button id="chatbot-toggle" title="Chat with Pawsy 🐾" aria-label="Open chat">
                <svg class="chatbot-paw-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
                    <ellipse cx="7.5" cy="11" rx="3.1" ry="4.1" transform="rotate(-27 7.5 11)" fill="currentColor"/>
                    <ellipse cx="13" cy="6.7" rx="3" ry="4" transform="rotate(-9 13 6.7)" fill="currentColor"/>
                    <ellipse cx="19" cy="6.7" rx="3" ry="4" transform="rotate(9 19 6.7)" fill="currentColor"/>
                    <ellipse cx="24.5" cy="11" rx="3.1" ry="4.1" transform="rotate(27 24.5 11)" fill="currentColor"/>
                    <path d="M16 14.5c-4.5 0-8.5 4.7-8.5 8.6 0 3.1 3 4.7 8.5 4.7s8.5-1.6 8.5-4.7c0-3.9-4-8.6-8.5-8.6Z" fill="currentColor"/>
                </svg>
                <span id="chatbot-dot"></span>
            </button>

            <!-- Chat Window -->
            <div id="chatbot-window" role="dialog" aria-label="PawCare Chatbot">
                <!-- Header -->
                <div id="chatbot-header">
                    <div class="chatbot-avatar">🐕</div>
                    <div>
                        <div class="chatbot-name">Pawsy</div>
                        <div class="chatbot-status">🟢 Online · PetCare Assistant</div>
                    </div>
                    <button id="chatbot-close" aria-label="Close chat">×</button>
                </div>

                <!-- Messages -->
                <div id="chatbot-messages"></div>

                <!-- Quick Replies -->
                <div id="chatbot-quick-replies">${quickReplyHTML}</div>

                <!-- Input Area -->
                <div id="chatbot-input-area">
                    <input type="text"
                           id="chatbot-input"
                           placeholder="Ask me anything..."
                           maxlength="1200"
                           autocomplete="off"
                           aria-label="Type your message">
                    <button id="chatbot-send" aria-label="Send message">➤</button>
                </div>
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
    }

    /**
     * Bind all event listeners for the chatbot UI.
     */
    bindEvents() {
        const toggleBtn = document.getElementById('chatbot-toggle');
        const closeBtn  = document.getElementById('chatbot-close');
        const sendBtn   = document.getElementById('chatbot-send');
        const input     = document.getElementById('chatbot-input');

        toggleBtn?.addEventListener('click', () => this.toggle());
        closeBtn?.addEventListener('click',  () => this.close());

        sendBtn?.addEventListener('click', () => this.handleSend());

        input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });

        // Quick reply buttons
        document.querySelectorAll('.quick-reply-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-action');
                if (action === 'support') {
                    this.startSupport();
                    return;
                }
                if (action === 'bot') {
                    this.stopSupport();
                    this.addMessage('You are back with Pawsy. Ask me an adoption or dog-care question any time! 🐾', 'bot');
                    return;
                }
                const message = btn.getAttribute('data-message');
                if (message) this.sendMessage(message, true);
            });
        });
    }

    /**
     * Handle the send button / Enter key press.
     */
    handleSend() {
        const input = document.getElementById('chatbot-input');
        if (!input) return;

        const message = input.value.trim();
        if (!message) return;

        input.value = '';
        this.sendMessage(message);
    }

    /**
     * Toggle the chat window open/closed.
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Open the chat window and show the welcome message if first time.
     */
    open() {
        this.isOpen = true;
        const window_ = document.getElementById('chatbot-window');
        const dot = document.getElementById('chatbot-dot');
        const toggleIcon = document.getElementById('chatbot-toggle');

        window_?.classList.add('open');
        if (dot) dot.style.display = 'none';
        toggleIcon?.classList.add('chat-open');

        // Show intro message on first open
        if (this.messageHistory.length === 0) {
            setTimeout(() => {
                this.addMessage(
                    "👋 Hi there! I'm **Pawsy**, your PetCare Connect assistant!\n\n" +
                    "Ask me about dog training, puppy care, food safety, grooming, exercise, or general health guidance. I can also help with adoption and shelter questions.\n\n" +
                    "What would you like to know? Or pick a quick question below! 😊",
                    'bot'
                );
            }, 300);
        }
        if (this.supportMode && this.supportConversationId) {
            this.refreshSupportMessages();
            if (!this.supportPollTimer) this.supportPollTimer = setInterval(() => this.refreshSupportMessages(), 5000);
        }

        // Focus the input
        setTimeout(() => document.getElementById('chatbot-input')?.focus(), 400);
    }

    /**
     * Close the chat window.
     */
    close() {
        this.isOpen = false;
        const window_ = document.getElementById('chatbot-window');
        const toggleIcon = document.getElementById('chatbot-toggle');

        window_?.classList.remove('open');
        toggleIcon?.classList.remove('chat-open');
        this.stopSupportPolling();
    }

    /**
     * Process and send a user message.
     *
     * @param {string} message - The message text
     * @param {boolean} [fromQuickReply=false] - True if triggered by quick reply button
     */
    async sendMessage(message, fromQuickReply = false) {
        if (!message?.trim() || this.isRequesting) return;

        if (this.supportMode) {
            this.sendSupportMessage(message);
            return;
        }

        this.isRequesting = true;
        const sendButton = document.getElementById('chatbot-send');
        if (sendButton) sendButton.disabled = true;

        this.addMessage(message, 'user');
        this.messageHistory.push({ role: 'user', content: message });
        this.showTyping();

        try {
            const baseUrl = window.PAWCARE_CONFIG?.API_BASE_URL;
            if (!baseUrl) throw new Error('Chat is not configured. Please contact the site administrator.');

            const response = await fetch(`${baseUrl}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: this.messageHistory.slice(-12).map(({ role, content }) => ({
                        role: role === 'bot' ? 'assistant' : role,
                        content
                    }))
                })
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'The assistant could not answer right now.');
            }

            const answer = result.answer;
            this.hideTyping();
            this.addMessage(answer, 'bot');
            this.messageHistory.push({ role: 'bot', content: answer });
            this.messageHistory = this.messageHistory.slice(-12);
        } catch (error) {
            this.hideTyping();
            this.messageHistory.pop();
            const localAnswer = this.getResponse(message);
            const fallback = `The AI service is unavailable right now, so here's some quick guidance from Pawsy:\n\n${localAnswer}`;
            this.addMessage(fallback, 'bot');
            this.messageHistory.push(
                { role: 'user', content: message },
                { role: 'bot', content: fallback }
            );
            this.messageHistory = this.messageHistory.slice(-12);
        } finally {
            this.isRequesting = false;
            if (sendButton) sendButton.disabled = false;
        }
    }

    /**
     * Find the best response from the knowledge base using keyword matching.
     *
     * @param {string} message - User's message
     * @returns {string} Bot response
     */
    getResponse(message) {
        const lowerMsg = ` ${message.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
        const hasDogContext = DOG_CONTEXT_KEYWORDS.some(keyword => matchesChatKeyword(lowerMsg, keyword));
        const asksAboutAdoption = /\b(adopt|adopted|adopting|adoption|applying|application)\b/.test(lowerMsg);
        const asksToFindPets = /\b(find|search|browse|available|pets?)\b/.test(lowerMsg);

        let bestScore = 0;
        let bestResponses = null;

        for (const [topic, data] of Object.entries(CHATBOT_KNOWLEDGE_BASE)) {
            if (topic === 'default' || !data.keywords) continue;
            if (hasDogContext) {
                const isDogTopic = DOG_KNOWLEDGE_TOPICS.has(topic);
                const isRelevantAdoptionTopic = asksAboutAdoption &&
                    ['adoptionProcess', 'requirements', 'adoptionFee'].includes(topic);
                const isRelevantPetSearch = asksToFindPets && topic === 'findPet';
                if (!isDogTopic && !isRelevantAdoptionTopic && !isRelevantPetSearch) continue;
            }

            let score = 0;
            for (const keyword of data.keywords) {
                if (matchesChatKeyword(lowerMsg, keyword)) {
                    // Longer keywords get higher scores (more specific match)
                    score += keyword.length;
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestResponses = data.responses;
            }
        }

        if (!bestResponses && hasDogContext) {
            return "I can help with dog care, training, nutrition, grooming, and general health guidance. Could you share a little more about what you'd like to know?";
        }

        const responses = bestResponses || CHATBOT_KNOWLEDGE_BASE.default.responses;
        return responses[Math.floor(Math.random() * responses.length)];
    }

    async getSupportSession() {
        const client = window.PAWCARE_CONFIG?.supabase;
        if (!client) throw new Error('Account sign-in is unavailable right now.');
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        if (!data.session) return null;
        return data.session;
    }

    async supportRequest(path, options = {}) {
        const session = await this.getSupportSession();
        if (!session) throw new Error('Please sign in to contact the support team.');
        const baseUrl = window.PAWCARE_CONFIG?.API_BASE_URL;
        if (!baseUrl) throw new Error('Support is not configured yet. Please contact us by email.');

        const response = await fetch(`${baseUrl}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
                ...(options.headers || {})
            }
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Could not reach the support team.');
        }
        return result.data;
    }

    async startSupport() {
        if (this.supportMode) return;
        this.stopSupportPolling();
        this.supportMessageIds.clear();

        try {
            const session = await this.getSupportSession();
            if (!session) {
                this.addMessage('Please sign in to your PetCare Connect account before sending a question to our team. You can still ask Pawsy the common questions here.', 'bot');
                return;
            }

            this.supportMode = true;
            this.addMessage('You are connected to the support inbox. Send your question and an admin will reply here. Keep this account signed in to receive replies. 🐾', 'bot');
            const conversations = await this.supportRequest('/support/conversations/mine');
            this.supportConversationId = conversations[0]?.id || null;
            if (this.supportConversationId) await this.refreshSupportMessages();
            this.supportPollTimer = setInterval(() => this.refreshSupportMessages(), 5000);
        } catch (error) {
            this.supportMode = false;
            this.addMessage(error.message, 'bot');
        }
    }

    stopSupportPolling() {
        if (this.supportPollTimer) clearInterval(this.supportPollTimer);
        this.supportPollTimer = null;
    }

    stopSupport() {
        this.supportMode = false;
        this.supportConversationId = null;
        this.supportMessageIds.clear();
        this.stopSupportPolling();
    }

    async sendSupportMessage(message) {
        this.addMessage(message, 'user');
        try {
            let result;
            if (this.supportConversationId) {
                result = await this.supportRequest(
                    `/support/conversations/${encodeURIComponent(this.supportConversationId)}/messages`,
                    { method: 'POST', body: JSON.stringify({ content: message }) }
                );
            } else {
                result = await this.supportRequest('/support/conversations', {
                    method: 'POST',
                    body: JSON.stringify({ message })
                });
                this.supportConversationId = result.conversation.id;
            }
            const supportMessage = result.message || result;
            if (supportMessage.id) this.supportMessageIds.add(supportMessage.id);
            if (!this.supportPollTimer) this.supportPollTimer = setInterval(() => this.refreshSupportMessages(), 5000);
        } catch (error) {
            if (error.message.includes('resolved')) {
                this.stopSupport();
                this.addMessage(`${error.message} Choose “Ask the team” to start another conversation.`, 'bot');
                return;
            }
            this.addMessage(`${error.message} Your question was not sent; please try again.`, 'bot');
        }
    }

    async refreshSupportMessages() {
        if (!this.supportMode || !this.supportConversationId) return;
        try {
            const messages = await this.supportRequest(
                `/support/conversations/${encodeURIComponent(this.supportConversationId)}/messages`
            );
            messages.forEach(message => {
                if (this.supportMessageIds.has(message.id)) return;
                this.supportMessageIds.add(message.id);
                const sender = message.sender_role === 'user' ? 'user' : 'agent';
                this.addMessage(message.content, sender);
            });
        } catch (error) {
            this.stopSupportPolling();
            this.addMessage(`Support chat could not refresh: ${error.message}`, 'bot');
        }
    }

    /**
     * Add a message bubble to the chat window.
     *
     * @param {string} message - Message text (supports **bold** markdown)
     * @param {'user'|'bot'|'agent'} sender - Who sent the message
     */
    addMessage(message, sender) {
        const container = document.getElementById('chatbot-messages');
        if (!container) return;

        const escapedMessage = String(message).replace(/[&<>"']/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[character]);
        const formattedMessage = escapedMessage
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');

        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${sender}`;

        if (sender === 'bot' || sender === 'agent') {
            messageEl.innerHTML = `
                <div class="bot-avatar-mini">${sender === 'agent' ? '👩‍💻' : '🐾'}</div>
                <div class="message-bubble">${formattedMessage}</div>
            `;
        } else {
            messageEl.innerHTML = `
                <div class="message-bubble">${formattedMessage}</div>
            `;
        }

        container.appendChild(messageEl);
        container.scrollTop = container.scrollHeight;
    }

    /**
     * Show the typing indicator (three bouncing dots).
     */
    showTyping() {
        if (this.isTyping) return;
        this.isTyping = true;

        const container = document.getElementById('chatbot-messages');
        if (!container) return;

        const indicator = document.createElement('div');
        indicator.className = 'chat-message bot';
        indicator.id = 'typing-indicator-wrapper';
        indicator.innerHTML = `
            <div class="bot-avatar-mini">🐾</div>
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;

        container.appendChild(indicator);
        container.scrollTop = container.scrollHeight;
    }

    /**
     * Hide the typing indicator.
     */
    hideTyping() {
        this.isTyping = false;
        const indicator = document.getElementById('typing-indicator-wrapper');
        indicator?.remove();
    }
}

// ============================================================
// AUTO-INITIALIZE
// ============================================================

// Create and init chatbot when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.pawChatBot = new ChatBot();
    window.pawChatBot.init();
    console.log('🐾 Chatbot (Pawsy) initialized');
});
