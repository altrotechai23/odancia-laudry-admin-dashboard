-- Allow the application audit action names used by current service/staff flows.
-- This migration is safe to re-run and addresses the live audit_logs_action_check failure.
DO $$
BEGIN
  IF to_regclass('public.audit_logs') IS NULL THEN
    RAISE NOTICE 'public.audit_logs does not exist; skipping audit action constraint update';
    RETURN;
  END IF;

  ALTER TABLE public.audit_logs
    DROP CONSTRAINT IF EXISTS audit_logs_action_check;

  ALTER TABLE public.audit_logs
    ADD CONSTRAINT audit_logs_action_check
    CHECK (action::text = ANY (ARRAY[
      'INSERT', 'UPDATE', 'DELETE',
      'STAFF_CREATE_SERVICE', 'ADMIN_CREATE_SERVICE',
      'STAFF_RECORD_PAYMENT_BATCH', 'ADMIN_RECORD_PAYMENT_BATCH',
      'STAFF_UPDATE_SERVICE_STATUS', 'ADMIN_UPDATE_SERVICE_STATUS',
      'STAFF_UPDATE_COLLECTION_SCHEDULE', 'ADMIN_UPDATE_COLLECTION_SCHEDULE',
      'STAFF_SEND_READY_NOTIFICATION', 'ADMIN_SEND_READY_NOTIFICATION',
      'CREATE_STAFF', 'UPDATE_STAFF',
      'IMPORT_BACKFILL_COLLECTION_SCHEDULE', 'IMPORT_CREATE_SERVICE_TYPE', 'IMPORT_FROM_BOOK'
    ]::text[]));
END $$;

NOTIFY pgrst, 'reload schema';
