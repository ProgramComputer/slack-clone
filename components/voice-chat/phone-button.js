import { Button } from "~/components/ui/button"
import { Phone } from "lucide-react"
import { toast } from "sonner"
import { requestMicrophonePermission } from "~/lib/utils/microphonePermission"

export function PhoneButton({ onClick, isActive }) {
  const handleClick = async () => {
    const hasPermission = await requestMicrophonePermission()
    if (!hasPermission) {
      toast.error('Microphone access is required for voice chat')
      return
    }
    onClick()
  }

  return (
    <Button
      onClick={handleClick}
      variant="ghost"
      size="icon"
      className={`rounded-full transition-colors ${
        isActive ? "bg-green-500/20 text-green-500 hover:bg-green-500/30" : ""
      }`}
    >
      <Phone className="h-5 w-5" />
      <span className="sr-only">Start voice chat</span>
    </Button>
  )
} 