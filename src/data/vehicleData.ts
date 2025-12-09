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
  'Crossover',
  'Bus',
  'Bedrijfswagen',
  'Roadster',
  'Fastback',
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

// Merken met modellen - Uitgebreide lijst voor Nederlandse markt
export const VEHICLE_BRANDS: Record<string, string[]> = {
  // Premium Duits
  'Audi': ['A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q2', 'Q3', 'Q4 e-tron', 'Q5', 'Q7', 'Q8', 'Q8 e-tron', 'e-tron', 'e-tron GT', 'TT', 'R8', 'RS3', 'RS4', 'RS5', 'RS6', 'RS7', 'RS Q8', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'SQ5', 'SQ7', 'SQ8'],
  'BMW': ['1 Serie', '2 Serie', '3 Serie', '4 Serie', '5 Serie', '6 Serie', '7 Serie', '8 Serie', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'XM', 'Z4', 'i3', 'i4', 'i5', 'i7', 'iX', 'iX1', 'iX2', 'iX3', 'M2', 'M3', 'M4', 'M5', 'M8', 'M135i', 'M235i', 'M240i', 'M340i', 'M440i', 'M550i', 'M760i', 'X3 M', 'X4 M', 'X5 M', 'X6 M'],
  'Mercedes-Benz': ['A-Klasse', 'B-Klasse', 'C-Klasse', 'E-Klasse', 'S-Klasse', 'CLA', 'CLS', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'G-Klasse', 'EQA', 'EQB', 'EQC', 'EQE', 'EQS', 'EQV', 'V-Klasse', 'Vito', 'Sprinter', 'AMG GT', 'SL', 'SLC', 'AMG A35', 'AMG A45', 'AMG C43', 'AMG C63', 'AMG E53', 'AMG E63', 'AMG GLE53', 'AMG GLE63', 'Citan', 'Marco Polo'],
  'Porsche': ['911', 'Boxster', 'Cayman', 'Cayenne', 'Macan', 'Panamera', 'Taycan', '718 Boxster', '718 Cayman', 'Cayenne Coupé', 'Macan Electric'],

  // Duitse volume
  'Volkswagen': ['up!', 'Polo', 'Golf', 'ID.3', 'ID.4', 'ID.5', 'ID.7', 'ID.Buzz', 'Passat', 'Arteon', 'T-Cross', 'T-Roc', 'Tiguan', 'Touareg', 'Touran', 'Caddy', 'Transporter', 'Multivan', 'Crafter', 'Taigo', 'Golf GTI', 'Golf GTD', 'Golf GTE', 'Golf R', 'Tiguan R', 'Touareg R', 'Amarok'],
  'Opel': ['Corsa', 'Astra', 'Insignia', 'Crossland', 'Grandland', 'Mokka', 'Combo', 'Vivaro', 'Movano', 'Zafira', 'Zafira Life', 'Rocks-e', 'Corsa-e', 'Mokka-e', 'Astra-e'],

  // Japans
  'Toyota': ['Aygo', 'Aygo X', 'Yaris', 'Yaris Cross', 'Corolla', 'Corolla Cross', 'Camry', 'C-HR', 'RAV4', 'Highlander', 'Land Cruiser', 'Prius', 'Mirai', 'bZ4X', 'GR86', 'GR Supra', 'GR Yaris', 'Proace', 'Proace City', 'Proace Verso', 'Hilux'],
  'Honda': ['Jazz', 'Civic', 'CR-V', 'HR-V', 'e', 'ZR-V', 'e:Ny1', 'Civic Type R', 'NSX'],
  'Mazda': ['2', '3', '6', 'CX-3', 'CX-30', 'CX-5', 'CX-60', 'CX-80', 'MX-5', 'MX-30', 'MX-5 RF'],
  'Nissan': ['Micra', 'Juke', 'Qashqai', 'X-Trail', 'Leaf', 'Ariya', 'Townstar', 'Primastar', 'Interstar', 'Navara', 'GT-R', 'Note', '370Z'],
  'Suzuki': ['Swift', 'Vitara', 'S-Cross', 'Jimny', 'Ignis', 'Across', 'Swace', 'Baleno', 'SX4 S-Cross'],
  'Mitsubishi': ['Space Star', 'ASX', 'Eclipse Cross', 'Outlander', 'L200', 'Colt'],
  'Subaru': ['Impreza', 'XV', 'Outback', 'Forester', 'Solterra', 'BRZ', 'Levorg', 'WRX'],
  'Lexus': ['UX', 'NX', 'RX', 'ES', 'LC', 'LS', 'LBX', 'RZ', 'IS', 'GS', 'RC', 'LM'],

  // Koreaans
  'Kia': ['Picanto', 'Rio', 'Ceed', 'Proceed', 'Stinger', 'Niro', 'Sportage', 'Sorento', 'EV6', 'EV9', 'XCeed', 'Stonic', 'Seltos', 'Soul', 'e-Niro', 'Carnival'],
  'Hyundai': ['i10', 'i20', 'i30', 'Ioniq', 'Ioniq 5', 'Ioniq 6', 'Kona', 'Tucson', 'Santa Fe', 'Nexo', 'Bayon', 'i20 N', 'i30 N', 'Kona N', 'Staria', 'H350'],
  'Genesis': ['G70', 'G80', 'G90', 'GV60', 'GV70', 'GV80'],

  // Frans
  'Peugeot': ['108', '208', '308', '408', '508', '2008', '3008', '5008', 'Rifter', 'Partner', 'Expert', 'Boxer', 'e-208', 'e-308', 'e-2008', 'e-3008', 'e-5008', 'Traveller', '308 SW'],
  'Renault': ['Clio', 'Captur', 'Megane', 'Megane E-Tech', 'Kadjar', 'Arkana', 'Scenic', 'Scenic E-Tech', 'Espace', 'Zoe', 'Twingo', 'Kangoo', 'Trafic', 'Master', 'Austral', 'Rafale', 'Express'],
  'Citroën': ['C1', 'C3', 'C3 Aircross', 'C4', 'C4 X', 'C5 X', 'C5 Aircross', 'Berlingo', 'SpaceTourer', 'ë-C4', 'ë-Berlingo', 'ë-SpaceTourer', 'Jumpy', 'Jumper', 'Ami'],
  'DS': ['DS3 Crossback', 'DS4', 'DS7', 'DS9', 'DS3 E-Tense', 'DS7 E-Tense'],

  // Italiaans
  'Fiat': ['500', '500e', '500X', '500L', 'Panda', 'Tipo', 'Doblo', 'Scudo', 'Ducato', '600e', 'Topolino', 'Fiorino'],
  'Alfa Romeo': ['Giulia', 'Stelvio', 'Tonale', 'Giulietta', 'Junior', '4C'],
  'Maserati': ['Ghibli', 'Levante', 'Grecale', 'GranTurismo', 'GranCabrio', 'MC20', 'Quattroporte'],
  'Ferrari': ['Roma', 'Portofino', 'F8 Tributo', 'F8 Spider', 'SF90 Stradale', 'SF90 Spider', 'Purosangue', '296 GTB', '296 GTS', '812', '812 GTS', 'Daytona SP3'],
  'Lamborghini': ['Huracán', 'Huracán Evo', 'Huracán Tecnica', 'Urus', 'Revuelto'],

  // Brits
  'Jaguar': ['XE', 'XF', 'E-Pace', 'F-Pace', 'I-Pace', 'F-Type'],
  'Land Rover': ['Defender', 'Discovery', 'Discovery Sport', 'Range Rover', 'Range Rover Sport', 'Range Rover Evoque', 'Range Rover Velar'],
  'Mini': ['Cooper', 'Cooper S', 'Clubman', 'Countryman', 'Paceman', 'Cabrio', 'Electric', 'JCW', 'Countryman SE', 'Aceman'],
  'Bentley': ['Continental GT', 'Flying Spur', 'Bentayga', 'Continental GTC'],
  'Aston Martin': ['DB11', 'DBX', 'Vantage', 'DB12', 'DBS'],
  'Rolls-Royce': ['Ghost', 'Phantom', 'Cullinan', 'Spectre', 'Dawn', 'Wraith'],
  'McLaren': ['GT', 'Artura', '720S', '750S', '765LT', '570S'],

  // Zweeds
  'Volvo': ['S60', 'S90', 'V60', 'V90', 'XC40', 'XC60', 'XC90', 'C40', 'EX30', 'EX90', 'V60 Cross Country', 'V90 Cross Country', 'XC40 Recharge', 'C40 Recharge'],
  'Polestar': ['Polestar 2', 'Polestar 3', 'Polestar 4'],

  // Tsjechisch
  'Skoda': ['Fabia', 'Scala', 'Octavia', 'Superb', 'Kamiq', 'Karoq', 'Kodiaq', 'Enyaq', 'Enyaq Coupé', 'Elroq', 'Octavia RS', 'Kodiaq RS', 'Fabia Monte Carlo'],

  // Spaans
  'SEAT': ['Ibiza', 'Leon', 'Arona', 'Ateca', 'Tarraco', 'Leon Sportstourer', 'Leon FR', 'Leon Cupra'],
  'Cupra': ['Leon', 'Formentor', 'Born', 'Ateca', 'Tavascan', 'Terramar'],

  // Amerikaans
  'Ford': ['Fiesta', 'Focus', 'Mondeo', 'Mustang', 'Mustang Mach-E', 'Puma', 'Kuga', 'Explorer', 'Ranger', 'Transit', 'Transit Custom', 'Transit Connect', 'Tourneo', 'Tourneo Connect', 'Bronco', 'F-150', 'S-Max', 'Galaxy', 'EcoSport', 'Edge'],
  'Jeep': ['Renegade', 'Compass', 'Cherokee', 'Grand Cherokee', 'Wrangler', 'Gladiator', 'Avenger', 'Commander'],
  'Chevrolet': ['Camaro', 'Corvette', 'Silverado', 'Tahoe', 'Suburban', 'Blazer'],
  'Dodge': ['Challenger', 'Charger', 'Durango', 'RAM 1500'],
  'Tesla': ['Model 3', 'Model S', 'Model X', 'Model Y', 'Cybertruck'],

  // Chinese EV-merken
  'BYD': ['Atto 3', 'Seal', 'Dolphin', 'Tang', 'Han', 'Seal U', 'Sealion 7'],
  'MG': ['ZS', 'ZS EV', 'HS', 'MG4', 'MG5', 'Marvel R', 'MG3', 'MG Cyberster', 'MG4 XPower'],
  'Lynk & Co': ['01', '02'],
  'Aiways': ['U5', 'U6'],
  'Nio': ['ET5', 'ET7', 'EL6', 'EL7', 'EL8', 'EP9'],
  'XPeng': ['G6', 'G9', 'P7'],
  'ORA': ['Funky Cat', 'Lightning Cat'],
  'Leapmotor': ['T03', 'C10'],

  // Budget
  'Dacia': ['Sandero', 'Duster', 'Jogger', 'Spring', 'Logan', 'Dokker', 'Lodgy'],

  // Smart
  'Smart': ['ForTwo', 'ForFour', '#1', '#3', 'EQ ForTwo', 'EQ ForFour'],
};

// Trim levels per merk
export const TRIM_LEVELS: Record<string, string[]> = {
  // Duits Premium
  'Audi': ['Basic', 'Attraction', 'Ambiente', 'Design', 'Sport', 'S-Line', 'Black Edition', 'S', 'RS'],
  'BMW': ['Base', 'Advantage', 'Sport Line', 'Luxury Line', 'M Sport', 'M Sport Pro', 'M', 'M Performance'],
  'Mercedes-Benz': ['Style', 'Progressive', 'Avantgarde', 'AMG Line', 'AMG Line Premium', 'Night Edition', 'AMG'],
  'Porsche': ['Base', 'S', 'GTS', 'Turbo', 'Turbo S', 'GT3', 'GT3 RS', 'GT4', 'Targa'],

  // Duits Volume
  'Volkswagen': ['Trendline', 'Comfortline', 'Highline', 'R-Line', 'GTI', 'GTD', 'GTE', 'R', 'Life', 'Style', 'Elegance'],
  'Opel': ['Edition', 'Elegance', 'Ultimate', 'GS Line', 'GS', 'Business Edition'],

  // Japans
  'Toyota': ['Active', 'Comfort', 'Style', 'Executive', 'GR Sport', 'Premiere Edition', 'Business', 'Dynamic'],
  'Honda': ['Comfort', 'Elegance', 'Advance', 'Executive', 'Sport', 'Type R'],
  'Mazda': ['Prime-Line', 'Centre-Line', 'Luxury', 'Homura', 'Takumi', 'Nagisa', 'Newground'],
  'Nissan': ['Visia', 'Acenta', 'N-Connecta', 'Tekna', 'Tekna+', 'N-Design', 'Nismo'],
  'Suzuki': ['Club', 'Comfort', 'Select', 'Style', 'AllGrip', 'Stijl'],
  'Mitsubishi': ['Inform', 'Invite', 'Instyle', 'Intense', 'Business Edition'],
  'Subaru': ['Comfort', 'Premium', 'Platinum', 'Sport', 'Executive Plus'],
  'Lexus': ['Business Line', 'Luxury Line', 'F Sport', 'F Sport+', 'Takumi', 'Executive'],

  // Koreaans
  'Kia': ['ComfortLine', 'ExecutiveLine', 'DynamicLine', 'GT-Line', 'GT', 'First Edition'],
  'Hyundai': ['i-Motion', 'i-Drive', 'Comfort', 'Premium', 'N-Line', 'N', 'Style', 'Business'],
  'Genesis': ['Standard', 'Luxury', 'Sport', 'Prestige'],

  // Frans
  'Peugeot': ['Active', 'Allure', 'GT', 'GT Pack', 'Roadtrip', 'First Edition'],
  'Renault': ['Life', 'Zen', 'Intens', 'R.S. Line', 'R.S.', 'Techno', 'Iconic', 'Equilibre', 'Evolution', 'Esprit Alpine'],
  'Citroën': ['Live', 'Feel', 'Shine', 'Shine Pack', 'C-Series', 'Origins'],
  'DS': ['Performance Line', 'Rivoli', 'Opera', 'La Première'],

  // Italiaans
  'Fiat': ['Base', 'Pop', 'Lounge', 'Sport', 'Cross', 'Icon', 'La Prima', 'Dolcevita'],
  'Alfa Romeo': ['Super', 'Sprint', 'Ti', 'Veloce', 'Quadrifoglio', 'Competizione'],
  'Maserati': ['Base', 'GT', 'Modena', 'Trofeo', 'Folgore'],

  // Brits
  'Jaguar': ['S', 'SE', 'HSE', 'R-Dynamic', 'R-Dynamic S', 'R-Dynamic SE', 'R-Dynamic HSE', 'SVR', 'First Edition'],
  'Land Rover': ['S', 'SE', 'HSE', 'Autobiography', 'SVR', 'First Edition', 'X-Dynamic', 'Dynamic'],
  'Mini': ['Classic', 'Salt', 'Pepper', 'Chili', 'Camden', 'JCW', 'Resolute', 'Untamed'],

  // Zweeds
  'Volvo': ['Core', 'Plus', 'Plus Dark', 'Plus Bright', 'Ultimate', 'Polestar Engineered', 'R-Design', 'Inscription', 'Momentum'],
  'Polestar': ['Standard Range Single Motor', 'Long Range Single Motor', 'Long Range Dual Motor', 'Long Range Dual Motor Performance'],

  // Tsjechisch
  'Skoda': ['Active', 'Ambition', 'Style', 'L&K', 'RS', 'Sportline', 'Monte Carlo', 'Scout'],

  // Spaans
  'SEAT': ['Reference', 'Style', 'Xcellence', 'FR', 'Cupra'],
  'Cupra': ['V', 'VZ', 'VZ2', 'VZ3', 'Tribe'],

  // Amerikaans
  'Ford': ['Trend', 'Titanium', 'ST-Line', 'ST-Line X', 'Vignale', 'ST', 'Active', 'Wildtrak'],
  'Jeep': ['Sport', 'Longitude', 'Limited', 'Trailhawk', 'Overland', 'Summit', 'Rubicon', 'Sahara'],
  'Tesla': ['Standard Range', 'Standard Range Plus', 'Long Range', 'Performance', 'Plaid'],

  // Chinees/Budget
  'BYD': ['Comfort', 'Design', 'Excellence'],
  'MG': ['Standard', 'Comfort', 'Luxury', 'Trophy', 'XPower'],
  'Dacia': ['Essential', 'Expression', 'Extreme', 'Journey', 'Techroad', 'SL Extreme'],
  'Smart': ['Pure', 'Pulse', 'Prime', 'Brabus'],
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
  { id: 'bowers', label: 'Bowers & Wilkins', category: 'premium', searchKeyword: 'bowers' },
  { id: 'meridian', label: 'Meridian Audio', category: 'premium', searchKeyword: 'meridian' },
  { id: 'burmester', label: 'Burmester Audio', category: 'premium', searchKeyword: 'burmester' },
  { id: 'massage', label: 'Massagestoelen', category: 'premium', searchKeyword: 'massage' },
  { id: 'nightvision', label: 'Nachtzicht', category: 'premium', searchKeyword: 'night vision' },
  
  // Comfort opties
  { id: 'stoelverwarming', label: 'Stoelverwarming', category: 'comfort' },
  { id: 'stoelkoeling', label: 'Stoelkoeling', category: 'comfort' },
  { id: 'elektrische_stoelen', label: 'Elektrische stoelen', category: 'comfort' },
  { id: 'keyless', label: 'Keyless Entry/Go', category: 'comfort', searchKeyword: 'keyless' },
  { id: 'elektrische_achterklep', label: 'Elektrische achterklep', category: 'comfort' },
  { id: 'stuurverwarming', label: 'Stuurverwarming', category: 'comfort' },
  { id: 'memory_stoelen', label: 'Memory stoelen', category: 'comfort' },
  { id: 'airco_3zone', label: '3-zone klimaatregeling', category: 'comfort' },
  { id: 'airco_4zone', label: '4-zone klimaatregeling', category: 'comfort' },
  { id: 'soft_close', label: 'Soft-close deuren', category: 'comfort' },
  
  // Technologie opties
  { id: 'navigatie', label: 'Navigatie', category: 'tech' },
  { id: 'led', label: 'LED Verlichting', category: 'tech', searchKeyword: 'LED' },
  { id: 'camera_360', label: '360° Camera', category: 'tech', searchKeyword: '360' },
  { id: 'camera_achter', label: 'Achteruitrijcamera', category: 'tech' },
  { id: 'apple_carplay', label: 'Apple CarPlay', category: 'tech', searchKeyword: 'carplay' },
  { id: 'android_auto', label: 'Android Auto', category: 'tech' },
  { id: 'draadloos_laden', label: 'Draadloos telefoon laden', category: 'tech' },
  { id: 'digitaal_dashboard', label: 'Digitaal dashboard', category: 'tech' },
  { id: 'groot_scherm', label: 'Groot touchscreen (>12")', category: 'tech' },
  { id: 'head_up', label: 'Head-Up Display', category: 'tech' },
  
  // Veiligheid / Rijassistentie
  { id: 'acc', label: 'ACC (Adaptive Cruise)', category: 'veiligheid', searchKeyword: 'ACC' },
  { id: 'lane_assist', label: 'Lane Assist', category: 'veiligheid' },
  { id: 'dodehoek', label: 'Dodehoek detectie', category: 'veiligheid' },
  { id: 'parkeer_assist', label: 'Park Assist', category: 'veiligheid' },
  { id: 'emergency_brake', label: 'Emergency Brake Assist', category: 'veiligheid' },
  { id: 'travel_assist', label: 'Travel Assist / Pilot Assist', category: 'veiligheid' },
  { id: 'traffic_sign', label: 'Verkeersbordherkenning', category: 'veiligheid' },
  
  // Praktisch
  { id: 'trekhaak', label: 'Trekhaak', category: 'praktisch', searchKeyword: 'trekhaak' },
  { id: 'winterbanden', label: 'Winterbanden/set', category: 'praktisch' },
  { id: 'dakrails', label: 'Dakrails', category: 'praktisch' },
  { id: 'privacy_glas', label: 'Privacy glas', category: 'praktisch' },
  { id: 'grote_velgen', label: 'Grote velgen (19"+)', category: 'praktisch' },
  { id: 'sportonderstel', label: 'Sportonderstel', category: 'praktisch' },
  { id: 'luchtvering', label: 'Luchtvering', category: 'praktisch', searchKeyword: 'luchtvering' },
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
