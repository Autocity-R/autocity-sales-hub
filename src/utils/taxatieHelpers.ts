/**
 * Bereken de maximale KM-stand voor portal zoeken
 * Logica: Afronden naar boven in tienduizendtallen + 20.000 km
 * 
 * Voorbeelden:
 * - 17.000 km → max 40.000 km (afgerond naar 20k + 20k)
 * - 23.000 km → max 50.000 km (afgerond naar 30k + 20k)
 * - 45.000 km → max 70.000 km (afgerond naar 50k + 20k)
 * - 50.000 km → max 70.000 km (50k + 20k)
 */
export const calculateMaxMileage = (actualMileage: number): number => {
  const roundedUp = Math.ceil(actualMileage / 10000) * 10000;
  return roundedUp + 20000;
};

/**
 * Formatteer KM-stand voor weergave
 */
export const formatMileage = (mileage: number): string => {
  return `${mileage.toLocaleString('nl-NL')} km`;
};

/**
 * Formatteer prijs voor weergave
 */
export const formatPrice = (price: number): string => {
  return `€ ${price.toLocaleString('nl-NL')}`;
};

/**
 * Genereer bouwjaar range voor portal zoeken
 * Default: -1 tot +1 jaar
 */
export const calculateBuildYearRange = (buildYear: number, range: number = 1): { from: number; to: number } => {
  return {
    from: buildYear - range,
    to: buildYear + range,
  };
};

/**
 * Valideer kenteken formaat (Nederlands)
 */
export const isValidDutchLicensePlate = (plate: string): boolean => {
  // Verwijder streepjes en spaties, maak hoofdletters
  const cleaned = plate.replace(/[-\s]/g, '').toUpperCase();
  
  // Nederlandse kentekens: 6 karakters (letters en cijfers)
  if (cleaned.length !== 6) return false;
  
  // Moet minimaal 1 letter en 1 cijfer bevatten
  const hasLetter = /[A-Z]/.test(cleaned);
  const hasDigit = /[0-9]/.test(cleaned);
  
  return hasLetter && hasDigit;
};

/**
 * Formatteer kenteken met streepjes
 */
export const formatLicensePlate = (plate: string): string => {
  const cleaned = plate.replace(/[-\s]/g, '').toUpperCase();
  if (cleaned.length !== 6) return plate.toUpperCase();
  
  // Format: XX-999-XX of 99-XXX-9 etc.
  return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5)}`;
};
