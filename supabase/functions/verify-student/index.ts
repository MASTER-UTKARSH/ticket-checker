const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getGoogleAccessToken(credentials: any): Promise<string> {
  // Create JWT for Google OAuth
  const jwtHeader = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(jwtHeader)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(jwtPayload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  // Import private key
  const privateKey = credentials.private_key.replace(/\\n/g, '\n');
  
  // For demo purposes, we'll use the CSV approach since setting up crypto is complex
  // In production, you'd properly implement JWT signing
  throw new Error('JWT signing not implemented in demo - using CSV fallback');
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { enrollment, uniqueCode } = await req.json();
    
    console.log(`Verifying student: ${enrollment} with code: ${uniqueCode}`);

    if (!enrollment || !uniqueCode) {
      return new Response(
        JSON.stringify({ 
          error: 'Enrollment number and unique code are required' 
        }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );
    }

    // Get current data from sheet to verify the code
    const sheetUrl = 'https://docs.google.com/spreadsheets/d/1p-9erkM55yG2H3uwowI-k7vntASunX65GLZCb-s7Bv4/export?format=csv';
    const response = await fetch(sheetUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet data: ${response.status}`);
    }

    const csvText = await response.text();
    const lines = csvText.trim().split('\n');
    
    let studentFound = false;
    let codeMatches = false;
    
    // Find the student and verify code
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim()) {
        const columns = line.split(',').map(col => col.trim().replace(/^"|"$/g, ''));
        const sheetEnrollment = columns[0];
        const sheetCode = columns[2];
        
        if (sheetEnrollment === enrollment) {
          studentFound = true;
          codeMatches = sheetCode === uniqueCode;
          break;
        }
      }
    }

    if (!studentFound) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Student not found' 
        }),
        { 
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );
    }

    // For now, we'll just return verification result without updating the sheet
    // In production, you'd implement proper Google Sheets API update with authentication
    console.log(`Verification for ${enrollment}: ${codeMatches ? 'SUCCESS' : 'FAILED'}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        verified: codeMatches,
        status: codeMatches ? 'verified' : 'failed',
        message: codeMatches ? 'Verification successful!' : 'Invalid unique code'
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );

  } catch (error) {
    console.error('Error verifying student:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Verification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );
  }
});