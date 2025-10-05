import { NextRequest, NextResponse } from 'next/server';
import { whopSdk } from '@/lib/whop-sdk';
import path from 'path';
import fs from 'fs/promises';

/**
 * Protected route to serve ML model files
 * Only authenticated users with valid experience access can download the model
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
): Promise<NextResponse> {
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

    // For model access, we might want to check for specific access level
    if (accessResult.accessLevel !== 'admin' && accessResult.accessLevel !== 'customer') {
      return NextResponse.json(
        { error: 'Unauthorized - Insufficient access level' },
        { status: 403 }
      );
    }

    // Validate filename
    const filename = params.filename;
    if (!filename.match(/^[a-zA-Z0-9._-]+$/)) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      );
    }

    // Construct safe file path (prevent directory traversal)
    const modelDir = path.join(process.cwd(), 'models', 'ml');
    const filePath = path.join(modelDir, filename);

    // Verify file exists and is within models/ml directory
    if (!filePath.startsWith(modelDir)) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
      );
    }

    try {
      const fileContent = await fs.readFile(filePath);
      
      // Set appropriate content type
      const contentType = filename.endsWith('.json') 
        ? 'application/json'
        : 'application/octet-stream';

      // Set cache control for better performance
      const headers = {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      };

      return new NextResponse(fileContent, { headers });
    } catch (error) {
      console.error(`File read error: ${error}`);
      return NextResponse.json(
        { error: 'Model file not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error serving model file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
