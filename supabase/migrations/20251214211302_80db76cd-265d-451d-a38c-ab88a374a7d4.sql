-- Create storage bucket for meal images
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('meal-images', 'meal-images', true, 5242880)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to meal images
CREATE POLICY "Anyone can view meal images"
ON storage.objects FOR SELECT
USING (bucket_id = 'meal-images');

-- Allow authenticated users to upload their own meal images
CREATE POLICY "Users can upload meal images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'meal-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own meal images
CREATE POLICY "Users can delete own meal images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'meal-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);