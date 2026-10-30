-- Odancia Laundry: book import idempotency and collection scheduling.
-- Additive-only migration. Existing service/customer/payment rows are preserved.

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS collection_time time without time zone,
  ADD COLUMN IF NOT EXISTS import_source_key text;

CREATE UNIQUE INDEX IF NOT EXISTS services_import_source_key_unique_idx
  ON public.services (import_source_key)
  WHERE import_source_key IS NOT NULL;

NOTIFY pgrst, 'reload schema';

SELECT 'services.collection_time' AS object_name,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'collection_time'
       ) THEN 'OK' ELSE 'MISSING' END AS status
UNION ALL
SELECT 'services.import_source_key',
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'import_source_key'
       ) THEN 'OK' ELSE 'MISSING' END
UNION ALL
SELECT 'services.import_source_key unique index',
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_indexes
         WHERE schemaname = 'public' AND tablename = 'services' AND indexname = 'services_import_source_key_unique_idx'
       ) THEN 'OK' ELSE 'MISSING' END;
