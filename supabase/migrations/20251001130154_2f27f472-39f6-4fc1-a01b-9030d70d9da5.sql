-- Update the contacts table check constraint to include 'transporter' as a valid type
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_type_check;

ALTER TABLE contacts ADD CONSTRAINT contacts_type_check 
  CHECK (type IN ('supplier', 'transporter', 'b2b', 'b2c'));