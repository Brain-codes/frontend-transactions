-- TX-2a: the ERP can cancel a transfer it sent, through the same code as a super admin's cancel
--
-- Deleting a transferred order in the ERP left the transfer and its stoves in this app; cancelling
-- here left the order counted in the ERP (TR-08C94F, cancelled here on 15 Sep, is the case that
-- showed it). This migration gives the ERP a way in. The plan is docs/plans/transfer-sync.md in the
-- ERP repository.
--
-- cancel_purchase keeps its signature, its grants and its super-admin check; its body moves
-- unchanged into cancel_transfer_core, which only functions can call. cancel_purchase_from_erp
-- finds the ERP's transfers by sales reference and cancels each through the same core, so the
-- rules are one set: a stove tied to an active sale refuses the cancel, a cancel is recorded in
-- cancelled_purchases, unsold stoves under that organisation go. Other senders (the NABDA Portal)
-- are never matched.
--
-- Proof it landed (expect 3 functions, anon and authenticated unable to run the two new ones):
--   select proname, has_function_privilege('authenticated', oid, 'EXECUTE') auth,
--          has_function_privilege('anon', oid, 'EXECUTE') anon
--     from pg_proc where proname in ('cancel_purchase','cancel_transfer_core','cancel_purchase_from_erp');
--
-- REVERSAL: restore cancel_purchase from 00000000000000_baseline_schema.sql, then
--   drop function public.cancel_purchase_from_erp(text, text, text);
--   drop function public.cancel_transfer_core(uuid, text, uuid);

begin;

CREATE OR REPLACE FUNCTION public.cancel_transfer_core(_transfer_id uuid, _reason text, _cancelled_by uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _transfer public.stove_transfer_history%ROWTYPE;
  _stove_ids text[];
  _blocking_count integer;
  _new_id uuid;
BEGIN
  IF _reason IS NULL OR length(btrim(_reason)) < 5 THEN
    RAISE EXCEPTION 'A cancellation reason of at least 5 characters is required';
  END IF;

  SELECT * INTO _transfer FROM public.stove_transfer_history WHERE id = _transfer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer % not found', _transfer_id;
  END IF;

  SELECT ARRAY(
    SELECT jsonb_array_elements(_transfer.stove_ids)->>'stove_id'
  ) INTO _stove_ids;

  IF _stove_ids IS NOT NULL AND array_length(_stove_ids, 1) IS NOT NULL THEN
    SELECT count(*) INTO _blocking_count
    FROM public.sales
    WHERE stove_serial_no = ANY(_stove_ids)
      AND COALESCE(is_archived, false) = false;

    IF _blocking_count > 0 THEN
      RAISE EXCEPTION 'Cannot cancel: % stove(s) are still tied to active sales', _blocking_count;
    END IF;
  END IF;

  INSERT INTO public.cancelled_purchases (
    original_transfer_id, transaction_id, organization_id, partner_id, partner_name,
    state, branch, sales_factory, sales_date, transfer_date,
    stove_count, stove_ids_snapshot, cancellation_reason, cancelled_by
  ) VALUES (
    _transfer.id, _transfer.transaction_id, _transfer.organization_id, _transfer.partner_id, _transfer.partner_name,
    _transfer.state, _transfer.branch, _transfer.sales_factory, _transfer.sales_date, _transfer.transfer_date,
    COALESCE(_transfer.stove_count, 0), COALESCE(_transfer.stove_ids, '[]'::jsonb), btrim(_reason), _cancelled_by
  ) RETURNING id INTO _new_id;

  IF _stove_ids IS NOT NULL AND array_length(_stove_ids, 1) IS NOT NULL AND _transfer.organization_id IS NOT NULL THEN
    DELETE FROM public.stove_ids_base
    WHERE stove_id = ANY(_stove_ids)
      AND organization_id = _transfer.organization_id
      AND sale_id IS NULL;
  END IF;

  DELETE FROM public.stove_transfer_history WHERE id = _transfer_id;

  RETURN _new_id;
END;
$function$;

revoke all on function public.cancel_transfer_core(uuid, text, uuid) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.cancel_purchase(_transfer_id uuid, _reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin') THEN
    RAISE EXCEPTION 'Only super admins can cancel purchases';
  END IF;
  RETURN public.cancel_transfer_core(_transfer_id, _reason, auth.uid());
END;
$function$;

-- The ERP's way in. Called by the external-transfer-cancel function with the service role only.
-- Returns what happened; a stove tied to an active sale raises from the core and nothing changes.
CREATE OR REPLACE FUNCTION public.cancel_purchase_from_erp(_transaction_id text, _reason text, _requested_by text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _row record;
  _cancelled uuid[] := '{}';
  _stoves integer := 0;
  _reason_text text;
BEGIN
  IF _transaction_id IS NULL OR btrim(_transaction_id) = '' THEN
    RAISE EXCEPTION 'A sales reference is required';
  END IF;
  _reason_text := format('Deleted in the ERP by %s: %s',
    coalesce(nullif(btrim(_requested_by), ''), 'an ERP user'),
    coalesce(nullif(btrim(_reason), ''), 'no reason given'));

  FOR _row IN
    SELECT id, coalesce(stove_count, 0) AS n
      FROM public.stove_transfer_history
     WHERE transaction_id = btrim(_transaction_id)
       AND source IN ('external-csv-sync', 'external-sync')
       AND application_name LIKE 'Atmosfair ERP System%'
     ORDER BY created_at
     FOR UPDATE
  LOOP
    _cancelled := _cancelled || public.cancel_transfer_core(_row.id, _reason_text, NULL);
    _stoves := _stoves + _row.n;
  END LOOP;

  RETURN jsonb_build_object(
    'status', CASE WHEN array_length(_cancelled, 1) IS NULL THEN 'not_found' ELSE 'cancelled' END,
    'cancelled_purchase_ids', to_jsonb(_cancelled),
    'stove_count', _stoves
  );
END;
$function$;

revoke all on function public.cancel_purchase_from_erp(text, text, text) from public, anon, authenticated;
grant execute on function public.cancel_purchase_from_erp(text, text, text) to service_role;

commit;
