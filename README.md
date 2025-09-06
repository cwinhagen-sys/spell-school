# Next.js + Supabase Authentication Project

A modern Next.js application with Supabase authentication, built with TypeScript, Tailwind CSS, and ready for Vercel deployment.

## Features

- 🔐 **Supabase Authentication** - Email/password sign up and sign in
- 🛡️ **Protected Routes** - Middleware-based route protection
- 📱 **Responsive Design** - Built with Tailwind CSS
- ⚡ **Next.js 15** - Latest App Router with TypeScript
- 🚀 **Vercel Ready** - Optimized for deployment

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd my-app
npm install
```

### 2. Supabase Configuration

1. Go to [Supabase](https://supabase.com) and create a new project
2. Navigate to Settings > API in your Supabase dashboard
3. Copy your project URL and anon key

### 3. Environment Variables

Update `.env.local` with your Supabase credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
 
Also add your AI and dictionary API keys:
 
```bash
# AI
OPENAI_API_KEY=your_openai_api_key

# Dictionary (optional)
MERRIAM_WEBSTER_API_KEY=your_mw_api_key
```

You can copy from the provided `.env.local.example` and fill in real values.
```

### 4. Database Setup (Optional)

If you want to use Supabase database features:

1. Go to your Supabase dashboard > SQL Editor
2. Create tables as needed for your application
3. Set up Row Level Security (RLS) policies

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view your application.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with AuthProvider
│   └── page.tsx           # Main page with auth logic
├── components/             # React components
│   ├── auth/
│   │   └── LoginForm.tsx  # Authentication form
│   └── Dashboard.tsx      # Protected dashboard
├── contexts/               # React contexts
│   └── AuthContext.tsx    # Authentication state management
├── lib/                    # Utility libraries
│   └── supabase/          # Supabase client configurations
│       ├── client.ts      # Client-side Supabase client
│       ├── server.ts      # Server-side Supabase client
│       └── middleware.ts  # Supabase middleware utilities
└── middleware.ts           # Next.js middleware for route protection
```

## Authentication Flow

1. **Public Access**: Users can access the login/signup form
2. **Authentication**: Users sign in or sign up via Supabase
3. **Protected Routes**: Authenticated users access the dashboard
4. **Session Management**: Automatic session refresh and logout

## Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin your-github-repo-url
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to [Vercel](https://vercel.com) and create a new project
2. Connect your GitHub repository
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy!

### 3. Environment Variables in Vercel

Make sure to add these environment variables in your Vercel project settings:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Security Features

- ✅ Environment variables for sensitive data
- ✅ Middleware-based route protection
- ✅ Supabase Row Level Security (RLS) ready
- ✅ Secure cookie handling
- ✅ TypeScript for type safety

## Customization

### Adding New Protected Routes

1. Create new components in `src/components/`
2. Add them to the dashboard or create new pages
3. Middleware automatically protects all routes

### Styling

The project uses Tailwind CSS. Customize colors, spacing, and components in `tailwind.config.js`.

### Database Operations

Use the Supabase client in your components:

```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const { data, error } = await supabase
  .from('your_table')
  .select('*')
```

## Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**
   - Ensure `.env.local` is in the project root
   - Restart the development server after changes

2. **Authentication Not Working**
   - Check Supabase project settings
   - Verify environment variables are correct
   - Check browser console for errors

3. **Build Errors**
   - Run `npm run lint` to check for TypeScript errors
   - Ensure all dependencies are installed

## Support

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## License

MIT License - feel free to use this project for your own applications!
