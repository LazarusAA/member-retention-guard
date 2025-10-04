/**
 * Member model representing a user's status and churn proxies within a Whop experience
 * 
 * Database Schema:
 * - Table: public.members
 * - id: UUID (primary key, auto-generated)
 * - experience_id: TEXT (Whop experience ID)
 * - user_id: TEXT (Whop user ID)
 * - status: TEXT (current membership state: 'valid' or 'invalid')
 * - last_valid_at: TIMESTAMPTZ (timestamp of last positive signal)
 * - renewal_count: INT (number of successful renewals)
 * - created_at: TIMESTAMPTZ (auto-set to NOW())
 * 
 * @see database_structure.md for full database schema
 */
export interface Member {
	/** Unique identifier (UUID) */
	id: string;
	
	/** Whop experience ID this member belongs to */
	experience_id: string;
	
	/** Whop user ID of the member */
	user_id: string;
	
	/** Current membership state ('valid' or 'invalid') */
	status: string;
	
	/** Timestamp of last positive signal (validation or payment) - ISO 8601 format */
	last_valid_at: string | null;
	
	/** Number of successful renewals for this member */
	renewal_count: number;
	
	/** Timestamp when the member record was created (ISO 8601 format) */
	created_at: string;
}

