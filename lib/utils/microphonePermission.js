const PERMISSION_KEY = 'mic_permission'
const PERMISSION_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

export async function requestMicrophonePermission() {
  try {
    // Check if we have a stored permission that hasn't expired
    const stored = localStorage.getItem(PERMISSION_KEY)
    if (stored) {
      const { timestamp, granted } = JSON.parse(stored)
      const now = Date.now()
      
      // If permission is still valid, return it
      if (now - timestamp < PERMISSION_EXPIRY) {
        return granted
      }
      
      // Clear expired permission
      localStorage.removeItem(PERMISSION_KEY)
    }

    // Request new permission
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    
    // Store the new permission
    localStorage.setItem(PERMISSION_KEY, JSON.stringify({
      granted: true,
      timestamp: Date.now()
    }))

    // Stop the stream since we don't need it yet
    stream.getTracks().forEach(track => track.stop())
    
    return true
  } catch (error) {
    console.error('Error requesting microphone permission:', error)
    
    // Store the denied permission
    localStorage.setItem(PERMISSION_KEY, JSON.stringify({
      granted: false,
      timestamp: Date.now()
    }))
    
    return false
  }
} 