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
    const {query,userId} = await req.json()
    console.log(query,userId)
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('URL') ?? '',
      Deno.env.get('SERVICE_ROLE') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')
    })
    // Generate embedding for the query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    })
    const queryEmbedding = embeddingResponse.data[0].embedding
    // Perform vector similarity search
    const { data,error} = await supabaseClient.rpc('match_messages', {
      match_count: 5,
      match_threshold: 0.01,
      query_embedding: queryEmbedding,
      p_user_id: userId.trim()
    })
    console.log(data,"data")
    console.log("error",error)
    // Create context from similar messages
    const context = data 
      .map(msg => `${msg.message} (Similarity: ${msg.similarity})`)
      .join('\n')
    console.log(context)
    // Generate response using ChatGPT
    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are trying to personify a user from  their chat history. 
          Use the following similar messages as context to answer the query.
          Context:\n${context}`
        },
        { role: 'user', content: query }
      ],
      temperature: 0.7,
    })

    return new Response(
      JSON.stringify({ 
        response: chatResponse.choices[0].message.content,
        similar_messages: data 
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