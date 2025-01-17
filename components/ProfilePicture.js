'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { useProfilePicture } from '~/lib/hooks/useProfilePicture'
import { Button } from '~/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '~/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '~/components/ui/dialog'
import { Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import FilePickerButton from './FilePickerButton'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export default function ProfilePicture({ userId, size = 40, editable = false }) {
  const { url, loading, error, uploadProfilePicture, deleteProfilePicture } = useProfilePicture(userId)
  const [isOpen, setIsOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const formRef = useRef(null)

  const handleFileSelect = async (file) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 50MB')
      return
    }
    try {
      setUploading(true)
      await uploadProfilePicture(file)
      toast.success('Profile picture updated successfully')
      setIsOpen(false)
      formRef.current?.reset()
    } catch (err) {
      toast.error('Failed to update profile picture')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!deleteProfilePicture) return
    
    try {
      setDeleting(true)
      await deleteProfilePicture()
      toast.success('Profile picture deleted')
      setIsOpen(false)
    } catch (err) {
      toast.error('Failed to delete profile picture')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <Avatar className="animate-pulse">
        <AvatarFallback>
          <Loader2 className="h-4 w-4 animate-spin" />
        </AvatarFallback>
      </Avatar>
    )
  }

  if (error) {
    return (
      <Avatar>
        <AvatarFallback>!</AvatarFallback>
      </Avatar>
    )
  }

  const avatar = (
    <Avatar
      className={editable ? 'cursor-pointer hover:opacity-90' : ''}
      style={{ width: size, height: size }}
    >
      <AvatarImage src={url} alt="Profile picture" />
      <AvatarFallback>
        <Loader2 className="h-4 w-4 animate-spin" />
      </AvatarFallback>
    </Avatar>
  )

  if (!editable) return avatar

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={setIsOpen}
      modal={true}
    >
      <DialogTrigger asChild>
        {avatar}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Profile Picture</DialogTitle>
          <DialogDescription>
            Choose a new profile picture to represent you across the platform.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} className="space-y-4">
          <div className="flex justify-center relative">
            <div className="relative">
              <Avatar className="h-32 w-32">
                <AvatarImage src={url} alt="Profile picture" />
                <AvatarFallback>
                  <Loader2 className="h-8 w-8 animate-spin" />
                </AvatarFallback>
              </Avatar>
              {url && !url.includes('identicon') && (
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full z-10"
                  onPointerDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onClick={handleDelete}
                  disabled={deleting}
                  type="button"
                >
                  {deleting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <FilePickerButton 
              onFileSelect={handleFileSelect}
              disabled={uploading || deleting}
            />
            <div className="text-sm text-muted-foreground text-center">
              Maximum file size: 50MB
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 