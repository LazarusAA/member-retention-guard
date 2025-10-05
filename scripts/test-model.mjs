import * as tf from '@tensorflow/tfjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3001;

// Test cases covering different scenarios
const testCases = [
  {
    name: 'Recent activity, multiple renewals (Low Risk)',
    input: { days_since_last_valid: 5, renewal_count: 10 }
  },
  {
    name: 'Recent activity, first time (Medium Risk)',
    input: { days_since_last_valid: 30, renewal_count: 1 }
  },
  {
    name: 'Moderate inactivity (Medium-High Risk)',
    input: { days_since_last_valid: 60, renewal_count: 2 }
  },
  {
    name: 'Long inactivity (High Risk)',
    input: { days_since_last_valid: 90, renewal_count: 1 }
  },
  {
    name: 'Very long inactivity (Extreme Risk)',
    input: { days_since_last_valid: 180, renewal_count: 0 }
  }
];

// Create a simple HTTP server to serve the model files
const server = http.createServer((req, res) => {
  // Mock authentication check
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.writeHead(401);
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  const filePath = req.url === '/api/ml-model/model.json' 
    ? '../models/ml/model.json'
    : '../models/ml/group1-shard1of1.bin';

  fs.readFile(path.join(__dirname, filePath), (err, data) => {
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
      'Cache-Control': 'private, max-age=3600'
    });
    res.end(data);
  });
});

async function runPrediction(model, testCase) {
  const input = tf.tensor2d([[
    testCase.input.days_since_last_valid,
    testCase.input.renewal_count
  ]]);
  
  const prediction = model.predict(input);
  const score = prediction.dataSync()[0] * 100;
  
  // Cleanup
  input.dispose();
  prediction.dispose();
  
  return Math.round(score);
}

async function testModel() {
  try {
    console.log('Starting local server...');
    server.listen(PORT);

    console.log('Loading model...');
    const model = await tf.loadLayersModel(
      `http://localhost:${PORT}/api/ml-model/model.json`,
      {
        // Include mock authentication
        requestInit: {
          headers: {
            'Authorization': 'Bearer test_token'
          }
        }
      }
    );
    
    console.log('\nRunning test cases:');
    console.log('===================');
    
    for (const testCase of testCases) {
      const score = await runPrediction(model, testCase);
      console.log(`\n${testCase.name}`);
      console.log(`Input: ${JSON.stringify(testCase.input)}`);
      console.log(`Churn Risk Score: ${score}%`);
    }
    
    // Cleanup
    model.dispose();
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('\nError during testing:', error);
  } finally {
    server.close(() => {
      console.log('\nServer closed');
      process.exit(0);
    });
  }
}

testModel();