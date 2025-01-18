import { useRef, useState, useEffect, useCallback } from 'react'
import { createRealtimeConnection } from '../utils/realtimeConnection'
import { toast } from 'sonner'
import {supabase} from '~/lib/Store'
export function useVoiceChat(otherParticipantId) {
  const [state, setState] = useState({
    status: 'disconnected',
    isAISpeaking: false,
    currentText: '',
  })
  const isManualDisconnectRef = useRef(false)

  const pcRef = useRef(null)
  const dcRef = useRef(null)
  const audioElementRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const sourceRef = useRef(null)
  const localStreamRef = useRef(null)
  const localSourceRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const MAX_RECONNECT_ATTEMPTS = 3

  useEffect(() => {
    if (state.status !== 'disconnected') {
      disconnect()
    }
    reconnectAttemptsRef.current = 0
  }, [otherParticipantId])

  const connect = async () => {
    if (state.status !== 'disconnected' || !otherParticipantId) return
    isManualDisconnectRef.current = false
    
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      toast.error('Connection failed after multiple attempts. Please try again later.')
      return
    }

    setState(prev => ({ ...prev, status: 'connecting' }))

    try {
      const response = await fetch('/api/voice/token', {
        method: 'POST',
        body: JSON.stringify({
            otherParticipantId: otherParticipantId
        })
      })
      const data = await response.json()

      if (!data.token) {
        throw new Error('No token provided')
      }

      // Initialize audio context and analyzer first
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
        analyserRef.current = audioContextRef.current.createAnalyser()
        analyserRef.current.fftSize = 256
        analyserRef.current.smoothingTimeConstant = 0.8
      }

      if (!audioElementRef.current) {
        audioElementRef.current = document.createElement('audio')
        audioElementRef.current.autoplay = true
        audioElementRef.current.playsInline = true
        audioElementRef.current.volume = 1.0
      }

      // Get user's microphone stream for visualization
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Create and connect source for local audio (user)
      if (localSourceRef.current) {
        localSourceRef.current.disconnect()
      }
      localSourceRef.current = audioContextRef.current.createMediaStreamSource(localStreamRef.current)
      localSourceRef.current.connect(analyserRef.current)

      // Initialize WebRTC connection
      const { pc, dc } = await createRealtimeConnection(data.token.client_secret.value, audioElementRef)
      pcRef.current = pc
      dcRef.current = dc

      pc.ontrack = (e) => {
        if (audioElementRef.current) {
          audioElementRef.current.srcObject = e.streams[0]

          // Clean up previous source if it exists
          if (sourceRef.current) {
            sourceRef.current.disconnect()
          }

          // Create and connect new source for remote audio (AI)
          sourceRef.current = audioContextRef.current.createMediaStreamSource(e.streams[0])
          sourceRef.current.connect(analyserRef.current)
          analyserRef.current.connect(audioContextRef.current.destination)

          audioElementRef.current.play().catch(err => {
            console.error('Error playing audio:', err)
            toast.error('Click anywhere to enable audio')
          })
        }
      }

      dc.addEventListener('open', () => {
        setState(prev => ({ ...prev, status: 'connected' }))
        reconnectAttemptsRef.current = 0
        toast.success('Voice chat connected')
        //updateSession()
      })

      dc.addEventListener('close', () => handleDisconnect('Connection closed'))
      dc.addEventListener('error', () => handleDisconnect('Connection error'))

      dc.addEventListener('message', (e) => {
        try {
          const data = JSON.parse(e.data)
          handleServerEvent(data)
        } catch (err) {
          console.error('Error handling message:', err)
        }
      })

      pc.addEventListener('connectionstatechange', () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          handleDisconnect('Connection lost')
        }
      })

    } catch (err) {
      handleDisconnect('Failed to connect')
    }
  }

  const handleDisconnect = (message) => {
    setState(prev => ({ ...prev, status: 'disconnected' }))
    toast.error(message)
    if (!isManualDisconnectRef.current) {
    reconnectAttemptsRef.current += 1

    if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000)
      reconnectTimeoutRef.current = setTimeout(connect, delay)
    }
  }
  }

  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true
    // Send session.close event before closing connection
    if (dcRef.current?.readyState === 'open') {
      dcRef.current.send(JSON.stringify({
        type: 'session.close'
      }))
    }

    // Stop all tracks and close RTCPeerConnection
    if (pcRef.current) {
      // Stop all tracks first
      pcRef.current.getSenders().forEach(sender => {
        if (sender.track) {
          sender.track.stop()
        }
      })
      
      // Close the connection
      pcRef.current.close()
      
      // Remove all event listeners
      pcRef.current.ontrack = null
      pcRef.current.onicecandidate = null
      pcRef.current.oniceconnectionstatechange = null
      pcRef.current.onconnectionstatechange = null
      
      // Null the reference
      pcRef.current = null
    }

    // Stop local microphone stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop()
      })
      localStreamRef.current = null
    }

    // Disconnect and clean up audio sources
    if (localSourceRef.current) {
      localSourceRef.current.disconnect()
      localSourceRef.current = null
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }

    // Clear audio element
    if (audioElementRef.current) {
      const stream = audioElementRef.current.srcObject
      if (stream && stream instanceof MediaStream) {
        stream.getTracks().forEach(track => track.stop())
      }
      audioElementRef.current.srcObject = null
      audioElementRef.current.load()
    }

    // Close data channel
    if (dcRef.current) {
      dcRef.current.close()
      dcRef.current = null
    }

    // Reset state
    setState(prev => ({
      ...prev,
      status: 'disconnected',
      isAISpeaking: false,
      currentText: ''
    }))

  }, [])

  const handleServerEvent = (event) => {
    
    switch (event.type) {
      case 'conversation.item.created':
        // User's speech transcript
        if (event.item?.content?.[0]?.transcript) {
          setState(prev => ({ 
            ...prev, 
            currentText: event.item.content[0].transcript,
            isAISpeaking: false
          }))
        }
        break

      case 'speech.start':
        setState(prev => ({ 
          ...prev, 
          isAISpeaking: true
        }))
        break

      case 'response.audio_transcript.delta':
        if (event.delta) {
          setState(prev => ({ 
            ...prev, 
            currentText: (prev.currentText || '') + event.delta,
            isAISpeaking: true
          }))
        }
        break

      case 'response.audio_transcript.done':
        if (event.transcript) {
          setState(prev => ({ 
            ...prev, 
            currentText: event.transcript
            // Don't change isAISpeaking here - wait for speech.end
          }))
        }
        break

      case 'speech.end':
        // Don't clear text on speech.end, just update speaking state
        setState(prev => ({ 
          ...prev, 
          isAISpeaking: false
        }))
        break

      case 'response.done':
        // Only clear text when explicitly starting a new response
        if (event.response?.status === 'done') {
          setState(prev => ({ 
            ...prev, 
            isAISpeaking: false,
            currentText: ''
          }))
        }
        break
    }
  }

  const updateSession = async () => {
    if (!dcRef.current || dcRef.current.readyState !== 'open') return

    try {
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

      const username = userData?.username
      const {data, error} = await supabase.functions.invoke('chat-rag', {
        body: {
          query: `Analyze  ${username} chat history and describe their name, background,personality, interests, and speaking style in a concise way.`,
          id: otherParticipantId,
          isParentThread: false
        }
      })

      const userPersona = typeof data === 'string' ? data : data.response;

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
        type: 'session.update',
        session: {
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
          instructions: `You are having a direct voice conversation with the user as this person's persona: ${userPersona || 'Respond naturally in English.'}

          Keep responses concise and clear while maintaining the personality appropriate for who you're speaking with.
          
          If you don't have specific context about the user, just be natural and friendly.`,
        },
      }

      dcRef.current.send(JSON.stringify(sessionConfig))
    } catch (err) {
      console.error('Error getting user persona:', err)
      // Fallback to default session config if chat-rag fails
      const sessionConfig = {
        type: 'session.update',
        session: {
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
          voice: 'alloy',
          instructions: 'You are having a direct voice conversation with the user. Respond naturally in English. Keep responses concise and clear.',
        },
      }
      dcRef.current.send(JSON.stringify(sessionConfig))
    }
  }

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    ...state,
    connect,
    disconnect,
    audioElement: audioElementRef.current,
    audioStream: audioElementRef.current?.srcObject,
    localStream: localStreamRef.current
  }
} 