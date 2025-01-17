// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const generateSVG = (userId: string) => {
  // Create a deterministic pattern based on userId
  const hash = Array.from(userId).reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  // Generate a color based on the hash
  const hue = Math.abs(hash) % 360;
  const saturation = 60 + (Math.abs(hash >> 8) % 20); // 60-80%
  const lightness = 45 + (Math.abs(hash >> 16) % 10); // 45-55%
  const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

  // Create a 5x5 grid pattern
  const grid = Array(25).fill(false);
  for (let i = 0; i < 25; i++) {
    // Use the hash to determine if each cell should be filled
    // Make it symmetrical by mirroring the left side
    const col = i % 5;
    if (col < 3) {
      grid[i] = ((hash >> i) & 1) === 1;
      // Mirror the pattern for symmetry (except middle column)
      if (col < 2) {
        grid[i + (4 - 2 * col)] = grid[i];
      }
    }
  }

  // Convert the grid to SVG
  const cells = grid.map((filled, i) => {
    if (!filled) return '';
    const x = (i % 5) * 20;
    const y = Math.floor(i / 5) * 20;
    return `<rect x="${x}" y="${y}" width="20" height="20" />`;
  }).join('');

  return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="white"/>
    <g transform="scale(1)" fill="${color}">
      ${cells}
    </g>
  </svg>`;
}

serve(async (req) => {
  try {
    // Log the request method and headers for debugging
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Parse the request body
    let body;
    try {
      body = await req.json();
      console.log('Request body:', body);
    } catch (e) {
      console.error('Error parsing request body:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check for user_id in the request body
    const { user_id, record } = body;
    const userId = user_id || (record?.id);
    
    if (!userId) {
      console.error('No user_id found in request body:', body);
      return new Response(
        JSON.stringify({ 
          error: 'user_id is required', 
          received: body 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate the identicon SVG
    const svg = generateSVG(userId);
    const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
    const filename = `${userId}/identicon.svg`;

    console.log('Uploading file:', filename);

    // Upload the SVG to storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('profilepics')
      .upload(filename, svgBlob, {
        contentType: 'image/svg+xml',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/generate-identicon' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
