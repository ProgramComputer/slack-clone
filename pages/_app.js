import '~/styles/style.scss'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import UserContext from 'lib/UserContext'
import { supabase } from 'lib/Store'
import { jwtDecode } from 'jwt-decode'
import { updateUserStatus } from 'lib/Store'
import { AgentMessagesProvider } from 'lib/AgentMessagesProvider'

export default function SupabaseSlackClone({ Component, pageProps }) {
  const router = useRouter()
  const [userLoaded, setUserLoaded] = useState(false)
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)

  useEffect(() => {
    let statusSubscription;
    let authSubscription;

    async function saveSession(session) {
      try {
        setSession(session)
        const currentUser = session?.user
        if (session) {
          const jwt = jwtDecode(session.access_token)
          currentUser.appRole = jwt.user_role

          // Update user status to ONLINE and get current status
          const { data: updatedUser, error } = await updateUserStatus(currentUser.id, 'ONLINE')
          if (error) {
            console.error('Error updating user status:', error)
          } else if (updatedUser) {
            currentUser.status = updatedUser.status
          }
        }
        setUser(currentUser ?? null)
        setUserLoaded(!!currentUser)
        if (currentUser && router.pathname === '/') {
          router.push('/channels/[id]', '/channels/1')
        }
      } catch (error) {
        console.error('Error in saveSession:', error)
      }
    }

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => saveSession(session))

    // Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        if (user?.id) {
          await updateUserStatus(user.id, 'OFFLINE')
        }
        saveSession(null)
      } else if (session) {
        saveSession(session)
      }
    })
    authSubscription = subscription

    // Status subscription
    statusSubscription = supabase
      .channel('public:users')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users'
        },
        (payload) => {
          if (payload.new && user?.id === payload.new.id) {
            setUser(prev => ({ ...prev, status: payload.new.status }))
          }
        }
      )
      .subscribe()

    // Handle window/tab close
    const handleBeforeUnload = async () => {
      if (user?.id) {
        try {
          await updateUserStatus(user.id, 'OFFLINE')
        } catch (error) {
          console.error('Error updating status on unload:', error)
        }
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      if (authSubscription) authSubscription.unsubscribe()
      if (statusSubscription) statusSubscription.unsubscribe()
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (user?.id) {
        updateUserStatus(user.id, 'OFFLINE').catch(error => {
          console.error('Error updating status on cleanup:', error)
        })
      }
    }
  }, [])

  const signOut = async () => {
    try {
      if (user?.id) {
        await updateUserStatus(user.id, 'OFFLINE')
      }
      const { error } = await supabase.auth.signOut()
      if (!error) {
        router.push('/')
      }
    } catch (error) {
      console.error('Error during sign out:', error)
    }
  }

  return (
    <UserContext.Provider
      value={{
        userLoaded,
        user,
        signOut,
      }}
    >
      <AgentMessagesProvider>
        <Component {...pageProps} />
      </AgentMessagesProvider>
    </UserContext.Provider>
  )
}
