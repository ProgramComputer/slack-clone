import { useEffect, useState } from 'react'

export function Subtitles({ text, isAISpeaking }) {
  const [displayText, setDisplayText] = useState('')
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!text) {
      setIsVisible(false)
      return
    }

    // Immediately show new text
    setDisplayText(text)
    setIsVisible(true)

    // Only auto-hide for user text, keep AI text visible while speaking
    if (!isAISpeaking) {
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [text, isAISpeaking])

  // Hide when AI stops speaking
  useEffect(() => {
    if (!isAISpeaking) {
      setIsVisible(false)
    }
  }, [isAISpeaking])

  if (!isVisible) {
    return null
  }

  return (
    <div className="w-full rounded-lg bg-black/40 backdrop-blur-sm transition-opacity duration-300">
      <p className="text-white text-lg font-medium text-center py-3 px-4">
        {displayText}
        <span className="ml-1 animate-pulse">▋</span>
      </p>
    </div>
  )
} 