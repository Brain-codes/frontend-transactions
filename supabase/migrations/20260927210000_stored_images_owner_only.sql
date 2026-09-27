-- Stored images: listed and read through the API by their owner and by super admins; only the
-- server changes a stored file.
--
-- Every screen loads an image through its public link, which these rules do not govern, so
-- nothing on screen changes. Uploads (the browser and upload-image, both as the signed-in user,
-- never overwriting) keep their insert rule. get-agreement-image-by-serial downloads as the
-- caller, who already reaches only the uploads they made (every upload, for a super admin); a
-- file's owner is the account that uploaded it, so the same people get the same files.
--
-- Changes no rows. Every statement is re-runnable.

begin;

drop policy if exists "Allow authenticated updates to images" on storage.objects;

drop policy if exists "Allow authenticated select from images" on storage.objects;
drop policy if exists images_read_own_or_super_admin on storage.objects;
create policy images_read_own_or_super_admin on storage.objects
  for select to authenticated
  using (
    bucket_id = 'images'
    and (
      owner_id = (select auth.uid())::text
      or (select public.has_role(auth.uid(), 'super_admin'))
    )
  );

commit;
