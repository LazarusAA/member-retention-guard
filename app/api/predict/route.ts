import { NextRequest, NextResponse } from 'next/server';
import * as tf from '@tensorflow/tfjs';
import { whopSdk } from '@/lib/whop-sdk';
import { supabase } from '@/lib/supabase';
import { predictChurn, calculateDaysSinceLastValid } from '@/lib/churn-model';

interface PredictRequestBody {
  memberIds: string[];
}

interface PredictionResult {
  [memberId: string]: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify Whop token and access
    const headersList = request.headers;
    const { userId, experienceId } = await whopSdk.verifyUserToken(headersList);
    
    if (!userId || !experienceId) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Verify user has access to the experience
    const accessResult = await whopSdk.access.checkIfUserHasAccessToExperience({
      userId,
      experienceId
    });

    if (!accessResult.hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized - No access to this experience' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json() as PredictRequestBody;
    if (!Array.isArray(body.memberIds) || body.memberIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request - memberIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Fetch member data from Supabase
    const { data: members, error } = await supabase
      .from('members')
      .select('id, last_valid_at, renewal_count')
      .in('id', body.memberIds)
      .eq('experience_id', experienceId);

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch member data' },
        { status: 500 }
      );
    }

    // Process predictions
    const predictions: PredictionResult = {};
    
    await Promise.all(
      members.map(async (member) => {
        const days_since_last_valid = calculateDaysSinceLastValid(member.last_valid_at);
        const renewal_count = member.renewal_count || 0;

        try {
          const risk_score = await predictChurn({
            days_since_last_valid,
            renewal_count
          });
          
          predictions[member.id] = risk_score;
        } catch (error) {
          console.error(`Prediction failed for member ${member.id}:`, error);
          // Set maximum risk score on error
          predictions[member.id] = 100;
        }
      })
    );

    // Ensure all tensors are cleaned up
    tf.engine().endScope();
    
    // Return predictions
    return NextResponse.json(predictions);
  } catch (error) {
    console.error('Prediction route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
