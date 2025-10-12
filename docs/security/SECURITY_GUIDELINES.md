# Security Guidelines

## Overview
This document outlines security best practices and guidelines for developing and maintaining the Auto City Sales Hub application.

## Table of Contents
1. [Authentication & Authorization](#authentication--authorization)
2. [Data Protection](#data-protection)
3. [Input Validation](#input-validation)
4. [Database Security](#database-security)
5. [API Security](#api-security)
6. [Monitoring & Auditing](#monitoring--auditing)

---

## Authentication & Authorization

### User Roles
The application uses a separate `user_roles` table to manage user permissions. **Never store roles in the profiles table** to prevent privilege escalation attacks.

#### Role Hierarchy
- **Owner**: Full system access, can manage all users and settings
- **Admin**: Administrative access, user management, system configuration
- **Manager**: Access to reports, leads management, customer data
- **Verkoper** (Sales): Access to leads, customers, inventory
- **User**: Basic operational access

### Security Functions
Always use security definer functions with `SET search_path = public` for role checks:

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

### Best Practices
- ✅ Always validate user roles server-side
- ✅ Use RLS policies for all user-facing tables
- ✅ Implement proper session management
- ❌ Never check admin status from client-side storage
- ❌ Never hardcode credentials

---

## Data Protection

### Row-Level Security (RLS)
All tables containing user data or sensitive information **must** have RLS enabled with appropriate policies.

#### Critical Tables Requiring RLS
- `vehicles` - Vehicle inventory data
- `contacts` - Customer and supplier information
- `leads` - Sales leads
- `tasks` - Task assignments
- `contracts` - Contract information
- `warranty_claims` - Warranty data
- `vehicle_price_audit_log` - Price change history
- `vehicle_status_audit_log` - Status change history

### Personal Identifiable Information (PII)
Tables containing PII must have restrictive policies:
- Email addresses
- Phone numbers
- Physical addresses
- User IDs linking to employees

**Never** make PII tables publicly readable without explicit business justification.

### Data Integrity Protection

#### Sold Vehicles
The system enforces that sold vehicles (`verkocht_b2b`, `verkocht_b2c`, `afgeleverd`) must have:
- Valid `selling_price` > 0
- Valid `purchasePrice` > 0 in details JSONB

This is enforced via database triggers:
- `validate_sold_vehicle_pricing_trigger`
- Prevents status changes that would lose pricing data

#### Audit Logging
All price and status changes are automatically logged to:
- `vehicle_price_audit_log` - Tracks all price modifications
- `vehicle_status_audit_log` - Tracks all status changes

---

## Input Validation

### Client-Side Validation
Use Zod schemas for all form inputs:

```typescript
import { z } from 'zod';

const vehicleSchema = z.object({
  brand: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  selling_price: z.number().positive(),
  vin: z.string().regex(/^[A-HJ-NPR-Z0-9]{17}$/),
});
```

### Server-Side Validation
- All edge functions must validate inputs
- Use parameterized queries (Supabase client methods)
- Never execute raw SQL from user input
- Sanitize all user-provided data

### Critical Validations
- Email format validation
- Phone number format
- Price values (must be positive)
- VIN format (17 characters)
- License plate format

---

## Database Security

### Function Security
All database functions that interact with user data must include:

```sql
SECURITY DEFINER
SET search_path = public
```

This prevents search path manipulation attacks.

### Affected Functions
- `has_role`
- `is_admin_user`
- `can_manage_task`
- `update_weekly_sales`
- `get_valid_exact_online_token`
- `get_vehicles_needing_reminders`
- All price/status validation functions

### Trigger Functions
Trigger functions for logging and validation must also set `search_path`:

```sql
CREATE OR REPLACE FUNCTION log_vehicle_price_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- Function body
$$;
```

---

## API Security

### Edge Functions

#### CORS Configuration
All edge functions accessible from web clients must include CORS headers:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle preflight
if (req.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}
```

#### Authentication
- Use Supabase auth for all protected endpoints
- Validate JWT tokens server-side
- Never expose service role key to client

#### Rate Limiting
Implement rate limiting for:
- Authentication endpoints
- Data export functions
- Email sending functions

---

## Monitoring & Auditing

### Audit Logs

#### Price Changes
All vehicle price changes are logged with:
- Old and new values (purchase price, selling price)
- User who made the change
- Timestamp
- Reason for change

#### Status Changes
All vehicle status changes are logged with:
- Old and new status
- Old and new location
- User who made the change
- Timestamp
- Associated metadata (prices, etc.)

### Monitoring Alerts

#### Critical Events to Monitor
1. **Unauthorized Access Attempts**
   - Failed authentication attempts (>5 in 5 minutes)
   - RLS policy violations
   - Privilege escalation attempts

2. **Data Integrity Issues**
   - Sold vehicles with null prices
   - Status changes on sold vehicles
   - Mass price updates

3. **Webhook Failures**
   - AI agent webhook call failures
   - Retry exhaustion
   - Timeout issues

4. **System Health**
   - Database connection errors
   - Edge function failures
   - Performance degradation

### Logging Best Practices
- Log all authentication events
- Log all price/status modifications
- Log all user role changes
- Log all webhook calls (success/failure)
- Do **not** log sensitive data (passwords, tokens)

---

## Security Configuration Checklist

### Supabase Configuration
- [ ] Enable leaked password protection
- [ ] Configure MFA options (TOTP, SMS)
- [ ] Review and restrict API keys
- [ ] Configure proper auth redirect URLs
- [ ] Set appropriate session timeouts

### Database Configuration
- [ ] All RLS policies reviewed and tested
- [ ] All functions use `SET search_path = public`
- [ ] Audit logging enabled for critical tables
- [ ] Validation triggers in place
- [ ] Upgrade to latest PostgreSQL version

### Application Configuration
- [ ] Input validation on all forms
- [ ] Proper error handling (no sensitive data exposure)
- [ ] CORS policies configured
- [ ] Rate limiting implemented
- [ ] Monitoring and alerting active

---

## Incident Response

### In Case of Security Breach
1. **Immediate Actions**
   - Disable compromised accounts
   - Rotate all API keys and secrets
   - Review audit logs for unauthorized access
   - Notify affected users if PII exposed

2. **Investigation**
   - Analyze audit logs
   - Identify attack vector
   - Assess scope of compromise
   - Document findings

3. **Remediation**
   - Patch vulnerabilities
   - Update security policies
   - Implement additional monitoring
   - Update documentation

4. **Post-Incident**
   - Security review
   - Team training
   - Process improvements
   - External audit (if needed)

---

## Developer Responsibilities

### Before Deployment
- [ ] All new tables have RLS policies
- [ ] Input validation implemented
- [ ] Security review completed
- [ ] Tests include security scenarios
- [ ] Documentation updated

### Code Review Checklist
- [ ] No hardcoded credentials
- [ ] Proper error handling
- [ ] Input validation present
- [ ] RLS policies tested
- [ ] No SQL injection vulnerabilities

---

## Contact

For security concerns or to report vulnerabilities:
- Contact system administrator
- Review audit logs in Supabase dashboard
- Check monitoring alerts

**Last Updated**: 2025-01-12
**Version**: 1.0
