'use client'

import { useRef } from 'react'
import { Button } from '~/components/ui/button'
import { Upload } from 'lucide-react'

export default function FilePickerButton({ onFileSelect, disabled }) {
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }

  return (
    <div onMouseDown={(e) => e.stopPropagation()}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button 
        type="button"
        className="w-full"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          fileInputRef.current?.click()
        }}
        variant="outline"
        disabled={disabled}
      >
        <Upload className="h-4 w-4 mr-2" />
        Choose Image
      </Button>
    </div>
  )
} 