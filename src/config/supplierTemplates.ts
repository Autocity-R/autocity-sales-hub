// Supplier-specific Excel templates for auto-detection and mapping

export interface SupplierTemplate {
  id: string;
  name: string;
  detectPatterns: string[]; // Patterns to match in filename or columns
  columnHints: Partial<Record<string, string[]>>; // Field → possible column names
  requiresAIParsing: boolean; // If true, descriptions need AI parsing
  combinedDescriptionColumn?: string; // Column with combined vehicle description
}

export const SUPPLIER_TEMPLATES: SupplierTemplate[] = [
  {
    id: 'arval',
    name: 'Arval',
    detectPatterns: ['arval', 'my preference', 'mypreference'],
    columnHints: {
      combinedDescription: ['vehicle', 'description', 'asset', 'model description', 'vehicle description'],
      mileage: ['odometer', 'km', 'mileage', 'kilometers'],
      askingPrice: ['residual', 'price', 'value', 'net value', 'residual value'],
      color: ['colour', 'color', 'kleur'],
    },
    requiresAIParsing: true,
    combinedDescriptionColumn: 'vehicle',
  },
  {
    id: 'ald',
    name: 'ALD Automotive',
    detectPatterns: ['ald', 'ald automotive'],
    columnHints: {
      combinedDescription: ['vehicle type', 'car', 'description', 'voertuig'],
      mileage: ['km stand', 'kilometerstand', 'odometer'],
      askingPrice: ['restwaarde', 'prijs', 'aankoopprijs'],
    },
    requiresAIParsing: true,
  },
  {
    id: 'leaseplan',
    name: 'LeasePlan',
    detectPatterns: ['leaseplan', 'lease plan'],
    columnHints: {
      brand: ['merk', 'make', 'brand'],
      model: ['model', 'type'],
      combinedDescription: ['omschrijving', 'description', 'vehicle'],
      mileage: ['km', 'kilometers', 'mileage'],
      askingPrice: ['prijs', 'bedrag', 'restwaarde'],
    },
    requiresAIParsing: false, // Usually has separate columns
  },
  {
    id: 'alphabet',
    name: 'Alphabet',
    detectPatterns: ['alphabet'],
    columnHints: {
      combinedDescription: ['vehicle', 'model', 'description'],
      mileage: ['km', 'stand', 'odometer'],
      askingPrice: ['price', 'waarde'],
    },
    requiresAIParsing: true,
  },
  {
    id: 'terberg',
    name: 'Terberg Leasing',
    detectPatterns: ['terberg'],
    columnHints: {
      brand: ['merk'],
      model: ['model', 'type'],
      buildYear: ['bouwjaar', 'jaar'],
      mileage: ['km', 'kilometerstand'],
    },
    requiresAIParsing: false,
  },
];

// Detect supplier from filename and columns
export function detectSupplier(
  filename: string,
  columns: string[]
): SupplierTemplate | null {
  const lowerFilename = filename.toLowerCase();
  const lowerColumns = columns.map(c => c.toLowerCase());

  for (const template of SUPPLIER_TEMPLATES) {
    // Check filename patterns
    const filenameMatch = template.detectPatterns.some(pattern => 
      lowerFilename.includes(pattern)
    );
    
    if (filenameMatch) {
      return template;
    }

    // Check column patterns (if multiple hints match)
    if (template.columnHints) {
      let matchCount = 0;
      for (const hints of Object.values(template.columnHints)) {
        if (hints?.some(hint => lowerColumns.some(col => col.includes(hint)))) {
          matchCount++;
        }
      }
      // If at least 2 column hints match, likely this supplier
      if (matchCount >= 2) {
        return template;
      }
    }
  }

  return null;
}

// Find best matching column for a field
export function findColumnForField(
  columns: string[],
  fieldHints: string[]
): string | null {
  const lowerColumns = columns.map(c => c.toLowerCase());
  
  for (const hint of fieldHints) {
    const matchIndex = lowerColumns.findIndex(col => col.includes(hint.toLowerCase()));
    if (matchIndex !== -1) {
      return columns[matchIndex];
    }
  }
  
  return null;
}
