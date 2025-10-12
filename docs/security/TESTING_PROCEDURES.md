# Security Testing Procedures

## Overview
This document outlines comprehensive security testing procedures for the Auto City Sales Hub application.

---

## Table of Contents
1. [Pre-Deployment Testing](#pre-deployment-testing)
2. [RLS Policy Testing](#rls-policy-testing)
3. [Authentication Testing](#authentication-testing)
4. [Input Validation Testing](#input-validation-testing)
5. [Edge Function Security](#edge-function-security)
6. [Data Integrity Testing](#data-integrity-testing)
7. [Automated Testing](#automated-testing)

---

## Pre-Deployment Testing

### Security Checklist
Before deploying any changes, verify:

- [ ] All new tables have RLS enabled
- [ ] All new tables have appropriate RLS policies
- [ ] All database functions use `SET search_path = public`
- [ ] Input validation is implemented on all forms
- [ ] Edge functions have CORS headers
- [ ] No sensitive data is logged
- [ ] Audit logging is enabled for critical operations
- [ ] Authentication is required for protected routes

---

## RLS Policy Testing

### Testing Methodology

#### 1. Create Test Users
Create test users for each role:
```sql
-- Create test users in Supabase auth dashboard or via API
-- Assign different roles via user_roles table

INSERT INTO public.user_roles (user_id, role) VALUES
  ('owner-test-uuid', 'owner'),
  ('admin-test-uuid', 'admin'),
  ('manager-test-uuid', 'manager'),
  ('verkoper-test-uuid', 'verkoper'),
  ('user-test-uuid', 'user');
```

#### 2. Test Matrix for Each Table

For each critical table, test with each role:

| Table | Role | SELECT | INSERT | UPDATE | DELETE | Expected |
|-------|------|--------|--------|--------|--------|----------|
| vehicles | owner | ✓ | ✓ | ✓ | ✓ | All pass |
| vehicles | admin | ✓ | ✓ | ✓ | ✓ | All pass |
| vehicles | manager | ✓ | ✓ | ✓ | ✗ | Delete fails |
| vehicles | verkoper | ✓ | ✓ | ✓ | ✗ | Delete fails |
| vehicles | user | ✓ | ✗ | ✗ | ✗ | Only view |

#### 3. Cross-User Access Tests

Test that users cannot access other users' data where restricted:

```typescript
// Test: User A cannot see User B's tasks (unless assigned)
// Login as User A
const { data: tasks } = await supabase
  .from('tasks')
  .select('*')
  .eq('assigned_to', userB.id);

// Expect: tasks.length === 0 (RLS should block)
```

#### 4. Privilege Escalation Tests

Test that users cannot escalate privileges:

```typescript
// Test: Regular user cannot modify their own role
const { error } = await supabase
  .from('user_roles')
  .update({ role: 'admin' })
  .eq('user_id', currentUser.id);

// Expect: error !== null (RLS should block)
```

### Critical Tables to Test

1. **vehicles**
   - All roles can view
   - All roles can insert/update
   - Only admin can delete
   - Price changes are audited

2. **tasks**
   - Users see only their tasks
   - Admins see all tasks
   - Users can create tasks
   - Users can update their tasks
   - Only admins can delete

3. **user_roles**
   - Users see only their own role
   - Admins see all roles
   - Only admins can modify roles

4. **contacts**
   - Contains PII - ensure proper access
   - All authenticated users can view
   - Consider restricting delete

5. **ai_lead_memory**
   - ⚠️ Currently has no policies
   - Must define and test policies

---

## Authentication Testing

### Test Cases

#### 1. Login Flow
```typescript
// Test: Valid credentials login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'ValidPassword123!'
});
// Expect: error === null, data.session !== null

// Test: Invalid credentials
const { error: invalidError } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'WrongPassword'
});
// Expect: invalidError !== null
```

#### 2. Session Management
```typescript
// Test: Session persists after page reload
const { data: { session } } = await supabase.auth.getSession();
// Expect: session !== null for logged-in user

// Test: Session expires after timeout
// Wait for session timeout period
const { data: { session: expiredSession } } = await supabase.auth.getSession();
// Expect: expiredSession === null
```

#### 3. Password Reset
```typescript
// Test: Password reset email sent
const { error } = await supabase.auth.resetPasswordForEmail(
  'test@example.com',
  { redirectTo: 'https://app-url.com/reset-password' }
);
// Expect: error === null
```

#### 4. Protected Routes
```typescript
// Test: Unauthenticated user redirected to login
// Navigate to protected route without auth
// Expect: Redirect to /auth page

// Test: Authenticated user can access protected routes
// Login, then navigate to protected route
// Expect: Page loads successfully
```

---

## Input Validation Testing

### Form Validation Tests

#### 1. Vehicle Form
```typescript
// Test: Required fields
const invalidVehicle = {
  brand: '',  // Empty - should fail
  model: '',  // Empty - should fail
};
// Expect: Validation error

// Test: Price validation
const negativePrice = {
  brand: 'Mercedes',
  model: 'GLE',
  selling_price: -1000  // Negative - should fail
};
// Expect: Validation error

// Test: VIN format
const invalidVin = {
  brand: 'Mercedes',
  model: 'GLE',
  vin: '123'  // Too short - should fail
};
// Expect: Validation error (must be 17 chars)
```

#### 2. Contact Form
```typescript
// Test: Email validation
const invalidEmail = {
  first_name: 'John',
  last_name: 'Doe',
  email: 'not-an-email'  // Invalid format
};
// Expect: Validation error

// Test: Phone validation
const invalidPhone = {
  first_name: 'John',
  last_name: 'Doe',
  phone: 'abc123'  // Invalid format
};
// Expect: Validation error
```

#### 3. SQL Injection Prevention
```typescript
// Test: Malicious input in search
const maliciousInput = "'; DROP TABLE vehicles; --";
const { data } = await supabase
  .from('vehicles')
  .select('*')
  .ilike('brand', `%${maliciousInput}%`);
// Expect: No error, query returns safely (Supabase handles escaping)
```

#### 4. XSS Prevention
```typescript
// Test: Script tags in input
const xssInput = '<script>alert("XSS")</script>';
const { error } = await supabase
  .from('contacts')
  .insert({ first_name: xssInput });
// Expect: Input is sanitized or escaped
```

---

## Edge Function Security

### Test Cases

#### 1. Authentication Required
```bash
# Test: Unauthenticated request
curl -X POST https://your-project.supabase.co/functions/v1/protected-function
# Expect: 401 Unauthorized

# Test: Authenticated request
curl -X POST https://your-project.supabase.co/functions/v1/protected-function \
  -H "Authorization: Bearer <valid-token>"
# Expect: 200 OK
```

#### 2. Role-Based Access
```typescript
// Test: Regular user calling admin function
const { error } = await supabase.functions.invoke('delete-user', {
  body: { userId: 'some-user-id' }
});
// Expect: error !== null (403 Forbidden)

// Test: Admin calling admin function
// Login as admin, then:
const { error: adminError } = await supabase.functions.invoke('delete-user', {
  body: { userId: 'some-user-id' }
});
// Expect: adminError === null (or user deleted)
```

#### 3. Input Validation
```typescript
// Test: Missing required parameters
const { error } = await supabase.functions.invoke('create-user', {
  body: { }  // Missing email, password
});
// Expect: error with validation message

// Test: Invalid parameter types
const { error: typeError } = await supabase.functions.invoke('create-user', {
  body: {
    email: 123,  // Should be string
    password: true  // Should be string
  }
});
// Expect: error with type validation message
```

#### 4. CORS Headers
```bash
# Test: OPTIONS preflight request
curl -X OPTIONS https://your-project.supabase.co/functions/v1/function-name \
  -H "Origin: https://your-app.com"
# Expect: Response with CORS headers
```

---

## Data Integrity Testing

### Sold Vehicle Price Validation

#### Test: Cannot sell vehicle without price
```typescript
// Test: Attempt to set status to sold without selling_price
const { error } = await supabase
  .from('vehicles')
  .update({
    status: 'verkocht_b2b',
    selling_price: null  // Missing price
  })
  .eq('id', vehicleId);
// Expect: error !== null (trigger blocks this)
```

#### Test: Cannot sell vehicle without purchase price
```typescript
// Test: Attempt to set status to sold without purchasePrice
const { error } = await supabase
  .from('vehicles')
  .update({
    status: 'verkocht_b2c',
    selling_price: 25000,
    details: { purchasePrice: null }  // Missing purchase price
  })
  .eq('id', vehicleId);
// Expect: error !== null (trigger blocks this)
```

### Price Change Auditing

#### Test: Price changes are logged
```typescript
// 1. Update vehicle price
await supabase
  .from('vehicles')
  .update({ selling_price: 30000 })
  .eq('id', vehicleId);

// 2. Check audit log
const { data: auditLogs } = await supabase
  .from('vehicle_price_audit_log')
  .select('*')
  .eq('vehicle_id', vehicleId)
  .order('changed_at', { ascending: false })
  .limit(1);

// Expect: auditLogs[0].new_selling_price === 30000
// Expect: auditLogs[0].old_selling_price === <previous-price>
// Expect: auditLogs[0].changed_by === auth.uid()
```

### Status Change Auditing

#### Test: Status changes are logged
```typescript
// 1. Update vehicle status
await supabase
  .from('vehicles')
  .update({ status: 'afgeleverd' })
  .eq('id', vehicleId);

// 2. Check audit log
const { data: statusLogs } = await supabase
  .from('vehicle_status_audit_log')
  .select('*')
  .eq('vehicle_id', vehicleId)
  .order('change_timestamp', { ascending: false })
  .limit(1);

// Expect: statusLogs[0].new_status === 'afgeleverd'
// Expect: statusLogs[0].changed_by === auth.uid()
```

### Protected Status Changes

#### Test: Sold vehicles retain status
```typescript
// Test: Vehicle already sold cannot revert to 'voorraad'
const { error } = await supabase
  .from('vehicles')
  .update({ status: 'voorraad' })
  .eq('id', soldVehicleId);  // Vehicle with status 'verkocht_b2c'

// Expect: Status remains 'verkocht_b2c' (service prevents change)
// Check logs for warning message
```

---

## Automated Testing

### Unit Tests (Vitest)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Vehicle Security', () => {
  let testVehicleId: string;

  beforeEach(async () => {
    // Setup test data
    const { data } = await supabase
      .from('vehicles')
      .insert({
        brand: 'Test',
        model: 'Security',
        status: 'voorraad',
        details: {}
      })
      .select()
      .single();
    testVehicleId = data.id;
  });

  it('should prevent selling vehicle without price', async () => {
    const { error } = await supabase
      .from('vehicles')
      .update({
        status: 'verkocht_b2b',
        selling_price: null
      })
      .eq('id', testVehicleId);

    expect(error).not.toBeNull();
    expect(error.message).toContain('selling_price');
  });

  it('should log price changes', async () => {
    // Update price
    await supabase
      .from('vehicles')
      .update({ selling_price: 25000 })
      .eq('id', testVehicleId);

    // Check audit log
    const { data: logs } = await supabase
      .from('vehicle_price_audit_log')
      .select('*')
      .eq('vehicle_id', testVehicleId);

    expect(logs.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
describe('RLS Policy Tests', () => {
  it('should enforce task visibility', async () => {
    // Create task as User A
    const userAClient = createClient(userAToken);
    const { data: task } = await userAClient
      .from('tasks')
      .insert({
        title: 'Test Task',
        assigned_to: userA.id,
        assigned_by: userA.id,
        due_date: new Date()
      })
      .select()
      .single();

    // Try to access as User B
    const userBClient = createClient(userBToken);
    const { data: tasks } = await userBClient
      .from('tasks')
      .select('*')
      .eq('id', task.id);

    // User B should not see User A's task
    expect(tasks.length).toBe(0);
  });
});
```

### Security Scan Automation

```bash
# Run Supabase linter
supabase db lint

# Expected output: No critical security issues
# Address all WARN and ERROR findings
```

---

## Test Execution Schedule

### Daily
- Automated unit tests
- Automated integration tests
- Security linter

### Weekly
- Manual RLS policy spot checks
- Authentication flow tests
- Edge function security tests

### Monthly
- Comprehensive RLS policy review
- Full security audit
- Penetration testing (if applicable)

### Before Each Deployment
- Full security test suite
- RLS policy verification
- Input validation tests
- Data integrity checks

---

## Reporting Security Issues

### Internal Reporting
1. Document the issue in detail
2. Assess severity (Critical, High, Medium, Low)
3. Notify team lead/admin
4. Create tracking issue in project management
5. Schedule fix and retest

### Severity Levels

**Critical**: 
- Privilege escalation possible
- Data breach possible
- Authentication bypass

**High**:
- RLS policy violations
- Missing input validation
- Exposed sensitive data

**Medium**:
- Weak policies
- Missing audit logging
- Configuration issues

**Low**:
- Documentation gaps
- Non-critical warnings

---

## Post-Fix Verification

After fixing security issues:

1. Re-run affected tests
2. Verify fix doesn't break functionality
3. Update documentation
4. Run full security scan
5. Deploy to staging
6. Final verification in production

---

**Last Updated**: 2025-01-12
**Version**: 1.0
