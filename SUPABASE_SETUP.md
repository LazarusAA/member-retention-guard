# Supabase Setup Guide for Member Retention Guard

This guide will help you set up Supabase for the Member Retention Guard Whop App.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- A Supabase project created

## 1. Create the Members Table

Navigate to your Supabase project dashboard, go to the SQL Editor, and run the following SQL:

```sql
-- Create the members table
CREATE TABLE IF NOT EXISTS public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{"logins": 0, "interactions": 0}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Create indexes for better query performance
  CONSTRAINT unique_experience_user UNIQUE (experience_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_members_experience_id ON public.members(experience_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_created_at ON public.members(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE public.members IS 'Stores member information and engagement metrics for Member Retention Guard';
COMMENT ON COLUMN public.members.id IS 'Unique identifier for the member record';
COMMENT ON COLUMN public.members.experience_id IS 'Whop experience ID that the member belongs to';
COMMENT ON COLUMN public.members.user_id IS 'Whop user ID of the member';
COMMENT ON COLUMN public.members.metrics IS 'JSON object containing engagement metrics (logins, interactions, etc.)';
COMMENT ON COLUMN public.members.created_at IS 'Timestamp when the member record was created';
```

## 2. Enable Row Level Security (RLS)

RLS ensures that users can only access data they're authorized to see. Run this SQL:

```sql
-- Enable RLS on the members table
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
```

## 3. Create RLS Policies

### Option A: Service Role Access (Recommended for Server-Side)

If you're using the service role key in your Next.js API routes (server-side), you can create more permissive policies since authentication is handled by Whop:

```sql
-- Policy: Allow service role to do everything
-- This is safe because your Next.js API routes verify Whop authentication
CREATE POLICY "Service role has full access"
ON public.members
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Allow authenticated reads (if using anon key with additional auth)
CREATE POLICY "Allow authenticated reads"
ON public.members
FOR SELECT
TO authenticated
USING (true);
```

### Option B: Anon Key with User-Based Access

If you're using the anon key and want to restrict based on user_id:

```sql
-- Policy: Users can read their own member records
CREATE POLICY "Users can read own records"
ON public.members
FOR SELECT
TO anon
USING (user_id = current_setting('app.current_user_id', true));

-- Policy: Users can insert their own member records
CREATE POLICY "Users can insert own records"
ON public.members
FOR INSERT
TO anon
WITH CHECK (user_id = current_setting('app.current_user_id', true));

-- Policy: Users can update their own member records
CREATE POLICY "Users can update own records"
ON public.members
FOR UPDATE
TO anon
USING (user_id = current_setting('app.current_user_id', true))
WITH CHECK (user_id = current_setting('app.current_user_id', true));
```

**Note:** For Option B, you'll need to set the user_id in your API routes:

```typescript
// In your API route, before querying
await supabase.rpc('set_config', {
  setting: 'app.current_user_id',
  value: userId
});
```

## 4. Get Your Supabase Credentials

1. Go to your Supabase project settings
2. Navigate to **Settings** → **API**
3. Copy the following values:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **anon public** key (for client-side with RLS)
   - **service_role** key (for server-side, bypasses RLS - keep secret!)

## 5. Configure Environment Variables

Update your `.env.development` and `.env.local` files:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_service_role_key_here
```

**Important:** 
- Use the **service_role** key for server-side operations (API routes)
- Never expose the service_role key in client-side code
- The service_role key bypasses RLS, so ensure your API routes validate Whop authentication

## 6. Test the Connection

1. Start your development server:
   ```bash
   pnpm dev
   ```

2. Navigate to the test endpoint in your browser or use curl:
   ```bash
   curl http://localhost:3000/api/test-supabase \
     -H "Authorization: Bearer YOUR_WHOP_TOKEN"
   ```

3. You should see a success response:
   ```json
   {
     "success": true,
     "message": "Supabase connection verified successfully",
     "userId": "user_xxx",
     "data": [],
     "rowCount": 0,
     "timestamp": "2025-10-03T..."
   }
   ```

## 7. Security Best Practices

### Using Service Role Key (Recommended)

Since your app verifies Whop authentication in API routes, using the service_role key is safe and simpler:

1. **Always verify Whop tokens** in your API routes before database operations
2. **Never expose** the service_role key to the client
3. Use the "Service role has full access" RLS policy
4. All database operations should be server-side in API routes

### Using Anon Key

If you need client-side database access:

1. Use the anon public key
2. Implement strict RLS policies
3. Pass user context to Supabase queries
4. Validate permissions on the server side as well

## 8. Database Schema Reference

### Members Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique member record ID |
| experience_id | TEXT | NOT NULL | Whop experience ID |
| user_id | TEXT | NOT NULL | Whop user ID |
| metrics | JSONB | NOT NULL, DEFAULT '{"logins": 0, "interactions": 0}' | Engagement metrics |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation timestamp |

### Metrics JSONB Structure

```typescript
{
  logins: number;        // Number of user logins
  interactions: number;  // Number of user interactions
  // Add more metrics as needed
}
```

## 9. Testing RLS Policies

To test that RLS is working correctly:

### Test 1: Verify Service Role Access
```sql
-- Should succeed with service_role key
SELECT * FROM members LIMIT 1;
```

### Test 2: Verify Anon Key Restrictions
```sql
-- Should fail or return no rows with anon key (unless you're the owner)
SELECT * FROM members WHERE user_id != 'your_user_id';
```

## 10. Troubleshooting

### Error: "Missing required Supabase environment variables"
- Ensure `SUPABASE_URL` and `SUPABASE_KEY` are set in your `.env.development` file
- Restart your development server after adding env variables

### Error: "new row violates row-level security policy"
- Check that RLS policies are correctly configured
- Verify you're using the service_role key for server-side operations
- Ensure Whop authentication is working in your API routes

### Error: "relation 'public.members' does not exist"
- Run the CREATE TABLE SQL from Step 1 in your Supabase SQL Editor

### Connection Issues
- Verify your Supabase project URL is correct
- Check that your Supabase project is active
- Ensure your API key is valid and hasn't been rotated

## Next Steps

Once Supabase is configured:

1. Integrate member tracking in your experience pages
2. Build analytics dashboards using the metrics data
3. Set up automated retention workflows
4. Add more tables as needed (e.g., events, notifications)

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Whop API Documentation](https://docs.whop.com/)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

