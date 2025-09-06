# Authentication System Setup Guide

This guide will help you enable the full authentication system after setting up your Supabase project.

## Step 1: Supabase Project Setup

1. Go to [Supabase](https://supabase.com) and create a new project
2. Wait for your project to be ready
3. Go to **Settings > API** in your Supabase dashboard
4. Copy your **Project URL** and **anon public key**

## Step 2: Environment Variables

Update your `.env.local` file with your actual Supabase credentials:

```bash
# Replace these placeholder values with your actual Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key-here
```

## Step 3: Enable Authentication System

### Option A: Quick Enable (Recommended)

1. **Update the layout** - Uncomment the AuthProvider in `src/app/layout.tsx`:

```tsx
import { AuthProvider } from "@/contexts/AuthContext";

// ... existing code ...

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

2. **Update the main page** - Replace the content in `src/app/page.tsx` with:

```tsx
'use client'

import { useAuth } from '@/contexts/AuthContext'
import LoginForm from '@/components/auth/LoginForm'
import Dashboard from '@/components/Dashboard'

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {user ? <Dashboard /> : <LoginForm />}
    </div>
  )
}
```

### Option B: Manual Component Integration

If you want to integrate the authentication components manually:

1. Import and use the components where needed:
```tsx
import { useAuth } from '@/contexts/AuthContext'
import LoginForm from '@/components/auth/LoginForm'
import Dashboard from '@/components/Dashboard'
```

2. Wrap your app with the AuthProvider:
```tsx
import { AuthProvider } from '@/contexts/AuthContext'

function MyApp({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}
```

## Step 4: Test the Authentication

1. Start your development server:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000)
3. You should see the login form
4. Try signing up with a new email
5. Check your email for the confirmation link
6. Sign in with your credentials
7. You should be redirected to the protected dashboard

## Step 5: Customize Authentication

### Modify Login Form

Edit `src/components/auth/LoginForm.tsx` to:
- Add additional fields (name, phone, etc.)
- Customize the styling
- Add social authentication providers
- Implement password reset functionality

### Modify Dashboard

Edit `src/components/Dashboard.tsx` to:
- Add user profile information
- Include application-specific features
- Add navigation between different sections
- Implement user settings

### Add Protected Routes

Create new pages that require authentication:

```tsx
// src/app/profile/page.tsx
'use client'

import { useAuth } from '@/contexts/AuthContext'
import { redirect } from 'next/navigation'

export default function ProfilePage() {
  const { user, loading } = useAuth()

  if (loading) return <div>Loading...</div>
  if (!user) redirect('/')

  return (
    <div>
      <h1>Profile Page</h1>
      <p>Welcome, {user.email}!</p>
    </div>
  )
}
```

## Step 6: Database Integration

### Enable Row Level Security (RLS)

In your Supabase dashboard, go to **Authentication > Policies** and enable RLS for your tables.

### Create User Profiles Table

```sql
-- Run this in your Supabase SQL Editor
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Create policy to allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create policy to allow users to insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

### Use Database in Components

```tsx
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// Fetch user profile
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single()

// Update user profile
const { error } = await supabase
  .from('profiles')
  .upsert({
    id: user.id,
    full_name: 'John Doe',
    avatar_url: 'https://example.com/avatar.jpg'
  })
```

## Troubleshooting

### Common Issues

1. **"Missing Supabase environment variables"**
   - Check that `.env.local` exists and has the correct values
   - Restart your development server after updating environment variables

2. **Authentication not working**
   - Verify your Supabase project settings
   - Check that email confirmation is enabled in Supabase Auth settings
   - Look at the browser console for error messages

3. **Build errors**
   - Ensure all dependencies are installed: `npm install`
   - Check TypeScript errors: `npm run lint`
   - Verify all import paths are correct

4. **Middleware issues**
   - Check that `src/middleware.ts` exists and is properly configured
   - Verify the matcher patterns in the middleware config

### Getting Help

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Discord Community](https://discord.supabase.com)

## Next Steps

After setting up authentication, consider adding:

- **File uploads** using Supabase Storage
- **Real-time features** using Supabase Realtime
- **Database functions** for complex queries
- **Edge functions** for serverless API endpoints
- **Analytics** and user tracking
- **Email templates** for better user experience

Your authentication system is now ready to power your application! 🚀



























