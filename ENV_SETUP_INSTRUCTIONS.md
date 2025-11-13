# 🔧 Environment Variables Setup

## Required Environment Variables

To enable the new student username-based login system and teacher password reset functionality, you need to add the following environment variables to your `.env.local` file:

---

## 📋 **Configuration**

Create or update your `.env.local` file in the project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Supabase Service Role Key (NEW - Required for password reset)
# ⚠️ IMPORTANT: Keep this secret! Never commit to git or expose to client
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

---

## 🔑 **How to Get Your Keys**

### **1. Supabase URL and Anon Key**
(You probably already have these)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### **2. Service Role Key** (NEW!)
⚠️ **This is required for the password reset feature**

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Scroll down to **Project API keys**
5. Find **service_role** key (it's marked as "secret")
6. Click **Reveal** and copy the key
7. Add to `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`

---

## ⚠️ **Security Warning**

### **NEVER:**
- ❌ Commit `.env.local` to git
- ❌ Share your service role key publicly
- ❌ Expose service role key to client-side code
- ❌ Use service role key in browser JavaScript

### **ALWAYS:**
- ✅ Keep `.env.local` in `.gitignore`
- ✅ Use service role key only in API routes (server-side)
- ✅ Rotate keys if accidentally exposed
- ✅ Use environment variables for sensitive data

---

## 🧪 **Testing Your Setup**

After adding the environment variables:

1. **Restart your development server:**
   ```bash
   npm run dev
   ```

2. **Test the password reset feature:**
   - Login as a teacher
   - Go to "Progress Report"
   - Select a class
   - Click the 🔄 (Reset Password) button on a student
   - If you see an error about "service role key", check your `.env.local`

3. **Check console for errors:**
   - Open browser console (F12)
   - Look for any Supabase authentication errors
   - Verify API routes are working correctly

---

## 📝 **Example `.env.local`**

```bash
# Example configuration (replace with your actual values)
NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server Configuration
PORT=3000
```

---

## 🔍 **Troubleshooting**

### **"Unauthorized" error when resetting password**
- ✅ Check that `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- ✅ Restart your development server after adding the key
- ✅ Verify the key is correct (copy-paste from Supabase dashboard)

### **"Internal server error" when resetting password**
- ✅ Check browser console for detailed error messages
- ✅ Check terminal/server logs for backend errors
- ✅ Verify Supabase project is active and accessible

### **Environment variables not loading**
- ✅ File must be named exactly `.env.local` (not `.env` or `env.local`)
- ✅ File must be in the project root directory
- ✅ Restart development server after changes
- ✅ Check for syntax errors (no spaces around `=`)

---

## 🚀 **Deployment**

### **Vercel**
1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add all three variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Redeploy your application

### **Other Platforms**
Follow your platform's documentation for adding environment variables. All three variables are required for the application to work correctly.

---

## ✅ **Checklist**

Before testing the new login system:

- [ ] Added `NEXT_PUBLIC_SUPABASE_URL` to `.env.local`
- [ ] Added `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`
- [ ] Added `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (NEW!)
- [ ] Restarted development server
- [ ] Verified `.env.local` is in `.gitignore`
- [ ] Tested student login with username only
- [ ] Tested teacher password reset functionality

---

**Last Updated:** October 13, 2025  
**Version:** 1.0
















