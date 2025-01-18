import { Button } from "~/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "~/components/ui/dialog"
import { CombinedWaveform } from "./combined-waveform"
import { Subtitles } from "./subtitles"
import { X } from "lucide-react"
import ProfilePicture from "../ProfilePicture"
import StatusIndicator from "../StatusIndicator"
import { useState, useRef, useEffect, useMemo } from "react"

export function VoiceModal({ 
  isOpen, 
  onClose, 
  otherParticipant,
  status,
  isAISpeaking,
  currentText,
  audioElement,
  audioStream,
  localStream
}) {
  // Track the last non-empty text to keep it visible
  const [lastText, setLastText] = useState('')
  
  useEffect(() => {
    if (currentText?.trim()) {
      setLastText(currentText)
    }
  }, [currentText])

  // Clear last text when AI stops speaking
  useEffect(() => {
    if (!isAISpeaking) {
      setLastText('')
    }
  }, [isAISpeaking])

  // Use either current text or last text
  const displayText = useMemo(() => {
    return currentText?.trim() || lastText
  }, [currentText, lastText])

  return (
    <Dialog open={isOpen}>
      <DialogContent showClose={false} className="sm:max-w-[425px] h-[600px] flex flex-col gap-6">
        <DialogTitle className="sr-only">
          Voice Chat with {otherParticipant?.username || 'AI Assistant'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Voice chat interface with audio visualization and live transcription
        </DialogDescription>
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ProfilePicture userId={otherParticipant.id} size={40} />
            <StatusIndicator status={otherParticipant?.status} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              {otherParticipant?.username || 'AI Assistant'}
            </h2>
            <p className="text-sm text-gray-500">
              {status === 'connected' ? 'Connected' : 
               status === 'connecting' ? 'Connecting...' : 
               'Disconnected'}
            </p>
          </div>
        </div>

        {/* Visualization Area */}
        <div className="flex-1 relative bg-gray-900 rounded-lg overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64">
              <CombinedWaveform 
                isAISpeaking={isAISpeaking}
                audioElement={audioElement}
                audioStream={audioStream}
                localStream={localStream}
              />
            </div>
          </div>
          
          {/* Subtitles container with dark gradient background */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-900/90 to-transparent pt-16 pb-4 z-10">
            <div className="px-4">
              <Subtitles text={displayText} isAISpeaking={isAISpeaking} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-center">
          <Button 
            variant="destructive" 
            size="lg"
            className="w-full"
            onClick={onClose}
          >
            End Call
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 