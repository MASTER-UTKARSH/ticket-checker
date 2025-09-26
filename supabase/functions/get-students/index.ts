const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Student {
  enrollment: string;
  name: string;
  uniqueCode: string;
  status: string;
}

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
  
  const privateKey = credentials.private_key.replace(/\\n/g, '\n');
  const keyData = await crypto.subtle.importKey(
    'pkcs8',
    encoder.encode(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    keyData,
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
  return tokenData.access_token;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching students from Google Sheet...');
    
    // Simply fetch the CSV export directly - it's public
    const sheetUrl = 'https://docs.google.com/spreadsheets/d/1p-9erkM55yG2H3uwowI-k7vntASunX65GLZCb-s7Bv4/export?format=csv';
    
    console.log('Fetching CSV data from:', sheetUrl);
    const response = await fetch(sheetUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet data: ${response.status}`);
    }

    const csvText = await response.text();
    console.log('CSV data received, length:', csvText.length);
    
    // Parse CSV data
    const lines = csvText.trim().split('\n');
    const students: Student[] = [];

    // Skip header row and process data
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim()) {
        // Handle CSV parsing with potential commas in quoted fields
        const columns = line.split(',').map(col => col.trim().replace(/^"|"$/g, ''));
        if (columns.length >= 4) {
          students.push({
            enrollment: columns[0] || '',
            name: columns[1] || '',
            uniqueCode: columns[2] || '',
            status: columns[3] || 'pending'
          });
        }
      }
    }

    console.log(`Processed ${students.length} students`);

    return new Response(
      JSON.stringify({ 
        students,
        lastUpdated: new Date().toISOString()
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );

  } catch (error) {
    console.error('Error fetching students:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch students',
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