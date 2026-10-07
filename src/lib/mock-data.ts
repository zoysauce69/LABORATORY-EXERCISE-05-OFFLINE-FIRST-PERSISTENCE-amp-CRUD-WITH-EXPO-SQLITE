/**
 * Static demo fixtures — the entire "backend".
 *
 * RoomLink ships with no server and no database. Every list, every record and
 * every image URL in the app originates here. Ids are stable strings so
 * navigation between screens works, and the services in `@/services` hydrate
 * saved/request/notification state on top of these.
 *
 * Dates are generated relative to first launch rather than hardcoded, so
 * "available from" and message timestamps never read as stale.
 */

import type {
  Amenity,
  AppNotification,
  Application,
  Conversation,
  HowItWorksStep,
  Benefit,
  FaqItem,
  Message,
  Profile,
  Roommate,
  Room,
  Testimonial,
} from './types';

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

const NOW = new Date();

function isoDaysFromNow(days: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function isoMinutesAgo(minutes: number): string {
  return new Date(NOW.getTime() - minutes * 60_000).toISOString();
}

/* ------------------------------------------------------------------ */
/* Amenity & interest catalogues                                       */
/* ------------------------------------------------------------------ */

export const AMENITIES: Amenity[] = [
  { slug: 'wifi', label: 'Wi-Fi', icon: 'wifi' },
  { slug: 'aircon', label: 'Aircon', icon: 'snow' },
  { slug: 'parking', label: 'Parking', icon: 'car' },
  { slug: 'laundry', label: 'Laundry', icon: 'shirt' },
  { slug: 'kitchen', label: 'Kitchen', icon: 'restaurant' },
  { slug: 'study_area', label: 'Study area', icon: 'book' },
  { slug: 'security', label: 'CCTV & guard', icon: 'shield-checkmark' },
  { slug: 'furnished', label: 'Furnished', icon: 'bed' },
  { slug: 'water_heater', label: 'Water heater', icon: 'thermometer' },
  { slug: 'own_meter', label: 'Own electric meter', icon: 'speedometer' },
  { slug: 'balcony', label: 'Balcony', icon: 'partly-sunny' },
  { slug: 'cctv', label: 'CCTV', icon: 'videocam' },
  { slug: 'pet_friendly', label: 'Pet friendly', icon: 'paw' },
  { slug: 'gym', label: 'Gym', icon: 'barbell' },
  { slug: 'pool', label: 'Pool', icon: 'water' },
  { slug: 'elevator', label: 'Elevator', icon: 'swap-vertical' },
  { slug: 'flexible_terms', label: 'Flexible terms', icon: 'calendar' },
];

export const AMENITY_SLUGS = AMENITIES.map((a) => a.slug);

export const INTERESTS = [
  'Cooking',
  'Film & photography',
  'Guitar',
  'Running',
  'Reading',
  'Gaming',
  'Hiking',
  'Art & design',
  'Music',
  'Volunteering',
  'Coding',
  'Fitness',
  'Travel',
  'Baking',
  'Chess',
];

/* ------------------------------------------------------------------ */
/* Room images                                                         */
/* ------------------------------------------------------------------ */

const IMG = {
  studioA: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688',
  studioB: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267',
  bedroomA: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2',
  bedroomB: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb',
  bedroomC: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0',
  bedroomD: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7',
  livingA: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace',
  livingB: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6',
  interiorA: 'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d',
  interiorB: 'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e',
  kitchenA: 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d',
  deskA: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c',
} as const;

/** Appends Unsplash sizing params so the CDN serves a reasonable file. */
function img(id: string, width = 900): string {
  return `${id}?auto=format&fit=crop&w=${width}&q=70`;
}

function amenities(...slugs: string[]): Amenity[] {
  return slugs
    .map((slug) => AMENITIES.find((a) => a.slug === slug))
    .filter((a): a is Amenity => a !== undefined);
}

/* ------------------------------------------------------------------ */
/* Demo user                                                           */
/* ------------------------------------------------------------------ */

export const DEMO_USER_ID = 'roomlink-demo-user';

export const DEMO_PROFILE: Profile = {
  id: DEMO_USER_ID,
  fullName: 'Carl Louise',
  email: 'demo@roomlink.ph',
  phone: '0917 123 4567',
  avatarUrl: img('https://images.unsplash.com/photo-1494790108377-be9c29b29330', 400),
  headline: 'Design student looking for a quiet studio near campus',
  bio: "I'm a third-year communication student at UP Diliman. I'm tidy, keep a regular sleep schedule, and I'm usually studying in the library or at home. I cook most nights and I'm happy to share utensils.",
  occupation: 'Student',
  budgetMin: 4500,
  budgetMax: 7500,
  preferredCity: 'Quezon City',
  moveInDate: isoDaysFromNow(21),
  interests: ['Art & design', 'Cooking', 'Film & photography', 'Running'],
  lifestyle: {
    cleanliness: 4,
    smoking: 'non_smoker',
    drinking: 'non_drinker',
    pets: 'love_pets',
    guests: 'few_guests',
    studyHabits: 'quiet_study',
    sleepSchedule: 'early_bird',
    genderPreference: 'any',
  },
  notificationPrefs: {
    applications: true,
    roommateRequests: true,
    messages: true,
  },
  isDiscoverable: true,
};

/* ------------------------------------------------------------------ */
/* Rooms                                                               */
/* ------------------------------------------------------------------ */

const LANDLORD_MA = { name: 'Marites Alvarez', verified: true, avatarUrl: null, responseTime: 'Replies within an hour' };
const LANDLORD_RG = { name: 'Rogelio Gumpay', verified: true, avatarUrl: null, responseTime: 'Replies within a day' };
const LANDLORD_TC = { name: 'Teresa Cruz', verified: false, avatarUrl: null, responseTime: 'Replies within two days' };

export const ROOMS: Room[] = [
  {
    id: 'room-ust-studio',
    title: 'Sunlit studio near UST Gate 1',
    roomType: 'studio',
    monthlyRent: 6500,
    advanceAmount: 13000,
    city: 'Manila',
    barangay: 'Sampaloc',
    landmark: '7 minutes walk to UST Gate 1',
    latitude: 14.6099,
    longitude: 120.9895,
    availableFrom: isoDaysFromNow(14),
    minStayMonths: 6,
    capacity: 2,
    availableSlots: 1,
    isFeatured: true,
    description:
      'A bright corner studio on the third floor with a large window facing the street. The bed, desk and wardrobe are already in place, so you can move in with a single bag. Shared kitchen and bathroom are cleaned twice a week by the landlady. Very walkable — the jeepney terminal, laundry shops and a 7-Eleven are all within a block.',
    amenities: amenities('wifi', 'aircon', 'kitchen', 'laundry', 'furnished', 'study_area', 'water_heater'),
    houseRules: [
      'No loud music or parties in the unit',
      'Keep the kitchen clean after use',
      'No smoking indoors',
      'One month advance, one month deposit',
    ],
    images: [img(IMG.studioA), img(IMG.kitchenA), img(IMG.bedroomA)],
    landlord: LANDLORD_MA,
    occupants: [
      {
        id: 'rm-maria',
        name: 'Maria Santos',
        avatarUrl: img('https://images.unsplash.com/photo-1438761681033-6461ffad8d80', 300),
        occupation: 'Nursing student',
        compatibility: 88,
      },
    ],
    distanceKm: 3.4,
    rating: 4.8,
    reviewCount: 23,
  },
  {
    id: 'room-diliman-condo',
    title: 'Condo unit with pool near UP Diliman',
    roomType: 'condo',
    monthlyRent: 11000,
    advanceAmount: 33000,
    city: 'Quezon City',
    barangay: 'Diliman',
    landmark: 'Near UP Town Center, walking distance',
    latitude: 14.6535,
    longitude: 121.0352,
    availableFrom: isoDaysFromNow(30),
    minStayMonths: 12,
    capacity: 3,
    availableSlots: 1,
    isFeatured: true,
    description:
      'A proper one-bedroom unit in a mid-rise condo, sharing with one other occupant. You get your own bedroom with a walk-in closet and en-suite bathroom, and share the kitchen, living area and pool. The building has a guard 24/7 and a co-working space on the ground floor.',
    amenities: amenities('wifi', 'aircon', 'gym', 'parking', 'security', 'balcony', 'elevator', 'cctv'),
    houseRules: [
      'Pool and gym hours follow building rules (6 AM – 10 PM)',
      'No pets in the unit',
      'Guests limited to two at a time',
    ],
    images: [img(IMG.livingA), img(IMG.bedroomB), img(IMG.interiorA)],
    landlord: LANDLORD_RG,
    occupants: [
      {
        id: 'rm-kent',
        name: 'Kent Villanueva',
        avatarUrl: img('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d', 300),
        occupation: 'Software engineer',
        compatibility: 74,
      },
      {
        id: 'rm-joy',
        name: 'Joy Ramos',
        avatarUrl: img('https://images.unsplash.com/photo-1534528741775-53994a69daeb', 300),
        occupation: 'Accountant',
        compatibility: 81,
      },
    ],
    distanceKm: 1.1,
    rating: 4.9,
    reviewCount: 41,
  },
  {
    id: 'room-bgc-apartment',
    title: 'Modern one-bedroom in Bonifacio Global City',
    roomType: 'apartment',
    monthlyRent: 18500,
    advanceAmount: 55500,
    city: 'Taguig',
    barangay: 'Bonifacio Global City',
    landmark: 'Two blocks from High Street',
    latitude: 14.5499,
    longitude: 121.0494,
    availableFrom: isoDaysFromNow(7),
    minStayMonths: 6,
    capacity: 2,
    availableSlots: 1,
    isFeatured: true,
    description:
      'Floor-level unit in a newer building, fully furnished with an air-conditioned bedroom, a proper living room and a kitchenette. BGC is walkable end to end — supermarkets, clinics, gyms and the MRT are all inside the district.',
    amenities: amenities('wifi', 'aircon', 'gym', 'parking', 'security', 'furnished', 'balcony', 'own_meter'),
    houseRules: [
      'No smoking anywhere in the unit',
      'Pets considered case by case',
      'Three months advance for commercial workers',
    ],
    images: [img(IMG.livingB), img(IMG.bedroomC), img(IMG.interiorB)],
    landlord: LANDLORD_MA,
    occupants: [],
    distanceKm: 14.2,
    rating: 4.7,
    reviewCount: 17,
  },
  {
    id: 'room-katipunan-boarding',
    title: 'Affordable boarding house near Ateneo',
    roomType: 'boarding_house',
    monthlyRent: 4200,
    advanceAmount: 8400,
    city: 'Quezon City',
    barangay: 'Loyola Heights',
    landmark: 'Near Ateneo Gate 3',
    latitude: 14.6407,
    longitude: 121.0773,
    availableFrom: isoDaysFromNow(3),
    minStayMonths: 3,
    capacity: 4,
    availableSlots: 2,
    isFeatured: false,
    description:
      'A long-running boarding house with a strict, quiet house rule — perfect if you need to concentrate. Rooms are compact but clean, with a bed, desk and cabinet. Meals are not included but there is a communal kitchen on every floor.',
    amenities: amenities('wifi', 'laundry', 'kitchen', 'study_area', 'security', 'flexible_terms'),
    houseRules: [
      'Study hours are 7 AM – 10 PM',
      'Lights out at 11 PM on weekdays',
      'No visitors above the lobby',
    ],
    images: [img(IMG.bedroomD), img(IMG.deskA), img(IMG.interiorB)],
    landlord: LANDLORD_TC,
    occupants: [
      {
        id: 'rm-juan',
        name: 'Juan dela Cruz',
        avatarUrl: img('https://images.unsplash.com/photo-1500648767791-00dcc994a43e', 300),
        occupation: 'IT student',
        compatibility: 79,
      },
    ],
    distanceKm: 4.8,
    rating: 4.3,
    reviewCount: 62,
  },
  {
    id: 'room-malate-shared',
    title: 'Shared room in a restored Malate mansion',
    roomType: 'shared_room',
    monthlyRent: 3800,
    advanceAmount: 7600,
    city: 'Manila',
    barangay: 'Malate',
    landmark: 'Five minutes from DLSU Manila',
    latitude: 14.5736,
    longitude: 121.0013,
    availableFrom: isoDaysFromNow(10),
    minStayMonths: 6,
    capacity: 3,
    availableSlots: 1,
    isFeatured: true,
    description:
      'A pre-war house converted into three bright bedrooms with a wrap-around porch. The house has original hardwood floors, a big shared kitchen and a garden. Rent includes water and Wi-Fi; you pay your own electricity.',
    amenities: amenities('wifi', 'kitchen', 'laundry', 'balcony', 'pet_friendly', 'own_meter'),
    houseRules: [
      'Quiet hours from 10 PM',
      'Please take turns cleaning common areas',
      'No smoking indoors',
    ],
    images: [img(IMG.livingB), img(IMG.bedroomA), img(IMG.livingA)],
    landlord: LANDLORD_RG,
    occupants: [
      {
        id: 'rm-alex',
        name: 'Alex Reyes',
        avatarUrl: img('https://images.unsplash.com/photo-1519085360753-af0119f7cbe7', 300),
        occupation: 'Engineering student',
        compatibility: 92,
      },
    ],
    distanceKm: 5.6,
    rating: 4.6,
    reviewCount: 35,
  },
  {
    id: 'room-laguna-studios',
    title: 'Affordable student studios near Los Baños campus',
    roomType: 'studio',
    monthlyRent: 3900,
    advanceAmount: 7800,
    city: 'Los Baños',
    barangay: 'Putatan',
    landmark: 'Shuttle to campus every 15 minutes',
    latitude: 14.2121,
    longitude: 121.1652,
    availableFrom: isoDaysFromNow(18),
    minStayMonths: 3,
    capacity: 2,
    availableSlots: 2,
    isFeatured: false,
    description:
      'Purpose-built student studios a short ride from the UP Los Baños campus. Every unit has its own bed, desk, cabinet and aircon. The landlord runs a small canteen downstairs and there is a shuttle service to the campus gate.',
    amenities: amenities('wifi', 'aircon', 'furnished', 'laundry', 'parking', 'study_area'),
    houseRules: [
      'No more than one pet',
      'Keep the unit tidy for inspections',
    ],
    images: [img(IMG.bedroomC), img(IMG.studioB), img(IMG.deskA)],
    landlord: LANDLORD_TC,
    occupants: [],
    distanceKm: 48.3,
    rating: 4.4,
    reviewCount: 88,
  },
  {
    id: 'room-cebu-lahug',
    title: 'Bright studio near Lahug, Cebu',
    roomType: 'studio',
    monthlyRent: 5200,
    advanceAmount: 10400,
    city: 'Cebu City',
    barangay: 'Lahug',
    landmark: 'Near Maria Rama and Gaisano',
    latitude: 10.3169,
    longitude: 123.8899,
    availableFrom: isoDaysFromNow(5),
    minStayMonths: 6,
    capacity: 2,
    availableSlots: 1,
    isFeatured: false,
    description:
      'A compact studio in a secure building along the Lahug stretch, popular with students and nurses working at the nearby hospitals. Includes a bed, study table and a small kitchen area.',
    amenities: amenities('wifi', 'aircon', 'kitchen', 'security', 'parking', 'furnished'),
    houseRules: [
      'No loud parties',
      'One month advance, one month deposit',
    ],
    images: [img(IMG.studioB), img(IMG.bedroomD), img(IMG.interiorA)],
    landlord: LANDLORD_MA,
    occupants: [
      {
        id: 'rm-bea',
        name: 'Bea Dizon',
        avatarUrl: img('https://images.unsplash.com/photo-1544005313-94ddf0286df2', 300),
        occupation: 'Registered nurse',
        compatibility: 70,
      },
    ],
    distanceKm: null,
    rating: 4.5,
    reviewCount: 29,
  },
  {
    id: 'room-ortigas-condo',
    title: 'High-rise condo beside Ortigas Centre',
    roomType: 'condo',
    monthlyRent: 14500,
    advanceAmount: 43500,
    city: 'Pasig',
    barangay: 'Ortigas',
    landmark: 'Five-minute walk to Ortigas MRT',
    latitude: 14.5875,
    longitude: 121.0614,
    availableFrom: isoDaysFromNow(25),
    minStayMonths: 12,
    capacity: 2,
    availableSlots: 1,
    isFeatured: true,
    description:
      'Efficient one-bedroom in a well-managed tower, a short walk from the MRT station and the Ortigas business district. The unit comes fully furnished and bills are metered individually.',
    amenities: amenities('wifi', 'aircon', 'gym', 'pool', 'security', 'parking', 'own_meter', 'cctv'),
    houseRules: [
      'Building curfew is 11 PM for non-residents',
      'Pets not permitted',
    ],
    images: [img(IMG.interiorB), img(IMG.bedroomB), img(IMG.livingA)],
    landlord: LANDLORD_RG,
    occupants: [
      {
        id: 'rm-dan',
        name: 'Dan Oribello',
        avatarUrl: img('https://images.unsplash.com/photo-1506794778202-cad84cf45f1d', 300),
        occupation: 'Business analyst',
        compatibility: 66,
      },
    ],
    distanceKm: 9.7,
    rating: 4.7,
    reviewCount: 52,
  },
  {
    id: 'room-ililo-shared',
    title: 'Two-bedroom in Iloilo business district',
    roomType: 'shared_room',
    monthlyRent: 3400,
    advanceAmount: 6800,
    city: 'Iloilo City',
    barangay: 'Luzon',
    landmark: 'Near Smallville and the bus terminal',
    latitude: 10.6959,
    longitude: 122.5625,
    availableFrom: isoDaysFromNow(12),
    minStayMonths: 6,
    capacity: 2,
    availableSlots: 1,
    isFeatured: false,
    description:
      'A breezy two-bedroom unit in a quiet subdivision, a short tricycle ride from the business district. One bedroom is currently occupied by a teacher; the other is free. Both share the kitchen and a small front garden.',
    amenities: amenities('wifi', 'kitchen', 'laundry', 'parking', 'own_meter', 'pet_friendly'),
    houseRules: [
      'No loud music after 9 PM',
      'Respect the neighbours — this is a residential area',
    ],
    images: [img(IMG.bedroomD), img(IMG.kitchenA), img(IMG.livingB)],
    landlord: LANDLORD_TC,
    occupants: [
      {
        id: 'rm-tina',
        name: 'Tina Melody',
        avatarUrl: img('https://images.unsplash.com/photo-1487412720507-e7ab37603c6f', 300),
        occupation: 'Teacher',
        compatibility: 83,
      },
    ],
    distanceKm: null,
    rating: 4.2,
    reviewCount: 19,
  },
  {
    id: 'room-sampaloc-condo',
    title: 'Furnished condo along España Boulevard',
    roomType: 'condo',
    monthlyRent: 8900,
    advanceAmount: 26700,
    city: 'Manila',
    barangay: 'Sampaloc',
    landmark: 'Near DLSU and the España shopping strip',
    latitude: 14.6008,
    longitude: 120.9856,
    availableFrom: isoDaysFromNow(2),
    minStayMonths: 6,
    capacity: 3,
    availableSlots: 1,
    isFeatured: false,
    description:
      'A tastefully renovated unit on the fifth floor with tiled floors and a window overlooking the inner courtyard. Shared with two other tenants who both work full time, so the unit is quiet during the day.',
    amenities: amenities('wifi', 'aircon', 'furnished', 'kitchen', 'security', 'cctv', 'own_meter'),
    houseRules: [
      'No smoking indoors',
      'Maximum two guests at a time',
    ],
    images: [img(IMG.studioA), img(IMG.interiorA), img(IMG.bedroomA)],
    landlord: LANDLORD_MA,
    occupants: [
      {
        id: 'rm-paolo',
        name: 'Paolo Mendoza',
        avatarUrl: img('https://images.unsplash.com/photo-1519345182560-3f2917c472ef', 300),
        occupation: 'Architect',
        compatibility: 72,
      },
      {
        id: 'rm-grace',
        name: 'Grace Lim',
        avatarUrl: img('https://images.unsplash.com/photo-1531123897727-8f129e1688ce', 300),
        occupation: 'Pharmacist',
        compatibility: 85,
      },
    ],
    distanceKm: 3.1,
    rating: 4.4,
    reviewCount: 26,
  },
  {
    id: 'room-makati-studio',
    title: 'Compact studio in Bellegra, Makati',
    roomType: 'studio',
    monthlyRent: 7200,
    advanceAmount: 14400,
    city: 'Makati',
    barangay: 'Bellegra',
    landmark: 'Near Chino Roces and Saturn',
    latitude: 14.5622,
    longitude: 121.0336,
    availableFrom: isoDaysFromNow(9),
    minStayMonths: 6,
    capacity: 2,
    availableSlots: 2,
    isFeatured: false,
    description:
      'Neatly maintained studio in a secure mid-rise building, popular with young professionals working in Makati. Includes a queen bed, a work desk and a small kitchen. Fast internet and a backup power supply for outages.',
    amenities: amenities('wifi', 'aircon', 'furnished', 'kitchen', 'gym', 'security', 'own_meter'),
    houseRules: [
      'No smoking indoors',
      'Keep the unit presentable for periodic inspections',
    ],
    images: [img(IMG.studioB), img(IMG.kitchenA), img(IMG.bedroomC)],
    landlord: LANDLORD_RG,
    occupants: [],
    distanceKm: 11.5,
    rating: 4.6,
    reviewCount: 31,
  },
  {
    id: 'room-davao-boarding',
    title: 'Boarders room with own meter near Ateneo Davao',
    roomType: 'boarding_house',
    monthlyRent: 4600,
    advanceAmount: 9200,
    city: 'Davao City',
    barangay: 'Matina',
    landmark: 'Near the campus entrance',
    latitude: 7.0682,
    longitude: 125.6075,
    availableFrom: isoDaysFromNow(15),
    minStayMonths: 3,
    capacity: 4,
    availableSlots: 3,
    isFeatured: false,
    description:
      'A family-run boarding house with a home-cooked meal option included. Rooms have their own electric meter, so you only pay for what you use. The owners live on the ground floor and are strict about noise after 10 PM.',
    amenities: amenities('wifi', 'laundry', 'kitchen', 'study_area', 'own_meter', 'flexible_terms', 'parking'),
    houseRules: [
      'Lights out at 10 PM',
      'No guests upstairs',
      'Housekeeping every Monday',
    ],
    images: [img(IMG.bedroomA), img(IMG.deskA), img(IMG.interiorB)],
    landlord: LANDLORD_TC,
    occupants: [
      {
        id: 'rm-mika',
        name: 'Mika Dela Rosa',
        avatarUrl: img('https://images.unsplash.com/photo-1487412720507-e7ab37603c6f', 300),
        occupation: 'Nursing student',
        compatibility: 76,
      },
    ],
    distanceKm: null,
    rating: 4.1,
    reviewCount: 44,
  },
];

/* ------------------------------------------------------------------ */
/* Roommates                                                           */
/* ------------------------------------------------------------------ */

/**
 * Compatibility is precomputed in the fixtures so the UI has a stable number.
 * `@/services/compatibility.ts` recomputes it from the signed-in profile's
 * lifestyle so it stays honest when the user edits their own preferences.
 */
export const ROOMMATES: Roommate[] = [
  {
    id: 'rm-alex',
    fullName: 'Alex Reyes',
    avatarUrl: img('https://images.unsplash.com/photo-1519085360753-af0119f7cbe7', 400),
    headline: 'Looking for a studious roommate near campus',
    about: "Engineering student at PUP. I value a clean and quiet living space and I keep a regular schedule — I'm usually up before seven and asleep by eleven. I'm happy to study together on weekends; it genuinely helps me focus.",
    occupation: 'Student',
    schoolOrWork: 'Polytechnic University of the Philippines',
    budgetMin: 5000,
    budgetMax: 8000,
    preferredCity: 'Manila',
    preferredBarangay: 'Sampaloc',
    moveInDate: isoDaysFromNow(21),
    interests: ['Coding', 'Chess', 'Running', 'Guitar'],
    lifestyle: {
      cleanliness: 5,
      smoking: 'non_smoker',
      drinking: 'non_drinker',
      pets: 'no_pets',
      guests: 'no_guests',
      studyHabits: 'quiet_study',
      sleepSchedule: 'early_bird',
      genderPreference: 'any',
    },
    compatibilityScore: 92,
    matchReasons: [
      { label: 'Budget', detail: 'Your ₱4,500–₱7,500 overlaps their ₱5,000–₱8,000', kind: 'match' },
      { label: 'Sleep schedule', detail: 'Both early birds', kind: 'match' },
      { label: 'Study habits', detail: 'Both prefer quiet study', kind: 'match' },
      { label: 'Cleanliness', detail: 'Both keep to a high standard', kind: 'match' },
      { label: 'Pets', detail: 'You like pets, they do not', kind: 'mismatch' },
    ],
    verified: true,
    responseTime: 'Usually replies within an hour',
    requestStatus: null,
    isSaved: false,
  },
  {
    id: 'rm-maria',
    fullName: 'Maria Santos',
    avatarUrl: img('https://images.unsplash.com/photo-1438761681033-6461ffad8d80', 400),
    headline: 'Quiet place near DLSU, nursing student',
    about: "Third-year nursing student at DLSU Manila. My schedule rotates, so some weeks I am on night shift and some I am on day shift. I keep my things organised and I am out most weekends for clinicals.",
    occupation: 'Student',
    schoolOrWork: 'De La Salle University – Manila',
    budgetMin: 4000,
    budgetMax: 7000,
    preferredCity: 'Manila',
    preferredBarangay: 'Malate',
    moveInDate: isoDaysFromNow(30),
    interests: ['Running', 'Reading', 'Volunteering', 'Cooking'],
    lifestyle: {
      cleanliness: 4,
      smoking: 'non_smoker',
      drinking: 'non_drinker',
      pets: 'no_preference',
      guests: 'few_guests',
      studyHabits: 'quiet_study',
      sleepSchedule: 'flexible',
      genderPreference: 'any',
    },
    compatibilityScore: 88,
    matchReasons: [
      { label: 'Budget', detail: 'Your range fully covers their ₱4,000–₱7,000', kind: 'match' },
      { label: 'Cleanliness', detail: 'Both tidy most days', kind: 'match' },
      { label: 'Guests', detail: 'Both comfortable with occasional visitors', kind: 'match' },
      { label: 'Sleep schedule', detail: 'They rotate shifts, so timing may clash', kind: 'near' },
    ],
    verified: true,
    responseTime: 'Usually replies within two hours',
    requestStatus: null,
    isSaved: false,
  },
  {
    id: 'rm-kent',
    fullName: 'Kent Villanueva',
    avatarUrl: img('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d', 400),
    headline: 'Working professional, home most evenings',
    about: 'Software engineer at a BGC product team. I work hybrid — three days in the office, two at home. I am tidy, quiet in the evenings, and I cook decent pasta. I am looking for a housemate who is also working, not a party house.',
    occupation: 'Professional',
    schoolOrWork: 'Accenture Philippines',
    budgetMin: 9000,
    budgetMax: 15000,
    preferredCity: 'Quezon City',
    preferredBarangay: 'Diliman',
    moveInDate: isoDaysFromNow(45),
    interests: ['Coding', 'Fitness', 'Cooking', 'Travel'],
    lifestyle: {
      cleanliness: 4,
      smoking: 'non_smoker',
      drinking: 'social',
      pets: 'love_pets',
      guests: 'few_guests',
      studyHabits: 'no_preference',
      sleepSchedule: 'early_bird',
      genderPreference: 'any',
    },
    compatibilityScore: 76,
    matchReasons: [
      { label: 'Location', detail: 'Both prefer Quezon City', kind: 'match' },
      { label: 'Cleanliness', detail: 'Both keep to a high standard', kind: 'match' },
      { label: 'Budget', detail: 'Their ₱9,000+ is above your range', kind: 'near' },
      { label: 'Household', detail: 'You are a student, they work full time', kind: 'near' },
    ],
    verified: true,
    responseTime: 'Usually replies the same day',
    requestStatus: null,
    isSaved: false,
  },
  {
    id: 'rm-juan',
    fullName: 'Juan dela Cruz',
    avatarUrl: img('https://images.unsplash.com/photo-1500648767791-00dcc994a43e', 400),
    headline: 'IT student, flexible schedule',
    about: 'Third-year IT student. My class schedule changes every semester so I am often out during the day. I am easygoing about mess but I do keep shared spaces usable. I play online games most nights, headphones on.',
    occupation: 'Student',
    schoolOrWork: 'University of the Philippines Diliman',
    budgetMin: 3500,
    budgetMax: 6000,
    preferredCity: 'Quezon City',
    preferredBarangay: 'Loyola Heights',
    moveInDate: isoDaysFromNow(14),
    interests: ['Gaming', 'Coding', 'Music', 'Hiking'],
    lifestyle: {
      cleanliness: 3,
      smoking: 'no_preference',
      drinking: 'social',
      pets: 'no_preference',
      guests: 'no_preference',
      studyHabits: 'no_preference',
      sleepSchedule: 'night_owl',
      genderPreference: 'any',
    },
    compatibilityScore: 74,
    matchReasons: [
      { label: 'Budget', detail: 'Your ₱4,500+ covers their ₱3,500–₱6,000', kind: 'match' },
      { label: 'Location', detail: 'Both prefer Quezon City', kind: 'match' },
      { label: 'Sleep schedule', detail: 'They are a night owl, you are an early bird', kind: 'mismatch' },
      { label: 'Cleanliness', detail: 'They are relaxed, you prefer a high standard', kind: 'mismatch' },
    ],
    verified: false,
    responseTime: 'Usually replies within a day',
    requestStatus: null,
    isSaved: false,
  },
  {
    id: 'rm-joy',
    fullName: 'Joy Ramos',
    avatarUrl: img('https://images.unsplash.com/photo-1534528741775-53994a69daeb', 400),
    headline: 'Accountant, tidy and outdoorsy on weekends',
    about: "I audit for a mid-sized firm in Ortigas. I am at the office weekdays and outdoors most weekends — hiking, running, or dragging friends to the beach. I am very tidy and I expect the same. No parties, no loud TV past 10 PM.",
    occupation: 'Professional',
    schoolOrWork: 'SGV & Co.',
    budgetMin: 7000,
    budgetMax: 12000,
    preferredCity: 'Quezon City',
    preferredBarangay: 'Diliman',
    moveInDate: isoDaysFromNow(35),
    interests: ['Running', 'Hiking', 'Travel', 'Cooking'],
    lifestyle: {
      cleanliness: 5,
      smoking: 'non_smoker',
      drinking: 'non_drinker',
      pets: 'love_pets',
      guests: 'no_guests',
      studyHabits: 'quiet_study',
      sleepSchedule: 'early_bird',
      genderPreference: 'female_only',
    },
    compatibilityScore: 81,
    matchReasons: [
      { label: 'Sleep schedule', detail: 'Both early birds', kind: 'match' },
      { label: 'Cleanliness', detail: 'Both keep to a high standard', kind: 'match' },
      { label: 'Interests', detail: 'You both list running and cooking', kind: 'match' },
      { label: 'Budget', detail: 'Partial overlap at the top of your range', kind: 'near' },
    ],
    verified: true,
    responseTime: 'Usually replies within an hour',
    requestStatus: null,
    isSaved: false,
  },
  {
    id: 'rm-grace',
    fullName: 'Grace Lim',
    avatarUrl: img('https://images.unsplash.com/photo-1531123897727-8f129e1688ce', 400),
    headline: 'Pharmacist at ManilaMed, quiet and considerate',
    about: 'Hospital pharmacist. My shift pattern is rotating, so I sometimes come home at 7 AM and sometimes at 9 PM. I am considerate about noise and I keep my belongings in one corner of the room. I love baking on Sundays.',
    occupation: 'Professional',
    schoolOrWork: 'ManilaMed Medical Center',
    budgetMin: 6000,
    budgetMax: 10000,
    preferredCity: 'Manila',
    preferredBarangay: 'Sampaloc',
    moveInDate: isoDaysFromNow(20),
    interests: ['Baking', 'Cooking', 'Reading', 'Volunteering'],
    lifestyle: {
      cleanliness: 5,
      smoking: 'non_smoker',
      drinking: 'non_drinker',
      pets: 'no_pets',
      guests: 'few_guests',
      studyHabits: 'quiet_study',
      sleepSchedule: 'flexible',
      genderPreference: 'any',
    },
    compatibilityScore: 85,
    matchReasons: [
      { label: 'Location', detail: 'Both prefer Manila / Sampaloc', kind: 'match' },
      { label: 'Cleanliness', detail: 'Both keep to a high standard', kind: 'match' },
      { label: 'Interests', detail: 'You both list cooking and art', kind: 'match' },
      { label: 'Move-in', detail: 'Your dates are about three weeks apart', kind: 'match' },
    ],
    verified: true,
    responseTime: 'Usually replies within three hours',
    requestStatus: null,
    isSaved: false,
  },
  {
    id: 'rm-tina',
    fullName: 'Tina Melody',
    avatarUrl: img('https://images.unsplash.com/photo-1487412720507-e7ab37603c6f', 400),
    headline: 'Primary school teacher in Iloilo',
    about: 'I teach Grade 4 in Iloilo City. I am home every afternoon and most weekends, so I am around a lot and I like having company. I cook dinner most days and I am happy to cook for two.',
    occupation: 'Professional',
    schoolOrWork: 'Iloilo Central Elementary School',
    budgetMin: 3000,
    budgetMax: 5500,
    preferredCity: 'Iloilo City',
    preferredBarangay: 'Luzon',
    moveInDate: isoDaysFromNow(25),
    interests: ['Cooking', 'Baking', 'Reading', 'Film & photography'],
    lifestyle: {
      cleanliness: 4,
      smoking: 'non_smoker',
      drinking: 'non_drinker',
      pets: 'love_pets',
      guests: 'few_guests',
      studyHabits: 'no_preference',
      sleepSchedule: 'early_bird',
      genderPreference: 'any',
    },
    compatibilityScore: 78,
    matchReasons: [
      { label: 'Sleep schedule', detail: 'Both early birds', kind: 'match' },
      { label: 'Interests', detail: 'You both list cooking and photography', kind: 'match' },
      { label: 'Location', detail: 'They are in Iloilo, you prefer Quezon City', kind: 'mismatch' },
      { label: 'Budget', detail: 'Your range sits above theirs', kind: 'near' },
    ],
    verified: true,
    responseTime: 'Usually replies within a day',
    requestStatus: null,
    isSaved: false,
  },
  {
    id: 'rm-dan',
    fullName: 'Dan Oribello',
    avatarUrl: img('https://images.unsplash.com/photo-1506794778202-cad84cf45f1d', 400),
    headline: 'Business analyst, early riser, gym most mornings',
    about: 'I work in Ortigas and get to the gym at 6 AM four days a week, so I keep quiet mornings. I am organised and I pay my utility bills on time. I am looking for a housemate who is also working.',
    occupation: 'Professional',
    schoolOrWork: 'Makati Business District',
    budgetMin: 11000,
    budgetMax: 18000,
    preferredCity: 'Pasig',
    preferredBarangay: 'Ortigas',
    moveInDate: isoDaysFromNow(50),
    interests: ['Fitness', 'Cooking', 'Travel', 'Running'],
    lifestyle: {
      cleanliness: 4,
      smoking: 'non_smoker',
      drinking: 'social',
      pets: 'no_pets',
      guests: 'no_guests',
      studyHabits: 'no_preference',
      sleepSchedule: 'early_bird',
      genderPreference: 'any',
    },
    compatibilityScore: 68,
    matchReasons: [
      { label: 'Sleep schedule', detail: 'Both early birds', kind: 'match' },
      { label: 'Cleanliness', detail: 'Both tidy', kind: 'match' },
      { label: 'Budget', detail: 'Well above your range', kind: 'mismatch' },
      { label: 'Guests', detail: 'They prefer no guests, you allow a few', kind: 'mismatch' },
    ],
    verified: true,
    responseTime: 'Usually replies within a day',
    requestStatus: null,
    isSaved: false,
  },
  {
    id: 'rm-bea',
    fullName: 'Bea Dizon',
    avatarUrl: img('https://images.unsplash.com/photo-1544005313-94ddf0286df2', 400),
    headline: 'Nurse in Cebu, shifts and seafood',
    about: "I work at a private hospital in Lahug. I do rotating shifts, so I'm around some weekends and completely absent others. I love cooking seafood when I have a day off and I'd love a housemate to eat with.",
    occupation: 'Professional',
    schoolOrWork: 'Cebu Doctors Hospital',
    budgetMin: 4500,
    budgetMax: 7500,
    preferredCity: 'Cebu City',
    preferredBarangay: 'Lahug',
    moveInDate: isoDaysFromNow(10),
    interests: ['Cooking', 'Travel', 'Music', 'Art & design'],
    lifestyle: {
      cleanliness: 3,
      smoking: 'no_preference',
      drinking: 'social',
      pets: 'love_pets',
      guests: 'few_guests',
      studyHabits: 'no_preference',
      sleepSchedule: 'flexible',
      genderPreference: 'any',
    },
    compatibilityScore: 71,
    matchReasons: [
      { label: 'Budget', detail: 'Your range overlaps their ₱4,500–₱7,500', kind: 'match' },
      { label: 'Interests', detail: 'You both list cooking and art', kind: 'match' },
      { label: 'Location', detail: 'They are in Cebu, you prefer Quezon City', kind: 'mismatch' },
      { label: 'Cleanliness', detail: 'They are relaxed, you prefer a high standard', kind: 'near' },
    ],
    verified: true,
    responseTime: 'Usually replies within two hours',
    requestStatus: null,
    isSaved: false,
  },
  {
    id: 'rm-paolo',
    fullName: 'Paolo Mendoza',
    avatarUrl: img('https://images.unsplash.com/photo-1519345182560-3f2917c472ef', 400),
    headline: 'Architect, works from home two days a week',
    about: 'I run a small studio with two other people. I am at the office Monday and Tuesday, at home the rest of the week. I sketch a lot so I need a desk with reasonable light, and I keep my drawings to myself.',
    occupation: 'Professional',
    schoolOrWork: 'Mendoza Studio',
    budgetMin: 8000,
    budgetMax: 13000,
    preferredCity: 'Manila',
    preferredBarangay: 'Sampaloc',
    moveInDate: isoDaysFromNow(28),
    interests: ['Art & design', 'Film & photography', 'Running', 'Music'],
    lifestyle: {
      cleanliness: 4,
      smoking: 'non_smoker',
      drinking: 'non_drinker',
      pets: 'no_pets',
      guests: 'few_guests',
      studyHabits: 'study_together',
      sleepSchedule: 'early_bird',
      genderPreference: 'any',
    },
    compatibilityScore: 80,
    matchReasons: [
      { label: 'Location', detail: 'Both prefer Manila / Sampaloc', kind: 'match' },
      { label: 'Interests', detail: 'You both list art and photography', kind: 'match' },
      { label: 'Cleanliness', detail: 'Both tidy', kind: 'match' },
      { label: 'Study habits', detail: 'They like company while working', kind: 'near' },
    ],
    verified: false,
    responseTime: 'Usually replies within a day',
    requestStatus: null,
    isSaved: false,
  },
];

/* ------------------------------------------------------------------ */
/* Seeded applications                                                 */
/* ------------------------------------------------------------------ */

function roomById(id: string): Room | undefined {
  return ROOMS.find((r) => r.id === id);
}

function roommateById(id: string): Roommate | undefined {
  return ROOMMATES.find((r) => r.id === id);
}

export const SEED_APPLICATIONS: Application[] = [
  {
    id: 'app-seed-1',
    kind: 'room',
    status: 'approved',
    roomId: 'room-katipunan-boarding',
    roomTitle: 'Affordable boarding house near Ateneo',
    roomImage: img(IMG.bedroomD),
    roommateId: null,
    roommateName: null,
    roommateAvatarUrl: null,
    moveInDate: isoDaysFromNow(3),
    occupants: 1,
    contactName: DEMO_PROFILE.fullName,
    contactPhone: DEMO_PROFILE.phone,
    contactEmail: DEMO_PROFILE.email,
    note: 'I would like to move in at the start of the next semester.',
    createdAt: isoMinutesAgo(60 * 24 * 9),
    updatedAt: isoMinutesAgo(60 * 24 * 7),
    decidedAt: isoMinutesAgo(60 * 24 * 7),
    rejectionReason: null,
  },
  {
    id: 'app-seed-2',
    kind: 'room',
    status: 'pending',
    roomId: 'room-malate-shared',
    roomTitle: 'Shared room in a restored Malate mansion',
    roomImage: img(IMG.bedroomA),
    roommateId: null,
    roommateName: null,
    roommateAvatarUrl: null,
    moveInDate: isoDaysFromNow(14),
    occupants: 1,
    contactName: DEMO_PROFILE.fullName,
    contactPhone: DEMO_PROFILE.phone,
    contactEmail: DEMO_PROFILE.email,
    note: 'Is the porch area shared with the other bedrooms?',
    createdAt: isoMinutesAgo(60 * 20),
    updatedAt: isoMinutesAgo(60 * 20),
    decidedAt: null,
    rejectionReason: null,
  },
  {
    id: 'app-seed-3',
    kind: 'roommate',
    status: 'approved',
    roomId: null,
    roomTitle: null,
    roomImage: null,
    roommateId: 'rm-alex',
    roommateName: 'Alex Reyes',
    roommateAvatarUrl: img('https://images.unsplash.com/photo-1519085360753-af0119f7cbe7', 300),
    moveInDate: isoDaysFromNow(21),
    occupants: 1,
    contactName: DEMO_PROFILE.fullName,
    contactPhone: DEMO_PROFILE.phone,
    contactEmail: DEMO_PROFILE.email,
    note: 'Both of us want a quiet place near campus around the same time.',
    createdAt: isoMinutesAgo(60 * 24 * 5),
    updatedAt: isoMinutesAgo(60 * 24 * 4),
    decidedAt: isoMinutesAgo(60 * 24 * 4),
    rejectionReason: null,
  },
  {
    id: 'app-seed-4',
    kind: 'room',
    status: 'rejected',
    roomId: 'room-bgc-apartment',
    roomTitle: 'Modern one-bedroom in Bonifacio Global City',
    roomImage: img(IMG.livingB),
    roommateId: null,
    roommateName: null,
    roommateAvatarUrl: null,
    moveInDate: isoDaysFromNow(30),
    occupants: 1,
    contactName: DEMO_PROFILE.fullName,
    contactPhone: DEMO_PROFILE.phone,
    contactEmail: DEMO_PROFILE.email,
    note: '',
    createdAt: isoMinutesAgo(60 * 24 * 21),
    updatedAt: isoMinutesAgo(60 * 24 * 18),
    decidedAt: isoMinutesAgo(60 * 24 * 18),
    rejectionReason:
      'The unit requires three months advance, which is above the budget the landlord accepts for a six-month stay.',
  },
];

/* ------------------------------------------------------------------ */
/* Seeded messages                                                     */
/* ------------------------------------------------------------------ */

function seedConversation(
  id: string,
  roommateId: string,
  lastMessage: string,
  minutesAgo: number,
  unreadCount: number,
): Conversation | null {
  const roommate = roommateById(roommateId);
  if (!roommate) return null;
  return {
    id,
    roommateId,
    roommateName: roommate.fullName,
    roommateAvatarUrl: roommate.avatarUrl,
    roommateOccupation: `${roommate.occupation} · ${roommate.schoolOrWork}`,
    roommateCompatibility: roommate.compatibilityScore,
    lastMessage,
    lastMessageAt: isoMinutesAgo(minutesAgo),
    unreadCount,
    isSaved: true,
  };
}

export const SEED_CONVERSATIONS: Conversation[] = [
  seedConversation('convo-alex', 'rm-alex', 'Sure, Saturday morning works for me. See you then!', 25, 1),
  seedConversation('convo-maria', 'rm-maria', 'I can send you a photo of the room this evening.', 60 * 5, 0),
  seedConversation('convo-grace', 'rm-grace', 'Thanks for reaching out! Happy to answer anything.', 60 * 26, 0),
].filter((c): c is Conversation => c !== null);

export const SEED_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    conversationId: 'convo-alex',
    senderId: 'rm-alex',
    body: 'Hi Carl! I saw we both listed Sampaloc and roughly the same budget. Would you be up for grabbing coffee and properly talking it through?',
    sentAt: isoMinutesAgo(60 * 3),
    isRead: true,
  },
  {
    id: 'msg-2',
    conversationId: 'convo-alex',
    senderId: DEMO_USER_ID,
    body: 'Hey Alex, definitely. I am free most afternoons this week — how about Thursday at 4 PM somewhere near España?',
    sentAt: isoMinutesAgo(60 * 2),
    isRead: true,
  },
  {
    id: 'msg-3',
    conversationId: 'convo-alex',
    senderId: 'rm-alex',
    body: 'Thursday works. I am actually viewing the Malate place on Saturday morning too — want to come along? Two sets of eyes is better than one.',
    sentAt: isoMinutesAgo(45),
    isRead: true,
  },
  {
    id: 'msg-4',
    conversationId: 'convo-alex',
    senderId: DEMO_USER_ID,
    body: 'Yes please. I was going to ask someone to come with me anyway.',
    sentAt: isoMinutesAgo(30),
    isRead: true,
  },
  {
    id: 'msg-5',
    conversationId: 'convo-alex',
    senderId: 'rm-alex',
    body: 'Sure, Saturday morning works for me. See you then!',
    sentAt: isoMinutesAgo(25),
    isRead: false,
  },
  {
    id: 'msg-6',
    conversationId: 'convo-maria',
    senderId: 'rm-maria',
    body: 'Hi! Are you still looking around Malate? I saw your profile and the budget lines up nicely.',
    sentAt: isoMinutesAgo(60 * 7),
    isRead: true,
  },
  {
    id: 'msg-7',
    conversationId: 'convo-maria',
    senderId: DEMO_USER_ID,
    body: 'Still looking! Is the room you mentioned a share or a whole unit?',
    sentAt: isoMinutesAgo(60 * 6),
    isRead: true,
  },
  {
    id: 'msg-8',
    conversationId: 'convo-maria',
    senderId: 'rm-maria',
    body: 'A share — one other person already lives there. I can send you a photo of the room this evening.',
    sentAt: isoMinutesAgo(60 * 5),
    isRead: true,
  },
  {
    id: 'msg-9',
    conversationId: 'convo-grace',
    senderId: DEMO_USER_ID,
    body: 'Hi Grace! Your place near ManilaMed looks like a great fit. Is the move-in flexible?',
    sentAt: isoMinutesAgo(60 * 30),
    isRead: true,
  },
  {
    id: 'msg-10',
    conversationId: 'convo-grace',
    senderId: 'rm-grace',
    body: 'Thanks for reaching out! Happy to answer anything.',
    sentAt: isoMinutesAgo(60 * 26),
    isRead: true,
  },
];

/* ------------------------------------------------------------------ */
/* Seeded notifications                                                */
/* ------------------------------------------------------------------ */

export const SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    kind: 'application_update',
    title: 'Your application was approved',
    body: 'Teresa Cruz approved your application for Affordable boarding house near Ateneo.',
    isRead: false,
    createdAt: isoMinutesAgo(60 * 7),
    href: '/applications',
  },
  {
    id: 'notif-2',
    kind: 'message',
    title: 'New message from Alex Reyes',
    body: 'Sure, Saturday morning works for me. See you then!',
    isRead: false,
    createdAt: isoMinutesAgo(25),
    href: '/messages/convo-alex',
  },
  {
    id: 'notif-3',
    kind: 'roommate_request',
    title: 'Alex Reyes accepted your request',
    body: 'You are now connected. Start a conversation to arrange a viewing.',
    isRead: false,
    createdAt: isoMinutesAgo(60 * 24 * 4),
    href: '/messages/convo-alex',
  },
  {
    id: 'notif-4',
    kind: 'application_update',
    title: 'Application needs attention',
    body: 'Your application for Modern one-bedroom in Bonifacio Global City was declined. Tap to read the reason.',
    isRead: true,
    createdAt: isoMinutesAgo(60 * 24 * 18),
    href: '/applications',
  },
  {
    id: 'notif-5',
    kind: 'application_update',
    title: 'Application received',
    body: 'We sent your application for Shared room in a restored Malate mansion to the landlord.',
    isRead: true,
    createdAt: isoMinutesAgo(60 * 20),
    href: '/applications',
  },
];

/* ------------------------------------------------------------------ */
/* Landing page content                                                */
/* ------------------------------------------------------------------ */

export const BENEFITS: Benefit[] = [
  {
    id: 'benefit-1',
    title: 'Roommates, not strangers',
    body: 'Match on the things that actually cause friction — sleep schedules, study habits, cleanliness and guests — before anyone signs a lease.',
    icon: 'people',
  },
  {
    id: 'benefit-2',
    title: 'Real budgets in pesos',
    body: 'Every listing shows the monthly rent, the advance and the deposit up front. No "contact for price", no surprises at signing.',
    icon: 'cash',
  },
  {
    id: 'benefit-3',
    title: 'Walk, commute, live',
    body: 'Filter by city, barangay or distance from your school or office, so the commute stops being the thing that ruins the room.',
    icon: 'navigate',
  },
  {
    id: 'benefit-4',
    title: 'Verified landlords',
    body: 'Landlords who have submitted their IDs carry a verified badge, and every listing shows how fast they reply.',
    icon: 'shield-checkmark',
  },
  {
    id: 'benefit-5',
    title: 'Apply in one form',
    body: 'One short application per property, with your details saved so the next one takes about thirty seconds.',
    icon: 'document-text',
  },
  {
    id: 'benefit-6',
    title: 'Talk before you commit',
    body: 'Message a roommate directly, agree on the house rules, and only then send an application.',
    icon: 'chatbubbles',
  },
];

export const HOW_IT_WORKS: HowItWorksStep[] = [
  {
    id: 'step-1',
    step: 1,
    title: 'Tell us how you live',
    body: 'Budget, preferred area, move-in date and your household habits. Takes about two minutes.',
    icon: 'create',
  },
  {
    id: 'step-2',
    step: 2,
    title: 'Meet your matches',
    body: 'Browse compatible roommates and available rooms, sorted by how well they actually fit.',
    icon: 'search',
  },
  {
    id: 'step-3',
    step: 3,
    title: 'Message and agree',
    body: 'Ask questions, agree on house rules and the split of bills in the app.',
    icon: 'chatbubbles',
  },
  {
    id: 'step-4',
    step: 4,
    title: 'Apply and move in',
    body: 'Send one application. Track its status from pending through to approved.',
    icon: 'checkmark-circle',
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 'testimonial-1',
    name: 'Andrea Lim',
    role: 'Nursing student, DLSU',
    location: 'Manila',
    quote:
      "I matched with three people in a week and one of them turned out to keep the same study schedule as me. We moved into a place near España and neither of us has had a single argument about quiet hours.",
    avatarUrl: img('https://images.unsplash.com/photo-1494790108377-be9c29b29330', 300),
    rating: 5,
  },
  {
    id: 'testimonial-2',
    name: 'Marco Fernandez',
    role: 'Software engineer',
    location: 'Quezon City',
    quote:
      "The rent filter is the part I did not know I needed. Every listing shows the advance and the deposit, so I could rule things out in seconds instead of trekking across Quezon City for a viewing.",
    avatarUrl: img('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d', 300),
    rating: 5,
  },
  {
    id: 'testimonial-3',
    name: 'Sofia Bautista',
    role: 'Design student, UP Diliman',
    location: 'Quezon City',
    quote:
      'I messaged my roommate before applying to anything. We agreed on chores and visitors in writing, and by the time the landlord approved us we already knew each other.',
    avatarUrl: img('https://images.unsplash.com/photo-1534528741775-53994a69daeb', 300),
    rating: 5,
  },
  {
    id: 'testimonial-4',
    name: 'Jomar Tan',
    role: 'Accountant, BGC',
    location: 'Taguig',
    quote:
      "Found a room two streets from my office for less than I was paying for a place an hour away. The distance filter does exactly what it says.",
    avatarUrl: img('https://images.unsplash.com/photo-1500648767791-00dcc994a43e', 300),
    rating: 4,
  },
  {
    id: 'testimonial-5',
    name: 'Katrina Reyes',
    role: 'Teacher, Iloilo',
    location: 'Iloilo City',
    quote:
      'The house rules are listed up front, not buried in a viewing. I knew about the 10 PM lights-out before I signed, and that has saved us both a lot of awkward conversations.',
    avatarUrl: img('https://images.unsplash.com/photo-1487412720507-e7ab37603c6f', 300),
    rating: 5,
  },
];

export const FAQS: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'getting_started',
    question: 'Is RoomLink free to use?',
    answer:
      'Yes. Searching, messaging and applying are free. Some listings may ask for a small coordination fee directly from the landlord, which RoomLink never takes any cut of.',
  },
  {
    id: 'faq-2',
    category: 'getting_started',
    question: 'Do I need to verify my identity to apply?',
    answer:
      'No. You only need an account to message a roommate or send an application. Verified accounts get a tick on their profile, which makes landlords more likely to reply.',
  },
  {
    id: 'faq-3',
    category: 'rooms',
    question: 'What does "advance" mean?',
    answer:
      'It is the amount payable before you move in — usually one month of rent as a deposit plus one month as the first payment. Every listing shows the figure so you can compare fairly.',
  },
  {
    id: 'faq-4',
    category: 'rooms',
    question: 'Can I see who I would be sharing with?',
    answer:
      'Yes. Every room lists its current occupants with their occupation and a compatibility score, so you can request to live with someone specific before applying.',
  },
  {
    id: 'faq-5',
    category: 'roommates',
    question: 'How is the compatibility score calculated?',
    answer:
      'It compares your budget, preferred location, move-in date, sleep schedule, study habits, cleanliness, smoking, drinking, pets and guest preferences. Each field that agrees adds to the score, and the profile lists exactly which ones.',
  },
  {
    id: 'faq-6',
    category: 'roommates',
    question: 'What happens after I send a roommate request?',
    answer:
      'They get a notification and can accept or decline. Once accepted you can message each other directly to agree on house rules before applying to a room together.',
  },
  {
    id: 'faq-7',
    category: 'applications',
    question: 'What do the application statuses mean?',
    answer:
      'Pending means the landlord has not responded yet. Approved means the slot is held for you and you should coordinate the move-in. Rejected includes a written reason. You can cancel a pending application at any time.',
  },
  {
    id: 'faq-8',
    category: 'applications',
    question: 'Can I apply to more than one room?',
    answer:
      'Yes. Apply to as many as you like and track them all under My applications. If two landlords approve, RoomLink will remind you to decline the one you no longer want.',
  },
  {
    id: 'faq-9',
    category: 'account',
    question: 'Can I hide my profile from other renters?',
    answer:
      'Yes. Switch off Discoverable in Settings and you will not appear in roommate search. You can still browse, message and apply.',
  },
  {
    id: 'faq-10',
    category: 'account',
    question: 'Where is my data stored?',
    answer:
      'RoomLink is a demo that runs entirely on your device. Your profile edits, saved rooms, messages and applications are stored locally and never leave your phone.',
  },
];

/* ------------------------------------------------------------------ */
/* Hero stats                                                          */
/* ------------------------------------------------------------------ */

export const HERO_STATS = {
  listings: ROOMS.length,
  roommates: ROOMMATES.length,
  cities: 8,
  avgReplyHours: 2,
} as const;

/** Rooms shown in the "Featured rooms" rail on the landing page. */
export function featuredRooms(): Room[] {
  return ROOMS.filter((room) => room.isFeatured);
}

/** Top matches for the landing page roommate rail. */
export function topRoommates(limit = 4): Roommate[] {
  return [...ROOMMATES].sort((a, b) => b.compatibilityScore - a.compatibilityScore).slice(0, limit);
}

/** Cheap lookups used by the services when hydrating ids. */
export function findRoom(id: string): Room | undefined {
  return roomById(id);
}

export function findRoommate(id: string): Roommate | undefined {
  return roommateById(id);
}

/** The sign-in page pre-fills this so the demo account is one tap away. */
export const DEMO_CREDENTIALS = {
  email: DEMO_PROFILE.email,
  password: 'roomlink123',
} as const;