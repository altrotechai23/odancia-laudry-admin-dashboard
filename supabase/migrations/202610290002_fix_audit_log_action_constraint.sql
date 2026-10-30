-- Extend the existing audit_logs action check to include action names used by
-- this application. The original CHECK expression is preserved.
DO $$
DECLARE
  v_constraint_name text;
  v_constraint_def text;
  v_check_expr text;
BEGIN
  SELECT c.conname, pg_get_constraintdef(c.oid)
    INTO v_constraint_name, v_constraint_def
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'audit_logs'
    AND c.contype = 'c'
    AND c.conname = 'audit_logs_action_check'
  LIMIT 1;

  IF v_constraint_name IS NULL THEN
    RAISE EXCEPTION 'Could not find public.audit_logs.audit_logs_action_check';
  END IF;

  v_check_expr := regexp_replace(v_constraint_def, '^CHECK \((.*)\)$', '\1');

  EXECUTE 'ALTER TABLE public.audit_logs DROP CONSTRAINT ' || quote_ident(v_constraint_name);
  EXECUTE 'ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check CHECK (('
       || v_check_expr
       || ') OR (action::text = ANY (ARRAY['
       || '''INSERT'', ''UPDATE'', ''DELETE'', '
       || '''STAFF_CREATE_SERVICE'', ''ADMIN_CREATE_SERVICE'', '
       || '''STAFF_RECORD_PAYMENT_BATCH'', ''ADMIN_RECORD_PAYMENT_BATCH'', '
       || '''STAFF_UPDATE_SERVICE_STATUS'', ''ADMIN_UPDATE_SERVICE_STATUS'', '
       || '''STAFF_UPDATE_COLLECTION_SCHEDULE'', ''ADMIN_UPDATE_COLLECTION_SCHEDULE'', '
       || '''STAFF_SEND_READY_NOTIFICATION'', ''ADMIN_SEND_READY_NOTIFICATION'', '
       || '''CREATE_STAFF'', ''UPDATE_STAFF'', '
       || '''IMPORT_BACKFILL_COLLECTION_SCHEDULE'', ''IMPORT_CREATE_SERVICE_TYPE'', ''IMPORT_FROM_BOOK'''
       || ']::text[])))';
END $$;

NOTIFY pgrst, 'reload schema';
