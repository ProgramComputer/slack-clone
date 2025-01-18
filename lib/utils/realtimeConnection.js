export async function createRealtimeConnection(token, audioElement) {
  console.log('Creating RTCPeerConnection')
  const pc = new RTCPeerConnection()

  // Handle incoming audio stream
  pc.ontrack = (e) => {
    console.log('ontrack handler in realtimeConnection:', e.streams[0])
    if (audioElement.current) {
      console.log('Setting srcObject in realtimeConnection')
      audioElement.current.srcObject = e.streams[0]
    }
  }

  // Get user's microphone stream
  console.log('Getting microphone access')
  const ms = await navigator.mediaDevices.getUserMedia({ audio: true })
  console.log('Got microphone stream:', ms.getTracks())
  pc.addTrack(ms.getTracks()[0])

  // Create data channel for events
  console.log('Creating data channel')
  const dc = pc.createDataChannel('oai-events')

  // Create and set local description
  console.log('Creating offer')
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)

  // Connect to OpenAI's Realtime API
  const baseUrl = 'https://api.openai.com/v1/realtime'
  const model = 'gpt-4o-realtime-preview-2024-12-17'

  console.log('Sending SDP to OpenAI')
  const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
    method: 'POST',
    body: offer.sdp,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/sdp',
    },
  })

  console.log('Got SDP response:', sdpResponse.status)
  const answerSdp = await sdpResponse.text()
  const answer = {
    type: 'answer',
    sdp: answerSdp,
  }

  console.log('Setting remote description')
  await pc.setRemoteDescription(answer)
  console.log('WebRTC setup complete')

  return { pc, dc }
} 