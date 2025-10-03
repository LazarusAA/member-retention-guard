import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabase } from "@/lib/supabase";
import { whopSdk } from "@/lib/whop-sdk";

/**
 * Test API route to verify Supabase connection
 * GET /api/test-supabase
 */
export async function GET() {
	try {
		// Get headers for authentication
		const headersList = await headers();

		// Verify user token with Whop SDK
		let userId: string | undefined;
		try {
			const verification = await whopSdk.verifyUserToken(headersList);
			userId = verification.userId;
			console.log(`✅ User verified: ${userId}`);
		} catch (error) {
			console.error("❌ Failed to verify user token:", error);
			return NextResponse.json(
				{
					error: "Unauthorized",
					message: "Invalid or missing authentication token",
				},
				{ status: 401 },
			);
		}

		// Test database connection by querying members table
		console.log("🔍 Testing Supabase connection...");

		const { data, error } = await supabase
			.from("members")
			.select("*")
			.limit(1);

		if (error) {
			console.error("❌ Supabase query error:", error);
			return NextResponse.json(
				{
					error: "Database query failed",
					message: error.message,
					details: error,
				},
				{ status: 500 },
			);
		}

		console.log("✅ Supabase query successful");

		// Return success response
		return NextResponse.json(
			{
				success: true,
				message: "Supabase connection verified successfully",
				userId,
				data: data || [],
				rowCount: data?.length || 0,
				timestamp: new Date().toISOString(),
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("❌ Unexpected error in test-supabase route:", error);

		// Check if it's an environment variable error
		if (error instanceof Error && error.message.includes("environment")) {
			return NextResponse.json(
				{
					error: "Configuration error",
					message: error.message,
					hint: "Make sure SUPABASE_URL and SUPABASE_KEY are set in your .env file",
				},
				{ status: 500 },
			);
		}

		return NextResponse.json(
			{
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

/**
 * POST endpoint to create a test member record
 * POST /api/test-supabase
 */
export async function POST(request: Request) {
	try {
		// Get headers for authentication
		const headersList = await headers();

		// Verify user token with Whop SDK
		let userId: string;
		try {
			const verification = await whopSdk.verifyUserToken(headersList);
			userId = verification.userId;
		} catch (error) {
			console.error("❌ Failed to verify user token:", error);
			return NextResponse.json(
				{
					error: "Unauthorized",
					message: "Invalid or missing authentication token",
				},
				{ status: 401 },
			);
		}

		// Parse request body
		const body = await request.json();
		const { experience_id } = body;

		if (!experience_id) {
			return NextResponse.json(
				{
					error: "Bad request",
					message: "experience_id is required",
				},
				{ status: 400 },
			);
		}

	// Create a test member record
	const newMember: {
		experience_id: string;
		user_id: string;
		metrics: { logins: number; interactions: number };
	} = {
		experience_id,
		user_id: userId,
		metrics: {
			logins: 1,
			interactions: 0,
		},
	};

	const { data, error } = await supabase
		.from("members")
		.insert(newMember as any)
		.select()
		.single();

		if (error) {
			console.error("❌ Failed to create member:", error);
			return NextResponse.json(
				{
					error: "Database insert failed",
					message: error.message,
					details: error,
				},
				{ status: 500 },
			);
		}

		console.log("✅ Test member created successfully");

		return NextResponse.json(
			{
				success: true,
				message: "Test member created successfully",
				data,
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("❌ Unexpected error creating member:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

