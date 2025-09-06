# Image Setup Instructions

## 1. Supabase Storage Setup

### Create Storage Bucket
1. Go to your Supabase project dashboard
2. Navigate to Storage > Buckets
3. Click "Create a new bucket"
4. Name: `word-images`
5. Make it public: ✅ (so images can be accessed by students)
6. Click "Create bucket"

### Set Storage Policies
1. Go to Storage > Policies
2. Create a new policy for `word-images` bucket:

**Policy Name:** `Allow authenticated users to upload images`
**Policy Definition:**
```sql
((auth.role() = 'authenticated'::text) AND (bucket_id = 'word-images'::text))
```

**Policy Name:** `Allow public access to view images`
**Policy Definition:**
```sql
(bucket_id = 'word-images'::text)
```

## 2. Unsplash API Setup (Optional)

### Get API Key
1. Go to https://unsplash.com/developers
2. Create a new application
3. Get your Access Key
4. Add to your `.env.local` file:

```env
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=your_access_key_here
```

### Without API Key
If you don't set up Unsplash API, teachers can still upload their own images using the upload feature.

## 3. Environment Variables

Add to your `.env.local` file:

```env
# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Unsplash API (optional)
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=your_unsplash_access_key
```

## 4. Features

### For Teachers:
- **Image Search**: Search Unsplash for relevant images
- **Image Upload**: Upload custom images from computer
- **Image Preview**: See selected image before saving
- **Image Management**: Change or remove images easily

### For Students:
- **Visual Learning**: See images on flashcards
- **Better Memory**: Visual association with words
- **Responsive Design**: Images work on all devices

## 5. Usage

1. Teachers go to Word Sets page
2. When creating/editing word sets, each word has an image selector
3. Click "Add image" to open image selector modal
4. Either search Unsplash or upload custom image
5. Images appear on student flashcards automatically

## 6. Troubleshooting

### Images not showing:
- Check Supabase storage bucket is public
- Verify storage policies are set correctly
- Check browser console for errors

### Upload not working:
- Ensure user is authenticated
- Check file size (should be reasonable)
- Verify file type is image (jpg, png, gif, etc.)

### Search not working:
- Check Unsplash API key is set correctly
- Verify API key has proper permissions
- Check rate limits (Unsplash has daily limits)


