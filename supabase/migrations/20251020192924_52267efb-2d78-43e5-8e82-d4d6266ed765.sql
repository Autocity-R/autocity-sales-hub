-- Schone start: Verwijder alle test/toast data inclusief gerelateerde records

-- STAP 1: Verwijder gerelateerde data van afgeleverde voertuigen
-- Email sent logs
DELETE FROM email_sent_log 
WHERE vehicle_id IN (
  SELECT id FROM vehicles WHERE status = 'afgeleverd'
);

-- Email queue items
DELETE FROM email_queue 
WHERE vehicle_id IN (
  SELECT id FROM vehicles WHERE status = 'afgeleverd'
);

-- Vehicle status audit logs
DELETE FROM vehicle_status_audit_log 
WHERE vehicle_id IN (
  SELECT id FROM vehicles WHERE status = 'afgeleverd'
);

-- Vehicle purchase audit logs
DELETE FROM vehicle_purchase_audit_log 
WHERE vehicle_id IN (
  SELECT id FROM vehicles WHERE status = 'afgeleverd'
);

-- Tasks gekoppeld aan afgeleverde voertuigen
DELETE FROM tasks 
WHERE vehicle_id IN (
  SELECT id FROM vehicles WHERE status = 'afgeleverd'
);

-- STAP 2: Verwijder alle opgeloste warranty claims
DELETE FROM warranty_claims 
WHERE claim_status = 'resolved';

-- STAP 3: Verwijder alle afgeleverde voertuigen
DELETE FROM vehicles 
WHERE status = 'afgeleverd';