// Carrosserietypes
export const BODY_TYPES = [
  'Hatchback',
  'Sedan',
  'Stationwagen',
  'SUV',
  'Coupé',
  'Cabrio',
  'MPV',
  'Pick-up',
] as const;

// Brandstoftypes
export const FUEL_TYPES = [
  'Benzine',
  'Diesel',
  'Hybride',
  'Plug-in Hybride',
  'Elektrisch',
  'LPG',
] as const;

// Transmissie types
export const TRANSMISSION_TYPES = [
  'Automaat',
  'Handgeschakeld',
] as const;

// Kleuren
export const COLORS = [
  'Zwart',
  'Wit',
  'Grijs',
  'Zilver',
  'Blauw',
  'Rood',
  'Groen',
  'Bruin',
  'Beige',
  'Geel',
  'Oranje',
  'Paars',
] as const;

// Merken met modellen
export const VEHICLE_BRANDS: Record<string, string[]> = {
  'Audi': ['A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q2', 'Q3', 'Q5', 'Q7', 'Q8', 'e-tron', 'TT', 'R8'],
  'BMW': ['1 Serie', '2 Serie', '3 Serie', '4 Serie', '5 Serie', '6 Serie', '7 Serie', '8 Serie', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'Z4', 'i3', 'i4', 'iX'],
  'Mercedes-Benz': ['A-Klasse', 'B-Klasse', 'C-Klasse', 'E-Klasse', 'S-Klasse', 'CLA', 'CLS', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'EQA', 'EQB', 'EQC', 'EQE', 'EQS'],
  'Volkswagen': ['Polo', 'Golf', 'ID.3', 'ID.4', 'ID.5', 'Passat', 'Arteon', 'T-Cross', 'T-Roc', 'Tiguan', 'Touareg', 'Touran', 'Caddy', 'Transporter'],
  'Ford': ['Fiesta', 'Focus', 'Mondeo', 'Mustang', 'Puma', 'Kuga', 'Explorer', 'Ranger', 'Transit'],
  'Peugeot': ['108', '208', '308', '408', '508', '2008', '3008', '5008', 'Rifter', 'Partner', 'Expert'],
  'Renault': ['Clio', 'Captur', 'Megane', 'Kadjar', 'Arkana', 'Scenic', 'Espace', 'Zoe', 'Twingo', 'Kangoo', 'Trafic'],
  'Toyota': ['Aygo', 'Yaris', 'Corolla', 'Camry', 'C-HR', 'RAV4', 'Highlander', 'Land Cruiser', 'Prius', 'Mirai'],
  'Kia': ['Picanto', 'Rio', 'Ceed', 'Proceed', 'Stinger', 'Niro', 'Sportage', 'Sorento', 'EV6'],
  'Hyundai': ['i10', 'i20', 'i30', 'Ioniq', 'Ioniq 5', 'Ioniq 6', 'Kona', 'Tucson', 'Santa Fe', 'Nexo'],
  'Opel': ['Corsa', 'Astra', 'Insignia', 'Crossland', 'Grandland', 'Mokka', 'Combo', 'Vivaro'],
  'Skoda': ['Fabia', 'Scala', 'Octavia', 'Superb', 'Kamiq', 'Karoq', 'Kodiaq', 'Enyaq'],
  'SEAT': ['Ibiza', 'Leon', 'Arona', 'Ateca', 'Tarraco', 'Cupra Formentor', 'Cupra Born'],
  'Mazda': ['2', '3', '6', 'CX-3', 'CX-30', 'CX-5', 'CX-60', 'MX-5', 'MX-30'],
  'Volvo': ['S60', 'S90', 'V60', 'V90', 'XC40', 'XC60', 'XC90', 'C40'],
  'Mini': ['Cooper', 'Clubman', 'Countryman', 'Paceman'],
  'Porsche': ['911', 'Boxster', 'Cayman', 'Cayenne', 'Macan', 'Panamera', 'Taycan'],
  'Tesla': ['Model 3', 'Model S', 'Model X', 'Model Y'],
  'Citroën': ['C1', 'C3', 'C4', 'C5 X', 'Berlingo', 'SpaceTourer', 'ë-C4'],
  'Fiat': ['500', 'Panda', 'Tipo', '500X', '500L', 'Doblo'],
  'Nissan': ['Micra', 'Juke', 'Qashqai', 'X-Trail', 'Leaf', 'Ariya'],
  'Honda': ['Jazz', 'Civic', 'CR-V', 'HR-V', 'e'],
  'Jeep': ['Renegade', 'Compass', 'Cherokee', 'Grand Cherokee', 'Wrangler'],
  'Land Rover': ['Defender', 'Discovery', 'Discovery Sport', 'Range Rover', 'Range Rover Sport', 'Range Rover Evoque', 'Range Rover Velar'],
};

// Trim levels per merk
export const TRIM_LEVELS: Record<string, string[]> = {
  'Volkswagen': ['Trendline', 'Comfortline', 'Highline', 'R-Line', 'GTI', 'GTD', 'GTE', 'R'],
  'BMW': ['Base', 'Advantage', 'Sport Line', 'Luxury Line', 'M Sport', 'M'],
  'Audi': ['Basic', 'Attraction', 'Ambiente', 'Sport', 'S-Line', 'S', 'RS'],
  'Mercedes-Benz': ['Style', 'Progressive', 'Avantgarde', 'AMG Line', 'AMG'],
  'Ford': ['Trend', 'Titanium', 'ST-Line', 'Vignale', 'ST'],
  'Peugeot': ['Active', 'Allure', 'GT', 'GT Line'],
  'Renault': ['Life', 'Zen', 'Intens', 'R.S. Line', 'R.S.'],
  'Toyota': ['Active', 'Comfort', 'Style', 'Executive', 'GR Sport'],
  'Kia': ['ComfortLine', 'ExecutiveLine', 'GT-Line', 'GT'],
  'Hyundai': ['i-Motion', 'i-Drive', 'Premium', 'N-Line', 'N'],
  'Opel': ['Edition', 'Elegance', 'Ultimate', 'GS Line'],
  'Skoda': ['Active', 'Ambition', 'Style', 'L&K', 'RS'],
  'SEAT': ['Reference', 'Style', 'Xcellence', 'FR', 'Cupra'],
  'Mazda': ['Prime-Line', 'Centre-Line', 'Luxury', 'Homura', 'Takumi'],
  'Volvo': ['Momentum', 'Inscription', 'R-Design', 'Polestar'],
};

// Uitgebreide opties met categorieën
export interface VehicleOption {
  id: string;
  label: string;
  category: 'premium' | 'comfort' | 'tech' | 'praktisch' | 'veiligheid';
  searchKeyword?: string;
}

export const VEHICLE_OPTIONS: VehicleOption[] = [
  // Premium opties (waardeverhogend)
  { id: 'panoramadak', label: 'Panoramadak', category: 'premium', searchKeyword: 'panorama' },
  { id: 'leder', label: 'Leder interieur', category: 'premium', searchKeyword: 'leder' },
  { id: 'harman', label: 'Harman Kardon / B&O', category: 'premium', searchKeyword: 'harman kardon' },
  { id: 'headup', label: 'Head-up Display', category: 'premium' },
  { id: 'matrix_led', label: 'Matrix LED / IQ.Light', category: 'premium', searchKeyword: 'matrix' },
  
  // Comfort opties
  { id: 'stoelverwarming', label: 'Stoelverwarming', category: 'comfort' },
  { id: 'stoelkoeling', label: 'Stoelkoeling', category: 'comfort' },
  { id: 'elektrische_stoelen', label: 'Elektrische stoelen', category: 'comfort' },
  { id: 'keyless', label: 'Keyless Entry/Go', category: 'comfort', searchKeyword: 'keyless' },
  { id: 'elektrische_achterklep', label: 'Elektrische achterklep', category: 'comfort' },
  { id: 'stuurverwarming', label: 'Stuurverwarming', category: 'comfort' },
  { id: 'memory_stoelen', label: 'Memory stoelen', category: 'comfort' },
  
  // Technologie opties
  { id: 'navigatie', label: 'Navigatie', category: 'tech' },
  { id: 'led', label: 'LED Verlichting', category: 'tech', searchKeyword: 'LED' },
  { id: 'camera_360', label: '360° Camera', category: 'tech', searchKeyword: '360' },
  { id: 'camera_achter', label: 'Achteruitrijcamera', category: 'tech' },
  { id: 'apple_carplay', label: 'Apple CarPlay', category: 'tech', searchKeyword: 'carplay' },
  { id: 'android_auto', label: 'Android Auto', category: 'tech' },
  { id: 'draadloos_laden', label: 'Draadloos telefoon laden', category: 'tech' },
  
  // Veiligheid / Rijassistentie
  { id: 'acc', label: 'ACC (Adaptive Cruise)', category: 'veiligheid', searchKeyword: 'ACC' },
  { id: 'lane_assist', label: 'Lane Assist', category: 'veiligheid' },
  { id: 'dodehoek', label: 'Dodehoek detectie', category: 'veiligheid' },
  { id: 'parkeer_assist', label: 'Park Assist', category: 'veiligheid' },
  
  // Praktisch
  { id: 'trekhaak', label: 'Trekhaak', category: 'praktisch', searchKeyword: 'trekhaak' },
  { id: 'winterbanden', label: 'Winterbanden/set', category: 'praktisch' },
  { id: 'dakrails', label: 'Dakrails', category: 'praktisch' },
  { id: 'privacy_glas', label: 'Privacy glas', category: 'praktisch' },
];

// Groepeer opties per categorie
export const OPTIONS_BY_CATEGORY = {
  premium: VEHICLE_OPTIONS.filter(o => o.category === 'premium'),
  comfort: VEHICLE_OPTIONS.filter(o => o.category === 'comfort'),
  tech: VEHICLE_OPTIONS.filter(o => o.category === 'tech'),
  veiligheid: VEHICLE_OPTIONS.filter(o => o.category === 'veiligheid'),
  praktisch: VEHICLE_OPTIONS.filter(o => o.category === 'praktisch'),
};

export const CATEGORY_LABELS: Record<string, string> = {
  premium: '⭐ Premium',
  comfort: '🛋️ Comfort',
  tech: '📱 Technologie',
  veiligheid: '🛡️ Veiligheid',
  praktisch: '🔧 Praktisch',
};
