import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import OpenAI from 'jsr:@openai/openai'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    })
  }

  try {
    const { query, id,isParentThread } = await req.json()
    console.log(query, id)
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('URL') ?? '',
      Deno.env.get('SERVICE_ROLE') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')
    })
    console.log(openai, "openai")
    // Generate embedding for the query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    })
    const queryEmbedding = embeddingResponse.data[0].embedding
    let context;
      console.log(isParentThread, "isParentThread")
    if (isParentThread) {
      // Get the parent message details
      const { data: messageData, error: messageError } = await supabaseClient
        .from('messages')
        .select('*')
        .eq('id', id)
        .single();

      if (messageError) throw messageError;

      // Extract the folder path from the file_url
      const filePathMatch = messageData.file_url?.match(/\/uploads\/([^?]+)/);
      if (!filePathMatch) {
        throw new Error('No file found in thread parent message');
      }

      const filePath = filePathMatch[1];
      const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));
      
      // List files in the folder to find extracted_text.txt
      const { data: files, error: listError } = await supabaseClient.storage
        .from('uploads')
        .list(folderPath);

      if (listError) throw listError;

      // Find and download the extracted text file if it exists
      const extractedTextFile = files.find(f => f.name === 'extracted_text.txt');
      if (extractedTextFile) {
        const { data: textData, error: downloadError } = await supabaseClient.storage
          .from('uploads')
          .download(`${folderPath}/extracted_text.txt`);

        if (downloadError) throw downloadError;

        // Convert the downloaded blob to text
        context = await textData.text();
      } else {
        context = 'No extracted text found for this file.';
      }

    } else {
      // Regular user message search
      //TODO:  Use hybrid search instead of match_messages
      const { data, error } = await supabaseClient.rpc('match_messages', {
        match_count: 5,
        match_threshold: 0.01,
        query_embedding: queryEmbedding,
        p_user_id: id
      })
      context = data 
        .map(msg => `${msg.message} (Similarity: ${msg.similarity})`)
        .join('\n')
    }


    // Create context from similar messages

    console.log(context)
    // Generate response using ChatGPT
    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: isParentThread
            ? `You are analyzing a thread in a chat. The thread parent message contains a file.
               Use the following context to answer the query about the thread parent and its file.
               Context:\n${context}`
            : `You are trying to personify a user from their chat history. 
               Use the following similar messages as context to answer the query.
               Context:\n${context}`
        },
        { role: 'user', content: query }
      ],
      temperature: 0.7,
    })

    return new Response(
      JSON.stringify({ 
        response: chatResponse.choices[0].message.content
      
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
}) 