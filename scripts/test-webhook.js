#!/usr/bin/env node
/**
 * Simple webhook testing script
 * Usage: node test-webhook.js [event-type]
 * 
 * Event types:
 * - valid (default): Tests membership.went_valid
 * - invalid: Tests membership.went_invalid
 * - payment: Tests payment.succeeded
 */

const crypto = require('crypto');
const https = require('https');

// Configuration
const WEBHOOK_SECRET = process.env.WHOP_WEBHOOK_SECRET || 'your_secret_here';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks';

// Get event type from command line arg
const eventType = process.argv[2] || 'valid';

// Event type mapping
const eventTypeMap = {
  valid: 'membership.went_valid',
  invalid: 'membership.went_invalid',
  payment: 'payment.succeeded',
};

const selectedEvent = eventTypeMap[eventType] || eventTypeMap.valid;

// Test payload
const payload = {
  type: selectedEvent,
  data: {
    user_id: 'user_test123',
    experience_id: 'exp_test456',
  },
};

const payloadString = JSON.stringify(payload);

// Generate signature
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(payloadString)
  .digest('hex');

console.log('🚀 Testing Webhook Endpoint');
console.log('━'.repeat(50));
console.log(`Event Type: ${selectedEvent}`);
console.log(`URL: ${WEBHOOK_URL}`);
console.log(`Signature: ${signature}`);
console.log(`Payload:\n${JSON.stringify(payload, null, 2)}`);
console.log('━'.repeat(50));

// Parse URL
const url = new URL(WEBHOOK_URL);
const isHttps = url.protocol === 'https:';
const httpModule = isHttps ? require('https') : require('http');

// Send request
const options = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payloadString),
    'x-whop-signature': signature,
  },
};

const req = httpModule.request(options, (res) => {
  console.log(`\n✅ Response Status: ${res.statusCode}`);
  console.log(`Response Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (data) {
      console.log(`Response Body: ${data}`);
    }
    
    if (res.statusCode === 200) {
      console.log('\n✅ Webhook processed successfully!');
      console.log('💡 Check your Supabase dashboard to verify the database update.');
    } else if (res.statusCode === 401) {
      console.log('\n❌ Unauthorized - Invalid signature');
      console.log('💡 Check your WHOP_WEBHOOK_SECRET environment variable.');
    } else {
      console.log(`\n⚠️  Unexpected status code: ${res.statusCode}`);
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Error sending request:', error.message);
  console.log('💡 Make sure your server is running (npm run dev)');
});

req.write(payloadString);
req.end();

// Test invalid signature
if (process.argv.includes('--test-invalid')) {
  console.log('\n\n🧪 Testing Invalid Signature...');
  console.log('━'.repeat(50));
  
  const invalidOptions = {
    ...options,
    headers: {
      ...options.headers,
      'x-whop-signature': 'invalid_signature_12345',
    },
  };

  const invalidReq = httpModule.request(invalidOptions, (res) => {
    console.log(`Response Status: ${res.statusCode}`);
    if (res.statusCode === 401) {
      console.log('✅ Correctly rejected invalid signature!');
    } else {
      console.log('⚠️  Expected 401 Unauthorized');
    }
  });

  invalidReq.on('error', (error) => {
    console.error('❌ Error:', error.message);
  });

  invalidReq.write(payloadString);
  invalidReq.end();
}

