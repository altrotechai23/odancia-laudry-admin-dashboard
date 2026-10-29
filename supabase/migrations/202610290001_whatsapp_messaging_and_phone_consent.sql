-- Odancia Laundry: WhatsApp Cloud API logs and explicit customer consent.
-- Additive migration: existing client and service/payment rows are preserved.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in_source text;

COMMENT ON COLUMN public.clients.whatsapp_opt_in IS
  'Explicit customer permission to receive transactional WhatsApp service messages and invoice documents.';
COMMENT ON COLUMN public.clients.whatsapp_opt_in_at IS
  'Timestamp when WhatsApp permission was recorded or last renewed.';
COMMENT ON COLUMN public.clients.whatsapp_opt_in_source IS
  'Source through which explicit WhatsApp permission was recorded.';

CREATE TABLE IF NOT EXISTS public.whatsapp_message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_phone text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('service_invoice', 'service_ready')),
  template_name text,
  meta_message_id text,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed', 'skipped')),
  error_code text,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_message_logs_meta_message_id_uidx
  ON public.whatsapp_message_logs (meta_message_id)
  WHERE meta_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS whatsapp_message_logs_service_created_idx
  ON public.whatsapp_message_logs (service_id, created_at DESC);
CREATE INDEX IF NOT EXISTS whatsapp_message_logs_client_created_idx
  ON public.whatsapp_message_logs (client_id, created_at DESC);

ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_message_logs_select_admin" ON public.whatsapp_message_logs;
CREATE POLICY "whatsapp_message_logs_select_admin"
  ON public.whatsapp_message_logs FOR SELECT TO authenticated
  USING (public.odancia_is_owner_or_admin());

GRANT SELECT ON public.whatsapp_message_logs TO authenticated;
GRANT ALL ON public.whatsapp_message_logs TO service_role;

-- Restrict updates to service-role server code (used by the signature-verified Meta webhook).
REVOKE INSERT, UPDATE, DELETE ON public.whatsapp_message_logs FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';

SELECT 'clients.whatsapp_opt_in' AS object_name,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'whatsapp_opt_in'
       ) THEN 'OK' ELSE 'MISSING' END AS status
UNION ALL
SELECT 'whatsapp_message_logs table',
       CASE WHEN to_regclass('public.whatsapp_message_logs') IS NOT NULL THEN 'OK' ELSE 'MISSING' END
UNION ALL
SELECT 'whatsapp message log RLS',
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relname = 'whatsapp_message_logs' AND c.relrowsecurity
       ) THEN 'OK' ELSE 'MISSING' END;
