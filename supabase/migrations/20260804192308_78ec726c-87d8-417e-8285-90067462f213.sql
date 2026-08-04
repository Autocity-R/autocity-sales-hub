ALTER TABLE public.garantie_emails
  ADD COLUMN IF NOT EXISTS gmail_message_id text;

CREATE UNIQUE INDEX IF NOT EXISTS garantie_emails_gmail_message_id_key
  ON public.garantie_emails (gmail_message_id)
  WHERE gmail_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS garantie_emails_thread_richting_idx
  ON public.garantie_emails (thread_id, richting, received_at DESC);