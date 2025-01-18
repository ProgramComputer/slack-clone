import {supabase} from '~/lib/Store';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    // Parse the request body if needed
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const otherParticipantId = body.otherParticipantId;
    
    if (!otherParticipantId) {
      throw new Error('otherParticipantId is required')
    }


    // Get personalized context from chat-rag
      // Get username for the participant
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('username')
        .eq('id', otherParticipantId)
        .single()

      if (userError) {
        console.error('Error getting username:', userError)
      }

      const username = userData?.username?.split('@')[0]
      const {data:personaData, error} = await supabase.functions.invoke('chat-rag', {
        body: {
          query: `Analyze ${username}'s chat history and provide:
1. Their preferred pronouns (she/her, he/him, they/them)
2. Key personality traits (pick from: young, energetic, playful, warm, friendly, nurturing, deep, authoritative, serious, gentle, calm, wise)
3. Brief description of their speaking style and interests.
Format as: "Pronouns: [pronouns]. Traits: [traits]. Description: [1-2 sentences about speaking style and interests]"`,
          id: otherParticipantId,
          isParentThread: false
        }
      })
      console.log('Persona Data:', personaData)

      if (error) {
        console.error('Error getting persona:', error)
        throw new Error('Failed to get user persona')
      }

      let userPersona = 'Respond naturally in English.' // Default value
      if (personaData) {
        userPersona = typeof personaData === 'string' ? personaData : personaData.response
      } else {
        console.warn('No persona data returned, using default')
      }

      // Select voice based on persona analysis
      let selectedVoice = 'alloy' // Default balanced voice
      const lowerPersona = userPersona.toLowerCase()
      
      // Gender expression based voices
      if (lowerPersona.includes('she/her') || lowerPersona.includes('woman') || lowerPersona.includes('female')) {
        // Feminine voices with different personality traits
        if (lowerPersona.includes('young') || lowerPersona.includes('energetic') || lowerPersona.includes('playful')) {
          selectedVoice = 'coral' // Younger, brighter feminine voice
        } else if (lowerPersona.includes('warm') || lowerPersona.includes('friendly') || lowerPersona.includes('nurturing')) {
          selectedVoice = 'shimmer' // Warm, welcoming feminine voice
        } else {
          selectedVoice = 'ballad' // Default feminine voice
        }
      } else if (lowerPersona.includes('he/him') || lowerPersona.includes('man') || lowerPersona.includes('male')) {
        // Masculine voices with different personality traits
        if (lowerPersona.includes('deep') || lowerPersona.includes('authoritative') || lowerPersona.includes('serious')) {
          selectedVoice = 'ash' // Deeper masculine voice
        } else if (lowerPersona.includes('gentle') || lowerPersona.includes('calm') || lowerPersona.includes('wise')) {
          selectedVoice = 'sage' // Gentle, wise masculine voice
        } else {
          selectedVoice = 'verse' // Default masculine voice
        }
      } else {
        // Gender-neutral or non-binary voices
        if (lowerPersona.includes('they/them') || lowerPersona.includes('non-binary')) {
          selectedVoice = 'echo' // Neutral, balanced voice
        } else {
          selectedVoice = 'alloy' // Default balanced voice
        }
      }

      const sessionConfig = {
        model: "gpt-4o-realtime-preview-2024-12-17",

          modalities: ['text', 'audio'],
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: { 
            model: 'whisper-1'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 200,
            create_response: true,
          },
          voice: selectedVoice,
          instructions: `You are ${username} -- Don't forget YOUR NAME-- having a direct voice conversation with the user and this is your persona: ${userPersona || 'Respond naturally in English.'}

          Keep responses concise and clear while maintaining the personality appropriate for who you're speaking with.
          
          If you don't have specific context about the user, just be natural and friendly. You're here to chat. Don't ask to assist but ask relatable questions to you`,
      }
    // Create a realtime session with OpenAI
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionConfig)
      
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API Error:', errorText)
      throw new Error(`OpenAI API Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    res.status(200).json({ token: data })
  } catch (error) {
    console.error('Error creating realtime session:', error)
    res.status(500).json({ error: error.message || 'Failed to create session' })
  }
} 