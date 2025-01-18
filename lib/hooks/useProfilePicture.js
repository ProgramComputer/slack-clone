import { useCallback, useEffect, useState } from 'react'
import {supabase } from '~/lib/Store';

import { generateIdenticon, svgToBlob } from '../utils/identicon'

// Cache for profile picture URLs
const profilePictureCache = new Map()

export function useProfilePicture(userId) {
  const [url, setUrl] = useState(() => profilePictureCache.get(userId) || null)
  const [loading, setLoading] = useState(!profilePictureCache.has(userId))
  const [error, setError] = useState(null)

  // Fetch the profile picture or generate an identicon
  const fetchProfilePicture = useCallback(async () => {
    if (!userId) return
    
    // Return early if URL is already cached
    if (profilePictureCache.has(userId)) {
      setUrl(profilePictureCache.get(userId))
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Try to get the existing profile picture
      const { data: existingFiles } = await supabase.storage
        .from('profilepics')
        .list(userId)

      if (existingFiles && existingFiles.length > 0) {
        // Get URL for the existing profile picture
        const { data: { publicUrl } } = supabase.storage
          .from('profilepics')
          .getPublicUrl(`${userId}/${existingFiles[0].name}`)
        
        profilePictureCache.set(userId, publicUrl)
        setUrl(publicUrl)
      } else {
        // Generate and upload an identicon if no profile picture exists
        const svg = generateIdenticon(userId)
        const blob = svgToBlob(svg)
        const filename = `${userId}/identicon.svg`

        const { error: uploadError } = await supabase.storage
          .from('profilepics')
          .upload(filename, blob, {
            upsert: true,
            contentType: 'image/svg+xml'
          })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('profilepics')
          .getPublicUrl(filename)
        
        profilePictureCache.set(userId, publicUrl)
        setUrl(publicUrl)
      }
    } catch (err) {
      console.error('Error fetching profile picture:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Upload a new profile picture
  const uploadProfilePicture = useCallback(async (file) => {
    if (!userId || !file) return

    try {
      setLoading(true)
      setError(null)

      // Delete existing files first
      const { data: existingFiles } = await supabase.storage
        .from('profilepics')
        .list(userId)

      if (existingFiles?.length > 0) {
        await supabase.storage
          .from('profilepics')
          .remove(existingFiles.map(f => `${userId}/${f.name}`))
      }

      // Upload the new file
      const fileExt = file.name.split('.').pop()
      const filename = `${userId}/profile.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('profilepics')
        .upload(filename, file, {
          upsert: true,
          contentType: file.type
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('profilepics')
        .getPublicUrl(filename)
      
      profilePictureCache.set(userId, publicUrl)
      setUrl(publicUrl)
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Delete the profile picture
  const deleteProfilePicture = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)

      // Get existing files
      const { data: existingFiles, error: listError } = await supabase.storage
        .from('profilepics')
        .list(userId)

      if (listError) throw listError

      if (existingFiles?.length > 0) {
        // Delete all files in the user's folder
        const filesToDelete = existingFiles.map(f => `${userId}/${f.name}`)
        const { error: deleteError } = await supabase.storage
          .from('profilepics')
          .remove(filesToDelete)

        if (deleteError) throw deleteError
      }

      // Generate and upload a new identicon
      const svg = generateIdenticon(userId)
      const blob = svgToBlob(svg)
      const filename = `${userId}/identicon.svg`

      const { error: uploadError } = await supabase.storage
        .from('profilepics')
        .upload(filename, blob, {
          upsert: true,
          contentType: 'image/svg+xml'
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('profilepics')
        .getPublicUrl(filename)
      
      profilePictureCache.set(userId, publicUrl)
      setUrl(publicUrl)
      return true
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Fetch profile picture on mount and when userId changes
  useEffect(() => {
    fetchProfilePicture()
  }, [fetchProfilePicture])

  return {
    url,
    loading,
    error,
    uploadProfilePicture,
    deleteProfilePicture,
    refreshProfilePicture: fetchProfilePicture
  }
} 