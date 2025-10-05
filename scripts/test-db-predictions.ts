import { config } from 'dotenv';
import { resolve } from 'path';
import http from 'http';
import fs from 'fs';

// Load environment variables from .env files
const envResult = config({ path: resolve(process.cwd(), '.env') });
const devEnvResult = config({ path: resolve(process.cwd(), '.env.development') });

// Debug environment loading
console.log('Environment loading results:');
console.log('- .env:', envResult.parsed ? 'Success' : 'Not found');
console.log('- .env.development:', devEnvResult.parsed ? 'Success' : 'Not found');
console.log('Current working directory:', process.cwd());

// Validate environment variables
if (!process.env.SUPABASE_URL) {
  console.error('❌ SUPABASE_URL is missing in environment variables');
  process.exit(1);
}

if (!process.env.SUPABASE_KEY) {
  console.error('❌ SUPABASE_KEY is missing in environment variables');
  process.exit(1);
}

console.log('✅ Found Supabase configuration');
console.log('URL:', process.env.SUPABASE_URL.substring(0, 20) + '...');
console.log('Key:', process.env.SUPABASE_KEY.substring(0, 5) + '...');

import { createClient } from '@supabase/supabase-js';
import { predictChurn, calculateDaysSinceLastValid } from '../lib/churn-model';

// Create a simple HTTP server to serve the model files
const PORT = 3001;
const server = http.createServer((req, res) => {
  const filePath = req.url === '/model.json' 
    ? './models/ml/model.json'
    : './models/ml/group1-shard1of1.bin';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end(JSON.stringify(err));
      return;
    }
    
    const contentType = filePath.endsWith('.json') 
      ? 'application/json'
      : 'application/octet-stream';
      
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  });
});

// Override the model path for testing
const testModelUrl = `http://localhost:${PORT}/model.json`;
process.env.MODEL_TEST_URL = testModelUrl;
console.log('\nSetting test model URL:', testModelUrl);

// Initialize Supabase client for testing with explicit auth settings
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    db: {
      schema: 'public'
    }
  }
);

async function testPredictions() {
  try {
    console.log('\nStarting model server...');
    server.listen(PORT);
    console.log(`Model server running at http://localhost:${PORT}`);
    
    console.log('\nTesting Supabase connection...');
    
    // First, check if table exists
    console.log('\nChecking database state...');
    
    // Debug Supabase client
    console.log('\nSupabase client config:', {
      url: process.env.SUPABASE_URL,
      keyLength: process.env.SUPABASE_KEY?.length || 0
    });

    // Fetch all members to debug
    const { data: allMembers, error: allMembersError } = await supabase
      .from('members')
      .select('*');

    if (allMembersError) {
      console.error('Failed to query database:', allMembersError);
      console.error('Full error details:', JSON.stringify(allMembersError, null, 2));
      return;
    }

    console.log('\nDatabase query results:');
    console.log(`Total members in database: ${allMembers?.length || 0}`);
    if (allMembers?.length > 0) {
      console.log('Sample member:', {
        experience_id: allMembers[0].experience_id,
        user_id: allMembers[0].user_id,
        status: allMembers[0].status
      });
    }
    
    // Fetch test members
    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .eq('experience_id', 'exp_test_123');

    if (error) {
      console.error('Failed to fetch test members:', error);
      return;
    }

    console.log(`Found ${members?.length || 0} members with experience_id 'exp_test_123'`);
    
    if (!members || members.length === 0) {
      console.log('\nNo test members found. Please run this SQL in Supabase SQL Editor:');
      console.log('----------------------------------------');
      console.log(`INSERT INTO public.members 
(experience_id, user_id, status, last_valid_at, renewal_count, created_at)
VALUES
('exp_test_123', 'user_low_risk', 'valid', NOW() - INTERVAL '5 days', 10, NOW() - INTERVAL '1 year'),
('exp_test_123', 'user_medium_risk', 'valid', NOW() - INTERVAL '30 days', 1, NOW() - INTERVAL '2 months'),
('exp_test_123', 'user_med_high_risk', 'valid', NOW() - INTERVAL '60 days', 2, NOW() - INTERVAL '6 months'),
('exp_test_123', 'user_high_risk', 'invalid', NOW() - INTERVAL '90 days', 1, NOW() - INTERVAL '4 months'),
('exp_test_123', 'user_extreme_risk', 'invalid', NOW() - INTERVAL '180 days', 0, NOW() - INTERVAL '6 months');`);
      console.log('----------------------------------------');
      return;
    }

    console.log(`\nFound ${members.length} test members`);
    console.log('\nRunning predictions on database records:');
    console.log('======================================');

    for (const member of members) {
      try {
        const days_since_last_valid = calculateDaysSinceLastValid(member.last_valid_at);
        const renewal_count = member.renewal_count;

        const risk_score = await predictChurn({
          days_since_last_valid,
          renewal_count
        });

        console.log(`\nMember: ${member.user_id}`);
        console.log(`Status: ${member.status}`);
        console.log(`Days Since Last Valid: ${days_since_last_valid}`);
        console.log(`Renewal Count: ${renewal_count}`);
        console.log(`Churn Risk Score: ${risk_score}%`);
      } catch (error) {
        console.error(`Prediction failed for member ${member.user_id}:`, error);
      }
    }
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    server.close(() => {
      console.log('\nModel server closed');
      process.exit(0);
    });
  }
}

testPredictions();