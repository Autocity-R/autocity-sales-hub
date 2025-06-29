
// Exact Online API Integration Type Definitions
// Comprehensive types for financial data integration

export interface ExactOnlineConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  baseUrl: string;
  apiVersion: string;
}

export interface ExactOnlineAuthResult {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface ExactOnlineTokenData {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  divisionCode?: string;
  companyName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExactOnlineDivision {
  Code: number;
  Country: string;
  Created: string;
  Currency: string;
  Description: string;
  HID: number;
  Main: boolean;
  Status: number;
}

// Sales Invoice Types
export interface ExactOnlineSalesInvoice {
  InvoiceID: string;
  InvoiceNumber: number;
  InvoiceDate: string;
  DueDate: string;
  Customer: string;
  CustomerName: string;
  Currency: string;
  AmountFC: number;
  AmountDC: number;
  VATAmountFC: number;
  VATAmountDC: number;
  Status: number;
  StatusDescription: string;
  Division: number;
  Created: string;
  Modified: string;
  YourRef: string;
  Description: string;
}

// Purchase Invoice Types
export interface ExactOnlinePurchaseInvoice {
  ID: string;
  InvoiceNumber: string;
  InvoiceDate: string;
  DueDate: string;
  Supplier: string;
  SupplierName: string;
  Currency: string;
  AmountFC: number;
  AmountDC: number;
  VATAmountFC: number;
  VATAmountDC: number;
  Status: number;
  Division: number;
  Created: string;
  Modified: string;
  Description: string;
}

// Payment Types
export interface ExactOnlinePayment {
  ID: string;
  PaymentDate: string;
  Account: string;
  AccountName: string;
  AmountFC: number;
  AmountDC: number;
  Currency: string;
  Description: string;
  Division: number;
  PaymentMethod: string;
  Reference: string;
  Status: number;
  Created: string;
}

// General Ledger Account Types
export interface ExactOnlineGLAccount {
  ID: string;
  Code: string;
  Description: string;
  Division: number;
  Type: number;
  TypeDescription: string;
  BalanceType: string;
  Level: number;
  Parent: string;
  IsActive: boolean;
  Created: string;
  Modified: string;
}

// Budget Types
export interface ExactOnlineBudget {
  ID: string;
  BudgetScenario: string;
  GLAccount: string;
  GLAccountDescription: string;
  AmountDC: number;
  Division: number;
  ReportingPeriod: number;
  ReportingYear: number;
  Created: string;
  Modified: string;
}

// Item/Product Types
export interface ExactOnlineItem {
  ID: string;
  Code: string;
  Description: string;
  Division: number;
  ItemGroup: string;
  ItemGroupDescription: string;
  Type: number;
  Unit: string;
  IsSalesItem: boolean;
  IsPurchaseItem: boolean;
  IsStockItem: boolean;
  SalesPrice: number;
  PurchasePrice: number;
  CostPrice: number;
  Stock: number;
  Created: string;
  Modified: string;
}

// API Response Types
export interface ExactOnlineApiResponse<T> {
  d: {
    results: T[];
    __next?: string;
  };
}

export interface ExactOnlineError {
  error: {
    code: string;
    message: {
      lang: string;
      value: string;
    };
  };
}

// Filter and Query Types
export interface ExactOnlineDateFilter {
  startDate: string;
  endDate: string;
  field?: string; // Field to filter on (e.g., 'InvoiceDate', 'Created')
}

export interface ExactOnlineQuery {
  select?: string[];
  filter?: string;
  orderby?: string;
  top?: number;
  skip?: number;
}

// Mapping Types for our existing interfaces
export interface ExactOnlineFinancialMapping {
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  operatingExpenses: number;
  ebitda: number;
  cashFlow: number;
  profitGrowth: number;
}

export interface ExactOnlineSalesMapping {
  totalSales: number;
  totalRevenue: number;
  averageMargin: number;
  totalUnits: number;
  conversionRate: number;
}

// Cache Types
export interface ExactOnlineCacheEntry {
  id: string;
  cacheKey: string;
  data: any;
  expiresAt: string;
  entityType: string;
  divisionCode?: string;
  createdAt: string;
}

// Sync Status Types
export interface ExactOnlineSyncStatus {
  id: string;
  entityType: string;
  divisionCode?: string;
  lastSync?: string;
  syncStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  recordsProcessed: number;
  errorMessage?: string;
  syncDurationMs?: number;
  createdAt: string;
  updatedAt: string;
}

// Service Configuration
export interface ExactOnlineServiceConfig {
  enableCache: boolean;
  cacheTtlMinutes: number;
  enableFallback: boolean;
  rateLimitPerMinute: number;
  timeoutMs: number;
  retryAttempts: number;
}

// Authentication Flow Types
export interface ExactOnlineAuthFlow {
  state: string;
  codeVerifier?: string;
  userId: string;
  redirectUri: string;
  scopes: string[];
}

// Connection Test Result
export interface ExactOnlineConnectionTest {
  isConnected: boolean;
  divisionCode?: string;
  companyName?: string;
  apiVersion?: string;
  responseTime?: number;
  error?: string;
  lastTested: string;
}
