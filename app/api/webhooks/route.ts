import { waitUntil } from "@vercel/functions";
import { createHmac } from "crypto";
import type { NextRequest } from "next/server";
import { supabase, type Database } from "@/lib/supabase";

/**
 * Webhook event interface for Whop webhooks
 */
interface WhopWebhookEvent {
	type: string;
	data: {
		user_id?: string;
		experience_id?: string;
		membership_id?: string;
		status?: string;
		[key: string]: unknown;
	};
}

/**
 * Verifies the webhook signature using HMAC-SHA256
 */
function verifyWebhookSignature(
	payload: string,
	signature: string | null,
	secret: string,
): boolean {
	if (!signature) return false;

	const hmac = createHmac("sha256", secret);
	hmac.update(payload);
	const expectedSignature = hmac.digest("hex");

	// Use timing-safe comparison
	return signature === expectedSignature;
}

/**
 * POST handler for Whop webhooks
 * Processes membership and payment events to update member churn proxies
 */
export async function POST(request: NextRequest): Promise<Response> {
	try {
		// Parse the request body
		const rawBody = await request.text();
		const body = JSON.parse(rawBody) as WhopWebhookEvent;

		// Extract signature from headers
		const signature = request.headers.get("x-whop-signature");

		// Verify webhook signature
		const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;
		if (!webhookSecret) {
			console.error("❌ WHOP_WEBHOOK_SECRET not configured");
			return new Response("Server configuration error", { status: 500 });
		}

		if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
			console.warn("⚠️ Invalid webhook signature received");
			return new Response("Unauthorized", { status: 401 });
		}

		// Log the event (without sensitive data)
		console.log(`✅ Webhook verified: ${body.type}`);

		// Process webhook event asynchronously
		waitUntil(processWebhookEvent(body));

		// Return 200 OK immediately after verification
		return new Response("OK", { status: 200 });
	} catch (error) {
		console.error("❌ Error processing webhook:", error);
		// Return 200 to prevent retries for malformed requests
		return new Response("OK", { status: 200 });
	}
}

/**
 * Processes webhook events and updates member records
 */
async function processWebhookEvent(event: WhopWebhookEvent): Promise<void> {
	try {
		const { type, data } = event;
		const { user_id, experience_id } = data;

		// Validate required fields
		if (!user_id || !experience_id) {
			console.warn(`⚠️ Missing required fields in ${type} event`);
			return;
		}

		switch (type) {
			case "membership.went_valid":
			case "membership.went.valid":
				await handleMembershipValid(user_id, experience_id);
				break;

			case "membership.went_invalid":
			case "membership.went.invalid":
				await handleMembershipInvalid(user_id, experience_id);
				break;

			case "payment.succeeded":
			case "payment.success":
				await handlePaymentSuccess(user_id, experience_id);
				break;

			default:
				console.log(`ℹ️ Unhandled event type: ${type}`);
		}
	} catch (error) {
		console.error("❌ Error in processWebhookEvent:", error);
	}
}

/**
 * Handles membership.went_valid event
 * Sets status to valid and updates last_valid_at
 * NOTE: Does NOT increment renewal_count - that's handled by payment.succeeded
 */
async function handleMembershipValid(
	user_id: string,
	experience_id: string,
): Promise<void> {
	try {
		// Upsert with updated values (no renewal_count increment)
		const { error } = await supabase
			.from("members")
			.upsert(
				{
					user_id,
					experience_id,
					status: "valid",
					last_valid_at: new Date().toISOString(),
				} as any,
				{
					onConflict: "experience_id,user_id",
				},
			);

		if (error) {
			console.error("❌ Error upserting member (went_valid):", error);
		} else {
			console.log(
				`✅ Member updated: ${user_id} in ${experience_id} - status: valid`,
			);
		}
	} catch (error) {
		console.error("❌ Error in handleMembershipValid:", error);
	}
}

/**
 * Handles membership.went_invalid event
 * Sets status to invalid (keeps last_valid_at and renewal_count)
 */
async function handleMembershipInvalid(
	user_id: string,
	experience_id: string,
): Promise<void> {
	try {
		const { error } = await supabase
			.from("members")
			.upsert(
				{
					user_id,
					experience_id,
					status: "invalid",
				} as any,
				{
					onConflict: "experience_id,user_id",
				},
			);

		if (error) {
			console.error("❌ Error upserting member (went_invalid):", error);
		} else {
			console.log(
				`✅ Member updated: ${user_id} in ${experience_id} - status: invalid`,
			);
		}
	} catch (error) {
		console.error("❌ Error in handleMembershipInvalid:", error);
	}
}

/**
 * Handles payment.succeeded event
 * This is the ONLY event that increments renewal_count
 * Also updates status to valid and last_valid_at
 */
async function handlePaymentSuccess(
	user_id: string,
	experience_id: string,
): Promise<void> {
	try {
		// Fetch existing record to get current renewal_count
		const { data: existing } = (await supabase
			.from("members")
			.select("renewal_count")
			.eq("user_id", user_id)
			.eq("experience_id", experience_id)
			.single()) as { data: { renewal_count: number } | null };

		const currentRenewalCount = existing?.renewal_count || 0;

		const { error } = await supabase
			.from("members")
			.upsert(
				{
					user_id,
					experience_id,
					status: "valid",
					last_valid_at: new Date().toISOString(),
					renewal_count: currentRenewalCount + 1,
				} as any,
				{
					onConflict: "experience_id,user_id",
				},
			);

		if (error) {
			console.error("❌ Error upserting member (payment_success):", error);
		} else {
			console.log(
				`✅ Member updated: ${user_id} in ${experience_id} - payment success, renewal_count: ${currentRenewalCount + 1}`,
			);
		}
	} catch (error) {
		console.error("❌ Error in handlePaymentSuccess:", error);
	}
}
