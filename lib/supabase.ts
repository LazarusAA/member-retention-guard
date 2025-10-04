import { createClient } from "@supabase/supabase-js";
import type { Member } from "@/models/members";

/**
 * Database types for Supabase
 * Defines the schema for type-safe database operations
 */
export type Database = {
	public: {
		Tables: {
			members: {
				Row: Member;
				Insert: {
					id?: string;
					experience_id: string;
					user_id: string;
					status?: string;
					last_valid_at?: string | null;
					renewal_count?: number;
					created_at?: string;
				};
				Update: {
					experience_id?: string;
					user_id?: string;
					status?: string;
					last_valid_at?: string | null;
					renewal_count?: number;
				};
			};
		};
	};
};

/**
 * Validates required Supabase environment variables
 */
function validateSupabaseEnv(): { url: string; key: string } {
	const url = process.env.SUPABASE_URL;
	const key = process.env.SUPABASE_KEY;

	if (!url || !key) {
		const missing = [];
		if (!url) missing.push("SUPABASE_URL");
		if (!key) missing.push("SUPABASE_KEY");

		console.error(
			`❌ Missing required Supabase environment variables: ${missing.join(", ")}`,
		);
		throw new Error(
			`Missing required Supabase environment variables: ${missing.join(", ")}`,
		);
	}

	return { url, key };
}

/**
 * Initialize Supabase client with error handling
 */
function initializeSupabaseClient() {
	try {
		const { url, key } = validateSupabaseEnv();

		const client = createClient<Database>(url, key, {
			auth: {
				persistSession: false, // Server-side, no session persistence needed
			},
		});

		console.log("✅ Supabase client initialized successfully");
		return client;
	} catch (error) {
		console.error("❌ Failed to initialize Supabase client:", error);
		throw error;
	}
}

/**
 * Supabase client instance
 * Use this for all database operations
 */
export const supabase = initializeSupabaseClient();

/**
 * Helper function to handle Supabase errors
 */
export function handleSupabaseError(error: unknown, operation: string): never {
	console.error(`❌ Supabase error during ${operation}:`, error);
	throw new Error(`Database operation failed: ${operation}`);
}

