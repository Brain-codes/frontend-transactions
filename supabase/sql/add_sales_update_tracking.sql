-- Run this once against your Supabase project to enable the End User Records
-- "Last Modified By" column and the Edit action.
--
-- Adds updated_at / updated_by audit columns to `sales`, then backfills
-- updated_at from created_at so existing rows show a sensible date.

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

UPDATE public.sales
SET updated_at = created_at
WHERE updated_at IS NULL;
