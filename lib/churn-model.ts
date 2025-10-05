import * as tf from '@tensorflow/tfjs';

// Input proxies interface
export interface ChurnProxies {
  days_since_last_valid: number;
  renewal_count: number;
}

// Constants
const HIGH_RISK_DAYS = 999;
const DEFAULT_HIGH_RISK_SCORE = 100;
const MODEL_LOAD_TIMEOUT = 10000; // 10 seconds
const MODEL_CACHE_DURATION = 1000 * 60 * 60; // 1 hour

// Get model path
function getModelPath() {
  // For testing environment
  if (process.env.MODEL_TEST_URL) {
    console.log('Using test model URL:', process.env.MODEL_TEST_URL);
    return process.env.MODEL_TEST_URL;
  }
  
  // For normal operation
  const path = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000/api/ml-model/model.json'
    : '/api/ml-model/model.json';
  
  console.log('Using model path:', path);
  return path;
}

// Custom error classes
export class ModelLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModelLoadError';
  }
}

export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInputError';
  }
}

// Model loading with timeout and caching
let modelPromise: Promise<tf.LayersModel> | null = null;
let lastModelLoadTime: number = 0;

async function getModel(): Promise<tf.LayersModel> {
  const now = Date.now();
  
  // Check if we need to reload the model
  if (modelPromise && (now - lastModelLoadTime) > MODEL_CACHE_DURATION) {
    modelPromise = null;
  }

  if (!modelPromise) {
    const modelPath = getModelPath();
    modelPromise = Promise.race([
      tf.loadLayersModel(modelPath),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new ModelLoadError('Model load timeout')), MODEL_LOAD_TIMEOUT)
      )
    ]).then(model => {
      lastModelLoadTime = now;
      return model as tf.LayersModel;
    }).catch(error => {
      modelPromise = null;
      throw new ModelLoadError(
        error.name === 'ModelLoadError' 
          ? error.message 
          : `Failed to load model: ${error.message}`
      );
    });
  }

  return modelPromise;
}

// Type guard for ChurnProxies
function isValidProxies(proxies: any): proxies is ChurnProxies {
  if (typeof proxies !== 'object' || proxies === null) {
    throw new InvalidInputError('Proxies must be an object');
  }
  
  if (typeof proxies.days_since_last_valid !== 'number') {
    throw new InvalidInputError('days_since_last_valid must be a number');
  }
  
  if (typeof proxies.renewal_count !== 'number') {
    throw new InvalidInputError('renewal_count must be a number');
  }
  
  if (isNaN(proxies.days_since_last_valid) || proxies.days_since_last_valid < 0) {
    throw new InvalidInputError('days_since_last_valid must be a non-negative number');
  }
  
  if (isNaN(proxies.renewal_count) || proxies.renewal_count < 0) {
    throw new InvalidInputError('renewal_count must be a non-negative number');
  }

  return true;
}

/**
 * Calculate days since last valid from timestamp
 * @param lastValidAt ISO timestamp or null
 * @returns number of days or HIGH_RISK_DAYS if null/invalid
 */
export function calculateDaysSinceLastValid(lastValidAt: string | null): number {
  if (!lastValidAt) return HIGH_RISK_DAYS;
  
  const lastValidDate = new Date(lastValidAt);
  if (isNaN(lastValidDate.getTime())) {
    console.warn(`Invalid lastValidAt date: ${lastValidAt}`);
    return HIGH_RISK_DAYS;
  }
  
  const days = Math.floor((Date.now() - lastValidDate.getTime()) / (1000 * 3600 * 24));
  return Math.max(0, days);
}

/**
 * Predict churn risk score for given proxies
 * @param proxies Input metrics for prediction
 * @returns Risk score 0-100 (higher = higher risk)
 * @throws {InvalidInputError} If input proxies are invalid
 * @throws {ModelLoadError} If model fails to load
 */
export async function predictChurn(proxies: ChurnProxies): Promise<number> {
  try {
    // Validate input
    isValidProxies(proxies);

    const model = await getModel();
    
    // Use tf.tidy for automatic memory cleanup
    return tf.tidy(() => {
      // Use raw input values (no normalization needed)
      const input = tf.tensor2d([[proxies.days_since_last_valid, proxies.renewal_count]]);
      const prediction = model.predict(input) as tf.Tensor;
      const score = prediction.dataSync()[0] * 100;
      
      return Math.max(0, Math.min(100, Math.round(score)));
    });
  } catch (error) {
    if (error instanceof InvalidInputError || error instanceof ModelLoadError) {
      throw error;
    }
    
    console.error('Unexpected error in predictChurn:', error);
    return DEFAULT_HIGH_RISK_SCORE;
  }
}