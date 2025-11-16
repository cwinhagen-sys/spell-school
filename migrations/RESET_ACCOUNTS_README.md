# Reset All Accounts - Production Preparation

## ⚠️ WARNING

**This script will DELETE ALL user accounts and ALL related data from your Supabase database. This is IRREVERSIBLE.**

Only run this script if you want to completely reset your database before going to production.

## What Will Be Deleted

This script will delete:

- ✅ All user accounts (students and teachers)
- ✅ All user profiles
- ✅ All classes
- ✅ All word sets
- ✅ All assignments and homeworks
- ✅ All game sessions and scores
- ✅ All quest progress
- ✅ All badges
- ✅ All XP data
- ✅ All typing leaderboard entries

## What Will NOT Be Deleted

- ✅ Database schema (tables, functions, triggers)
- ✅ RLS policies (will be re-enabled)
- ✅ Badge definitions (the `badges` table structure, but user badges will be deleted)

## How to Use

### Option 1: Using Supabase Dashboard (Recommended)

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire contents of `reset_all_accounts.sql`
5. **Review the script carefully** to make sure you understand what it does
6. Click **Run** to execute
7. Wait for the script to complete (should take a few seconds)

### Option 2: Using Supabase CLI

```bash
# Make sure you're authenticated
supabase db reset

# Or run the SQL file directly
supabase db execute --file migrations/reset_all_accounts.sql
```

## Verification

After running the script, you can verify that all data has been deleted by running these queries in the SQL Editor:

```sql
-- Check remaining users
SELECT COUNT(*) as remaining_users FROM auth.users;

-- Check remaining profiles
SELECT COUNT(*) as remaining_profiles FROM profiles;

-- Check remaining game sessions
SELECT COUNT(*) as remaining_sessions FROM game_sessions;
```

All counts should be `0`.

## After Reset

Once the reset is complete:

1. ✅ Your database is clean and ready for production
2. ✅ All tables and schema remain intact
3. ✅ RLS policies are re-enabled
4. ✅ You can start creating new accounts for production users

## Troubleshooting

### Error: "permission denied"

If you get a permission error, make sure you're running this as a database administrator or service role user.

### Error: "table does not exist"

If a table doesn't exist, that's OK - the script uses `IF EXISTS` clauses. The script will continue even if some tables are missing.

### Some data remains

If some data remains after running the script, check:
1. Are there any foreign key constraints preventing deletion?
2. Are there any triggers that might be interfering?
3. Try running the individual DELETE statements manually

## Safety Tips

1. **Backup first**: Before running this script, consider exporting your data if you might need it later
2. **Test environment**: If possible, test this script on a test/staging database first
3. **Double-check**: Review the script one more time before executing
4. **Production only**: Only run this when you're absolutely sure you want to delete everything

## Need Help?

If you encounter any issues or have questions, check:
- Supabase documentation: https://supabase.com/docs
- Your database logs in the Supabase dashboard




