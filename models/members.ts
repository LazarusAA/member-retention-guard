/**
 * Member model representing a user's engagement data within a Whop experience
 * 
 * Database Schema:
 * - Table: public.members
 * - id: UUID (primary key, auto-generated)
 * - experience_id: TEXT (Whop experience ID)
 * - user_id: TEXT (Whop user ID)
 * - metrics: JSONB (engagement metrics)
 * - created_at: TIMESTAMPTZ (auto-set to NOW())
 * 
 * @see /supabase-schema.sql for full database schema
 */
export interface Member {
	/** Unique identifier (UUID) */
	id: string;
	
	/** Whop experience ID this member belongs to */
	experience_id: string;
	
	/** Whop user ID of the member */
	user_id: string;
	
	/** Engagement metrics tracked for this member */
	metrics: {
		/** Number of times the user has logged in */
		logins: number;
		/** Number of interactions/activities performed */
		interactions: number;
	};
	
	/** Timestamp when the member record was created (ISO 8601 format) */
	created_at: string;
}

