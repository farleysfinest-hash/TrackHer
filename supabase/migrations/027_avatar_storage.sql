-- Profile pictures move out of profiles.ui_state and into Storage.
--
-- ui_state is selected on every profile fetch (authStore.fetchProfile does
-- select('*') on each auth state change), so an embedded data URL rode along
-- on every cold start and token refresh for a 36px header image. The bucket is
-- private: this is a health app, and a face photo should not sit behind a
-- guessable public URL. The app reads through short-lived signed URLs.
--
-- Avatars stay optional. With no object, the UI falls back to the initial.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', FALSE, 524288, ARRAY['image/jpeg'])
ON CONFLICT (id) DO UPDATE
  SET public = FALSE,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- One folder per user: avatars/<user_id>/avatar.jpg. Every policy keys off the
-- first path segment, so a user can only reach their own folder.

DROP POLICY IF EXISTS "Avatar read own" ON storage.objects;
CREATE POLICY "Avatar read own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Avatar insert own" ON storage.objects;
CREATE POLICY "Avatar insert own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Avatar update own" ON storage.objects;
CREATE POLICY "Avatar update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Avatar delete own" ON storage.objects;
CREATE POLICY "Avatar delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
