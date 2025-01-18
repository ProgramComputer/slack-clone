import { useEffect, useRef } from "react"

export function CombinedWaveform({ isAISpeaking, audioElement, audioStream, localStream }) {
  const canvasRef = useRef(null)
  const animationFrameRef = useRef(null)
  const audioContextRef = useRef(null)
  const remoteAnalyserRef = useRef(null)
  const localAnalyserRef = useRef(null)
  const sourceRef = useRef(null)
  const localSourceRef = useRef(null)

  useEffect(() => {
    console.log('Visualize Me: Component mounted/updated', { 
      isAISpeaking, 
      hasAudioElement: !!audioElement,
      hasAudioStream: !!audioStream,
      hasLocalStream: !!localStream,
      localStreamActive: localStream?.active,
      localStreamTracks: localStream?.getTracks().length
    })
    
    if (!canvasRef.current) {
      console.log('Visualize Me: Missing canvas element')
      return
    }

    // Initialize audio context and analyzers if not already done
    if (!audioContextRef.current) {
      console.log('Visualize Me: Creating new AudioContext and Analyzers')
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      
      // Create separate analyzers for local and remote audio with higher resolution
      localAnalyserRef.current = audioContextRef.current.createAnalyser()
      localAnalyserRef.current.fftSize = 1024 // Increased for better resolution
      localAnalyserRef.current.smoothingTimeConstant = 0.7 // Slightly reduced for more responsiveness

      remoteAnalyserRef.current = audioContextRef.current.createAnalyser()
      remoteAnalyserRef.current.fftSize = 1024
      remoteAnalyserRef.current.smoothingTimeConstant = 0.7
    }

    // Connect local stream to analyzer
    if (localStream && !localSourceRef.current) {
      console.log('Visualize Me: Connecting local stream to analyzer')
      try {
        localSourceRef.current = audioContextRef.current.createMediaStreamSource(localStream)
        localSourceRef.current.connect(localAnalyserRef.current)
        // Don't connect local stream to destination to prevent echo
        console.log('Visualize Me: Local stream connected successfully')
      } catch (error) {
        console.error('Visualize Me: Error connecting local stream:', error)
      }
    }

    // Connect remote stream to analyzer
    if (audioStream && !sourceRef.current) {
      console.log('Visualize Me: Connecting remote stream to analyzer')
      try {
        sourceRef.current = audioContextRef.current.createMediaStreamSource(audioStream)
        sourceRef.current.connect(remoteAnalyserRef.current)
        remoteAnalyserRef.current.connect(audioContextRef.current.destination)
        console.log('Visualize Me: Remote stream connected successfully')
      } catch (error) {
        console.error('Visualize Me: Error connecting remote stream:', error)
      }
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const bufferLength = remoteAnalyserRef.current.frequencyBinCount
    const remoteDataArray = new Uint8Array(bufferLength)
    const localDataArray = new Uint8Array(bufferLength)

    console.log('Visualize Me: Setup complete', { 
      bufferLength,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      hasLocalSource: !!localSourceRef.current,
      hasRemoteSource: !!sourceRef.current
    })

    const draw = () => {
      if (!remoteAnalyserRef.current || !localAnalyserRef.current) {
        console.log('Visualize Me: No analyzer available for drawing')
        return
      }

      animationFrameRef.current = requestAnimationFrame(draw)

      // Get data from both analyzers
      remoteAnalyserRef.current.getByteFrequencyData(remoteDataArray)
      localAnalyserRef.current.getByteFrequencyData(localDataArray)

      // Clear canvas with transparent background
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Calculate center and radius
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const maxRadius = Math.min(centerX, centerY) * 0.8

      // Create multiple circular paths for layered effect
      const numLayers = 3
      const numPoints = 180 // Increased for smoother circles
      const angleStep = (Math.PI * 2) / numPoints

      // Draw multiple layers
      for (let layer = 0; layer < numLayers; layer++) {
        const baseRadius = maxRadius * (0.4 + layer * 0.15) // Different base radius for each layer
        
        ctx.beginPath()
        for (let i = 0; i <= numPoints; i++) {
          const angle = i * angleStep
          
          // Get average of a range of frequencies with offset for each layer
          const dataIndex = Math.floor((i % numPoints) * bufferLength / numPoints)
          const rangeSize = 4 // Average over 4 frequency bins
          let remoteSum = 0
          let localSum = 0
          
          for (let j = 0; j < rangeSize; j++) {
            const idx = (dataIndex + j + layer * 8) % bufferLength
            remoteSum += remoteDataArray[idx]
            localSum += localDataArray[idx]
          }
          
          const remoteValue = remoteSum / rangeSize
          const localValue = localSum / rangeSize
          
          // Calculate radius with more dynamic range
          const intensity = Math.max(localValue, remoteValue) / 255
          const radiusOffset = maxRadius * 0.4 * Math.pow(intensity, 1.5) // More pronounced effect for louder sounds
          
          // Add wave effect
          const time = Date.now() / 1000
          const waveOffset = Math.sin(angle * 8 + time * 2 + layer) * 2 * (layer + 1)
          
          const smoothRadius = baseRadius + radiusOffset + waveOffset

          const x = centerX + Math.cos(angle) * smoothRadius
          const y = centerY + Math.sin(angle) * smoothRadius

          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.closePath()

        // Create gradient based on who is speaking
        const gradient = ctx.createRadialGradient(
          centerX, centerY, baseRadius * 0.8,
          centerX, centerY, baseRadius + maxRadius * 0.2
        )

        if (isAISpeaking) {
          // AI Speaking - Cool blue/purple gradient
          gradient.addColorStop(0, `rgba(129, 140, 248, ${0.2 + layer * 0.1})`)  // Indigo
          gradient.addColorStop(0.5, `rgba(139, 92, 246, ${0.25 + layer * 0.1})`) // Purple
          gradient.addColorStop(1, `rgba(147, 51, 234, ${0.3 + layer * 0.1})`)    // Violet
        } else {
          // User Speaking - Emerald/Teal gradient
          gradient.addColorStop(0, `rgba(52, 211, 153, ${0.2 + layer * 0.1})`)    // Emerald
          gradient.addColorStop(0.5, `rgba(20, 184, 166, ${0.25 + layer * 0.1})`) // Teal
          gradient.addColorStop(1, `rgba(13, 148, 136, ${0.3 + layer * 0.1})`)    // Dark Teal
        }

        // Fill with gradient
        ctx.fillStyle = gradient
        ctx.fill()

        // Add glow effect with matching color
        if (isAISpeaking) {
          ctx.shadowColor = `rgba(139, 92, 246, ${0.4 + layer * 0.2})`  // Purple glow
          ctx.strokeStyle = `rgba(129, 140, 248, ${0.3 + layer * 0.1})` // Indigo stroke
        } else {
          ctx.shadowColor = `rgba(20, 184, 166, ${0.4 + layer * 0.2})`  // Teal glow
          ctx.strokeStyle = `rgba(52, 211, 153, ${0.3 + layer * 0.1})`  // Emerald stroke
        }
        ctx.shadowBlur = 15 + layer * 5
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      // Add pulsing inner circle with more dynamic effect
      const avgIntensity = Array.from(remoteDataArray).reduce((a, b) => a + b, 0) / bufferLength / 255
      const pulseSpeed = 1 + avgIntensity * 2
      const pulseSize = Math.sin(Date.now() / (1000 / pulseSpeed)) * 0.15 + 0.85
      const innerRadius = maxRadius * 0.25 * pulseSize
      
      ctx.beginPath()
      ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2)
      const innerGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, innerRadius
      )
      
      if (isAISpeaking) {
        // AI Speaking - Purple core
        innerGradient.addColorStop(0, 'rgba(139, 92, 246, 0.5)')  // Bright purple
        innerGradient.addColorStop(0.5, 'rgba(129, 140, 248, 0.3)') // Indigo
        innerGradient.addColorStop(1, 'rgba(147, 51, 234, 0)')    // Fade to transparent
      } else {
        // User Speaking - Teal core
        innerGradient.addColorStop(0, 'rgba(52, 211, 153, 0.5)')  // Bright emerald
        innerGradient.addColorStop(0.5, 'rgba(20, 184, 166, 0.3)') // Teal
        innerGradient.addColorStop(1, 'rgba(13, 148, 136, 0)')    // Fade to transparent
      }
      
      ctx.fillStyle = innerGradient
      ctx.fill()
    }

    // Start animation
    console.log('Visualize Me: Starting animation loop')
    draw()

    // Cleanup
    return () => {
      console.log('Visualize Me: Cleaning up', {
        hasLocalSource: !!localSourceRef.current,
        hasRemoteSource: !!sourceRef.current
      })
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect()
        sourceRef.current = null
      }
      if (localSourceRef.current) {
        localSourceRef.current.disconnect()
        localSourceRef.current = null
      }
    }
  }, [isAISpeaking, audioElement, audioStream, localStream])

  return (
    <div className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        width={1024}
        height={1024}
      />
    </div>
  )
} 