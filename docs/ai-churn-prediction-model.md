# AI Churn Prediction Model

## Overview

The AI Churn Prediction Model is a lightweight machine learning system designed to predict user churn risk in real-time. Built using TensorFlow.js, this model analyzes user behavior patterns to generate churn probability scores that help identify at-risk users before they leave.

**Why TensorFlow.js?**
- **Client-side predictions**: Enables real-time predictions without server round-trips
- **Lightweight**: Small model size (~2KB) for fast loading and minimal bandwidth usage
- **Cross-platform compatibility**: Works in both Node.js server environments and browser contexts
- **Memory efficient**: Automatic tensor cleanup prevents memory leaks during batch predictions
- **No external dependencies**: Self-contained model that doesn't require external ML services

The model uses a simple logistic regression approach with two key input features: days since last valid activity and renewal count. This design prioritizes interpretability and performance over complexity, making it suitable for production environments where reliability and speed are critical.

## Input Data Schema

The model expects a `ChurnProxies` object with the following structure:

```typescript
interface ChurnProxies {
  days_since_last_valid: number;
  renewal_count: number;
}
```

### Field Descriptions

- **`days_since_last_valid`** (number): Number of days since the user's last valid activity
  - Must be a non-negative number
  - Special value `999` indicates high risk (no valid activity recorded)
  - Calculated from `last_valid_at` timestamp using `calculateDaysSinceLastValid()` helper

- **`renewal_count`** (number): Total number of renewals the user has completed
  - Must be a non-negative integer
  - Higher values typically indicate lower churn risk
  - Defaults to `0` if not provided

### Example Input

```typescript
const inputData = {
  days_since_last_valid: 30,  // User was active 30 days ago
  renewal_count: 5            // User has renewed 5 times
};
```

## Output Format

The model returns a **churn risk score** as a number between 0 and 100:

- **0-30**: Low risk - User is likely to remain active
- **31-60**: Medium risk - User may be showing signs of disengagement
- **61-80**: High risk - User is likely to churn soon
- **81-100**: Extreme risk - User is very likely to churn

The score is calculated by:
1. Running the input through a sigmoid activation function
2. Multiplying the result by 100 to get a percentage
3. Rounding to the nearest integer
4. Clamping between 0 and 100

## Usage Example

### Basic Model Loading and Prediction

```typescript
import { predictChurn, calculateDaysSinceLastValid } from '@/lib/churn-model';

async function predictUserChurn() {
  try {
    // Prepare input data
    const lastValidAt = '2024-01-15T10:30:00Z'; // ISO timestamp
    const renewalCount = 3;
    
    // Calculate days since last valid activity
    const daysSinceLastValid = calculateDaysSinceLastValid(lastValidAt);
    
    // Create input object
    const inputData = {
      days_since_last_valid: daysSinceLastValid,
      renewal_count: renewalCount
    };
    
    // Run prediction
    const churnRiskScore = await predictChurn(inputData);
    
    // Interpret result
    console.log(`Churn Risk Score: ${churnRiskScore}%`);
    
    if (churnRiskScore >= 80) {
      console.log('🚨 Extreme risk - Immediate intervention needed');
    } else if (churnRiskScore >= 60) {
      console.log('⚠️ High risk - Consider retention strategies');
    } else if (churnRiskScore >= 30) {
      console.log('📊 Medium risk - Monitor closely');
    } else {
      console.log('✅ Low risk - User is stable');
    }
    
    return churnRiskScore;
  } catch (error) {
    console.error('Prediction failed:', error);
    return 100; // Default to maximum risk on error
  }
}
```

### Batch Prediction with Database Integration

```typescript
import { predictChurn, calculateDaysSinceLastValid } from '@/lib/churn-model';
import { supabase } from '@/lib/supabase';

async function predictChurnForMembers(memberIds: string[], experienceId: string) {
  try {
    // Fetch member data from database
    const { data: members, error } = await supabase
      .from('members')
      .select('id, last_valid_at, renewal_count')
      .in('id', memberIds)
      .eq('experience_id', experienceId);

    if (error) throw new Error(`Database error: ${error.message}`);

    // Process predictions in parallel
    const predictions = await Promise.all(
      members.map(async (member) => {
        const daysSinceLastValid = calculateDaysSinceLastValid(member.last_valid_at);
        const renewalCount = member.renewal_count || 0;

        try {
          const riskScore = await predictChurn({
            days_since_last_valid: daysSinceLastValid,
            renewal_count: renewalCount
          });

          return {
            memberId: member.id,
            riskScore,
            daysSinceLastValid,
            renewalCount
          };
        } catch (error) {
          console.error(`Prediction failed for member ${member.id}:`, error);
          return {
            memberId: member.id,
            riskScore: 100, // Maximum risk on error
            daysSinceLastValid,
            renewalCount
          };
        }
      })
    );

    return predictions;
  } catch (error) {
    console.error('Batch prediction failed:', error);
    throw error;
  }
}

// Usage
const memberIds = ['member_1', 'member_2', 'member_3'];
const experienceId = 'exp_123';

predictChurnForMembers(memberIds, experienceId)
  .then(results => {
    console.log('Prediction results:', results);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

### API Endpoint Usage

```typescript
// POST /api/predict
const response = await fetch('/api/predict', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_whop_token'
  },
  body: JSON.stringify({
    memberIds: ['member_1', 'member_2', 'member_3']
  })
});

const predictions = await response.json();
// Returns: { "member_1": 25, "member_2": 75, "member_3": 45 }
```

### Error Handling

The model includes comprehensive error handling:

```typescript
import { predictChurn, ModelLoadError, InvalidInputError } from '@/lib/churn-model';

async function safePrediction(inputData: ChurnProxies) {
  try {
    return await predictChurn(inputData);
  } catch (error) {
    if (error instanceof InvalidInputError) {
      console.error('Invalid input data:', error.message);
      // Handle input validation errors
    } else if (error instanceof ModelLoadError) {
      console.error('Model loading failed:', error.message);
      // Handle model loading errors
    } else {
      console.error('Unexpected error:', error);
      // Handle other errors
    }
    return 100; // Return maximum risk score on any error
  }
}
```

### Model Performance and Caching

The model includes built-in performance optimizations:

- **Model caching**: Loaded model is cached for 1 hour to avoid repeated loading
- **Memory management**: Automatic tensor cleanup using `tf.tidy()`
- **Timeout protection**: 10-second timeout prevents hanging on model load failures
- **Error recovery**: Graceful fallback to maximum risk score on prediction failures

```typescript
// The model automatically handles caching and memory management
// No additional configuration needed for basic usage
const score = await predictChurn(inputData);
```