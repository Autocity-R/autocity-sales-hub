// Carrosserietypes (alfabetisch)
export const BODY_TYPES = [
  'Bedrijfswagen',
  'Bus',
  'Cabrio',
  'Coupé',
  'Crossover',
  'Fastback',
  'Hatchback',
  'MPV',
  'Pick-up',
  'Roadster',
  'Sedan',
  'Stationwagen',
  'SUV',
] as const;

// Brandstoftypes (alfabetisch)
export const FUEL_TYPES = [
  'Benzine',
  'Diesel',
  'Elektrisch',
  'Hybride',
  'LPG',
  'Plug-in Hybride',
] as const;

// Transmissie types (alfabetisch)
export const TRANSMISSION_TYPES = [
  'Automaat',
  'Handgeschakeld',
] as const;

// Kleuren (alfabetisch)
export const COLORS = [
  'Beige',
  'Blauw',
  'Bruin',
  'Geel',
  'Grijs',
  'Groen',
  'Oranje',
  'Paars',
  'Rood',
  'Wit',
  'Zilver',
  'Zwart',
] as const;

// Merken met modellen (alfabetisch gesorteerd)
export const VEHICLE_BRANDS: Record<string, string[]> = {
  'Aiways': ['U5', 'U6'],
  'Alfa Romeo': ['4C', 'Giulia', 'Giulietta', 'Junior', 'Stelvio', 'Tonale'],
  'Aston Martin': ['DB11', 'DB12', 'DBS', 'DBX', 'Vantage'],
  'Audi': ['A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'e-tron', 'e-tron GT', 'Q2', 'Q3', 'Q4 e-tron', 'Q5', 'Q7', 'Q8', 'Q8 e-tron', 'R8', 'RS3', 'RS4', 'RS5', 'RS6', 'RS7', 'RS Q8', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'SQ5', 'SQ7', 'SQ8', 'TT'],
  'Bentley': ['Bentayga', 'Continental GT', 'Continental GTC', 'Flying Spur'],
  'BMW': ['1 Serie', '2 Serie', '3 Serie', '4 Serie', '5 Serie', '6 Serie', '7 Serie', '8 Serie', 'i3', 'i4', 'i5', 'i7', 'iX', 'iX1', 'iX2', 'iX3', 'M135i', 'M2', 'M235i', 'M240i', 'M3', 'M340i', 'M4', 'M440i', 'M5', 'M550i', 'M760i', 'M8', 'X1', 'X2', 'X3', 'X3 M', 'X4', 'X4 M', 'X5', 'X5 M', 'X6', 'X6 M', 'X7', 'XM', 'Z4'],
  'BYD': ['Atto 3', 'Dolphin', 'Han', 'Seal', 'Seal U', 'Sealion 7', 'Tang'],
  'Chevrolet': ['Blazer', 'Camaro', 'Corvette', 'Silverado', 'Suburban', 'Tahoe'],
  'Citroën': ['Ami', 'Berlingo', 'C1', 'C3', 'C3 Aircross', 'C4', 'C4 X', 'C5 Aircross', 'C5 X', 'ë-Berlingo', 'ë-C4', 'ë-SpaceTourer', 'Jumper', 'Jumpy', 'SpaceTourer'],
  'Cupra': ['Ateca', 'Born', 'Formentor', 'Leon', 'Tavascan', 'Terramar'],
  'Dacia': ['Dokker', 'Duster', 'Jogger', 'Lodgy', 'Logan', 'Sandero', 'Spring'],
  'Dodge': ['Challenger', 'Charger', 'Durango', 'RAM 1500'],
  'DS': ['DS3 Crossback', 'DS3 E-Tense', 'DS4', 'DS7', 'DS7 E-Tense', 'DS9'],
  'Ferrari': ['296 GTB', '296 GTS', '812', '812 GTS', 'Daytona SP3', 'F8 Spider', 'F8 Tributo', 'Portofino', 'Purosangue', 'Roma', 'SF90 Spider', 'SF90 Stradale'],
  'Fiat': ['500', '500e', '500L', '500X', '600e', 'Doblo', 'Ducato', 'Fiorino', 'Panda', 'Scudo', 'Tipo', 'Topolino'],
  'Ford': ['Bronco', 'EcoSport', 'Edge', 'Explorer', 'F-150', 'Fiesta', 'Focus', 'Galaxy', 'Kuga', 'Mondeo', 'Mustang', 'Mustang Mach-E', 'Puma', 'Ranger', 'S-Max', 'Tourneo', 'Tourneo Connect', 'Transit', 'Transit Connect', 'Transit Custom'],
  'Genesis': ['G70', 'G80', 'G90', 'GV60', 'GV70', 'GV80'],
  'Honda': ['Civic', 'Civic Type R', 'CR-V', 'e', 'e:Ny1', 'HR-V', 'Jazz', 'NSX', 'ZR-V'],
  'Hyundai': ['Bayon', 'H350', 'i10', 'i20', 'i20 N', 'i30', 'i30 N', 'Ioniq', 'Ioniq 5', 'Ioniq 6', 'Kona', 'Kona N', 'Nexo', 'Santa Fe', 'Staria', 'Tucson'],
  'Jaguar': ['E-Pace', 'F-Pace', 'F-Type', 'I-Pace', 'XE', 'XF'],
  'Jeep': ['Avenger', 'Cherokee', 'Commander', 'Compass', 'Gladiator', 'Grand Cherokee', 'Renegade', 'Wrangler'],
  'Kia': ['Carnival', 'Ceed', 'e-Niro', 'EV6', 'EV9', 'Niro', 'Picanto', 'Proceed', 'Rio', 'Seltos', 'Sorento', 'Soul', 'Sportage', 'Stinger', 'Stonic', 'XCeed'],
  'Lamborghini': ['Huracán', 'Huracán Evo', 'Huracán Tecnica', 'Revuelto', 'Urus'],
  'Land Rover': ['Defender', 'Discovery', 'Discovery Sport', 'Range Rover', 'Range Rover Evoque', 'Range Rover Sport', 'Range Rover Velar'],
  'Leapmotor': ['C10', 'T03'],
  'Lexus': ['ES', 'GS', 'IS', 'LBX', 'LC', 'LM', 'LS', 'NX', 'RC', 'RX', 'RZ', 'UX'],
  'Lynk & Co': ['01', '02'],
  'Maserati': ['Ghibli', 'GranCabrio', 'GranTurismo', 'Grecale', 'Levante', 'MC20', 'Quattroporte'],
  'Mazda': ['2', '3', '6', 'CX-3', 'CX-30', 'CX-5', 'CX-60', 'CX-80', 'MX-30', 'MX-5', 'MX-5 RF'],
  'McLaren': ['570S', '720S', '750S', '765LT', 'Artura', 'GT'],
  'Mercedes-Benz': ['A-Klasse', 'AMG A35', 'AMG A45', 'AMG C43', 'AMG C63', 'AMG E53', 'AMG E63', 'AMG GLE53', 'AMG GLE63', 'AMG GT', 'B-Klasse', 'C-Klasse', 'Citan', 'CLA', 'CLS', 'E-Klasse', 'EQA', 'EQB', 'EQC', 'EQE', 'EQS', 'EQV', 'G-Klasse', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'Marco Polo', 'S-Klasse', 'SL', 'SLC', 'Sprinter', 'V-Klasse', 'Vito'],
  'MG': ['Marvel R', 'MG3', 'MG4', 'MG4 XPower', 'MG5', 'MG Cyberster', 'HS', 'ZS', 'ZS EV'],
  'Mini': ['Aceman', 'Cabrio', 'Clubman', 'Cooper', 'Cooper S', 'Countryman', 'Countryman SE', 'Electric', 'JCW', 'Paceman'],
  'Mitsubishi': ['ASX', 'Colt', 'Eclipse Cross', 'L200', 'Outlander', 'Space Star'],
  'Nio': ['EL6', 'EL7', 'EL8', 'EP9', 'ET5', 'ET7'],
  'Nissan': ['370Z', 'Ariya', 'GT-R', 'Interstar', 'Juke', 'Leaf', 'Micra', 'Navara', 'Note', 'Primastar', 'Qashqai', 'Townstar', 'X-Trail'],
  'Opel': ['Astra', 'Astra-e', 'Combo', 'Corsa', 'Corsa-e', 'Crossland', 'Grandland', 'Insignia', 'Mokka', 'Mokka-e', 'Movano', 'Rocks-e', 'Vivaro', 'Zafira', 'Zafira Life'],
  'ORA': ['Funky Cat', 'Lightning Cat'],
  'Peugeot': ['108', '208', '2008', '308', '308 SW', '3008', '408', '5008', '508', 'Boxer', 'e-2008', 'e-208', 'e-3008', 'e-308', 'e-5008', 'Expert', 'Partner', 'Rifter', 'Traveller'],
  'Polestar': ['Polestar 2', 'Polestar 3', 'Polestar 4'],
  'Porsche': ['718 Boxster', '718 Cayman', '911', 'Boxster', 'Cayenne', 'Cayenne Coupé', 'Cayman', 'Macan', 'Macan Electric', 'Panamera', 'Taycan'],
  'Renault': ['Arkana', 'Austral', 'Captur', 'Clio', 'Espace', 'Express', 'Kangoo', 'Kadjar', 'Master', 'Megane', 'Megane E-Tech', 'Rafale', 'Scenic', 'Scenic E-Tech', 'Trafic', 'Twingo', 'Zoe'],
  'Rolls-Royce': ['Cullinan', 'Dawn', 'Ghost', 'Phantom', 'Spectre', 'Wraith'],
  'SEAT': ['Arona', 'Ateca', 'Ibiza', 'Leon', 'Leon Cupra', 'Leon FR', 'Leon Sportstourer', 'Tarraco'],
  'Skoda': ['Elroq', 'Enyaq', 'Enyaq Coupé', 'Fabia', 'Fabia Monte Carlo', 'Kamiq', 'Karoq', 'Kodiaq', 'Kodiaq RS', 'Octavia', 'Octavia RS', 'Scala', 'Superb'],
  'Smart': ['#1', '#3', 'EQ ForFour', 'EQ ForTwo', 'ForFour', 'ForTwo'],
  'Subaru': ['BRZ', 'Forester', 'Impreza', 'Levorg', 'Outback', 'Solterra', 'WRX', 'XV'],
  'Suzuki': ['Across', 'Baleno', 'Ignis', 'Jimny', 'S-Cross', 'Swace', 'Swift', 'SX4 S-Cross', 'Vitara'],
  'Tesla': ['Cybertruck', 'Model 3', 'Model S', 'Model X', 'Model Y'],
  'Toyota': ['Aygo', 'Aygo X', 'bZ4X', 'C-HR', 'Camry', 'Corolla', 'Corolla Cross', 'GR Supra', 'GR Yaris', 'GR86', 'Highlander', 'Hilux', 'Land Cruiser', 'Mirai', 'Prius', 'Proace', 'Proace City', 'Proace Verso', 'RAV4', 'Yaris', 'Yaris Cross'],
  'Volkswagen': ['Amarok', 'Arteon', 'Caddy', 'Crafter', 'Golf', 'Golf GTE', 'Golf GTD', 'Golf GTI', 'Golf R', 'ID.3', 'ID.4', 'ID.5', 'ID.7', 'ID.Buzz', 'Multivan', 'Passat', 'Polo', 'T-Cross', 'T-Roc', 'Taigo', 'Tiguan', 'Tiguan R', 'Touareg', 'Touareg R', 'Touran', 'Transporter', 'up!'],
  'Volvo': ['C40', 'C40 Recharge', 'EX30', 'EX90', 'S60', 'S90', 'V60', 'V60 Cross Country', 'V90', 'V90 Cross Country', 'XC40', 'XC40 Recharge', 'XC60', 'XC90'],
  'XPeng': ['G6', 'G9', 'P7'],
};

// Trim levels per merk (alfabetisch gesorteerd)
export const TRIM_LEVELS: Record<string, string[]> = {
  'Alfa Romeo': ['Competizione', 'Quadrifoglio', 'Sprint', 'Super', 'Ti', 'Veloce'],
  'Audi': ['Ambiente', 'Attraction', 'Basic', 'Black Edition', 'Design', 'RS', 'S', 'S-Line', 'Sport'],
  'BMW': ['Advantage', 'Base', 'Luxury Line', 'M', 'M Performance', 'M Sport', 'M Sport Pro', 'Sport Line'],
  'BYD': ['Comfort', 'Design', 'Excellence'],
  'Citroën': ['C-Series', 'Feel', 'Live', 'Origins', 'Shine', 'Shine Pack'],
  'Dacia': ['Essential', 'Expression', 'Extreme', 'Journey', 'SL Extreme', 'Techroad'],
  'DS': ['La Première', 'Opera', 'Performance Line', 'Rivoli'],
  'Fiat': ['Base', 'Cross', 'Dolcevita', 'Icon', 'La Prima', 'Lounge', 'Pop', 'Sport'],
  'Ford': ['Active', 'ST', 'ST-Line', 'ST-Line X', 'Titanium', 'Trend', 'Vignale', 'Wildtrak'],
  'Genesis': ['Luxury', 'Prestige', 'Sport', 'Standard'],
  'Honda': ['Advance', 'Comfort', 'Elegance', 'Executive', 'Sport', 'Type R'],
  'Hyundai': ['Business', 'Comfort', 'i-Drive', 'i-Motion', 'N', 'N-Line', 'Premium', 'Style'],
  'Jaguar': ['First Edition', 'HSE', 'R-Dynamic', 'R-Dynamic HSE', 'R-Dynamic S', 'R-Dynamic SE', 'S', 'SE', 'SVR'],
  'Jeep': ['Limited', 'Longitude', 'Overland', 'Rubicon', 'Sahara', 'Sport', 'Summit', 'Trailhawk'],
  'Kia': ['ComfortLine', 'DynamicLine', 'ExecutiveLine', 'First Edition', 'GT', 'GT-Line'],
  'Land Rover': ['Autobiography', 'Dynamic', 'First Edition', 'HSE', 'S', 'SE', 'SVR', 'X-Dynamic'],
  'Lexus': ['Business Line', 'Executive', 'F Sport', 'F Sport+', 'Luxury Line', 'Takumi'],
  'Maserati': ['Base', 'Folgore', 'GT', 'Modena', 'Trofeo'],
  'Mazda': ['Centre-Line', 'Homura', 'Luxury', 'Nagisa', 'Newground', 'Prime-Line', 'Takumi'],
  'Mercedes-Benz': ['AMG', 'AMG Line', 'AMG Line Premium', 'Avantgarde', 'Night Edition', 'Progressive', 'Style'],
  'MG': ['Comfort', 'Luxury', 'Standard', 'Trophy', 'XPower'],
  'Mini': ['Camden', 'Chili', 'Classic', 'JCW', 'Pepper', 'Resolute', 'Salt', 'Untamed'],
  'Mitsubishi': ['Business Edition', 'Inform', 'Instyle', 'Intense', 'Invite'],
  'Nissan': ['Acenta', 'N-Connecta', 'N-Design', 'Nismo', 'Tekna', 'Tekna+', 'Visia'],
  'Opel': ['Business Edition', 'Edition', 'Elegance', 'GS', 'GS Line', 'Ultimate'],
  'Peugeot': ['Active', 'Allure', 'First Edition', 'GT', 'GT Pack', 'Roadtrip'],
  'Polestar': ['Long Range Dual Motor', 'Long Range Dual Motor Performance', 'Long Range Single Motor', 'Standard Range Single Motor'],
  'Porsche': ['Base', 'GTS', 'GT3', 'GT3 RS', 'GT4', 'S', 'Targa', 'Turbo', 'Turbo S'],
  'Renault': ['Equilibre', 'Esprit Alpine', 'Evolution', 'Iconic', 'Intens', 'Life', 'R.S.', 'R.S. Line', 'Techno', 'Zen'],
  'SEAT': ['Cupra', 'FR', 'Reference', 'Style', 'Xcellence'],
  'Skoda': ['Active', 'Ambition', 'L&K', 'Monte Carlo', 'RS', 'Scout', 'Sportline', 'Style'],
  'Smart': ['Brabus', 'Prime', 'Pulse', 'Pure'],
  'Subaru': ['Comfort', 'Executive Plus', 'Platinum', 'Premium', 'Sport'],
  'Suzuki': ['AllGrip', 'Club', 'Comfort', 'Select', 'Stijl', 'Style'],
  'Tesla': ['Long Range', 'Performance', 'Plaid', 'Standard Range', 'Standard Range Plus'],
  'Toyota': ['Active', 'Business', 'Comfort', 'Dynamic', 'Executive', 'GR Sport', 'Premiere Edition', 'Style'],
  'Volkswagen': ['Comfortline', 'Elegance', 'GTE', 'GTD', 'GTI', 'Highline', 'Life', 'R', 'R-Line', 'Style', 'Trendline'],
  'Volvo': ['Core', 'Inscription', 'Momentum', 'Plus', 'Plus Bright', 'Plus Dark', 'Polestar Engineered', 'R-Design', 'Ultimate'],
  'Cupra': ['Tribe', 'V', 'VZ', 'VZ2', 'VZ3'],
};

// Uitgebreide opties met categorieën
export interface VehicleOption {
  id: string;
  label: string;
  category: 'premium' | 'comfort' | 'tech' | 'praktisch' | 'veiligheid';
  searchKeyword?: string;
}

export const VEHICLE_OPTIONS: VehicleOption[] = [
  // Comfort opties (alfabetisch)
  { id: 'airco_3zone', label: '3-zone klimaatregeling', category: 'comfort' },
  { id: 'airco_4zone', label: '4-zone klimaatregeling', category: 'comfort' },
  { id: 'elektrische_achterklep', label: 'Elektrische achterklep', category: 'comfort' },
  { id: 'elektrische_stoelen', label: 'Elektrische stoelen', category: 'comfort' },
  { id: 'keyless', label: 'Keyless Entry/Go', category: 'comfort', searchKeyword: 'keyless' },
  { id: 'memory_stoelen', label: 'Memory stoelen', category: 'comfort' },
  { id: 'soft_close', label: 'Soft-close deuren', category: 'comfort' },
  { id: 'stoelkoeling', label: 'Stoelkoeling', category: 'comfort' },
  { id: 'stoelverwarming', label: 'Stoelverwarming', category: 'comfort' },
  { id: 'stuurverwarming', label: 'Stuurverwarming', category: 'comfort' },

  // Praktisch (alfabetisch)
  { id: 'dakrails', label: 'Dakrails', category: 'praktisch' },
  { id: 'grote_velgen', label: 'Grote velgen (19"+)', category: 'praktisch' },
  { id: 'luchtvering', label: 'Luchtvering', category: 'praktisch', searchKeyword: 'luchtvering' },
  { id: 'privacy_glas', label: 'Privacy glas', category: 'praktisch' },
  { id: 'sportonderstel', label: 'Sportonderstel', category: 'praktisch' },
  { id: 'trekhaak', label: 'Trekhaak', category: 'praktisch', searchKeyword: 'trekhaak' },
  { id: 'winterbanden', label: 'Winterbanden/set', category: 'praktisch' },

  // Premium opties (alfabetisch)
  { id: 'bowers', label: 'Bowers & Wilkins', category: 'premium', searchKeyword: 'bowers' },
  { id: 'burmester', label: 'Burmester Audio', category: 'premium', searchKeyword: 'burmester' },
  { id: 'harman', label: 'Harman Kardon / B&O', category: 'premium', searchKeyword: 'harman kardon' },
  { id: 'headup', label: 'Head-up Display', category: 'premium' },
  { id: 'leder', label: 'Leder interieur', category: 'premium', searchKeyword: 'leder' },
  { id: 'massage', label: 'Massagestoelen', category: 'premium', searchKeyword: 'massage' },
  { id: 'matrix_led', label: 'Matrix LED / IQ.Light', category: 'premium', searchKeyword: 'matrix' },
  { id: 'meridian', label: 'Meridian Audio', category: 'premium', searchKeyword: 'meridian' },
  { id: 'nightvision', label: 'Nachtzicht', category: 'premium', searchKeyword: 'night vision' },
  { id: 'panoramadak', label: 'Panoramadak', category: 'premium', searchKeyword: 'panorama' },

  // Technologie opties (alfabetisch)
  { id: 'camera_360', label: '360° Camera', category: 'tech', searchKeyword: '360' },
  { id: 'camera_achter', label: 'Achteruitrijcamera', category: 'tech' },
  { id: 'android_auto', label: 'Android Auto', category: 'tech' },
  { id: 'apple_carplay', label: 'Apple CarPlay', category: 'tech', searchKeyword: 'carplay' },
  { id: 'digitaal_dashboard', label: 'Digitaal dashboard', category: 'tech' },
  { id: 'draadloos_laden', label: 'Draadloos telefoon laden', category: 'tech' },
  { id: 'groot_scherm', label: 'Groot touchscreen (>12")', category: 'tech' },
  { id: 'head_up', label: 'Head-Up Display', category: 'tech' },
  { id: 'led', label: 'LED Verlichting', category: 'tech', searchKeyword: 'LED' },
  { id: 'navigatie', label: 'Navigatie', category: 'tech' },

  // Veiligheid / Rijassistentie (alfabetisch)
  { id: 'acc', label: 'ACC (Adaptive Cruise)', category: 'veiligheid', searchKeyword: 'ACC' },
  { id: 'dodehoek', label: 'Dodehoek detectie', category: 'veiligheid' },
  { id: 'emergency_brake', label: 'Emergency Brake Assist', category: 'veiligheid' },
  { id: 'lane_assist', label: 'Lane Assist', category: 'veiligheid' },
  { id: 'parkeer_assist', label: 'Park Assist', category: 'veiligheid' },
  { id: 'traffic_sign', label: 'Verkeersbordherkenning', category: 'veiligheid' },
  { id: 'travel_assist', label: 'Travel Assist / Pilot Assist', category: 'veiligheid' },
];

// Groepeer opties per categorie
export const OPTIONS_BY_CATEGORY = {
  comfort: VEHICLE_OPTIONS.filter(o => o.category === 'comfort'),
  praktisch: VEHICLE_OPTIONS.filter(o => o.category === 'praktisch'),
  premium: VEHICLE_OPTIONS.filter(o => o.category === 'premium'),
  tech: VEHICLE_OPTIONS.filter(o => o.category === 'tech'),
  veiligheid: VEHICLE_OPTIONS.filter(o => o.category === 'veiligheid'),
};

export const CATEGORY_LABELS: Record<string, string> = {
  comfort: '🛋️ Comfort',
  praktisch: '🔧 Praktisch',
  premium: '⭐ Premium',
  tech: '📱 Technologie',
  veiligheid: '🛡️ Veiligheid',
};

// WAARDE-BEPALENDE OPTIES - Alleen de opties die significant effect hebben op de waarde
export interface ValueOption {
  id: string;
  label: string;
  icon: string;
  valueImpact: 'hoog' | 'medium' | 'laag';
  searchKeyword: string;
  evOnly?: boolean;
}

export const VALUE_OPTIONS: ValueOption[] = [
  { id: 'panoramadak', label: 'Panoramadak / Open Dak', icon: '🌤️', valueImpact: 'hoog', searchKeyword: 'panorama roof' },
  { id: 'luchtvering', label: 'Luchtvering', icon: '🛋️', valueImpact: 'hoog', searchKeyword: 'air suspension' },
  { id: 'premium_audio', label: 'Premium Audio (B&W/Burmester/Harman)', icon: '🔊', valueImpact: 'medium', searchKeyword: 'premium audio' },
  { id: '7_zitter', label: '7 Zitter', icon: '👨‍👩‍👧‍👦', valueImpact: 'medium', searchKeyword: '7 seater' },
  { id: 'trekhaak', label: 'Trekhaak', icon: '🚗', valueImpact: 'laag', searchKeyword: 'tow bar' },
  { id: 'long_range', label: 'Long Range (EV)', icon: '🔋', valueImpact: 'hoog', searchKeyword: 'long range', evOnly: true },
];
