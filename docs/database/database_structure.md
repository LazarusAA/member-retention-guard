### 1. Supabase Architecture

For the MVP of "Member Retention Guard," we'll use a single `members` table in the `public` schema to store per-member data scoped by Whop experiences. This keeps the architecture lightweight and focused on webhook-driven updates for churn proxies. Here's the detailed outline:

- **Table Name:** `public.members`
  - **Purpose:** Tracks individual members' status and proxy metrics for churn prediction (e.g., time since last validation as inactivity proxy, renewal count as loyalty indicator).
  - **Columns:**
    - `id`: UUID (primary key, auto-generated using `gen_random_uuid()` for uniqueness).
    - `experience_id`: TEXT (stores the Whop experience ID to scope data per community; non-nullable).
    - `user_id`: TEXT (stores the Whop user ID for the member; non-nullable).
    - `status`: TEXT (current membership state, e.g., 'valid' or 'invalid'; defaults to 'invalid').
    - `last_valid_at`: TIMESTAMPTZ (timestamp of the last positive signal like validation or payment; nullable, updated on relevant webhooks).
    - `renewal_count`: INT (number of successful renewals; defaults to 0, incremented on payment success events).
    - `created_at`: TIMESTAMPTZ (timestamp when the record was created; defaults to `now()`).
  - **Constraints:**
    - Primary Key: `id`.
    - Unique Constraint: Composite on `(experience_id, user_id)` to prevent duplicates per experience-member pair.
  - **Indexes (for Performance):**
    - Index on `experience_id` (for fast queries scoped to a community).
    - Index on `user_id` (for member-specific lookups).
    - Index on `last_valid_at` (for time-based churn calculations, e.g., ordering or filtering inactive members).
  - **Security (RLS):**
    - Row Level Security enabled on the table.
    - Policies:
      - `members_service_role_access`: Allows SELECT, INSERT, UPDATE, DELETE for the `service_role` (used by your backend/app for all operations). This ensures the app can manage data while preventing direct client-side access.
  - **Additional Notes:**
    - No foreign keys needed for MVP, as we're not linking to other tables.
    - Use `TIMESTAMPTZ` for timestamps to handle time zones automatically.
    - Comments added to table and columns for self-documentation.
    - Future expansions (post-MVP): Add columns like `churn_risk_score` (computed via cron) or a separate `settings` table for per-experience configs (e.g., Discord channels).

This schema supports efficient webhook upserts (e.g., O(1) updates via unique constraint) and queries (e.g., fetch all members per experience_id for dashboard).

### 2. Complete SQL Script

Here's the self-contained SQL script. Copy and paste it directly into the Supabase SQL Editor and run it. It creates the table, adds constraints/indexes/comments, enables RLS, and sets up the policy.

```sql
-- Create the members table
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experience_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'invalid',
    last_valid_at TIMESTAMPTZ,
    renewal_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add unique constraint to prevent duplicate members per experience
ALTER TABLE public.members
ADD CONSTRAINT unique_experience_user UNIQUE (experience_id, user_id);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_members_experience_id ON public.members (experience_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members (user_id);
CREATE INDEX IF NOT EXISTS idx_members_last_valid_at ON public.members (last_valid_at);

-- Add table and column comments for documentation
COMMENT ON TABLE public.members IS 'Tracks member status and churn proxies for Whop experiences.';
COMMENT ON COLUMN public.members.id IS 'Unique identifier (UUID) for the member record.';
COMMENT ON COLUMN public.members.experience_id IS 'Whop experience ID this member belongs to.';
COMMENT ON COLUMN public.members.user_id IS 'Whop user ID of the member.';
COMMENT ON COLUMN public.members.status IS 'Current membership state (e.g., ''valid'' or ''invalid'').';
COMMENT ON COLUMN public.members.last_valid_at IS 'Timestamp of the last positive signal (e.g., validation or payment).';
COMMENT ON COLUMN public.members.renewal_count IS 'Number of successful renewals for this member.';
COMMENT ON COLUMN public.members.created_at IS 'Timestamp when the member record was created.';

-- Enable Row Level Security (RLS) on the table
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for full access by service_role (backend)
CREATE POLICY members_service_role_access ON public.members
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
```

### Confirmation of Understanding
The app's revised core logic calculates churn risk using webhook-derived proxies like days since last_valid_at and renewal_count to trigger proactive alerts for creators, enabling data-driven retention without relying on unavailable granular engagement metrics.