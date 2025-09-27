const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getGoogleAccessToken(credentials: any): Promise<string> {
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
  
  // Import private key for signing
  const privateKey = credentials.private_key.replace(/\\n/g, '\n');
  
  // Convert PEM to proper format for Web Crypto API
  const pemContents = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(`${headerB64}.${payloadB64}`)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${headerB64}.${payloadB64}.${signatureB64}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }
  
  return tokenData.access_token;
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
    let studentRowIndex = -1;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim()) {
        const columns = line.split(',').map(col => col.trim().replace(/^"|"$/g, ''));
        const sheetEnrollment = columns[0];
        const sheetCode = columns[2];
        
        if (sheetEnrollment === enrollment) {
          studentFound = true;
          codeMatches = sheetCode === uniqueCode;
          studentRowIndex = i + 1; // Google Sheets is 1-indexed, add 1 for header
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

    if (!codeMatches) {
      return new Response(
        JSON.stringify({ 
          success: true,
          verified: false,
          status: 'failed',
          message: 'Invalid unique code'
        }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );
    }

    // Update Google Sheet status to "paid" when verification is successful
    console.log(`Verification successful for ${enrollment}. Updating status to 'paid'...`);
    
    try {
      const credentialsJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS');
      if (!credentialsJson) {
        throw new Error('Google service account credentials not found');
      }

      const credentials = JSON.parse(credentialsJson);
      const accessToken = await getGoogleAccessToken(credentials);
      
      const spreadsheetId = '1p-9erkM55yG2H3uwowI-k7vntASunX65GLZCb-s7Bv4';
      const range = `Sheet1!D${studentRowIndex}`; // Column D is status column
      
      const updateResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [['paid']]
          })
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('Failed to update sheet:', errorText);
        throw new Error(`Failed to update sheet: ${updateResponse.status}`);
      }

      console.log(`Successfully updated status to 'paid' for ${enrollment}`);
      
    } catch (error) {
      console.error('Error updating Google Sheet:', error);
      // Continue anyway - verification was successful even if sheet update failed
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        verified: true,
        status: 'verified',
        message: 'Verification successful! Status updated to paid.'
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