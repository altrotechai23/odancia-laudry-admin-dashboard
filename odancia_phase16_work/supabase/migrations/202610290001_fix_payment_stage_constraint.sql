-- Fix payment recording when a transaction is classified as partial or final.
-- Preserve the existing payments_stage_check rule and extend it only for the
-- two stage values written by odancia_record_service_payments().
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
    AND t.relname = 'payments'
    AND c.contype = 'c'
    AND c.conname = 'payments_stage_check'
  LIMIT 1;

  IF v_constraint_name IS NULL THEN
    RAISE EXCEPTION 'Could not find public.payments.payments_stage_check';
  END IF;

  -- Keep the original CHECK expression and add the two stages used by the RPC.
  v_check_expr := regexp_replace(v_constraint_def, '^CHECK \((.*)\)$', '\1');

  EXECUTE 'ALTER TABLE public.payments DROP CONSTRAINT ' || quote_ident(v_constraint_name);
  EXECUTE 'ALTER TABLE public.payments ADD CONSTRAINT payments_stage_check CHECK (('
       || v_check_expr
       || ') OR (payment_stage::text IN (''partial'', ''final'')))';
END $$;

NOTIFY pgrst, 'reload schema';
