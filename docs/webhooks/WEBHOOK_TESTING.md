# Webhook Testing Guide

## Overview
This guide explains how to test the secure webhook endpoint at `/api/webhooks` that processes Whop membership and payment events.

## Prerequisites
- Ensure `WHOP_WEBHOOK_SECRET` is set in your `.env.development` file
- Supabase is configured with the `members` table (see `database_structure.md`)
- The server is running (`npm run dev`)

## Webhook Signature Verification

The webhook handler uses HMAC-SHA256 to verify signatures. The signature must be passed in the `x-whop-signature` header.

### Generating a Test Signature (Node.js)

```javascript
const crypto = require('crypto');

const payload = JSON.stringify({
  type: "membership.went_valid",
  data: {
    user_id: "user_test123",
    experience_id: "exp_test456"
  }
});

const secret = process.env.WHOP_WEBHOOK_SECRET;
const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

console.log('Signature:', signature);
```

### Generating a Test Signature (Bash)

```bash
# Set your webhook secret
WEBHOOK_SECRET="your_webhook_secret_here"

# Payload
PAYLOAD='{"type":"membership.went_valid","data":{"user_id":"user_test123","experience_id":"exp_test456"}}'

# Generate signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | sed 's/^.* //')

echo "Signature: $SIGNATURE"
```

## Test Cases

### 1. Test Membership Went Valid Event

```bash
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -H "x-whop-signature: YOUR_GENERATED_SIGNATURE" \
  -d '{
    "type": "membership.went_valid",
    "data": {
      "user_id": "user_test123",
      "experience_id": "exp_test456"
    }
  }'
```

**Expected Database Changes:**
- New/updated row in `members` table
- `status` = 'valid'
- `last_valid_at` = current timestamp
- `renewal_count` = **unchanged** (only payment.succeeded increments this)

### 2. Test Membership Went Invalid Event

```bash
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -H "x-whop-signature: YOUR_GENERATED_SIGNATURE" \
  -d '{
    "type": "membership.went_invalid",
    "data": {
      "user_id": "user_test123",
      "experience_id": "exp_test456"
    }
  }'
```

**Expected Database Changes:**
- `status` = 'invalid'
- `last_valid_at` and `renewal_count` remain unchanged

### 3. Test Payment Success Event

```bash
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -H "x-whop-signature: YOUR_GENERATED_SIGNATURE" \
  -d '{
    "type": "payment.succeeded",
    "data": {
      "user_id": "user_test123",
      "experience_id": "exp_test456"
    }
  }'
```

**Expected Database Changes:**
- `status` = 'valid'
- `last_valid_at` = current timestamp
- `renewal_count` = previous count + 1

### 4. Test Invalid Signature (Should Return 401)

```bash
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -H "x-whop-signature: invalid_signature_here" \
  -d '{
    "type": "membership.went_valid",
    "data": {
      "user_id": "user_test123",
      "experience_id": "exp_test456"
    }
  }'
```

**Expected Response:**
- HTTP 401 Unauthorized
- No database changes

## Verification in Supabase

After sending test webhooks, verify the changes in your Supabase dashboard:

1. Go to your Supabase project
2. Navigate to Table Editor
3. Select the `members` table
4. Check the row for your test user_id and experience_id
5. Verify the fields match the expected changes

## Event Types Supported

| Event Type | Status Update | last_valid_at | renewal_count |
|------------|---------------|---------------|---------------|
| `membership.went_valid` | 'valid' | Updated | **Unchanged** |
| `membership.went_invalid` | 'invalid' | Unchanged | Unchanged |
| `payment.succeeded` | 'valid' | Updated | **Incremented** (ONLY event) |

**Note:** Only `payment.succeeded` increments `renewal_count` to prevent double-counting when both payment and membership events fire for a single renewal.

## Security Notes

- ✅ Signature verification prevents unauthorized webhook processing
- ✅ Returns 401 for invalid signatures
- ✅ Returns 200 OK immediately after verification to prevent retries
- ✅ Async processing with `waitUntil` avoids rate limits
- ✅ No PII logged (only user_id and experience_id which are identifiers)
- ✅ All database operations are scoped by experience_id

## Performance

- Response time: < 100ms (verification only)
- Database operations run asynchronously
- Webhook retries prevented by immediate 200 OK response

## Real Whop Webhook Setup

1. Go to your Whop Developer Dashboard
2. Navigate to your app's webhook settings
3. Set the webhook URL to: `https://your-domain.com/api/webhooks`
4. Select the events you want to receive:
   - `membership.went_valid`
   - `membership.went_invalid`
   - `payment.succeeded`
5. Save and test using Whop's webhook test feature

The webhook endpoint will automatically process these events and update your member churn proxies in real-time.

