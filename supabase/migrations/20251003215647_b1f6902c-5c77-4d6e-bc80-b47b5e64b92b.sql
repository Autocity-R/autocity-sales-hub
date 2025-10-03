-- Fix: Remove problematic trigger on email_queue that references non-existent updated_at column
DROP TRIGGER IF EXISTS set_email_queue_updated_at ON email_queue;

-- One-time fix: Mark all pending emails as sent to stop spam
UPDATE email_queue 
SET status = 'sent', 
    last_attempt_at = NOW() 
WHERE status = 'pending';