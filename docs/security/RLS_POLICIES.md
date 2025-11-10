# Row-Level Security (RLS) Policies Documentation

## Overview
This document provides a comprehensive reference of all Row-Level Security policies implemented in the Auto City Sales Hub application.

---

## Table of Contents
1. [Vehicles](#vehicles)
2. [Contacts](#contacts)
3. [Leads](#leads)
4. [Tasks](#tasks)
5. [User Management](#user-management)
6. [AI & Chat](#ai--chat)
7. [Email & Communication](#email--communication)
8. [Audit Logs](#audit-logs)
9. [Calendar](#calendar)
10. [Financial](#financial)

---

## Vehicles

### Table: `vehicles`
**RLS Enabled**: Yes

#### Policies

**"Authenticated users can view vehicles"**
- **Command**: SELECT
- **Check**: `true`
- **Purpose**: All authenticated users can view vehicle inventory
- **Security Level**: Medium - appropriate for business context

**"Authenticated users can insert vehicles"**
- **Command**: INSERT
- **Check**: `true`
- **Purpose**: All authenticated users can add vehicles
- **Security Level**: Medium - consider restricting to specific roles

**"Authenticated users can update vehicles"**
- **Command**: UPDATE
- **Using**: `true`
- **Check**: `true`
- **Purpose**: All authenticated users can update vehicles
- **Security Level**: Medium - price changes are audited

**"Authenticated users can delete vehicles"**
- **Command**: DELETE
- **Using**: `true`
- **Purpose**: All authenticated users can delete vehicles
- **Security Level**: Medium - consider restricting to admin only

### Table: `vehicle_files`
**RLS Enabled**: Yes

⚠️ **Security Warning**: Previously had public SELECT policy exposing employee IDs. Now restricted to authenticated users.

**Recommendation**: Implement stricter policies to hide `uploaded_by` from non-admin users.

### Table: `vehicle_price_audit_log`
**RLS Enabled**: Yes

#### Policies

**"Authenticated users can view price audit logs"**
- **Command**: SELECT
- **Using**: `true`
- **Purpose**: Transparency for price changes

**"System can insert price audit logs"**
- **Command**: INSERT
- **Check**: `true`
- **Purpose**: Automated logging via triggers

### Table: `vehicle_status_audit_log`
**RLS Enabled**: Yes

#### Policies

**"Authenticated users can view status audit logs"**
- **Command**: SELECT
- **Using**: `true`
- **Purpose**: Track status changes for all vehicles

**"System can insert status audit logs"**
- **Command**: INSERT
- **Check**: `true`
- **Purpose**: Automated logging via triggers

---

## Contacts

### Table: `contacts`
**RLS Enabled**: Yes

#### Policies

**"Authenticated users can view contacts"**
- **Command**: SELECT
- **Using**: `true`
- **Purpose**: All authenticated users can view customer/supplier data
- **Security Level**: Medium - contains PII

**"Authenticated users can insert contacts"**
- **Command**: INSERT
- **Check**: `true`
- **Purpose**: Users can create new contacts

**"Authenticated users can update contacts"**
- **Command**: UPDATE
- **Using**: `true`
- **Check**: `true`
- **Purpose**: Users can update contact information

**"Authenticated users can delete contacts"**
- **Command**: DELETE
- **Using**: `true`
- **Purpose**: Users can remove contacts

**⚠️ Recommendation**: Consider role-based restrictions for delete operations.

---

## Leads

### Table: `leads`
**RLS Enabled**: Yes

#### Policies

**"Authenticated users can view leads"**
- **Command**: SELECT
- **Using**: `true`
- **Purpose**: All authenticated users can view leads
- **Security Level**: Medium

**"Authenticated users can insert leads"**
- **Command**: INSERT
- **Check**: `true`
- **Purpose**: Users can create new leads

**"Authenticated users can update leads"**
- **Command**: UPDATE
- **Using**: `true`
- **Check**: `true`
- **Purpose**: Users can update lead information

**"Authenticated users can delete leads"**
- **Command**: DELETE
- **Using**: `true`
- **Purpose**: Users can remove leads

### Table: `lead_scoring_history`
**RLS Enabled**: Yes

#### Policies

**"Allow all access to lead_scoring_history"**
- **Command**: ALL
- **Using**: `true`
- **Purpose**: Track lead scoring changes

### Table: `ai_lead_memory`
**RLS Enabled**: Yes

⚠️ **Critical**: No policies defined! Table is currently inaccessible.

**Required Action**: Define appropriate RLS policies to restrict access to authorized users only.

---

## Tasks

### Table: `tasks`
**RLS Enabled**: Yes

#### Policies

**"Users can view tasks assigned to them or created by them"**
- **Command**: SELECT
- **Using**: `(assigned_to = auth.uid()) OR (assigned_by = auth.uid()) OR is_admin_user(auth.uid())`
- **Purpose**: Users see only their tasks, admins see all
- **Security Level**: High - proper role-based access

**"Users can create tasks"**
- **Command**: INSERT
- **Check**: `(assigned_by = auth.uid()) OR is_admin_user(auth.uid())`
- **Purpose**: Users can assign tasks, admins can create any task

**"Users can update tasks they can manage"**
- **Command**: UPDATE
- **Using**: `can_manage_task(auth.uid(), id)`
- **Check**: `can_manage_task(auth.uid(), id)`
- **Purpose**: Users can update tasks they created or are assigned to

**"Admins and task creators can delete tasks"**
- **Command**: DELETE
- **Using**: `is_admin_user(auth.uid()) OR assigned_by = auth.uid()`
- **Purpose**: Admins and users who created the task can delete it
- **Security Level**: Medium - users can only delete tasks they created

### Table: `task_history`
**RLS Enabled**: Yes

#### Policies

**"Users can view task history for tasks they can access"**
- **Command**: SELECT
- **Using**: Complex join checking task access
- **Purpose**: Audit trail for task changes

**"System can insert task history"**
- **Command**: INSERT
- **Check**: `true`
- **Purpose**: Automated logging via triggers

---

## User Management

### Table: `user_roles`
**RLS Enabled**: Yes

#### Policies

**"Users can view their own roles"**
- **Command**: SELECT
- **Using**: `user_id = auth.uid()`
- **Purpose**: Users can see their own permissions

**"Admin users can view all roles"**
- **Command**: SELECT
- **Using**: `is_admin_or_owner()`
- **Purpose**: Admins can view all user roles

**"Admin users can manage roles"**
- **Command**: ALL
- **Using**: `is_admin_or_owner()`
- **Check**: `is_admin_or_owner()`
- **Purpose**: Only admins can modify user roles
- **Security Level**: Critical - prevents privilege escalation

### Table: `profiles`
**RLS Enabled**: Yes (assumed based on auth setup)

**Note**: Roles are stored separately in `user_roles` table, not in profiles. This prevents privilege escalation attacks.

---

## AI & Chat

### Table: `ai_agents`
**RLS Enabled**: Yes

⚠️ **Previous Security Issue**: Had public SELECT policy exposing webhook URLs and system prompts.

**Current Recommendation**: Restrict to authenticated users only, hide sensitive fields from non-admins.

### Table: `ai_chat_sessions`
**RLS Enabled**: Yes

#### Policies

**"Users can access their chat sessions"**
- **Command**: ALL
- **Using**: `(user_id = auth.uid()) OR (user_id IS NULL)`
- **Check**: `(user_id = auth.uid()) OR (user_id IS NULL)`
- **Purpose**: Users can only access their own sessions

**"Users can insert their own chat sessions"**
- **Command**: INSERT
- **Check**: `(user_id = auth.uid()) OR (user_id IS NULL)`

**"Users can update their own chat sessions"**
- **Command**: UPDATE
- **Using**: `(user_id = auth.uid()) OR (user_id IS NULL)`
- **Check**: `(user_id = auth.uid()) OR (user_id IS NULL)`

### Table: `ai_chat_messages`
**RLS Enabled**: Yes

#### Policies

**"Users can access messages from their sessions"**
- **Command**: ALL
- **Using**: `session_id IN (SELECT id FROM ai_chat_sessions WHERE user_id = auth.uid() OR user_id IS NULL)`
- **Purpose**: Users can only see messages from their sessions

**"Users can insert chat messages for their sessions"**
- **Command**: INSERT
- **Check**: `session_id IN (SELECT id FROM ai_chat_sessions WHERE user_id = auth.uid() OR user_id IS NULL)`

### Table: `ai_agent_webhooks`
**RLS Enabled**: Yes

#### Policies

**"Authenticated users can manage webhooks"**
- **Command**: ALL
- **Using**: `true`
- **Check**: `true`
- **Purpose**: Webhook configuration management

---

## Email & Communication

### Table: `email_threads`
**RLS Enabled**: Yes

#### Policies

**"Authenticated users can view email threads"**
- **Command**: SELECT
- **Using**: `true`

**"Authenticated users can insert email threads"**
- **Command**: INSERT
- **Check**: `true`

**"Admin users can manage email threads"**
- **Command**: ALL
- **Using**: `is_admin_or_owner()`
- **Check**: `is_admin_or_owner()`

### Table: `email_messages`
**RLS Enabled**: Yes

#### Policies

**"Authenticated users can view email messages"**
- **Command**: SELECT
- **Using**: `true`

**"Authenticated users can insert email messages"**
- **Command**: INSERT
- **Check**: `true`

**"Admin users can manage email messages"**
- **Command**: ALL
- **Using**: `is_admin_or_owner()`
- **Check**: `is_admin_or_owner()`

### Table: `email_queue`
**RLS Enabled**: Yes

#### Policies

**"Users can view email queue items"**
- **Command**: SELECT
- **Using**: `true`

**"Users can insert email queue items"**
- **Command**: INSERT
- **Check**: `true`

**"System can manage all email queue items"**
- **Command**: ALL
- **Using**: `true`
- **Check**: `true`

---

## Calendar

### Table: `appointments`
**RLS Enabled**: Yes

#### Policies

**"Users can view all appointments"**
- **Command**: SELECT
- **Using**: `true`
- **Purpose**: All users can see calendar appointments

**"Users can create appointments"**
- **Command**: INSERT
- **Check**: `true`

**"Users can update appointments"**
- **Command**: UPDATE
- **Using**: `true`

**"Users can delete appointments"**
- **Command**: DELETE
- **Using**: `true`

### Table: `calendar_sync_logs`
**RLS Enabled**: Yes

#### Policies

**"Users can view sync logs for their appointments"**
- **Command**: SELECT
- **Using**: `true`

**"Users can create sync logs"**
- **Command**: INSERT
- **Check**: `true`

### Table: `company_calendar_settings`
**RLS Enabled**: Yes

#### Policies

**"Users can view company calendar settings"**
- **Command**: SELECT
- **Using**: `auth.uid() IS NOT NULL`

**"Admin users can manage company calendar settings"**
- **Command**: ALL
- **Using**: Complex admin check

**"Allow company calendar management"**
- **Command**: ALL
- **Using**: Admin role or service role check

---

## Financial

### Table: `contracts`
**RLS Enabled**: Yes

#### Policies

**"Authenticated users can view contracts"**
- **Command**: SELECT
- **Using**: `true`

**"Authenticated users can insert contracts"**
- **Command**: INSERT
- **Check**: `true`

**"Authenticated users can update contracts"**
- **Command**: UPDATE
- **Using**: `true`
- **Check**: `true`

**"Authenticated users can delete contracts"**
- **Command**: DELETE
- **Using**: `true`

### Table: `warranty_claims`
**RLS Enabled**: Yes

#### Policies

**"Authenticated users can view warranty claims"**
- **Command**: SELECT
- **Using**: `true`

**"Authenticated users can insert warranty claims"**
- **Command**: INSERT
- **Check**: `true`

**"Authenticated users can update warranty claims"**
- **Command**: UPDATE
- **Using**: `true`
- **Check**: `true`

**"Authenticated users can delete warranty claims"**
- **Command**: DELETE
- **Using**: `true`

### Table: `weekly_sales`
**RLS Enabled**: Yes

#### Policies

**"Authenticated users can view weekly sales"**
- **Command**: SELECT
- **Using**: `true`

**"System can insert weekly sales"**
- **Command**: INSERT
- **Check**: `true`

**"System can update weekly sales"**
- **Command**: UPDATE
- **Using**: `true`

---

## Security Recommendations

### High Priority
1. **ai_lead_memory**: Define RLS policies immediately
2. **vehicle_files**: Restrict `uploaded_by` visibility to admins
3. **ai_agents**: Hide webhook URLs from non-admins
4. **vehicles**: Consider role-based delete restrictions

### Medium Priority
1. Review all `true` policies for potential role-based restrictions
2. Implement field-level security for sensitive data
3. Add audit logging to policy violations

### Best Practices
- Always use security definer functions for role checks
- Test policies with different user roles
- Monitor RLS policy violations
- Document all policy changes

---

**Last Updated**: 2025-01-12
**Version**: 1.0
