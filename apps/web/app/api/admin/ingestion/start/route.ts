import { NextResponse } from 'next/server';
import { exec } from 'child_process';

export async function POST(request: Request) {
  try {
    const config = await request.json();
    
    // Validate admin authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.includes('Bearer')) {
      // For now, we'll allow without auth in dev
      // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Build the command based on config
    let command = 'cd /Users/hrishi/Downloads/TOKU/customer_help_center && ';
    command += `DO_DATABASE_URL="${process.env.DO_DATABASE_URL || process.env.DATABASE_URL}" `;
    command += 'python3 scripts/run-ingestion-do.py';
    
    // Add flags based on mode
    if (config.mode === 'force') {
      command += ' --force';
    } else if (config.mode === 'clean') {
      command += ' --clean';
    }
    
    // Set environment variables for batch size
    if (config.batchSize) {
      command = `INGESTION_PARALLEL=${config.batchSize} ${command}`;
    }
    
    // Execute the ingestion command
    // We'll run it in the background and track its status
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Ingestion error:', error);
        // Store error in a temporary status file or database
      }
      console.log('Ingestion output:', stdout);
      if (stderr) {
        console.error('Ingestion stderr:', stderr);
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Ingestion started',
      config
    });
  } catch (error) {
    console.error('Failed to start ingestion:', error);
    return NextResponse.json(
      { error: 'Failed to start ingestion' },
      { status: 500 }
    );
  }
}
